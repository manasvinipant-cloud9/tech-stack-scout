import type { Company } from "./db";
import type { Source, Tech } from "./types";

// Research refreshes weekly (vercel.json). The staleness threshold is a saved setting; the server loads it before rendering.
let _staleDays = 7;
export const staleDays = () => _staleDays;
export const setStaleDays = (n: number) => { _staleDays = Math.min(60, Math.max(1, Math.round(n))); };

export const SOURCE_LABEL: Record<Source, string> = { github: "GitHub", website: "Website", jobs: "Job board", blog: "Eng blog", none: "No source" };

export const daysSince = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);
export const isStale = (c: Company) => (c.last_updated ? daysSince(c.last_updated) > _staleDays : false);
export const hasData = (c: Company) => Boolean(c.last_updated);

export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
export const fmtDateYear = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

// Docs, markup and glue are not what a team "builds in"; exclude them from the language share.
const NOT_CODE = new Set(["MDX", "Markdown", "HTML", "CSS", "SCSS", "Shell", "Dockerfile", "Makefile", "Jupyter Notebook", "Nix", "PowerShell", "Batchfile"]);

export function langShare(c: Company): { name: string; pct: number }[] {
  const bytes = Object.fromEntries(Object.entries(c.signals?.github?.languageBytes ?? {}).filter(([l]) => !NOT_CODE.has(l)));
  const total = Object.values(bytes).reduce((a, b) => a + b, 0);
  if (!total) return [];
  const sorted = Object.entries(bytes).sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 4).map(([name, b]) => ({ name, pct: Math.round((b / total) * 100) }));
  const rest = 100 - top.reduce((n, t) => n + t.pct, 0);
  return rest > 0 && sorted.length > 4 ? [...top, { name: "Other", pct: rest }] : top;
}

export const primaryLanguage = (c: Company) => langShare(c)[0]?.name ?? "—";
const known = (v?: string) => (v && !/^unknown$/i.test(v.trim()) ? v : null);
/** One name per cloud, so "Google Cloud", "GCP" and "Google Cloud Platform" count as the same thing in filters and charts. */
export function canonCloud(name: string): string {
  const n = name.trim();
  if (/^(aws|amazon web services|amazon aws)\b/i.test(n)) return "AWS";
  if (/^(gcp|google cloud|google cloud platform)\b/i.test(n)) return "GCP";
  if (/^(azure|microsoft azure)\b/i.test(n)) return "Azure";
  if (/^oracle/i.test(n)) return "Oracle Cloud";
  return n;
}
// The model sometimes answers "Unknown" even though its own inventory lists a cloud/orchestration tool; fall back to that.
export const cloudOf = (c: Company) => { const v = known(c.analysis?.cloud) ?? c.analysis?.technologies.find((t) => t.category === "Cloud")?.name; return v ? canonCloud(v) : "—"; };
export const orchOf = (c: Company) => known(c.analysis?.orchestration) ?? c.analysis?.technologies.find((t) => t.category === "Orchestration")?.name ?? "—";
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
  if (j && j.descriptionsScanned > 0 && j.toolMentions.length) {
    out.push(`In ${j.descriptionsScanned} job descriptions: ${j.toolMentions.slice(0, 4).map((m) => `${m.name} ${m.postings}`).join(" · ")}`);
  }
  const b = c.signals?.blog;
  if (b) out.push(`Eng blog: ${b.posts.length} recent posts · ${b.postsLast90d} in the last 90d`);
  const h = c.signals?.site?.hints ?? [];
  if (h.length) out.push(`Website hints: ${h.slice(0, 4).join(" · ")}`);
  if (c.fit_score != null) out.push(`Fit ${c.fit_score} · ${sourcedCount(c)} sourced, ${unsourcedCount(c)} unsourced reasons`);
  return out;
}

// ---------- presentation helpers ----------
export type FitCategory = "strong" | "good" | "moderate" | "low" | "unscored";
export const FIT_CATEGORIES: { key: FitCategory; label: string; range: string }[] = [
  { key: "strong", label: "Strong", range: "80+" },
  { key: "good", label: "Good", range: "60–79" },
  { key: "moderate", label: "Moderate", range: "40–59" },
  { key: "low", label: "Low", range: "below 40" },
  { key: "unscored", label: "Unscored", range: "no score" },
];
export const fitCategory = (n: number | null): FitCategory => (n == null ? "unscored" : n >= 80 ? "strong" : n >= 60 ? "good" : n >= 40 ? "moderate" : "low");

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "Never";
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h > 1 ? "s" : ""} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d > 1 ? "s" : ""} ago`;
}

/** Public pages behind the findings, so every claim can be inspected. */
export function sourceLinks(c: Company): { key: Source; label: string; url: string }[] {
  const out: { key: Source; label: string; url: string }[] = [];
  const g = c.signals?.github;
  if (g) out.push({ key: "github", label: `github.com/${g.org}`, url: g.url });
  const j = c.signals?.jobs;
  if (j) {
    const base = j.source === "Greenhouse" ? "https://boards.greenhouse.io/" : j.source === "Lever" ? "https://jobs.lever.co/" : "https://jobs.ashbyhq.com/";
    out.push({ key: "jobs", label: `${j.source} · ${j.board}`, url: base + j.board });
  }
  const b = c.signals?.blog;
  if (b) out.push({ key: "blog", label: b.url.replace(/^https?:\/\//, "").replace(/\/$/, ""), url: b.url });
  if (c.signals?.site) out.push({ key: "website", label: c.domain, url: `https://${c.domain}` });
  return out;
}
export const sourceUrl = (c: Company, s: Source) => sourceLinks(c).find((l) => l.key === s)?.url ?? null;

/** One evidence-backed sentence on why an account is relevant: the strongest sourced fit reason, else the first computed fact. */
export function whyLine(c: Company): string {
  const best = [...(c.analysis?.fit_reasons ?? [])].filter((r) => r.source !== "none").sort((a, b) => b.strength - a.strength)[0];
  if (best) return `${best.context} → ${best.capability}`;
  return facts(c)[0] ?? "Research is available, but no sourced fit reason was found yet.";
}
