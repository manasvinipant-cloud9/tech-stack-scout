"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Copy, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "@/lib/toast";
import type { Source } from "@/lib/types";
import { SourceChip } from "./SourceChip";
import { btnPrimary, btnSecondary } from "./ui";

type Props = { id: number; line: string | null; signal: string | null; source: Source | null; links: Partial<Record<Source, string>>; compact?: boolean };

/** The suggested first line, the signal it is built on, and where that signal came from. */
export default function OpeningLine({ id, line: initial, signal: s0, source: src0, links, compact = false }: Props) {
  const router = useRouter();
  const [line, setLine] = useState(initial);
  const [signal, setSignal] = useState(s0);
  const [source, setSource] = useState<Source | null>(src0);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const regenerate = async () => {
    setBusy(true);
    const r = await fetch(`/api/companies/${id}/opening-line`, { method: "POST" }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    setBusy(false);
    if (!r?.ok) { toast(d?.error ?? "Could not generate a new line", "error"); return; }
    setLine(d.line); setSignal(d.signal); setSource(d.source);
    toast("New opening line generated");
    router.refresh();
  };
  const copy = async () => {
    if (!line) return;
    await navigator.clipboard.writeText(line);
    setCopied(true); toast("Opening line copied");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div>
      {line ? (
        <blockquote className={`rounded-lg border border-accent/30 bg-deep/70 text-dark-text ${compact ? "p-3.5 text-[14px]" : "p-4 text-[15.5px]"} font-medium leading-snug`} aria-busy={busy}>
          {busy ? <span className="skel inline-block h-4 w-full" /> : line}
        </blockquote>
      ) : <p className="rounded-lg border border-dashed p-4 text-sm text-ink-3" style={{ borderColor: "var(--line-ctl)" }}>No opening line yet. Generate one from this account&apos;s research.</p>}

      <div className="mt-3 rounded-lg bg-sunken p-3">
        <div className="mb-1 font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-cap">Built on this signal</div>
        {signal ? <p className="text-[13px] leading-snug text-ink-2">{signal}</p> : <p className="text-[13px] text-ink-3">This line was written before signal tracking existed. Regenerate to record exactly which observation it relies on.</p>}
        {source && <div className="mt-2 flex items-center gap-2 text-xs text-ink-4">Source <SourceChip source={source} url={links[source]} /></div>}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={copy} disabled={!line || busy} className={btnPrimary}>{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copied" : "Copy line"}</button>
        <button onClick={regenerate} disabled={busy} className={btnSecondary}>{busy ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} {busy ? "Generating…" : "Regenerate"}</button>
      </div>
      <p className="mt-2 text-[11px] text-ink-4">Written by Gemini Flash from this account&apos;s public signals only.</p>
    </div>
  );
}
