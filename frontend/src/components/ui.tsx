"use client";

import Link from "next/link";
import { ReactNode } from "react";

import { ChevronRightIcon, TerminalIcon } from "@/components/icons";

/** Shared primitives. Dense, instrument-panel dark, monospace numerals. */

export type Crumb = { label: string; accent?: boolean };

export function Page({
  title,
  kicker,
  crumbs,
  subtitle,
  children,
  actions,
}: {
  title: string;
  kicker?: string;
  /** Breadcrumb chips above the title. Renders a left accent rail with it. */
  crumbs?: Crumb[];
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="px-8 py-8 lg:px-10 max-w-[1400px]">
      <header className="mb-7 flex items-start justify-between gap-8">
        <div>
          {crumbs && <Breadcrumb crumbs={crumbs} />}
          {kicker && !crumbs && (
            <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--ink-3)] mb-2 font-mono">
              {kicker}
            </div>
          )}

          <div className={crumbs ? "relative pl-5" : undefined}>
            {crumbs && (
              <>
                <span
                  className="absolute left-0 top-[7px] w-[5px] h-[5px] rounded-full"
                  style={{ background: "var(--treatment)" }}
                />
                <span
                  className="absolute left-[2px] top-[16px] bottom-1 w-px"
                  style={{
                    background:
                      "linear-gradient(to bottom, var(--treatment), transparent)",
                  }}
                />
              </>
            )}
            <h1 className="text-[26px] leading-tight font-semibold tracking-tight text-[var(--ink)]">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-[var(--ink-2)] mt-2 max-w-3xl leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </header>
      {children}
    </div>
  );
}

function Breadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 mb-3.5">
      {crumbs.map((crumb, i) => (
        <div key={crumb.label} className="flex items-center gap-1.5">
          {i > 0 && (
            <ChevronRightIcon size={11} className="text-[var(--ink-4)]" />
          )}
          <span
            className={`flex items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--surface)] py-1 ${
              i === 0 ? "pl-1 pr-2.5" : "px-2.5"
            }`}
          >
            {i === 0 && (
              <span
                className="flex items-center justify-center w-[18px] h-[18px] rounded bg-[var(--treatment)]/12 border border-[var(--treatment)]/25"
                style={{ color: "var(--treatment)" }}
              >
                <TerminalIcon size={11} />
              </span>
            )}
            <span
              className="font-mono text-[10px] uppercase tracking-[0.14em]"
              style={{
                color: crumb.accent ? "var(--treatment)" : "var(--ink-2)",
              }}
            >
              {crumb.label}
            </span>
          </span>
        </div>
      ))}
    </nav>
  );
}

export function Card({
  title,
  hint,
  children,
  className = "",
  aside,
}: {
  title?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
  aside?: ReactNode;
}) {
  return (
    <section
      className={`bg-[var(--surface)] border border-[var(--line)] rounded-lg ${className}`}
    >
      {title && (
        <div className="px-5 py-3.5 border-b border-[var(--line)] flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[11px] font-semibold text-[var(--ink-2)] uppercase tracking-[0.12em]">
              {title}
            </h2>
            {hint && (
              <p className="text-xs text-[var(--ink-3)] mt-1 leading-relaxed">{hint}</p>
            )}
          </div>
          {aside && <div className="shrink-0">{aside}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

const TONES = {
  default: "text-[var(--ink)]",
  good: "text-[var(--recovered)]",
  bad: "text-[var(--critical)]",
  warn: "text-[var(--warn)]",
  accent: "text-[var(--treatment)]",
  muted: "text-[var(--ink-2)]",
} as const;

export function Stat({
  label,
  value,
  sub,
  tone = "default",
  size = "md",
}: {
  label: string;
  value: string;
  sub?: ReactNode;
  tone?: keyof typeof TONES;
  size?: "md" | "lg";
}) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--line)] rounded-lg p-5">
      <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--ink-3)] mb-2">
        {label}
      </div>
      <div
        className={`font-mono font-semibold tracking-tight tnum ${TONES[tone]} ${
          size === "lg" ? "text-[34px] leading-none" : "text-[26px] leading-none"
        }`}
      >
        {value}
      </div>
      {sub && (
        <div className="text-xs text-[var(--ink-3)] mt-2.5 leading-relaxed">{sub}</div>
      )}
    </div>
  );
}

export function Pill({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-block text-[10.5px] font-mono px-1.5 py-0.5 rounded border leading-relaxed ${
        className ||
        "text-[var(--ink-2)] border-[var(--line-strong)] bg-[var(--surface-raised)]"
      }`}
    >
      {children}
    </span>
  );
}

const BAR_TONES = {
  treatment: "var(--treatment)",
  guard: "var(--guard)",
  recovered: "var(--recovered)",
  control: "var(--control)",
  muted: "var(--line-strong)",
} as const;

export function Bar({
  value,
  max,
  tone = "treatment",
}: {
  value: number;
  max: number;
  tone?: keyof typeof BAR_TONES;
}) {
  const width = max > 0 ? Math.max((value / max) * 100, value > 0 ? 1.5 : 0) : 0;
  return (
    <div className="w-full bg-[var(--surface-inset)] rounded-sm h-1.5 overflow-hidden">
      <div
        className="h-1.5 rounded-sm transition-all duration-500"
        style={{ width: `${width}%`, background: BAR_TONES[tone] }}
      />
    </div>
  );
}

export function Loading({ what }: { what: string }) {
  return (
    <div className="px-10 py-16 text-sm text-[var(--ink-3)] font-mono flex items-center gap-3">
      <span className="relative flex w-2 h-2">
        <span
          className="absolute inline-flex w-2 h-2 rounded-full pulse-ring"
          style={{ background: "var(--treatment)" }}
        />
        <span
          className="relative inline-flex w-2 h-2 rounded-full"
          style={{ background: "var(--treatment)" }}
        />
      </span>
      Loading {what}…
    </div>
  );
}

export function Failed({ error }: { error: string }) {
  return (
    <div className="px-10 py-10">
      <div className="border border-[var(--critical)]/40 bg-[var(--critical)]/[0.07] rounded-lg p-5 max-w-2xl">
        <h2 className="text-[var(--critical)] font-semibold mb-2 text-sm">
          Cannot reach the API
        </h2>
        <p className="text-xs text-[var(--ink-3)] font-mono mb-3">{error}</p>
        <p className="text-sm text-[var(--ink-2)] leading-relaxed">
          Start the backend with <code className="text-[var(--ink)]">make api</code>,
          or on a free hosting tier give it a few seconds to wake from cold start
          and reload.
        </p>
      </div>
    </div>
  );
}

export function CaseLink({ id }: { id: string }) {
  return (
    <Link
      href={`/case/${id}`}
      className="font-mono text-[var(--treatment)] hover:underline underline-offset-2"
    >
      {id}
    </Link>
  );
}

/**
 * A short note explaining what a number means or why it is trustworthy.
 * Used liberally: a metric nobody can interpret is decoration.
 */
export function Note({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs text-[var(--ink-3)] leading-relaxed border-l-2 border-[var(--line)] pl-3 mt-4">
      {children}
    </p>
  );
}
