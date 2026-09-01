"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import ActivityRibbon from "@/components/charts/ActivityRibbon";
import DivergenceChart from "@/components/charts/DivergenceChart";
import MoneyFlow from "@/components/charts/MoneyFlow";
import { Card, Failed, Loading, Note, Page, Pill, Stat } from "@/components/ui";
import {
  fetchExperiment,
  fetchFlow,
  fetchGuardrails,
  fetchIssuerHealth,
  fetchTimeline,
  verifyLedger,
  type AuditStatus,
  type ClassRow,
  type ExperimentResult,
  type Flow,
  type GuardrailReport,
  type IssuerHealth,
  type Timeline,
} from "@/lib/api";
import { pct, pp, rupees, rupeesShort } from "@/lib/format";

interface Data {
  experiment: ExperimentResult;
  perClass: ClassRow[];
  timeline: Timeline;
  flow: Flow;
  guardrails: GuardrailReport;
  issuers: IssuerHealth[];
  audit: AuditStatus;
}

export default function CommandCenter() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchExperiment(),
      fetchTimeline(),
      fetchFlow(),
      fetchGuardrails(),
      fetchIssuerHealth(),
      verifyLedger(),
    ])
      .then(([exp, timeline, flow, guardrails, issuers, audit]) =>
        setData({
          experiment: exp.overall,
          perClass: exp.per_class,
          timeline,
          flow,
          guardrails,
          issuers: issuers.issuers,
          audit,
        }),
      )
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <Failed error={error} />;
  if (!data) return <Loading what="command center" />;

  const { experiment: e, perClass, timeline, flow, guardrails, issuers, audit } = data;
  const degraded = issuers.filter((i) => i.degraded);
  const insignificant = perClass.filter((c) => !c.is_significant);

  return (
    <Page
      kicker="Razorpay AI Buildathon · Track 03"
      title="Revenue at risk, and what came back"
      subtitle="725 failed payments and overdue invoices, worked for seven simulated days behind eleven policy gates — and measured against a fifth of the batch the agent was never allowed to touch."
    >
      {/* ── The hero. Two numbers, and the honest one is bigger. ───────── */}
      <div className="grid lg:grid-cols-[1.15fr_1fr] gap-4 mb-4">
        <div className="bg-[var(--surface)] border border-[var(--line)] rounded-lg p-6 flex flex-col justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--ink-3)] mb-3">
              Incremental revenue recovered
            </div>
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="font-mono font-semibold tracking-tight text-[52px] leading-none text-[var(--recovered)] tnum tick-in">
                {rupeesShort(e.value_incremental_paise)}
              </span>
              <span className="text-sm text-[var(--ink-3)]">
                of {rupeesShort(e.amount_at_risk_paise)} at risk
              </span>
            </div>
          </div>
          <p className="text-sm text-[var(--ink-2)] leading-relaxed mt-5">
            Gross recovery was{" "}
            <span className="text-[var(--ink)] font-mono">
              {rupeesShort(e.treatment_gross_recovered_paise)}
            </span>
            . But{" "}
            <span className="text-[var(--ink)] font-mono">{pct(e.control_rate)}</span>{" "}
            of untouched cases came back on their own, and that share is not ours
            to claim. Only the difference is.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Stat
            label="Net incremental lift"
            value={pp(e.net_lift)}
            tone={e.is_significant ? "good" : "warn"}
            sub={
              <>
                95% CI {(e.ci_lower * 100).toFixed(1)} to{" "}
                {(e.ci_upper * 100).toFixed(1)}
                <br />
                {e.is_significant ? "excludes zero" : "includes zero"}
              </>
            }
          />
          <Stat
            label="Spend"
            value={rupees(e.intervention_cost_paise)}
            sub={`${e.roi.toFixed(0)}× on ${e.roi_basis}`}
          />
          <Stat
            label="Actions refused"
            value={guardrails.total_blocks.toLocaleString("en-IN")}
            tone="warn"
            sub={`by ${guardrails.gates.filter((g) => g.blocks > 0).length} of 11 gates`}
          />
          <Stat
            label="Audit ledger"
            value={audit.valid ? "VALID" : "BROKEN"}
            tone={audit.valid ? "good" : "bad"}
            sub={`${audit.records.toLocaleString("en-IN")} hash-chained events`}
          />
        </div>
      </div>

      {/* ── The counterfactual, drawn ──────────────────────────────────── */}
      <Card
        title="Treatment vs control, over seven days"
        hint="The wedge between the two lines is the lift. Everything else on this page is downstream of it."
        aside={
          <Link
            href="/experiment"
            className="text-xs text-[var(--treatment)] hover:underline underline-offset-2"
          >
            methodology →
          </Link>
        }
        className="mb-4"
      >
        <DivergenceChart
          rows={timeline.rows}
          outages={timeline.outages}
          armTotals={timeline.arm_totals}
        />
        <Note>
          The control arm is assigned by hashing the order id, so it was fixed
          before anything was known about any case and anyone can recompute it.
          Control cases are classified and measured but never contacted and never
          billed — there is a test that fails if a single action lands on one.
        </Note>
      </Card>

      {/* ── The rhythm of the work ─────────────────────────────────────── */}
      <Card
        title="What the agent did, tick by tick"
        hint="Two-hour ticks. Sent above the line, refused below."
        className="mb-4"
      >
        <ActivityRibbon rows={timeline.rows} />
        <Note>
          Activity collapses to nothing every night — that is the quiet-hours
          gate, not a gap in the data. The refusal band is thickest on day one,
          when the issuer is still degraded and the per-customer frequency caps
          are saturated from the previous system&apos;s outreach.
        </Note>
      </Card>

      <div className="grid lg:grid-cols-[1.3fr_1fr] gap-4">
        <Card
          title="Where the money went"
          hint="Bar width is the amount at stake; the filled part came back"
        >
          <MoneyFlow classes={flow.by_class} />
        </Card>

        <div className="space-y-4">
          <Card title="Issuer health" hint="z-scored against each issuer's own baseline">
            <div className="space-y-1.5">
              {issuers.map((i) => (
                <div
                  key={i.issuer}
                  className="flex items-center justify-between px-3 py-2 bg-[var(--surface-inset)] rounded border border-[var(--line)]"
                >
                  <span className="text-sm font-mono text-[var(--ink-2)]">
                    {i.issuer}
                  </span>
                  {i.degraded ? (
                    <Pill className="text-[var(--warn)] border-[var(--warn)]/30 bg-[var(--warn)]/10">
                      degraded · peak {i.peak_failures_in_window}
                    </Pill>
                  ) : (
                    <Pill className="text-[var(--recovered)] border-[var(--recovered)]/30 bg-[var(--recovered)]/10">
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
                held rather than spent, and released once it recovered — visible
                as the amber band on the chart above.
              </Note>
            )}
          </Card>

          {/* The finding that works against us, on the landing page. */}
          <Card title="What this batch cannot claim">
            <div className="space-y-2.5">
              {insignificant.map((c) => (
                <div key={c.recovery_class} className="flex items-center gap-3 text-sm">
                  <span className="font-mono text-xs text-[var(--ink-2)] w-40 shrink-0">
                    {c.recovery_class}
                  </span>
                  <span className="font-mono text-xs text-[var(--ink-3)] tnum">
                    {pp(c.net_lift)}
                  </span>
                  <span className="ml-auto text-[10px] uppercase tracking-wide text-[var(--ink-4)]">
                    CI includes 0
                  </span>
                </div>
              ))}
            </div>
            <Note>
              {insignificant.length} of {perClass.length} recovery classes cannot
              be distinguished from doing nothing at this sample size. The
              aggregate lift is significant; these lanes individually are not,
              and saying so here is cheaper than being asked.
            </Note>
          </Card>
        </div>
      </div>
    </Page>
  );
}
