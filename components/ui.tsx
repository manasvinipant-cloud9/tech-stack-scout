import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, CircleDashed, Clock, OctagonAlert } from "lucide-react";
import { FIT_CATEGORIES, fitCategory, type FitCategory } from "@/lib/derive";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
export const btnPrimary = `inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-btn px-3.5 text-[13px] font-semibold text-white shadow-sm transition duration-100 hover:brightness-110 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 ${focus}`;
export const btnSecondary = `inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-line-ctl bg-transparent px-3.5 text-[13px] font-medium text-ink transition duration-100 hover:bg-raised disabled:cursor-not-allowed disabled:opacity-50 ${focus}`;
export const btnGhost = `inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-[13px] font-medium text-ink-3 transition duration-100 hover:bg-raised hover:text-ink disabled:opacity-50 ${focus}`;
export const inputCls = `h-9 w-full rounded-lg border border-line-ctl bg-sunken px-3 text-[13px] text-ink outline-none transition duration-100 placeholder:text-ink-4 focus:border-accent ${focus}`;

/** Small uppercase mono label. */
export const Cap = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <span className={`font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-cap ${className}`}>{children}</span>
);

export function PageHeader({ title, subtitle, meta, actions }: { title: string; subtitle?: ReactNode; meta?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h1 className="text-[22px] font-bold leading-tight tracking-[-0.02em]">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-ink-3">{subtitle}</p>}
        {meta && <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-ink-4">{meta}</div>}
      </div>
      {actions && <div className="relative flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function SectionHeader({ title, hint, action, className = "" }: { title: string; hint?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={`mb-3 flex items-baseline justify-between gap-3 ${className}`}>
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-3">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em]">{title}</h2>
        {hint && <span className="text-xs text-ink-4">{hint}</span>}
      </div>
      {action && <div className="shrink-0 text-[13px]">{action}</div>}
    </div>
  );
}

export const Panel = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <section className={`rounded-xl border border-line bg-panel shadow-card ${className}`}>{children}</section>
);

type Tone = "good" | "warn" | "bad" | "neutral";
const toneCls: Record<Tone, string> = {
  good: "bg-good-bg text-good",
  warn: "bg-warn-bg text-warn",
  bad: "bg-bad-bg text-bad",
  neutral: "bg-chip text-ink-3",
};
const toneIcon: Record<Tone, ReactNode> = {
  good: <CheckCircle2 className="h-3 w-3" />,
  warn: <AlertTriangle className="h-3 w-3" />,
  bad: <OctagonAlert className="h-3 w-3" />,
  neutral: <CircleDashed className="h-3 w-3" />,
};
/** Status is always icon + text, never colour alone. */
export const StatusPill = ({ tone, children, icon = true }: { tone: Tone; children: ReactNode; icon?: boolean }) => (
  <span className={`inline-flex h-[22px] items-center gap-1 whitespace-nowrap rounded-md px-1.5 text-[11px] font-semibold ${toneCls[tone]}`}>
    {icon && toneIcon[tone]}
    {children}
  </span>
);

export const FIT_COLOR: Record<FitCategory, string> = {
  strong: "var(--good-dot)", good: "#7fb8a0", moderate: "var(--warn-line)", low: "#a56a63", unscored: "var(--ink-5)",
};
const fitText: Record<FitCategory, string> = { strong: "text-good", good: "text-ink", moderate: "text-warn", low: "text-bad", unscored: "text-ink-4" };

/** Fit score with its category written out. */
export function FitBadge({ score, size = "md", showLabel = false }: { score: number | null; size?: "md" | "lg"; showLabel?: boolean }) {
  const cat = fitCategory(score);
  const label = FIT_CATEGORIES.find((c) => c.key === cat)!.label;
  return (
    <span className={`inline-flex items-baseline gap-1.5 ${fitText[cat]}`} title={`Fit ${score ?? "not scored"} · ${label}`}>
      <span className={size === "lg" ? "text-[44px] font-extrabold leading-none tracking-[-0.04em]" : "text-[17px] font-bold leading-none"}>{score ?? "—"}</span>
      {showLabel && <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.08em]">{label}</span>}
    </span>
  );
}

export function Banner({ tone, children, action }: { tone: "warn" | "bad" | "dashed"; children: ReactNode; action?: ReactNode }) {
  const cls = tone === "warn" ? "border-warn-line/40 bg-warn-bg text-warn" : tone === "bad" ? "border-bad/30 bg-bad-bg text-bad-text" : "border-dashed bg-transparent text-ink-3";
  const Icon = tone === "bad" ? OctagonAlert : tone === "warn" ? Clock : CircleDashed;
  return (
    <div className={`flex items-center gap-3 rounded-lg border px-3.5 py-2.5 text-[13px] ${cls}`} style={tone === "dashed" ? { borderColor: "var(--dashed)" } : undefined} role={tone === "bad" ? "alert" : undefined}>
      <Icon className="h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
      {action && <div className="shrink-0 font-semibold">{action}</div>}
    </div>
  );
}

export const EmptyState = ({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) => (
  <div className="rounded-xl border border-dashed p-8 text-center" style={{ borderColor: "var(--line-ctl)" }}>
    <div className="text-[15px] font-semibold">{title}</div>
    {children && <p className="mx-auto mt-1 max-w-md text-sm text-ink-3">{children}</p>}
    {action && <div className="mt-4 flex justify-center">{action}</div>}
  </div>
);

/** Compact horizontal stacked bar; each segment is a labelled count elsewhere, never colour alone. */
export function StackBar({ parts, height = 8 }: { parts: { value: number; color: string; label: string }[]; height?: number }) {
  const total = parts.reduce((n, p) => n + p.value, 0) || 1;
  return (
    <div className="flex overflow-hidden rounded-full bg-chip" style={{ height }} role="img" aria-label={parts.map((p) => `${p.label} ${p.value}`).join(", ")}>
      {parts.map((p) => p.value > 0 && <div key={p.label} title={`${p.label}: ${p.value}`} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} />)}
    </div>
  );
}

export const Chip = ({ children, inferred }: { children: ReactNode; inferred?: boolean }) => (
  <span className={`rounded-md px-2 py-[3px] font-mono text-xs ${inferred ? "border border-dashed text-ink-3" : "bg-chip text-ink"}`} style={inferred ? { borderColor: "var(--dashed)" } : undefined}>
    {children}{inferred ? "?" : ""}
  </span>
);

export function StatusBadge({ kind, days }: { kind: "confirmed" | "inferred" | "stale"; days?: number }) {
  if (kind === "confirmed") return <StatusPill tone="good">Confirmed</StatusPill>;
  if (kind === "inferred") return <StatusPill tone="neutral">Inferred</StatusPill>;
  return <StatusPill tone="warn">Stale {days}d</StatusPill>;
}
export const StaleChip = ({ label }: { label: string }) => <StatusPill tone="warn" icon={false}>{label}</StatusPill>;
export const FitNumber = ({ n, size = "sm" }: { n: number | null; size?: "sm" | "lg" }) => <FitBadge score={n} size={size === "lg" ? "lg" : "md"} />;
