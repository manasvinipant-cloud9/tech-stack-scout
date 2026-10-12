import type { Company } from "./db";
import { icp } from "./icp";
import { langShare } from "./derive";

export type CheckStatus = "met" | "partial" | "unmet" | "unknown";
export type Check = { key: "cloud" | "microservices" | "language"; label: string; status: CheckStatus; value: string; evidence: string; target: string };

const CLOUD_ALIASES: Record<string, RegExp> = {
  aws: /\baws\b|amazon web services|\beks\b/i,
  gcp: /\bgcp\b|google cloud|\bgke\b/i,
  azure: /\bazure\b|\baks\b/i,
};
const cloudMatcher = (target: string) => CLOUD_ALIASES[target.toLowerCase()] ?? new RegExp(`\\b${target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");

/** The brief's three relevance contexts, evaluated deterministically from the stored analysis and signals. */
export function checklist(c: Company): Check[] {
  const { clouds, languages } = icp();
  const a = c.analysis;
  const j = c.signals?.jobs;

  // Cloud
  const cloudTechs = a?.technologies.filter((t) => t.category === "Cloud") ?? [];
  const names = [a?.cloud, ...cloudTechs.map((t) => t.name)].filter((n): n is string => !!n && !/^unknown$/i.test(n));
  const matched = clouds.find((t) => names.some((n) => cloudMatcher(t).test(n)) || (j?.toolMentions ?? []).some((m) => cloudMatcher(t).test(m.name)));
  let cloud: Check;
  if (matched) {
    const tech = cloudTechs.find((t) => cloudMatcher(matched).test(t.name));
    const jobHit = j?.toolMentions.find((m) => cloudMatcher(matched).test(m.name));
    const sourced = (tech && tech.status === "confirmed" && tech.source !== "none") || !!jobHit;
    cloud = { key: "cloud", label: "Cloud platform", status: sourced ? "met" : "partial", value: matched,
      evidence: jobHit ? `${jobHit.postings} of ${j!.descriptionsScanned} job posts mention it` : tech?.evidence ?? "Inferred from the stack", target: clouds.join(" / ") };
  } else if (names.length) {
    cloud = { key: "cloud", label: "Cloud platform", status: "unmet", value: names[0], evidence: "Not one of the target clouds", target: clouds.join(" / ") };
  } else {
    cloud = { key: "cloud", label: "Cloud platform", status: "unknown", value: "—", evidence: "No cloud evidence found", target: clouds.join(" / ") };
  }

  // Microservices
  const arch = a?.architecture;
  const msJobs = j?.microservicesMentions ?? 0;
  let ms: Check;
  if (!arch || arch.style === "unknown") {
    ms = msJobs >= 2
      ? { key: "microservices", label: "Microservices", status: "partial", value: "Likely", evidence: `${msJobs} job posts mention microservices`, target: "Microservices" }
      : { key: "microservices", label: "Microservices", status: "unknown", value: "—", evidence: "No architecture evidence found", target: "Microservices" };
  } else if (arch.style === "microservices") {
    const sourced = arch.source !== "none" || msJobs >= 2;
    ms = { key: "microservices", label: "Microservices", status: sourced ? "met" : "partial", value: "Microservices", evidence: arch.evidence || `${msJobs} job posts mention it`, target: "Microservices" };
  } else if (arch.style === "mixed") {
    ms = { key: "microservices", label: "Microservices", status: "partial", value: "Mixed", evidence: arch.evidence, target: "Microservices" };
  } else {
    ms = { key: "microservices", label: "Microservices", status: "unmet", value: "Monolith", evidence: arch.evidence, target: "Microservices" };
  }

  // Language
  const shares = langShare(c).filter((l) => l.name !== "Other");
  const hits = shares.filter((l) => languages.some((t) => t.toLowerCase() === l.name.toLowerCase()));
  let lang: Check;
  if (!shares.length) {
    lang = { key: "language", label: "Language", status: "unknown", value: "—", evidence: "No public code found", target: languages.join(" / ") };
  } else if (hits.length) {
    const top = hits[0];
    lang = { key: "language", label: "Language", status: top.pct >= 25 ? "met" : "partial", value: `${top.name} ${top.pct}%`,
      evidence: `${top.pct}% of public code · GitHub`, target: languages.join(" / ") };
  } else {
    lang = { key: "language", label: "Language", status: "unmet", value: `${shares[0].name} ${shares[0].pct}%`, evidence: "Primary language is not a target", target: languages.join(" / ") };
  }
  return [cloud, ms, lang];
}

export const matchCount = (c: Company) => checklist(c).filter((x) => x.status === "met").length;
