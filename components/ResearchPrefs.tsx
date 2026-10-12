"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "@/lib/toast";
import { btnPrimary, btnSecondary, inputCls } from "./ui";

function Field({ label, hint, value, onChange, min, max, unit }: { label: string; hint: string; value: number; onChange: (n: number) => void; min: number; max: number; unit: string }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-start sm:gap-8">
      <div><label htmlFor={label} className="text-[13.5px] font-semibold">{label}</label><p className="mt-0.5 max-w-md text-xs leading-snug text-ink-4">{hint}</p></div>
      <div className="flex items-center gap-2"><input id={label} type="number" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className={`${inputCls} w-20 text-center`} /><span className="text-[13px] text-ink-3">{unit}</span></div>
    </div>
  );
}

export default function ResearchPrefs({ staleDays: s0, batchSize: b0 }: { staleDays: number; batchSize: number }) {
  const router = useRouter();
  const [staleDays, setStale] = useState(s0);
  const [batchSize, setBatch] = useState(b0);
  const [busy, setBusy] = useState(false);
  const dirty = staleDays !== s0 || batchSize !== b0;
  const valid = staleDays >= 1 && staleDays <= 60 && batchSize >= 1 && batchSize <= 25;
  const save = async () => {
    setBusy(true);
    const r = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ staleDays, batchSize }) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { toast(d.error ?? "Could not save", "error"); return; }
    toast("Research preferences saved"); router.refresh();
  };
  return (
    <div className="space-y-5">
      <Field label="Research becomes stale after" hint="Based on the research timestamp, never on whether a source found anything. Stale accounts are queued for the weekly refresh." value={staleDays} onChange={setStale} min={1} max={60} unit="days" />
      <Field label="Accounts refreshed per weekly run" hint="The weekly job refreshes new, stale or failed accounts, oldest first, up to this limit. Manual refresh is never limited." value={batchSize} onChange={setBatch} min={1} max={25} unit="accounts" />
      <div className="flex items-center gap-3 border-t border-line-soft pt-4">
        <button onClick={save} disabled={!dirty || !valid || busy} className={btnPrimary}>{busy ? "Saving…" : "Save preferences"}</button>
        {dirty && <button onClick={() => { setStale(s0); setBatch(b0); }} className={btnSecondary}>Discard changes</button>}
        {!valid && <span className="text-xs text-bad">Stale: 1–60 days. Limit: 1–25 accounts.</span>}
      </div>
    </div>
  );
}
