"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { fetchDelivery, fetchGuardrails, type DeliveryReport, type GuardrailReport } from "@/lib/api";
import { CHANNEL_LABELS, rupees, rupeesShort } from "@/lib/format";
import { Bar, Card, Failed, Loading, Note, Page, Pill, Stat } from "@/components/ui";

const GATE_PURPOSE: Record<string, string> = {
  G01: "Never contact someone who revoked consent or sits on the DND registry",
  G02: "No commercial contact 9PM–9AM IST; voice only 10AM–7PM",
  G03: "One touch per customer per day, three per week — across all their cases",
  G04: "Three recovery attempts per case, then stop",
  G05: "Six hours between two touches on the same case",
  G06: "Never spend more than 15% of the amount at risk, and never chase below the viability floor",
  G07: "Risk-blocked cases go to a human and are never auto-contacted",
  G08: "Hold retries while the issuer is down instead of burning attempts",
  G09: "Stop the moment the order is settled through another route",
  G10: "Closed is closed, and a promise to pay is honoured until its date",
  G11: "No skipping tiers — voice has to be earned",
};

export default function Guardrails() {
  const [data, setData] = useState<{ g: GuardrailReport; d: DeliveryReport } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchGuardrails(), fetchDelivery()])
      .then(([g, d]) => setData({ g, d }))
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <Failed error={error} />;
  if (!data) return <Loading what="guardrails" />;

  const { g, d } = data;
  const maxBlocks = Math.max(...g.gates.map((x) => x.blocks), 1);
  const silent = g.gates.filter((x) => x.blocks === 0);

  return (
    <Page
      title="Guardrails"
      subtitle="Eleven gates, evaluated in order on every proposed action. What they refused, and what that was worth."
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Stat
          label="Actions refused"
          value={g.total_blocks.toLocaleString("en-IN")}
          tone="warn"
        />
        <Stat
          label="Spend avoided"
          value={rupees(g.total_spend_avoided_paise)}
          sub="Messages that would have gone out and been wasted"
        />
        <Stat
          label="Compliance exposure avoided"
          value={rupeesShort(g.total_compliance_avoided_paise)}
          sub="Priced at ₹500 per avoided consent, DND, quiet-hours or frequency violation"
        />
      </div>

      <Card title="Every gate, including the quiet ones">
        <div className="space-y-4">
          {g.gates.map((gate) => (
            <div key={gate.gate} className="border-b border-zinc-900 pb-4 last:border-0">
              <div className="flex items-baseline justify-between gap-4 mb-1.5">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-sm text-zinc-300">{gate.gate}</span>
                  <span className="text-sm text-zinc-200">{gate.name}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono text-sm text-zinc-200">
                    {gate.blocks}
                  </span>
                  <span className="text-xs text-zinc-600 ml-2">
                    {gate.cases_affected} cases
                  </span>
                </div>
              </div>
              <p className="text-xs text-zinc-500 mb-2">{GATE_PURPOSE[gate.gate]}</p>
              <Bar value={gate.blocks} max={maxBlocks} tone={gate.blocks ? "amber" : "zinc"} />
              {Object.keys(gate.reasons).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {Object.entries(gate.reasons)
                    .sort((a, b) => b[1] - a[1])
                    .map(([reason, n]) => (
                      <Link key={reason} href={`/cases?blocked_by=${gate.gate}`}>
                        <Pill>
                          {reason} ×{n}
                        </Pill>
                      </Link>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {silent.length > 0 && (
          <Note>
            {silent.map((s) => `${s.gate} (${s.name})`).join(", ")} refused
            nothing. That is the expected result, not a missing feature: the
            ladder never proposes the action those gates exist to prevent. They
            are the backstop that would catch a bug upstream — if one ever
            fires, there is one.
          </Note>
        )}
      </Card>

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <Card title="What went out" hint="Cheapest tier first, no skipping">
          <div className="space-y-3">
            {d.by_tier.map((tier) => (
              <div key={tier.tier} className="flex items-center gap-4 text-sm">
                <span className="font-mono text-zinc-500 w-14 shrink-0">
                  Tier {tier.tier}
                </span>
                <span className="text-zinc-400 flex-1">
                  {Object.entries(tier.channels)
                    .map(([ch, n]) => `${CHANNEL_LABELS[ch] ?? ch} ×${n}`)
                    .join(", ")}
                </span>
                <span className="font-mono text-zinc-300 w-16 text-right">
                  {tier.sent}
                </span>
                <span className="font-mono text-zinc-500 w-20 text-right">
                  {rupees(tier.spend_paise)}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card
          title="Where message bodies came from"
          hint="The model drafts; the code decides and fills in every number"
        >
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Stat label="From the LLM" value={String(d.messages_from_llm)} />
            <Stat
              label="From fallback templates"
              value={String(d.messages_from_fallback)}
            />
          </div>
          {Object.keys(d.fallback_reasons).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(d.fallback_reasons)
                .sort((a, b) => b[1] - a[1])
                .map(([reason, n]) => (
                  <Pill key={reason}>
                    {reason} ×{n}
                  </Pill>
                ))}
            </div>
          )}
          <Note>
            {d.messages_from_llm === 0
              ? "No LLM provider is configured in this deployment, so every body came from a deterministic template. That is the honest state rather than a hidden one — and it is exactly what happens when the provider is down mid-batch."
              : "Templates are cached per (class, tier, language), so a batch of hundreds of cases costs on the order of eighteen model calls. Any draft containing a literal digit is rejected before it can become a message."}
          </Note>
          <Note>
            {d.real_payment_links} live Razorpay test-mode links were minted;
            the rest are simulated and flagged as such in the database, so no
            chart implies more live integration than there is.
          </Note>
        </Card>
      </div>
    </Page>
  );
}
