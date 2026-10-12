import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleDashed, Clock, GitCompareArrows, OctagonAlert, PenLine, Target } from "lucide-react";
import { AddCompanyButtons, AddCompanyInline } from "@/components/AddCompany";
import { AutoRefresh } from "@/components/ResearchButton";
import { CompanyLogo } from "@/components/Logos";
import { IcpIndicators } from "@/components/Icp";
import { Banner, Cap, EmptyState, FIT_COLOR, FitBadge, PageHeader, Panel, SectionHeader, StackBar, StatusPill, btnPrimary, btnSecondary } from "@/components/ui";
import { SIGNALS, signalStates, type SignalState } from "@/lib/coverage";
import { dbConfigured, listCompanies, listRuns, type Company, type ResearchRun } from "@/lib/db";
import { FIT_CATEGORIES, STALE_DAYS, fmtDate, hasData, relativeTime, whyLine } from "@/lib/derive";
import { toRow, type AccountRow } from "@/lib/accounts";
import { buildInsights, type InsightKind } from "@/lib/insights";
import { nextRunLabel } from "@/lib/schedule";
import { loadIcp } from "@/lib/settings";

export const dynamic = "force-dynamic";

const KIND: Record<InsightKind, { label: string; tone: string; icon: React.ReactNode }> = {
  opportunity: { label: "Opportunity", tone: "text-good bg-good-bg", icon: <Target className="h-3.5 w-3.5" /> },
  gap: { label: "Research gap", tone: "text-warn bg-warn-bg", icon: <CircleDashed className="h-3.5 w-3.5" /> },
  change: { label: "Change detected", tone: "text-accent bg-chip", icon: <GitCompareArrows className="h-3.5 w-3.5" /> },
  refresh: { label: "Refresh required", tone: "text-warn bg-warn-bg", icon: <Clock className="h-3.5 w-3.5" /> },
  issue: { label: "Research issue", tone: "text-bad bg-bad-bg", icon: <OctagonAlert className="h-3.5 w-3.5" /> },
};
const STATE_COLOR: Record<SignalState, string> = { available: "var(--good-dot)", partial: "var(--warn-line)", missing: "var(--line-ctl)", pending: "var(--chip)" };
const STATE_LABEL: Record<SignalState, string> = { available: "Available", partial: "Partial", missing: "Not found", pending: "Awaiting research" };

function Metric({ label, value, note, href, tone }: { label: string; value: number | string; note: string; href: string; tone?: "bad" | "warn" }) {
  return (
    <Link href={href} className="group rounded-lg px-3 py-2.5 transition-colors hover:bg-raised">
      <div className="text-xs text-ink-3">{label}</div>
      <div className={`mt-0.5 text-2xl font-bold leading-none tracking-[-0.02em] ${tone === "bad" ? "text-bad" : tone === "warn" ? "text-warn" : ""}`}>{value}</div>
      <div className="mt-1 text-[11.5px] text-ink-4 group-hover:text-ink-3">{note}</div>
    </Link>
  );
}

export default async function Overview() {
  if (!dbConfigured()) return <Banner tone="bad">DATABASE_URL is not set. Add your database connection string to the environment and reload.</Banner>;
  await loadIcp();
  let all: Company[] = [];
  let runs: ResearchRun[] = [];
  try {
    [all, runs] = await Promise.all([listCompanies(), listRuns(8).catch(() => [])]);
  } catch (e) {
    return <Banner tone="bad">Could not read accounts: {(e as Error).message}</Banner>;
  }

  if (all.length === 0) {
    return (
      <div>
        <PageHeader title="Overview" subtitle="Your engineering intelligence, ready for the next conversation." />
        <EmptyState title="No accounts yet" >Add a company to gather public signals from its GitHub organization, job boards, engineering blog and website, then see how well it fits your product.</EmptyState>
        <div className="mt-6"><AddCompanyInline /></div>
      </div>
    );
  }

  const byId = new Map(all.map((c) => [c.id, c]));
  const rows = all.map(toRow);
  const researched = rows.filter((r) => r.lastUpdated);
  const icp3 = researched.filter((r) => r.match === 3);
  const icp2 = researched.filter((r) => r.match === 2);
  const complete = rows.filter((r) => r.complete);
  const failed = rows.filter((r) => r.status === "error");
  const stale = rows.filter((r) => r.stale);
  const awaiting = rows.filter((r) => r.lastUpdated == null && r.status !== "researching" && r.status !== "error");
  const attention = rows.filter((r) => r.status !== "researching" && (r.lastUpdated == null || r.status === "error" || r.stale));
  const running = rows.filter((r) => r.status === "researching");
  const lastRun = researched.map((r) => r.lastUpdated!).sort().pop();

  // Ready for your next call: complete, fresh, strong ICP; fall back to the best researched accounts so the list is never empty.
  const score = (r: AccountRow) => r.match * 1000 + (r.fit ?? 0) * 3 + (r.complete ? 50 : 0) + (r.stale ? -500 : 0);
  const ready = [...researched].filter((r) => r.status !== "error").sort((a, b) => score(b) - score(a)).slice(0, 5);

  const total = rows.length;
  const dist = FIT_CATEGORIES.map((c) => ({ ...c, n: rows.filter((r) => r.fitCat === c.key).length }));
  const maxDist = Math.max(1, ...dist.map((d) => d.n));
  const signalSummary = SIGNALS.map((s) => {
    const counts: Record<SignalState, number> = { available: 0, partial: 0, missing: 0, pending: 0 };
    all.forEach((c) => counts[signalStates(c)[s.key]]++);
    return { ...s, counts };
  });
  const insights = buildInsights(all, runs);
  const timeline = runs.length
    ? runs.slice(0, 7).map((r) => ({ key: `r${r.id}`, id: r.company_id, name: r.company_name ?? "", at: r.created_at, ok: r.status === "success", fit: r.fit_score, prev: r.prev_fit, note: r.status === "success" ? r.note : r.error, changes: r.changes }))
    : [...researched].sort((a, b) => +new Date(b.lastUpdated!) - +new Date(a.lastUpdated!)).slice(0, 7).map((r) => ({ key: `c${r.id}`, id: r.id, name: r.name, at: r.lastUpdated!, ok: true, fit: r.fit, prev: null as number | null, note: [r.reposActive != null && `${r.reposActive} repos active`, r.roles != null && `${r.roles} eng roles`].filter(Boolean).join(" · ") || "Research completed", changes: [] as string[] }));

  return (
    <div>
      <AutoRefresh active={running.length > 0} />
      <PageHeader
        title="Overview"
        subtitle="Your engineering intelligence, ready for the next conversation."
        meta={<><span>Last research {lastRun ? relativeTime(lastRun) : "never"}</span><span>Next scheduled refresh {nextRunLabel()}, 06:00 UTC</span>{running.length > 0 && <span className="text-accent">● {running.length} researching now</span>}</>}
        actions={<><Link href="/accounts" className={btnSecondary}>Open watchlist</Link><AddCompanyButtons primary="research" only="research" /></>}
      />

      {failed.length > 0 && (
        <div className="mb-5"><Banner tone="bad" action={<Link href="/research" className="underline underline-offset-2">Review</Link>}>
          {failed.length} account{failed.length > 1 ? "s" : ""} failed the last research run ({failed.slice(0, 3).map((r) => r.name).join(", ")}). Previous data is kept.
        </Banner></div>
      )}

      {/* Summary: one hero metric, supporting metrics stay compact */}
      <Panel className="mb-6 grid divide-y divide-line-soft md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.9fr)] md:divide-x md:divide-y-0">
        <Link href="/accounts?icp=3" className="group p-5 transition-colors hover:bg-raised/40">
          <Cap>Strong ICP matches</Cap>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-[52px] font-extrabold leading-none tracking-[-0.04em] text-accent">{icp3.length}</span>
            <span className="text-sm text-ink-3">of {researched.length} researched</span>
          </div>
          <p className="mt-2 text-[13px] leading-snug text-ink-3">Cloud, microservices <i>and</i> language all evidenced. {icp2.length} more match two of three.</p>
          <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-accent">View matches <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></span>
        </Link>
        <div className="grid grid-cols-2 gap-1 p-2.5 lg:grid-cols-4">
          <Metric label="Monitored accounts" value={total} note={`${researched.length} researched`} href="/accounts" />
          <Metric label="Research complete" value={complete.length} note="4+ of 6 signals found" href="/research" />
          <Metric label="Needs attention" value={attention.length} note={`${failed.length} failed · ${stale.length} stale · ${awaiting.length} new`} href="/accounts?view=needs" tone={attention.length ? "warn" : undefined} />
          <Metric label="Weekly refresh" value={nextRunLabel()} note={running.length ? `${running.length} running now` : `Stale after ${STALE_DAYS} days`} href="/settings" />
        </div>
      </Panel>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          {/* Ready for your next call: the signature section */}
          <section>
            <SectionHeader title="Ready for your next call" hint="Strongest ICP matches with the freshest evidence" action={<Link href="/accounts?view=ready" className="link">All ready accounts</Link>} />
            <div className="space-y-2.5">
              {ready.length === 0 && <EmptyState title="Nothing ready yet">Research a few accounts and the best matches will appear here with the evidence behind them.</EmptyState>}
              {ready.map((r, i) => {
                const c = byId.get(r.id)!;
                return (
                  <article key={r.id} className={`group rounded-xl border bg-panel p-4 shadow-card transition-colors hover:border-line-ctl ${i === 0 ? "border-accent/50 bg-gradient-to-br from-panel to-raised" : "border-line"}`}>
                    <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
                      <CompanyLogo name={r.name} domain={r.domain} size={38} />
                      <div className="min-w-0 flex-1 basis-[260px]">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <Link href={`/accounts/${r.id}`} className="text-[15px] font-semibold hover:underline">{r.name}</Link>
                          <IcpIndicators checks={r.checks} />
                        </div>
                        <p className="mt-1.5 text-[13px] leading-snug text-ink-2">{whyLine(c)}</p>
                        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-4">
                          {r.stale ? <Clock className="h-3 w-3 text-warn" /> : <CheckCircle2 className="h-3 w-3 text-good" />}
                          Researched {relativeTime(r.lastUpdated)}{r.stale ? ` · older than ${STALE_DAYS} days` : ""}{!r.complete && <span className="text-warn"> · thin evidence ({r.available}/6 signals)</span>}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2.5">
                        <FitBadge score={r.fit} showLabel />
                        <div className="flex gap-1.5">
                          <Link href={`/accounts/${r.id}`} className={btnSecondary}>Open intelligence</Link>
                          <Link href={`/outreach?company=${r.id}`} className={btnPrimary}><PenLine className="h-3.5 w-3.5" /> Prepare outreach</Link>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section>
            <SectionHeader title="Insights" hint="Computed from your accounts and research history" />
            <Panel className="divide-y divide-line-soft">
              {insights.length === 0 && <div className="p-5 text-sm text-ink-3">Nothing needs your attention right now.</div>}
              {insights.map((i, idx) => (
                <div key={idx} className="flex gap-3 p-4">
                  <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg ${KIND[i.kind].tone}`} aria-hidden>{KIND[i.kind].icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-cap">{KIND[i.kind].label}</span>
                      <Link href={`/accounts/${i.company.id}`} className="text-[13px] font-semibold hover:underline">{i.company.name}</Link>
                    </div>
                    <div className="mt-0.5 text-sm font-medium">{i.title}</div>
                    <p className="mt-0.5 text-[13px] leading-snug text-ink-3">{i.body}</p>
                    {i.evidence && <p className="mt-1 text-xs text-ink-4">{i.evidence}</p>}
                  </div>
                  <Link href={i.action.href} className="shrink-0 self-center whitespace-nowrap text-[13px] font-medium text-accent hover:underline">{i.action.label} →</Link>
                </div>
              ))}
            </Panel>
          </section>
        </div>

        <div className="min-w-0 space-y-6">
          <section>
            <SectionHeader title="Fit distribution" hint={`${total} accounts`} />
            <Panel className="p-4">
              <ul className="space-y-1">
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
              <div className="mt-3 border-t border-line-soft pt-3"><StackBar parts={dist.map((d) => ({ value: d.n, color: FIT_COLOR[d.key], label: d.label }))} height={6} /></div>
            </Panel>
          </section>

          <section>
            <SectionHeader title="Research signal coverage" action={<Link href="/research" className="link">Full matrix</Link>} />
            <Panel className="p-4">
              <ul className="space-y-3">
                {signalSummary.map((s) => (
                  <li key={s.key} title={s.hint}>
                    <div className="mb-1 flex items-baseline justify-between text-[13px]">
                      <span className="font-medium">{s.short}</span>
                      <span className="font-mono text-[11px] text-ink-3">{s.counts.available}{s.counts.partial ? `+${s.counts.partial}` : ""} / {total}</span>
                    </div>
                    <StackBar height={6} parts={(Object.keys(s.counts) as SignalState[]).map((k) => ({ value: s.counts[k], color: STATE_COLOR[k], label: STATE_LABEL[k] }))} />
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 border-t border-line-soft pt-3 text-[11px] text-ink-3">
                {(Object.keys(STATE_COLOR) as SignalState[]).map((k) => (
                  <span key={k} className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: STATE_COLOR[k] }} />{STATE_LABEL[k]}</span>
                ))}
              </div>
              <p className="mt-2 text-[11px] leading-snug text-ink-4">“Not found” means we found nothing public. It does not prove the company lacks it.</p>
            </Panel>
          </section>

          <section>
            <SectionHeader title="Recent research activity" action={<Link href="/research" className="link">All activity</Link>} />
            <Panel className="p-4">
              <ol className="relative space-y-4 border-l border-line pl-4">
                {timeline.map((t) => {
                  const delta = t.fit != null && t.prev != null && t.fit !== t.prev ? t.fit - t.prev : 0;
                  return (
                    <li key={t.key} className="relative">
                      <span className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-panel ${t.ok ? "bg-good-dot" : "bg-bad"}`} />
                      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                        <Link href={`/accounts/${t.id}`} className="text-[13px] font-semibold hover:underline">{t.name}</Link>
                        <span className="font-mono text-[11px] text-ink-4" title={fmtDate(t.at)}>{relativeTime(t.at)}</span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12.5px] text-ink-3">
                        {t.ok ? <StatusPill tone="good" icon={false}>Fit {t.fit ?? "—"}{delta ? ` (${delta > 0 ? "+" : ""}${delta})` : ""}</StatusPill> : <StatusPill tone="bad">Failed</StatusPill>}
                        <span className="min-w-0 truncate">{t.note}</span>
                      </div>
                      {t.changes.length > 0 && <div className="mt-1 text-xs text-accent">{t.changes.join(" · ")}</div>}
                    </li>
                  );
                })}
              </ol>
              {!runs.length && <p className="mt-3 text-[11px] text-ink-4">Per-run history starts with the next refresh; showing each account&apos;s latest result until then.</p>}
            </Panel>
          </section>
        </div>
      </div>
    </div>
  );
}
