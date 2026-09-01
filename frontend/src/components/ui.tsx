"use client";

import Link from "next/link";
import { ReactNode } from "react";

/** Shared primitives. Dark, dense, monospace numbers — this is an ops console. */

export function Page({
  title,
  subtitle,
  children,
  actions,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="p-8 lg:p-10 max-w-7xl">
      <header className="mb-8 flex items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-zinc-400 mt-1 max-w-2xl leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
        {actions}
      </header>
      {children}
    </div>
  );
}

export function Card({
  title,
  hint,
  children,
  className = "",
}: {
  title?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`bg-[#141417] border border-zinc-800 rounded-lg ${className}`}
    >
      {title && (
        <div className="px-5 py-4 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">
            {title}
          </h2>
          {hint && <p className="text-xs text-zinc-500 mt-1">{hint}</p>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Stat({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "good" | "bad" | "warn" | "accent";
}) {
  const tones = {
    default: "text-white",
    good: "text-emerald-400",
    bad: "text-rose-400",
    warn: "text-amber-400",
    accent: "text-sky-400",
  };
  return (
    <div className="bg-[#141417] border border-zinc-800 rounded-lg p-5">
      <div className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">
        {label}
      </div>
      <div
        className={`text-2xl font-mono font-semibold tracking-tight ${tones[tone]}`}
      >
        {value}
      </div>
      {sub && <div className="text-xs text-zinc-500 mt-2 leading-relaxed">{sub}</div>}
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
      className={`inline-block text-[11px] font-mono px-2 py-0.5 rounded border ${
        className || "text-zinc-400 border-zinc-700 bg-zinc-800/40"
      }`}
    >
      {children}
    </span>
  );
}

export function Bar({
  value,
  max,
  tone = "sky",
}: {
  value: number;
  max: number;
  tone?: "sky" | "emerald" | "zinc" | "rose" | "amber";
}) {
  const tones = {
    sky: "bg-sky-500",
    emerald: "bg-emerald-500",
    zinc: "bg-zinc-500",
    rose: "bg-rose-500",
    amber: "bg-amber-500",
  };
  const width = max > 0 ? Math.max((value / max) * 100, value > 0 ? 1.5 : 0) : 0;
  return (
    <div className="w-full bg-zinc-900 rounded-sm h-2 overflow-hidden">
      <div
        className={`h-2 rounded-sm ${tones[tone]} transition-all duration-500`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

export function Loading({ what }: { what: string }) {
  return (
    <div className="p-10 text-sm text-zinc-500 font-mono">Loading {what}…</div>
  );
}

export function Failed({ error }: { error: string }) {
  return (
    <div className="p-10">
      <div className="border border-rose-900/60 bg-rose-950/30 rounded-lg p-5 max-w-2xl">
        <h2 className="text-rose-300 font-semibold mb-2">Cannot reach the API</h2>
        <p className="text-sm text-zinc-400 font-mono mb-3">{error}</p>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Start the backend with{" "}
          <code className="text-zinc-200">make api</code>, or on a free hosting
          tier give it a few seconds to wake from cold start and reload.
        </p>
      </div>
    </div>
  );
}

export function CaseLink({ id }: { id: string }) {
  return (
    <Link
      href={`/case/${id}`}
      className="font-mono text-sky-400 hover:text-sky-300 hover:underline"
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
    <p className="text-xs text-zinc-500 leading-relaxed border-l-2 border-zinc-800 pl-3 mt-4">
      {children}
    </p>
  );
}
