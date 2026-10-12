"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AccountTabs({ id, counts }: { id: number; counts: { stack: number; notes: number } }) {
  const path = usePathname();
  const base = `/accounts/${id}`;
  const tabs = [
    { href: base, label: "Overview", count: null },
    { href: `${base}/stack`, label: "Tech stack", count: counts.stack },
    { href: `${base}/notes`, label: "Notes & research", count: counts.notes },
  ];
  return (
    <div className="flex gap-1 overflow-x-auto">
      {tabs.map((t) => {
        const active = t.href === base ? path === base : path.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`-mb-px whitespace-nowrap rounded-t-[10px] border px-4 py-2.5 text-sm transition-colors duration-100 ${
              active ? "border-line border-b-panel bg-panel font-semibold text-ink" : "border-transparent text-ink-3 hover:text-ink"
            }`}
          >
            {t.label}
            {t.count != null && <span className="ml-1.5 font-mono text-[11px] text-ink-5">{t.count}</span>}
          </Link>
        );
      })}
    </div>
  );
}
