import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
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
};

const MODEL = () => process.env.GEMINI_MODEL || "gemini-3.8-flash";
// Second Flash model tried when the first is overloaded. Both are Gemini Flash, as the brief requires.
const FALLBACK_MODEL = () => process.env.GEMINI_FALLBACK_MODEL || "gemini-flash-latest";
const str = { type: Type.STRING };
const SOURCES = ["github", "website", "jobs", "blog", "none"];

const schema = {
  type: Type.OBJECT,
  properties: {
    technologies: {
      type: Type.ARRAY,
      description: "Every technology evidenced or plausibly implied by the signals (max 16)",
      items: {
        type: Type.OBJECT,
        properties: {
          name: str,
          category: { type: Type.STRING, enum: ["Language", "Cloud", "Orchestration", "CI/CD", "Build", "IaC", "Framework", "Observability", "Data", "Security", "Other"] },
          status: { type: Type.STRING, enum: ["confirmed", "inferred"] },
          evidence: { ...str, description: "Short, number-first evidence, e.g. 'GitHub · 61% of code' or '3 job posts mention it'" },
          source: { type: Type.STRING, enum: SOURCES },
          relevance: { type: Type.STRING, enum: ["High", "Medium", "Low"], description: "Relevance to what WE sell" },
        },
        required: ["name", "category", "status", "evidence", "source", "relevance"],
      },
    },
    cloud: { ...str, description: "Primary cloud provider or 'Unknown'" },
    orchestration: { ...str, description: "Primary orchestration/runtime platform or 'Unknown'" },
    fit_reasons: {
      type: Type.ARRAY,
      description: "Exactly 5 reasons our product fits this account, or an empty array if we have no product description",
      items: {
        type: Type.OBJECT,
        properties: {
          context: { ...str, description: "Account attribute, number-first" },
          capability: { ...str, description: "The product capability that addresses it" },
          strength: { type: Type.INTEGER, description: "1 weak, 2 good, 3 direct" },
          source: { type: Type.STRING, enum: SOURCES, description: "'none' if this is inference without direct evidence" },
          evidence: str,
        },
        required: ["context", "capability", "strength", "source", "evidence"],
      },
    },
    architecture: {
      type: Type.OBJECT,
      description: "Is the engineering org running microservices?",
      properties: {
        style: { type: Type.STRING, enum: ["microservices", "monolith", "mixed", "unknown"] },
        evidence: { ...str, description: "Number-first evidence, e.g. '14 of 60 repos are services; 6 job posts mention microservices'" },
        source: { type: Type.STRING, enum: SOURCES },
      },
      required: ["style", "evidence", "source"],
    },
    open_questions: { type: Type.ARRAY, items: str, description: "Exactly 3 discovery questions an AE should ask" },
    activity_level: { type: Type.STRING, enum: ["Low", "Moderate", "High", "Very High"] },
    activity_notes: { ...str, description: "One sentence justifying the level with concrete numbers" },
    summary: { ...str, description: "Exactly two paragraphs separated by a blank line" },
    outreach_hook: { ...str, description: "One sentence, the opening line of a cold email" },
  },
  required: ["technologies", "cloud", "orchestration", "fit_reasons", "architecture", "open_questions", "activity_level", "activity_notes", "summary", "outreach_hook"],
};

export async function analyzeCompany(name: string, domain: string, signals: Signals): Promise<Intel> {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set");
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
- outreach_hook: ONE specific opening sentence, STRICT maximum 28 words, referencing a concrete detail from the evidence${pitch ? " and connecting it to what we sell" : ""}. No greetings, no "I came across", no flattery.`;

  // Gemini returns 429/500/503 during demand spikes: retry with backoff, then fall back to a second Flash model.
  let res;
  const t0 = Date.now();
  const models = [...new Set([MODEL(), FALLBACK_MODEL()])];
  let lastErr: unknown;
  outer: for (const model of models) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        res = await ai.models.generateContent({
          model,
          contents: prompt,
          config: { responseMimeType: "application/json", responseSchema: schema, temperature: 0.5, thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }, httpOptions: { timeout: 100_000 } },
        });
        console.log(`[gemini] ${name}: ${model} ${Date.now() - t0}ms`);
        break outer;
      } catch (e) {
        lastErr = e;
        const msg = e instanceof Error ? e.message : String(e);
        const transient = /"code":\s*(404|429|500|503|504)|UNAVAILABLE|RESOURCE_EXHAUSTED|NOT_FOUND|timed out|aborted/i.test(msg);
        if (!transient) throw e;
        if (/NOT_FOUND|"code":\s*404/.test(msg)) break; // this model is unavailable to us; go straight to the next one
        await new Promise((r) => setTimeout(r, 1500 * 2 ** attempt));
      }
    }
  }
  if (!res) throw lastErr instanceof Error ? lastErr : new Error("Gemini is unavailable");
  if (!res.text) throw new Error("Gemini returned an empty response");
  const out = JSON.parse(res.text) as Intel;
  out.outreach_hook = await tightenHook(ai, out.outreach_hook);
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
  };
}

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/** The model sometimes overshoots the length limit; ask once for a shorter rewrite and fall back to the original. */
async function tightenHook(ai: GoogleGenAI, hook: string): Promise<string> {
  if (words(hook) <= 32) return hook;
  try {
    const r = await ai.models.generateContent({
      model: FALLBACK_MODEL(),
      contents: `Rewrite this cold-email opening line in at most 25 words. Keep the most specific concrete detail and the link to the product. Return only the sentence.\n\n${hook}`,
      config: { temperature: 0.3, thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } },
    });
    const t = r.text?.trim().replace(/^["']|["']$/g, "");
    return t && words(t) <= 32 ? t : hook;
  } catch {
    return hook;
  }
}
