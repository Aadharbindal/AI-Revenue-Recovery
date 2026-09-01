"""
Escalation ladder.

Cheapest channel first, and no skipping. A voice call costs five times a
WhatsApp message and is far more intrusive, so it has to be earned: the cheap
tiers must have been tried and failed, the amount has to be worth the call, and
the customer has to have consented to voice.

The ladder proposes; the policy engine disposes. Nothing here sends anything —
`get_next_action` returns an *intent*, and every intent still has to clear all
eleven gates.
"""

from dataclasses import dataclass
from typing import Optional

# Tier -> (channel, cost in paise). Costs are the realistic Indian rates a
# merchant actually pays, which is what makes the ROI number meaningful.
TIER_SPEC = {
    0: ("silent", 0),        # a retry against the gateway; costs nothing
    1: ("whatsapp", 30),     # ₹0.30
    2: ("sms", 20),          # ₹0.20
    3: ("voice", 150),       # ₹1.50
    4: ("human", 5000),      # ₹50.00 of an agent's time
}

VOICE_MIN_AMOUNT_PAISE = 200_000   # ₹2,000
MAX_TOUCHES = 3


@dataclass
class ActionIntent:
    tier: int
    channel: str
    cost_paise: int
    rationale: str


def _intent(tier: int, rationale: str, channel: Optional[str] = None,
            cost_paise: Optional[int] = None) -> ActionIntent:
    chan, cost = TIER_SPEC[tier]
    return ActionIntent(tier=tier, channel=channel or chan,
                        cost_paise=cost if cost_paise is None else cost_paise,
                        rationale=rationale)


def get_next_action(recovery_class: str, touches_used: int, amount_paise: int,
                    consent_voice: bool = False) -> Optional[ActionIntent]:
    """
    The next rung for this case, or None if the ladder is finished.

    Returning None is a real outcome, not a failure: it means the case is
    exhausted and should stop consuming budget.
    """
    rc = recovery_class

    if rc == "DEAD":
        return None

    if rc == "MANUAL_REVIEW":
        # Never contacted automatically. It goes to a person exactly once, and
        # G07 will block it if anything tries to message it anyway.
        if touches_used == 0:
            return _intent(4, "risk-blocked: routed to a human, never auto-contacted")
        return None

    # Note what is *not* here: an attempt-count check. The ladder's job is to
    # name the cheapest next step; enforcing the attempt budget is G04's job.
    # Duplicating the rule here would mean the cap is enforced in two places and
    # audited in neither.

    # Infrastructure and balance failures start silent — a retry that costs
    # nothing and bothers nobody is strictly better than a message.
    if rc in ("AUTO_RETRY", "RETRY_TIMED"):
        if touches_used == 0:
            return _intent(0, "silent gateway retry before spending anything")
        if touches_used == 1:
            return _intent(1, "retry did not clear: first customer contact")
        return _intent(2, "no response on WhatsApp: cheaper SMS attempt")

    # The customer has to *do* something (fix a VPA, use another card, finish
    # authentication), so a silent retry cannot help. Start at Tier 1.
    if rc in ("NUDGE_CUSTOMER", "SWITCH_METHOD"):
        if touches_used == 0:
            return _intent(1, "customer action required: actionable link on WhatsApp")
        return _intent(2, "no response: SMS fallback")

    # B2B receivables are the one lane that earns a voice call. The rungs are
    # email -> WhatsApp -> voice; WhatsApp sits at tier 2 rather than tier 1 so
    # the escalation is monotonic and G11's no-skipping rule can be enforced
    # literally, instead of being special-cased for this lane.
    if rc == "RECEIVABLE_CHASE":
        if touches_used == 0:
            return _intent(1, "polite email reminder with the invoice link",
                           channel="email")
        if touches_used == 1:
            return _intent(2, "no reply to the email: WhatsApp reminder",
                           channel="whatsapp", cost_paise=TIER_SPEC[1][1])
        if amount_paise >= VOICE_MIN_AMOUNT_PAISE and consent_voice:
            return _intent(3, "high-value invoice, voice consent on file: "
                              "Hinglish call with a promise-to-pay option")
        return _intent(2, "below the voice threshold or no voice consent: SMS instead")

    return None
