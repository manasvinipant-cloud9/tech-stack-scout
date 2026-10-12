"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowDownUp, Search, X } from "lucide-react";
import { VIEWS } from "@/lib/views";
import { FIT_CATEGORIES } from "@/lib/derive";

type Props = { counts: Record<string, number>; clouds: string[]; languages: string[]; total: number; shown: number };
const FILTER_KEYS = ["q", "icp", "fit", "status", "fresh", "cloud", "lang"];

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-cap">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={`h-8 rounded-md border bg-sunken px-2 text-[13px] outline-none focus:border-accent ${value ? "border-accent/60 text-ink" : "border-line-ctl text-ink-2"}`}>
        <option value="">Any</option>
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </label>
  );
}

/** All state lives in the URL, so every view is shareable and survives refresh. */
export default function AccountsFilters({ counts, clouds, languages, total, shown }: Props) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const [, start] = useTransition();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    start(() => router.replace(`${path}${next.toString() ? `?${next}` : ""}`, { scroll: false }));
  };
  useEffect(() => { setQ(sp.get("q") ?? ""); }, [sp]);

  const view = sp.get("view") ?? "all";
  const active = FILTER_KEYS.some((k) => sp.get(k)) || view !== "all" || sp.get("sort");
  const sort = sp.get("sort") ?? "icp";
  const dir = sp.get("dir") ?? (sort === "name" ? "asc" : "desc");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Saved views">
        {VIEWS.map((v) => {
          const on = view === v.key;
          return (
            <button key={v.key} role="tab" aria-selected={on} onClick={() => set({ view: v.key === "all" ? null : v.key })}
              className={`inline-flex h-8 items-center gap-2 rounded-lg px-3 text-[13px] transition-colors ${on ? "bg-raised font-semibold text-ink ring-1 ring-line-ctl" : "text-ink-3 hover:bg-raised hover:text-ink"}`}>
              {v.label}<span className={`font-mono text-[11px] ${on ? "text-accent" : "text-ink-4"}`}>{counts[v.key] ?? 0}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-end gap-x-3 gap-y-3 rounded-xl border border-line bg-panel p-3">
        <label className="relative min-w-[220px] flex-1">
          <span className="sr-only">Search by company or domain</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-4" />
          <input value={q} onChange={(e) => { setQ(e.target.value); clearTimeout(timer.current); timer.current = setTimeout(() => set({ q: e.target.value.trim() || null }), 250); }}
            placeholder="Search company or domain" className="h-9 w-full rounded-lg border border-line-ctl bg-sunken pl-9 pr-3 text-[13px] outline-none placeholder:text-ink-4 focus:border-accent" />
        </label>
        <Select label="ICP match" value={sp.get("icp") ?? ""} onChange={(v) => set({ icp: v || null })} options={[{ v: "3", l: "3 of 3" }, { v: "2", l: "2 or more" }, { v: "1", l: "1 or more" }, { v: "0", l: "None" }]} />
        <Select label="Fit score" value={sp.get("fit") ?? ""} onChange={(v) => set({ fit: v || null })} options={FIT_CATEGORIES.map((c) => ({ v: c.key, l: `${c.label} · ${c.range}` }))} />
        <Select label="Status" value={sp.get("status") ?? ""} onChange={(v) => set({ status: v || null })} options={[{ v: "ready", l: "Researched" }, { v: "researching", l: "Researching" }, { v: "error", l: "Failed" }, { v: "pending", l: "Not researched" }]} />
        <Select label="Freshness" value={sp.get("fresh") ?? ""} onChange={(v) => set({ fresh: v || null })} options={[{ v: "fresh", l: "Fresh" }, { v: "stale", l: "Stale" }, { v: "never", l: "Never researched" }]} />
        {clouds.length > 0 && <Select label="Cloud" value={sp.get("cloud") ?? ""} onChange={(v) => set({ cloud: v || null })} options={clouds.map((c) => ({ v: c, l: c }))} />}
        {languages.length > 0 && <Select label="Language" value={sp.get("lang") ?? ""} onChange={(v) => set({ lang: v || null })} options={languages.map((c) => ({ v: c, l: c }))} />}
        <div className="flex items-end gap-1.5">
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-cap">Sort by</span>
            <select value={sort} onChange={(e) => set({ sort: e.target.value === "icp" ? null : e.target.value, dir: null })} className="h-8 rounded-md border border-line-ctl bg-sunken px-2 text-[13px] text-ink-2 outline-none focus:border-accent">
              <option value="icp">ICP match, then fit</option><option value="fit">Fit score</option><option value="activity">Engineering activity</option><option value="researched">Last researched</option><option value="name">Company name</option>
            </select>
          </label>
          <button onClick={() => set({ dir: dir === "asc" ? "desc" : "asc" })} aria-label={`Sort direction: ${dir === "asc" ? "ascending" : "descending"}. Click to reverse`} title={dir === "asc" ? "Ascending" : "Descending"}
            className="grid h-8 w-8 place-items-center rounded-md border border-line-ctl text-ink-3 hover:bg-raised hover:text-ink"><ArrowDownUp className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-ink-3">
        <span>Showing <b className="text-ink">{shown}</b> of {total} accounts</span>
        {active && <button onClick={() => { setQ(""); start(() => router.replace(path, { scroll: false })); }} className="inline-flex items-center gap-1 font-medium text-accent hover:underline"><X className="h-3 w-3" /> Clear all filters</button>}
      </div>
    </div>
  );
}
