import type { Company, ResearchRun } from "./db";
import { daysSince, fmtDate, hasData, relativeTime } from "./derive";

export type InsightKind = "opportunity" | "change" | "signal" | "issue";
export type Insight = {
  kind: InsightKind;
  company: { id: number; name: string };
  title: string;
  body: string;
  evidence?: string;
  at?: string;
  action: { label: string; href: string };
};

/**
 * Insights report what CHANGED or was NEWLY FOUND. What to do about outstanding gaps lives in the next-actions queue,
 * so the two panels never repeat each other. Everything is computed from stored records.
 */
export function buildInsights(companies: Company[], runs: ResearchRun[], limit = 6, alreadyActioned: Set<number> = new Set()): Insight[] {
  const out: Insight[] = [];
  const name = new Map(companies.map((c) => [c.id, c.company_name]));

  // Score movement and other changes recorded by refresh runs.
  const seen = new Set<number>();
  for (const r of runs) {
    if (r.status !== "success" || !r.changes.length || seen.has(r.company_id) || !name.has(r.company_id)) continue;
    if (Date.now() - new Date(r.created_at).getTime() > 14 * 864e5) continue;
    seen.add(r.company_id);
    const up = r.fit_score != null && r.prev_fit != null && r.fit_score - r.prev_fit >= 5;
    out.push({ kind: up ? "opportunity" : "change", company: { id: r.company_id, name: name.get(r.company_id)! }, title: up ? `Fit improved to ${r.fit_score}` : "Engineering profile changed", body: r.changes.join(" · "), evidence: `Detected on refresh ${relativeTime(r.created_at)}`, at: r.created_at, action: { label: "Open intelligence", href: `/accounts/${r.company_id}` } });
    if (seen.size >= 3) break;
  }

  // New public engineering signals: recent blog posts across the watchlist.
  const posts = companies.filter(hasData).flatMap((c) => (c.signals?.blog?.posts ?? []).filter((p) => p.date && daysSince(p.date) <= 14).map((p) => ({ c, p })))
    .sort((a, b) => +new Date(b.p.date!) - +new Date(a.p.date!));
  const byCompany = new Set<number>();
  for (const { c, p } of posts) {
    if (byCompany.has(c.id)) continue;
    byCompany.add(c.id);
    out.push({ kind: "signal", company: { id: c.id, name: c.company_name }, title: "New engineering blog post", body: `“${p.title}”`, evidence: `Published ${fmtDate(p.date!)} · ${c.signals!.blog!.postsLast90d} posts in the last 90 days`, at: p.date!, action: { label: "Open intelligence", href: `/accounts/${c.id}` } });
    if (byCompany.size >= 3) break;
  }

  // Failures that block fresh intelligence.
  for (const c of companies.filter((x) => x.status === "error" && !alreadyActioned.has(x.id)).slice(0, 2)) {
    out.push({ kind: "issue", company: { id: c.id, name: c.company_name }, title: "Research failed", body: c.error ?? "The last refresh did not complete.", evidence: hasData(c) ? `Still showing data from ${relativeTime(c.last_updated)}` : "No earlier data", action: { label: "Open to retry", href: `/accounts/${c.id}` } });
  }

  const order: Record<InsightKind, number> = { issue: 0, opportunity: 1, change: 2, signal: 3 };
  return out.sort((a, b) => order[a.kind] - order[b.kind] || +new Date(b.at ?? 0) - +new Date(a.at ?? 0)).slice(0, limit);
}
