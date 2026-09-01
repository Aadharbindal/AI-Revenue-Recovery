"use client";

import { useMemo, useRef, useState } from "react";

import type { TimelineRow } from "@/lib/api";
import { istTime } from "@/lib/format";

/**
 * Seven days of the agent's working rhythm, one bar per two-hour tick.
 *
 * Sends above the axis, refusals below. The shape is the argument: activity
 * collapses to nothing every night because the quiet-hours gate suppresses it,
 * and the refusal band is thickest in the first day when the issuer is still
 * degraded and the frequency caps are saturated.
 *
 * A totals table shows the same thing summed, and every bar carries a tooltip,
 * so nothing here depends on reading colour.
 */

const W = 900;
const H = 150;
const PAD = { top: 10, right: 8, bottom: 22, left: 44 };
const GAP = 1.5;   // surface gap between adjacent bars

export default function ActivityRibbon({ rows }: { rows: TimelineRow[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const { maxSent, maxBlocked } = useMemo(
    () => ({
      maxSent: Math.max(...rows.map((r) => r.sent), 1),
      maxBlocked: Math.max(...rows.map((r) => r.blocked), 1),
    }),
    [rows],
  );

  if (rows.length === 0) return null;

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const mid = PAD.top + plotH * 0.58;
  const upH = mid - PAD.top;
  const downH = PAD.top + plotH - mid;
  const bw = plotW / rows.length;
  const x = (i: number) => PAD.left + i * bw;

  const h = hover;

  return (
    <figure className="m-0">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label="Messages sent and actions refused, per two-hour tick across seven days."
      >
        {rows.map((r, i) => {
          const sentH = (r.sent / maxSent) * upH;
          const blockH = (r.blocked / maxBlocked) * downH;
          return (
            <g key={i} onMouseEnter={() => setHover(i)}>
              {/* Generous hit target — the bars themselves are 8px wide */}
              <rect
                x={x(i)}
                y={PAD.top}
                width={bw}
                height={plotH}
                fill={r.quiet ? "var(--surface-inset)" : "transparent"}
              />
              {r.sent > 0 && (
                <rect
                  x={x(i) + GAP / 2}
                  y={mid - sentH}
                  width={Math.max(bw - GAP, 1)}
                  height={sentH}
                  rx={2}
                  fill="var(--treatment)"
                  opacity={h === null || h === i ? 1 : 0.45}
                />
              )}
              {r.blocked > 0 && (
                <rect
                  x={x(i) + GAP / 2}
                  y={mid + 1}
                  width={Math.max(bw - GAP, 1)}
                  height={blockH}
                  rx={2}
                  fill="var(--guard)"
                  opacity={h === null || h === i ? 1 : 0.45}
                />
              )}
            </g>
          );
        })}

        <line
          x1={PAD.left}
          x2={PAD.left + plotW}
          y1={mid}
          y2={mid}
          stroke="var(--axis)"
          strokeWidth={1}
        />

        <text x={PAD.left - 8} y={mid - upH + 10} textAnchor="end" fontSize={10} fill="var(--ink-3)">
          sent
        </text>
        <text x={PAD.left - 8} y={mid + downH - 2} textAnchor="end" fontSize={10} fill="var(--ink-3)">
          refused
        </text>

        {rows.map((r, i) =>
          r.tick % 12 === 0 ? (
            <text
              key={`d${i}`}
              x={x(i) + bw / 2}
              y={H - 6}
              textAnchor="middle"
              fontSize={10}
              fill="var(--ink-3)"
            >
              day {r.day + 1}
            </text>
          ) : null,
        )}

        {h !== null && (
          <line
            x1={x(h) + bw / 2}
            x2={x(h) + bw / 2}
            y1={PAD.top}
            y2={PAD.top + plotH}
            stroke="var(--line-strong)"
            strokeWidth={1}
            pointerEvents="none"
          />
        )}
      </svg>

      <div className="mt-2 h-5 text-xs font-mono text-[var(--ink-3)]">
        {h !== null ? (
          <span className="flex flex-wrap gap-x-5">
            <span>{istTime(rows[h].at)} IST</span>
            <span style={{ color: "var(--treatment)" }}>{rows[h].sent} sent</span>
            <span style={{ color: "var(--guard)" }}>{rows[h].blocked} refused</span>
            {rows[h].quiet && <span style={{ color: "var(--warn)" }}>quiet hours</span>}
          </span>
        ) : (
          <span>Hover any tick for its detail.</span>
        )}
      </div>
    </figure>
  );
}
