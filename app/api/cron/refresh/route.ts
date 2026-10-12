import { NextResponse } from "next/server";
import { listStale } from "@/lib/db";
import { researchCompany } from "@/lib/research";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BATCH = 12; // accounts per run
const BUDGET_MS = 240_000; // stop starting new work before the function limit
const CONCURRENCY = 2;

/** Weekly job (vercel.json): re-researches every account that is unresearched, >7 days old, or failed last time. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const started = Date.now();
  const queue = await listStale(BATCH);
  const results: { id: number; company: string; ok: boolean; error?: string }[] = [];

  for (let i = 0; i < queue.length; i += CONCURRENCY) {
    if (Date.now() - started > BUDGET_MS) break;
    await Promise.all(
      queue.slice(i, i + CONCURRENCY).map(async (c) => {
        try {
          await researchCompany(c.id);
          results.push({ id: c.id, company: c.company_name, ok: true });
        } catch (e) {
          results.push({ id: c.id, company: c.company_name, ok: false, error: (e as Error).message });
        }
      })
    );
  }
  return NextResponse.json({ due: queue.length, processed: results.length, results });
}
