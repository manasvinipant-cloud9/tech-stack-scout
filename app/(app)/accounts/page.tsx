import { Suspense } from "react";
import { AddCompanyButtons } from "@/components/AddCompany";
import AccountsFilters from "@/components/AccountsFilters";
import AccountsTable from "@/components/AccountsTable";
import { AutoRefresh } from "@/components/ResearchButton";
import { Banner, EmptyState, PageHeader } from "@/components/ui";
import { toRow, queryRows, viewCounts, type Query } from "@/lib/accounts";
import { dbConfigured, listCompanies } from "@/lib/db";
import { loadIcp } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function Accounts({ searchParams }: { searchParams: Promise<Query> }) {
  if (!dbConfigured()) return <Banner tone="bad">DATABASE_URL is not set.</Banner>;
  await loadIcp();
  const query = await searchParams;
  const all = await listCompanies();
  const rows = all.map(toRow);
  const shown = queryRows(rows, query);
  const uniq = (f: (r: (typeof rows)[number]) => string) => [...new Set(rows.map(f).filter((v) => v && v !== "—"))].sort();

  return (
    <div>
      <AutoRefresh active={rows.some((r) => r.status === "researching")} />
      <PageHeader title="Accounts" subtitle="The companies you're watching. Research refreshes weekly, and you can refresh any account on demand."
        meta={<span>{rows.length} monitored companies</span>} actions={<AddCompanyButtons />} />
      {rows.length === 0 ? (
        <EmptyState title="Your watchlist is empty" action={<div className="flex gap-2"><AddCompanyButtons /></div>}>Add companies you plan to contact. Stack Scout will gather their public engineering signals.</EmptyState>
      ) : (
        <div className="space-y-4">
          <Suspense fallback={<div className="skel h-24" />}>
            <AccountsFilters counts={viewCounts(rows)} clouds={uniq((r) => r.cloud)} languages={uniq((r) => r.language)} total={rows.length} shown={shown.length} />
          </Suspense>
          {shown.length === 0
            ? <EmptyState title="No accounts match these filters">Try removing a filter, or use “Clear all filters”.</EmptyState>
            : <AccountsTable rows={shown} />}
        </div>
      )}
    </div>
  );
}
