"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "@/lib/toast";
import { btnPrimary, btnSecondary } from "./ui";

export function ResearchButton({ id, name, label = "Refresh research", primary = false, className = "" }: { id: number; name?: string; label?: string; primary?: boolean; className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    router.refresh(); // flips the page into its researching state right away
    const r = await fetch(`/api/companies/${id}/refresh`, { method: "POST" }).catch(() => null);
    if (r?.ok) toast(`Research updated${name ? ` for ${name}` : ""}`);
    else toast((await r?.json().catch(() => null))?.error ?? "Research failed", "error");
    setBusy(false);
    router.refresh();
  };

  return (
    <button onClick={run} disabled={busy} className={`${primary ? btnPrimary : btnSecondary} ${className}`}>
      <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
      {busy ? "Researching…" : label}
    </button>
  );
}

/** While a research run is in flight (possibly started elsewhere) keep re-reading the server data. */
export function AutoRefresh({ active }: { active: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(t);
  }, [active, router]);
  return null;
}

/** Icon-only refresh for dense lists. */
export function RefreshIcon({ id, name }: { id: number; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    const r = await fetch(`/api/companies/${id}/refresh`, { method: "POST" }).catch(() => null);
    setBusy(false);
    if (r?.ok) toast(`Research updated for ${name}`); else toast((await r?.json().catch(() => null))?.error ?? `Research failed for ${name}`, "error");
    router.refresh();
  };
  return (
    <button onClick={run} disabled={busy} aria-label={`Refresh research for ${name}`} title="Refresh research" className="grid h-8 w-8 place-items-center rounded-md text-ink-4 transition-colors hover:bg-raised hover:text-ink disabled:opacity-50">
      <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
    </button>
  );
}

/** Refreshes a list of accounts one after another (keeps within API and rate limits). */
export function RefreshMany({ ids, label }: { ids: number[]; label: string }) {
  const router = useRouter();
  const [progress, setProgress] = useState<number | null>(null);
  const run = async () => {
    let ok = 0, fail = 0;
    for (let i = 0; i < ids.length; i++) {
      setProgress(i);
      const r = await fetch(`/api/companies/${ids[i]}/refresh`, { method: "POST" }).catch(() => null);
      r?.ok ? ok++ : fail++;
    }
    setProgress(null);
    toast(`${ok} refreshed${fail ? `, ${fail} failed` : ""}`, fail ? "error" : "success");
    router.refresh();
  };
  return (
    <button onClick={run} disabled={progress != null || ids.length === 0} className={btnSecondary}>
      <RefreshCw className={`h-3.5 w-3.5 ${progress != null ? "animate-spin" : ""}`} />
      {progress != null ? `Refreshing ${progress + 1} of ${ids.length}…` : label}
    </button>
  );
}
