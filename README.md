# RecoverOS

**Detect. Diagnose. Recover. Prove it.**

Razorpay AI Buildathon — Track 03, AI Revenue Recovery.

A failed payment is not one problem. A bank outage, an empty balance, an
expired card and a risk block all show up as "payment failed", and the right
response to each is different — one of them is *do nothing*. RecoverOS routes
each failure on Razorpay's own error taxonomy, runs a bounded escalation
ladder behind eleven policy gates, and measures what it actually recovered
against a control arm it never touched.

---

## The one architectural rule

> **The LLM never touches a rupee.**

Every amount, every count, every currency figure is computed in Python and SQL.
The model does exactly one job in the money path: it writes a message
*template* containing `{{placeholders}}`. It never sees an amount, never picks a
recipient, and never decides whether to send.

This is enforced mechanically, not by prompt. `app/llm/validator.py` rejects any
draft containing a literal digit — write "your payment of ₹1,499 is pending" and
the draft is discarded and a deterministic template is used instead. The only
way a rupee figure reaches a customer is Python substituting `{{amount}}` with a
value read from the database.

Two consequences: a batch of 725 cases costs on the order of eighteen model
calls rather than 725, because templates are cached per (class, tier,
language); and when the provider is down, rate-limits us, or returns malformed
JSON, the batch does not stop.

---

## Run it

```bash
make demo
```

That seeds the database, runs the batch, and regenerates `EVALUATION.md`. It
needs Python 3.9+ and no API keys — with an empty `.env` the message bodies come
from deterministic templates and payment links are simulated and flagged as
such. **You do not need our credentials to reproduce our numbers.**

```bash
make test      # 126 tests
make verify    # recompute the audit chain from genesis
make api       # backend on :8000
make web       # dashboard on :3000
```

<details>
<summary>Without <code>make</code> (Windows, or a machine with no Make)</summary>

Every target is a one-line script. Set `PYTHONPATH` to `backend` and run them
directly:

```bash
export PYTHONPATH=backend          # PowerShell: $env:PYTHONPATH="backend"

python backend/scripts/seed.py           # build demo.db from seed 42
python backend/scripts/run_batch.py      # run the 7-day simulation
python backend/scripts/make_report.py    # regenerate EVALUATION.md
python backend/scripts/verify_ledger.py  # recompute the audit chain
python -m pytest backend/tests -q        # tests
python -m uvicorn app.main:app --port 8000
cd frontend && npm run dev
```

</details>

`backend/demo.db` is committed and pre-seeded, so a clean clone shows the exact
numbers below without running anything.

---

## Results

Full methodology in **[EVALUATION.md](EVALUATION.md)**. Headline:

| | |
| --- | --- |
| Cases | 725 (578 treatment, 147 control) |
| Amount at risk | ₹1.06 Cr |
| Gross recovery, treatment | 35.1% (203/578) |
| Gross recovery, control | 16.3% (24/147) |
| **Net incremental lift** | **+18.8 pp** (95% CI 11.7 → 25.9, significant) |
| Incremental recovered | ₹24.04 L |
| Spend | ₹1,533.10 |
| Actions refused by guardrails | 1,170 |
| Audit ledger | 3,674 events, chain valid |

Gross recovery would read 35.1%. But 16.3% of untouched cases came back on
their own, and that share is not ours to claim. Only the difference is.

**Per class, four of six lanes cannot be distinguished from zero at this sample
size, and the most expensive lane is not the one carrying the result** — the
human-review queue is 88% of total spend for a lift whose interval includes
zero. That is in `EVALUATION.md` too, because it is the finding, not a
footnote.

---

## What is real and what is simulated

**Real:** the classifier, the eleven-gate policy engine, the escalation ladder,
the issuer-health detector, the LLM validator, the hash-chained audit ledger,
the treatment/control assignment, the statistics, and the Razorpay test-mode
Payment Links API integration.

**Simulated:** whether a customer paid. Outcomes come from a seeded oracle whose
base rates are written down and justified in
[docs/assumptions.md](docs/assumptions.md). `app/core/*` does not import it. No
real customer was contacted and no real money moved.

Payment links are minted live against Razorpay test mode up to a small budget
and simulated beyond it — every link is stored with a flag saying which it is,
and the dashboard shows it, so nothing on screen implies more live integration
than there is.

---

## How it works

```
 payments ──▶ detector      z-scores each issuer against its own baseline
                  │
 case ───────▶ classifier   Razorpay's error_source + error_step → recovery class
                  │
              ladder        cheapest useful next step, no tier skipping
                  │
              policy        11 gates, all evaluated, full trail recorded
                  │
              executor      renders the template, mints the link, sends
                  │
              ledger        SHA-256 hash-chained, append-only
```

Details in [ARCHITECTURE.md](ARCHITECTURE.md). The decision table is in
[docs/decision-table.md](docs/decision-table.md); the gates in
[docs/guardrails.md](docs/guardrails.md).

### The agent loop is a simulation, not a single pass

The batch steps through seven simulated days in two-hour ticks against a fixed
clock (`app/core/clock.py`). Nothing in the decision path calls
`datetime.now()`.

That is not decoration. Half the policy engine is time-dependent — quiet hours,
cooldowns, frequency caps, issuer-health windows — and none of it means
anything if every case is processed once, at whatever time the demo happens to
run. An earlier version did exactly that, and four gates were unreachable code
while the results changed depending on the hour you ran it. Same seed, same
clock, same numbers, on any machine, at any hour.

---

## The measurement

- **20% control arm**, assigned by `sha256(order_id + salt) % 100 < 20`. Hashing
  rather than sampling means the arm is a pure function of the id: fixed before
  anything is known about the case, and independently recomputable by anyone
  who wants to check we did not move cases between arms after seeing outcomes.
- **Control cases are classified, measured, and never contacted.** Not once, not
  cheaply, not silently. There is an end-to-end test that fails if a single
  action lands on a control case, because if one does then every number here is
  wrong and nothing else would notice.
- **One random draw per case.** Each delivered touch lowers the bar that draw
  has to clear. Drawing a fresh success roll per touch would give a three-touch
  case three chances against control's one, and the lift would be an artefact
  of the simulation rather than a measurement of the policy.
- **Confidence intervals on everything**, and a null result reported as null,
  with the sample size it would take to detect the effect.

---

## Limitations

- Outcomes are simulated. No claim is made about real-world recovery rates.
- One batch, one seed. The oracle's base rates are stated estimates, not
  measurements from production traffic.
- The ROI figure counts variable messaging cost only — no platform, engineering
  or support load. It is an upper bound, not a business case. The break-even
  line in `EVALUATION.md` is the more useful number.
- The control arm is untouched *by this system*. In production it would still
  receive the payment provider's own default retries.
- Voice scripts are validated and rendered end to end, but there is no live
  telephony integration. That was a deliberate scope cut — see
  [docs/future-scope.md](docs/future-scope.md).

---

## Repository

```
backend/app/core/      clock, classifier, detector, ladder, policy, orchestrator, ledger
backend/app/llm/       prompts, validator, deterministic fallbacks
backend/app/sim/       dataset generator, outcome oracle
backend/app/analytics/ experiment statistics, report rendering
backend/app/api/       FastAPI routers
backend/tests/         126 tests
frontend/src/app/      command centre, live run, cases, timeline, guardrails,
                       experiment, exceptions, audit
docs/                  decision table, guardrails, assumptions, future scope
2AM.md                 what broke, and how it was found
```

Stack: FastAPI · SQLAlchemy · Pydantic v2 · SQLite · Next.js 16 · TypeScript ·
Tailwind. SQLite because the dataset is synthetic, deterministic and small, and
a single committed file gives a judge the exact numbers with nothing to install.
