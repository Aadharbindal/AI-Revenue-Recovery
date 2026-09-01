# RecoverOS - AI Revenue Recovery System
**Detect. Diagnose. Recover. Prove it.**

Track 03 — AI Revenue Recovery | Razorpay AI Buildathon

## Core Thesis
**The LLM never touches a rupee.** All currency, arithmetic, and counts are strictly computed in Python and SQL. The LLM only explains root causes and drafts message templates with safe placeholders (e.g., `{{amount}}`). A strict validator rejects any LLM output containing literal digits and ensures compliant language.

## Architecture Highlights
- **Deterministic Classification**: A zero-LLM decision table routing failures based on Razorpay's exact error taxonomy.
- **11-Gate Policy Engine**: Strict rules (quiet hours, frequency caps, duplicate payment holds) protecting users and balancing cost.
- **Hash-Chained Audit Ledger**: Every decision, LLM call, and execution is logged in a cryptographically verifiable append-only ledger.
- **Seeded Oracle Measurement**: Outcomes are simulated via a deterministic, seeded oracle (the agent has no access to it). We report true incremental lift using an A/B treatment vs. control design.

## How to Run

1. **Clone & Setup**:
   ```bash
   git clone https://github.com/your-username/recoveros.git
   cd recoveros
   ```
2. **Environment Variables**:
   Copy `.env.example` to `.env` and fill in your test keys.
   ```bash
   cp .env.example .env
   ```
3. **Demo (One Command)**:
   ```bash
   make demo
   ```
   *Note: This command runs the deterministic batch script and seeds the database if empty. The exact numbers and logs will match our video presentation.*

## Results Summary
*(To be populated after final run)*
- **Gross Recovery (Treatment)**: %
- **Gross Recovery (Control)**: %
- **Net Incremental Lift**: pp (95% CI: - )
- **Incremental ₹ Recovered**: 

## What's Simulated vs. Real
- **Simulated**: The dataset (600 payments, 80 invoices), user responses, and payment outcomes via the `sim/oracle.py` module.
- **Real**: The classification logic, the policy engine gates, the LLM validation, the audit trail, and the test-mode Razorpay Payment Links generated for the live demo subset.

## Limitations
- *Sample Size*: With n=600, certain lifts might not reach high statistical significance. A larger batch would be required in production.
- *LLM Latency*: Batching is optimized via template caching per (class, tier, language) to avoid redundant LLM inference calls.
