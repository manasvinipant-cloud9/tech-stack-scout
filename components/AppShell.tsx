"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Building2, ExternalLink, LayoutDashboard, Map, Menu, Moon, PenLine, Radar, Search, Settings, Sun, X } from "lucide-react";
import { CompanyLogo } from "./Logos";
import Toaster from "./Toaster";

type Item = { id: number; name: string; domain: string };
type Props = { companies: Item[]; lastResearch: string | null; nextRefresh: string; children: React.ReactNode };

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard, match: (p: string) => p === "/" },
  { href: "/accounts", label: "Accounts", icon: Building2, match: (p: string) => p.startsWith("/accounts") || p.startsWith("/brief") },
  { href: "/research", label: "Research & Signals", icon: Radar, match: (p: string) => p.startsWith("/research") },
  { href: "/outreach", label: "Outreach Studio", icon: PenLine, match: (p: string) => p.startsWith("/outreach") },
];

export default function AppShell({ companies, lastResearch, nextRefresh, children }: Props) {
  const path = usePathname();
  const router = useRouter();
  const [drawer, setDrawer] = useState(false);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [light, setLight] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLight(document.documentElement.classList.contains("light"));
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(t.tagName) && !t.isContentEditable) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    const onDown = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("mousedown", onDown); };
  }, []);
  useEffect(() => { setDrawer(false); setMenu(false); }, [path]);

  const toggleTheme = () => {
    const next = !light;
    setLight(next);
    document.documentElement.classList.toggle("light", next);
    try { localStorage.setItem("theme", next ? "light" : "dark"); } catch {}
  };

  const results = q.trim() ? companies.filter((c) => (c.name + c.domain).toLowerCase().includes(q.trim().toLowerCase())).slice(0, 6) : [];
  const go = (id: number) => { setQ(""); setOpen(false); router.push(`/accounts/${id}`); };

  const sidebar = (
    <div className="flex h-full flex-col">
      <Link href="/" className="flex h-14 shrink-0 items-center gap-2.5 px-5 text-[15px] font-bold tracking-[-0.02em]">
        <span className="grid h-6 w-6 place-items-center rounded-full border-2 border-accent"><span className="h-2 w-2 rounded-full bg-accent" /></span>
        Stack Scout
      </Link>
      <nav className="flex-1 space-y-0.5 px-3 pt-2" aria-label="Primary">
        {NAV.map((n) => {
          const active = n.match(path);
          return (
            <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined}
              className={`group relative flex h-9 items-center gap-2.5 rounded-lg px-3 text-[13.5px] transition-colors duration-100 ${active ? "bg-raised font-semibold text-ink" : "text-hdr-dim hover:bg-hdr-field hover:text-ink"}`}>
              {active && <span className="absolute -left-3 top-1.5 h-6 w-[3px] rounded-r bg-accent" />}
              <n.icon className={`h-4 w-4 ${active ? "text-accent" : ""}`} />
              <span className="flex-1">{n.label}</span>
              {n.href === "/accounts" && <span className="font-mono text-[11px] text-ink-4">{companies.length}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="space-y-3 px-3 pb-4">
        <div className="rounded-lg border border-line-soft bg-hdr-field p-3">
          <div className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-cap">Research refresh</div>
          <div className="mt-1.5 text-[12.5px] leading-snug text-ink-2">Weekly · next {nextRefresh}</div>
          <div className="text-[12px] text-ink-4">{lastResearch ? `Last run ${lastResearch}` : "No research yet"}</div>
        </div>
        <Link href="/settings" aria-current={path.startsWith("/settings") ? "page" : undefined}
          className={`flex h-9 items-center gap-2.5 rounded-lg px-3 text-[13.5px] transition-colors duration-100 ${path.startsWith("/settings") ? "bg-raised font-semibold text-ink" : "text-hdr-dim hover:bg-hdr-field hover:text-ink"}`}>
          <Settings className={`h-4 w-4 ${path.startsWith("/settings") ? "text-accent" : ""}`} /> Settings
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[232px] border-r border-line-soft bg-sidebar print:hidden lg:block">{sidebar}</aside>
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden print:hidden">
          <button aria-label="Close menu" className="absolute inset-0 bg-black/60" onClick={() => setDrawer(false)} />
          <aside className="pop absolute inset-y-0 left-0 w-[260px] border-r border-line bg-sidebar">
            <button aria-label="Close menu" onClick={() => setDrawer(false)} className="absolute right-3 top-3.5 grid h-8 w-8 place-items-center rounded-md text-ink-3 hover:bg-raised"><X className="h-4 w-4" /></button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="lg:pl-[232px]">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line-soft bg-page/85 px-4 backdrop-blur sm:px-8 print:hidden">
          <button aria-label="Open menu" onClick={() => setDrawer(true)} className="grid h-9 w-9 place-items-center rounded-lg text-ink-3 hover:bg-raised lg:hidden"><Menu className="h-5 w-5" /></button>
          <div className="relative w-full max-w-[460px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-4" />
            <input ref={searchRef} value={q} role="combobox" aria-expanded={open && results.length > 0} aria-controls="global-search-results" aria-label="Search companies"
              onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 120)}
              onKeyDown={(e) => { if (e.key === "Enter" && results[0]) go(results[0].id); if (e.key === "Escape") { setQ(""); (e.target as HTMLElement).blur(); } }}
              placeholder="Search companies or domains" className="h-9 w-full rounded-lg border border-line bg-sunken pl-9 pr-9 text-[13px] text-ink outline-none placeholder:text-ink-4 focus:border-accent" />
            <kbd className="absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-line-ctl px-1.5 font-mono text-[10px] text-ink-4 sm:block">/</kbd>
            {open && q.trim() && (
              <ul id="global-search-results" role="listbox" className="pop absolute left-0 right-0 top-11 z-30 overflow-hidden rounded-xl border border-line bg-panel shadow-xl">
                {results.length === 0 && <li className="px-3.5 py-3 text-[13px] text-ink-3">No company matches “{q}”. Use <Link href="/accounts" className="link">Accounts → Add company</Link>.</li>}
                {results.map((r) => (
                  <li key={r.id} role="option" aria-selected="false">
                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => go(r.id)} className="flex w-full items-center gap-3 px-3.5 py-2 text-left hover:bg-raised">
                      <CompanyLogo name={r.name} domain={r.domain} size={26} />
                      <span className="min-w-0"><span className="block truncate text-[13px] font-semibold">{r.name}</span><span className="block truncate font-mono text-[11px] text-ink-4">{r.domain}</span></span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <button onClick={toggleTheme} aria-label={light ? "Switch to dark theme" : "Switch to light theme"} className="grid h-9 w-9 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-raised hover:text-ink">
              {light ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
            <div className="relative" ref={menuRef}>
              <button onClick={() => setMenu((m) => !m)} aria-haspopup="menu" aria-expanded={menu} aria-label="Profile menu"
                className="flex h-9 items-center gap-2 rounded-lg pl-1 pr-2 text-left transition-colors hover:bg-raised">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-btn text-[12px] font-bold text-white">N</span>
                <span className="hidden text-[13px] font-medium sm:block">Nikhil</span>
              </button>
              {menu && (
                <div role="menu" className="pop absolute right-0 top-11 z-30 w-60 overflow-hidden rounded-xl border border-line bg-panel shadow-xl">
                  <div className="border-b border-line-soft px-3.5 py-3"><div className="text-[13px] font-semibold">Nikhil</div><div className="text-xs text-ink-4">Enterprise account executive</div></div>
                  <Link role="menuitem" href="/settings" className="flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] hover:bg-raised"><Settings className="h-4 w-4 text-ink-3" /> Settings</Link>
                  <Link role="menuitem" href="/components-map" className="flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] hover:bg-raised"><Map className="h-4 w-4 text-ink-3" /> Components map</Link>
                  <a role="menuitem" href="https://github.com/manasvinipant-cloud9/tech-stack-scout" target="_blank" rel="noreferrer" className="flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] hover:bg-raised"><ExternalLink className="h-4 w-4 text-ink-3" /> Source code</a>
                  <button role="menuitem" onClick={toggleTheme} className="flex w-full items-center gap-2.5 border-t border-line-soft px-3.5 py-2.5 text-left text-[13px] hover:bg-raised">
                    {light ? <Moon className="h-4 w-4 text-ink-3" /> : <Sun className="h-4 w-4 text-ink-3" />} {light ? "Dark theme" : "Light theme"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1320px] px-4 pb-14 pt-7 sm:px-8 print:p-0">{children}</main>
      </div>
      <Toaster />
    </div>
  );
}
