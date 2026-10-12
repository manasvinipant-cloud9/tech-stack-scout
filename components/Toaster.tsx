"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Info, OctagonAlert } from "lucide-react";
import type { ToastTone } from "@/lib/toast";

type T = { id: number; message: string; tone: ToastTone };

export default function Toaster() {
  const [items, setItems] = useState<T[]>([]);
  useEffect(() => {
    let n = 0;
    const on = (e: Event) => {
      const { message, tone } = (e as CustomEvent).detail as { message: string; tone: ToastTone };
      const id = ++n;
      setItems((s) => [...s.slice(-3), { id, message, tone }]);
      setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), tone === "error" ? 7000 : 4000);
    };
    window.addEventListener("stack-toast", on);
    return () => window.removeEventListener("stack-toast", on);
  }, []);
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2 print:hidden" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} role={t.tone === "error" ? "alert" : "status"} className={`pop pointer-events-auto flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-[13px] shadow-xl ${t.tone === "error" ? "border-bad/40 bg-bad-bg text-bad-text" : "border-line bg-panel text-ink"}`}>
          {t.tone === "error" ? <OctagonAlert className="mt-0.5 h-4 w-4 shrink-0" /> : t.tone === "info" ? <Info className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-good" />}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
