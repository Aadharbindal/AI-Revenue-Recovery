# EVALUATION

Every number on this page is produced by `make report` from the committed database. Re-run it and you get this file back.

## What is measured, and what is simulated

**Real:** the classifier, the eleven-gate policy engine, the escalation ladder, the LLM validator, the hash-chained audit ledger, the treatment/control assignment, and every statistic below.

**Simulated:** whether a customer actually paid. Outcomes come from a seeded oracle whose base rates are documented and justified in `docs/assumptions.md`. The agent has no access to it. No real customer was contacted and no real money moved.

## Headline

| Metric | Value |
| --- | --- |
| Cases in the batch | 725 |
| Observation window | 84 ticks x 2h (7 days) |
| Amount at risk | Rs 10,603,380.00 |
| Treatment arm | 578 cases |
| Control arm (never contacted) | 147 cases |
| Gross recovery, treatment | 35.1% (203/578) |
| Gross recovery, control | 16.3% (24/147) |
| **Net incremental lift** | **+18.8 pp** (95% CI 11.7 to 25.9) |
| Value-weighted lift | +30.0 pp of amount at risk |
| **Incremental amount recovered** | **Rs 2,404,082.32** |
| Intervention spend | Rs 1,533.10 |
| ROI (variable messaging cost only) | 1568x |
| Lift needed to break even | 0.019 pp of amount at risk |
| Cost per incremental recovery | Rs 14.11 |

### Is the lift real?

Yes. The 95% confidence interval (11.7 to 25.9 pp) excludes zero, so at n=578 treatment and n=147 control the effect is distinguishable from no effect.

## By recovery class

Aggregate lift can hide a class that outreach is actively hurting.

| Class | Treatment | Control | Lift | 95% CI | Spend |
| --- | --- | --- | --- | --- | --- |
| RECEIVABLE_CHASE | 49.2% (n=59) | 9.5% (n=21) | +39.6 pp | 21.7 to 57.5 | Rs 63.70 |
| RETRY_TIMED | 43.3% (n=171) | 32.7% (n=49) | +10.6 pp | -4.5 to 25.7 | Rs 37.00 |
| AUTO_RETRY | 55.7% (n=106) | 4.2% (n=24) | +51.5 pp | 39.1 to 63.9 | Rs 12.10 |
| NUDGE_CUSTOMER | 24.2% (n=99) | 9.5% (n=21) | +14.7 pp | -0.4 to 29.8 | Rs 34.60 |
| SWITCH_METHOD | 19.0% (n=84) | 12.0% (n=25) | +7.0 pp | -8.2 to 22.3 | Rs 35.70 |
| MANUAL_REVIEW | 3.6% (n=28) | 0.0% (n=3) | +3.6 pp | -3.3 to 10.4 | Rs 1,350.00 |
| DEAD | 0.0% (n=31) | 0.0% (n=4) | +0.0 pp | 0.0 to 0.0 | Rs 0.00 |

## What the guardrails did

1170 actions were refused, avoiding Rs 376.40 of spend and Rs 462,500.00 of priced compliance exposure.

| Gate | Blocks | Cases | Spend avoided | Compliance avoided |
| --- | --- | --- | --- | --- |
| G01 Consent | 34 | 34 | Rs 13.20 | Rs 7,500.00 |
| G02 Quiet hours | 349 | 332 | Rs 121.50 | Rs 174,500.00 |
| G03 Frequency cap | 561 | 327 | Rs 158.10 | Rs 280,500.00 |
| G04 Attempt cap | 48 | 48 | Rs 9.60 | Rs 0.00 |
| G05 Cooldown | 72 | 72 | Rs 21.60 | Rs 0.00 |
| G06 Amount band | 9 | 9 | Rs 52.40 | Rs 0.00 |
| G07 Risk hold | 0 | 0 | Rs 0.00 | Rs 0.00 |
| G08 Issuer health | 97 | 97 | Rs 0.00 | Rs 0.00 |
| G09 Duplicate payment | 0 | 0 | Rs 0.00 | Rs 0.00 |
| G10 Stopping rule | 0 | 0 | Rs 0.00 | Rs 0.00 |
| G11 Ladder order | 0 | 0 | Rs 0.00 | Rs 0.00 |

G07 (Risk hold), G09 (Duplicate payment), G10 (Stopping rule), G11 (Ladder order) blocked nothing. That is the expected result, not a missing feature: the ladder never proposes the action those gates exist to refuse. They are the backstop that would catch a bug upstream, and if they ever fire there is one.

## Delivery

| Tier | Sent | Spend | Channels |
| --- | --- | --- | --- |
| 0 | 277 | Rs 0.00 | silent x277 |
| 1 | 311 | Rs 93.30 | email x69, whatsapp x242 |
| 2 | 277 | Rs 59.50 | sms x236, whatsapp x41 |
| 3 | 22 | Rs 33.00 | voice x22 |
| 4 | 27 | Rs 1,350.00 | human x27 |

Message bodies from the LLM: 0. From the deterministic fallback: 601.

Fallback reasons:

- `NO_API_KEY` x601

Live Razorpay test-mode payment links minted: 0. The rest are simulated and flagged as such in the database, so no chart implies more live integration than there is.

## Honest exception list

Everything the system did not recover, grouped by why. This is part of the result, not an appendix to it.

| Reason | Cases | Amount left on the table |
| --- | --- | --- |
| Still open when the 7-day observation window closed | 227 | Rs 3,186,867.00 |
| Control arm - observed with no intervention | 119 | Rs 2,247,406.00 |
| No consent on any channel available at tier 2 | 18 | Rs 384,697.00 |
| Attempt budget exhausted | 48 | Rs 343,367.00 |
| Number on the national DND registry | 4 | Rs 247,154.00 |
| Escalation ladder complete - no cheaper step left | 26 | Rs 190,781.00 |
| The mandate is gone; there is nothing left to retry against | 27 | Rs 162,909.00 |
| Customer revoked consent | 11 | Rs 94,648.00 |
| Already settled on another attempt - chasing it would risk a double charge | 8 | Rs 50,093.00 |
| No consent on any channel available at tier 1 | 1 | Rs 1,949.00 |
| Amount is below the floor where recovery pays for itself | 9 | Rs 290.00 |

## Audit integrity

- Ledger events: 3674
- Chain valid: **True**
- Broken rows: 0

Every decision above is reconstructable from the ledger. `make verify` recomputes the chain from genesis.

## Limitations

- Outcomes are simulated. The decision logic and the measurement are not, but no claim is made about real-world recovery rates.
- One batch, one seed. The base rates in `docs/assumptions.md` are stated estimates, not measurements from production traffic.
- The control arm is untouched by this system only. In production it would still receive the payment provider's own default retries.
- Voice is scripted and validated end-to-end, but rendered as audio rather than dialled; there is no live telephony integration.
- **The ROI figure counts variable messaging cost only.** It excludes platform, engineering, and support load. Treat it as an upper bound on the unit economics, not as a business case. The break-even line above is the more useful number: it is how small the lift could have been before the campaign stopped paying for its own messages.
- Two lift figures are reported. The case-count lift weights a small cart the same as a large invoice; the value-weighted lift does not. They differ, and both are shown rather than whichever is larger.
