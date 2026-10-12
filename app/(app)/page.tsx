import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleAlert, Clock, GitCompareArrows, Newspaper, OctagonAlert, PenLine, RefreshCw, Target } from "lucide-react";
import { AddCompanyButtons } from "@/components/AddCompany";
import { IcpIndicators } from "@/components/Icp";
import { CompanyLogo } from "@/components/Logos";
import { AutoRefresh } from "@/components/ResearchButton";
import { Banner, Cap, EmptyState, FIT_COLOR, FitBadge, PageHeader, Panel, SectionHeader, StackBar, StatusPill, btnPrimary, btnSecondary } from "@/components/ui";
import { toRow } from "@/lib/accounts";
import { actionLabel, buildNextActions, type ActionKind } from "@/lib/actions";
import { SIGNALS, signalStates, type SignalState } from "@/lib/coverage";
import { dbConfigured, listCompanies, listRuns, type Company, type ResearchRun } from "@/lib/db";
import { FIT_CATEGORIES, fmtDate, relativeTime, staleDays } from "@/lib/derive";
import { buildInsights, type InsightKind } from "@/lib/insights";
import { nextRunLabel } from "@/lib/schedule";
import { loadSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const INSIGHT: Record<InsightKind, { label: string; tone: string; icon: React.ReactNode }> = {
  opportunity: { label: "Opportunity", tone: "text-good bg-good-bg", icon: <Target className="h-3.5 w-3.5" /> },
  change: { label: "Change detected", tone: "text-accent bg-chip", icon: <GitCompareArrows className="h-3.5 w-3.5" /> },
  signal: { label: "New engineering signal", tone: "text-accent bg-chip", icon: <Newspaper className="h-3.5 w-3.5" /> },
  issue: { label: "Research failure", tone: "text-bad bg-bad-bg", icon: <OctagonAlert className="h-3.5 w-3.5" /> },
};
const KIND_TONE: Record<ActionKind, "good" | "warn" | "bad" | "neutral"> = { outreach: "good", evidence: "warn", review: "warn", refresh: "neutral" };
const STATE: Record<SignalState, { color: string; label: string }> = {
  available: { color: "var(--good-dot)", label: "Evidence found" },
  partial: { color: "var(--warn-line)", label: "Partial evidence" },
  missing: { color: "var(--line-ctl)", label: "No evidence found" },
  pending: { color: "var(--chip)", label: "Not researched" },
  failed: { color: "var(--bad)", label: "Research failed" },
};

function Metric({ label, value, note, href, tone }: { label: string; value: number | string; note: string; href: string; tone?: "warn" }) {
  return (
    <Link href={href} className="group rounded-lg px-3 py-2.5 transition-colors hover:bg-raised">
      <div className="text-xs text-ink-3">{label}</div>
      <div className={`mt-0.5 text-2xl font-bold leading-none tracking-[-0.02em] ${tone === "warn" ? "text-warn" : ""}`}>{value}</div>
      <div className="mt-1 text-[11.5px] text-ink-4 group-hover:text-ink-3">{note}</div>
    </Link>
  );
}

export default async function Overview() {
  if (!dbConfigured()) return <Banner tone="bad">DATABASE_URL is not set. Add your database connection string to the environment and reload.</Banner>;
  await loadSettings();
  let all: Company[] = [];
  let runs: ResearchRun[] = [];
  try {
    [all, runs] = await Promise.all([listCompanies(), listRuns(40).catch(() => [])]);
  } catch (e) {
    return <Banner tone="bad">Could not read accounts: {(e as Error).message}</Banner>;
  }

  if (all.length === 0) {
    return (
      <div>
        <PageHeader title="Overview" subtitle="Your engineering intelligence, ready for the next conversation." />
        <EmptyState title="No accounts yet" action={<div className="flex gap-2"><AddCompanyButtons primary="research" /></div>}>Add a company to gather public signals from its GitHub organization, job boards, engineering blog and website, then see how well it fits your product.</EmptyState>
      </div>
    );
  }

  const rows = all.map(toRow);
  const researched = rows.filter((r) => r.lastUpdated);
  const lvl = [3, 2, 1, 0].map((n) => ({ n, count: researched.filter((r) => r.match === n).length }));
  const complete = rows.filter((r) => r.complete);
  const failed = rows.filter((r) => r.status === "error");
  const stale = rows.filter((r) => r.stale);
  const awaiting = rows.filter((r) => r.lastUpdated == null && r.status !== "researching" && r.status !== "error");
  const attention = rows.filter((r) => r.status !== "researching" && (r.lastUpdated == null || r.status === "error" || r.stale));
  const running = rows.filter((r) => r.status === "researching");
  const lastRun = researched.map((r) => r.lastUpdated!).sort().pop();

  const actions = buildNextActions(all, 6);
  const total = rows.length;
  const dist = FIT_CATEGORIES.map((c) => ({ ...c, n: rows.filter((r) => r.fitCat === c.key).length }));
  const maxDist = Math.max(1, ...dist.map((d) => d.n));
  const signals = SIGNALS.map((s) => {
    const counts: Record<SignalState, number> = { available: 0, partial: 0, missing: 0, pending: 0, failed: 0 };
    all.forEach((c) => counts[signalStates(c)[s.key]]++);
    return { ...s, counts };
  });
  const insights = buildInsights(all, runs, 6, new Set(actions.map((a) => a.row.id)));
  const timeline = runs.length
    ? runs.slice(0, 6).map((r) => ({ key: `r${r.id}`, id: r.company_id, name: r.company_name ?? "", at: r.created_at, ok: r.status === "success", fit: r.fit_score, prev: r.prev_fit, note: r.status === "success" ? r.note : r.error, changes: r.changes }))
    : [...researched].sort((a, b) => +new Date(b.lastUpdated!) - +new Date(a.lastUpdated!)).slice(0, 6).map((r) => ({ key: `c${r.id}`, id: r.id, name: r.name, at: r.lastUpdated!, ok: true, fit: r.fit, prev: null as number | null, note: [r.reposActive != null && `${r.reposActive} repos active`, r.roles != null && `${r.roles} eng roles`].filter(Boolean).join(" · ") || "Research completed", changes: [] as string[] }));

  return (
    <div>
      <AutoRefresh active={running.length > 0} />
      <PageHeader
        title="Overview"
        subtitle="Your engineering intelligence, ready for the next conversation."
        meta={<><span>Last research {lastRun ? relativeTime(lastRun) : "never"}</span><span>Next scheduled refresh {nextRunLabel()}, 06:00 UTC</span>{running.length > 0 && <span className="text-accent">● {running.length} researching now</span>}</>}
        actions={<><Link href="/accounts" className={btnSecondary}>View accounts</Link><AddCompanyButtons primary="research" only="research" /></>}
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-12">
        {/* Tile 1: the hero metric, with the ICP depth behind it */}
        <Panel className="relative overflow-hidden p-5 xl:col-span-5">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-accent/10 blur-3xl" aria-hidden />
          <Cap>Strong ICP matches</Cap>
          <div className="mt-2 flex items-baseline gap-2">
            <Link href="/accounts?icp=3" className="text-[56px] font-extrabold leading-none tracking-[-0.04em] text-accent hover:underline">{lvl[0].count}</Link>
            <span className="text-sm text-ink-3">of {researched.length} researched match cloud, microservices and language</span>
          </div>
          <div className="mt-4"><StackBar height={8} parts={lvl.map((l, i) => ({ value: l.count, label: l.n === 0 ? "none of three" : `${l.n} of 3`, color: ["var(--good-dot)", "#7fb8a0", "var(--warn-line)", "var(--line-ctl)"][i] }))} /></div>
          <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-3">
            {lvl.map((l, i) => (
              <li key={l.n}><Link href={`/accounts?icp=${l.n === 3 ? "3" : l.n === 2 ? "e2" : l.n === 1 ? "e1" : "0"}`} className="inline-flex items-center gap-1.5 hover:text-ink"><span className="h-2 w-2 rounded-sm" style={{ background: ["var(--good-dot)", "#7fb8a0", "var(--warn-line)", "var(--line-ctl)"][i] }} />{l.n === 0 ? "None" : `${l.n} of 3`} <b className="text-ink">{l.count}</b></Link></li>
            ))}
          </ul>
        </Panel>

        {/* Tile 2: supporting metrics */}
        <Panel className="grid grid-cols-2 gap-1 p-2.5 xl:col-span-7 xl:grid-cols-4">
          <Metric label="Monitored accounts" value={total} note={`${researched.length} researched`} href="/accounts" />
          <Metric label="Research complete" value={complete.length} note="4+ of 6 signals found" href="/research" />
          <Metric label="Needs attention" value={attention.length} note={`${failed.length} failed · ${stale.length} stale · ${awaiting.length} new`} href="/accounts?view=needs" tone={attention.length ? "warn" : undefined} />
          <Metric label="Weekly refresh" value={nextRunLabel()} note={running.length ? `${running.length} running now` : `Stale after ${staleDays()} days`} href="/settings" />
        </Panel>

        {/* Tile 3: the work queue (the main focal area) */}
        <div className="min-w-0 space-y-6 xl:col-span-8">
        <section>
          <SectionHeader title="Recommended next actions" hint="What to do next, and why" action={<Link href="/accounts?view=ready" className="link">Ready accounts</Link>} />
          <div className="space-y-2.5">
            {actions.length === 0 && <EmptyState title="Nothing to do right now">Every account is researched, current and sourced.</EmptyState>}
            {actions.map((a, i) => (
              <article key={`${a.kind}-${a.row.id}`} className={`rounded-xl border bg-panel p-4 shadow-card transition-colors hover:border-line-ctl ${i === 0 ? "border-accent/50 bg-gradient-to-br from-panel to-raised" : "border-line"}`}>
                <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
                  <CompanyLogo name={a.row.name} domain={a.row.domain} size={38} />
                  <div className="min-w-0 flex-1 basis-[260px]">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <Link href={`/accounts/${a.row.id}`} className="text-[15px] font-semibold hover:underline">{a.row.name}</Link>
                      <StatusPill tone={KIND_TONE[a.kind]} icon={false}>{actionLabel(a.kind)}</StatusPill>
                    </div>
                    {a.row.checks.length > 0 && <div className="mt-1.5"><IcpIndicators checks={a.row.checks} /></div>}
                    <p className="mt-2 text-[13px] leading-snug text-ink-2">{a.reason}</p>
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-4">{a.row.stale || a.row.status === "error" ? <Clock className="h-3 w-3 text-warn" /> : <CheckCircle2 className="h-3 w-3 text-good" />}{a.freshness}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2.5">
                    {a.row.fit != null && <FitBadge score={a.row.fit} showLabel />}
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {a.secondary && <Link href={a.secondary.href} className={btnSecondary}>{a.secondary.label}</Link>}
                      <Link href={a.cta.href} className={a.kind === "outreach" ? btnPrimary : btnSecondary}>{a.kind === "outreach" ? <PenLine className="h-3.5 w-3.5" /> : a.kind === "refresh" ? <RefreshCw className="h-3.5 w-3.5" /> : <CircleAlert className="h-3.5 w-3.5" />}{a.cta.label}</Link>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Tile 6: what changed */}
        <section>
          <SectionHeader title="What changed" hint="New signals and score movement from your research" />
          <Panel className="divide-y divide-line-soft">
            {insights.length === 0 && <p className="p-5 text-sm text-ink-3">No changes yet. Movements appear after the next weekly refresh, and new engineering posts appear as they are published.</p>}
            {insights.map((i, idx) => (
              <div key={idx} className="flex gap-3 p-4">
                <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg ${INSIGHT[i.kind].tone}`} aria-hidden>{INSIGHT[i.kind].icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2"><span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-cap">{INSIGHT[i.kind].label}</span><Link href={`/accounts/${i.company.id}`} className="text-[13px] font-semibold hover:underline">{i.company.name}</Link></div>
                  <div className="mt-0.5 text-sm font-medium">{i.title}</div>
                  <p className="mt-0.5 text-[13px] leading-snug text-ink-3">{i.body}</p>
                  {i.evidence && <p className="mt-1 text-xs text-ink-4">{i.evidence}</p>}
                </div>
                <Link href={i.action.href} className="shrink-0 self-center whitespace-nowrap text-[13px] font-medium text-accent hover:underline">{i.action.label} <ArrowRight className="inline h-3 w-3" /></Link>
              </div>
            ))}
          </Panel>
        </section>
        </div>

        {/* Right column: fit distribution + signal coverage */}
        <div className="space-y-4 xl:col-span-4">
        {/* Tile 4: fit distribution */}
        <section>
          <SectionHeader title="Fit distribution" hint={`${total} accounts`} />
          <Panel className="p-4">
            <ul className="space-y-0.5">
              {dist.map((d) => (
                <li key={d.key}>
                  <Link href={`/accounts?fit=${d.key}`} className="group grid grid-cols-[132px_1fr_28px] items-center gap-3 rounded-md px-1.5 py-1.5 transition-colors hover:bg-raised" aria-label={`${d.label} ${d.range}: ${d.n} accounts`}>
                    <span className="text-[13px]"><span className="font-medium">{d.label}</span> <span className="font-mono text-[10.5px] text-ink-4">{d.range}</span></span>
                    <span className="h-2.5 rounded-full bg-chip"><span className="block h-2.5 rounded-full" style={{ width: d.n ? `${Math.max(4, (d.n / maxDist) * 100)}%` : 0, background: FIT_COLOR[d.key] }} /></span>
                    <span className="text-right text-sm font-semibold">{d.n}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        </section>

        {/* Tile 5: signal coverage */}
        <section>
          <SectionHeader title="Signal coverage" action={<Link href="/research" className="link">Full matrix</Link>} />
          <Panel className="p-4">
            <ul className="space-y-2.5">
              {signals.map((s) => (
                <li key={s.key} title={s.hint}>
                  <div className="mb-1 flex items-baseline justify-between text-[13px]"><span className="font-medium">{s.short}</span><span className="font-mono text-[11px] text-ink-3">{s.counts.available} found{s.counts.partial ? ` · ${s.counts.partial} partial` : ""} / {total}</span></div>
                  <StackBar height={6} parts={(Object.keys(STATE) as SignalState[]).map((k) => ({ value: s.counts[k], color: STATE[k].color, label: STATE[k].label }))} />
                </li>
              ))}
            </ul>
            <div className="mt-3.5 flex flex-wrap gap-x-3 gap-y-1 border-t border-line-soft pt-3 text-[11px] text-ink-3">
              {(Object.keys(STATE) as SignalState[]).map((k) => <span key={k} className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: STATE[k].color }} />{STATE[k].label}</span>)}
            </div>
            <p className="mt-2 text-[11px] leading-snug text-ink-4">“No evidence found” means nothing public turned up. It does not prove the company lacks it.</p>
          </Panel>
        </section>

        

        {/* Tile 7: research timeline */}
        <section>
          <SectionHeader title="Recent research" action={<Link href="/research" className="link">All activity</Link>} />
          <Panel className="p-4">
            <ol className="relative space-y-4 border-l border-line pl-4">
              {timeline.map((t) => {
                const delta = t.fit != null && t.prev != null && t.fit !== t.prev ? t.fit - t.prev : 0;
                return (
                  <li key={t.key} className="relative">
                    <span className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-panel ${t.ok ? "bg-good-dot" : "bg-bad"}`} />
                    <div className="flex flex-wrap items-baseline justify-between gap-x-2"><Link href={`/accounts/${t.id}`} className="text-[13px] font-semibold hover:underline">{t.name}</Link><span className="font-mono text-[11px] text-ink-4" title={fmtDate(t.at)}>{relativeTime(t.at)}</span></div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12.5px] text-ink-3">
                      {t.ok ? <StatusPill tone="good" icon={false}>Fit {t.fit ?? "—"}{delta ? ` (${delta > 0 ? "+" : ""}${delta})` : ""}</StatusPill> : <StatusPill tone="bad">Failed</StatusPill>}
                      <span className="min-w-0 truncate">{t.note}</span>
                    </div>
                    {t.changes.length > 0 && <div className="mt-1 text-xs text-accent">{t.changes.join(" · ")}</div>}
                  </li>
                );
              })}
            </ol>
            {!runs.length && <p className="mt-3 text-[11px] text-ink-4">Per-run history starts with the next refresh. Until then this shows each account&apos;s latest result.</p>}
          </Panel>
        </section>
        </div>
      </div>
    </div>
  );
}
