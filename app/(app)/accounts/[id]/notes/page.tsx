import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import NotesPanel from "@/components/NotesPanel";
import { ResearchButton } from "@/components/ResearchButton";
import { Panel, SectionHeader, StatusPill } from "@/components/ui";
import { getAccount } from "@/lib/account";
import { signalStates, type SignalState } from "@/lib/coverage";
import { listNotes } from "@/lib/db";
import { fmtDateYear, relativeTime, sourceLinks } from "@/lib/derive";

export const dynamic = "force-dynamic";

const TONE: Record<SignalState, "good" | "warn" | "neutral" | "bad"> = { available: "good", partial: "warn", missing: "neutral", pending: "neutral", failed: "bad" };
const TEXT: Record<SignalState, string> = { available: "Evidence found", partial: "Partial evidence", missing: "No evidence found", pending: "Not researched", failed: "Research failed" };

export default async function EvidenceAndNotes({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const c = await getAccount(id);
  if (!c || !c.last_updated) notFound();
  const notes = await listNotes(id);
  const st = signalStates(c);
  const g = c.signals?.github, j = c.signals?.jobs, b = c.signals?.blog, s = c.signals?.site;
  const link = (k: string) => sourceLinks(c).find((l) => l.key === k)?.url;

  const rows: { name: string; where: string; url?: string; found: string; state: SignalState }[] = [
    { name: "GitHub organization", where: g ? `github.com/${g.org}` : "No organization matched", url: link("github"), found: g ? `${g.publicRepos} public repos, ${g.totalStars.toLocaleString("en-US")} stars` : "Nothing found", state: st.github },
    { name: "Repository activity", where: "GitHub REST API", url: link("github"), found: g ? `${g.reposPushedLast90d} repos pushed in 90 days` : "Needs a GitHub organization", state: st.repos },
    { name: "Job board", where: j ? `${j.source} · ${j.board}` : "Greenhouse, Lever and Ashby checked", url: link("jobs"), found: j ? `${j.totalOpen} open roles, ${j.engineeringOpen} engineering` : "No public board found", state: st.hiring },
    { name: "Job descriptions", where: j ? `${j.descriptionsScanned} engineering postings read` : "Needs a job board", url: link("jobs"), found: j?.toolMentions.length ? `${j.toolMentions.length} tools mentioned` : "No tools extracted", state: j ? (j.descriptionsScanned > 0 ? "available" : "partial") : "missing" },
    { name: "Engineering blog", where: b ? b.feedUrl.replace(/^https?:\/\//, "") : "Common blog locations checked", url: b?.url, found: b ? `${b.posts.length} recent posts, ${b.postsLast90d} in 90 days` : "No feed found", state: st.blog },
    { name: "Website fingerprint", where: c.domain, url: link("website"), found: s ? `${s.scriptHosts.length} script hosts, ${s.hints.length} technology hints` : "Homepage could not be read", state: st.website },
  ];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <section>
        <SectionHeader title="Research sources" hint={`Checked ${relativeTime(c.last_updated)} · ${fmtDateYear(c.last_updated)}`} action={<ResearchButton id={c.id} name={c.company_name} label="Re-run all sources" />} />
        <Panel className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left">
            <thead><tr className="border-b border-line bg-thead font-mono text-[10px] uppercase tracking-[0.07em] text-cap"><th className="px-4 py-2.5 font-medium">Source</th><th className="px-2 py-2.5 font-medium">Finding</th><th className="px-4 py-2.5 font-medium">Status</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.name} className="border-b border-line-soft last:border-0">
                <td className="px-4 py-3"><div className="text-[13.5px] font-semibold">{r.name}</div>
                  {r.url ? <a href={r.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-[11px] text-ink-4 hover:text-accent">{r.where}<ExternalLink className="h-2.5 w-2.5" /></a> : <div className="font-mono text-[11px] text-ink-4">{r.where}</div>}</td>
                <td className="px-2 py-3 text-[13px] text-ink-2">{r.found}</td>
                <td className="px-4 py-3"><StatusPill tone={TONE[r.state]}>{TEXT[r.state]}</StatusPill></td>
              </tr>
            ))}</tbody>
          </table>
        </Panel>
        <p className="mt-2 text-[11.5px] text-ink-4">“No evidence found” means nothing public turned up. It is not evidence that the company does not use the technology.</p>
      </section>
      <section>
        <SectionHeader title="Notes" hint="Use #tags to organise" />
        <NotesPanel companyId={id} initial={notes} />
      </section>
    </div>
  );
}
