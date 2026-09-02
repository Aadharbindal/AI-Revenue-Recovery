"use client";

import Link from "next/link";

import { ChevronRightIcon } from "@/components/icons";

/**
 * What this thing actually does, in one line, with live counts.
 *
 * The dashboard leads with a result, which is right — but somebody arriving
 * cold sees a number before they know what produced it. This is the shape of
 * the pipeline: detect, diagnose, gate, act, measure, with the real figure
 * under each stage so it reads as an account of this run rather than a diagram.
 */

interface Stage {
  label: string;
  value: string;
  detail: string;
  href: string;
  tone?: "guard" | "recovered";
}

export default function PipelineStrip({
  cases,
  classes,
  sent,
  refused,
  recovered,
  lift,
}: {
  cases: number;
  classes: number;
  sent: number;
  refused: number;
  recovered: number;
  lift: string;
}) {
  const stages: Stage[] = [
    {
      label: "Detect",
      value: cases.toLocaleString("en-IN"),
      detail: "failed payments, abandoned carts and overdue invoices",
      href: "/cases",
    },
    {
      label: "Diagnose",
      value: String(classes),
      detail: "recovery classes, routed on Razorpay's own error taxonomy",
      href: "/cases",
    },
    {
      label: "Gate",
      value: refused.toLocaleString("en-IN"),
      detail: "actions refused by eleven policy gates",
      href: "/guardrails",
      tone: "guard",
    },
    {
      label: "Act",
      value: sent.toLocaleString("en-IN"),
      detail: "sent, cheapest tier first, no skipping",
      href: "/run",
    },
    {
      label: "Measure",
      value: lift,
      detail: `${recovered.toLocaleString("en-IN")} recovered, against an untouched control arm`,
      href: "/experiment",
      tone: "recovered",
    },
  ];

  return (
    <div className="mb-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] overflow-hidden">
      <div className="grid grid-cols-2 lg:grid-cols-5 divide-x divide-y lg:divide-y-0 divide-[var(--line)]">
        {stages.map((stage, i) => (
          <Link
            key={stage.label}
            href={stage.href}
            className="group relative px-5 py-4 hover:bg-[var(--surface-raised)]/50 transition-colors"
          >
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-[10px] uppercase tracking-[0.16em] text-[var(--ink-3)]">
                {stage.label}
              </span>
              {i < stages.length - 1 && (
                <span className="hidden lg:inline text-[var(--ink-4)]">
                  <ChevronRightIcon size={11} />
                </span>
              )}
            </div>
            <div
              className="font-mono text-[20px] font-semibold tnum leading-none"
              style={{
                color:
                  stage.tone === "guard"
                    ? "var(--guard)"
                    : stage.tone === "recovered"
                      ? "var(--recovered)"
                      : "var(--ink)",
              }}
            >
              {stage.value}
            </div>
            <p className="text-[11.5px] text-[var(--ink-3)] mt-2 leading-relaxed">
              {stage.detail}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
