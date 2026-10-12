"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Moon, Search, Sun, User } from "lucide-react";

type Item = { id: number; name: string; domain: string };

export default function Header({ companies }: { companies: Item[] }) {
  const path = usePathname();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(t.tagName) && !t.isContentEditable) {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch {}
  };

  const results = q.trim()
    ? companies.filter((c) => (c.name + c.domain).toLowerCase().includes(q.trim().toLowerCase())).slice(0, 6)
    : [];

  const nav = [
    { href: "/", label: "Dashboard", active: path === "/", count: null },
    { href: "/accounts", label: "Accounts", active: path.startsWith("/accounts"), count: companies.length },
  ];

  return (
    <header className="bg-hdr text-hdr-text">
      <div className="mx-auto flex h-14 max-w-[1376px] items-center gap-4 px-4 sm:gap-7 sm:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5 text-base font-bold tracking-[-0.02em]">
          <span className="grid h-[26px] w-[26px] place-items-center rounded-full border-2 border-lime">
            <span className="h-2 w-2 rounded-full bg-lime" />
          </span>
          <span className="hidden sm:inline">Stack Scout</span>
        </Link>
        <nav className="flex h-full items-stretch">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`flex items-center gap-1.5 px-2.5 text-sm transition-colors duration-100 ${
                n.active ? "font-semibold text-white shadow-[inset_0_-3px_0_var(--lime)]" : "text-hdr-dim hover:text-white"
              }`}
            >
              {n.label}
              {n.count != null && <span className="font-mono text-[11px] font-medium opacity-70">{n.count}</span>}
            </Link>
          ))}
        </nav>
        <div className="relative ml-auto hidden w-[260px] sm:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-hdr-dim" />
          <input
            ref={ref}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            placeholder="Find a company"
            className="h-[34px] w-full rounded-[17px] bg-hdr-field pl-9 pr-8 text-[13px] text-white outline-none placeholder:text-hdr-dim focus:ring-1 focus:ring-lime"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[11px] text-hdr-dim">/</span>
          {open && results.length > 0 && (
            <div className="absolute left-0 right-0 top-10 z-20 overflow-hidden rounded-xl border border-line bg-panel text-ink shadow-lg">
              {results.map((r) => (
                <Link key={r.id} href={`/accounts/${r.id}`} onClick={() => { setQ(""); setOpen(false); }} className="block px-3.5 py-2.5 hover:bg-hover">
                  <div className="text-[13px] font-bold">{r.name}</div>
                  <div className="font-mono text-[11px] text-ink-4">{r.domain}</div>
                </Link>
              ))}
            </div>
          )}
        </div>
        <button onClick={toggle} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} className="grid h-8 w-8 place-items-center rounded-full text-hdr-dim transition-colors duration-100 hover:bg-hdr-field hover:text-white">
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-lime text-[#1f3b2d]">
          <User className="h-4 w-4" />
        </div>
      </div>
    </header>
  );
}
