import { ExternalLink } from "lucide-react";
import type { Source } from "@/lib/types";
import { SOURCE_LABEL } from "@/lib/derive";

/** A source reference that links to the public page behind it when we know it. */
export function SourceChip({ source, url, label }: { source: Source; url?: string | null; label?: string }) {
  const text = label ?? SOURCE_LABEL[source];
  const cls = "inline-flex items-center gap-1 rounded-md border border-line bg-sunken px-1.5 py-0.5 font-mono text-[10.5px] text-ink-3";
  if (source === "none") return <span className={`${cls} border-dashed`} style={{ borderColor: "var(--dashed)" }}>No source</span>;
  return url ? (
    <a href={url} target="_blank" rel="noreferrer" className={`${cls} transition-colors hover:border-accent hover:text-accent`} aria-label={`${text} (opens the public source)`}>{text}<ExternalLink className="h-2.5 w-2.5" /></a>
  ) : <span className={cls}>{text}</span>;
}
