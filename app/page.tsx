import Dashboard from "@/components/Dashboard";
import ThemeToggle from "@/components/ThemeToggle";
import { dbConfigured, listCompanies, type Company } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  let companies: Company[] = [];
  let error: string | null = null;
  if (!dbConfigured()) error = "DATABASE_URL is not set. Add your Neon connection string to the environment and reload.";
  else {
    try {
      companies = await listCompanies();
    } catch (e) {
      error = (e as Error).message;
    }
  }
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tech Stack Scout</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Engineering intel and outreach hooks for your target accounts, so call prep takes seconds.
          </p>
        </div>
        <ThemeToggle />
      </header>
      {error ? (
        <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-4 text-sm text-red-800 dark:text-red-300">{error}</div>
      ) : (
        <Dashboard initial={companies} />
      )}
    </main>
  );
}
