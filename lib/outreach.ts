import type { Company } from "./db";
import { facts, fmtDate } from "./derive";
import { generate, type JsonSchema } from "./llm";
import type { Source } from "./types";

const SOURCES = ["github", "website", "jobs", "blog", "none"];
const schema: JsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["line", "signal", "source"],
  properties: {
    line: { type: "string", description: "One opening sentence for a cold email, maximum 28 words" },
    signal: { type: "string", description: "The specific, verifiable engineering observation (number-first) the line is built on" },
    source: { type: "string", enum: SOURCES, description: "Where that observation came from" },
  },
};

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/** Writes a fresh opening line grounded in one verified signal. `avoid` is the current line, so regenerating gives something different. */
export async function generateOpening(c: Company, avoid?: string | null): Promise<{ line: string; signal: string; source: Source }> {
  const a = c.analysis;
  const g = c.signals?.github;
  const evidence = {
    facts: facts(c),
    confirmedTechnologies: a?.technologies.filter((t) => t.status === "confirmed").map((t) => ({ name: t.name, category: t.category, evidence: t.evidence, source: t.source })),
    sourcedFitReasons: a?.fit_reasons.filter((r) => r.source !== "none").map((r) => ({ attribute: r.context, capability: r.capability, source: r.source })),
    architecture: a?.architecture,
    recentRepositories: g?.recentRepos.slice(0, 5).map((r) => ({ name: r.name, language: r.language, pushed: fmtDate(r.pushed_at) })),
    engineeringBlogPosts: c.signals?.blog?.posts.slice(0, 4).map((p) => ({ title: p.title, date: p.date && fmtDate(p.date) })),
    jobDescriptionToolMentions: c.signals?.jobs?.toolMentions.slice(0, 6),
    openEngineeringRoleTitles: c.signals?.jobs?.sampleTitles.slice(0, 5),
  };
  const pitch = process.env.PRODUCT_PITCH?.trim();
  const prompt = `You help an enterprise account executive${pitch ? ` selling: ${pitch}` : ""} open a first conversation with ${c.company_name} (${c.domain}).

Write ONE opening line for a cold email. Rules:
- Build it on exactly ONE specific, verifiable engineering observation from the evidence below. Do not invent anything.
- Mention the observation concretely (a number, a repo, a role, a blog post, a tool), then connect it to why a developer productivity tool could matter. No flattery, no "I came across", no greeting, no template feel.
- Maximum 28 words.
${avoid ? `- It must be different from this previous line, ideally based on a different observation: "${avoid}"\n` : ""}
Return the line, the observation it relies on, and the source of that observation (github, website, jobs, blog). Use "none" only if nothing in the evidence supports it.

EVIDENCE (JSON):
${JSON.stringify(evidence, null, 1)}`;

  const out = JSON.parse(await generate(prompt, { temperature: 0.8, schema, effort: "low" })) as { line: string; signal: string; source: Source };
  const have: Record<Source, boolean> = { github: !!c.signals?.github, website: !!c.signals?.site, jobs: !!c.signals?.jobs, blog: !!c.signals?.blog, none: true };
  let line = out.line.trim().replace(/^["']|["']$/g, "");
  if (words(line) > 32) {
    const t = (await generate(`Rewrite this cold-email opening line in at most 25 words, keeping the most specific concrete detail. Return only the sentence.\n\n${line}`, { temperature: 0.3, effort: "minimal" }).catch(() => "")).trim().replace(/^["']|["']$/g, "");
    if (t && words(t) <= 32) line = t;
  }
  return { line, signal: out.signal.trim(), source: have[out.source] ? out.source : "none" };
}
