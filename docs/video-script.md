# Five-minute video script

Every number below is from the committed `EVALUATION.md`. If you re-run the
batch they will still be these numbers — that is the point of the fixed clock.

**Setup:** OBS, screen capture, no face cam needed. Backend and frontend both
running, `/api/health` hit once beforehand so nothing is cold. Three takes; the
first one is always bad.

**Rule for the whole recording:** show the product, never a slide. Never say "I
would have" — only what exists.

---

## 0:00–0:25 · The problem, with a number

**On screen:** `/` Command Center. Let the hero figure sit for a beat, then
scroll slowly to the divergence chart and stop there.

> "Seven hundred and twenty-five failed payments and overdue invoices. One crore
> six lakh rupees at risk.
>
> This is the chart the whole project is about. The blue line is the cases the
> agent worked. The grey one is a fifth of the batch it was never allowed to
> touch. The wedge between them is the only thing we're allowed to take credit
> for — and the dark vertical stripes are the seven nights, where the
> quiet-hours gate suppresses everything and the blue line goes flat."

Do not rush this. Hovering the chart at day 3 to show the tooltip is worth two
seconds.

---

## 0:25–1:00 · The architecture rule

**On screen:** `docs/diagrams/architecture.svg`, or the ARCHITECTURE.md section.

> "One rule runs through all of it: the LLM never touches a rupee.
>
> Classification is a decision table on Razorpay's own error taxonomy — no
> model. Amounts are computed in Python. Eleven policy gates decide whether
> anything is allowed to happen. The model does exactly one job: it writes a
> message template with placeholders. And a validator rejects any draft
> containing a literal digit, so the only way a rupee figure reaches a customer
> is Python substituting it from the database.
>
> Six hundred cases, eighteen model calls. The model writes the template once;
> the code fills in every rupee, every name, every link. If the provider goes
> down mid-batch, the batch doesn't."

---

## 1:00–2:15 · The live run

**On screen:** `/run`. Press **Run batch**. Talk over the stream.

> "This is seven simulated days in two-hour ticks. The clock is fixed — nothing
> here calls `datetime.now()`, so this produces identical numbers on any machine
> at any hour.
>
> The detector has already flagged HDFC as degraded — it z-scores each issuer
> against its own baseline, so a busy bank isn't mistaken for a broken one.
> Retries against it are being *held*, not spent.
>
> Watch the gates fire." *(point at the Gates Firing panel as bars grow)*
>
> "Quiet hours — it's 5:30 AM IST at the first tick, so nothing goes out.
> Frequency cap — this customer has already been contacted today, across all
> their cases, so we wait. Cooldown. Attempt cap. And here" *(scroll the feed)*
> "an order that was settled through another route while we were mid-ladder —
> we stop, because chasing someone who already paid is a double charge and a
> support ticket."

Let it reach roughly tick 40 before moving on.

---

## 2:15–2:55 · One case, all the way down

**On screen:** `/cases`, click a `RECEIVABLE_CHASE` case with several actions —
`case_0721` is a good one.

> "One case. This is the Razorpay failure taxonomy the routing was built on —
> `error_source` says whose fault it was, `error_step` says where it broke.
>
> Then every action, with all eleven gate verdicts, not just the one that
> blocked. Green passed, red refused. A compliance reviewer asking why this
> customer wasn't contacted doesn't want 'blocked by consent' — they want to
> see what the other ten gates thought.
>
> Here's the message that went out, in Hindi, with the amount substituted by
> Python. And underneath, the raw ledger — every row hash-chained to the one
> before it."

---

## 2:55–3:20 · Break the audit trail

**On screen:** `/audit`.

> "Three thousand six hundred and seventy-four events, chain valid.
>
> Now watch." *(click **Tamper with a record**)*
>
> "I've rewritten one recorded amount, the way somebody covering their tracks
> would. Nothing else touched." *(page updates)* "Broken. And it names the row.
> That's the difference between an audit trail and a log table."

---

## 3:20–3:50 · Failures, handled

**On screen:** `/guardrails`.

> "One thousand one hundred and seventy actions refused. Three hundred and
> seventy-six rupees of spend avoided, and four lakh sixty-two thousand of
> priced compliance exposure.
>
> Scroll down and you'll find two gates that blocked *nothing* — risk hold and
> the stopping rule. That's correct, not missing: the ladder never proposes
> contact for a risk-blocked case. They're the backstop. If either ever fires,
> I have a bug upstream — and I'd rather report the zero than hide it.
>
> Message bodies: this deployment has no LLM key configured, so every one came
> from a deterministic template. That's not a failure mode I'm hiding from —
> it's exactly what happens when the provider is down mid-batch, and the batch
> still finishes."

---

## 3:50–4:35 · Did it work?

**On screen:** `/experiment`.

> "The real question. Twenty percent of cases were held out and never
> contacted — assigned by hashing the order id, so the arm was fixed before
> anything was known about the case, and anyone can recompute it.
>
> Treatment recovered thirty-five point one percent. Control — untouched —
> sixteen point three. So the gross number is thirty-five, but sixteen of that
> would have happened anyway. **Net incremental lift, eighteen point eight
> percentage points**, confidence interval eleven point seven to twenty-five
> point nine. It excludes zero, so it's real at this sample size.
>
> Incremental value, twenty-four lakh, on fifteen hundred and thirty-three
> rupees of messaging.
>
> And now the part I'd rather you saw from me than found yourselves."
> *(scroll to the per-class table)*
> "**Four of these six lanes are not statistically significant.** And the most
> expensive lane — the human review queue, thirteen hundred and fifty rupees,
> eighty-eight percent of my total spend — has a confidence interval that
> includes zero. On this batch, routing risk-blocked cases to a person is not
> paying for itself. That's a finding about my own design, and it's in
> EVALUATION.md."

---

## 4:35–5:00 · What broke, and what's next

**On screen:** `2AM.md`, scrolling.

> "Six real bugs, and every one of them produced plausible-looking output while
> being completely wrong. The audit ledger reported tampering that never
> happened, because it hashed a timezone-aware timestamp and stored a naive one.
> The batch gave different answers depending on what time of day you ran it. The
> test suite was quietly emptying the committed database. And the measured lift
> was thirty-three points until I noticed the oracle was giving treatment three
> chances at recovery and control one.
>
> `make demo` runs the whole thing from a clean clone. No API keys. Same
> numbers. Thank you."

---

## Timing checks

| Segment | Ends at |
| --- | --- |
| Problem | 0:25 |
| Architecture | 1:00 |
| Live run | 2:15 |
| Case timeline | 2:55 |
| Audit tamper | 3:20 |
| Guardrails | 3:50 |
| Experiment | 4:35 |
| 2AM + close | 5:00 |

**Hard stop at 5:00.** A 5:30 video gets cut, and the cut lands in the middle of
the honest-metrics segment, which is the part that wins the track.

## If you have to lose thirty seconds

Cut the guardrails segment down to the two-gates-blocked-nothing point and drop
the message-bodies paragraph. Do not cut the per-class honesty in the experiment
segment — that is the strongest thirty seconds in the video.

## Before you record

- [ ] `make demo` on a clean clone, so the numbers on screen match EVALUATION.md
- [ ] Hit `/api/health` once to warm the backend
- [ ] Have `case_0721` (or another multi-action case) already found
- [ ] Re-run the batch after the tamper demo so the chain is valid again
- [ ] If you set Razorpay test keys, open one real `short_url` in a tab first
