import Link from "next/link";
import type { Company } from "@/lib/db";
import { checklist } from "@/lib/checklist";
import { cloudOf, daysSince, fmtDate, hasData, isStale, primaryLanguage, reposActive, unsourcedCount } from "@/lib/derive";
import { ChecklistDots } from "./Checklist";
import { FitNumber, StaleChip } from "./ui";

export const COLS = "24px minmax(0,1.5fr) 60px 96px 96px 100px 64px 72px 84px minmax(0,1.1fr)";
const head = ["#", "ACCOUNT", "FIT", "ICP MATCH", "CLOUD", "LANGUAGE", "ENG ROLES", "REPOS 90D", "RESEARCHED", "NEXT ACTION"];

function nextAction(c: Company): { text: string; cls: string } {
  if (c.status === "researching") return { text: "Researching…", cls: "text-ink-3" };
  if (c.status === "error") return { text: "Research failed · retry", cls: "text-bad font-semibold" };
  if (!hasData(c)) return { text: "Not researched", cls: "text-ink-3" };
  if (isStale(c)) return { text: "Refresh research", cls: "text-warn font-semibold" };
  const u = unsourcedCount(c);
  if (u > 0) return { text: `Source ${u} fit reason${u > 1 ? "s" : ""}`, cls: "text-ink-2" };
  return { text: "—", cls: "text-ink-4" };
}

export default function AccountsTable({ rows }: { rows: Company[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <div className="min-w-[1080px]">
        <div className="grid items-center gap-3 border-b border-line bg-thead px-4 py-2 font-mono text-[10px] font-medium tracking-[0.06em] text-cap" style={{ gridTemplateColumns: COLS }}>
          {head.map((h) => <span key={h}>{h}</span>)}
        </div>
        {rows.map((c, i) => {
          const na = nextAction(c);
          const act = [c.activity_level && `${c.activity_level} activity`].filter(Boolean).join("");
          return (
            <Link
              key={c.id}
              href={`/accounts/${c.id}`}
              className="grid items-center gap-3 border-t border-line-soft px-4 py-[11px] text-[13px] transition-colors duration-100 first:border-t-0 hover:bg-hover"
              style={{ gridTemplateColumns: COLS }}
            >
              <span className="font-mono text-[11px] text-cap">{String(i + 1).padStart(2, "0")}</span>
              <span className="min-w-0">
                <span className="block truncate font-bold">
                  {c.company_name}
                  {isStale(c) && <StaleChip label={`STALE ${daysSince(c.last_updated!)}D`} />}
                </span>
                <span className="block truncate text-[11px] text-ink-3">{[c.domain, act, c.hiring_roles != null && `${c.hiring_roles} eng roles`].filter(Boolean).join(" · ")}</span>
              </span>
              <FitNumber n={c.fit_score} />
              {hasData(c) ? <ChecklistDots checks={checklist(c)} /> : <span className="text-ink-4">—</span>}
              <span className="truncate font-mono text-xs">{cloudOf(c)}</span>
              <span className="truncate font-mono text-xs">{primaryLanguage(c)}</span>
              <span>{c.hiring_roles ?? "—"}</span>
              <span>{reposActive(c) ?? "—"}</span>
              <span className="font-mono text-[11px] text-ink-3">{c.last_updated ? fmtDate(c.last_updated) : "—"}</span>
              <span className={`truncate ${na.cls}`}>{na.text}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
