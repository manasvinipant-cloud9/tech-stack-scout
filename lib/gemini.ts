import { generate, type JsonSchema } from "./llm";
import type { Signals } from "./signals";
import type { Analysis, FitReason, Source, Tech } from "./types";

export type Intel = {
  technologies: Tech[];
  cloud: string;
  orchestration: string;
  fit_reasons: FitReason[];
  open_questions: string[];
  architecture?: Analysis["architecture"];
  activity_level: "Low" | "Moderate" | "High" | "Very High";
  activity_notes: string;
  summary: string;
  outreach_hook: string;
  hook_signal: string;
  hook_source: Source;
};

const str = { type: "string" };
const SOURCES = ["github", "website", "jobs", "blog", "none"];
const arr = (items: object, description?: string) => ({ type: "array", items, ...(description ? { description } : {}) });
const obj = (properties: Record<string, object>, description?: string) => ({
  type: "object", properties, required: Object.keys(properties), additionalProperties: false, ...(description ? { description } : {}),
});

const schema: JsonSchema = obj({
  technologies: arr(
    obj({
      name: str,
      category: { type: "string", enum: ["Language", "Cloud", "Orchestration", "CI/CD", "Build", "IaC", "Framework", "Observability", "Data", "Security", "Other"] },
      status: { type: "string", enum: ["confirmed", "inferred"] },
      evidence: { ...str, description: "Short, number-first evidence, e.g. 'GitHub · 61% of code' or '3 job posts mention it'" },
      source: { type: "string", enum: SOURCES },
      relevance: { type: "string", enum: ["High", "Medium", "Low"], description: "Relevance to what WE sell" },
    }),
    "Every technology evidenced or plausibly implied by the signals (max 16)"
  ),
  cloud: { ...str, description: "Primary cloud provider or 'Unknown'" },
  orchestration: { ...str, description: "Primary orchestration/runtime platform or 'Unknown'" },
  fit_reasons: arr(
    obj({
      context: { ...str, description: "Account attribute, number-first" },
      capability: { ...str, description: "The product capability that addresses it" },
      strength: { type: "integer", description: "1 weak, 2 good, 3 direct" },
      source: { type: "string", enum: SOURCES, description: "'none' if this is inference without direct evidence" },
      evidence: str,
    }),
    "Exactly 5 reasons our product fits this account, or an empty array if we have no product description"
  ),
  architecture: obj(
    {
      style: { type: "string", enum: ["microservices", "monolith", "mixed", "unknown"] },
      evidence: { ...str, description: "Number-first evidence, e.g. '14 of 60 repos are services; 6 job posts mention microservices'" },
      source: { type: "string", enum: SOURCES },
    },
    "Is the engineering org running microservices?"
  ),
  open_questions: arr(str, "Exactly 3 discovery questions an AE should ask"),
  activity_level: { type: "string", enum: ["Low", "Moderate", "High", "Very High"] },
  activity_notes: { ...str, description: "One sentence justifying the level with concrete numbers" },
  summary: { ...str, description: "Exactly two paragraphs separated by a blank line" },
  outreach_hook: { ...str, description: "One sentence, the opening line of a cold email" },
  hook_signal: { ...str, description: "The specific, verifiable engineering observation (number-first) that the opening line is built on" },
  hook_source: { type: "string", enum: SOURCES, description: "Where that observation came from" },
});

export async function analyzeCompany(name: string, domain: string, signals: Signals): Promise<Intel> {
  const gh = signals.github;
  const totalBytes = gh ? Object.values(gh.languageBytes).reduce((a, b) => a + b, 0) : 0;
  const langShare = gh
    ? Object.entries(gh.languageBytes).sort((a, b) => b[1] - a[1]).slice(0, 10)
        .map(([l, b]) => ({ language: l, percent: Math.round((b / totalBytes) * 1000) / 10 }))
    : null;

  const pitch = process.env.PRODUCT_PITCH?.trim();
  const product = process.env.PRODUCT_NAME?.trim() || "our product";
  const prompt = `You are a sales-engineering analyst preparing an enterprise account executive for a call with ${name} (${domain}).

Rules: use ONLY the evidence below. Never invent specifics. Lead every statement with a number where one exists. A technology is "confirmed" only when a signal directly shows it (a repo language, a job post, a script host, a response header); otherwise mark it "inferred". Set "source" to where the evidence came from (github, website, jobs = job boards and their descriptions, blog = engineering blog posts), or "none" when it is pure inference.

EVIDENCE (JSON):
${JSON.stringify({ github: gh && { ...gh, languageBytes: undefined, languageShare: langShare }, website: signals.site, hiring: signals.jobs, engineeringBlog: signals.blog }, null, 1)}

${pitch ? `WHAT WE SELL (${product}): ${pitch}` : "We have not described our product, so return an empty fit_reasons array."}

Produce:
- technologies: languages, cloud, orchestration, CI/CD, IaC, observability, data and security tools. Put languages in category "Language". Do not list generic words. Rate relevance to what we sell.
- cloud / orchestration: the primary one, or "Unknown". Use hiring.toolMentions (how many scanned job descriptions mention each tool) and blog titles as evidence too.
- architecture: "microservices" only if the evidence shows it (many service-style repos, orchestration tooling, job descriptions or blog posts mentioning microservices); "monolith" only with explicit evidence; otherwise "unknown". Cite numbers.
- fit_reasons: exactly 5 pairs of (account attribute → our capability). Be strict: use source "none" when the attribute is not directly evidenced, so it will not count toward the score.
- open_questions: exactly 3 discovery questions that the evidence cannot answer.
- activity_level + activity_notes: justified with repos pushed in 90 days, repo count and open engineering roles (cite notable titles). If there is no hiring data, say so.
- summary: exactly two paragraphs. P1: what they build and how. P2: what the activity implies and which evidence gaps the AE should probe.
- hook_signal / hook_source: the exact engineering observation the opening line relies on and where it came from (github, website, jobs, blog). It must be directly supported by the evidence.
- outreach_hook: ONE specific opening sentence, STRICT maximum 28 words, referencing a concrete detail from the evidence${pitch ? " and connecting it to what we sell" : ""}. No greetings, no "I came across", no flattery.`;

  const text = await generate(prompt, { temperature: 0.5, schema, effort: "low" });
  const out = JSON.parse(text) as Intel;
  out.outreach_hook = await tightenHook(out.outreach_hook);
  return sanitize(out, signals, Boolean(pitch));
}

/** A claim can't cite a source we never collected; downgrade it so it can't inflate the fit score. */
function sanitize(out: Intel, s: Signals, hasPitch: boolean): Intel {
  const have: Record<Source, boolean> = { github: !!s.github, website: !!s.site, jobs: !!s.jobs, blog: !!s.blog, none: true };
  const fix = <T extends { source: Source }>(x: T): T => (have[x.source] ? x : { ...x, source: "none" as Source });
  return {
    ...out,
    technologies: (out.technologies ?? []).slice(0, 16).map((t) => {
      const f = fix(t);
      return f.source === "none" ? { ...f, status: "inferred" as const } : f;
    }),
    fit_reasons: hasPitch
      ? (out.fit_reasons ?? []).slice(0, 5).map((r) => ({ ...fix(r), strength: Math.min(3, Math.max(1, Math.round(r.strength))) as 1 | 2 | 3 }))
      : [],
    open_questions: (out.open_questions ?? []).slice(0, 3),
    architecture: out.architecture ? fix(out.architecture) : undefined,
    hook_source: have[out.hook_source] ? out.hook_source : ("none" as Source),
  };
}

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/** The model sometimes overshoots the length limit; ask once for a shorter rewrite and fall back to the original. */
async function tightenHook(hook: string): Promise<string> {
  if (words(hook) <= 32) return hook;
  try {
    const t = (
      await generate(`Rewrite this cold-email opening line in at most 25 words. Keep the most specific concrete detail and the link to the product. Return only the sentence.\n\n${hook}`, { temperature: 0.3, effort: "minimal" })
    ).trim().replace(/^["']|["']$/g, "");
    return t && words(t) <= 32 ? t : hook;
  } catch {
    return hook;
  }
}
