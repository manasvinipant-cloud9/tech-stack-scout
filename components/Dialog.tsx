"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { btnPrimary, btnSecondary } from "./ui";

/** Modal on a frosted panel (one of the few places the glass treatment is used). Esc closes, focus moves inside. */
export function Dialog({ open, onClose, title, description, children, width = 520 }: { open: boolean; onClose: () => void; title: string; description?: string; children: React.ReactNode; width?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    ref.current?.querySelector<HTMLElement>("input, button[data-autofocus], button")?.focus();
    return () => { window.removeEventListener("keydown", onKey); prev?.focus(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="Close dialog" className="absolute inset-0 bg-black/55 backdrop-blur-[3px]" onClick={onClose} tabIndex={-1} />
      <div ref={ref} className="pop relative w-full rounded-2xl border border-white/10 bg-panel/85 p-5 shadow-2xl backdrop-blur-xl" style={{ maxWidth: width }}>
        <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-md text-ink-3 hover:bg-raised"><X className="h-4 w-4" /></button>
        <h2 className="pr-8 text-base font-semibold tracking-[-0.01em]">{title}</h2>
        {description && <p className="mt-1 text-sm text-ink-3">{description}</p>}
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, body, confirmLabel, busy, danger, onConfirm, onClose }: { open: boolean; title: string; body: React.ReactNode; confirmLabel: string; busy?: boolean; danger?: boolean; onConfirm: () => void; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title={title} width={440}>
      <div className="text-sm text-ink-2">{body}</div>
      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className={btnSecondary} data-autofocus>Cancel</button>
        <button onClick={onConfirm} disabled={busy} className={danger ? `${btnPrimary} !bg-bad-bg !text-bad-text border border-bad/40 hover:!brightness-125` : btnPrimary}>{busy ? "Working…" : confirmLabel}</button>
      </div>
    </Dialog>
  );
}
