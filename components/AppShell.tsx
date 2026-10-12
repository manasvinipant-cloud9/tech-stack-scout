"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Building2, ChevronsLeft, ChevronsRight, ExternalLink, LayoutDashboard, Map, Menu, Moon, PenLine, Radar, Search, Settings, Sun, X } from "lucide-react";
import { AddCompanyHost } from "./AddCompany";
import CommandPalette from "./CommandPalette";
import Toaster from "./Toaster";
import { openPalette } from "@/lib/ui-events";

type Item = { id: number; name: string; domain: string };
type Props = { companies: Item[]; lastResearch: string | null; nextRefresh: string; product: string; children: React.ReactNode };

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard, match: (p: string) => p === "/" },
  { href: "/accounts", label: "Accounts", icon: Building2, match: (p: string) => p.startsWith("/accounts") || p.startsWith("/brief") },
  { href: "/research", label: "Research & Signals", icon: Radar, match: (p: string) => p.startsWith("/research") },
  { href: "/outreach", label: "Outreach Studio", icon: PenLine, match: (p: string) => p.startsWith("/outreach") },
];

export default function AppShell({ companies, lastResearch, nextRefresh, product, children }: Props) {
  const path = usePathname();
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState(false);
  const [light, setLight] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLight(document.documentElement.classList.contains("light"));
    try { setCollapsed(localStorage.getItem("sidebar") === "collapsed"); } catch {}
    const onDown = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false); };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, []);
  useEffect(() => { setDrawer(false); setMenu(false); }, [path]);

  const toggleTheme = () => {
    const next = !light;
    setLight(next);
    document.documentElement.classList.toggle("light", next);
    try { localStorage.setItem("theme", next ? "light" : "dark"); } catch {}
  };
  const toggleSidebar = () => { const n = !collapsed; setCollapsed(n); try { localStorage.setItem("sidebar", n ? "collapsed" : "expanded"); } catch {} };

  // Labels hide on tablet (icon rail) and when the user collapses the sidebar. The mobile drawer always shows them.
  const sidebar = (rail: boolean) => {
    const hide = rail ? "max-lg:hidden group-data-[collapsed=true]/shell:lg:hidden" : "";
    const itemCls = (active: boolean) => `group relative flex h-9 items-center gap-2.5 rounded-lg px-3 text-[13.5px] transition-colors duration-100 ${rail ? "max-lg:justify-center max-lg:px-0 group-data-[collapsed=true]/shell:lg:justify-center group-data-[collapsed=true]/shell:lg:px-0" : ""} ${active ? "bg-raised font-semibold text-ink" : "text-hdr-dim hover:bg-hdr-field hover:text-ink"}`;
    return (
      <div className="flex h-full flex-col">
        <Link href="/" className={`flex h-14 shrink-0 items-center gap-2.5 px-5 text-[15px] font-bold tracking-[-0.02em] ${rail ? "max-lg:justify-center max-lg:px-0 group-data-[collapsed=true]/shell:lg:justify-center group-data-[collapsed=true]/shell:lg:px-0" : ""}`} aria-label="Stack Scout home">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-accent"><span className="h-2 w-2 rounded-full bg-accent" /></span>
          <span className={hide}>Stack Scout</span>
        </Link>
        <nav className="flex-1 space-y-0.5 px-3 pt-2" aria-label="Primary">
          {NAV.map((n) => {
            const active = n.match(path);
            return (
              <Link key={n.href} href={n.href} title={n.label} aria-label={n.label} aria-current={active ? "page" : undefined} className={itemCls(active)}>
                {active && <span className="absolute -left-3 top-1.5 h-6 w-[3px] rounded-r bg-accent" />}
                <n.icon className={`h-4 w-4 shrink-0 ${active ? "text-accent" : ""}`} />
                <span className={`flex-1 ${hide}`}>{n.label}</span>
                {n.href === "/accounts" && <span className={`font-mono text-[11px] text-ink-4 ${hide}`}>{companies.length}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-3 px-3 pb-3">
          <div className={`rounded-lg border border-line-soft bg-hdr-field p-3 ${hide}`}>
            <div className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-cap">Research refresh</div>
            <div className="mt-1.5 text-[12.5px] leading-snug text-ink-2">Weekly · next {nextRefresh}</div>
            <div className="text-[12px] text-ink-4">{lastResearch ? `Last run ${lastResearch}` : "No research yet"}</div>
          </div>
          <Link href="/settings" title="Settings" aria-label="Settings" aria-current={path.startsWith("/settings") ? "page" : undefined} className={itemCls(path.startsWith("/settings"))}>
            <Settings className={`h-4 w-4 shrink-0 ${path.startsWith("/settings") ? "text-accent" : ""}`} /><span className={hide}>Settings</span>
          </Link>
          <div className={`flex items-center gap-2.5 border-t border-line-soft pt-3 ${rail ? "max-lg:justify-center group-data-[collapsed=true]/shell:lg:justify-center" : ""}`}>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-btn text-[12px] font-bold text-white" aria-hidden>N</span>
            <div className={`min-w-0 flex-1 ${hide}`}><div className="truncate text-[13px] font-semibold">Nikhil</div><div className="truncate text-[11px] text-ink-4">Selling {product}</div></div>
            {rail && <button onClick={toggleSidebar} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : "Collapse sidebar"} className="hidden h-8 w-8 shrink-0 place-items-center rounded-md text-ink-4 hover:bg-hdr-field hover:text-ink lg:grid group-data-[collapsed=true]/shell:lg:hidden">
              <ChevronsLeft className="h-4 w-4" /></button>}
          </div>
          {rail && collapsed && <button onClick={toggleSidebar} aria-label="Expand sidebar" title="Expand sidebar" className="hidden h-8 w-full place-items-center rounded-md text-ink-4 hover:bg-hdr-field hover:text-ink group-data-[collapsed=true]/shell:lg:grid"><ChevronsRight className="h-4 w-4" /></button>}
        </div>
      </div>
    );
  };

  return (
    <div className="group/shell min-h-screen" data-collapsed={collapsed}>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-16 border-r border-line-soft bg-sidebar transition-[width] duration-150 print:hidden md:block lg:w-[232px] group-data-[collapsed=true]/shell:lg:w-16">{sidebar(true)}</aside>
      {drawer && (
        <div className="fixed inset-0 z-40 md:hidden print:hidden">
          <button aria-label="Close menu" className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={() => setDrawer(false)} />
          <aside className="pop absolute inset-y-0 left-0 w-[260px] border-r border-line bg-sidebar">
            <button aria-label="Close menu" onClick={() => setDrawer(false)} className="absolute right-3 top-3.5 grid h-8 w-8 place-items-center rounded-md text-ink-3 hover:bg-raised"><X className="h-4 w-4" /></button>
            {sidebar(false)}
          </aside>
        </div>
      )}

      <div className="transition-[padding] duration-150 md:pl-16 lg:pl-[232px] group-data-[collapsed=true]/shell:lg:pl-16">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line-soft bg-page/80 px-4 backdrop-blur-md sm:px-8 print:hidden">
          <button aria-label="Open menu" onClick={() => setDrawer(true)} className="grid h-9 w-9 place-items-center rounded-lg text-ink-3 hover:bg-raised md:hidden"><Menu className="h-5 w-5" /></button>
          <button onClick={openPalette} aria-label="Search companies and commands" className="flex h-9 w-full max-w-[460px] items-center gap-2.5 rounded-lg border border-line bg-sunken px-3 text-left text-[13px] text-ink-4 transition-colors hover:border-line-ctl">
            <Search className="h-3.5 w-3.5" /><span className="flex-1 truncate">Search companies or jump to…</span>
            <kbd className="hidden rounded border border-line-ctl px-1.5 font-mono text-[10px] sm:block">⌘K</kbd>
          </button>
          <div className="ml-auto flex items-center gap-1.5">
            <button onClick={toggleTheme} aria-label={light ? "Switch to dark theme" : "Switch to light theme"} className="grid h-9 w-9 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-raised hover:text-ink">
              {light ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
            <div className="relative" ref={menuRef}>
              <button onClick={() => setMenu((m) => !m)} aria-haspopup="menu" aria-expanded={menu} aria-label="Profile menu" className="flex h-9 items-center gap-2 rounded-lg pl-1 pr-2 text-left transition-colors hover:bg-raised">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-btn text-[12px] font-bold text-white">N</span>
                <span className="hidden text-[13px] font-medium sm:block">Nikhil</span>
              </button>
              {menu && (
                <div role="menu" className="pop absolute right-0 top-11 z-30 w-60 overflow-hidden rounded-xl border border-white/10 bg-panel/90 shadow-xl backdrop-blur-xl">
                  <div className="border-b border-line-soft px-3.5 py-3"><div className="text-[13px] font-semibold">Nikhil</div><div className="text-xs text-ink-4">Enterprise account executive</div></div>
                  <Link role="menuitem" href="/settings" className="flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] hover:bg-raised"><Settings className="h-4 w-4 text-ink-3" /> Settings</Link>
                  <Link role="menuitem" href="/components-map" className="flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] hover:bg-raised"><Map className="h-4 w-4 text-ink-3" /> Components map</Link>
                  <a role="menuitem" href="https://github.com/manasvinipant-cloud9/tech-stack-scout" target="_blank" rel="noreferrer" className="flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] hover:bg-raised"><ExternalLink className="h-4 w-4 text-ink-3" /> Source code</a>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1320px] px-4 pb-14 pt-7 sm:px-8 print:p-0">{children}</main>
      </div>
      <CommandPalette companies={companies} light={light} toggleTheme={toggleTheme} />
      <AddCompanyHost />
      <Toaster />
    </div>
  );
}
