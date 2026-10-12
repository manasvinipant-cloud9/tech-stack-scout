"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, ExternalLink, PenLine, X } from "lucide-react";
import { toast } from "@/lib/toast";
import { IcpIndicators } from "./Icp";
import { CompanyLogo, TechLogo } from "./Logos";
import { FitBadge, StatusPill, btnPrimary, btnSecondary } from "./ui";
import type { FitCategory } from "@/lib/derive";

type Preview = {
  id: number; name: string; domain: string; status: string; error: string | null; researched: boolean; stale: boolean; fit: number | null; fitCat: FitCategory; fresh: string;
  checks: { key: "cloud" | "microservices" | "language"; label: string; status: "met" | "partial" | "unmet" | "unknown"; value: string; evidence: string }[];
  why: string | null; summary: string | null; hook: string | null; hookSignal: string | null; techs: string[];
  roles: number | null; repos: number | null; publicRepos: number | null; sources: { label: string; url: string }[];
};
const cache = new Map<number, Preview>();

/** Master–detail quick view: inspect an account without leaving the list; arrows step through the current (filtered) list. */
export default function AccountDrawer({ ids, index, onIndex, onClose }: { ids: number[]; index: number | null; onIndex: (i: number) => void; onClose: () => void }) {
  const id = index != null ? ids[index] : null;
  const [data, setData] = useState<Preview | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id == null) return;
    setErr(null);
    if (cache.has(id)) { setData(cache.get(id)!); return; }
    setData(null);
    let live = true;
    fetch(`/api/companies/${id}/preview`).then((r) => r.json()).then((d) => { if (!live) return; if (d.error) setErr(d.error); else { cache.set(id, d); setData(d); } }).catch(() => live && setErr("Could not load this account"));
    return () => { live = false; };
  }, [id]);

  useEffect(() => {
    if (index == null) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (/INPUT|TEXTAREA|SELECT/.test(t.tagName)) return;
      if (e.key === "Escape") onClose();
      if ((e.key === "j" || e.key === "ArrowDown") && index < ids.length - 1) { e.preventDefault(); onIndex(index + 1); }
      if ((e.key === "k" || e.key === "ArrowUp") && index > 0) { e.preventDefault(); onIndex(index - 1); }
    };
    window.addEventListener("keydown", onKey);
    ref.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [index, ids.length, onIndex, onClose]);

  if (index == null || id == null) return null;
  const d = data;
  return (
    <div className="fixed inset-0 z-40 print:hidden">
      <button aria-label="Close quick view" className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} tabIndex={-1} />
      <aside ref={ref} tabIndex={-1} role="dialog" aria-label="Account quick view" className="pop absolute inset-y-0 right-0 flex w-full max-w-[460px] flex-col border-l border-line bg-panel shadow-2xl outline-none">
        <div className="flex items-center gap-1 border-b border-line-soft px-3 py-2.5">
          <button onClick={() => onIndex(index - 1)} disabled={index === 0} aria-label="Previous account (k)" title="Previous (k)" className="grid h-8 w-8 place-items-center rounded-md text-ink-3 hover:bg-raised disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
          <button onClick={() => onIndex(index + 1)} disabled={index >= ids.length - 1} aria-label="Next account (j)" title="Next (j)" className="grid h-8 w-8 place-items-center rounded-md text-ink-3 hover:bg-raised disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
          <span className="ml-1 font-mono text-[11px] text-ink-4">{index + 1} of {ids.length}</span>
          <button onClick={onClose} aria-label="Close" className="ml-auto grid h-8 w-8 place-items-center rounded-md text-ink-3 hover:bg-raised"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {err && <p className="text-sm text-bad" role="alert">{err}</p>}
          {!d && !err && <div className="space-y-3" aria-busy><div className="skel h-12 w-3/4" /><div className="skel h-4 w-full" /><div className="skel h-4 w-5/6" /><div className="skel h-24 w-full" /></div>}
          {d && (
            <>
              <div className="flex items-start gap-3.5">
                <CompanyLogo name={d.name} domain={d.domain} size={48} />
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-bold leading-tight tracking-[-0.02em]">{d.name}</h2>
                  <a href={`https://${d.domain}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-[11.5px] text-ink-4 hover:text-accent">{d.domain}<ExternalLink className="h-2.5 w-2.5" /></a>
                </div>
                {d.researched && <FitBadge score={d.fit} size="lg" />}
              </div>

              {!d.researched ? (
                <p className="mt-5 rounded-lg border border-dashed p-4 text-sm text-ink-3" style={{ borderColor: "var(--line-ctl)" }}>{d.status === "error" ? `Last run failed: ${d.error}` : "Not researched yet."} Open the account to run research.</p>
              ) : (
                <div className="mt-4 space-y-5">
                  <div className="flex flex-wrap items-center gap-2"><IcpIndicators checks={d.checks} /><StatusPill tone={d.stale ? "warn" : "good"}>{d.stale ? `Stale · ${d.fresh}` : `Researched ${d.fresh}`}</StatusPill></div>

                  <section><h3 className="mb-1.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-cap">Why it fits</h3>
                    <ul className="space-y-1.5">{d.checks.map((c) => <li key={c.key} className="text-[13px]"><span className="font-semibold">{c.label}:</span> <span className="text-ink-2">{c.value !== "—" ? `${c.value}. ` : ""}{c.evidence}</span></li>)}</ul>
                    {d.why && <p className="mt-2 rounded-lg bg-sunken p-3 text-[13px] leading-snug text-ink-2">{d.why}</p>}</section>

                  {d.techs.length > 0 && <section><h3 className="mb-1.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-cap">Confirmed stack</h3>
                    <div className="flex flex-wrap gap-1.5">{d.techs.map((t) => <span key={t} className="inline-flex h-7 items-center gap-1.5 rounded-md bg-chip px-2 text-[12.5px]"><TechLogo name={t} size={13} />{t}</span>)}</div></section>}

                  <section className="grid grid-cols-3 gap-2 text-center">
                    {[["Eng. roles", d.roles ?? "—"], ["Repos active 90d", d.repos != null ? `${d.repos}${d.publicRepos ? `/${d.publicRepos}` : ""}` : "—"], ["Sources", d.sources.length]].map(([l, v]) => (
                      <div key={String(l)} className="rounded-lg bg-sunken px-2 py-2.5"><div className="text-lg font-bold">{v}</div><div className="text-[11px] text-ink-4">{l}</div></div>
                    ))}
                  </section>

                  {d.summary && <section><h3 className="mb-1.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-cap">Engineering context</h3><p className="line-clamp-5 text-[13.5px] leading-relaxed text-ink-2">{d.summary}</p></section>}

                  {d.hook && <section><h3 className="mb-1.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-cap">Your opening line</h3>
                    <blockquote className="rounded-lg border border-accent/30 bg-deep/70 p-3 text-[13.5px] font-medium leading-snug text-dark-text">{d.hook}</blockquote>
                    {d.hookSignal && <p className="mt-1.5 text-xs text-ink-4">Built on: {d.hookSignal}</p>}
                    <button onClick={() => { navigator.clipboard.writeText(d.hook!); toast("Opening line copied"); }} className="mt-1.5 text-xs font-medium text-accent hover:underline">Copy line</button></section>}
                </div>
              )}
            </>
          )}
        </div>

        {d && (
          <div className="flex flex-wrap gap-2 border-t border-line-soft p-4">
            <Link href={`/accounts/${d.id}`} className={`${btnPrimary} flex-1`}>Open full intelligence <ArrowRight className="h-3.5 w-3.5" /></Link>
            {d.researched && <Link href={`/outreach?company=${d.id}`} className={btnSecondary}><PenLine className="h-3.5 w-3.5" /> Outreach</Link>}
          </div>
        )}
      </aside>
    </div>
  );
}
