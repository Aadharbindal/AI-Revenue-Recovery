"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { fetchHealth, type HealthStatus } from "@/lib/api";

const GROUPS = [
  {
    label: "Result",
    links: [
      { href: "/", label: "Command Center" },
      { href: "/experiment", label: "Experiment" },
      { href: "/exceptions", label: "Exceptions" },
    ],
  },
  {
    label: "Evidence",
    links: [
      { href: "/run", label: "Live Batch" },
      { href: "/cases", label: "Cases" },
      { href: "/guardrails", label: "Guardrails" },
      { href: "/audit", label: "Audit Ledger" },
    ],
  },
];

export default function Nav() {
  const pathname = usePathname();
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [down, setDown] = useState(false);

  useEffect(() => {
    fetchHealth().then(setHealth).catch(() => setDown(true));
  }, []);

  return (
    <aside className="w-[220px] shrink-0 bg-[var(--surface)] border-r border-[var(--line)] flex flex-col">
      <div className="px-5 py-6">
        <Link href="/" className="block">
          <h1 className="text-[17px] font-semibold text-[var(--ink)] tracking-tight">
            Recover<span style={{ color: "var(--treatment)" }}>OS</span>
          </h1>
          <p className="text-[9.5px] text-[var(--ink-3)] mt-1.5 uppercase tracking-[0.16em] font-mono leading-relaxed">
            The LLM never
            <br />
            touches a rupee
          </p>
        </Link>
      </div>

      <nav className="flex-1 px-3 space-y-5 overflow-y-auto">
        {GROUPS.map((group) => (
          <div key={group.label}>
            <div className="px-3 mb-1.5 text-[9.5px] uppercase tracking-[0.16em] text-[var(--ink-4)] font-mono">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.links.map((link) => {
                const active =
                  link.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2.5 px-3 py-1.5 rounded text-[13px] transition-colors ${
                      active
                        ? "bg-[var(--surface-raised)] text-[var(--ink)] font-medium"
                        : "text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--surface-raised)]/60"
                    }`}
                  >
                    <span
                      className="w-0.5 h-3.5 rounded-full shrink-0"
                      style={{
                        background: active ? "var(--treatment)" : "transparent",
                      }}
                    />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/*
        Says out loud which integrations are live. A viewer should be able to
        tell whether the payment links and message bodies on screen came from
        real services or from the deterministic fallbacks, without taking the
        README's word for it.
      */}
      <div className="px-4 py-4 border-t border-[var(--line)] text-[10.5px] font-mono space-y-1.5">
        {down && <div className="text-[var(--critical)]">API unreachable</div>}
        {health && (
          <>
            <Integration on={health.integrations.razorpay_test_mode} label="Razorpay" />
            <Integration on={health.integrations.llm} label="LLM" />
            <Integration on={health.integrations.voice_tts} label="Voice TTS" />
            <div className="text-[var(--ink-4)] pt-1.5 leading-relaxed">
              {health.data.cases} cases · {health.data.events} events
            </div>
          </>
        )}
      </div>
    </aside>
  );
}

function Integration({ on, label }: { on: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: on ? "var(--recovered)" : "var(--ink-4)" }}
      />
      <span style={{ color: on ? "var(--ink-2)" : "var(--ink-4)" }}>{label}</span>
      <span className="ml-auto text-[var(--ink-4)]">{on ? "live" : "fallback"}</span>
    </div>
  );
}
