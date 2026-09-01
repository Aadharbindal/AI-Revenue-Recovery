"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  fetchExperiment,
  fetchFunnel,
  fetchIssuerHealth,
  verifyLedger,
  type AuditStatus,
  type ClassRow,
  type ExperimentResult,
  type IssuerHealth,
} from "@/lib/api";
import { CLASS_COLORS, pct, pp, rupeesShort, rupees } from "@/lib/format";
import { Bar, Card, Failed, Loading, Note, Page, Pill, Stat } from "@/components/ui";

export default function CommandCenter() {
  const [data, setData] = useState<{
    overall: ExperimentResult;
    perClass: ClassRow[];
    funnel: Record<string, number>;
    issuers: IssuerHealth[];
    audit: AuditStatus;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchExperiment(),
      fetchFunnel("treatment"),
      fetchIssuerHealth(),
      verifyLedger(),
    ])
      .then(([exp, funnel, issuers, audit]) =>
        setData({
          overall: exp.overall,
          perClass: exp.per_class,
          funnel: funnel.by_state,
          issuers: issuers.issuers,
          audit,
        }),
      )
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <Failed error={error} />;
  if (!data) return <Loading what="command center" />;

  const { overall: e, perClass, funnel, issuers, audit } = data;
  const degraded = issuers.filter((i) => i.degraded);

  return (
    <Page
      title="Command Center"
      subtitle="One batch of failed payments and overdue invoices, worked end to end and measured against an untouched control arm."
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat
          label="Amount at risk"
          value={rupeesShort(e.amount_at_risk_paise)}
          sub={`${e.treatment_n + e.control_n} cases across both arms`}
        />
        <Stat
          label="Net incremental lift"
          value={pp(e.net_lift)}
          tone={e.is_significant ? "good" : "warn"}
          sub={`95% CI ${(e.ci_lower * 100).toFixed(1)} to ${(e.ci_upper * 100).toFixed(1)} · ${
            e.is_significant ? "significant" : "not significant at this n"
          }`}
        />
        <Stat
          label="Incremental recovered"
          value={rupeesShort(e.value_incremental_paise)}
          tone="accent"
          sub={`Gross ${rupeesShort(e.treatment_gross_recovered_paise)} minus what the control arm says would have happened anyway`}
        />
        <Stat
          label="Spend"
          value={rupees(e.intervention_cost_paise)}
          sub={`${e.roi.toFixed(0)}x on ${e.roi_basis}`}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card
          title="Treatment vs control"
          hint="The comparison the whole system exists to make"
          className="lg:col-span-2"
        >
          <div className="space-y-5">
            <ArmBar
              label="Treatment — worked by the agent"
              rate={e.treatment_rate}
              n={e.treatment_n}
              recovered={e.treatment_recovered}
              tone="sky"
            />
            <ArmBar
              label="Control — never contacted"
              rate={e.control_rate}
              n={e.control_n}
              recovered={e.control_recovered}
              tone="zinc"
            />

            <div className="pt-4 border-t border-zinc-800 grid sm:grid-cols-3 gap-4 text-sm">
              <Figure label="Case-count lift" value={pp(e.net_lift)} />
              <Figure label="Value-weighted lift" value={pp(e.value_weighted_lift)} />
              <Figure
                label="Break-even lift"
                value={`${(e.breakeven_lift * 100).toFixed(3)} pp`}
              />
            </div>
          </div>

          <Note>
            Gross recovery would read {pct(e.treatment_rate)}, but{" "}
            {pct(e.control_rate)} of untouched cases came back on their own.
            Only the difference belongs to the agent. Both lift figures are
            shown because they disagree: the case-count version weights a small
            cart the same as a large invoice, the value-weighted one does not.
          </Note>
        </Card>

        <div className="space-y-6">
          <Card title="Issuer health" hint="z-scored against each issuer's own baseline">
            <div className="space-y-2">
              {issuers.map((i) => (
                <div
                  key={i.issuer}
                  className="flex items-center justify-between px-3 py-2 bg-zinc-900/60 rounded border border-zinc-800"
                >
                  <span className="text-sm text-zinc-300 font-mono">{i.issuer}</span>
                  {i.degraded ? (
                    <Pill className="text-amber-400 border-amber-500/30 bg-amber-500/10">
                      degraded · peak {i.peak_failures_in_window}
                    </Pill>
                  ) : (
                    <Pill className="text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                      healthy
                    </Pill>
                  )}
                </div>
              ))}
            </div>
            {degraded.length > 0 && (
              <Note>
                {degraded.map((d) => d.issuer).join(", ")} was failing far above
                its own baseline when the batch began. Retries against it were
                held rather than spent, and released once it recovered.
              </Note>
            )}
          </Card>

          <Card title="Audit ledger">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">
                {audit.records.toLocaleString("en-IN")} events
              </span>
              {audit.valid ? (
                <Pill className="text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                  chain valid
                </Pill>
              ) : (
                <Pill className="text-rose-400 border-rose-500/30 bg-rose-500/10">
                  broken at {audit.first_break}
                </Pill>
              )}
            </div>
            <Link
              href="/audit"
              className="block mt-4 text-sm text-sky-400 hover:text-sky-300"
            >
              Verify or tamper with the chain →
            </Link>
          </Card>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <Card title="Where the treatment arm ended up">
          <div className="space-y-3">
            {Object.entries(funnel)
              .sort((a, b) => b[1] - a[1])
              .map(([state, n]) => (
                <div key={state}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-zinc-400">{state}</span>
                    <span className="font-mono text-zinc-300">{n}</span>
                  </div>
                  <Bar
                    value={n}
                    max={Math.max(...Object.values(funnel))}
                    tone={state === "RECOVERED" ? "emerald" : "zinc"}
                  />
                </div>
              ))}
          </div>
          <Note>
            Nothing is left in an open state. Every case either recovered or
            carries a recorded reason it did not — see{" "}
            <Link href="/exceptions" className="text-sky-400 hover:underline">
              Exceptions
            </Link>
            .
          </Note>
        </Card>

        <Card
          title="Lift by recovery class"
          hint="Aggregate lift can hide a class that outreach is hurting"
        >
          <div className="space-y-2.5">
            {perClass.map((row) => (
              <div
                key={row.recovery_class}
                className="flex items-center gap-3 text-sm"
              >
                <span className="w-40 shrink-0">
                  <Pill className={CLASS_COLORS[row.recovery_class]}>
                    {row.recovery_class}
                  </Pill>
                </span>
                <span
                  className={`font-mono w-20 text-right ${
                    row.is_significant ? "text-emerald-400" : "text-zinc-500"
                  }`}
                >
                  {pp(row.net_lift)}
                </span>
                <span className="text-xs text-zinc-600 font-mono">
                  n={row.treatment_n}
                </span>
                {!row.is_significant && (
                  <span className="text-[10px] text-zinc-600 uppercase tracking-wide ml-auto">
                    not significant
                  </span>
                )}
              </div>
            ))}
          </div>
          <Note>
            Four of these classes cannot be distinguished from zero at this
            sample size. They are shown as such rather than folded into the
            headline.
          </Note>
        </Card>
      </div>
    </Page>
  );
}

function ArmBar({
  label,
  rate,
  n,
  recovered,
  tone,
}: {
  label: string;
  rate: number;
  n: number;
  recovered: number;
  tone: "sky" | "zinc";
}) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-zinc-400">{label}</span>
        <span className="font-mono text-zinc-200">
          {pct(rate)}{" "}
          <span className="text-zinc-600">
            ({recovered}/{n})
          </span>
        </span>
      </div>
      <Bar value={rate} max={1} tone={tone} />
    </div>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-zinc-500 mb-1">
        {label}
      </div>
      <div className="font-mono text-zinc-100">{value}</div>
    </div>
  );
}
