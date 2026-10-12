"use client";

import { useState } from "react";
import type { Note } from "@/lib/db";
import { btnPrimary } from "./ui";

const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export default function NotesPanel({ companyId, initial }: { companyId: number; initial: Note[] }) {
  const [notes, setNotes] = useState(initial);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    if (!text.trim()) return;
    setBusy(true);
    setErr(null);
    const r = await fetch(`/api/companies/${companyId}/notes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
    const d = await r.json().catch(() => ({}));
    if (r.ok) {
      setNotes((n) => [d, ...n]);
      setText("");
    } else setErr(d.error ?? "Could not save note");
    setBusy(false);
  };

  return (
    <div>
      <div className="rounded-xl border border-line bg-surface p-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") save(); }}
          rows={3}
          placeholder="Add a note… use #topics to tag"
          className="w-full resize-none bg-transparent text-sm text-ink outline-none placeholder:text-ink-4"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="font-mono text-[11px] text-ink-4">⌘↵ TO SAVE</span>
          <button onClick={save} disabled={busy || !text.trim()} className={`${btnPrimary} h-8`}>{busy ? "Saving…" : "Save note"}</button>
        </div>
        {err && <p className="mt-2 text-xs text-bad">{err}</p>}
      </div>
      <ul className="mt-4 divide-y divide-line-soft">
        {notes.length === 0 && <li className="py-6 text-sm text-ink-3">No notes yet.</li>}
        {notes.map((n) => (
          <li key={n.id} className="py-3">
            <div className="mb-1 flex items-center gap-2">
              <span className="font-mono text-[11px] text-cap">{fmt(n.created_at).toUpperCase()}</span>
              <span className="ml-auto flex flex-wrap justify-end gap-1.5">
                {n.tags.map((t) => <span key={t} className="rounded-md bg-chip px-1.5 py-px font-mono text-[11px] text-ink-2">#{t}</span>)}
              </span>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-[1.5] text-ink-2">{n.text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
