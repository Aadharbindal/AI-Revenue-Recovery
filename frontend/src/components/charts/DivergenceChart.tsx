"use client";

import { useMemo, useRef, useState } from "react";

import type { TimelineRow, Outage } from "@/lib/api";
import { istTime, pct } from "@/lib/format";

/**
 * The counterfactual, drawn.
 *
 * Two cumulative recovery curves over the seven-day window: the arm the agent
 * worked, and the arm it never touched. The shaded wedge between them is the
 * incremental lift — the same number the experiment page states, except here
 * you can watch it open up.
 *
 * Plotted as *rates*, not counts. The arms are 578 and 147 cases, so absolute
 * counts would show a gap that is mostly sample size.
 *
 * The vertical bands are not decoration. The dark columns are the nightly
 * quiet-hours windows where the policy engine suppresses all outreach, and the
 * amber band at the start is the issuer outage during which retries were held
 * rather than spent. Both are visible as flat stretches in the treatment
 * curve, which is the most direct evidence that the guardrails are real.
 */

const W = 900;
const H = 300;
const PAD = { top: 16, right: 92, bottom: 28, left: 44 };

export default function DivergenceChart({
  rows,
  outages = [],
  armTotals,
}: {
  rows: TimelineRow[];
  outages?: Outage[];
  armTotals: { treatment: number; control: number };
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const { treat, ctrl, yMax, quietBands } = useMemo(() => {
    const t = rows.map((r) =>
      armTotals.treatment ? r.cum_treatment / armTotals.treatment : 0,
    );
    const c = rows.map((r) =>
      armTotals.control ? r.cum_control / armTotals.control : 0,
    );
    const max = Math.max(...t, ...c, 0.05);

    // Merge consecutive quiet ticks into bands so we draw ~7 rects, not 42.
    const bands: { from: number; to: number }[] = [];
    rows.forEach((r, i) => {
      if (!r.quiet) return;
      const last = bands[bands.length - 1];
      if (last && last.to === i - 1) last.to = i;
      else bands.push({ from: i, to: i });
    });

    return {
      treat: t,
      ctrl: c,
      yMax: Math.ceil(max * 20) / 20,
      quietBands: bands,
    };
  }, [rows, armTotals]);

  if (rows.length === 0) return null;

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (i / (rows.length - 1)) * plotW;
  const y = (v: number) => PAD.top + plotH - (v / yMax) * plotH;

  const line = (series: number[]) =>
    series.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(v)}`).join(" ");

  const wedge =
    treat.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(v)}`).join(" ") +
    " " +
    ctrl
      .map((v, i) => `L${x(ctrl.length - 1 - i)},${y(ctrl[ctrl.length - 1 - i])}`)
      .join(" ") +
    " Z";

  const yTicks = Array.from({ length: 5 }, (_, i) => (yMax / 4) * i);
  const dayTicks = rows
    .map((r, i) => ({ i, day: r.day }))
    .filter(({ i }) => rows[i].tick % 12 === 0);

  const finalTreat = treat[treat.length - 1];
  const finalCtrl = ctrl[ctrl.length - 1];
  const h = hover;

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const idx = Math.round(((px - PAD.left) / plotW) * (rows.length - 1));
    setHover(idx >= 0 && idx < rows.length ? idx : null);
  }

  return (
    <figure className="m-0">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label={`Cumulative recovery rate over seven days. Treatment arm reaches ${pct(finalTreat)}, control arm ${pct(finalCtrl)}.`}
      >
        {/* Issuer outage — retries held, not spent */}
        {outages.map((o) => (
          <g key={o.issuer}>
            <rect
              x={x(o.start_tick)}
              y={PAD.top}
              width={Math.max(x(o.end_tick) - x(o.start_tick), 3)}
              height={plotH}
              fill="var(--warn)"
              opacity={0.09}
            />
            <line
              x1={x(o.end_tick)}
              x2={x(o.end_tick)}
              y1={PAD.top}
              y2={PAD.top + plotH}
              stroke="var(--warn)"
              strokeWidth={1}
              strokeDasharray="3 3"
              opacity={0.5}
            />
            <text
              x={x(o.end_tick) + 6}
              y={PAD.top + 12}
              fontSize={10}
              fill="var(--warn)"
              opacity={0.85}
            >
              {o.issuer} recovers
            </text>
          </g>
        ))}

        {/* Grid */}
        {yTicks.map((v) => (
          <g key={v}>
            <line
              x1={PAD.left}
              x2={PAD.left + plotW}
              y1={y(v)}
              y2={y(v)}
              stroke="var(--grid)"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 8}
              y={y(v) + 3.5}
              textAnchor="end"
              fontSize={10}
              fill="var(--ink-3)"
              className="tnum"
            >
              {Math.round(v * 100)}%
            </text>
          </g>
        ))}

        {dayTicks.map(({ i, day }) => (
          <text
            key={i}
            x={x(i)}
            y={H - 10}
            textAnchor="middle"
            fontSize={10}
            fill="var(--ink-3)"
          >
            day {day + 1}
          </text>
        ))}

        {/* The lift, as area */}
        <path d={wedge} fill="var(--treatment)" opacity={0.16} />

        {/*
          Quiet hours, drawn *over* the wedge rather than under it. Underneath,
          the shaded lift washed them out and the nightly no-contact windows —
          the most direct visual evidence that the gate is real — disappeared.
        */}
        {quietBands.map((b, i) => (
          <rect
            key={`q${i}`}
            x={x(b.from)}
            y={PAD.top}
            width={Math.max(x(b.to) - x(b.from), 2)}
            height={plotH}
            fill="var(--plane)"
            opacity={0.42}
          />
        ))}

        {/* Control first, so treatment draws over it */}
        <path
          d={line(ctrl)}
          fill="none"
          stroke="var(--control)"
          strokeWidth={2}
          strokeDasharray="4 3"
        />
        <path
          d={line(treat)}
          fill="none"
          stroke="var(--treatment)"
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* Direct labels — identity never rests on colour alone */}
        <g>
          <circle cx={x(rows.length - 1)} cy={y(finalTreat)} r={3.5} fill="var(--treatment)" />
          <text
            x={x(rows.length - 1) + 10}
            y={y(finalTreat) - 2}
            fontSize={11}
            fill="var(--ink)"
            fontWeight={600}
            className="tnum"
          >
            {pct(finalTreat)}
          </text>
          <text x={x(rows.length - 1) + 10} y={y(finalTreat) + 11} fontSize={10} fill="var(--ink-3)">
            treated
          </text>
        </g>
        <g>
          <circle cx={x(rows.length - 1)} cy={y(finalCtrl)} r={3.5} fill="var(--control)" />
          <text
            x={x(rows.length - 1) + 10}
            y={y(finalCtrl) - 2}
            fontSize={11}
            fill="var(--ink-2)"
            fontWeight={600}
            className="tnum"
          >
            {pct(finalCtrl)}
          </text>
          <text x={x(rows.length - 1) + 10} y={y(finalCtrl) + 11} fontSize={10} fill="var(--ink-3)">
            untouched
          </text>
        </g>

        {/* Crosshair */}
        {h !== null && (
          <g pointerEvents="none">
            <line
              x1={x(h)}
              x2={x(h)}
              y1={PAD.top}
              y2={PAD.top + plotH}
              stroke="var(--line-strong)"
              strokeWidth={1}
            />
            <circle cx={x(h)} cy={y(treat[h])} r={4} fill="var(--treatment)" stroke="var(--surface)" strokeWidth={2} />
            <circle cx={x(h)} cy={y(ctrl[h])} r={4} fill="var(--control)" stroke="var(--surface)" strokeWidth={2} />
          </g>
        )}
      </svg>

      {h !== null && (
        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs font-mono">
          <span className="text-[var(--ink-3)]">{istTime(rows[h].at)} IST</span>
          <span className="text-[var(--ink-2)]">
            <span className="inline-block w-2 h-2 rounded-sm mr-1.5 align-middle" style={{ background: "var(--treatment)" }} />
            treated {pct(treat[h])}
          </span>
          <span className="text-[var(--ink-2)]">
            <span className="inline-block w-2 h-2 rounded-sm mr-1.5 align-middle" style={{ background: "var(--control)" }} />
            untouched {pct(ctrl[h])}
          </span>
          <span className="text-[var(--ink)]">
            gap {((treat[h] - ctrl[h]) * 100).toFixed(1)} pp
          </span>
          {rows[h].quiet && (
            <span className="text-[var(--warn)]">quiet hours — no outreach</span>
          )}
        </div>
      )}

      <figcaption className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-[var(--ink-3)]">
        <Legend swatch="var(--treatment)" label="Treatment — worked by the agent" />
        <Legend swatch="var(--control)" label="Control — never contacted" dashed />
        <Legend swatch="#05060700" label="Quiet hours (9PM–9AM IST)" dark />
        <Legend swatch="rgba(250,178,25,0.35)" label="Issuer degraded, retries held" />
      </figcaption>
    </figure>
  );
}

function Legend({
  swatch,
  label,
  dashed,
  dark,
}: {
  swatch: string;
  label: string;
  dashed?: boolean;
  dark?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block w-3 h-2 rounded-sm"
        style={{
          // The quiet-hours swatch is a darkening overlay, so it is shown the
          // way it appears on the chart: the plot fill seen through it.
          background: dark ? "var(--plane)" : swatch,
          opacity: dark ? 0.85 : 1,
          border: dashed
            ? "1px dashed var(--control)"
            : dark
              ? "1px solid var(--line-strong)"
              : undefined,
        }}
      />
      {label}
    </span>
  );
}
