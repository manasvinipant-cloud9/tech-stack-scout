"use client";

import { useState } from "react";
import type { Company } from "@/lib/db";

const LEVEL_STYLE: Record<string, string> = {
  Low: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
  Moderate: "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300",
  High: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300",
  "Very High": "bg-emerald-200 dark:bg-emerald-800/50 text-emerald-900 dark:text-emerald-200",
};

async function api(url: string, init?: RequestInit) {
  const r = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error ?? `Request failed (${r.status})`);
  return data;
}

export default function Dashboard({ initial }: { initial: Company[] }) {
  const [companies, setCompanies] = useState(initial);
  const [busy, setBusy] = useState<Set<number>>(new Set());
  const [form, setForm] = useState({ company_name: "", domain: "", github_org: "" });
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const upsert = (c: Company) =>
    setCompanies((prev) => (prev.some((p) => p.id === c.id) ? prev.map((p) => (p.id === c.id ? c : p)) : [c, ...prev]));

  const refresh = async (id: number) => {
    setBusy((b) => new Set(b).add(id));
    setMsg(null);
    try {
      upsert(await api(`/api/companies/${id}/refresh`, { method: "POST" }));
    } catch (e) {
      setMsg((e as Error).message);
      try { setCompanies(await api("/api/companies")); } catch {}
    } finally {
      setBusy((b) => { const n = new Set(b); n.delete(id); return n; });
    }
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setMsg(null);
    try {
      const c: Company = await api("/api/companies", { method: "POST", body: JSON.stringify(form) });
      upsert(c);
      setForm({ company_name: "", domain: "", github_org: "" });
      refresh(c.id);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setAdding(false);
    }
  };

  const remove = async (c: Company) => {
    if (!confirm(`Remove ${c.company_name} from the watchlist?`)) return;
    try {
      await api(`/api/companies/${c.id}`, { method: "DELETE" });
      setCompanies((p) => p.filter((x) => x.id !== c.id));
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  const refreshAll = async () => {
    for (const c of companies) await refresh(c.id);
  };

  const input = "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200";

  return (
    <div className="space-y-6">
      <form onSubmit={add} className="grid gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm sm:grid-cols-[1fr_1fr_1fr_auto]">
        <input className={input} placeholder="Company name" required value={form.company_name}
          onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
        <input className={input} placeholder="Domain (stripe.com)" required value={form.domain}
          onChange={(e) => setForm({ ...form, domain: e.target.value })} />
        <input className={input} placeholder="GitHub org (optional)" value={form.github_org}
          onChange={(e) => setForm({ ...form, github_org: e.target.value })} />
        <button disabled={adding}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
          {adding ? "Adding…" : "Add & research"}
        </button>
      </form>

      {msg && <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-800 dark:text-red-300">{msg}</div>}

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-600 dark:text-slate-400">{companies.length} on watchlist</h2>
        {companies.length > 0 && (
          <button onClick={refreshAll} disabled={busy.size > 0}
            className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50">
            Refresh all
          </button>
        )}
      </div>

      {companies.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center text-sm text-slate-500 dark:text-slate-400">
          No companies yet. Add one above to generate its engineering brief.
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {companies.map((c) => (
          <Card key={c.id} c={c} loading={busy.has(c.id) || c.status === "researching"}
            onRefresh={() => refresh(c.id)} onRemove={() => remove(c)} />
        ))}
      </div>
    </div>
  );
}

function Card({ c, loading, onRefresh, onRemove }: { c: Company; loading: boolean; onRefresh: () => void; onRemove: () => void }) {
  const [copied, setCopied] = useState(false);
  const paragraphs = c.summary?.split(/\n\s*\n/).filter(Boolean) ?? [];
  const copy = async () => {
    await navigator.clipboard.writeText(c.outreach_hook ?? "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <article className="flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{c.company_name}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            <a href={`https://${c.domain}`} target="_blank" rel="noreferrer" className="hover:underline">{c.domain}</a>
            {c.github_org && <> · <a href={`https://github.com/${c.github_org}`} target="_blank" rel="noreferrer" className="hover:underline">github/{c.github_org}</a></>}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button onClick={onRefresh} disabled={loading}
            className="rounded-md border border-slate-300 dark:border-slate-700 px-2.5 py-1 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50">
            {loading ? "Researching…" : "Refresh"}
          </button>
          <button onClick={onRemove} className="rounded-md border border-slate-300 dark:border-slate-700 px-2.5 py-1 text-xs text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40">Remove</button>
        </div>
      </div>

      {c.status === "error" && c.error && (
        <p className="mt-3 rounded-md bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs text-red-800 dark:text-red-300">Last run failed: {c.error}</p>
      )}

      {!c.last_updated ? (
        <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">{loading ? "Gathering signals and analyzing with Gemini…" : "Not researched yet."}</p>
      ) : (
        <div className="mt-4 space-y-4">
          {c.outreach_hook && (
            <div className="rounded-lg border border-indigo-200 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-950/40 p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">Outreach opener</span>
                <button onClick={copy} className="text-xs text-indigo-700 dark:text-indigo-300 hover:underline">{copied ? "Copied" : "Copy"}</button>
              </div>
              <p className="text-sm text-indigo-950 dark:text-indigo-100">{c.outreach_hook}</p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Chips title="Languages" items={c.languages} empty="No public code found" />
            <Chips title="Infrastructure" items={c.infrastructure} empty="No signals found" />
          </div>

          {c.activity_level && (
            <div className="text-sm">
              <span className={`mr-2 rounded-full px-2 py-0.5 text-xs font-medium ${LEVEL_STYLE[c.activity_level] ?? LEVEL_STYLE.Low}`}>
                {c.activity_level} activity
              </span>
              <span className="text-slate-600 dark:text-slate-400">{c.activity_notes}</span>
            </div>
          )}

          {c.hiring_roles != null && (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              <span className="mr-2 rounded-full bg-sky-100 dark:bg-sky-900/40 px-2 py-0.5 text-xs font-medium text-sky-800 dark:text-sky-300">Hiring</span>
              {c.hiring_roles} open engineering role{c.hiring_roles === 1 ? "" : "s"}
              <span className="text-slate-400 dark:text-slate-500"> · via {c.hiring_source}</span>
            </p>
          )}

          <div className="space-y-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500">Updated {new Date(c.last_updated).toLocaleString()}</p>
        </div>
      )}
    </article>
  );
}

function Chips({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div>
      <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</h4>
      {items.length ? (
        <div className="flex flex-wrap gap-1.5">
          {items.map((i) => <span key={i} className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs text-slate-700 dark:text-slate-300">{i}</span>)}
        </div>
      ) : <p className="text-xs text-slate-400 dark:text-slate-500">{empty}</p>}
    </div>
  );
}
