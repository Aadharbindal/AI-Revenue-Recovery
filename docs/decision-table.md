# Recoverability decision table

Implemented in `backend/app/core/classifier.py`. No LLM, no model, no
probability — a table of predicates evaluated in order, first match wins.

## Why a table

Razorpay's failure response carries two fields that between them decide
recoverability:

- `error_source` — **whose fault was it?** `customer | business | bank | gateway | internal | NA`
- `error_step` — **where did it break?** `payment_initiation | payment_authentication | payment_authorization | payment_capture | payment_response`

A bank or gateway failure means the customer did nothing wrong, so a silent
retry can work and a message would be noise. A customer-source failure means
only the customer can fix it, so a retry is pointless and a nudge is the
cheapest thing that can succeed. An internal risk block means the answer is to
stop.

Routing on Razorpay's own taxonomy rather than one we invented means every
decision traces back to a field the merchant can already see in their dashboard.

## The rules

Evaluated top to bottom.

| Rule | Condition | Class | Reasoning |
| --- | --- | --- | --- |
| R-01 | Order already `paid` | `DEAD` | Settled on another attempt. Chasing it risks a double charge. |
| R-02 | `mandate_revoked`, `refund_issued` | `DEAD` | Nothing left to retry against. |
| R-03 | `payment_blocked_by_risk`, `account_blocked` | `MANUAL_REVIEW` | The risk engine said no. A human decides; never auto-contact. |
| R-04 | source ∈ {bank, gateway} **and** reason ∈ {`issuer_down`, `gateway_technical_error`, `payment_timeout`} | `AUTO_RETRY` | Infrastructure failed, not the customer. Retry silently once it is healthy. |
| R-05 | `insufficient_funds` | `RETRY_TIMED` | The money was not there *yet*. Retry near payday before spending on outreach. |
| R-06 | `invalid_vpa`, `card_expired`, `card_declined_by_issuer`, `international_transaction_not_allowed`, `incorrect_cvv`, `limit_exceeded` | `SWITCH_METHOD` | This instrument cannot work. Only a different method will. |
| R-07 | entity is an invoice | `RECEIVABLE_CHASE` | B2B receivable — escalating ladder, voice only if it is worth it. |
| R-08 | source = customer | `NUDGE_CUSTOMER` | They abandoned the flow. A reminder with a working link is enough. |
| R-DEFAULT | anything else | `MANUAL_REVIEW` | Unrecognised failure. Routed to a human rather than guessed at. |

## Rule order is load-bearing

`DEAD` and `MANUAL_REVIEW` sit above every outreach branch deliberately.

A payment can be `payment_blocked_by_risk` *and* have `error_source = customer`.
If R-08 were evaluated first, a risk-blocked customer would land in a WhatsApp
campaign. R-03 above R-08 makes that impossible regardless of what else the
payment looks like. There is a test for exactly this case.

The same applies to R-01: an order that was settled on a later attempt is dead
whatever its first failure reason was.

## Classification follows the latest attempt

A customer who retried with a different method changed the problem. If attempt 1
failed on `insufficient_funds` and attempt 2 failed on `invalid_vpa`, the case
is `SWITCH_METHOD` — the balance issue is history. Input order does not matter;
attempts are sorted by `attempt_no`.

## R-DEFAULT is not a fallback, it is a decision

Razorpay adds error reasons over time. An unrecognised one routes to a human
rather than to whichever outreach branch happens to match on `error_source`.
Guessing is worse than queuing.

## What each class does next

| Class | Ladder entry | Contacts customer? |
| --- | --- | --- |
| `AUTO_RETRY` | Tier 0, silent retry | Only after the retry fails |
| `RETRY_TIMED` | Tier 0, silent retry | Only after the retry fails |
| `SWITCH_METHOD` | Tier 1 — a retry cannot help | Yes |
| `NUDGE_CUSTOMER` | Tier 1 — a retry cannot help | Yes |
| `RECEIVABLE_CHASE` | Tier 1 email → tier 2 WhatsApp → tier 3 voice | Yes |
| `MANUAL_REVIEW` | Tier 4, human queue | **Never automatically** |
| `DEAD` | Nothing | **Never** |
