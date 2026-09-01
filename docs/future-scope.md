# Future scope

What was deliberately left out, and why. Scope was cut so that what exists
actually works — a demo with six half-finished lanes is worth less than one with
two that survive questioning.

---

## Cut on purpose

### Live telephony

Voice scripts are drafted, validated (automated-call disclosure, opt-out
instruction, no coercive language in English or Hindi, 400-character cap) and
rendered end to end. What is missing is dialling: no SIP trunk, no DTMF capture,
no call recording.

The promise-to-pay flow is modelled — a Tier-3 call can end in a commitment,
which G10 then honours until its date, after which the case either resolves or
reopens. The IVR that would capture that keypress does not exist.

**Why cut:** telephony integration is days of provider onboarding and carrier
approvals, and none of it demonstrates anything about the recovery logic. The
part worth judging — that a voice script is subject to the same validator and
the same gates as an SMS — is built.

### Subscription and mandate recovery

`mandate_revoked` is classified as `DEAD` and stopped. In production it is a
lane of its own: re-authorisation flows, UPI Autopay mandate repair, card
network updater. It has a different ladder and different economics.

**Why cut:** a third lane would have meant three shallow lanes instead of two
deep ones.

### Checkout abandonment before a payment attempt

RecoverOS starts at a *failed payment*. Carts abandoned before any attempt never
produce an `error_reason`, so the classifier has nothing to route on. They need
intent signals rather than failure taxonomy — a genuinely different problem.

### Real-time streaming

The batch is a discrete-event simulation over a fixed horizon. Production would
consume payment webhooks and act within seconds.

The decision path is already event-shaped — classifier, ladder, gates, executor
all operate on one case at a time — so the change is the scheduler, not the
logic. The clock abstraction exists partly to make that swap mechanical.

---

## Known weaknesses in what is built

Listed because they are real, not because they are small.

### The human-review queue is not carrying its cost

Tier 4 is 88% of total spend for a lift whose confidence interval includes zero.
On this batch, the honest conclusion is that routing risk-blocked cases to a
person is not paying for itself — either the queue needs triage so only the
high-value cases reach it, or the ₹50 estimate for agent time is wrong.

This is the finding the per-class table exists to surface, and it points at our
own design.

### Four of six classes are not statistically significant

`RETRY_TIMED`, `NUDGE_CUSTOMER`, `SWITCH_METHOD` and `MANUAL_REVIEW` all have
intervals crossing zero at this sample size. The aggregate result is
significant; the per-lane results mostly are not. Detecting per-lane effects
would need roughly four times the batch.

### The receivables lane is measured pessimistically

A seven-day window is short for B2B invoices. Real payment cycles run longer, so
the `RECEIVABLE_CHASE` numbers are probably conservative — including the voice
lift, which is the one we most want to defend.

### The detector is univariate

It scores failure counts per issuer against that issuer's own baseline. It does
not distinguish an issuer-wide outage from one affecting a single payment method
or card network, and it has no notion of expected volume by time of day — a
Sunday 4 AM spike and a Monday 4 PM spike are treated identically.

### Channel selection is consent-driven, not effectiveness-driven

Within a tier, the channel is whichever the customer consented to. It does not
learn that a given segment responds better to WhatsApp than email. A contextual
bandit over channel choice is the obvious next step, and the audit ledger
already records everything it would need to train on.

### One merchant, one dataset, one seed

Every number is from a single synthetic batch. Nothing here has been validated
against another merchant's traffic shape.

---

## What production would need before this touched real customers

1. **Real outcome data.** The oracle would be replaced by actual payment
   webhooks. Every base rate in `docs/assumptions.md` becomes a measurement.
2. **A consent system of record.** Consent is a column here; in production it is
   an audited, timestamped, source-attributed system with its own retention
   rules.
3. **Human review of the first live batch.** The gates should be enforced in
   shadow mode before they are enforced for real.
4. **Per-merchant policy configuration.** The gate constants are global.
   Different merchants have different tolerances, and a fashion retailer's quiet
   hours are not a B2B supplier's.
5. **Rate limiting and idempotency on the executor.** The simulation cannot
   double-send. A production executor with retries can.
6. **Ledger export.** Hash-chained rows in SQLite prove nothing to an external
   auditor. Periodic anchoring to an append-only store outside our control would.
