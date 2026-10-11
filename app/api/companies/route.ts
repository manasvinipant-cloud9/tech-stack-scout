import { NextResponse } from "next/server";
import { addCompany, listCompanies } from "@/lib/db";

export const dynamic = "force-dynamic";

const normDomain = (s: string) =>
  s.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#]/)[0];

export async function GET() {
  try {
    return NextResponse.json(await listCompanies());
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = String(body.company_name ?? "").trim();
  const domain = normDomain(String(body.domain ?? ""));
  const org = String(body.github_org ?? "").trim() || null;
  if (!name || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) {
    return NextResponse.json({ error: "Provide a company name and a valid domain (e.g. stripe.com)" }, { status: 400 });
  }
  try {
    const row = await addCompany(name.slice(0, 120), domain, org);
    if (!row) return NextResponse.json({ error: `${domain} is already on the watchlist` }, { status: 409 });
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
