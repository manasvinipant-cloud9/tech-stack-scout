import Link from "next/link";
import { Check, CircleDashed, Minus } from "lucide-react";
import { CompanyLogo } from "@/components/Logos";
import { RefreshIcon, RefreshMany, AutoRefresh } from "@/components/ResearchButton";
import { Banner, Cap, EmptyState, PageHeader, Panel, SectionHeader, StatusPill } from "@/components/ui";
import { SIGNALS, availableCount, isComplete, signalStates, type SignalState } from "@/lib/coverage";
import { dbConfigured, listCompanies, listRuns } from "@/lib/db";
import { STALE_DAYS, daysSince, fmtDate, hasData, isStale, relativeTime, unsourcedCount } from "@/lib/derive";
import { nextRunLabel } from "@/lib/schedule";

export const dynamic = "force-dynamic";

const CELL: Record<SignalState, { cls: string; label: string; icon: React.ReactNode }> = {
  available: { cls: "bg-good-bg text-good", label: "Available", icon: <Check className="h-3 w-3" strokeWidth={3} /> },
  partial: { cls: "bg-warn-bg text-warn", label: "Partial", icon: <Minus className="h-3 w-3" strokeWidth={3} /> },
  missing: { cls: "border border-line-ctl text-ink-4", label: "Not found", icon: <span className="text-[10px] font-bold">–</span> },
  pending: { cls: "border border-dashed text-ink-5", label: "Awaiting research", icon: <CircleDashed className="h-3 w-3" /> },
};

export default async function Research() {
  if (!dbConfigured()) return <Banner tone="bad">DATABASE_URL is not set.</Banner>;
  const [all, runs] = await Promise.all([listCompanies(), listRuns(30).catch(() => [])]);
  if (all.length === 0) return <div><PageHeader title="Research & Signals" subtitle="How complete, recent and reliable your intelligence is." /><EmptyState title="No accounts to report on">Add companies to your watchlist and their research coverage will appear here.</EmptyState></div>;

  const researched = all.filter(hasData);
  const ok = all.filter((c) => c.status === "ready" && !isStale(c));
  const awaiting = all.filter((c) => !hasData(c) && c.status !== "error" && c.status !== "researching");
  const stale = all.filter(isStale);
  const failed = all.filter((c) => c.status === "error");
  const thin = researched.filter((c) => !isStale(c) && !isComplete(c));
  const gaps = researched.filter((c) => unsourcedCount(c) > 0);
  const lastOk = [...researched].sort((a, b) => +new Date(b.last_updated!) - +new Date(a.last_updated!))[0];
  const refreshIds = [...failed, ...stale, ...awaiting].map((c) => c.id);

  const matrix = [...all].sort((a, b) => availableCount(a) - availableCount(b) || a.company_name.localeCompare(b.company_name));
  const totals = SIGNALS.map((s) => {
    const n: Record<SignalState, number> = { available: 0, partial: 0, missing: 0, pending: 0 };
    all.forEach((c) => n[signalStates(c)[s.key]]++);
    return n;
  });

  const summary: { label: string; n: number; note: string; href?: string; tone: "good" | "warn" | "bad" | "neutral" }[] = [
    { label: "Researched and current", n: ok.length, note: `within ${STALE_DAYS} days`, href: "/accounts?fresh=fresh", tone: "good" },
    { label: "Thin evidence", n: thin.length, note: "fewer than 4 of 6 signals", tone: "warn" },
    { label: "Stale", n: stale.length, note: `older than ${STALE_DAYS} days`, href: "/accounts?fresh=stale", tone: "warn" },
    { label: "Awaiting research", n: awaiting.length, note: "never researched", href: "/accounts?fresh=never", tone: "neutral" },
    { label: "Failed refresh", n: failed.length, note: "last run errored", href: "/accounts?status=error", tone: "bad" },
  ];
  const toneText = { good: "text-good", warn: "text-warn", bad: "text-bad", neutral: "text-ink" };

  return (
    <div>
      <AutoRefresh active={all.some((c) => c.status === "researching")} />
      <PageHeader title="Research & Signals" subtitle="How complete, recent and reliable the intelligence is across your watchlist."
        meta={<><span>Most recent research: {lastOk ? `${lastOk.company_name}, ${relativeTime(lastOk.last_updated)}` : "none yet"}</span><span>Next scheduled refresh {nextRunLabel()}</span></>}
        actions={<RefreshMany ids={refreshIds} label={refreshIds.length ? `Refresh ${refreshIds.length} needing attention` : "Nothing needs refreshing"} />} />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {summary.map((s) => {
          const body = (<><div className="text-xs text-ink-3">{s.label}</div><div className={`mt-1 text-[28px] font-bold leading-none tracking-[-0.02em] ${s.n ? toneText[s.tone] : "text-ink-4"}`}>{s.n}</div><div className="mt-1.5 text-[11.5px] text-ink-4">{s.note}</div></>);
          return s.href ? <Link key={s.label} href={s.href} className="rounded-xl border border-line bg-panel p-4 shadow-card transition-colors hover:border-line-ctl">{body}</Link> : <div key={s.label} className="rounded-xl border border-line bg-panel p-4 shadow-card">{body}</div>;
        })}
      </div>

      <section className="mb-6">
        <SectionHeader title="Signal coverage matrix" hint="Every account by every signal, least complete first" />
        <Panel className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left">
            <thead><tr className="border-b border-line bg-thead font-mono text-[10px] uppercase tracking-[0.07em] text-cap">
              <th className="px-4 py-2.5 font-medium">Account</th>
              {SIGNALS.map((s) => <th key={s.key} className="px-2 py-2.5 text-center font-medium" title={s.hint}>{s.short}</th>)}
              <th className="px-3 py-2.5 text-center font-medium">Found</th><th className="px-3 py-2.5 font-medium">Researched</th><th className="w-10" />
            </tr></thead>
            <tbody>
              {matrix.map((c) => {
                const st = signalStates(c);
                return (
                  <tr key={c.id} className="border-b border-line-soft hover:bg-hover">
                    <td className="px-4 py-2.5"><Link href={`/accounts/${c.id}`} className="flex min-w-[170px] items-center gap-2.5 hover:underline"><CompanyLogo name={c.company_name} domain={c.domain} size={26} /><span className="text-[13.5px] font-semibold">{c.company_name}</span></Link></td>
                    {SIGNALS.map((s) => (
                      <td key={s.key} className="px-2 py-2.5 text-center">
                        <span role="img" aria-label={`${s.label}: ${CELL[st[s.key]].label}`} title={`${s.label}: ${CELL[st[s.key]].label}`} className={`inline-grid h-6 w-6 place-items-center rounded-md ${CELL[st[s.key]].cls}`} style={st[s.key] === "pending" ? { borderColor: "var(--dashed)" } : undefined}>{CELL[st[s.key]].icon}</span>
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-center font-mono text-xs text-ink-3">{hasData(c) ? `${availableCount(c)}/6` : "—"}</td>
                    <td className="px-3 py-2.5 text-xs text-ink-3">{c.last_updated ? <>{fmtDate(c.last_updated)}<span className="text-ink-4"> · {daysSince(c.last_updated)}d</span></> : "Never"}</td>
                    <td className="px-2"><RefreshIcon id={c.id} name={c.company_name} /></td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot><tr className="bg-thead font-mono text-[11px] text-ink-3">
              <td className="px-4 py-2.5 uppercase tracking-[0.06em] text-cap">Available</td>
              {totals.map((t, i) => <td key={i} className="px-2 py-2.5 text-center">{t.available}<span className="text-ink-5">/{all.length}</span></td>)}
              <td colSpan={3} />
            </tr></tfoot>
          </table>
        </Panel>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-ink-3">
          {(Object.keys(CELL) as SignalState[]).map((k) => <span key={k} className="inline-flex items-center gap-1.5"><span className={`inline-grid h-[18px] w-[18px] place-items-center rounded ${CELL[k].cls}`} style={k === "pending" ? { borderColor: "var(--dashed)" } : undefined}>{CELL[k].icon}</span>{CELL[k].label}</span>)}
          <span className="text-ink-4">“Not found” is not proof of absence.</span>
        </div>
      </section>

      <div className="mb-6 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
        <section>
          <SectionHeader title="Accounts missing fit evidence" hint={`${gaps.length}`} />
          <Panel className="divide-y divide-line-soft">
            {gaps.length === 0 && <p className="p-4 text-sm text-ink-3">Every fit reason has a public source.</p>}
            {gaps.slice(0, 8).map((c) => { const r = c.analysis?.fit_reasons.find((x) => x.source === "none"); return (
              <Link key={c.id} href={`/accounts/${c.id}`} className="flex items-start gap-3 px-4 py-3 hover:bg-hover">
                <CompanyLogo name={c.company_name} domain={c.domain} size={28} />
                <div className="min-w-0 flex-1"><div className="text-[13.5px] font-semibold">{c.company_name} <span className="font-normal text-ink-4">· {unsourcedCount(c)} unsourced</span></div><div className="truncate text-xs text-ink-3">“{r?.context}” scores 0 until it has a source</div></div>
              </Link>); })}
          </Panel>
        </section>
        <section>
          <SectionHeader title="Needs a refresh" hint={`${failed.length + stale.length + awaiting.length}`} />
          <Panel className="divide-y divide-line-soft">
            {failed.length + stale.length + awaiting.length === 0 && <p className="p-4 text-sm text-ink-3">All research is current.</p>}
            {[...failed.map((c) => ({ c, tone: "bad" as const, label: "Failed", note: c.error ?? "Last run errored" })), ...stale.map((c) => ({ c, tone: "warn" as const, label: `Stale ${daysSince(c.last_updated!)}d`, note: `Last researched ${fmtDate(c.last_updated!)}` })), ...awaiting.map((c) => ({ c, tone: "neutral" as const, label: "Not researched", note: "Added but never researched" }))].slice(0, 8).map(({ c, tone, label, note }) => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                <CompanyLogo name={c.company_name} domain={c.domain} size={28} />
                <Link href={`/accounts/${c.id}`} className="min-w-0 flex-1 hover:underline"><div className="text-[13.5px] font-semibold">{c.company_name}</div><div className="truncate text-xs text-ink-3">{note}</div></Link>
                <StatusPill tone={tone}>{label}</StatusPill><RefreshIcon id={c.id} name={c.company_name} />
              </div>
            ))}
          </Panel>
        </section>
      </div>

      <section>
        <SectionHeader title="Research activity" hint="Every refresh, newest first" />
        <Panel className="p-5">
          {runs.length === 0 ? <p className="text-sm text-ink-3">No runs recorded yet. History starts with the next refresh.</p> : (
            <ol className="relative space-y-4 border-l border-line pl-5">
              {runs.map((r) => {
                const d = r.fit_score != null && r.prev_fit != null && r.fit_score !== r.prev_fit ? r.fit_score - r.prev_fit : 0;
                return (
                  <li key={r.id} className="relative">
                    <span className={`absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-panel ${r.status === "success" ? "bg-good-dot" : "bg-bad"}`} />
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <Link href={`/accounts/${r.company_id}`} className="text-[13.5px] font-semibold hover:underline">{r.company_name}</Link>
                      <StatusPill tone={r.status === "success" ? "good" : "bad"}>{r.status === "success" ? `Fit ${r.fit_score ?? "—"}${d ? ` (${d > 0 ? "+" : ""}${d})` : ""}` : "Failed"}</StatusPill>
                      <span className="font-mono text-[11px] text-ink-4">{fmtDate(r.created_at)} · {relativeTime(r.created_at)}</span>
                    </div>
                    <p className="mt-0.5 text-[13px] text-ink-3">{r.status === "success" ? r.note : r.error}</p>
                    {r.changes.length > 0 && <p className="mt-0.5 text-xs text-accent">{r.changes.join(" · ")}</p>}
                  </li>
                );
              })}
            </ol>
          )}
        </Panel>
      </section>
    </div>
  );
}
