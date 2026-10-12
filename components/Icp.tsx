import { Check, Minus, X } from "lucide-react";
import type { CheckStatus } from "@/lib/checklist";

type Mini = { key: "cloud" | "microservices" | "language"; label: string; status: CheckStatus; value: string };
export const STATUS_TEXT: Record<CheckStatus, string> = { met: "Match", partial: "Partial", unmet: "No match", unknown: "No evidence" };
const SHORT = { cloud: "Cloud", microservices: "Micro", language: "Lang" } as const;

const style: Record<CheckStatus, string> = {
  met: "bg-good-bg text-good",
  partial: "bg-warn-bg text-warn",
  unmet: "border border-line-ctl text-ink-3",
  unknown: "border border-dashed text-ink-4",
};
export const StatusGlyph = ({ s, className = "h-3 w-3" }: { s: CheckStatus; className?: string }) =>
  s === "met" ? <Check className={className} strokeWidth={3} /> : s === "partial" ? <Minus className={className} strokeWidth={3} /> : s === "unmet" ? <X className={className} strokeWidth={2.5} /> : <span className="text-[10px] font-bold leading-none">?</span>;

/** Three labelled indicators: icon + word, so status never depends on colour alone. */
export function IcpIndicators({ checks, nowrap = false }: { checks: Mini[]; nowrap?: boolean }) {
  if (!checks.length) return <span className="text-xs text-ink-4">Not researched</span>;
  return (
    <span className={`flex gap-1 ${nowrap ? "flex-nowrap whitespace-nowrap" : "flex-wrap"}`} role="group" aria-label="ICP match: cloud, microservices, language">
      {checks.map((c) => (
        <span key={c.key} title={`${c.label}: ${STATUS_TEXT[c.status]}${c.value && c.value !== "—" ? ` (${c.value})` : ""}`}
          aria-label={`${c.label}: ${STATUS_TEXT[c.status]}`}
          className={`inline-flex h-[22px] items-center gap-1 rounded-md px-1.5 text-[11px] font-semibold ${style[c.status]}`} style={c.status === "unknown" ? { borderColor: "var(--dashed)" } : undefined}>
          <StatusGlyph s={c.status} />{SHORT[c.key]}
        </span>
      ))}
    </span>
  );
}

export function IcpLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-3">
      {(["met", "partial", "unmet", "unknown"] as CheckStatus[]).map((s) => (
        <span key={s} className="inline-flex items-center gap-1.5">
          <span className={`grid h-[18px] w-[18px] place-items-center rounded ${style[s]}`} style={s === "unknown" ? { borderColor: "var(--dashed)" } : undefined}><StatusGlyph s={s} className="h-2.5 w-2.5" /></span>
          {s === "met" ? "Evidenced match" : s === "partial" ? "Partial or inferred" : s === "unmet" ? "Evidence says no match" : "No evidence found"}
        </span>
      ))}
    </div>
  );
}

type Full = { key: string; label: string; status: CheckStatus; value: string; evidence: string };
/** Three criteria with value and evidence, used on the printable brief. */
export function IcpStrip({ checks }: { checks: Full[] }) {
  return (
    <div className="grid overflow-hidden rounded-xl border border-line bg-panel sm:grid-cols-3">
      {checks.map((c, i) => (
        <div key={c.key} className={`flex gap-3 px-4 py-3 ${i > 0 ? "border-t border-line-soft sm:border-l sm:border-t-0" : ""}`}>
          <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${style[c.status]}`}><StatusGlyph s={c.status} /></span>
          <div className="min-w-0"><div className="flex items-baseline gap-2"><span className="text-[13px] text-ink-3">{c.label}</span><span className="font-mono text-[10px] uppercase tracking-[0.06em] text-cap">{STATUS_TEXT[c.status]}</span></div>
            <div className="truncate text-[15px] font-bold">{c.value}</div><div className="text-xs text-ink-3">{c.evidence}</div></div>
        </div>
      ))}
    </div>
  );
}
