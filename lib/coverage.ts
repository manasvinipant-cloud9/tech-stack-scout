import type { Company } from "./db";
import { hasData } from "./derive";

export type SignalKey = "github" | "repos" | "hiring" | "blog" | "website" | "stack";
export type SignalState = "available" | "partial" | "missing" | "pending";

export const SIGNALS: { key: SignalKey; label: string; short: string; hint: string }[] = [
  { key: "github", label: "GitHub organization", short: "GitHub org", hint: "A public GitHub organization was found for the company" },
  { key: "repos", label: "Public repository activity", short: "Repo activity", hint: "Repositories pushed to in the last 90 days" },
  { key: "hiring", label: "Hiring and job descriptions", short: "Hiring", hint: "Open engineering roles, with their descriptions read for tool mentions" },
  { key: "blog", label: "Engineering blog", short: "Eng blog", hint: "An engineering blog feed with recent posts" },
  { key: "website", label: "Website fingerprint", short: "Website", hint: "Headers, script hosts and technology hints from the homepage" },
  { key: "stack", label: "Technology stack", short: "Stack", hint: "Technologies identified, and how many are directly confirmed" },
];

/**
 * "missing" means we did not find it, which is not proof the company lacks it (private repos, other job boards, no public blog).
 * "pending" means the account has not been researched yet.
 */
export function signalStates(c: Company): Record<SignalKey, SignalState> {
  if (!hasData(c)) return { github: "pending", repos: "pending", hiring: "pending", blog: "pending", website: "pending", stack: "pending" };
  const g = c.signals?.github;
  const j = c.signals?.jobs;
  const techs = c.analysis?.technologies ?? [];
  const confirmed = techs.filter((t) => t.status === "confirmed").length;
  return {
    github: g ? "available" : "missing",
    repos: !g ? "missing" : g.reposPushedLast90d > 0 ? "available" : "partial",
    hiring: !j ? "missing" : (j.descriptionsScanned ?? 0) > 0 ? "available" : "partial",
    blog: c.signals?.blog?.posts?.length ? "available" : "missing",
    website: c.signals?.site ? "available" : "missing",
    stack: techs.length === 0 ? "missing" : confirmed >= 3 ? "available" : "partial",
  };
}

export const availableCount = (c: Company) => Object.values(signalStates(c)).filter((s) => s === "available").length;
/** Enough independent evidence to rely on the intelligence: at least 4 of the 6 signals fully available. */
export const isComplete = (c: Company) => hasData(c) && availableCount(c) >= 4;
