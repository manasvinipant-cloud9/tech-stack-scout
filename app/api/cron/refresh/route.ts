import { NextResponse } from "next/server";
import { listStale } from "@/lib/db";
import { researchCompany } from "@/lib/research";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BATCH = 6; // companies per run, stalest first, to stay inside the function time limit

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const batch = await listStale(BATCH);
  const results: { id: number; company: string; ok: boolean; error?: string }[] = [];
  for (const c of batch) {
    try {
      await researchCompany(c.id);
      results.push({ id: c.id, company: c.company_name, ok: true });
    } catch (e) {
      results.push({ id: c.id, company: c.company_name, ok: false, error: (e as Error).message });
    }
  }
  return NextResponse.json({ processed: results.length, results });
}
