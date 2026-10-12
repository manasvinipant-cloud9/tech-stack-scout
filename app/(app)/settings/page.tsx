import { CheckCircle2, CircleDashed, Lock } from "lucide-react";
import IcpSettings from "@/components/IcpSettings";
import ResearchPrefs from "@/components/ResearchPrefs";
import { Banner, PageHeader, Panel, SectionHeader } from "@/components/ui";
import { dbConfigured, listCompanies } from "@/lib/db";
import { staleDays } from "@/lib/derive";
import { models, usingOpenRouter } from "@/lib/llm";
import { productName } from "@/lib/product";
import { REFRESH_SCHEDULE, nextRunLabel } from "@/lib/schedule";
import { loadSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

function Row({ label, value, ok, note }: { label: string; value: React.ReactNode; ok?: boolean; note?: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-1 py-3">
      <div className="min-w-0"><div className="text-[13.5px] font-medium">{label}</div>{note && <div className="mt-0.5 text-xs text-ink-4">{note}</div>}</div>
      <div className="flex items-center gap-2 text-[13px] text-ink-2">{ok != null && (ok ? <CheckCircle2 className="h-4 w-4 text-good" aria-label="Configured" /> : <CircleDashed className="h-4 w-4 text-ink-4" aria-label="Not configured" />)}{value}</div>
    </div>
  );
}
const Locked = () => <span className="inline-flex items-center gap-1 font-mono text-[10.5px] uppercase tracking-[0.06em] text-ink-4"><Lock className="h-3 w-3" /> Environment</span>;

export default async function Settings() {
  const icp = await loadSettings();
  let count = 0, dbOk = false;
  if (dbConfigured()) { try { count = (await listCompanies()).length; dbOk = true; } catch {} }
  const m = models();
  const env = (k: string) => Boolean(process.env[k]?.trim());

  return (
    <div className="max-w-4xl">
      <PageHeader title="Settings" subtitle="Define your ideal customer profile and see how Stack Scout is configured." />
      {!dbOk && <div className="mb-5"><Banner tone="bad">The database is not reachable, so ICP changes cannot be saved.</Banner></div>}

      <section className="mb-8">
        <SectionHeader title="Ideal customer profile" hint="Editable · saved to your database" />
        <Panel className="p-5">
          <p className="mb-5 text-sm text-ink-3">An account matches when its observed environment overlaps these targets. Matches update everywhere as soon as you save. Existing research doesn&apos;t need to be re-run.</p>
          <IcpSettings clouds={icp.clouds} languages={icp.languages} />
          <div className="mt-5 rounded-lg bg-sunken p-3.5 text-[13px] text-ink-3"><b className="text-ink-2">Microservices</b> is the third criterion. It is judged from evidence (service-style repositories, orchestration tooling, job descriptions, engineering blog) and has no target to configure.</div>
        </Panel>
      </section>

      <section className="mb-8">
        <SectionHeader title="Research preferences" hint="Editable · saved to your database" />
        <Panel className="p-5">
          <ResearchPrefs staleDays={icp.staleDays} batchSize={icp.batchSize} />
          <div className="mt-5 divide-y divide-line-soft border-t border-line-soft pt-1">
            <Row label="Monitored accounts" value={`${count} companies`} note="Add and remove companies from the Accounts page. No code changes needed." />
            <Row label="Evidence rule" value="Unsourced fit reasons score 0" note="Fit = strength of sourced reasons ÷ 15. Not configurable, by design." />
          </div>
        </Panel>
      </section>

      <section className="mb-8">
        <SectionHeader title="Weekly refresh" hint="Informational" />
        <Panel className="divide-y divide-line-soft px-5">
          <Row label="Schedule" value={REFRESH_SCHEDULE} note="Set in vercel.json and run by Vercel Cron. Change it in the repository and redeploy." />
          <Row label="Next run" value={nextRunLabel()} />
          <Row label="Per-run limit" value={`${icp.batchSize} accounts`} note="Set under Research preferences above." />
          <Row label="Cron secret" ok={env("CRON_SECRET")} value={env("CRON_SECRET") ? "Set" : "Missing"} note="Protects the refresh endpoint." />
        </Panel>
      </section>

      <section>
        <SectionHeader title="Application and integrations" hint="Read-only status · values are never shown" />
        <Panel className="divide-y divide-line-soft px-5">
          <Row label="Database" ok={dbOk} value={dbOk ? "Connected (Neon Postgres)" : "Not connected"} />
          <Row label="AI route" ok={env("OPENROUTER_API_KEY") || env("GEMINI_API_KEY")} value={usingOpenRouter() ? "OpenRouter · Google models only" : env("GEMINI_API_KEY") ? "Gemini API (direct)" : "No key set"} note={`Models: ${m.join(", then ")}. Only Gemini Flash models are used.`} />
          <Row label="GitHub token" ok={env("GITHUB_TOKEN")} value={env("GITHUB_TOKEN") ? "Set" : "Not set"} note={env("GITHUB_TOKEN") ? "5,000 GitHub requests per hour." : "Without a token GitHub allows 60 requests per hour."} />
          <Row label="Product name" ok={env("PRODUCT_NAME")} value={<>{productName()} <Locked /></>} />
          <Row label="Product description" ok={env("PRODUCT_PITCH")} value={<>{env("PRODUCT_PITCH") ? "Set" : "Not set"} <Locked /></>} note="Drives fit reasons and opening lines. Set PRODUCT_PITCH in the environment." />
        </Panel>
      </section>
    </div>
  );
}
