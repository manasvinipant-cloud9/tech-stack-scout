import { GoogleGenAI, Type } from "@google/genai";
import type { Signals } from "./signals";

export type Intel = {
  languages: string[];
  infrastructure: string[];
  activity_level: "Low" | "Moderate" | "High" | "Very High";
  activity_notes: string;
  summary: string;
  outreach_hook: string;
};

const MODEL = () => process.env.GEMINI_MODEL || "gemini-3.8-flash";

const schema = {
  type: Type.OBJECT,
  properties: {
    languages: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Dominant programming languages, most used first (max 6)" },
    infrastructure: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Cloud / infra / tooling evidenced by the signals (max 8)" },
    activity_level: { type: Type.STRING, enum: ["Low", "Moderate", "High", "Very High"] },
    activity_notes: { type: Type.STRING, description: "One sentence justifying the activity level with concrete numbers" },
    summary: { type: Type.STRING, description: "Exactly two paragraphs separated by a blank line" },
    outreach_hook: { type: Type.STRING, description: "One sentence, the opening line of a cold email" },
  },
  required: ["languages", "infrastructure", "activity_level", "activity_notes", "summary", "outreach_hook"],
  propertyOrdering: ["languages", "infrastructure", "activity_level", "activity_notes", "summary", "outreach_hook"],
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
  const prompt = `You are a sales-engineering analyst preparing an enterprise account executive for a call with ${name} (${domain}).

Use ONLY the evidence below. If evidence is thin or missing (e.g. no public GitHub org), say so plainly and lean on what exists; never invent specifics. Do not claim a tool is in use unless a signal supports it.

EVIDENCE (JSON):
${JSON.stringify({ github: gh && { ...gh, languageBytes: undefined, languageShare: langShare }, website: signals.site }, null, 1)}

${pitch ? `WHAT WE SELL: ${pitch}\n` : ""}
Produce:
- languages: dominant languages in their public code (empty array if no GitHub evidence).
- infrastructure: cloud/infra/tooling evidenced by signals.
- activity_level + activity_notes: engineering/team-building activity, justified with the numbers (repos pushed in last 90 days, stars, repo count).
- summary: exactly two paragraphs. P1: what they build and how (stack, open-source posture). P2: what the activity implies about team momentum and what an AE should be aware of, including evidence gaps.
- outreach_hook: ONE specific opening sentence (max 35 words) for a cold email, referencing a concrete detail from the evidence (a repo, language mix, tool, or activity pattern)${pitch ? " and connecting it to what we sell" : ""}. No greetings, no flattery clichés like "I came across" or "I noticed you're a leader in", no template feel.`;

  const res = await ai.models.generateContent({
    model: MODEL(),
    contents: prompt,
    config: { responseMimeType: "application/json", responseSchema: schema, temperature: 0.6 },
  });
  const text = res.text;
  if (!text) throw new Error("Gemini returned an empty response");
  const out = JSON.parse(text) as Intel;
  return {
    ...out,
    languages: (out.languages ?? []).slice(0, 6),
    infrastructure: (out.infrastructure ?? []).slice(0, 8),
  };
}
