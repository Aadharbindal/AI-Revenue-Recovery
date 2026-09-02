# Run environment

Everything here depends on what was configured when the batch ran, so unlike `EVALUATION.md` it is **not** expected to reproduce. The recovery statistics do not depend on any of it: the outcome oracle is seeded, and a message that fell back to a template recovers exactly as often as one the model wrote.

This file records the run that produced the committed database.

## Where message bodies came from

| Source | Count |
| --- | --- |
| Written by the model | 469 |
| Deterministic template | 219 |

### Drafts the validator refused

The guardrail doing its job against a live model, not a fixture.

- `MISSING_TOKEN:amount` x78
- `TOO_LONG:161>160` x12
- `MISSING_OPTOUT_INSTRUCTION` x12

### Calls the provider did not answer

A free tier rate-limits. The batch finished anyway, which is the entire point of having a deterministic fallback.

- `PROVIDER_ERROR:RateLimitError` x117

## Payment links

Live Razorpay test-mode links minted: **10**. Every other link is simulated and flagged as such in the database, so nothing on the dashboard implies more live integration than there is.

## Delivery by tier

| Tier | Sent | Spend | Channels |
| --- | --- | --- | --- |
| 0 | 261 | Rs 0.00 | silent x261 |
| 1 | 370 | Rs 111.00 | email x78, whatsapp x292 |
| 2 | 304 | Rs 65.30 | sms x259, whatsapp x45 |
| 3 | 23 | Rs 34.50 | voice x23 |
| 4 | 34 | Rs 1,700.00 | human x34 |
