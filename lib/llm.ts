// One place that talks to Gemini Flash. Two routes, same models:
//   1. OpenRouter (when OPENROUTER_API_KEY is set): only google/* models, served only by Google's own
//      infrastructure (provider.only = google-vertex / google-ai-studio, no fallbacks).
//   2. Direct Gemini API (GEMINI_API_KEY) as a fallback route.
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

export type JsonSchema = Record<string, unknown>;

export const llmConfigured = () => Boolean(process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY);
export const usingOpenRouter = () => Boolean(process.env.OPENROUTER_API_KEY);

/** Primary and fallback Flash models. Both are Gemini Flash, as the brief requires. */
export const models = () =>
  usingOpenRouter()
    ? [process.env.OPENROUTER_MODEL || "google/gemini-3.8-flash", process.env.OPENROUTER_FALLBACK_MODEL || "google/gemini-3.7-flash"]
    : [process.env.GEMINI_MODEL || "gemini-3.8-flash", process.env.GEMINI_FALLBACK_MODEL || "gemini-flash-latest"];

type Opts = { model: string; prompt: string; temperature: number; schema?: JsonSchema; effort: "minimal" | "low" };

async function openRouter({ model, prompt, temperature, schema, effort }: Opts): Promise<string> {
  const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "X-Title": "Stack Scout",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature,
      max_tokens: 16000, // reasoning tokens count against this, so leave plenty of room
      reasoning: { effort },
      provider: { only: ["google-vertex", "google-ai-studio"], allow_fallbacks: false },
      ...(schema ? { response_format: { type: "json_schema", json_schema: { name: "result", strict: true, schema } } } : {}),
    }),
    signal: AbortSignal.timeout(100_000),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok || body.error) {
    const code = body.error?.code ?? r.status;
    throw new Error(JSON.stringify({ error: { code, message: body.error?.message ?? r.statusText, status: r.status === 402 ? "PAYMENT_REQUIRED" : undefined } }));
  }
  const text = body.choices?.[0]?.message?.content;
  if (!text) throw new Error("The model returned an empty response");
  const cost = body.usage?.cost_details?.upstream_inference_cost ?? body.usage?.cost;
  console.log(`[llm] ${model} via ${body.provider ?? "?"} · ${body.usage?.total_tokens ?? "?"} tokens · $${cost ?? "?"}`);
  return text;
}

// Direct Gemini route: translate the JSON Schema into the SDK's schema type.
const toGemini = (s: any): any => {
  const out: any = { type: ({ object: Type.OBJECT, array: Type.ARRAY, string: Type.STRING, integer: Type.INTEGER, number: Type.NUMBER } as any)[s.type] };
  if (s.description) out.description = s.description;
  if (s.enum) out.enum = s.enum;
  if (s.properties) out.properties = Object.fromEntries(Object.entries(s.properties).map(([k, v]) => [k, toGemini(v)]));
  if (s.required) out.required = s.required;
  if (s.items) out.items = toGemini(s.items);
  return out;
};

async function direct({ model, prompt, temperature, schema, effort }: Opts): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const res = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      temperature,
      thinkingConfig: { thinkingLevel: effort === "minimal" ? ThinkingLevel.MINIMAL : ThinkingLevel.LOW },
      httpOptions: { timeout: 100_000 },
      ...(schema ? { responseMimeType: "application/json", responseSchema: toGemini(schema) } : {}),
    },
  });
  if (!res.text) throw new Error("The model returned an empty response");
  return res.text;
}

const TRANSIENT = /"code":\s*(404|429|500|502|503|504)|UNAVAILABLE|RESOURCE_EXHAUSTED|NOT_FOUND|timed out|aborted|overloaded/i;

/** Calls the primary model (3 tries with backoff), then the fallback model. 402 (out of credits) stops immediately. */
export async function generate(prompt: string, o: { temperature: number; schema?: JsonSchema; effort?: "minimal" | "low" }): Promise<string> {
  if (!llmConfigured()) throw new Error("No AI key configured. Set OPENROUTER_API_KEY (or GEMINI_API_KEY).");
  const call = usingOpenRouter() ? openRouter : direct;
  let last: unknown;
  for (const model of models()) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await call({ model, prompt, temperature: o.temperature, schema: o.schema, effort: o.effort ?? "low" });
      } catch (e) {
        last = e;
        const msg = e instanceof Error ? e.message : String(e);
        if (/"code":\s*402|PAYMENT_REQUIRED/.test(msg)) throw e;
        if (!TRANSIENT.test(msg)) throw e;
        if (/NOT_FOUND|"code":\s*404/.test(msg)) break; // model unavailable to us; try the next one
        await new Promise((r) => setTimeout(r, 1500 * 2 ** attempt));
      }
    }
  }
  throw last instanceof Error ? last : new Error("The AI model is unavailable");
}
