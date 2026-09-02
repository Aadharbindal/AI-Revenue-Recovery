# RecoverOS

**Detect. Diagnose. Recover. Prove it.**

Razorpay AI Buildathon — Track 03, AI Revenue Recovery.

A failed payment is not one problem. A bank outage, an empty balance, an
expired card, a lapsed subscription mandate and a risk block all show up as
"payment failed", and the right response to each is different — one of them is
*do nothing*. RecoverOS routes each failure on Razorpay's own error taxonomy,
runs a bounded escalation ladder behind eleven policy gates, and measures what
it actually recovered against a control arm it never touched.

It covers all three lanes in the brief:

| Lane | How it is handled |
| --- | --- |
| **Payment failures** | Routed on `error_source` + `error_step` into silent retry, timed retry, method switch, nudge, mandate repair, human review, or stop |
| **Checkout abandonment** | Its own class — no error to diagnose and nothing to retry, so a shorter two-touch ladder |
| **Overdue receivables** | Email → WhatsApp → Hinglish voice call, with a promise-to-pay hold |

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

**You can watch this happen.** The `/validator` page runs the same function the
batch calls against the drafts a model actually produces when told not to write
numbers — an invented rupee figure, an invented due date, a legal threat, a
Hinglish legal threat, a voice script with no opt-out — and shows every check
plus what would really have been sent. It needs no API key.

Two consequences. Templates are cached per (class, tier, language, channel) and
each combination is attempted exactly once, so **688 rendered messages cost 64
provider calls** — eleven messages per call. And when the provider is down,
rate-limits us, or returns malformed JSON, the batch does not stop.

On the committed run the validator rejected **102 live model drafts**: 78 that
omitted `{{amount}}`, 12 voice scripts with no opt-out, and 12 SMS one
character over the 160-character limit. Each fell back to a deterministic
template with the reason recorded on the action row.

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
make test      # 157 tests
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
python backend/scripts/render_voice.py   # render the voice scripts to audio
python -m pytest backend/tests -q        # tests
python -m uvicorn app.main:app --port 8000
cd frontend && npm run dev
```

</details>

`backend/demo.db` is committed and pre-seeded, so a clean clone shows the exact
numbers below without running anything.

---

## Results

Full methodology in **[EVALUATION.md](EVALUATION.md)**, which CI regenerates on
every push and fails if a single figure drifts. Headline:

| | |
| --- | --- |
| Cases | 815 (652 treatment, 163 control) |
| Amount at risk | ₹1.11 Cr |
| Gross recovery, treatment | 33.4% (218/652) |
| Gross recovery, control | 19.0% (31/163) |
| **Net incremental lift** | **+14.4 pp** (95% CI 7.4 → 21.4, significant) |
| Cost per incremental recovery | **₹20.30** |
| Spend | ₹1,908.10 |
| Actions refused by guardrails | 1,370 |
| Audit ledger | 4,185 events, chain valid |

Gross recovery would read 33.4%. But 19.0% of untouched cases came back on
their own, and that share is not ours to claim. Only the difference is.

**Per class, six of the nine lanes cannot be distinguished from zero at this
sample size, and the most expensive lane is not the one carrying the result** —
the human-review queue is 89% of total spend for a lift whose interval includes
zero. That is in `EVALUATION.md` too, because it is the finding, not a
footnote.

The headline number to argue with is **₹20.30 per incremental recovery**, not
the ROI multiple. The multiple is large because the cost model counts messaging
and nothing else; the per-recovery figure is comparable to something.

---

## What is real and what is simulated

**Real:** the classifier, the eleven-gate policy engine, the escalation ladder,
the issuer-health detector, the LLM validator, the hash-chained audit ledger,
the treatment/control assignment, the statistics, the Razorpay test-mode
Payment Links API integration, the model calls (469 of the 688 message bodies
were written by one), and the rendered voice audio.

Which of those actually ran on the committed batch — how many bodies the model
wrote, how many payment links were minted live — is recorded in
[docs/run-environment.md](docs/run-environment.md). That file is deliberately
*not* reproducible: it depends on which services answered, and the recovery
statistics do not depend on it at all.

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
- **Stratified assignment.** Hashing each id gives 20% only in expectation, and
  the 90 abandoned carts landed on 8 controls. Ranking ids by hash within each
  cohort keeps the assignment a pure function of the id while guaranteeing every
  lane a control group worth comparing against.

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
README.md                  you are here
ARCHITECTURE.md            how the pieces fit, and why the clock holds it up
EVALUATION.md              the numbers — regenerated and checked by CI
2AM.md                     ten real bugs, and how each was found

backend/
  app/
    core/                  the agent
      clock.py             the fixed simulation clock everything else reads
      classifier.py        failure -> recovery class, a decision table
      detector.py          issuer health, z-scored per issuer
      ladder.py            the cheapest useful next step
      policy.py            the eleven gates
      orchestrator.py      the tick loop
      ledger.py            hash-chained audit trail
    llm/                   prompts, validator, deterministic fallbacks
    sim/                   dataset generator, outcome oracle (the agent cannot read it)
    analytics/             experiment statistics, report rendering
    api/                   FastAPI routers
    models.py  db.py       schema and session
  scripts/                 seed, run-batch, report, verify-ledger, render-voice
  tests/                   158 tests
  demo.db                  committed and pre-seeded, so a clone shows these numbers

frontend/src/
  app/                     command centre, live run, cases, case timeline,
                           guardrails, experiment, exceptions, audit, validator
  components/              charts, shared primitives, icons
  lib/                     typed API client, formatting

docs/                      README.md indexes the rest
  data/                    the same results as JSON
scripts/                   start-backend.ps1, for Windows without Make
```

Stack: FastAPI · SQLAlchemy · Pydantic v2 · SQLite · Next.js 16 · TypeScript ·
Tailwind. SQLite because the dataset is synthetic, deterministic and small, and
a single committed file gives a judge the exact numbers with nothing to install.

Full documentation index: [docs/README.md](docs/README.md).
