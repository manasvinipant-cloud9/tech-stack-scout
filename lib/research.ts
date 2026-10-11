import { getCompany, saveIntel, setStatus } from "./db";
import { analyzeCompany } from "./gemini";
import { gatherSignals } from "./signals";

export async function researchCompany(id: number) {
  const c = await getCompany(id);
  if (!c) throw new Error("Company not found");
  await setStatus(id, "researching");
  try {
    const signals = await gatherSignals(c.company_name, c.domain, c.github_org);
    const intel = await analyzeCompany(c.company_name, c.domain, signals);
    await saveIntel(id, {
      githubOrg: signals.github?.org ?? null,
      languages: intel.languages,
      infrastructure: intel.infrastructure,
      activityLevel: intel.activity_level,
      activityNotes: intel.activity_notes,
      summary: intel.summary,
      outreachHook: intel.outreach_hook,
      signals,
    });
    return await getCompany(id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await setStatus(id, "error", msg.slice(0, 500));
    throw e;
  }
}
