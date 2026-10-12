import type { Company } from "./db";
import { matchCount } from "./checklist";
import { isComplete } from "./coverage";
import { daysSince, hasData, isStale, relativeTime, unsourcedCount, whyLine } from "./derive";
import { toRow, type AccountRow } from "./accounts";

export type ActionKind = "outreach" | "evidence" | "review" | "refresh";
export type NextAction = {
  kind: ActionKind;
  row: AccountRow;
  reason: string;
  freshness: string;
  cta: { label: string; href: string };
  secondary?: { label: string; href: string };
};

const LABEL: Record<ActionKind, string> = { outreach: "Ready for outreach", evidence: "Complete fit evidence", review: "Review fit", refresh: "Refresh research" };
export const actionLabel = (k: ActionKind) => LABEL[k];

/**
 * A prioritised work queue, not a leaderboard: what the salesperson should do next and why.
 * Order of value: outreach-ready accounts, then evidence gaps on promising accounts, then broken or outdated research.
 */
export function buildNextActions(companies: Company[], limit = 6): NextAction[] {
  const items: (NextAction & { score: number })[] = [];
  for (const c of companies) {
    const row = toRow(c);
    const fresh = hasData(c) ? `Researched ${relativeTime(c.last_updated)}` : "Never researched";

    if (c.status === "error" || (!hasData(c) && c.status !== "researching")) {
      items.push({ kind: "refresh", row, score: 40 + (row.fit ?? 0) / 10, freshness: c.status === "error" ? "Last refresh failed" : fresh,
        reason: c.status === "error" ? (c.error ?? "The last research run did not complete.") : "Added to the watchlist but not researched yet.",
        cta: { label: c.status === "error" ? "Retry research" : "Run research", href: `/accounts/${c.id}` } });
      continue;
    }
    if (!hasData(c)) continue;
    if (isStale(c)) {
      items.push({ kind: "refresh", row, score: 35 + (row.fit ?? 0) / 10, freshness: `${daysSince(c.last_updated!)} days old`, reason: `Last researched ${daysSince(c.last_updated!)} days ago, so its facts may have moved.`, cta: { label: "Refresh research", href: `/accounts/${c.id}` } });
      continue;
    }
    const m = matchCount(c);
    const u = unsourcedCount(c);
    if (c.status === "ready" && isComplete(c) && m >= 2 && u === 0) {
      items.push({ kind: "outreach", row, score: 100 + m * 12 + (row.fit ?? 0), freshness: fresh, reason: whyLine(c), cta: { label: "Prepare outreach", href: `/outreach?company=${c.id}` }, secondary: { label: "Open intelligence", href: `/accounts/${c.id}` } });
    } else if (u > 0 && (row.fit ?? 0) >= 50) {
      const r = c.analysis?.fit_reasons.find((x) => x.source === "none");
      items.push({ kind: "evidence", row, score: 70 + m * 8 + (row.fit ?? 0) / 2, freshness: fresh, reason: `“${r?.context ?? "A fit reason"}” has no public source, so it scores 0 toward fit.`, cta: { label: "Review fit evidence", href: `/accounts/${c.id}` } });
    } else if (m >= 2 && !isComplete(c)) {
      items.push({ kind: "review", row, score: 60 + m * 8 + (row.fit ?? 0) / 2, freshness: fresh, reason: `Matches ${m} of 3 ICP criteria, but only ${row.available} of 6 research signals were found. Check before relying on it.`, cta: { label: "Review fit evidence", href: `/accounts/${c.id}` } });
    }
  }
  // Pick the best from each kind first so the queue stays varied, then fill by score.
  const byKind = (k: ActionKind) => items.filter((i) => i.kind === k).sort((a, b) => b.score - a.score);
  const picked: typeof items = [...byKind("outreach").slice(0, 3), ...byKind("evidence").slice(0, 1), ...byKind("review").slice(0, 1), ...byKind("refresh").slice(0, 1)];
  const rest = items.filter((i) => !picked.includes(i)).sort((a, b) => b.score - a.score);
  return [...picked, ...rest].slice(0, limit).sort((a, b) => b.score - a.score).map(({ score: _s, ...a }) => a);
}
