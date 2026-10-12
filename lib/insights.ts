import type { Company, ResearchRun } from "./db";
import { checklist, matchCount } from "./checklist";
import { isComplete } from "./coverage";
import { daysSince, hasData, isStale, relativeTime, sourcedCount, unsourcedCount } from "./derive";

export type InsightKind = "opportunity" | "gap" | "change" | "refresh" | "issue";
export type Insight = {
  kind: InsightKind;
  company: { id: number; name: string };
  title: string;
  body: string;
  evidence?: string;
  action: { label: string; href: string };
};

/** Every insight is computed from stored records; nothing here is hard-coded example content. */
export function buildInsights(companies: Company[], runs: ResearchRun[], limit = 7): Insight[] {
  const out: Insight[] = [];
  const co = (c: Company) => ({ id: c.id, name: c.company_name });

  // Issues first: a failed refresh is the thing most likely to mislead a call.
  for (const c of companies.filter((x) => x.status === "error").slice(0, 2)) {
    out.push({ kind: "issue", company: co(c), title: "Research failed", body: c.error ?? "The last refresh did not complete.", evidence: hasData(c) ? `Showing data from ${relativeTime(c.last_updated)}` : "No earlier data", action: { label: "Open account to retry", href: `/accounts/${c.id}` } });
  }

  // Opportunities: strong, multi-source matches.
  const opps = companies
    .filter((c) => hasData(c) && !isStale(c) && matchCount(c) >= 2 && (c.fit_score ?? 0) >= 60 && sourcedCount(c) >= 3)
    .sort((a, b) => matchCount(b) - matchCount(a) || (b.fit_score ?? 0) - (a.fit_score ?? 0))
    .slice(0, 2);
  for (const c of opps) {
    const matched = checklist(c).filter((x) => x.status === "met");
    out.push({
      kind: "opportunity", company: co(c),
      title: `Strong ICP match · fit ${c.fit_score}`,
      body: `${matched.map((m) => `${m.label}: ${m.value}`).join(" · ")}. ${sourcedCount(c)} fit reasons are backed by public sources.`,
      evidence: matched[0]?.evidence, action: { label: "Prepare outreach", href: `/outreach?company=${c.id}` },
    });
  }

  // Changes detected in the most recent runs.
  const recent = runs.filter((r) => r.status === "success" && r.changes.length && Date.now() - new Date(r.created_at).getTime() < 14 * 864e5);
  const seen = new Set<number>();
  for (const r of recent) {
    if (seen.has(r.company_id) || seen.size >= 2) continue;
    seen.add(r.company_id);
    out.push({ kind: "change", company: { id: r.company_id, name: r.company_name ?? "Company" }, title: "Change detected", body: r.changes.join(" · "), evidence: `Refreshed ${relativeTime(r.created_at)}`, action: { label: "Open intelligence", href: `/accounts/${r.company_id}` } });
  }

  // Gaps: fit reasons that count for nothing until a source is attached.
  const gaps = companies.filter((c) => hasData(c) && unsourcedCount(c) > 0).sort((a, b) => unsourcedCount(b) - unsourcedCount(a)).slice(0, 2);
  for (const c of gaps) {
    const r = c.analysis?.fit_reasons.find((x) => x.source === "none");
    out.push({ kind: "gap", company: co(c), title: `${unsourcedCount(c)} fit reason${unsourcedCount(c) > 1 ? "s" : ""} without evidence`, body: r ? `“${r.context}” has no public source, so it scores 0 toward fit.` : "Unsourced reasons score 0 toward fit.", action: { label: "Review evidence", href: `/accounts/${c.id}` } });
  }

  // Stale research.
  const stale = companies.filter((c) => isStale(c)).sort((a, b) => daysSince(b.last_updated!) - daysSince(a.last_updated!)).slice(0, 2);
  for (const c of stale) {
    out.push({ kind: "refresh", company: co(c), title: "Refresh required", body: `Last researched ${daysSince(c.last_updated!)} days ago. The weekly refresh has not reached this account yet.`, action: { label: "Open to refresh", href: `/accounts/${c.id}` } });
  }

  // Incomplete research on an otherwise good account.
  for (const c of companies.filter((x) => hasData(x) && !isStale(x) && !isComplete(x) && (x.fit_score ?? 0) >= 60).slice(0, 1)) {
    out.push({ kind: "gap", company: co(c), title: "Thin public evidence", body: "Fewer than four research signals were found, so treat this account's fit with caution.", action: { label: "Inspect sources", href: `/accounts/${c.id}/notes` } });
  }

  const order: Record<InsightKind, number> = { issue: 0, opportunity: 1, change: 2, gap: 3, refresh: 4 };
  return out.sort((a, b) => order[a.kind] - order[b.kind]).slice(0, limit);
}
