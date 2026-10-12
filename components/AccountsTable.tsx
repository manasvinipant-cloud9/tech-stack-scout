"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Trash2 } from "lucide-react";
import type { AccountRow } from "@/lib/accounts";
import { FIT_CATEGORIES, fmtDate } from "@/lib/derive";
import { toast } from "@/lib/toast";
import AccountDrawer from "./AccountDrawer";
import { LIST_KEY } from "./AccountContextNav";
import { ConfirmDialog } from "./Dialog";
import { IcpIndicators } from "./Icp";
import { CompanyLogo, TechLogo } from "./Logos";
import { FitBadge, StatusPill, btnGhost, btnSecondary } from "./ui";

const ACT_TONE: Record<string, string> = { "Very High": "text-good", High: "text-good", Moderate: "text-warn", Low: "text-ink-3" };
const catLabel = (k: string) => FIT_CATEGORIES.find((c) => c.key === k)?.label ?? "";

function StatusCell({ r }: { r: AccountRow }) {
  if (r.status === "researching") return <StatusPill tone="neutral" icon={false}><Loader2 className="h-3 w-3 animate-spin" /> Researching</StatusPill>;
  if (r.status === "error") return <StatusPill tone="bad">Failed</StatusPill>;
  if (!r.lastUpdated) return <StatusPill tone="neutral">Not researched</StatusPill>;
  if (r.stale) return <StatusPill tone="warn">Stale · {r.ageDays}d</StatusPill>;
  return <StatusPill tone="good">{r.complete ? "Researched" : "Thin evidence"}</StatusPill>;
}

const Cell = ({ v, empty }: { v: string; empty: string }) =>
  v && v !== "—" ? <span className="inline-flex items-center gap-1.5 text-[13px]"><TechLogo name={v} size={14} /><span className="truncate">{v}</span></span> : <span className="text-xs text-ink-4">{empty}</span>;

export default function AccountsTable({ rows }: { rows: AccountRow[] }) {
  const router = useRouter();
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [busyRow, setBusyRow] = useState<number | null>(null);
  const [bulk, setBulk] = useState<null | { label: string; done: number; total: number }>(null);
  const [confirm, setConfirm] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  // Remember the current (filtered, sorted) list so an opened account can step through it and return to it.
  useEffect(() => {
    try { sessionStorage.setItem(LIST_KEY, JSON.stringify({ query: window.location.search, list: rows.map((r) => ({ id: r.id, name: r.name })) })); } catch {}
  }, [rows]);
  const allOn = rows.length > 0 && rows.every((r) => sel.has(r.id));
  const picked = useMemo(() => rows.filter((r) => sel.has(r.id)), [rows, sel]);

  const toggle = (id: number) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const refreshOne = async (r: AccountRow) => {
    setBusyRow(r.id);
    const res = await fetch(`/api/companies/${r.id}/refresh`, { method: "POST" }).catch(() => null);
    setBusyRow(null);
    if (res?.ok) toast(`Research updated for ${r.name}`); else toast((await res?.json().catch(() => null))?.error ?? `Research failed for ${r.name}`, "error");
    router.refresh();
  };
  const bulkRefresh = async () => {
    let ok = 0, fail = 0;
    for (let i = 0; i < picked.length; i++) {
      setBulk({ label: "Refreshing", done: i, total: picked.length });
      const res = await fetch(`/api/companies/${picked[i].id}/refresh`, { method: "POST" }).catch(() => null);
      res?.ok ? ok++ : fail++;
    }
    setBulk(null); setSel(new Set());
    toast(`${ok} refreshed${fail ? `, ${fail} failed` : ""}`, fail ? "error" : "success");
    router.refresh();
  };
  const bulkRemove = async () => {
    let ok = 0;
    for (let i = 0; i < picked.length; i++) {
      setBulk({ label: "Removing", done: i, total: picked.length });
      const res = await fetch(`/api/companies/${picked[i].id}`, { method: "DELETE" }).catch(() => null);
      if (res?.ok) ok++;
    }
    setBulk(null); setSel(new Set()); setConfirm(false);
    toast(`${ok} compan${ok === 1 ? "y" : "ies"} removed`);
    router.refresh();
  };

  return (
    <div>
      {(picked.length > 0 || bulk) && (
        <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-accent/40 bg-raised px-3 py-2 text-[13px]" role="region" aria-label="Bulk actions">
          <span className="font-medium">{bulk ? `${bulk.label} ${bulk.done + 1} of ${bulk.total}…` : `${picked.length} selected`}</span>
          <span className="ml-auto flex gap-2">
            <button onClick={bulkRefresh} disabled={!!bulk} className={btnSecondary}><RefreshCw className={`h-3.5 w-3.5 ${bulk?.label === "Refreshing" ? "animate-spin" : ""}`} /> Refresh research</button>
            <button onClick={() => setConfirm(true)} disabled={!!bulk} className={btnSecondary}><Trash2 className="h-3.5 w-3.5" /> Remove</button>
            <button onClick={() => setSel(new Set())} disabled={!!bulk} className={btnGhost}>Clear selection</button>
          </span>
        </div>
      )}
      <div className="max-h-[calc(100vh-250px)] min-h-[200px] overflow-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[1180px] border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-thead">
            <tr className="border-b border-line font-mono text-[10px] font-medium uppercase tracking-[0.07em] text-cap">
              <th className="w-10 px-3 py-2.5"><input type="checkbox" aria-label="Select all accounts" checked={allOn} onChange={() => setSel(allOn ? new Set() : new Set(rows.map((r) => r.id)))} className="h-3.5 w-3.5 accent-[var(--accent)]" /></th>
              <th className="px-2 py-2.5 font-medium">Company</th><th className="px-2 py-2.5 font-medium">Fit</th><th className="px-2 py-2.5 font-medium">ICP match</th>
              <th className="px-2 py-2.5 font-medium">Cloud</th><th className="px-2 py-2.5 font-medium">Language</th><th className="px-2 py-2.5 font-medium">Eng. activity</th>
              <th className="px-2 py-2.5 font-medium">Status</th><th className="px-2 py-2.5 font-medium">Last researched</th><th className="px-2 py-2.5 font-medium">Next action</th><th className="w-10 px-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const href = r.action.text === "Prepare outreach" ? `/outreach?company=${r.id}` : `/accounts/${r.id}`;
              const tone = r.action.tone === "bad" ? "text-bad" : r.action.tone === "warn" ? "text-warn" : r.action.tone === "good" ? "text-good" : "text-ink-3";
              return (
                <tr key={r.id} onClick={(e) => { if (!(e.target as HTMLElement).closest("a,button,input,label")) setOpen(rows.findIndex((x) => x.id === r.id)); }} className={`cursor-pointer border-b border-line-soft last:border-b-0 transition-colors hover:bg-hover ${open === rows.findIndex((x) => x.id === r.id) ? "bg-raised" : sel.has(r.id) ? "bg-raised/60" : ""}`}>
                  <td className="px-3 py-3"><input type="checkbox" aria-label={`Select ${r.name}`} checked={sel.has(r.id)} onChange={() => toggle(r.id)} className="h-3.5 w-3.5 accent-[var(--accent)]" /></td>
                  <td className="px-2 py-3">
                    <Link href={`/accounts/${r.id}`} onClick={(e) => { if (!e.metaKey && !e.ctrlKey && !e.shiftKey) { e.preventDefault(); setOpen(rows.findIndex((x) => x.id === r.id)); } }} className="group flex min-w-[190px] items-center gap-3" title="Quick view (open the full profile from the panel, or ⌘-click)">
                      <CompanyLogo name={r.name} domain={r.domain} size={32} />
                      <span className="min-w-0"><span className="block truncate text-[14px] font-semibold group-hover:underline">{r.name}</span><span className="block truncate font-mono text-[11px] text-ink-4">{r.domain}</span></span>
                    </Link>
                  </td>
                  <td className="px-2 py-3"><div className="flex flex-col gap-0.5"><FitBadge score={r.fit} />{r.fit != null && <span className="text-[11px] text-ink-4">{catLabel(r.fitCat)}</span>}</div></td>
                  <td className="whitespace-nowrap px-2 py-3"><IcpIndicators checks={r.checks} nowrap /></td>
                  <td className="px-2 py-3"><Cell v={r.cloud} empty={r.lastUpdated ? "Not found" : "—"} /></td>
                  <td className="px-2 py-3"><Cell v={r.language} empty={r.lastUpdated ? "Not found" : "—"} /></td>
                  <td className="px-2 py-3">
                    {r.lastUpdated && r.activity ? <div className="text-[13px]"><span className={`font-medium ${ACT_TONE[r.activity] ?? ""}`}>{r.activity}</span>
                      <div className="whitespace-nowrap text-[11.5px] text-ink-4">{r.roles != null ? `${r.roles} roles` : "no job board"} · {r.reposActive ?? 0} repos</div></div> : <span className="text-xs text-ink-4">—</span>}
                  </td>
                  <td className="px-2 py-3"><StatusCell r={r} /></td>
                  <td className="px-2 py-3 text-[13px]">{r.lastUpdated ? <><div>{fmtDate(r.lastUpdated)}</div><div className="text-[11.5px] text-ink-4">{r.ageDays === 0 ? "today" : `${r.ageDays}d ago`}</div></> : <span className="text-xs text-ink-4">Never</span>}</td>
                  <td className="px-2 py-3"><Link href={href} className={`text-[13px] font-medium hover:underline ${tone}`}>{r.action.text}</Link></td>
                  <td className="px-2 py-3 text-right">
                    <button onClick={() => refreshOne(r)} disabled={busyRow === r.id || r.status === "researching"} aria-label={`Refresh research for ${r.name}`} title="Refresh research"
                      className="grid h-8 w-8 place-items-center rounded-md text-ink-4 hover:bg-raised hover:text-ink disabled:opacity-40"><RefreshCw className={`h-3.5 w-3.5 ${busyRow === r.id ? "animate-spin" : ""}`} /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <AccountDrawer ids={rows.map((r) => r.id)} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={bulkRemove} busy={!!bulk} danger title={`Remove ${picked.length} compan${picked.length === 1 ? "y" : "ies"}?`} confirmLabel="Remove"
        body={<>This removes {picked.slice(0, 4).map((p) => <b key={p.id}>{p.name}, </b>)}{picked.length > 4 ? `and ${picked.length - 4} more ` : ""}along with their research history and notes.</>} />
    </div>
  );
}
