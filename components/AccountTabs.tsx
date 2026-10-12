"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AccountTabs({ id, notes }: { id: number; notes: number }) {
  const path = usePathname();
  const base = `/accounts/${id}`;
  const tabs = [
    { href: base, label: "Intelligence", on: path === base },
    { href: `${base}/notes`, label: "Evidence & notes", on: path.startsWith(`${base}/notes`), count: notes },
  ];
  return (
    <nav className="flex gap-1 border-b border-line" aria-label="Account sections">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} aria-current={t.on ? "page" : undefined}
          className={`-mb-px border-b-2 px-3.5 py-2.5 text-[13.5px] transition-colors ${t.on ? "border-accent font-semibold text-ink" : "border-transparent text-ink-3 hover:text-ink"}`}>
          {t.label}{t.count ? <span className="ml-1.5 font-mono text-[11px] text-ink-4">{t.count}</span> : null}
        </Link>
      ))}
    </nav>
  );
}
