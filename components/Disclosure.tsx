import { ChevronRight } from "lucide-react";

/** Native <details>: keyboard accessible, no JS. Used to keep detail one click away instead of always on screen. */
export function Disclosure({ summary, count, children, defaultOpen = false, className = "" }: { summary: React.ReactNode; count?: number | string; children: React.ReactNode; defaultOpen?: boolean; className?: string }) {
  return (
    <details open={defaultOpen} className={`group rounded-lg border border-line-soft bg-sunken/50 ${className}`}>
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3.5 py-2.5 text-[13px] font-medium text-ink-2 transition-colors hover:text-ink [&::-webkit-details-marker]:hidden">
        <ChevronRight className="h-3.5 w-3.5 text-ink-4 transition-transform group-open:rotate-90" />
        <span className="flex-1">{summary}</span>
        {count != null && <span className="font-mono text-[11px] text-ink-4">{count}</span>}
      </summary>
      <div className="border-t border-line-soft px-3.5 py-3 text-[13px]">{children}</div>
    </details>
  );
}
