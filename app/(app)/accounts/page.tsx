import { AddCompanyButton } from "@/components/AddCompany";
import { AutoRefresh } from "@/components/ResearchButton";
import AccountsTable from "@/components/AccountsTable";
import { Banner } from "@/components/ui";
import { dbConfigured, listCompanies } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Accounts() {
  if (!dbConfigured()) return <Banner tone="bad">DATABASE_URL is not set.</Banner>;
  const all = await listCompanies();
  const sorted = [...all].sort((a, b) => (b.fit_score ?? -1) - (a.fit_score ?? -1) || a.company_name.localeCompare(b.company_name));
  return (
    <div className="space-y-5">
      <AutoRefresh active={all.some((c) => c.status === "researching")} />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold leading-[1.1] tracking-[-0.03em]">Accounts</h1>
          <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-cap">{all.length} tracked · sorted by fit score</p>
        </div>
        <AddCompanyButton />
      </div>
      {all.length === 0 ? <p className="text-sm text-ink-3">No accounts yet. Use “Research a company”.</p> : <AccountsTable rows={sorted} />}
    </div>
  );
}
