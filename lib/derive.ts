import type { Company } from "./db";
import type { Source, Tech } from "./types";

export const STALE_DAYS = 30;

export const SOURCE_LABEL: Record<Source, string> = { github: "GitHub", website: "Website", jobs: "Job board", none: "No source" };

export const daysSince = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);
export const isStale = (c: Company) => (c.last_updated ? daysSince(c.last_updated) > STALE_DAYS : false);
export const hasData = (c: Company) => Boolean(c.last_updated);

export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
export const fmtDateYear = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export function langShare(c: Company): { name: string; pct: number }[] {
  const bytes = c.signals?.github?.languageBytes ?? {};
  const total = Object.values(bytes).reduce((a, b) => a + b, 0);
  if (!total) return [];
  const sorted = Object.entries(bytes).sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 4).map(([name, b]) => ({ name, pct: Math.round((b / total) * 100) }));
  const rest = 100 - top.reduce((n, t) => n + t.pct, 0);
  return rest > 0 && sorted.length > 4 ? [...top, { name: "Other", pct: rest }] : top;
}

export const primaryLanguage = (c: Company) => langShare(c)[0]?.name ?? "—";
export const cloudOf = (c: Company) => (c.analysis?.cloud && c.analysis.cloud !== "Unknown" ? c.analysis.cloud : "—");
export const orchOf = (c: Company) => (c.analysis?.orchestration && c.analysis.orchestration !== "Unknown" ? c.analysis.orchestration : "—");
export const reposActive = (c: Company) => c.signals?.github?.reposPushedLast90d ?? null;

export const sourcedCount = (c: Company) => c.analysis?.fit_reasons.filter((r) => r.source !== "none").length ?? 0;
export const unsourcedCount = (c: Company) => c.analysis?.fit_reasons.filter((r) => r.source === "none").length ?? 0;

export const findTech = (c: Company, name: string): Tech | undefined =>
  c.analysis?.technologies.find((t) => t.name.toLowerCase() === name.toLowerCase());

/** Number-first facts computed from collected signals, never written by the model. */
export function facts(c: Company): string[] {
  const out: string[] = [];
  const g = c.signals?.github;
  if (g) out.push(`${g.publicRepos} public repos · ${g.reposPushedLast90d} pushed in 90d · ${g.totalStars.toLocaleString("en-US")} stars`);
  const ls = langShare(c).filter((l) => l.name !== "Other").slice(0, 3);
  if (ls.length) out.push(ls.map((l) => `${l.name} ${l.pct}%`).join(" · "));
  const j = c.signals?.jobs;
  if (j) out.push(`${j.engineeringOpen} open eng roles of ${j.totalOpen} (${j.source})`);
  const h = c.signals?.site?.hints ?? [];
  if (h.length) out.push(`Website hints: ${h.slice(0, 4).join(" · ")}`);
  if (c.fit_score != null) out.push(`Fit ${c.fit_score} · ${sourcedCount(c)} sourced, ${unsourcedCount(c)} unsourced reasons`);
  return out;
}
