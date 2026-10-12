import { NextResponse } from "next/server";
import { getCompany, saveHook } from "@/lib/db";
import { generateOpening } from "@/lib/outreach";

export const maxDuration = 60;

/** Regenerates the personalised opening line for one account and stores it with its supporting signal. */
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  const c = await getCompany(id);
  if (!c) return NextResponse.json({ error: "Company not found" }, { status: 404 });
  if (!c.last_updated) return NextResponse.json({ error: "Research this company first" }, { status: 409 });
  try {
    const out = await generateOpening(c, c.outreach_hook);
    await saveHook(id, out.line, { signal: out.signal, source: out.source });
    return NextResponse.json(out);
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    const msg = /402|PAYMENT/i.test(raw) ? "AI credits exhausted. Add credits and retry." : /429|quota/i.test(raw) ? "AI rate limit reached. Retry shortly." : "Could not generate a new line. Try again.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
