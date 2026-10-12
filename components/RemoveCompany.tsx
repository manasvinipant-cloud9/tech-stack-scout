"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { ConfirmDialog } from "./Dialog";
import { btnGhost, btnSecondary } from "./ui";

export function RemoveCompany({ id, name, redirect, variant = "secondary" }: { id: number; name: string; redirect?: string; variant?: "secondary" | "ghost" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    const r = await fetch(`/api/companies/${id}`, { method: "DELETE" }).catch(() => null);
    setBusy(false);
    if (!r?.ok) { toast(`Could not remove ${name}`, "error"); return; }
    toast(`${name} removed from the watchlist`);
    setOpen(false);
    if (redirect) router.push(redirect);
    router.refresh();
  };
  return (
    <>
      <button onClick={() => setOpen(true)} className={variant === "ghost" ? btnGhost : btnSecondary} aria-label={`Remove ${name}`}>
        <Trash2 className="h-3.5 w-3.5" /> {variant === "ghost" ? "" : "Remove"}
      </button>
      <ConfirmDialog open={open} onClose={() => setOpen(false)} onConfirm={run} busy={busy} danger title={`Remove ${name}?`} confirmLabel="Remove company"
        body={<>This removes <b>{name}</b> and its research history and notes from your watchlist. You can add it again later, but the notes will be gone.</>} />
    </>
  );
}
