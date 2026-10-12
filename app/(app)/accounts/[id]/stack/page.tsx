import { notFound } from "next/navigation";
import { Cap, StatusBadge } from "@/components/ui";
import { getAccount } from "@/lib/account";
import { SOURCE_LABEL, daysSince, fmtDate, isStale, langShare } from "@/lib/derive";
import { productName } from "@/lib/product";

export const dynamic = "force-dynamic";

const COLS = "130px 120px 100px minmax(0,1fr) 74px 70px";
const REL = { High: 0, Medium: 1, Low: 2 } as const;

export default async function Stack({ params }: { params: Promise<{ id: string }> }) {
  const c = await getAccount(Number((await params).id));
  if (!c || !c.last_updated) notFound();
  const techs = [...(c.analysis?.technologies ?? [])].sort(
    (a, b) => REL[a.relevance] - REL[b.relevance] || Number(b.status === "confirmed") - Number(a.status === "confirmed")
  );
  const stale = isStale(c);
  const confirmed = techs.filter((t) => t.status === "confirmed").length;
  const inferred = techs.length - confirmed;
  const high = techs.filter((t) => t.relevance === "High");
  const g = c.signals?.github;
  const j = c.signals?.jobs;
  const shares = langShare(c);
  const nums: [string, string][] = [
    [g ? String(g.publicRepos) : "—", "public repos"],
    [g ? String(g.reposPushedLast90d) : "—", "repos active 90d"],
    [j ? String(j.engineeringOpen) : "—", "open eng roles"],
    [j ? String(j.totalOpen) : "—", "open roles total"],
  ];

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-3">
          <h3 className="text-xl font-bold tracking-[-0.01em]">Technology inventory</h3>
          <Cap>{techs.length} total · {confirmed} confirmed · {inferred} inferred{stale ? ` · ${techs.length} stale` : ""}</Cap>
        </div>
        {techs.length === 0 ? (
          <p className="mt-4 text-sm text-ink-3">No technologies identified from the collected signals.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-surface">
            <div className="min-w-[760px]">
              <div className="grid gap-3 border-b border-line bg-thead px-4 py-2 font-mono text-[10px] font-medium tracking-[0.06em] text-cap" style={{ gridTemplateColumns: COLS }}>
                {["TECHNOLOGY", "CATEGORY", "STATUS", "EVIDENCE", "VERIFIED", "FIT"].map((h) => <span key={h}>{h}</span>)}
              </div>
              {techs.map((t) => (
                <div key={t.name} className="grid items-center gap-3 border-t border-line-soft px-4 py-2.5 text-[13px] first:border-t-0" style={{ gridTemplateColumns: COLS }}>
                  <span className="truncate font-mono text-[13px] font-medium">{t.name}</span>
                  <span className="truncate text-ink-2">{t.category}</span>
                  <span>{stale ? <StatusBadge kind="stale" days={daysSince(c.last_updated!)} /> : <StatusBadge kind={t.status} />}</span>
                  <span className="truncate text-ink-2" title={t.evidence}>{t.source !== "none" ? `${SOURCE_LABEL[t.source]} · ` : ""}{t.evidence}</span>
                  <span className="font-mono text-[11px] text-ink-4">{fmtDate(c.last_updated!)}</span>
                  <span>
                    {t.relevance === "High" ? <span className="rounded-full bg-btn px-2.5 py-0.5 text-xs font-semibold text-white">High</span>
                      : t.relevance === "Medium" ? <span className="rounded-full bg-good-bg px-2.5 py-0.5 text-xs font-semibold text-accent">Medium</span>
                      : <span className="text-xs text-ink-4">Low</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <aside>
        <div className="flex items-baseline gap-2"><h3 className="text-xl font-bold tracking-[-0.01em]">Language share</h3><Cap>public code</Cap></div>
        <div className="mt-3 space-y-2">
          {shares.length === 0 && <p className="text-sm text-ink-3">No public code found.</p>}
          {shares.map((l) => (
            <div key={l.name} className="grid grid-cols-[84px_1fr_36px] items-center gap-3 text-[13px]">
              <span className="truncate">{l.name}</span>
              <span className="h-2 rounded-full bg-chip"><span className="block h-2 rounded-full bg-accent" style={{ width: `${l.pct}%` }} /></span>
              <span className="text-right">{l.pct}%</span>
            </div>
          ))}
        </div>
        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4 border-t-2 border-ink pt-4">
          {nums.map(([n, l]) => (
            <div key={l}><div className="text-[28px] font-extrabold leading-none tracking-[-0.03em]">{n}</div><div className="mt-1 text-[13px] text-ink-3">{l}</div></div>
          ))}
        </div>
        <div className="mt-6 rounded-[14px] bg-sunken p-4">
          <Cap>{productName()} fit · high-relevance tech</Cap>
          <p className="mt-2 text-sm">
            {high.length ? high.map((t) => t.name).slice(0, 6).join(" · ") : "None identified"} <span className="text-ink-3">({high.length} of {techs.length})</span>
          </p>
        </div>
      </aside>
    </div>
  );
}
