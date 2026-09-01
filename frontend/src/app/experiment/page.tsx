"use client";

import { useEffect, useState } from "react";

import { fetchExperiment, type ClassRow, type ExperimentResult } from "@/lib/api";
import { CLASS_COLORS, pct, pp, rupees, rupeesShort } from "@/lib/format";
import { Bar, Card, Failed, Loading, Note, Page, Pill, Stat } from "@/components/ui";

export default function Experiment() {
  const [data, setData] = useState<{
    overall: ExperimentResult;
    per_class: ClassRow[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchExperiment().then(setData).catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <Failed error={error} />;
  if (!data) return <Loading what="experiment" />;

  const e = data.overall;

  return (
    <Page
      title="Experiment"
      subtitle="20% of cases are held out and never contacted. Only the difference against them belongs to the agent."
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat
          label="Treatment"
          value={pct(e.treatment_rate)}
          tone="accent"
          sub={`${e.treatment_recovered} of ${e.treatment_n} recovered`}
        />
        <Stat
          label="Control"
          value={pct(e.control_rate)}
          sub={`${e.control_recovered} of ${e.control_n} came back untouched`}
        />
        <Stat
          label="Net lift"
          value={pp(e.net_lift)}
          tone={e.is_significant ? "good" : "warn"}
          sub={`95% CI ${(e.ci_lower * 100).toFixed(1)} to ${(e.ci_upper * 100).toFixed(1)}`}
        />
        <Stat
          label="Incremental value"
          value={rupeesShort(e.value_incremental_paise)}
          tone="good"
          sub={`on ${rupees(e.intervention_cost_paise)} of messaging`}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card title="Is the lift real?">
          <div className="mb-5">
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-zinc-400">Treatment</span>
              <span className="font-mono text-sky-400">{pct(e.treatment_rate)}</span>
            </div>
            <Bar value={e.treatment_rate} max={1} tone="sky" />
          </div>
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-zinc-400">Control</span>
              <span className="font-mono text-zinc-400">{pct(e.control_rate)}</span>
            </div>
            <Bar value={e.control_rate} max={1} tone="zinc" />
          </div>

          <ConfidenceInterval lower={e.ci_lower} point={e.net_lift} upper={e.ci_upper} />

          <div
            className={`mt-5 p-4 rounded border text-sm leading-relaxed ${
              e.is_significant
                ? "border-emerald-900/50 bg-emerald-950/20 text-emerald-200"
                : "border-amber-900/50 bg-amber-950/20 text-amber-200"
            }`}
          >
            {e.is_significant ? (
              <>
                <strong>Yes.</strong> The interval excludes zero at n=
                {e.treatment_n} treatment and n={e.control_n} control, so the
                effect is distinguishable from no effect.
              </>
            ) : (
              <>
                <strong>No.</strong> The interval includes zero, so this batch
                cannot separate the lift from noise. Detecting an effect this
                size at 80% power would need roughly{" "}
                {e.required_n_per_arm?.toLocaleString("en-IN")} cases per arm.
                The point estimate is shown anyway rather than quietly dropped.
              </>
            )}
          </div>
        </Card>

        <Card title="Economics">
          <dl className="space-y-3.5 text-sm">
            <Row label="Amount at risk" value={rupees(e.amount_at_risk_paise, 0)} />
            <Row
              label="Gross recovered (treatment)"
              value={rupees(e.treatment_gross_recovered_paise, 0)}
            />
            <Row
              label="Incremental — what the agent added"
              value={rupees(e.value_incremental_paise, 0)}
              strong
            />
            <Row label="Spend" value={rupees(e.intervention_cost_paise)} />
            <Row
              label="Cost per incremental recovery"
              value={
                e.cost_per_incremental_recovery_paise
                  ? rupees(e.cost_per_incremental_recovery_paise)
                  : "—"
              }
            />
            <Row label={`ROI (${e.roi_basis})`} value={`${e.roi.toFixed(0)}x`} />
            <Row
              label="Lift needed to break even"
              value={`${(e.breakeven_lift * 100).toFixed(3)} pp`}
            />
          </dl>

          <Note>
            The ROI figure counts variable messaging cost only — it excludes
            platform, engineering and support load, so treat it as an upper
            bound rather than a business case. The break-even line is the more
            useful number: it is how small the lift could have been before the
            campaign stopped paying for its own messages.
          </Note>
        </Card>
      </div>

      <Card title="By recovery class" className="mt-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-zinc-500 border-b border-zinc-800">
                <th className="pb-2 pr-4">Class</th>
                <th className="pb-2 pr-4 text-right">Treatment</th>
                <th className="pb-2 pr-4 text-right">Control</th>
                <th className="pb-2 pr-4 text-right">Lift</th>
                <th className="pb-2 pr-4">95% CI</th>
                <th className="pb-2 pr-4 text-right">Spend</th>
                <th className="pb-2">Verdict</th>
              </tr>
            </thead>
            <tbody>
              {data.per_class.map((row) => (
                <tr
                  key={row.recovery_class}
                  className="border-b border-zinc-900 last:border-0"
                >
                  <td className="py-2.5 pr-4">
                    <Pill className={CLASS_COLORS[row.recovery_class]}>
                      {row.recovery_class}
                    </Pill>
                  </td>
                  <td className="py-2.5 pr-4 text-right font-mono text-zinc-300">
                    {pct(row.treatment_rate)}
                    <span className="text-zinc-600 text-xs ml-1">
                      n={row.treatment_n}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-right font-mono text-zinc-400">
                    {pct(row.control_rate)}
                    <span className="text-zinc-600 text-xs ml-1">
                      n={row.control_n}
                    </span>
                  </td>
                  <td
                    className={`py-2.5 pr-4 text-right font-mono ${
                      row.is_significant ? "text-emerald-400" : "text-zinc-500"
                    }`}
                  >
                    {pp(row.net_lift)}
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-xs text-zinc-600">
                    {(row.ci_lower * 100).toFixed(1)} to{" "}
                    {(row.ci_upper * 100).toFixed(1)}
                  </td>
                  <td className="py-2.5 pr-4 text-right font-mono text-zinc-400">
                    {rupees(row.spend_paise)}
                  </td>
                  <td className="py-2.5">
                    {row.is_significant ? (
                      <Pill className="text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                        significant
                      </Pill>
                    ) : (
                      <Pill>not significant</Pill>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Note>
          Splitting by class is how you find a lane that outreach is not helping
          before a merchant does. Look at the spend column next to the verdict
          column — the most expensive lane here is not the one carrying the
          result.
        </Note>
      </Card>
    </Page>
  );
}

/** The interval, drawn to scale, with zero marked. */
function ConfidenceInterval({
  lower,
  point,
  upper,
}: {
  lower: number;
  point: number;
  upper: number;
}) {
  const min = Math.min(lower, 0) - 0.02;
  const max = Math.max(upper, 0) + 0.02;
  const scale = (v: number) => ((v - min) / (max - min)) * 100;

  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-zinc-500 mb-3">
        95% confidence interval on the lift
      </div>
      <div className="relative h-10">
        <div className="absolute inset-x-0 top-4 h-px bg-zinc-800" />
        <div
          className="absolute top-0 bottom-0 w-px bg-zinc-600"
          style={{ left: `${scale(0)}%` }}
        >
          <span className="absolute -bottom-1 -translate-x-1/2 text-[10px] font-mono text-zinc-600">
            0
          </span>
        </div>
        <div
          className={`absolute top-3 h-2 rounded-full ${
            lower > 0 ? "bg-emerald-600/70" : "bg-amber-600/70"
          }`}
          style={{
            left: `${scale(lower)}%`,
            width: `${scale(upper) - scale(lower)}%`,
          }}
        />
        <div
          className="absolute top-1.5 w-1 h-5 bg-white rounded-full"
          style={{ left: `${scale(point)}%` }}
        />
      </div>
      <div className="flex justify-between text-xs font-mono text-zinc-500 mt-1">
        <span>{(lower * 100).toFixed(1)} pp</span>
        <span className="text-zinc-200">{pp(point)}</span>
        <span>{(upper * 100).toFixed(1)} pp</span>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-zinc-500">{label}</dt>
      <dd
        className={`font-mono text-right ${
          strong ? "text-emerald-400 font-semibold" : "text-zinc-200"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
