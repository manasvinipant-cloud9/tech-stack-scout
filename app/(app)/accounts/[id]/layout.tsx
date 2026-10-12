import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import AccountTabs from "@/components/AccountTabs";
import { ChecklistStrip } from "@/components/Checklist";
import { checklist } from "@/lib/checklist";
import { AutoRefresh, ResearchButton } from "@/components/ResearchButton";
import { Banner, Cap, FitNumber } from "@/components/ui";
import { getAccount } from "@/lib/account";
import { listNotes } from "@/lib/db";
import { daysSince, fmtDate, fmtDateYear, hasData, isStale } from "@/lib/derive";
import { productName } from "@/lib/product";

export const dynamic = "force-dynamic";

export default async function AccountLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const c = await getAccount(id);
  if (!c) notFound();
  const notes = await listNotes(id);

  const researching = c.status === "researching";
  const g = c.signals?.github;
  const desc = c.signals?.site?.description ?? c.signals?.site?.title ?? null;

  const meta: [string, string][] = [
    ["Public repos", g ? String(g.publicRepos) : "—"],
    ["Active 90d", g ? String(g.reposPushedLast90d) : "—"],
    ["Eng roles", c.hiring_roles != null ? String(c.hiring_roles) : "—"],
    ["Activity", c.activity_level ?? "—"],
    ["Researched", c.last_updated ? fmtDateYear(c.last_updated) : "Never"],
  ];

  return (
    <div>
      <AutoRefresh active={researching} />
      <nav className="mb-5 flex items-center gap-1.5 text-[13px] text-ink-4">
        <Link href="/accounts" className="hover:text-ink">Accounts</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-ink">{c.company_name}</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-[44px] font-extrabold leading-none tracking-[-0.04em]">{c.company_name}</h1>
          <p className="mt-3 text-[15px] text-ink-2">
            {desc && <>{desc.slice(0, 140)} · </>}
            <a className="link" href={`https://${c.domain}`} target="_blank" rel="noreferrer">{c.domain}</a>
            {c.github_org && <> · <a className="link" href={`https://github.com/${c.github_org}`} target="_blank" rel="noreferrer">github.com/{c.github_org}</a></>}
          </p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
            {meta.map(([k, v]) => (
              <span key={k} className="whitespace-nowrap"><span className="text-ink-4">{k}</span> <span className="font-semibold">{v}</span></span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-right">
            <FitNumber n={c.fit_score} size="lg" />
            <div className="mt-1 text-[11px] uppercase tracking-[0.08em] text-ink-3">Fit with {productName()}</div>
          </div>
          <ResearchButton id={c.id} primary />
        </div>
      </div>

      {hasData(c) && !researching && <div className="mt-5"><ChecklistStrip checks={checklist(c)} /></div>}

      <div className="mt-6">
        <AccountTabs id={c.id} counts={{ stack: c.analysis?.technologies.length ?? 0, notes: notes.length }} />
        <div className="rounded-b-[18px] rounded-tr-[18px] border border-line bg-panel p-4 sm:p-6">
          {researching ? (
            <div>
              <Cap>Researching · GitHub · website · job boards · fit analysis</Cap>
              <div className="mt-5 space-y-4">
                {[60, 85, 45, 70, 55].map((w, i) => <div key={i} className="skel h-3" style={{ width: `${w}%` }} />)}
              </div>
              <p className="mt-6 text-sm text-ink-3">This takes about 20–40 seconds. The page updates by itself.</p>
            </div>
          ) : !hasData(c) ? (
            <div className="space-y-4">
              {c.status === "error" && c.error && <Banner tone="bad">Last run failed: {c.error}</Banner>}
              <h2 className="text-[28px] font-bold tracking-[-0.02em]">Not researched</h2>
              <p className="max-w-xl text-sm text-ink-3">
                Collects public signals from {c.domain}, its GitHub org and job boards, maps the stack, and scores fit with your product.
              </p>
              <ResearchButton id={c.id} label="Run research" primary />
            </div>
          ) : (
            <div className="space-y-4">
              {c.status === "error" && (
                <Banner tone="bad" action={<ResearchButton id={c.id} label="Retry" className="[&_button]:h-auto [&_button]:border-0 [&_button]:p-0 [&_button]:underline" />}>
                  Last run failed: {c.error ?? "unknown error"}. Showing data from {fmtDate(c.last_updated!)}.
                </Banner>
              )}
              {isStale(c) && <Banner tone="warn">Researched {daysSince(c.last_updated!)} days ago. The weekly refresh runs Mondays 06:00 UTC, or re-research now.</Banner>}
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
