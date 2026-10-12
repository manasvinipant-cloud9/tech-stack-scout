import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleDashed, ExternalLink } from "lucide-react";
import { Disclosure } from "@/components/Disclosure";
import { IcpLegend, StatusGlyph, STATUS_TEXT } from "@/components/Icp";
import OpeningLine from "@/components/OpeningLine";
import { SourceChip } from "@/components/SourceChip";
import TechMap from "@/components/TechMap";
import { Panel, SectionHeader, StatusPill } from "@/components/ui";
import { getAccount } from "@/lib/account";
import { checklist, type CheckStatus } from "@/lib/checklist";
import { listRuns } from "@/lib/db";
import { availableCount, SIGNALS, signalStates } from "@/lib/coverage";
import { facts, fmtDate, fmtDateYear, isStale, langShare, relativeTime, sourceLinks, unsourcedCount } from "@/lib/derive";
import { loadIcp } from "@/lib/settings";
import type { Source } from "@/lib/types";

export const dynamic = "force-dynamic";

const CRIT_TONE: Record<CheckStatus, string> = { met: "border-good-dot/40 bg-good-bg/40", partial: "border-warn-line/40 bg-warn-bg/40", unmet: "border-line bg-sunken", unknown: "border-dashed bg-sunken" };

function Bar({ label, value, max, note }: { label: string; value: number | null; max: number | null; note: string }) {
  const pct = value != null && max ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-[13px]"><span className="text-ink-2">{label}</span><span className="font-mono text-xs text-ink-3">{note}</span></div>
      <div className="h-2 rounded-full bg-chip">{value != null && <div className="h-2 rounded-full bg-good-dot" style={{ width: `${Math.max(pct, value > 0 ? 3 : 0)}%` }} />}</div>
    </div>
  );
}

export default async function Intelligence({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  await loadIcp();
  const c = await getAccount(id);
  if (!c || !c.last_updated) notFound();
  const runs = await listRuns(6, id).catch(() => []);
  const a = c.analysis;
  const checks = checklist(c);
  const links = sourceLinks(c);
  const linkMap = Object.fromEntries(links.map((l) => [l.key, l.url])) as Partial<Record<Source, string>>;
  const g = c.signals?.github;
  const j = c.signals?.jobs;
  const blog = c.signals?.blog;
  const stale = isStale(c);
  const sourced = a?.fit_reasons.filter((r) => r.source !== "none") ?? [];
  const unsourced = a?.fit_reasons.filter((r) => r.source === "none") ?? [];
  const missing = checks.filter((x) => x.status === "unknown");
  const recent = [...(g?.recentRepos ?? [])].sort((x, y) => +new Date(y.pushed_at) - +new Date(x.pushed_at)).slice(0, 4);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 space-y-6">
        {/* Engineering context summary */}
        <section>
          <SectionHeader title="Engineering context" hint="Model-generated from the public evidence below" />
          <Panel className="p-5">
            {c.summary ? <div className="space-y-3 text-[14.5px] leading-relaxed text-ink-2">{c.summary.split(/\n\s*\n/).map((p, i) => <p key={i}>{p}</p>)}</div> : <p className="text-sm text-ink-3">No summary has been generated yet.</p>}
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line-soft pt-3">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-cap">Evidence used</span>
              {links.length ? links.map((l) => <SourceChip key={l.key} source={l.key} url={l.url} label={l.label} />) : <span className="text-xs text-ink-4">No public sources found</span>}
            </div>
          </Panel>
        </section>

        {/* Why this account fits */}
        <section>
          <SectionHeader title="Why this account fits" hint={c.fit_score != null ? `Fit ${c.fit_score} of 100` : "No fit score yet"} />
          <Panel className="p-5">
            <div className="grid gap-3 md:grid-cols-3">
              {checks.map((k) => {
                const src: Source | null = k.key === "language" ? "github" : k.key === "microservices" ? (a?.architecture?.source && a.architecture.source !== "none" ? a.architecture.source : j ? "jobs" : null) : (j?.toolMentions.some((m) => /aws|gcp|azure/i.test(m.name)) ? "jobs" : (a?.technologies.find((t) => t.category === "Cloud")?.source ?? null));
                return (
                  <div key={k.key} className={`rounded-lg border p-3.5 ${CRIT_TONE[k.status]}`} style={k.status === "unknown" ? { borderColor: "var(--dashed)" } : undefined}>
                    <div className="flex items-center justify-between"><span className="text-[13px] font-semibold">{k.label}</span>
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${k.status === "met" ? "text-good" : k.status === "partial" ? "text-warn" : "text-ink-3"}`}><StatusGlyph s={k.status} />{STATUS_TEXT[k.status]}</span></div>
                    <div className="mt-1.5 text-[17px] font-bold leading-tight">{k.value}</div>
                    <p className="mt-1 text-xs leading-snug text-ink-3">{k.evidence}</p>
                    <p className="mt-2 text-[11px] text-ink-4">Target: {k.target}</p>
                    {src && k.status !== "unknown" && <div className="mt-2"><SourceChip source={src} url={linkMap[src]} /></div>}
                  </div>
                );
              })}
            </div>
            <div className="mt-3"><IcpLegend /></div>

            {sourced.length > 0 && (
              <div className="mt-5">
                <div className="mb-1.5 text-[13px] font-semibold">Supported by evidence <span className="font-mono text-[11px] font-normal text-ink-4">{sourced.length}</span></div>
                <ul className="space-y-1.5">
                  {sourced.map((r, i) => (
                    <li key={i}>
                      <Disclosure summary={<span className="text-[13.5px] font-normal"><span className="text-ink-2">{r.context}</span> <span className="font-medium text-accent">→ {r.capability}</span></span>} count={`${r.strength}/3`}>
                        <p className="text-ink-2">{r.evidence || "No evidence text was recorded."}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-4">Source <SourceChip source={r.source} url={linkMap[r.source]} /><span>Strength {r.strength} of 3: how directly the evidence supports this reason.</span></div>
                      </Disclosure>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {(unsourced.length > 0 || missing.length > 0) && (
              <div className="mt-4 rounded-lg border border-dashed p-3.5" style={{ borderColor: "var(--dashed)" }}>
                <div className="mb-1 flex items-center gap-1.5 text-[13px] font-semibold text-warn"><CircleDashed className="h-3.5 w-3.5" /> Missing evidence affecting this score</div>
                <ul className="space-y-1 text-[13px] text-ink-2">
                  {unsourced.map((r, i) => <li key={i}>“{r.context}” has no public source, so it scores 0.</li>)}
                  {missing.map((m) => <li key={m.key}>{m.label}: nothing public found. Not proof the company lacks it.</li>)}
                </ul>
              </div>
            )}
            <p className="mt-4 font-mono text-[10.5px] uppercase tracking-[0.05em] text-ink-4">Fit = strength of sourced reasons ÷ 15 · unsourced reasons score 0{unsourcedCount(c) ? ` · ${unsourcedCount(c)} unsourced here` : ""}</p>
          </Panel>
        </section>

        {/* Technology map */}
        <section>
          <SectionHeader title="Technology map" hint="Select a technology to see its evidence" />
          <Panel className="p-5">
            <TechMap techs={a?.technologies ?? []} shares={langShare(c)} links={linkMap} verified={fmtDate(c.last_updated)} stale={stale} />
          </Panel>
        </section>

        {/* Engineering activity */}
        <section>
          <SectionHeader title="Engineering activity" hint={`Snapshot from ${fmtDateYear(c.last_updated)}`} />
          <Panel className="p-5">
            <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
              <Bar label="Repositories pushed to in the last 90 days" value={g?.reposPushedLast90d ?? null} max={g?.publicRepos ?? null} note={g ? `${g.reposPushedLast90d} of ${g.publicRepos} public repos` : "No GitHub org found"} />
              <Bar label="Open engineering roles" value={j?.engineeringOpen ?? null} max={j?.totalOpen ?? null} note={j ? `${j.engineeringOpen} of ${j.totalOpen} roles · ${j.source}` : "No job board found"} />
              <Bar label="Engineering blog posts in the last 90 days" value={blog?.postsLast90d ?? null} max={blog ? Math.max(blog.postsLast90d, blog.posts.length) : null} note={blog ? `${blog.postsLast90d} posts` : "No blog feed found"} />
              <div className="text-[13px]"><div className="text-ink-2">Public GitHub stars</div><div className="mt-1 text-xl font-bold tracking-[-0.02em]">{g ? g.totalStars.toLocaleString("en-US") : "—"}</div></div>
            </div>
            {j && j.toolMentions.length > 0 && (
              <div className="mt-5 border-t border-line-soft pt-4">
                <div className="mb-2 text-[13px] font-semibold">Tools named in job descriptions <span className="font-normal text-ink-4">· {j.descriptionsScanned} engineering postings read</span></div>
                <ul className="grid gap-x-8 gap-y-1.5 sm:grid-cols-2">
                  {j.toolMentions.slice(0, 6).map((m) => (
                    <li key={m.name} className="grid grid-cols-[96px_1fr_44px] items-center gap-2 text-[13px]"><span className="truncate">{m.name}</span>
                      <span className="h-1.5 rounded-full bg-chip"><span className="block h-1.5 rounded-full bg-accent/70" style={{ width: `${(m.postings / j.descriptionsScanned) * 100}%` }} /></span>
                      <span className="text-right font-mono text-[11px] text-ink-3">{m.postings}/{j.descriptionsScanned}</span></li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-5 space-y-2">
              {j && j.sampleTitles.length > 0 && (
                <Disclosure summary="Hiring signals: open engineering roles" count={j.engineeringOpen}>
                  <ul className="space-y-1 text-ink-2">{j.sampleTitles.map((t) => <li key={t}>{t}</li>)}</ul>
                  <p className="mt-2 text-xs text-ink-4">Showing up to {j.sampleTitles.length} of {j.engineeringOpen} engineering roles on the {j.source} board. <a className="link" href={linkMap.jobs} target="_blank" rel="noreferrer">Open the board</a></p>
                </Disclosure>
              )}
              {blog && blog.posts.length > 0 && (
                <Disclosure summary="Engineering blog evidence: recent posts" count={blog.posts.length}>
                  <ul className="space-y-1.5">{blog.posts.map((p) => <li key={p.link || p.title} className="flex items-baseline justify-between gap-3"><span className="min-w-0">{p.link ? <a className="hover:text-accent hover:underline" href={p.link} target="_blank" rel="noreferrer">{p.title}</a> : p.title}</span><span className="shrink-0 font-mono text-[11px] text-ink-4">{p.date ? fmtDate(p.date) : "—"}</span></li>)}</ul>
                </Disclosure>
              )}
              {g && g.recentRepos.length > 0 && (
                <Disclosure summary="Public repositories: most recently active" count={g.recentRepos.length}>
                  <ul className="space-y-1.5">{[...g.recentRepos].sort((x, y) => +new Date(y.pushed_at) - +new Date(x.pushed_at)).map((r) => <li key={r.name} className="flex items-baseline justify-between gap-3"><span className="min-w-0"><a className="hover:text-accent hover:underline" href={`${g.url}/${r.name}`} target="_blank" rel="noreferrer">{r.name}</a>{r.language && <span className="text-ink-4"> · {r.language}</span>}{r.description && <span className="block truncate text-xs text-ink-4">{r.description}</span>}</span><span className="shrink-0 font-mono text-[11px] text-ink-4">{fmtDate(r.pushed_at)}</span></li>)}</ul>
                </Disclosure>
              )}
            </div>
            <p className="mt-4 text-[11px] text-ink-4">These are point-in-time counts. Trend lines will appear once enough weekly snapshots exist.</p>
          </Panel>
        </section>

        <section>
          <SectionHeader title="How this was researched" hint="Methodology and confidence" />
          <Disclosure summary={<span>Evidence coverage: <b className="text-ink">{availableCount(c)} of 6 signals</b> found · {availableCount(c) >= 5 ? "High" : availableCount(c) >= 4 ? "Medium" : "Low"} confidence</span>}>
            <ul className="grid gap-x-8 gap-y-1.5 sm:grid-cols-2">
              {SIGNALS.map((s) => { const st = signalStates(c)[s.key]; return (
                <li key={s.key} className="flex items-center justify-between gap-3"><span className="text-ink-2">{s.label}</span><StatusPill tone={st === "available" ? "good" : st === "partial" ? "warn" : st === "failed" ? "bad" : "neutral"}>{st === "available" ? "Evidence found" : st === "partial" ? "Partial" : st === "failed" ? "Failed" : st === "pending" ? "Not researched" : "None found"}</StatusPill></li>
              ); })}
            </ul>
            <div className="mt-4 space-y-2 border-t border-line-soft pt-3 text-ink-3">
              <p><b className="text-ink-2">Directly evidenced</b> means a collected signal shows it (a repository language, a job post, a response header). <b className="text-ink-2">Inferred</b> means the model reasoned beyond the signal, and any claim citing a source we never collected is downgraded to “no source”.</p>
              <p><b className="text-ink-2">Fit</b> is the strength (1 to 3) of sourced fit reasons divided by 15. Unsourced reasons score 0, so missing evidence never raises a score.</p>
              <p><b className="text-ink-2">Confidence</b> reflects how many of the six public signals were found: 5 or 6 is high, 4 is medium, fewer is low. A signal that was not found is not proof the company lacks it.</p>
              <p>Sources are public and keyless: GitHub REST, the company homepage, Greenhouse, Lever and Ashby job boards, and the engineering blog feed. Researched {fmtDateYear(c.last_updated)}.</p>
            </div>
          </Disclosure>
        </section>
      </div>

      {/* Right rail */}
      <aside className="min-w-0 space-y-6 xl:sticky xl:top-20 xl:self-start">
        <section>
          <SectionHeader title="Your opening line" />
          <Panel className="p-4"><OpeningLine id={c.id} line={c.outreach_hook} signal={a?.hook?.signal ?? null} source={(a?.hook?.source as Source) ?? null} links={linkMap} compact /></Panel>
        </section>

        {a && a.open_questions.length > 0 && (
          <section>
            <SectionHeader title="Ask on the call" hint="Gaps the evidence can't answer" />
            <Panel className="p-4"><ol className="list-decimal space-y-2 pl-4 text-[13.5px] leading-snug text-ink-2 marker:text-ink-4">{a.open_questions.map((q) => <li key={q}>{q}</li>)}</ol></Panel>
          </section>
        )}

        <section>
          <SectionHeader title="Key numbers" hint="Computed from signals" />
          <Panel className="p-4"><ul className="space-y-1.5 text-[13.5px] text-ink-2">{facts(c).map((f) => <li key={f}>{f}</li>)}</ul></Panel>
        </section>

        {(recent.length > 0 || (blog?.posts.length ?? 0) > 0) && (
          <section>
            <SectionHeader title="Latest public signals" />
            <Panel className="divide-y divide-line-soft">
              {recent.map((r) => (
                <div key={r.name} className="flex items-baseline justify-between gap-3 px-4 py-2.5 text-[13px]">
                  <span className="min-w-0 truncate"><a className="font-medium hover:text-accent hover:underline" href={`${g!.url}/${r.name}`} target="_blank" rel="noreferrer">{r.name}</a>{r.language && <span className="text-ink-4"> · {r.language}</span>}</span>
                  <span className="shrink-0 font-mono text-[11px] text-ink-4">{fmtDate(r.pushed_at)}</span>
                </div>
              ))}
              {(blog?.posts ?? []).slice(0, 3).map((p) => (
                <div key={p.link || p.title} className="flex items-baseline justify-between gap-3 px-4 py-2.5 text-[13px]">
                  <span className="min-w-0 truncate">{p.link ? <a className="hover:text-accent hover:underline" href={p.link} target="_blank" rel="noreferrer">{p.title}</a> : p.title}<span className="text-ink-4"> · blog</span></span>
                  <span className="shrink-0 font-mono text-[11px] text-ink-4">{p.date ? fmtDate(p.date) : "—"}</span>
                </div>
              ))}
            </Panel>
          </section>
        )}

        <section>
          <SectionHeader title="Research history" />
          <Panel className="p-4">
            {runs.length === 0 ? <p className="text-[13px] text-ink-3">The first refresh will start this history. Last researched {relativeTime(c.last_updated)}.</p> : (
              <ol className="space-y-3">{runs.map((r) => (
                <li key={r.id} className="text-[13px]">
                  <div className="flex items-center justify-between gap-2"><StatusPill tone={r.status === "success" ? "good" : "bad"}>{r.status === "success" ? `Fit ${r.fit_score ?? "—"}` : "Failed"}</StatusPill><span className="font-mono text-[11px] text-ink-4">{relativeTime(r.created_at)}</span></div>
                  {(r.changes.length > 0 || r.note || r.error) && <p className="mt-1 text-xs text-ink-3">{r.changes.length ? r.changes.join(" · ") : r.status === "success" ? r.note : r.error}</p>}
                </li>
              ))}</ol>
            )}
          </Panel>
        </section>
        <Link href={`/accounts/${c.id}/notes`} className="inline-flex items-center gap-1 text-[13px] text-accent hover:underline">Evidence sources and notes <ExternalLink className="h-3 w-3 rotate-90" /></Link>
      </aside>
    </div>
  );
}
