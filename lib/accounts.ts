import type { Company } from "./db";
import { checklist, matchCount, type CheckStatus } from "./checklist";
import { availableCount, isComplete } from "./coverage";
import { cloudOf, daysSince, fitCategory, hasData, isStale, primaryLanguage, reposActive, unsourcedCount, type FitCategory } from "./derive";

/** Serializable row for the Accounts table and the Overview lists. */
export type AccountRow = {
  id: number;
  name: string;
  domain: string;
  fit: number | null;
  fitCat: FitCategory;
  checks: { key: "cloud" | "microservices" | "language"; label: string; status: CheckStatus; value: string }[];
  match: number;
  cloud: string;
  language: string;
  roles: number | null;
  reposActive: number | null;
  activity: string | null;
  status: Company["status"];
  lastUpdated: string | null;
  ageDays: number | null;
  stale: boolean;
  complete: boolean;
  available: number;
  action: { text: string; tone: "bad" | "warn" | "neutral" | "good" };
};

export function toRow(c: Company): AccountRow {
  const checks = hasData(c) ? checklist(c) : [];
  const u = unsourcedCount(c);
  const action: AccountRow["action"] =
    c.status === "researching" ? { text: "Research running", tone: "neutral" }
    : c.status === "error" ? { text: "Retry research", tone: "bad" }
    : !hasData(c) ? { text: "Run first research", tone: "neutral" }
    : isStale(c) ? { text: "Refresh research", tone: "warn" }
    : u > 0 ? { text: `Source ${u} fit reason${u > 1 ? "s" : ""}`, tone: "warn" }
    : isComplete(c) && matchCount(c) >= 2 ? { text: "Prepare outreach", tone: "good" }
    : { text: "Review intelligence", tone: "neutral" };
  return {
    id: c.id, name: c.company_name, domain: c.domain,
    fit: c.fit_score, fitCat: fitCategory(c.fit_score),
    checks: checks.map((x) => ({ key: x.key, label: x.label, status: x.status, value: x.value })),
    match: hasData(c) ? matchCount(c) : 0,
    cloud: cloudOf(c), language: primaryLanguage(c),
    roles: c.hiring_roles, reposActive: reposActive(c), activity: c.activity_level,
    status: c.status, lastUpdated: c.last_updated,
    ageDays: c.last_updated ? daysSince(c.last_updated) : null,
    stale: isStale(c), complete: isComplete(c), available: hasData(c) ? availableCount(c) : 0,
    action,
  };
}

import { VIEWS, type ViewKey } from "./views";
export { VIEWS };
export type { ViewKey };

const viewTests: Record<ViewKey, (r: AccountRow) => boolean> = {
  all: () => true,
  strong: (r) => r.match === 3 || r.fitCat === "strong",
  ready: (r) => r.status === "ready" && r.complete && !r.stale && r.match >= 2,
  needs: (r) => r.status !== "researching" && (r.lastUpdated == null || r.status === "error" || r.stale),
  stale: (r) => r.stale,
};

export type Query = { q?: string; view?: string; icp?: string; fit?: string; status?: string; fresh?: string; cloud?: string; lang?: string; sort?: string; dir?: string };

export const parseView = (v?: string): ViewKey => (VIEWS.some((x) => x.key === v) ? (v as ViewKey) : "all");
export const viewCounts = (rows: AccountRow[]) => Object.fromEntries(VIEWS.map((v) => [v.key, rows.filter(viewTests[v.key]).length])) as Record<ViewKey, number>;

export function queryRows(rows: AccountRow[], p: Query): AccountRow[] {
  const q = p.q?.trim().toLowerCase();
  let out = rows.filter(viewTests[parseView(p.view)]);
  if (q) out = out.filter((r) => r.name.toLowerCase().includes(q) || r.domain.toLowerCase().includes(q));
  if (p.icp) out = out.filter((r) => (p.icp === "3" ? r.match === 3 : p.icp === "2" ? r.match >= 2 : p.icp === "1" ? r.match >= 1 : p.icp === "e2" ? r.match === 2 : p.icp === "e1" ? r.match === 1 : r.match === 0));
  if (p.fit) out = out.filter((r) => r.fitCat === p.fit);
  if (p.status) out = out.filter((r) => r.status === p.status);
  if (p.fresh) out = out.filter((r) => (p.fresh === "stale" ? r.stale : p.fresh === "never" ? r.lastUpdated == null : r.lastUpdated != null && !r.stale));
  if (p.cloud) out = out.filter((r) => r.cloud.toLowerCase() === p.cloud!.toLowerCase());
  if (p.lang) out = out.filter((r) => r.language.toLowerCase() === p.lang!.toLowerCase());
  const num = (n: number | null) => n ?? -1;
  const natural: Record<string, (a: AccountRow, b: AccountRow) => number> = {
    fit: (a, b) => num(a.fit) - num(b.fit),
    icp: (a, b) => a.match - b.match || num(a.fit) - num(b.fit),
    activity: (a, b) => num(a.roles) - num(b.roles) || num(a.reposActive) - num(b.reposActive),
    researched: (a, b) => (a.lastUpdated ? +new Date(a.lastUpdated) : 0) - (b.lastUpdated ? +new Date(b.lastUpdated) : 0),
    name: (a, b) => a.name.localeCompare(b.name),
  };
  const key = p.sort && natural[p.sort] ? p.sort : "icp";
  const d = (p.dir ?? (key === "name" ? "asc" : "desc")) === "asc" ? 1 : -1;
  return [...out].sort((a, b) => d * natural[key](a, b));
}
