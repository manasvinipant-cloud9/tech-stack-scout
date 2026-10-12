import { notFound } from "next/navigation";
import { CopyButton } from "@/components/CopyButton";
import { Banner, Chip, Cap } from "@/components/ui";
import { getAccount } from "@/lib/account";
import { SOURCE_LABEL, cloudOf, facts, fmtDate, isStale, langShare, orchOf, primaryLanguage, unsourcedCount } from "@/lib/derive";
import type { Company } from "@/lib/db";
import type { Source } from "@/lib/types";

export const dynamic = "force-dynamic";

function srcText(c: Company, s: Source, extra?: string) {
  return `${SOURCE_LABEL[s]}${extra ? ` · ${extra}` : ""} · ${fmtDate(c.last_updated!)}`;
}

export default async function Overview({ params }: { params: Promise<{ id: string }> }) {
  const c = await getAccount(Number((await params).id));
  if (!c || !c.last_updated) notFound();
  const a = c.analysis;
  const stale = isStale(c);
  const g = c.signals?.github;
  const j = c.signals?.jobs;
  const tech = (cat: string[]) => a?.technologies.filter((t) => cat.includes(t.category)) ?? [];
  const lang = langShare(c)[0];
  const unsourced = unsourcedCount(c);
  const noPitch = !!a && a.fit_reasons.length === 0;
  const named = (name: string, cats: string[]) => a?.technologies.find((t) => t.name.toLowerCase() === name.toLowerCase()) ?? tech(cats)[0];
  const cloudT = named(cloudOf(c), ["Cloud"]);
  const orchT = named(orchOf(c), ["Orchestration"]);
  const without = (cats: string[], value: string) =>
    tech(cats).map((t) => t.name).filter((n) => !value.toLowerCase().includes(n.toLowerCase())).slice(0, 4);

  const env = [
    {
      label: "Cloud platform", value: cloudOf(c),
      detail: without(["Cloud"], cloudOf(c)).join(", "),
      src: cloudT && cloudT.source !== "none" ? srcText(c, cloudT.source) : null, ok: cloudT?.status === "confirmed",
    },
    {
      label: "Orchestration", value: orchOf(c),
      detail: without(["Orchestration", "CI/CD", "IaC"], orchOf(c)).join(" · "),
      src: orchT && orchT.source !== "none" ? srcText(c, orchT.source) : null, ok: orchT?.status === "confirmed",
    },
    {
      label: "Primary language", value: primaryLanguage(c), detail: lang ? `${lang.pct}% of public code` : "",
      src: g ? srcText(c, "github", `${g.publicRepos} repos`) : null, ok: !!g,
    },
    {
      label: "Hiring", value: j ? `${j.engineeringOpen} open eng roles` : "—", detail: j ? `of ${j.totalOpen} total` : "",
      src: j ? srcText(c, "jobs", j.source) : null, ok: !!j,
    },
  ];

  const recent = [...(g?.recentRepos ?? [])].sort((x, y) => +new Date(y.pushed_at) - +new Date(x.pushed_at)).slice(0, 5);
  const numbers = facts(c);

  return (
    <div className="space-y-4">
    {unsourced > 0 && <Banner tone="dashed">{unsourced} fit reason{unsourced > 1 ? "s have" : " has"} no source. {unsourced > 1 ? "They don't" : "It doesn't"} count toward the fit score until evidence is attached.</Banner>}
    {noPitch && <Banner tone="dashed">No product description set. Add PRODUCT_PITCH (and PRODUCT_NAME) in the environment, then re-research to score fit.</Banner>}
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_330px]">
      <div className="min-w-0">
        <h3 className="text-lg font-bold tracking-[-0.01em]">Engineering environment</h3>
        <div className="mt-3 divide-y divide-line-soft">
          {env.map((r) => (
            <div key={r.label} className="grid gap-1 py-3 sm:grid-cols-[150px_1fr_260px] sm:items-baseline sm:gap-4">
              <span className="text-[13px] text-ink-3">{r.label}</span>
              <span><span className="text-base font-bold">{r.value}</span>{r.detail && <span className="text-[13px] text-ink-2"> · {r.detail}</span>}</span>
              <span className={`font-mono text-[11px] sm:text-right ${r.src ? (stale ? "text-warn" : r.ok ? "text-good" : "text-ink-3") : "text-brown"}`}>
                {r.src ? `${stale ? "◷" : r.ok ? "●" : "○"} ${r.src}` : "No evidence"}
              </span>
            </div>
          ))}
        </div>
        {a && a.technologies.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            {a.technologies.map((t) => <Chip key={t.name} inferred={t.status === "inferred"}>{t.name}</Chip>)}
            <span className="ml-1 text-xs text-ink-4">dashed = inferred</span>
          </div>
        )}

        <div className="mt-8 flex items-baseline gap-3">
          <h3 className="text-lg font-bold tracking-[-0.01em]">Fit mapping</h3>
          <span className="text-[13px] text-ink-3">account attribute → product capability</span>
        </div>
        {a && a.fit_reasons.length > 0 ? (
          <div className="mt-3 divide-y divide-line-soft">
            {a.fit_reasons.map((r, i) => (
              <div key={i} className="grid gap-1 py-3 sm:grid-cols-[1fr_1fr_170px] sm:items-start sm:gap-5">
                <span className="text-sm text-ink-2">{r.context}</span>
                <span className="text-sm font-semibold text-accent">→ {r.capability}</span>
                <span className="sm:text-right">
                  {r.source === "none" ? (
                    <span className="inline-block rounded-md border border-dashed px-2 py-0.5 font-mono text-[11px] text-brown" style={{ borderColor: "var(--dashed)" }}>No evidence</span>
                  ) : (
                    <span className={`font-mono text-[11px] ${stale ? "text-warn" : "text-ink-3"}`} title={r.evidence}>{stale ? "◷ " : ""}{srcText(c, r.source)}</span>
                  )}
                </span>
              </div>
            ))}
            <p className="pt-3 font-mono text-[11px] text-ink-4">FIT = SUM OF SOURCED REASON STRENGTH (1–3) ÷ 15. UNSOURCED REASONS SCORE 0.</p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-ink-3">No fit mapping yet.</p>
        )}
      </div>

      <aside className="space-y-6">
        <section className="rounded-[18px] bg-deep p-5 text-dark-text">
          <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-lime">✳ Signal summary · computed</div>
          <ul className="mt-3 space-y-1.5 text-[15px] leading-snug">
            {numbers.length ? numbers.map((f) => <li key={f}>{f}</li>) : <li className="text-dark-meta">No public signals found.</li>}
          </ul>
          {a && a.open_questions.length > 0 && (
            <div className="mt-5 border-t border-deep-line pt-4">
              <div className="text-[13px] text-dark-meta">Open questions · model-generated</div>
              <ul className="mt-2 space-y-2 text-[13px] leading-snug text-dark-text">{a.open_questions.map((q) => <li key={q}>— {q}</li>)}</ul>
            </div>
          )}
          {c.outreach_hook && (
            <div className="mt-5 border-t border-deep-line pt-4">
              <div className="flex items-center justify-between text-[13px] text-dark-meta"><span>Outreach opener · model-generated</span><CopyButton text={c.outreach_hook} /></div>
              <p className="mt-2 rounded-xl bg-deep-line/60 p-3 text-[13px] leading-snug">{c.outreach_hook}</p>
            </div>
          )}
          {c.summary && (
            <details className="mt-5 border-t border-deep-line pt-4 text-[13px]">
              <summary className="cursor-pointer text-dark-meta">Context summary · model-generated</summary>
              <div className="mt-2 space-y-2 leading-snug">{c.summary.split(/\n\s*\n/).map((p, i) => <p key={i}>{p}</p>)}</div>
            </details>
          )}
        </section>

        <section>
          <div className="mb-1 flex items-baseline justify-between"><h3 className="text-base font-bold">Latest signals</h3><Cap>{recent.length + (j ? 1 : 0)}</Cap></div>
          <ul className="divide-y divide-line-soft">
            {recent.map((r) => (
              <li key={r.name} className="grid grid-cols-[52px_1fr] gap-2 py-2.5 text-[13px]">
                <span className="font-mono text-[11px] text-cap">{fmtDate(r.pushed_at)}</span>
                <span>{r.name}: pushed{r.language ? ` · ${r.language}` : ""} · {r.stars.toLocaleString("en-US")}★ <span className="text-ink-4">· GitHub</span></span>
              </li>
            ))}
            {j && (
              <li className="grid grid-cols-[52px_1fr] gap-2 py-2.5 text-[13px]">
                <span className="font-mono text-[11px] text-cap">{fmtDate(c.last_updated)}</span>
                <span>{j.engineeringOpen} open eng roles{j.sampleTitles[0] ? `, e.g. ${j.sampleTitles[0]}` : ""} <span className="text-ink-4">· {j.source}</span></span>
              </li>
            )}
            {recent.length === 0 && !j && <li className="py-3 text-[13px] text-ink-3">No dated signals collected.</li>}
          </ul>
        </section>
      </aside>
    </div>
    </div>
  );
}
