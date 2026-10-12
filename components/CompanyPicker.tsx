"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { CompanyLogo } from "./Logos";
import { IcpIndicators } from "./Icp";
import { FitBadge } from "./ui";
import type { AccountRow } from "@/lib/accounts";

/** Step 1 of Outreach Studio: choose a company from the watchlist. */
export default function CompanyPicker({ rows, selected }: { rows: AccountRow[]; selected: number | null }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const list = rows.filter((r) => (r.name + r.domain).toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className="flex max-h-[calc(100vh-170px)] flex-col overflow-hidden rounded-xl border border-line bg-panel shadow-card">
      <div className="border-b border-line-soft p-3">
        <label className="relative block"><span className="sr-only">Filter companies</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-4" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter your watchlist" className="h-9 w-full rounded-lg border border-line-ctl bg-sunken pl-9 pr-3 text-[13px] outline-none placeholder:text-ink-4 focus:border-accent" />
        </label>
      </div>
      <ul className="flex-1 overflow-y-auto p-1.5" role="listbox" aria-label="Companies">
        {list.length === 0 && <li className="p-4 text-sm text-ink-3">No company matches “{q}”.</li>}
        {list.map((r) => {
          const on = r.id === selected;
          const disabled = !r.lastUpdated;
          return (
            <li key={r.id} role="option" aria-selected={on}>
              <button onClick={() => router.push(`/outreach?company=${r.id}`, { scroll: false })} className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors ${on ? "bg-raised ring-1 ring-accent/50" : "hover:bg-raised"}`}>
                <CompanyLogo name={r.name} domain={r.domain} size={30} />
                <span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-semibold">{r.name}</span>
                  {disabled ? <span className="text-xs text-ink-4">Not researched</span> : <IcpIndicators checks={r.checks} />}</span>
                {!disabled && <FitBadge score={r.fit} />}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
