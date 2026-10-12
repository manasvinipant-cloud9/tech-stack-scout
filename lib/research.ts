import { getCompany, saveIntel, setStatus } from "./db";
import { analyzeCompany } from "./gemini";
import { gatherSignals } from "./signals";
import type { FitReason } from "./types";

/** Fit = strength of sourced reasons ÷ 15 (5 reasons × max strength 3). Unsourced reasons score 0. */
export function computeFit(reasons: FitReason[]): number | null {
  if (!reasons.length) return null;
  const sum = reasons.filter((r) => r.source !== "none").reduce((n, r) => n + r.strength, 0);
  return Math.min(100, Math.round((sum / 15) * 100));
}

export async function researchCompany(id: number) {
  const c = await getCompany(id);
  if (!c) throw new Error("Company not found");
  await setStatus(id, "researching");
  try {
    const signals = await gatherSignals(c.company_name, c.domain, c.github_org);
    const intel = await analyzeCompany(c.company_name, c.domain, signals);

    const bytes = signals.github?.languageBytes ?? {};
    const languages = Object.entries(bytes).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([l]) => l);
    const infra = ["Cloud", "Orchestration", "CI/CD", "IaC", "Observability"];
    const infrastructure = intel.technologies.filter((t) => infra.includes(t.category)).map((t) => t.name).slice(0, 8);

    await saveIntel(id, {
      githubOrg: signals.github?.org ?? null,
      languages,
      infrastructure,
      activityLevel: intel.activity_level,
      activityNotes: intel.activity_notes,
      hiringRoles: signals.jobs?.engineeringOpen ?? null,
      hiringSource: signals.jobs?.source ?? null,
      summary: intel.summary,
      outreachHook: intel.outreach_hook,
      signals,
      fitScore: computeFit(intel.fit_reasons),
      analysis: {
        technologies: intel.technologies,
        cloud: intel.cloud,
        orchestration: intel.orchestration,
        fit_reasons: intel.fit_reasons,
        open_questions: intel.open_questions,
        architecture: intel.architecture,
      },
    });
    return await getCompany(id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await setStatus(id, "error", msg.slice(0, 500));
    throw e;
  }
}
