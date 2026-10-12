import Header from "@/components/Header";
import { dbConfigured, listCompanies } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let companies: { id: number; name: string; domain: string }[] = [];
  if (dbConfigured()) {
    try {
      companies = (await listCompanies()).map((c) => ({ id: c.id, name: c.company_name, domain: c.domain }));
    } catch {}
  }
  return (
    <>
      <Header companies={companies} />
      <main className="mx-auto max-w-[1376px] px-4 pb-10 pt-7 sm:px-8">{children}</main>
    </>
  );
}
