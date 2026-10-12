import Link from "next/link";
import { PenLine } from "lucide-react";
import CompanyPicker from "@/components/CompanyPicker";
import { IcpIndicators } from "@/components/Icp";
import { CompanyLogo, TechLogo } from "@/components/Logos";
import OpeningLine from "@/components/OpeningLine";
import { SourceChip } from "@/components/SourceChip";
import { ResearchButton } from "@/components/ResearchButton";
import { Banner, EmptyState, FitBadge, PageHeader, Panel, SectionHeader } from "@/components/ui";
import { toRow } from "@/lib/accounts";
import { dbConfigured, listCompanies } from "@/lib/db";
import { fmtDate, isStale, relativeTime, sourceLinks } from "@/lib/derive";
import { loadIcp } from "@/lib/settings";
import type { Source } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function OutreachStudio({ searchParams }: { searchParams: Promise<{ company?: string }> }) {
  if (!dbConfigured()) return <Banner tone="bad">DATABASE_URL is not set.</Banner>;
  await loadIcp();
  const all = await listCompanies();
  const rows = all.map(toRow).sort((a, b) => b.match - a.match || (b.fit ?? -1) - (a.fit ?? -1));
  const asked = Number((await searchParams).company);
  const c = all.find((x) => x.id === asked) ?? all.find((x) => x.id === rows.find((r) => r.lastUpdated)?.id) ?? null;

  if (!c) return <div><PageHeader title="Outreach Studio" subtitle="Turn engineering evidence into a relevant first line." /><EmptyState title="Add a company to begin">Outreach lines are built from a company&apos;s public engineering signals, so research an account first.</EmptyState></div>;

  const a = c.analysis;
  const links = sourceLinks(c);
  const linkMap = Object.fromEntries(links.map((l) => [l.key, l.url])) as Partial<Record<Source, string>>;
  const g = c.signals?.github, j = c.signals?.jobs, b = c.signals?.blog;
  const techs = (a?.technologies ?? []).filter((t) => t.status === "confirmed").slice(0, 9);
  const row = toRow(c);

  // Candidate observations the line could be built on, each with its source.
  const candidates: { text: string; source: Source }[] = [
    ...(g ? [{ text: `${g.reposPushedLast90d} of ${g.publicRepos} public repositories were pushed to in the last 90 days`, source: "github" as Source }] : []),
    ...(g?.recentRepos[0] ? [{ text: `Most recent push: ${g.recentRepos[0].name}${g.recentRepos[0].language ? ` (${g.recentRepos[0].language})` : ""}, ${fmtDate(g.recentRepos[0].pushed_at)}`, source: "github" as Source }] : []),
    ...(j ? [{ text: `${j.engineeringOpen} open engineering roles${j.sampleTitles[0] ? `, e.g. “${j.sampleTitles[0]}”` : ""}`, source: "jobs" as Source }] : []),
    ...(j?.toolMentions[0] ? [{ text: `${j.toolMentions[0].name} is named in ${j.toolMentions[0].postings} of ${j.descriptionsScanned} job descriptions`, source: "jobs" as Source }] : []),
    ...(b?.posts[0] ? [{ text: `Recent engineering blog post: “${b.posts[0].title}”${b.posts[0].date ? `, ${fmtDate(b.posts[0].date)}` : ""}`, source: "blog" as Source }] : []),
    ...(a?.architecture && a.architecture.style !== "unknown" ? [{ text: `Architecture: ${a.architecture.style}. ${a.architecture.evidence}`, source: a.architecture.source }] : []),
  ];

  return (
    <div>
      <PageHeader title="Outreach Studio" subtitle="Pick a company, review its engineering context, and use an opening line built on one verified signal." />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-20 lg:self-start">
          <div className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.08em] text-cap">1 · Choose a company</div>
          <CompanyPicker rows={rows} selected={c.id} />
        </div>

        <div className="min-w-0 space-y-6">
          <Panel className="flex flex-wrap items-center gap-4 p-4">
            <CompanyLogo name={c.company_name} domain={c.domain} size={44} />
            <div className="min-w-0 flex-1">
              <Link href={`/accounts/${c.id}`} className="text-lg font-semibold hover:underline">{c.company_name}</Link>
              <div className="mt-1.5 flex flex-wrap items-center gap-3"><IcpIndicators checks={row.checks} /><span className="text-xs text-ink-4">Researched {relativeTime(c.last_updated)}{isStale(c) ? " · stale" : ""}</span></div>
            </div>
            <FitBadge score={c.fit_score} size="lg" showLabel />
          </Panel>

          {!c.last_updated ? (
            <EmptyState title={`${c.company_name} hasn't been researched`} action={<ResearchButton id={c.id} name={c.company_name} label="Run research" primary />}>An opening line needs verified engineering signals to build on.</EmptyState>
          ) : (
            <>
              <section>
                <SectionHeader title="2 · Review the engineering context" />
                <Panel className="p-4">
                  <div className="flex flex-wrap gap-2">
                    {techs.length ? techs.map((t) => <span key={t.name} className="inline-flex h-7 items-center gap-1.5 rounded-md bg-chip px-2 text-[12.5px]"><TechLogo name={t.name} size={13} />{t.name}</span>) : <span className="text-sm text-ink-3">No directly confirmed technologies yet.</span>}
                  </div>
                  <div className="mt-4 border-t border-line-soft pt-3">
                    <div className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.08em] text-cap">Observations you could build on</div>
                    {candidates.length === 0 ? <p className="text-sm text-ink-3">No verified observations were found for this company.</p> : (
                      <ul className="space-y-2">{candidates.map((o, i) => <li key={i} className="flex flex-wrap items-start justify-between gap-2 text-[13px]"><span className="min-w-0 flex-1 basis-[280px] text-ink-2">{o.text}</span><SourceChip source={o.source} url={linkMap[o.source]} /></li>)}</ul>
                    )}
                  </div>
                </Panel>
              </section>

              <section>
                <SectionHeader title="3 · Your opening line" hint="Regenerate for a different angle, then copy" />
                <Panel className="p-5"><OpeningLine id={c.id} line={c.outreach_hook} signal={a?.hook?.signal ?? null} source={(a?.hook?.source as Source) ?? null} links={linkMap} /></Panel>
              </section>

              <p className="flex items-center gap-2 text-xs text-ink-4"><PenLine className="h-3.5 w-3.5" /> Stack Scout writes the first line only. It doesn&apos;t send email or manage contacts.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
