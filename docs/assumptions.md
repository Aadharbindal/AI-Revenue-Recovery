# Assumptions & Base Rates

This document outlines the base rates used by the deterministic outcome oracle (`sim/oracle.py`). The agent has no access to these base rates; they exist purely to simulate the real-world recovery probability for the synthetic dataset.

## Base Rates (Treatment)

| Recovery Class | Tier | Base Rate (Probability of Recovery) | Justification |
| :--- | :--- | :--- | :--- |
| RETRY_TIMED | 0 | 0.31 | Silent retry on payday windows often clears ~30% of insufficient funds. |
| RETRY_TIMED | 1 | 0.48 | Nudge + link increases success rate for insufficient funds. |
| AUTO_RETRY | 0 | 0.62 | Retry on technical errors (issuer down) after health restores is highly successful. |
| SWITCH_METHOD | 1 | 0.34 | Nudging customer to use a different card or UPI. |
| NUDGE_CUSTOMER | 1 | 0.22 | Basic reminder for customer-sourced drop-offs. |
| NUDGE_CUSTOMER | 2 | 0.27 | Multi-channel follow-up. |
| RECEIVABLE_CHASE | 1 | 0.19 | Email/WhatsApp reminder for overdue invoices. |
| RECEIVABLE_CHASE | 3 | 0.41 | Voice call (Tier 3) significantly increases B2B receivable recovery. |
| MANUAL_REVIEW | None | 0.03 | Manual queue has very low success, mostly fraud/risk blocks. |
| DEAD | None | 0.00 | Mandate revoked or already paid. No chance. |

## Baseline Rates (Control - No Intervention)

| Recovery Class | Baseline Rate |
| :--- | :--- |
| RETRY_TIMED | 0.24 |
| AUTO_RETRY | 0.29 |
| SWITCH_METHOD | 0.11 |
| NUDGE_CUSTOMER | 0.14 |
| RECEIVABLE_CHASE | 0.09 |
| MANUAL_REVIEW | 0.02 |
| DEAD | 0.00 |

*Note: These are estimates based on standard fintech payment gateway drop-off recovery metrics.*
