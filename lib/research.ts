import { getCompany, saveIntel, setStatus } from "./db";
import { analyzeCompany } from "./gemini";
import { gatherSignals } from "./signals";
import type { FitReason } from "./types";

const withTimeout = <T,>(p: Promise<T>, ms: number, what: string): Promise<T> =>
  Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error(`${what} timed out after ${ms / 1000}s`)), ms))]);

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
    const t0 = Date.now();
    const signals = await withTimeout(gatherSignals(c.company_name, c.domain, c.github_org), 75_000, "Collecting signals");
    console.log(`[research] ${c.company_name}: signals ${Date.now() - t0}ms (github=${!!signals.github} jobs=${!!signals.jobs} blog=${!!signals.blog})`);
    const intel = await withTimeout(analyzeCompany(c.company_name, c.domain, signals), 150_000, "Gemini analysis");
    console.log(`[research] ${c.company_name}: total ${Date.now() - t0}ms`);

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
    const raw = e instanceof Error ? e.message : String(e);
    const msg = /"code":\s*402|PAYMENT_REQUIRED|insufficient credits/i.test(raw)
      ? "AI credits exhausted (OpenRouter). Previous data is kept; add credits and retry."
      : /"code":\s*401|API key not valid|invalid api key|User not found/i.test(raw)
        ? "The AI API key was rejected. Check OPENROUTER_API_KEY (or GEMINI_API_KEY) in the environment."
      : /RESOURCE_EXHAUSTED|"code":\s*429|quota/i.test(raw)
      ? "AI quota or rate limit reached. Previous data is kept; retry shortly, or use a key with billing enabled."
      : /UNAVAILABLE|"code":\s*503|high demand/i.test(raw)
        ? "Gemini is overloaded right now. Previous data is kept; retry in a few minutes."
        : raw;
    await setStatus(id, "error", msg.slice(0, 500));
    throw e;
  }
}
