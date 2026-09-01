"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { fetchHealth, type HealthStatus } from "@/lib/api";

const LINKS = [
  { href: "/", label: "Command Center" },
  { href: "/run", label: "Live Batch" },
  { href: "/cases", label: "Cases" },
  { href: "/guardrails", label: "Guardrails" },
  { href: "/experiment", label: "Experiment" },
  { href: "/exceptions", label: "Exceptions" },
  { href: "/audit", label: "Audit Ledger" },
];

export default function Nav() {
  const pathname = usePathname();
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [down, setDown] = useState(false);

  useEffect(() => {
    fetchHealth().then(setHealth).catch(() => setDown(true));
  }, []);

  return (
    <aside className="w-60 shrink-0 bg-[#101012] border-r border-zinc-800 flex flex-col">
      <div className="p-6">
        <h1 className="text-lg font-semibold text-white tracking-tight">
          Recover<span className="text-sky-500">OS</span>
        </h1>
        <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-[0.15em] font-mono">
          Track 03 · Revenue Recovery
        </p>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {LINKS.map((link) => {
          const active =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`block px-3 py-2 rounded text-sm transition ${
                active
                  ? "bg-zinc-800 text-white font-medium"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/*
        Says out loud which integrations are live. A viewer should be able to
        tell whether the payment links and message bodies on screen came from
        real services or from the deterministic fallbacks, without taking the
        README's word for it.
      */}
      <div className="p-4 border-t border-zinc-800 text-[11px] font-mono space-y-1.5">
        {down && <div className="text-rose-400">API unreachable</div>}
        {health && (
          <>
            <Integration on={health.integrations.razorpay_test_mode} label="Razorpay test mode" />
            <Integration on={health.integrations.llm} label="LLM provider" />
            <Integration on={health.integrations.voice_tts} label="Voice TTS" />
            <div className="text-zinc-600 pt-1.5">
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
        className={`w-1.5 h-1.5 rounded-full ${
          on ? "bg-emerald-500" : "bg-zinc-600"
        }`}
      />
      <span className={on ? "text-zinc-300" : "text-zinc-600"}>{label}</span>
      <span className="ml-auto text-zinc-600">{on ? "live" : "fallback"}</span>
    </div>
  );
}
