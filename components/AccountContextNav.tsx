"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Ctx = { query: string; list: { id: number; name: string }[] };
export const LIST_KEY = "stack-list";

/** Breadcrumb + prev/next that remember the Accounts list (and its filters) the user came from. */
export default function AccountContextNav({ id, name }: { id: number; name: string }) {
  const [ctx, setCtx] = useState<Ctx | null>(null);
  useEffect(() => { try { setCtx(JSON.parse(sessionStorage.getItem(LIST_KEY) ?? "null")); } catch {} }, [id]);
  const i = ctx?.list.findIndex((x) => x.id === id) ?? -1;
  const prev = ctx && i > 0 ? ctx.list[i - 1] : null;
  const next = ctx && i >= 0 && i < ctx.list.length - 1 ? ctx.list[i + 1] : null;
  const back = `/accounts${ctx?.query ?? ""}`;
  const filtered = !!ctx?.query;
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-[13px]">
      <nav className="flex items-center gap-1.5 text-ink-4" aria-label="Breadcrumb">
        <Link href={back} className="inline-flex items-center gap-1 hover:text-ink"><ChevronLeft className="h-3.5 w-3.5" />{filtered ? "Back to filtered accounts" : "Accounts"}</Link>
        <span aria-hidden>/</span><span className="text-ink-2">{name}</span>
      </nav>
      {i >= 0 && ctx && (
        <div className="flex items-center gap-1" role="group" aria-label="Move through the list">
          <Link href={prev ? `/accounts/${prev.id}` : "#"} aria-disabled={!prev} title={prev ? `Previous: ${prev.name}` : undefined} className={`inline-flex h-7 items-center gap-1 rounded-md px-2 ${prev ? "text-ink-2 hover:bg-raised" : "pointer-events-none text-ink-5"}`}><ChevronLeft className="h-3.5 w-3.5" />{prev ? prev.name : "Previous"}</Link>
          <span className="font-mono text-[11px] text-ink-4">{i + 1} of {ctx.list.length}</span>
          <Link href={next ? `/accounts/${next.id}` : "#"} aria-disabled={!next} title={next ? `Next: ${next.name}` : undefined} className={`inline-flex h-7 items-center gap-1 rounded-md px-2 ${next ? "text-ink-2 hover:bg-raised" : "pointer-events-none text-ink-5"}`}>{next ? next.name : "Next"}<ChevronRight className="h-3.5 w-3.5" /></Link>
        </div>
      )}
    </div>
  );
}
