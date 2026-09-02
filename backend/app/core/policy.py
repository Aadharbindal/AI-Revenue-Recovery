"""
The policy engine — eleven gates, evaluated in order, on every proposed action.

This is the part that makes the system safe to point at real customers. The
classifier decides what *kind* of problem a case is; the ladder decides what
the cheapest useful next step would be; this module decides whether that step
is allowed to happen at all.

Two design choices worth defending:

1. Every gate is evaluated, even after one has already blocked. The first
   blocker is what stops the action, but the full trail is what a compliance
   reviewer needs — "it was blocked by consent" is much weaker than "it was
   blocked by consent, and here is what the other ten gates thought."

2. A block is recorded with the money and the compliance exposure it avoided.
   Guardrails that only ever appear as absences are impossible to value; these
   ones show up in the P&L.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import List, Optional

from app.core.clock import ist_hour
from app.core.detector import detector
from app.core.ladder import ActionIntent

# Contacting someone who has revoked consent, or who is on the DND registry, is
# not a wasted rupee — it is a regulatory exposure. Priced conservatively so
# the "value protected" number is defensible rather than flattering.
COMPLIANCE_RISK_PAISE = 50_000  # ₹500 per avoided violation

QUIET_START_IST = 21   # 9 PM
QUIET_END_IST = 9      # 9 AM
VOICE_START_IST = 10   # 10 AM
VOICE_END_IST = 19     # 7 PM

MAX_TOUCHES_PER_CASE = 3
MAX_TOUCHES_24H = 1
MAX_TOUCHES_7D = 3
COOLDOWN_HOURS = 6
MAX_COST_RATIO = 0.15  # never spend more than 15% of what is at stake

# Below this, automated recovery loses money even though the per-message ratio
# looks fine. A ₹0.30 WhatsApp against a ₹40 order is 0.75% — but the message is
# not the real cost. A contacted customer replies, and a reply costs support
# time; the payment needs reconciling either way. Fully loaded, a recovery
# attempt is worth roughly ₹50 of somebody's attention, so anything under that
# is chased at a loss no matter how cheap the channel looks.
MIN_VIABLE_AMOUNT_PAISE = 5_000  # ₹50

TERMINAL_STATES = {"RECOVERED", "EXHAUSTED", "CLOSED"}


@dataclass
class GateResult:
    gate_id: str
    name: str
    allowed: bool
    reason_code: str
    detail: str

    def to_dict(self) -> dict:
        # A literal, not `dataclasses.asdict`. Eleven of these are serialised
        # for every proposed action across 815 cases and 84 ticks, and asdict
        # deep-copies recursively — it was the single hottest call in the run.
        return {
            "gate_id": self.gate_id,
            "name": self.name,
            "allowed": self.allowed,
            "reason_code": self.reason_code,
            "detail": self.detail,
        }


@dataclass
class PolicyDecision:
    allowed: bool
    blocked_by: Optional[str]
    reason_code: Optional[str]
    gate_trail: List[GateResult]
    value_protected_paise: int
    compliance_risk_avoided_paise: int

    def trail_as_dicts(self) -> List[dict]:
        return [g.to_dict() for g in self.gate_trail]


def _parse(ts) -> Optional[datetime]:
    if ts is None:
        return None
    if isinstance(ts, datetime):
        return ts
    return datetime.fromisoformat(ts)


# --------------------------------------------------------------------- gates

def g01_consent(case, action, ctx) -> GateResult:
    cust = ctx.get("customer") or {}
    if action.channel in ("silent", "human"):
        return GateResult("G01", "CONSENT", True, "NOT_APPLICABLE",
                          "No customer contact involved")

    if cust.get("opted_out_at"):
        return GateResult("G01", "CONSENT", False, "OPTED_OUT",
                          f"Customer opted out on {cust['opted_out_at']}")

    if not cust.get(f"consent_{action.channel}", False):
        return GateResult("G01", "CONSENT", False, f"NO_CONSENT_{action.channel.upper()}",
                          f"No consent on file for {action.channel}")

    if action.channel == "voice" and cust.get("dnd_registered"):
        return GateResult("G01", "CONSENT", False, "DND_REGISTERED",
                          "Number is on the national DND registry")

    return GateResult("G01", "CONSENT", True, "OK", "Consent verified for this channel")


def g02_quiet_hours(case, action, ctx) -> GateResult:
    if action.channel in ("silent", "human"):
        return GateResult("G02", "QUIET_HOURS", True, "NOT_APPLICABLE",
                          "Not a customer-facing contact")

    hour = ist_hour(ctx["now"])
    if hour >= QUIET_START_IST or hour < QUIET_END_IST:
        return GateResult("G02", "QUIET_HOURS", False, "QUIET_HOURS",
                          f"{hour:02d}:00 IST is inside the 9PM-9AM no-contact window")

    if action.channel == "voice" and not (VOICE_START_IST <= hour < VOICE_END_IST):
        return GateResult("G02", "QUIET_HOURS", False, "VOICE_HOURS",
                          f"Voice calls only 10AM-7PM IST; now {hour:02d}:00")

    return GateResult("G02", "QUIET_HOURS", True, "OK", f"{hour:02d}:00 IST is contactable")


def g03_frequency_cap(case, action, ctx) -> GateResult:
    if action.channel in ("silent", "human"):
        return GateResult("G03", "FREQUENCY_CAP", True, "NOT_APPLICABLE",
                          "Silent and internal actions do not reach the customer")

    t24 = ctx.get("customer_touches_24h", 0)
    t7d = ctx.get("customer_touches_7d", 0)

    if t24 >= MAX_TOUCHES_24H:
        return GateResult("G03", "FREQUENCY_CAP", False, "FREQ_CAP_24H",
                          f"Customer already contacted {t24}x in the last 24h")
    if t7d >= MAX_TOUCHES_7D:
        return GateResult("G03", "FREQUENCY_CAP", False, "FREQ_CAP_7D",
                          f"Customer already contacted {t7d}x in the last 7 days")

    return GateResult("G03", "FREQUENCY_CAP", True, "OK",
                      f"{t24} in 24h, {t7d} in 7d - under cap")


def g04_attempt_cap(case, action, ctx) -> GateResult:
    used = case.get("touches_used", 0)
    if used >= MAX_TOUCHES_PER_CASE:
        return GateResult("G04", "ATTEMPT_CAP", False, "MAX_ATTEMPTS",
                          f"Case has used all {MAX_TOUCHES_PER_CASE} attempts")
    return GateResult("G04", "ATTEMPT_CAP", True, "OK",
                      f"{used}/{MAX_TOUCHES_PER_CASE} attempts used")


def g05_cooldown(case, action, ctx) -> GateResult:
    last = _parse(case.get("last_touch_at"))
    if last is None:
        return GateResult("G05", "COOLDOWN", True, "OK", "First touch on this case")

    hours = (ctx["now"] - last).total_seconds() / 3600
    if hours < COOLDOWN_HOURS:
        return GateResult("G05", "COOLDOWN", False, "COOLDOWN_ACTIVE",
                          f"Only {hours:.1f}h since last touch, need {COOLDOWN_HOURS}h")
    return GateResult("G05", "COOLDOWN", True, "OK", f"{hours:.1f}h since last touch")


def g06_amount_band(case, action, ctx) -> GateResult:
    amount = case.get("amount_at_risk_paise", 0)
    cost = action.cost_paise

    if cost == 0:
        return GateResult("G06", "AMOUNT_BAND", True, "FREE_ACTION",
                          "Silent retry costs nothing")
    if amount <= 0:
        return GateResult("G06", "AMOUNT_BAND", False, "NO_VALUE_AT_RISK",
                          "Nothing at stake to recover")

    if amount < MIN_VIABLE_AMOUNT_PAISE:
        return GateResult("G06", "AMOUNT_BAND", False, "BELOW_VIABLE_FLOOR",
                          f"Rs {amount/100:.2f} is under the Rs "
                          f"{MIN_VIABLE_AMOUNT_PAISE/100:.0f} floor - fully-loaded "
                          f"recovery cost exceeds what can be recovered")

    ratio = cost / amount
    if ratio > MAX_COST_RATIO:
        return GateResult("G06", "AMOUNT_BAND", False, "COST_EXCEEDS_BAND",
                          f"Rs {cost/100:.2f} is {ratio:.0%} of Rs {amount/100:.2f} at risk "
                          f"(cap {MAX_COST_RATIO:.0%})")
    return GateResult("G06", "AMOUNT_BAND", True, "OK",
                      f"Cost is {ratio:.1%} of the amount at risk")


def g07_risk_hold(case, action, ctx) -> GateResult:
    if case.get("recovery_class") == "MANUAL_REVIEW" and action.channel != "human":
        return GateResult("G07", "RISK_HOLD", False, "RISK_HOLD",
                          "Risk-blocked case: humans only, never automated contact")
    return GateResult("G07", "RISK_HOLD", True, "OK", "Not flagged by the risk engine")


def g08_issuer_health(case, action, ctx) -> GateResult:
    issuer = ctx.get("issuer")
    if action.channel != "silent":
        return GateResult("G08", "ISSUER_HEALTH", True, "NOT_APPLICABLE",
                          "Only gateway retries depend on issuer health")
    if issuer and detector.is_degraded(issuer, ctx["now"]):
        until = detector.degraded_until(issuer)
        return GateResult("G08", "ISSUER_HEALTH", False, "ISSUER_DEGRADED",
                          f"{issuer} is degraded; holding retry until {until.isoformat()} "
                          f"rather than burning an attempt")
    return GateResult("G08", "ISSUER_HEALTH", True, "OK",
                      f"{issuer or 'issuer'} healthy")


def g09_duplicate_payment(case, action, ctx) -> GateResult:
    if ctx.get("entity_status") == "paid":
        return GateResult("G09", "DUPLICATE_PAYMENT", False, "ALREADY_PAID",
                          "Order was settled on another attempt - stop immediately")
    return GateResult("G09", "DUPLICATE_PAYMENT", True, "OK", "Still unpaid")


def g10_stopping_rule(case, action, ctx) -> GateResult:
    state = case.get("state")
    if state in TERMINAL_STATES:
        return GateResult("G10", "STOPPING_RULE", False, "CASE_CLOSED",
                          f"Case is {state} - no further contact, ever")
    if state == "PROMISED":
        promise = _parse(case.get("promise_date"))
        if promise and ctx["now"] < promise:
            return GateResult("G10", "STOPPING_RULE", False, "PROMISE_PENDING",
                              f"Customer promised to pay by {promise.date()} - honour it")
    return GateResult("G10", "STOPPING_RULE", True, "OK", f"Case is {state}")


def g11_ladder_order(case, action, ctx) -> GateResult:
    last_tier = ctx.get("last_tier")
    used = case.get("touches_used", 0)

    if action.tier == 3 and used < 2:
        return GateResult("G11", "LADDER_ORDER", False, "TIER_SKIP",
                          f"Tier 3 (voice) needs both cheap tiers spent first; only {used} used")
    if last_tier is not None and action.tier > last_tier + 1 and action.tier != 4:
        return GateResult("G11", "LADDER_ORDER", False, "TIER_SKIP",
                          f"Cannot jump from tier {last_tier} to tier {action.tier}")
    return GateResult("G11", "LADDER_ORDER", True, "OK",
                      f"Tier {action.tier} is the next rung")


GATES = [
    g01_consent, g02_quiet_hours, g03_frequency_cap, g04_attempt_cap,
    g05_cooldown, g06_amount_band, g07_risk_hold, g08_issuer_health,
    g09_duplicate_payment, g10_stopping_rule, g11_ladder_order,
]

# Blocks that represent avoided regulatory exposure rather than avoided spend.
COMPLIANCE_REASONS = {"OPTED_OUT", "DND_REGISTERED", "QUIET_HOURS", "VOICE_HOURS",
                      "FREQ_CAP_24H", "FREQ_CAP_7D", "RISK_HOLD"}


def evaluate(case: dict, action: ActionIntent, ctx: dict) -> PolicyDecision:
    trail: List[GateResult] = []
    blocked_by = None
    reason_code = None

    for gate in GATES:
        result = gate(case, action, ctx)
        trail.append(result)
        if not result.allowed and blocked_by is None:
            blocked_by = result.gate_id
            reason_code = result.reason_code
        # Deliberately keep going: the full trail is the deliverable.

    allowed = blocked_by is None
    value_protected = 0 if allowed else action.cost_paise
    compliance_avoided = (
        COMPLIANCE_RISK_PAISE
        if (not allowed and reason_code in COMPLIANCE_REASONS)
        else 0
    )

    return PolicyDecision(
        allowed=allowed,
        blocked_by=blocked_by,
        reason_code=reason_code,
        gate_trail=trail,
        value_protected_paise=value_protected,
        compliance_risk_avoided_paise=compliance_avoided,
    )
