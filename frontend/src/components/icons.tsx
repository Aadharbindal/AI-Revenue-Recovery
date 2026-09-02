/**
 * Inline icon set.
 *
 * Hand-written rather than pulled from an icon package: seven icons do not
 * justify a dependency, and inlining them means they inherit `currentColor` and
 * never arrive a frame late.
 *
 * All are 24×24, stroked at 1.6, round caps and joins.
 */

type IconProps = { className?: string; size?: number };

function Svg({
  className,
  size = 22,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** Command Center — a shell prompt. */
export function TerminalIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 7l5 5-5 5" />
      <path d="M12.5 17H19" />
    </Svg>
  );
}

/** Experiment — a beaker. */
export function FlaskIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9.5 3h5" />
      <path d="M10.5 3v6.2L5.6 17.8A2 2 0 0 0 7.3 21h9.4a2 2 0 0 0 1.7-3.2L13.5 9.2V3" />
      <path d="M8 15h8" />
    </Svg>
  );
}

/** Exceptions — what did not resolve. */
export function AlertIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10.3 4.3 2.9 17a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9.5v4" />
      <path d="M12 17h.01" />
    </Svg>
  );
}

/** Live Batch — a pulse trace. */
export function ActivityIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 12h3.5l2.5-7 4 14 2.5-7H21" />
    </Svg>
  );
}

/** Cases — the working unit. */
export function CasesIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="2.5" y="7" width="19" height="13" rx="2.5" />
      <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
      <path d="M2.5 12.5h19" />
    </Svg>
  );
}

/** Guardrails — a shield that checks. */
export function ShieldIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 2.8 4.5 6v6c0 4.6 3.1 8.3 7.5 9.4 4.4-1.1 7.5-4.8 7.5-9.4V6L12 2.8Z" />
      <path d="M9 12.2l2.1 2.1L15.2 10" />
    </Svg>
  );
}

/** Audit Ledger — the record. */
export function LedgerIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 6.5v13" />
      <path d="M12 6.5C10.6 5.2 8.8 4.5 7 4.5H3.5v13H7c1.8 0 3.6.7 5 2" />
      <path d="M12 6.5c1.4-1.3 3.2-2 5-2h3.5v13H17c-1.8 0-3.6.7-5 2" />
    </Svg>
  );
}

/** Money recovered — a line trending up. */
export function TrendingUpIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 16.5l5.5-5.5 3.5 3.5L21 5.5" />
      <path d="M15.5 5.5H21v5.5" />
    </Svg>
  );
}

/** Lift — bars, rising. */
export function ChartUpIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 20V4" />
      <path d="M4 20h16" />
      <path d="M8 16.5v-3" />
      <path d="M12.5 16.5v-6.5" />
      <path d="M17 16.5V7" />
    </Svg>
  );
}

/** Spend. */
export function RupeeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 4h10" />
      <path d="M7 8.5h10" />
      <path d="M13 8.5c0 2.5-1.8 4.2-4.4 4.2H7l7.5 7.3" />
    </Svg>
  );
}

/** Refusals — the shield that says no. */
export function ShieldAlertIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 2.8 4.5 6v6c0 4.6 3.1 8.3 7.5 9.4 4.4-1.1 7.5-4.8 7.5-9.4V6L12 2.8Z" />
      <path d="M12 8.5v4" />
      <path d="M12 16h.01" />
    </Svg>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 7.8h.01" />
    </Svg>
  );
}

export function CursorIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 3.5l13.5 7.8-6 1.4-2.6 5.8z" />
    </Svg>
  );
}

/** Where the money went — the rupee, again, at card scale. */
export function BarStackIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="4" width="6.5" height="16" rx="1.5" />
      <rect x="14" y="9.5" width="6.5" height="10.5" rx="1.5" />
    </Svg>
  );
}

export function BanIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M5.6 5.6l12.8 12.8" />
    </Svg>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Svg {...props} size={props.size ?? 16}>
      <path d="M9 5l7 7-7 7" />
    </Svg>
  );
}

/** The counter strip. */
export function BarsIcon(props: IconProps) {
  return (
    <svg
      width={props.size ?? 16}
      height={props.size ?? 16}
      viewBox="0 0 16 16"
      fill="currentColor"
      className={props.className}
      aria-hidden="true"
    >
      <rect x="1" y="9" width="2.6" height="6" rx="0.8" />
      <rect x="5.2" y="5.5" width="2.6" height="9.5" rx="0.8" />
      <rect x="9.4" y="2" width="2.6" height="13" rx="0.8" />
      <rect x="13" y="7" width="2" height="8" rx="0.8" opacity="0.55" />
    </svg>
  );
}
