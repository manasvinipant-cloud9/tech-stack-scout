import { NextResponse } from "next/server";
import { addNote, listNotes } from "@/lib/db";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  return NextResponse.json(await listNotes(id));
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const body = await req.json().catch(() => ({}));
  const text = String(body.text ?? "").trim().slice(0, 4000);
  if (!Number.isInteger(id) || !text) return NextResponse.json({ error: "Write a note first" }, { status: 400 });
  const tags = [...new Set([...text.matchAll(/#([\w-]{1,30})/g)].map((m) => m[1].toLowerCase()))].slice(0, 8);
  try {
    return NextResponse.json(await addNote(id, text, tags), { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
