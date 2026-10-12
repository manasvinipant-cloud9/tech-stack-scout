import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, ExternalLink, FileText, PenLine } from "lucide-react";
import AccountContextNav from "@/components/AccountContextNav";
import AccountTabs from "@/components/AccountTabs";
import { IcpIndicators } from "@/components/Icp";
import { CompanyLogo } from "@/components/Logos";
import { RemoveCompany } from "@/components/RemoveCompany";
import { AutoRefresh, ResearchButton } from "@/components/ResearchButton";
import { Banner, Cap, FitBadge, StatusPill, btnPrimary, btnSecondary } from "@/components/ui";
import { getAccount } from "@/lib/account";
import { checklist } from "@/lib/checklist";
import { FIT_CATEGORIES, staleDays, daysSince, fitCategory, fmtDate, hasData, isStale, relativeTime } from "@/lib/derive";
import { listNotes } from "@/lib/db";
import { nextRunLabel } from "@/lib/schedule";
import { loadIcp } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function AccountLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  await loadIcp();
  const c = await getAccount(id);
  if (!c) notFound();
  const notes = await listNotes(id);
  const researching = c.status === "researching";
  const researched = hasData(c);
  const stale = isStale(c);
  const cat = FIT_CATEGORIES.find((x) => x.key === fitCategory(c.fit_score))!;
  const g = c.signals?.github;

  return (
    <div>
      <AutoRefresh active={researching} />
      <AccountContextNav id={c.id} name={c.company_name} />

      <header className="rounded-xl border border-line bg-panel p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-5">
          <div className="flex min-w-0 flex-1 basis-[420px] items-start gap-4">
            <CompanyLogo name={c.company_name} domain={c.domain} size={56} />
            <div className="min-w-0">
              <h1 className="text-[28px] font-bold leading-none tracking-[-0.03em]">{c.company_name}</h1>
              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-3">
                <a className="inline-flex items-center gap-1 hover:text-accent" href={`https://${c.domain}`} target="_blank" rel="noreferrer">{c.domain}<ExternalLink className="h-3 w-3" /></a>
                {g && <a className="inline-flex items-center gap-1 hover:text-accent" href={g.url} target="_blank" rel="noreferrer">github.com/{g.org}<ExternalLink className="h-3 w-3" /></a>}
              </p>
              {researched && !researching && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <IcpIndicators checks={checklist(c)} />
                  <StatusPill tone={stale ? "warn" : "good"}>{stale ? `Stale · ${daysSince(c.last_updated!)} days old` : `Researched ${relativeTime(c.last_updated)}`}</StatusPill>
                  <span className="text-xs text-ink-4">Next refresh {nextRunLabel()}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-start gap-6">
            {researched && (
              <div>
                <Cap>Fit</Cap>
                <div className="mt-1"><FitBadge score={c.fit_score} size="lg" /></div>
                <div className="mt-1 text-[12px] font-medium text-ink-3">{cat.label}{c.fit_score != null ? ` · ${cat.range}` : ""}</div>
              </div>
            )}
            <div className="flex flex-col gap-2">
              {researched && !researching && <Link href={`/outreach?company=${c.id}`} className={btnPrimary}><PenLine className="h-3.5 w-3.5" /> Prepare outreach</Link>}
              <div className="flex gap-2">
                <ResearchButton id={c.id} name={c.company_name} label={researched ? "Refresh research" : "Run research"} primary={!researched} />
                {researched && !researching && <Link href={`/brief/${c.id}`} className={btnSecondary} aria-label="Open call brief"><FileText className="h-3.5 w-3.5" /> Brief</Link>}
                <RemoveCompany id={c.id} name={c.company_name} redirect="/accounts" variant="ghost" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mt-5"><AccountTabs id={c.id} notes={notes.length} /></div>

      <div className="mt-5">
        {researching ? (
          <div className="rounded-xl border border-line bg-panel p-6">
            <Cap>Researching · GitHub · website · job boards · engineering blog · fit analysis</Cap>
            <div className="mt-5 space-y-3.5">{[62, 88, 48, 74, 56].map((w, i) => <div key={i} className="skel h-3" style={{ width: `${w}%` }} />)}</div>
            <p className="mt-5 text-sm text-ink-3">This takes about 20 seconds. The page updates by itself.</p>
          </div>
        ) : !researched ? (
          <div className="space-y-4 rounded-xl border border-dashed p-8 text-center" style={{ borderColor: "var(--line-ctl)" }}>
            {c.status === "error" && c.error && <Banner tone="bad">Last run failed: {c.error}</Banner>}
            <h2 className="text-lg font-semibold">Not researched yet</h2>
            <p className="mx-auto max-w-md text-sm text-ink-3">Collects public signals from {c.domain}, its GitHub organization, job boards and engineering blog, then scores fit with your product.</p>
            <div className="flex justify-center"><ResearchButton id={c.id} name={c.company_name} label="Run research" primary /></div>
          </div>
        ) : (
          <div className="space-y-4">
            {c.status === "error" && (
              <Banner tone="bad">Last refresh failed: {c.error ?? "unknown error"} Showing data from {fmtDate(c.last_updated!)}.</Banner>
            )}
            {stale && <Banner tone="warn">Research is {daysSince(c.last_updated!)} days old (stale after {staleDays()}). The weekly refresh runs {nextRunLabel()}, or refresh now.</Banner>}
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
