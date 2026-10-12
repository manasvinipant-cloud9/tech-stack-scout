import Link from "next/link";
import type { Company } from "@/lib/db";
import { FILTERS, countFor, type FilterKey } from "@/lib/filters";

/** Salesforce-style list-view pills. State lives in the URL (?filter=…), so a view can be shared or bookmarked. */
export default function FilterPills({ rows, active }: { rows: Company[]; active: FilterKey }) {
  return (
    <div className="flex flex-wrap gap-2">
      {FILTERS.map((f) => {
        const on = f.key === active;
        return (
          <Link
            key={f.key}
            href={f.key === "all" ? "/accounts" : `/accounts?filter=${f.key}`}
            className={`inline-flex h-[30px] items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13px] transition-colors duration-100 ${
              on ? "bg-ink font-semibold text-page" : "border border-line-ctl text-ink hover:border-ink"
            }`}
          >
            {f.label}
            <span className={`font-mono text-[11px] ${on ? "opacity-70" : "text-ink-4"}`}>{countFor(rows, f.key)}</span>
          </Link>
        );
      })}
    </div>
  );
}
