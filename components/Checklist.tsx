import { Check as CheckIcon, Minus, X } from "lucide-react";
import type { Check, CheckStatus } from "@/lib/checklist";

const STYLE: Record<CheckStatus, { box: string; label: string }> = {
  met: { box: "bg-good-dot text-white", label: "Match" },
  partial: { box: "bg-warn-bg text-warn", label: "Partial" },
  unmet: { box: "border border-line-ctl text-ink-4", label: "No match" },
  unknown: { box: "border border-dashed text-ink-4", label: "No evidence" },
};

function Icon({ s }: { s: CheckStatus }) {
  return s === "met" ? <CheckIcon className="h-3 w-3" strokeWidth={3} /> : s === "partial" ? <Minus className="h-3 w-3" strokeWidth={3} /> : s === "unmet" ? <X className="h-3 w-3" /> : <span className="text-[10px] font-bold">?</span>;
}

/** Account header: the brief's three relevance contexts, each with value, verdict and evidence. */
export function ChecklistStrip({ checks }: { checks: Check[] }) {
  return (
    <div className="grid overflow-hidden rounded-xl border border-line bg-panel sm:grid-cols-3">
      {checks.map((c, i) => (
        <div key={c.key} className={`flex gap-3 px-4 py-3 ${i > 0 ? "border-t border-line-soft sm:border-l sm:border-t-0" : ""}`}>
          <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${STYLE[c.status].box}`} style={c.status === "unknown" ? { borderColor: "var(--dashed)" } : undefined}>
            <Icon s={c.status} />
          </span>
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-[13px] text-ink-3">{c.label}</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-cap">{STYLE[c.status].label}</span>
            </div>
            <div className="truncate text-[15px] font-bold">{c.value}</div>
            <div className="truncate text-xs text-ink-3" title={`${c.evidence} · target: ${c.target}`}>{c.evidence}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Dashboard table: three compact letters, C(loud) M(icroservices) L(anguage). */
export function ChecklistDots({ checks }: { checks: Check[] }) {
  const letter = { cloud: "C", microservices: "M", language: "L" } as const;
  return (
    <span className="flex gap-1" title={checks.map((c) => `${c.label}: ${STYLE[c.status].label}${c.value !== "—" ? ` (${c.value})` : ""}`).join("\n")}>
      {checks.map((c) => (
        <span key={c.key} className={`grid h-[22px] w-[22px] place-items-center rounded-full font-mono text-[10px] font-medium ${STYLE[c.status].box}`} style={c.status === "unknown" ? { borderColor: "var(--dashed)" } : undefined}>
          {letter[c.key]}
        </span>
      ))}
    </span>
  );
}
