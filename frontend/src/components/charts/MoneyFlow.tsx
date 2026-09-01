"use client";

import Link from "next/link";
import { useState } from "react";

import type { FlowClass } from "@/lib/api";
import { CLASS_COLORS, pct, rupeesShort } from "@/lib/format";

/**
 * Where every rupee at risk ended up.
 *
 * One row per recovery class, width proportional to money at stake, split into
 * the share recovered and the share still outstanding. It answers the question
 * a merchant actually asks — "of my money, how much came back, and from
 * where?" — which a table of counts does not.
 *
 * Rows are ordered by amount at risk, which is also the order the agent works
 * them in, so the chart doubles as a picture of its prioritisation.
 */
export default function MoneyFlow({ classes }: { classes: FlowClass[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(...classes.map((c) => c.at_risk_paise), 1);

  return (
    <div className="space-y-2.5">
      {classes.map((c) => {
        const share = c.at_risk_paise / max;
        const recovered =
          c.at_risk_paise > 0 ? c.recovered_paise / c.at_risk_paise : 0;
        const active = hover === null || hover === c.recovery_class;

        return (
          <Link
            key={c.recovery_class}
            href={`/cases?recovery_class=${c.recovery_class}`}
            className="block group"
            onMouseEnter={() => setHover(c.recovery_class)}
            onMouseLeave={() => setHover(null)}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-mono text-[var(--ink-2)] group-hover:text-[var(--ink)] transition-colors">
                {c.recovery_class}
              </span>
              <span className="text-xs font-mono text-[var(--ink-3)] tnum">
                {rupeesShort(c.recovered_paise)}
                <span className="text-[var(--ink-4)]"> of </span>
                {rupeesShort(c.at_risk_paise)}
                <span className="text-[var(--ink-4)] ml-2">{c.cases}&nbsp;cases</span>
              </span>
            </div>

            <div
              className="relative h-5 rounded-sm overflow-hidden transition-opacity"
              style={{
                width: `${Math.max(share * 100, 4)}%`,
                opacity: active ? 1 : 0.4,
              }}
            >
              {/* Total at risk */}
              <div
                className="absolute inset-0 rounded-sm"
                style={{ background: "var(--surface-raised)" }}
              />
              {/* Recovered share, with a 2px surface gap at the join */}
              <div
                className="absolute inset-y-0 left-0 rounded-sm"
                style={{
                  width: `${recovered * 100}%`,
                  background: "var(--recovered)",
                  boxShadow: "2px 0 0 0 var(--surface)",
                }}
              />
              {recovered > 0.12 && (
                <span className="absolute inset-y-0 left-2 flex items-center text-[10px] font-mono text-[#04140d] font-semibold">
                  {pct(recovered, 0)}
                </span>
              )}
            </div>
          </Link>
        );
      })}

      <div className="flex items-center gap-4 pt-2 text-[11px] text-[var(--ink-3)]">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-2 rounded-sm"
            style={{ background: "var(--recovered)" }}
          />
          recovered
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-2 rounded-sm"
            style={{ background: "var(--surface-raised)" }}
          />
          still at risk
        </span>
        <span className="ml-auto">bar width = money at stake</span>
      </div>
    </div>
  );
}

export { CLASS_COLORS };
