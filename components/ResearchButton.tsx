"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { btnPrimary, btnSecondary } from "./ui";

export function ResearchButton({ id, label = "Re-research", primary = false, className = "" }: { id: number; label?: string; primary?: boolean; className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setErr(null);
    router.refresh(); // flips the page into its researching state right away
    const r = await fetch(`/api/companies/${id}/refresh`, { method: "POST" }).catch(() => null);
    if (!r?.ok) setErr((await r?.json().catch(() => null))?.error ?? "Research failed");
    setBusy(false);
    router.refresh();
  };

  return (
    <span className={`inline-flex flex-col items-stretch gap-1 ${className}`}>
      <button onClick={run} disabled={busy} className={primary ? btnPrimary : btnSecondary}>
        <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
        {busy ? "Researching…" : label}
      </button>
      {err && <span className="max-w-[260px] text-xs text-bad">{err}</span>}
    </span>
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
