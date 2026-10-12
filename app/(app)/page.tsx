import Link from "next/link";
import { Activity, Briefcase, Building2, Clock, GitBranch, Target } from "lucide-react";
import { AddCompanyButton, AddCompanyForm } from "@/components/AddCompany";
import { AutoRefresh } from "@/components/ResearchButton";
import AccountsTable from "@/components/AccountsTable";
import { Banner, Cap, Panel } from "@/components/ui";
import { dbConfigured, listCompanies, type Company } from "@/lib/db";
import { daysSince, fmtDate, hasData, isStale, primaryLanguage, reposActive, sourcedCount, unsourcedCount } from "@/lib/derive";

export const dynamic = "force-dynamic";

const RAMP = ["#1f4d3a", "#3f7a5a", "#6fa083", "#9dbfa9", "#c9dbcf"];

export default async function Dashboard() {
  if (!dbConfigured()) return <Banner tone="bad">DATABASE_URL is not set. Add your Neon connection string to the environment and reload.</Banner>;
  let all: Company[] = [];
  try {
    all = await listCompanies();
  } catch (e) {
    return <Banner tone="bad">Could not read accounts: {(e as Error).message}</Banner>;
  }

  if (all.length === 0) {
    return (
      <div>
        <h1 className="text-[28px] font-extrabold leading-[1.1] tracking-[-0.03em]">Dashboard</h1>
        <div className="mt-6 rounded-2xl border-2 border-dashed p-8 sm:p-12" style={{ borderColor: "var(--line-ctl)" }}>
          <h2 className="text-[28px] font-bold tracking-[-0.02em]">0 accounts tracked</h2>
          <p className="mt-2 max-w-xl text-sm text-ink-3">
            Add a company to collect public signals from its GitHub org, website and job boards, map its stack, and score fit with your product.
          </p>
          <div className="mt-6 max-w-3xl"><AddCompanyForm /></div>
        </div>
      </div>
    );
  }

  const researched = all.filter(hasData);
  const scored = all.filter((c) => c.fit_score != null);
  const stale = all.filter(isStale);
  const failed = all.filter((c) => c.status === "error");
  const busy = all.filter((c) => c.status === "researching");
  const sum = (f: (c: Company) => number | null) => researched.reduce((n, c) => n + (f(c) ?? 0), 0);
  const roles = sum((c) => c.hiring_roles);
  const repos = sum(reposActive);

  const kpis = [
    { icon: Building2, label: "Total accounts", value: all.length, note: `${researched.length} researched` },
    { icon: Target, label: "Strong fit (80+)", value: scored.filter((c) => c.fit_score! >= 80).length, note: `of ${scored.length} scored` },
    { icon: Briefcase, label: "Open eng roles", value: roles, note: `${researched.filter((c) => c.hiring_roles != null).length} job boards found` },
    { icon: GitBranch, label: "Repos active 90d", value: repos, note: `${researched.filter((c) => c.signals?.github).length} GitHub orgs found` },
    { icon: Clock, label: "Stale (>30d)", value: stale.length, note: "need refresh", bad: stale.length > 0 },
    { icon: Activity, label: "Failed runs", value: failed.length, note: "last research errored", bad: failed.length > 0 },
  ];

  const bands = [
    { name: "Strong 80+", n: scored.filter((c) => c.fit_score! >= 80).length },
    { name: "Good 60–79", n: scored.filter((c) => c.fit_score! >= 60 && c.fit_score! < 80).length },
    { name: "Moderate 40–59", n: scored.filter((c) => c.fit_score! >= 40 && c.fit_score! < 60).length },
    { name: "Low <40", n: scored.filter((c) => c.fit_score! < 40).length },
    { name: "Unscored", n: all.length - scored.length },
  ];
  const bandTotal = Math.max(1, all.length);

  const signalBars = [
    { name: "Hiring found", n: researched.filter((c) => (c.hiring_roles ?? 0) > 0).length },
    { name: "Repository activity", n: researched.filter((c) => (reposActive(c) ?? 0) > 0).length },
    { name: "GitHub org found", n: researched.filter((c) => c.signals?.github).length },
    { name: "Website fingerprinted", n: researched.filter((c) => c.signals?.site).length },
    { name: "Stack identified", n: researched.filter((c) => (c.analysis?.technologies.length ?? 0) > 0).length },
  ];
  const sigMax = Math.max(1, ...signalBars.map((s) => s.n));

  const priority = [...all].sort((a, b) => (b.fit_score ?? -1) - (a.fit_score ?? -1) || (b.hiring_roles ?? 0) - (a.hiring_roles ?? 0)).slice(0, 7);
  const top = scored.sort((a, b) => b.fit_score! - a.fit_score!)[0];
  const gaps = all.filter((c) => unsourcedCount(c) > 0);
  const recent = [...researched].sort((a, b) => +new Date(b.last_updated!) - +new Date(a.last_updated!)).slice(0, 6);
  const newest = recent[0]?.last_updated;

  return (
    <div className="space-y-5">
      <AutoRefresh active={busy.length > 0} />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold leading-[1.1] tracking-[-0.03em]">Dashboard</h1>
          <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-cap">
            {all.length} accounts{newest ? ` · last research ${fmtDate(newest)}` : ""}
          </p>
        </div>
        <AddCompanyButton />
      </div>

      {busy.length > 0 && <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-cap">Researching {busy.length} account{busy.length > 1 ? "s" : ""} · GitHub · website · job boards · fit analysis</p>}
      {failed.length > 0 && (
        <Banner tone="bad">
          Research failed: {failed.length} of {all.length} accounts ({failed.slice(0, 3).map((c) => c.company_name).join(", ")}). Open an account to retry.
        </Banner>
      )}
      {stale.length > 0 && (
        <Banner tone="warn">
          {stale.length} account{stale.length > 1 ? "s" : ""} last researched &gt;30d ago ({stale.slice(0, 3).map((c) => `${c.company_name} ${daysSince(c.last_updated!)}d`).join(", ")}).
        </Banner>
      )}

      <div className="grid grid-cols-2 border-y border-line border-t-2 border-t-ink md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k, i) => (
          <div key={k.label} className={`px-3.5 py-3 ${i > 0 ? "xl:border-l xl:border-line-soft" : ""} ${i % 2 ? "border-l border-line-soft md:border-l-0" : ""} ${i % 3 ? "md:border-l md:border-line-soft" : ""}`}>
            <div className="flex items-center gap-1.5 text-xs text-ink-3"><k.icon className="h-3.5 w-3.5" />{k.label}</div>
            <div className="mt-1 text-[28px] font-extrabold tracking-[-0.03em]">{k.value}</div>
            <div className={`font-mono text-[11px] ${k.bad ? "text-bad" : "text-ink-4"}`}>{k.note}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Panel className="p-[18px]">
          <div className="flex items-baseline gap-3"><h3 className="text-lg font-bold tracking-[-0.01em]">Fit distribution</h3><Cap>{scored.length} scored · {all.length} total</Cap></div>
          <div className="mt-3 flex h-3 overflow-hidden rounded-sm bg-chip">
            {bands.map((b, i) => b.n > 0 && <div key={b.name} style={{ width: `${(b.n / bandTotal) * 100}%`, background: RAMP[i] }} />)}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {bands.map((b, i) => (
              <div key={b.name}>
                <div className="flex items-center gap-1.5 text-xs text-ink-3"><span className="h-2 w-2 rounded-[2px]" style={{ background: RAMP[i] }} />{b.name}</div>
                <div className="text-2xl font-extrabold tracking-[-0.02em]">{b.n}</div>
                <div className="font-mono text-[11px] text-ink-4">account{b.n === 1 ? "" : "s"}</div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel className="p-[18px]">
          <div className="flex items-baseline gap-3"><h3 className="text-lg font-bold tracking-[-0.01em]">Signal coverage</h3><Cap>of {researched.length} researched</Cap></div>
          <div className="mt-3 space-y-2">
            {signalBars.map((s) => (
              <div key={s.name} className="grid grid-cols-[150px_1fr_24px] items-center gap-3 text-[13px]">
                <span className="text-ink-2">{s.name}</span>
                <span className="h-2 rounded-full bg-chip"><span className="block h-2 rounded-full bg-accent" style={{ width: `${(s.n / sigMax) * 100}%` }} /></span>
                <span className="text-right font-semibold">{s.n}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel className="p-[18px]">
        <div className="mb-3 flex flex-wrap items-baseline gap-3">
          <h3 className="text-lg font-bold tracking-[-0.01em]">Priority accounts</h3>
          <span className="text-[13px] text-ink-3">sorted by fit score · {priority.length} of {all.length}</span>
          <Link href="/accounts" className="link ml-auto text-[13px] font-semibold">View all</Link>
        </div>
        <AccountsTable rows={priority} />
      </Panel>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <section className="rounded-[14px] bg-deep p-5 text-dark-text">
          <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-lime">✳ Insights · computed from signals</div>
          <div className="mt-3 divide-y divide-deep-line">
            {top ? (
              <div className="py-3 first:pt-0">
                <div className="text-[15px] font-bold">Opportunity · {top.company_name} · fit {top.fit_score}</div>
                <p className="mt-1 text-[13px] text-dark-meta">{sourcedCount(top)} of {top.analysis?.fit_reasons.length ?? 0} fit reasons sourced · {top.hiring_roles ?? 0} open eng roles · {primaryLanguage(top)} primary language.</p>
                <Link href={`/accounts/${top.id}`} className="mt-1.5 inline-block text-[13px] font-semibold text-lime underline underline-offset-[3px]">Open account</Link>
              </div>
            ) : (
              <div className="py-3 first:pt-0">
                <div className="text-[15px] font-bold">No fit scores yet</div>
                <p className="mt-1 text-[13px] text-dark-meta">Set PRODUCT_PITCH in the environment, then re-research accounts to score fit.</p>
              </div>
            )}
            <div className="py-3">
              <div className="text-[15px] font-bold">Gap · {gaps.length} account{gaps.length === 1 ? "" : "s"} with unsourced fit reasons</div>
              <p className="mt-1 text-[13px] text-dark-meta">{gaps.length ? `${gaps.slice(0, 3).map((c) => `${c.company_name} (${unsourcedCount(c)})`).join(", ")}. Unsourced reasons score 0.` : "Every fit reason has a source."}</p>
            </div>
            <div className="py-3 last:pb-0">
              <div className="text-[15px] font-bold">Risk · {stale.length} stale · {failed.length} failed</div>
              <p className="mt-1 text-[13px] text-dark-meta">{stale.length + failed.length ? "Re-research these accounts before relying on their numbers." : "All research is under 30 days old."}</p>
            </div>
          </div>
        </section>
        <Panel className="p-5">
          <div className="flex items-baseline justify-between"><h3 className="text-lg font-bold">Recent research</h3><Cap>latest {recent.length}</Cap></div>
          <ul className="mt-2 divide-y divide-line-soft">
            {recent.map((c) => (
              <li key={c.id}>
                <Link href={`/accounts/${c.id}`} className="flex items-center gap-3 py-2.5 hover:opacity-80">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-bold">{c.company_name}</span>
                    <span className="block truncate text-[13px] text-ink-2">Fit {c.fit_score ?? "—"} · {c.hiring_roles ?? 0} eng roles · {reposActive(c) ?? 0} repos active</span>
                  </span>
                  <span className="font-mono text-[11px] text-ink-4">{fmtDate(c.last_updated!)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
