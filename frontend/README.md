# RecoverOS dashboard

Next.js 16 App Router · TypeScript · Tailwind. Read-only against the FastAPI
backend, except for two buttons: run a batch, and tamper with the audit ledger.

```bash
npm install
npm run dev        # http://localhost:3000
```

Expects the API on `http://localhost:8000/api`. Override with
`NEXT_PUBLIC_API_BASE` — that is how the Vercel build points at the deployed
backend.

## Screens

| Route | What it answers |
| --- | --- |
| `/` | Did this work, and by how much more than doing nothing? |
| `/run` | What is the agent deciding right now? (live SSE) |
| `/cases` | Which cases, filtered by state, class, arm, or blocking gate |
| `/case/[id]` | **Why did the system do that?** — the full decision trail |
| `/guardrails` | What did the gates refuse, and what was it worth? |
| `/experiment` | Is the lift real, and where does it come from? |
| `/exceptions` | What did we fail to recover, and why? |
| `/audit` | Verify the hash chain, then break it on purpose |

`/case/[id]` is the one that matters most. It shows the Razorpay error fields
the routing decision was built on, every action with all eleven gate verdicts
rendered as a grid, the message that went out with its provenance, and the raw
hash-chained ledger rows underneath. Nobody has to trust a summary.

## Notes

- The sidebar reports which integrations are actually configured. With no keys
  the app runs on deterministic fallbacks and simulated payment links, and says
  so rather than leaving a viewer to assume otherwise.
- Money is handled as integer paise everywhere and converted to rupees only in
  `lib/format.ts`, so nothing drifts between the dashboard and `EVALUATION.md`.
- The theme is committed to dark rather than following the OS. This sits beside
  a terminal in a demo, and a surface that flips to white on someone else's
  laptop mid-presentation is not worth the flexibility.
