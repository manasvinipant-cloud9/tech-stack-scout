import AppShell from "@/components/AppShell";
import { dbConfigured, listCompanies } from "@/lib/db";
import { fmtDate, relativeTime } from "@/lib/derive";
import { nextRunLabel } from "@/lib/schedule";
import { productName } from "@/lib/product";
import { loadSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await loadSettings();
  let companies: { id: number; name: string; domain: string }[] = [];
  let last: string | null = null;
  if (dbConfigured()) {
    try {
      const all = await listCompanies();
      companies = all.map((c) => ({ id: c.id, name: c.company_name, domain: c.domain }));
      const times = all.map((c) => c.last_updated).filter((t): t is string => !!t).sort();
      last = times.length ? relativeTime(times[times.length - 1]) : null;
    } catch {}
  }
  void fmtDate;
  return (
    <AppShell companies={companies} lastResearch={last} nextRefresh={nextRunLabel()} product={productName()}>
      {children}
    </AppShell>
  );
}
