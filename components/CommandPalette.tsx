"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, CornerDownLeft, LayoutDashboard, Map, Moon, PenLine, Plus, Radar, Search, Settings, Sun } from "lucide-react";
import { openAddCompany } from "@/lib/ui-events";
import { CompanyLogo } from "./Logos";

type Company = { id: number; name: string; domain: string };
type Cmd = { id: string; group: "Companies" | "Go to" | "Actions"; label: string; hint?: string; icon?: React.ReactNode; logo?: Company; run: () => void };

/** Global ⌘K palette on a frosted panel: jump to a company or page, or start a common action. */
export default function CommandPalette({ companies, light, toggleTheme }: { companies: Company[]; light: boolean; toggleTheme: () => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = /INPUT|TEXTAREA|SELECT/.test(t.tagName) || t.isContentEditable;
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) { e.preventDefault(); setOpen(true); }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("stack-open-palette", onOpen);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("stack-open-palette", onOpen); };
  }, []);
  useEffect(() => {
    if (!open) return;
    setQ(""); setI(0); setTimeout(() => input.current?.focus(), 0);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]);

  const go = (href: string) => () => router.push(href);
  const all: Cmd[] = useMemo(() => [
    ...companies.map((c) => ({ id: `c${c.id}`, group: "Companies" as const, label: c.name, hint: c.domain, logo: c, run: go(`/accounts/${c.id}`) })),
    { id: "p-overview", group: "Go to", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" />, run: go("/") },
    { id: "p-accounts", group: "Go to", label: "Accounts", icon: <Building2 className="h-4 w-4" />, run: go("/accounts") },
    { id: "p-research", group: "Go to", label: "Research & Signals", icon: <Radar className="h-4 w-4" />, run: go("/research") },
    { id: "p-outreach", group: "Go to", label: "Outreach Studio", icon: <PenLine className="h-4 w-4" />, run: go("/outreach") },
    { id: "p-settings", group: "Go to", label: "Settings", icon: <Settings className="h-4 w-4" />, run: go("/settings") },
    { id: "p-map", group: "Go to", label: "Components map", icon: <Map className="h-4 w-4" />, run: go("/components-map") },
    { id: "a-add", group: "Actions", label: "Add company", hint: "Save to the watchlist", icon: <Plus className="h-4 w-4" />, run: () => openAddCompany("add") },
    { id: "a-research", group: "Actions", label: "Research a company", hint: "Add and research now", icon: <Search className="h-4 w-4" />, run: () => openAddCompany("research") },
    { id: "a-theme", group: "Actions", label: light ? "Switch to dark theme" : "Switch to light theme", icon: light ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />, run: toggleTheme },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [companies, light]);

  const term = q.trim().toLowerCase();
  const list = (term ? all.filter((c) => `${c.label} ${c.hint ?? ""}`.toLowerCase().includes(term)) : [...all.filter((c) => c.group !== "Companies"), ...all.filter((c) => c.group === "Companies").slice(0, 5)]).slice(0, 12);
  const order = ["Companies", "Go to", "Actions"] as const;
  const shown = order.flatMap((g) => list.filter((c) => c.group === g));

  const run = (c?: Cmd) => { if (!c) return; setOpen(false); c.run(); };
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[14vh]" role="dialog" aria-modal="true" aria-label="Command palette">
      <button aria-label="Close palette" className="absolute inset-0 bg-black/50 backdrop-blur-[3px]" onClick={() => setOpen(false)} tabIndex={-1} />
      <div className="pop relative w-full max-w-[580px] overflow-hidden rounded-2xl border border-white/10 bg-panel/80 shadow-2xl backdrop-blur-2xl">
        <div className="flex items-center gap-3 border-b border-white/10 px-4">
          <Search className="h-4 w-4 text-ink-4" />
          <input ref={input} value={q} onChange={(e) => { setQ(e.target.value); setI(0); }} placeholder="Search companies, jump to a page, or run an action"
            role="combobox" aria-expanded="true" aria-controls="palette-list" aria-activedescendant={shown[i] ? `pal-${shown[i].id}` : undefined}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setI((x) => Math.min(shown.length - 1, x + 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setI((x) => Math.max(0, x - 1)); }
              else if (e.key === "Enter") { e.preventDefault(); run(shown[i]); }
              else if (e.key === "Escape") setOpen(false);
            }}
            className="h-12 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-4" />
          <kbd className="rounded border border-line-ctl px-1.5 font-mono text-[10px] text-ink-4">esc</kbd>
        </div>
        <ul id="palette-list" role="listbox" className="max-h-[380px] overflow-y-auto p-1.5">
          {shown.length === 0 && <li className="px-3 py-6 text-center text-sm text-ink-3">No match for “{q}”. Try “Add company” to research it.</li>}
          {shown.map((c, idx) => (
            <li key={c.id} role="option" id={`pal-${c.id}`} aria-selected={idx === i}>
              {(idx === 0 || shown[idx - 1].group !== c.group) && <div className="px-2.5 pb-1 pt-2 font-mono text-[10px] uppercase tracking-[0.08em] text-cap">{c.group}</div>}
              <button onMouseMove={() => setI(idx)} onClick={() => run(c)} className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-[13.5px] ${idx === i ? "bg-raised" : ""}`}>
                {c.logo ? <CompanyLogo name={c.logo.name} domain={c.logo.domain} size={24} /> : <span className="grid h-6 w-6 place-items-center text-ink-3">{c.icon}</span>}
                <span className="font-medium">{c.label}</span>
                {c.hint && <span className="truncate font-mono text-[11px] text-ink-4">{c.hint}</span>}
                {idx === i && <CornerDownLeft className="ml-auto h-3.5 w-3.5 text-ink-4" />}
              </button>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-4 border-t border-white/10 px-4 py-2 font-mono text-[10.5px] text-ink-4"><span>↑↓ navigate</span><span>↵ select</span><span>⌘K toggle</span></div>
      </div>
    </div>
  );
}
