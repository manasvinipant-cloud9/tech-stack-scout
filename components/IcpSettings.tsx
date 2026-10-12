"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "@/lib/toast";
import { TechLogo } from "./Logos";
import { btnPrimary, btnSecondary, inputCls } from "./ui";

function ChipEditor({ label, values, onChange, suggestions }: { label: string; values: string[]; onChange: (v: string[]) => void; suggestions: string[] }) {
  const [draft, setDraft] = useState("");
  const add = (v: string) => { const t = v.trim(); if (t && !values.some((x) => x.toLowerCase() === t.toLowerCase())) onChange([...values, t]); setDraft(""); };
  const left = suggestions.filter((s) => !values.some((v) => v.toLowerCase() === s.toLowerCase()));
  return (
    <div>
      <div className="mb-2 text-[13px] font-semibold">{label}</div>
      <ul className="flex flex-wrap gap-2" aria-label={label}>
        {values.map((v) => (
          <li key={v} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line-ctl bg-sunken pl-2 pr-1 text-[13px]"><TechLogo name={v} size={14} />{v}
            <button onClick={() => onChange(values.filter((x) => x !== v))} aria-label={`Remove ${v}`} className="grid h-6 w-6 place-items-center rounded text-ink-4 hover:bg-raised hover:text-ink"><X className="h-3 w-3" /></button></li>
        ))}
      </ul>
      <form onSubmit={(e) => { e.preventDefault(); add(draft); }} className="mt-2 flex gap-2">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={`Add a ${label.toLowerCase().includes("cloud") ? "cloud platform" : "language"}`} className={`${inputCls} max-w-[240px]`} aria-label={`Add to ${label}`} />
        <button className={btnSecondary} disabled={!draft.trim()}><Plus className="h-3.5 w-3.5" /> Add</button>
      </form>
      {left.length > 0 && <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-ink-4">Suggestions {left.slice(0, 8).map((s) => <button key={s} onClick={() => add(s)} className="rounded-md border border-dashed px-1.5 py-0.5 text-ink-3 hover:border-accent hover:text-accent" style={{ borderColor: "var(--dashed)" }}>+ {s}</button>)}</div>}
    </div>
  );
}

export default function IcpSettings({ clouds: c0, languages: l0 }: { clouds: string[]; languages: string[] }) {
  const router = useRouter();
  const [clouds, setClouds] = useState(c0);
  const [languages, setLanguages] = useState(l0);
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify([clouds, languages]) !== JSON.stringify([c0, l0]);
  const save = async () => {
    setBusy(true);
    const r = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clouds, languages }) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { toast(d.error ?? "Could not save", "error"); return; }
    toast("ICP saved. Account matches now use these targets."); router.refresh();
  };
  return (
    <div className="space-y-6">
      <ChipEditor label="Target cloud platforms" values={clouds} onChange={setClouds} suggestions={["AWS", "GCP", "Azure", "Cloudflare", "Oracle Cloud"]} />
      <ChipEditor label="Target programming languages" values={languages} onChange={setLanguages} suggestions={["Go", "Java", "Python", "TypeScript", "Kotlin", "Rust", "Scala", "C#", "Ruby"]} />
      <div className="flex items-center gap-3 border-t border-line-soft pt-4">
        <button onClick={save} disabled={!dirty || busy} className={btnPrimary}>{busy ? "Saving…" : "Save ICP"}</button>
        {dirty && <button onClick={() => { setClouds(c0); setLanguages(l0); }} className={btnSecondary}>Discard changes</button>}
        {!dirty && <span className="text-xs text-ink-4">No unsaved changes</span>}
      </div>
    </div>
  );
}
