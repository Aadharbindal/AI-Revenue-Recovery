/**
 * Formatting helpers.
 *
 * Money arrives from the API in paise — integers, never floats — and is only
 * turned into rupees here, at the edge. Keeping currency as integers all the
 * way through means no rounding drift between the dashboard, EVALUATION.md and
 * the ledger.
 */

export function rupees(paise: number | null | undefined, decimals = 2): string {
  const value = (paise ?? 0) / 100;
  return `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/** Compact Indian notation for headline tiles: ₹1.06 Cr, ₹4.2 L, ₹8,400. */
export function rupeesShort(paise: number | null | undefined): string {
  const value = (paise ?? 0) / 100;
  if (Math.abs(value) >= 1e7) return `₹${(value / 1e7).toFixed(2)} Cr`;
  if (Math.abs(value) >= 1e5) return `₹${(value / 1e5).toFixed(2)} L`;
  if (Math.abs(value) >= 1e3) return `₹${(value / 1e3).toFixed(1)}K`;
  return `₹${value.toFixed(0)}`;
}

export function pct(fraction: number | null | undefined, decimals = 1): string {
  return `${((fraction ?? 0) * 100).toFixed(decimals)}%`;
}

export function pp(fraction: number | null | undefined, decimals = 1): string {
  const value = (fraction ?? 0) * 100;
  return `${value >= 0 ? "+" : ""}${value.toFixed(decimals)} pp`;
}

export function istTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * One entry per recovery class. A class missing from here renders as an
 * unstyled pill, which is how CHECKOUT_ABANDONED and MANDATE_REPAIR shipped
 * invisible when they were added to the backend — the list is the reason to
 * keep it beside the enum in `app/core/classifier.py`.
 */
export const CLASS_COLORS: Record<string, string> = {
  AUTO_RETRY: "text-sky-400 border-sky-500/30 bg-sky-500/10",
  RETRY_TIMED: "text-violet-400 border-violet-500/30 bg-violet-500/10",
  SWITCH_METHOD: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  NUDGE_CUSTOMER: "text-teal-400 border-teal-500/30 bg-teal-500/10",
  CHECKOUT_ABANDONED: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
  MANDATE_REPAIR: "text-fuchsia-400 border-fuchsia-500/30 bg-fuchsia-500/10",
  RECEIVABLE_CHASE: "text-indigo-400 border-indigo-500/30 bg-indigo-500/10",
  MANUAL_REVIEW: "text-orange-400 border-orange-500/30 bg-orange-500/10",
  DEAD: "text-zinc-500 border-zinc-600/30 bg-zinc-600/10",
};

export const STATE_COLORS: Record<string, string> = {
  RECOVERED: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  EXHAUSTED: "text-zinc-400 border-zinc-600/30 bg-zinc-700/20",
  CLOSED: "text-zinc-500 border-zinc-700/30 bg-zinc-800/30",
  OPEN: "text-sky-400 border-sky-500/30 bg-sky-500/10",
  PROMISED: "text-amber-400 border-amber-500/30 bg-amber-500/10",
};

export const CHANNEL_LABELS: Record<string, string> = {
  silent: "Silent retry",
  whatsapp: "WhatsApp",
  sms: "SMS",
  email: "Email",
  voice: "Voice call",
  human: "Human queue",
};
