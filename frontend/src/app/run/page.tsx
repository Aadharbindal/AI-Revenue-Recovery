"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { streamBatch, type BatchEvent } from "@/lib/api";
import { CHANNEL_LABELS, istTime, rupeesShort } from "@/lib/format";
import { Bar, Card, Note, Page, Pill, Stat } from "@/components/ui";

interface Counters {
  tick: number;
  at: string;
  istHour: number;
  sent: number;
  blocked: number;
  recovered: number;
  recoveredPaise: number;
}

const EMPTY: Counters = {
  tick: -1,
  at: "",
  istHour: 0,
  sent: 0,
  blocked: 0,
  recovered: 0,
  recoveredPaise: 0,
};

const FEED_LIMIT = 60;

type FeedItem = {
  id: number;
  kind: "sent" | "blocked" | "recovered";
  text: string;
  detail: string;
};

export default function LiveBatch() {
  const [running, setRunning] = useState(false);
  const [counters, setCounters] = useState<Counters>(EMPTY);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [gates, setGates] = useState<Record<string, number>>({});
  const [degraded, setDegraded] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sourceRef = useRef<EventSource | null>(null);
  const seq = useRef(0);

  // An SSE connection left open after unmount keeps a batch running against a
  // browser that stopped listening.
  useEffect(() => () => sourceRef.current?.close(), []);

  const handle = useCallback((event: BatchEvent) => {
    switch (event.type) {
      case "prepared":
        setTotal(event.cases);
        break;
      case "detector":
        setDegraded(event.degraded);
        break;
      case "tick":
        setCounters((c) => ({
          ...c,
          tick: event.tick,
          at: event.at,
          istHour: event.ist_hour,
          sent: event.sent,
          blocked: event.blocked,
          recovered: event.recovered,
        }));
        break;
      case "sent":
        push({
          kind: "sent",
          text: event.case,
          detail: `tier ${event.tier} · ${CHANNEL_LABELS[event.channel] ?? event.channel}`,
        });
        break;
      case "blocked":
        setGates((g) => ({ ...g, [event.gate]: (g[event.gate] ?? 0) + 1 }));
        push({
          kind: "blocked",
          text: event.case,
          detail: `${event.gate} · ${event.reason}`,
        });
        break;
      case "recovered":
        setCounters((c) => ({
          ...c,
          recoveredPaise: c.recoveredPaise + event.amount_paise,
        }));
        push({
          kind: "recovered",
          text: event.case,
          detail: rupeesShort(event.amount_paise),
        });
        break;
      case "done":
        setSummary(event.summary);
        setRunning(false);
        sourceRef.current?.close();
        break;
      case "error":
        setError(event.message);
        setRunning(false);
        sourceRef.current?.close();
        break;
    }

    function push(item: Omit<FeedItem, "id">) {
      setFeed((f) => [{ id: seq.current++, ...item }, ...f].slice(0, FEED_LIMIT));
    }
  }, []);

  function start() {
    setRunning(true);
    setCounters(EMPTY);
    setFeed([]);
    setGates({});
    setSummary(null);
    setError(null);
    sourceRef.current?.close();
    sourceRef.current = streamBatch(handle);
  }

  const progress = counters.tick >= 0 ? ((counters.tick + 1) / 84) * 100 : 0;
  const quiet = counters.istHour >= 21 || counters.istHour < 9;

  return (
    <Page
      title="Live Batch"
      subtitle="Seven simulated days in two-hour ticks. Watch the ladder escalate and the guardrails refuse."
      actions={
        <button
          onClick={start}
          disabled={running}
          className="px-4 py-2 rounded bg-sky-600 hover:bg-sky-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white text-sm font-medium transition"
        >
          {running ? "Running…" : "Run batch"}
        </button>
      }
    >
      {error && (
        <div className="mb-6 border border-rose-900/60 bg-rose-950/30 rounded-lg p-4 text-sm text-rose-300 font-mono">
          {error}
        </div>
      )}

      <div className="mb-6">
        <div className="flex justify-between text-xs font-mono text-zinc-500 mb-2">
          <span>
            {counters.tick >= 0
              ? `tick ${counters.tick + 1}/84 · ${istTime(counters.at)} IST`
              : "idle"}
            {quiet && counters.tick >= 0 && (
              <span className="text-amber-500 ml-2">quiet hours</span>
            )}
          </span>
          <span>{total > 0 && `${total} cases`}</span>
        </div>
        <Bar value={progress} max={100} tone={running ? "sky" : "emerald"} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Sent" value={String(counters.sent)} tone="accent" />
        <Stat
          label="Blocked by a gate"
          value={String(counters.blocked)}
          tone="warn"
        />
        <Stat label="Recovered" value={String(counters.recovered)} tone="good" />
        <Stat
          label="Recovered value"
          value={rupeesShort(counters.recoveredPaise)}
          tone="good"
        />
      </div>

      {degraded.length > 0 && (
        <div className="mb-6 px-4 py-3 rounded border border-amber-900/50 bg-amber-950/20 text-sm text-amber-300">
          Detector flagged {degraded.join(", ")} as degraded before the first
          tick. Silent retries against it are being held, not spent.
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <Card title="Decision feed" className="lg:col-span-2">
          <div className="h-[420px] overflow-y-auto font-mono text-xs space-y-1">
            {feed.length === 0 && (
              <p className="text-zinc-600">
                Press “Run batch” to watch decisions stream in.
              </p>
            )}
            {feed.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-zinc-900/60"
              >
                <span
                  className={`w-16 shrink-0 uppercase tracking-wide ${
                    item.kind === "blocked"
                      ? "text-amber-500"
                      : item.kind === "recovered"
                        ? "text-emerald-500"
                        : "text-sky-500"
                  }`}
                >
                  {item.kind}
                </span>
                <span className="text-zinc-400 w-24 shrink-0">{item.text}</span>
                <span className="text-zinc-500">{item.detail}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Gates firing" hint="Distinct cases refused, by gate">
          {Object.keys(gates).length === 0 ? (
            <p className="text-sm text-zinc-600">Nothing refused yet.</p>
          ) : (
            <div className="space-y-2.5">
              {Object.entries(gates)
                .sort((a, b) => b[1] - a[1])
                .map(([gate, n]) => (
                  <div key={gate}>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-zinc-400">{gate}</span>
                      <span className="text-zinc-300">{n}</span>
                    </div>
                    <Bar
                      value={n}
                      max={Math.max(...Object.values(gates))}
                      tone="amber"
                    />
                  </div>
                ))}
            </div>
          )}
          <Note>
            Each case is counted once per distinct refusal reason, so a case
            held overnight by quiet hours does not inflate the count on every
            tick.
          </Note>
        </Card>
      </div>

      {summary && (
        <Card title="Run summary" className="mt-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <SummaryFigure
              label="Spend"
              value={rupeesShort(
                Number((summary.stats as Record<string, number>)?.spend_paise ?? 0),
              )}
            />
            <SummaryFigure
              label="Spend avoided by gates"
              value={rupeesShort(Number(summary.value_protected_paise ?? 0))}
            />
            <SummaryFigure
              label="Compliance exposure avoided"
              value={rupeesShort(
                Number(summary.compliance_risk_avoided_paise ?? 0),
              )}
            />
            <SummaryFigure
              label="Live Razorpay links"
              value={String(summary.real_payment_links ?? 0)}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(
              (summary.gate_blocks as Record<string, number>) ?? {},
            )
              .sort((a, b) => b[1] - a[1])
              .map(([reason, n]) => (
                <Pill key={reason}>
                  {reason} ×{n}
                </Pill>
              ))}
          </div>
        </Card>
      )}
    </Page>
  );
}

function SummaryFigure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-zinc-500 mb-1">
        {label}
      </div>
      <div className="font-mono text-zinc-100">{value}</div>
    </div>
  );
}
