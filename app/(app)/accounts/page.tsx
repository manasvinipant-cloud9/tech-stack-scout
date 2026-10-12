import { AddCompanyButton } from "@/components/AddCompany";
import { AutoRefresh } from "@/components/ResearchButton";
import AccountsTable from "@/components/AccountsTable";
import FilterPills from "@/components/FilterPills";
import { Banner } from "@/components/ui";
import { dbConfigured, listCompanies } from "@/lib/db";
import { applyFilter, parseFilter } from "@/lib/filters";
import { matchCount } from "@/lib/checklist";

export const dynamic = "force-dynamic";

export default async function Accounts({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  if (!dbConfigured()) return <Banner tone="bad">DATABASE_URL is not set.</Banner>;
  const filter = parseFilter((await searchParams).filter);
  const all = await listCompanies();
  const sorted = [...all].sort((a, b) => matchCount(b) - matchCount(a) || (b.fit_score ?? -1) - (a.fit_score ?? -1) || a.company_name.localeCompare(b.company_name));
  const rows = applyFilter(sorted, filter);
  return (
    <div className="space-y-5">
      <AutoRefresh active={all.some((c) => c.status === "researching")} />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold leading-[1.1] tracking-[-0.03em]">Accounts</h1>
          <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-cap">{rows.length} of {all.length} shown · sorted by ICP match, then fit score</p>
        </div>
        <AddCompanyButton />
      </div>
      {all.length > 0 && <FilterPills rows={sorted} active={filter} />}
      {all.length === 0 ? (
        <p className="text-sm text-ink-3">No accounts yet. Use “Research a company”.</p>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-sm text-ink-3" style={{ borderColor: "var(--line-ctl)" }}>No accounts match this filter.</p>
      ) : (
        <AccountsTable rows={rows} />
      )}
    </div>
  );
}
