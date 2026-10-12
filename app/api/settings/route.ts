import { NextResponse } from "next/server";
import { loadSettings, saveSettings } from "@/lib/settings";

const clean = (v: unknown) =>
  Array.isArray(v) ? [...new Set(v.map((x) => String(x).trim()).filter((x) => x && x.length <= 30))].slice(0, 20) : [];
const int = (v: unknown, lo: number, hi: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : null;
};

export async function GET() {
  return NextResponse.json(await loadSettings());
}

/** Accepts any subset of: clouds, languages (ICP) and staleDays, batchSize (research preferences). */
export async function PUT(req: Request) {
  const b = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  if ("clouds" in b || "languages" in b) {
    const clouds = clean(b.clouds), languages = clean(b.languages);
    if (!clouds.length || !languages.length) return NextResponse.json({ error: "Add at least one cloud platform and one language" }, { status: 400 });
    patch.clouds = clouds; patch.languages = languages;
  }
  if ("staleDays" in b) {
    const n = int(b.staleDays, 1, 60);
    if (n == null) return NextResponse.json({ error: "Stale threshold must be 1 to 60 days" }, { status: 400 });
    patch.staleDays = n;
  }
  if ("batchSize" in b) {
    const n = int(b.batchSize, 1, 25);
    if (n == null) return NextResponse.json({ error: "Per-run limit must be 1 to 25 accounts" }, { status: 400 });
    patch.batchSize = n;
  }
  try {
    return NextResponse.json(await saveSettings(patch));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
