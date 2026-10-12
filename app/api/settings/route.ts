import { NextResponse } from "next/server";
import { loadIcp, saveIcp } from "@/lib/settings";

const clean = (v: unknown) =>
  Array.isArray(v) ? [...new Set(v.map((x) => String(x).trim()).filter((x) => x && x.length <= 30))].slice(0, 20) : [];

export async function GET() {
  return NextResponse.json(await loadIcp());
}

export async function PUT(req: Request) {
  const body = await req.json().catch(() => ({}));
  const clouds = clean(body.clouds);
  const languages = clean(body.languages);
  if (!clouds.length || !languages.length) return NextResponse.json({ error: "Add at least one cloud platform and one language" }, { status: 400 });
  try {
    await saveIcp({ clouds, languages });
    return NextResponse.json({ clouds, languages });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
