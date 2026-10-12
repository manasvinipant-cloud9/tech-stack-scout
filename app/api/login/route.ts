import { NextResponse } from "next/server";
import { COOKIE, tokenFor } from "@/lib/auth";

export async function POST(req: Request) {
  const passcode = process.env.APP_PASSCODE;
  const body = await req.json().catch(() => ({}));
  if (!passcode || String(body.passcode ?? "") !== passcode) {
    return NextResponse.json({ error: "Wrong passcode" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, await tokenFor(passcode), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
