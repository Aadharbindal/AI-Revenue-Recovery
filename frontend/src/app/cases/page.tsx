"use client";

import { useEffect, useState } from "react";

import { fetchCases, type CaseRow } from "@/lib/api";
import { CLASS_COLORS, STATE_COLORS, rupees } from "@/lib/format";
import { CaseLink, Card, Failed, Loading, Page, Pill } from "@/components/ui";

const STATES = ["", "RECOVERED", "EXHAUSTED", "CLOSED"];
const CLASSES = [
  "", "AUTO_RETRY", "RETRY_TIMED", "SWITCH_METHOD", "NUDGE_CUSTOMER",
  "CHECKOUT_ABANDONED", "MANDATE_REPAIR", "RECEIVABLE_CHASE", "MANUAL_REVIEW",
  "DEAD",
];

// All eleven, including the two that never fire. An empty result for G07 or
// G10 is the answer to "did the backstops ever catch anything?", and leaving
// them out of the filter would hide the question.
const GATES = [
  "", "G01", "G02", "G03", "G04", "G05", "G06", "G07", "G08", "G09", "G10",
  "G11",
];

export default function Cases() {
  const [rows, setRows] = useState<CaseRow[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({ state: "", recovery_class: "", arm: "", blocked_by: "" });

  useEffect(() => {
    const params = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v),
    );
    fetchCases({ ...params, limit: 100 })
      .then((r) => {
        setRows(r.cases);
        setTotal(r.total);
      })
      .catch((e: Error) => setError(e.message));
  }, [filters]);

  if (error) return <Failed error={error} />;

  return (
    <Page
      title="Cases"
      subtitle="Ordered by amount at risk — the same order the agent works them in, because a customer's contact budget is finite."
    >
      <div className="flex flex-wrap gap-3 mb-6">
        <Select
          label="State"
          options={STATES}
          value={filters.state}
          onChange={(v) => setFilters((f) => ({ ...f, state: v }))}
        />
        <Select
          label="Class"
          options={CLASSES}
          value={filters.recovery_class}
          onChange={(v) => setFilters((f) => ({ ...f, recovery_class: v }))}
        />
        <Select
          label="Arm"
          options={["", "treatment", "control"]}
          value={filters.arm}
          onChange={(v) => setFilters((f) => ({ ...f, arm: v }))}
        />
        <Select
          label="Blocked by gate"
          options={GATES}
          value={filters.blocked_by}
          onChange={(v) => setFilters((f) => ({ ...f, blocked_by: v }))}
        />
      </div>

      <Card>
        <div className="text-xs text-[var(--ink-3)] mb-3 font-mono">
          {rows.length} of {total} cases
        </div>
        {rows.length === 0 ? (
          <Loading what="cases" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-[var(--ink-3)] border-b border-[var(--line)]">
                  <th className="pb-2 pr-4">Case</th>
                  <th className="pb-2 pr-4">Class</th>
                  <th className="pb-2 pr-4">State</th>
                  <th className="pb-2 pr-4">Arm</th>
                  <th className="pb-2 pr-4 text-right">At risk</th>
                  <th className="pb-2 pr-4 text-right">Touches</th>
                  <th className="pb-2 pr-4 text-right">Spend</th>
                  <th className="pb-2">Why not recovered</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr
                    key={c.case_id}
                    className="border-b border-[var(--line)] hover:bg-[var(--surface-inset)]"
                  >
                    <td className="py-2 pr-4">
                      <CaseLink id={c.case_id} />
                    </td>
                    <td className="py-2 pr-4">
                      <Pill className={CLASS_COLORS[c.recovery_class ?? "DEAD"]}>
                        {c.recovery_class}
                      </Pill>
                    </td>
                    <td className="py-2 pr-4">
                      <Pill className={STATE_COLORS[c.state]}>{c.state}</Pill>
                    </td>
                    <td className="py-2 pr-4 text-[var(--ink-3)] font-mono text-xs">
                      {c.arm}
                    </td>
                    <td className="py-2 pr-4 text-right font-mono text-[var(--ink)]">
                      {rupees(c.amount_at_risk_paise, 0)}
                    </td>
                    <td className="py-2 pr-4 text-right font-mono text-[var(--ink-2)]">
                      {c.touches_used}
                    </td>
                    <td className="py-2 pr-4 text-right font-mono text-[var(--ink-3)]">
                      {rupees(c.intervention_cost_paise)}
                    </td>
                    <td className="py-2 text-[var(--ink-3)] text-xs max-w-xs truncate">
                      {c.state === "RECOVERED" ? "—" : c.exception_reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </Page>
  );
}

function Select({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="text-xs">
      <span className="block text-[11px] uppercase tracking-wider text-[var(--ink-3)] mb-1">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-[var(--surface)] border border-[var(--line)] rounded px-3 py-1.5 text-sm text-[var(--ink)] font-mono focus:outline-none focus:border-[var(--treatment)]"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o || "all"}
          </option>
        ))}
      </select>
    </label>
  );
}
