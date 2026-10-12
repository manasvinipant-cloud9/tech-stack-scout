import type { ReactNode } from "react";
import { Clock, OctagonAlert, Hourglass } from "lucide-react";

export const btnPrimary =
  "inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-btn px-4 text-[13px] font-semibold text-white transition-colors duration-100 hover:opacity-90 disabled:opacity-50";
export const btnSecondary =
  "inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-line-ctl px-4 text-[13px] font-semibold text-ink transition-colors duration-100 hover:border-ink disabled:opacity-50";
export const inputCls =
  "h-9 w-full rounded-full border border-line-ctl bg-surface px-4 text-[13px] text-ink outline-none transition-colors duration-100 placeholder:text-ink-4 focus:border-accent";

export const Cap = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <span className={`font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-cap ${className}`}>{children}</span>
);

export function StatusBadge({ kind, days }: { kind: "confirmed" | "inferred" | "stale"; days?: number }) {
  if (kind === "confirmed") return <span className="font-mono text-[10px] font-medium text-good">● CONFIRMED</span>;
  if (kind === "inferred")
    return <span className="rounded-[4px] border border-dashed px-1.5 py-px font-mono text-[10px] font-medium text-ink-3" style={{ borderColor: "var(--dashed)" }}>INFERRED</span>;
  return (
    <span className="inline-flex items-center gap-1 rounded-[4px] bg-warn-bg px-1.5 py-px font-mono text-[10px] font-medium text-warn">
      <Clock className="h-2.5 w-2.5" /> STALE {days}D
    </span>
  );
}

export function StaleChip({ label }: { label: string }) {
  return <span className="ml-2 rounded-[4px] bg-warn-bg px-1.5 py-px align-middle font-mono text-[10px] font-medium text-warn">{label}</span>;
}

export function Banner({ tone, children, action }: { tone: "warn" | "bad" | "dashed"; children: ReactNode; action?: ReactNode }) {
  const cls =
    tone === "warn" ? "bg-warn-bg text-warn" : tone === "bad" ? "bg-bad-bg text-bad-text" : "border border-dashed bg-transparent text-brown";
  const Icon = tone === "bad" ? OctagonAlert : tone === "warn" ? Hourglass : Clock;
  return (
    <div className={`flex items-center gap-3 rounded-[10px] px-4 py-3 text-[13px] sm:text-sm ${cls}`} style={tone === "dashed" ? { borderColor: "var(--dashed)" } : undefined}>
      <Icon className="h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
      {action && <div className="shrink-0 font-semibold underline underline-offset-[3px]">{action}</div>}
    </div>
  );
}

export const Panel = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <section className={`rounded-[14px] border border-line bg-panel ${className}`}>{children}</section>
);

export const Chip = ({ children, inferred }: { children: ReactNode; inferred?: boolean }) => (
  <span
    className={`rounded-md px-2 py-[3px] font-mono text-xs ${inferred ? "border border-dashed text-ink-3" : "bg-chip text-ink"}`}
    style={inferred ? { borderColor: "var(--dashed)" } : undefined}
  >
    {children}
    {inferred ? "?" : ""}
  </span>
);

export const FitNumber = ({ n, size = "sm" }: { n: number | null; size?: "sm" | "lg" }) =>
  size === "lg" ? (
    <span className="text-[56px] font-extrabold leading-[0.9] tracking-[-0.05em] text-accent">{n ?? "—"}</span>
  ) : (
    <span className="text-[17px] font-extrabold text-accent">{n ?? "—"}</span>
  );
