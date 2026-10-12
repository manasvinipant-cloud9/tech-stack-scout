import { notFound } from "next/navigation";
import { ResearchButton } from "@/components/ResearchButton";
import NotesPanel from "@/components/NotesPanel";
import { Cap, StaleChip } from "@/components/ui";
import { getAccount } from "@/lib/account";
import { listNotes } from "@/lib/db";
import { daysSince, fmtDate, isStale } from "@/lib/derive";

export const dynamic = "force-dynamic";

const COLS = "minmax(0,1.5fr) 64px 70px 76px";

export default async function NotesTab({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const c = await getAccount(id);
  if (!c || !c.last_updated) notFound();
  const notes = await listNotes(id);
  const stale = isStale(c);
  const g = c.signals?.github;
  const s = c.signals?.site;
  const j = c.signals?.jobs;

  const sources = [
    { name: "GitHub org", url: g ? `github.com/${g.org}` : c.github_org ? `github.com/${c.github_org}` : "not found", items: g ? `${g.publicRepos}` : "0", ok: !!g },
    { name: "Website fingerprint", url: c.domain, items: s ? `${s.scriptHosts.length}` : "0", ok: !!s },
    { name: "Job board", url: j ? `${j.source} · ${j.board}` : "not found", items: j ? `${j.totalOpen}` : "0", ok: !!j },
    { name: "Job descriptions", url: j ? `${j.descriptionsScanned} engineering posts read` : "not found", items: j ? `${j.toolMentions.length}` : "0", ok: !!j && j.descriptionsScanned > 0 },
    { name: "Engineering blog", url: c.signals?.blog ? c.signals.blog.feedUrl.replace(/^https?:\/\//, "") : "no feed found", items: c.signals?.blog ? `${c.signals.blog.posts.length}` : "0", ok: !!c.signals?.blog },
  ];

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div>
        <h3 className="mb-3 text-lg font-bold tracking-[-0.01em]">Notes</h3>
        <NotesPanel companyId={id} initial={notes} />
      </div>
      <div className="space-y-6">
        <div>
          <h3 className="mb-3 text-lg font-bold tracking-[-0.01em]">Research sources</h3>
          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <div className="min-w-[420px]">
              <div className="grid gap-3 border-b border-line bg-thead px-4 py-2 font-mono text-[10px] font-medium tracking-[0.06em] text-cap" style={{ gridTemplateColumns: COLS }}>
                {["SOURCE", "ITEMS", "FETCHED", "STATUS"].map((h) => <span key={h}>{h}</span>)}
              </div>
              {sources.map((r) => (
                <div key={r.name} className="grid items-center gap-3 border-t border-line-soft px-4 py-2.5 text-[13px] first:border-t-0" style={{ gridTemplateColumns: COLS }}>
                  <span className="min-w-0"><span className="block truncate font-semibold">{r.name}</span><span className="block truncate font-mono text-[11px] text-ink-4">{r.url}</span></span>
                  <span>{r.items}</span>
                  <span className="font-mono text-[11px] text-ink-3">{fmtDate(c.last_updated!)}</span>
                  <span>
                    {!r.ok ? <span className="font-mono text-[10px] font-medium text-ink-4">✕ NOT FOUND</span>
                      : stale ? <StaleChip label={`◷ ${daysSince(c.last_updated!)}D`} />
                      : <span className="font-mono text-[10px] font-medium text-good">● OK</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3"><ResearchButton id={id} label="Re-run all sources" primary /></div>
        </div>
        {c.analysis && c.analysis.open_questions.length > 0 && (
          <section className="rounded-[14px] bg-deep p-5 text-dark-text">
            <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-lime">Open questions · {c.analysis.open_questions.length} · model-generated</div>
            <ul className="mt-3 space-y-2 text-sm leading-snug">{c.analysis.open_questions.map((q) => <li key={q}>— {q}</li>)}</ul>
          </section>
        )}
        <Cap className="block">Sources are public and keyless: GitHub REST, the company homepage, Greenhouse / Lever / Ashby boards (titles and descriptions) and the engineering blog feed.</Cap>
      </div>
    </div>
  );
}
