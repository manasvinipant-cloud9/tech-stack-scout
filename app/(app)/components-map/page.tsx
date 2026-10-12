import type { Metadata } from "next";
import { Cap, Panel } from "@/components/ui";

export const metadata: Metadata = { title: "Components map · Stack Scout" };

type Node = { x: number; y: number; w: number; title: string; sub: string; tone?: "ai" | "data" | "app" | "ext" };
const H = 58;

const nodes: Record<string, Node> = {
  github: { x: 20, y: 20, w: 190, title: "GitHub REST API", sub: "org, repos, languages, activity", tone: "ext" },
  site: { x: 20, y: 96, w: 190, title: "Company website", sub: "headers, script hosts, meta", tone: "ext" },
  jobs: { x: 20, y: 172, w: 190, title: "Job boards", sub: "Greenhouse · Lever · Ashby", tone: "ext" },
  blog: { x: 20, y: 248, w: 190, title: "Engineering blog", sub: "RSS / Atom feed discovery", tone: "ext" },
  collect: { x: 290, y: 96, w: 200, title: "Signal collector", sub: "lib/signals.ts · parallel fetch", tone: "app" },
  gemini: { x: 290, y: 20, w: 200, title: "Gemini Flash", sub: "via OpenRouter · google/* only", tone: "ai" },
  score: { x: 290, y: 190, w: 200, title: "Scoring + ICP checklist", sub: "fit score · cloud / microservices / language", tone: "app" },
  db: { x: 570, y: 96, w: 190, title: "Neon Postgres", sub: "target_companies · account_notes", tone: "data" },
  cron: { x: 570, y: 248, w: 190, title: "Vercel Cron", sub: "weekly · Mon 06:00 UTC", tone: "app" },
  ui: { x: 840, y: 96, w: 200, title: "Next.js dashboard", sub: "dashboard · accounts · tech stack · notes", tone: "app" },
  user: { x: 840, y: 20, w: 200, title: "Nikhil (AE)", sub: "add / remove / refresh accounts", tone: "ext" },
};

const edges: [string, string][] = [
  ["github", "collect"], ["site", "collect"], ["jobs", "collect"], ["blog", "collect"],
  ["collect", "gemini"], ["gemini", "score"], ["score", "db"], ["cron", "collect"], ["db", "ui"], ["user", "ui"],
];

const fill = { ai: "var(--deep)", data: "var(--sunken)", app: "var(--panel)", ext: "var(--surface)" };
const text = (t?: Node["tone"]) => (t === "ai" ? "var(--dark-text)" : "var(--ink)");

const table: [string, string, string, string][] = [
  ["Signal collector", "Pulls public engineering signals from four live sources in parallel; no API keys needed except an optional GitHub token for rate limits.", "Next.js route handlers, fetch", "lib/signals.ts"],
  ["Job-description reader", "Reads up to 15 engineering job posts and counts tool mentions (AWS, Kubernetes, Go…) and microservices wording.", "Greenhouse / Lever / Ashby public APIs", "lib/signals.ts"],
  ["Engineering-blog reader", "Discovers a feed on common blog locations and reads recent posts and their cadence.", "RSS / Atom parsing", "lib/signals.ts"],
  ["Gemini analyst", "Classifies the stack (confirmed vs inferred, with source), judges architecture, writes fit reasons, open questions, the two-paragraph summary and the personalised first line. Retries on overload and rewrites over-long openers.", "Google Gemini Flash (google/gemini-3.8-flash) via OpenRouter, Google-only providers; direct Gemini API as alternate", "lib/gemini.ts · lib/llm.ts"],
  ["Evidence guard", "Any claim citing a source we never collected is downgraded to “inferred / no source” so it cannot inflate the score.", "TypeScript", "lib/gemini.ts"],
  ["Fit score", "Sum of sourced fit-reason strength ÷ 15. Unsourced reasons score 0.", "TypeScript", "lib/research.ts"],
  ["ICP checklist", "Cloud, microservices and language checks against configurable targets, each with a verdict and evidence.", "TypeScript, env-configured", "lib/checklist.ts · lib/icp.ts"],
  ["Watchlist store", "Companies, cached intelligence, signals JSON, notes. Add and remove from the UI or directly in the database.", "Neon serverless Postgres", "lib/db.ts"],
  ["Weekly refresh", "Re-researches accounts that are new, older than 7 days, or failed last run; time-budgeted, protected by CRON_SECRET.", "Vercel Cron", "app/api/cron/refresh · vercel.json"],
  ["Overview and Accounts", "Bento command centre with a prioritised action queue; filterable watchlist with a master–detail quick view, bulk actions, add and remove companies; ⌘K command palette.", "Next.js App Router, Tailwind v4", "app/(app)/page.tsx · lib/actions.ts · components/AccountDrawer.tsx"],
  ["Account Intelligence", "Per-company dossier: summary, ICP fit with evidence, technology map, activity, opening line with regenerate, research history.", "Server components + small client islands", "app/(app)/accounts/[id]"],
  ["Research & Signals", "Signal coverage matrix, evidence gaps, refresh queue and chronological research log.", "Server components", "app/(app)/research · lib/coverage.ts"],
  ["Outreach Studio", "Choose a company, inspect its observations, generate / regenerate / copy an evidence-backed opening line (Gemini Flash).", "Gemini Flash via lib/llm.ts", "app/(app)/outreach · lib/outreach.ts"],
  ["Settings and run history", "Editable ICP targets and research preferences (stale threshold, weekly limit) plus a research-run log, all persisted in Postgres (app_settings, research_runs).", "Neon Postgres", "app/(app)/settings · lib/settings.ts"],
];

export default function ComponentsMap() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-extrabold leading-[1.1] tracking-[-0.03em]">Components map</h1>
        <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-cap">How data flows from public sources to Nikhil&apos;s call prep</p>
      </div>

      <Panel className="overflow-x-auto p-4">
        <svg viewBox="0 0 1060 330" className="mx-auto min-w-[860px]" role="img" aria-label="Component diagram">
          <defs>
            <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0L10 5L0 10z" fill="var(--ink-4)" />
            </marker>
          </defs>
          {edges.map(([a, b]) => {
            const A = nodes[a], B = nodes[b];
            const forward = B.x > A.x + A.w - 1;
            const x1 = forward ? A.x + A.w : A.x + A.w / 2;
            const y1 = forward ? A.y + H / 2 : B.y > A.y ? A.y + H : A.y;
            const x2 = forward ? B.x : B.x + B.w / 2;
            const y2 = forward ? B.y + H / 2 : B.y > A.y ? B.y : B.y + H;
            const d = forward ? `M${x1},${y1} C${x1 + 40},${y1} ${x2 - 40},${y2} ${x2},${y2}` : `M${x1},${y1} L${x2},${y2}`;
            return <path key={a + b} d={d} fill="none" stroke="var(--ink-4)" strokeWidth="1.5" markerEnd="url(#arr)" />;
          })}
          {Object.values(nodes).map((n) => (
            <g key={n.title}>
              <rect x={n.x} y={n.y} width={n.w} height={H} rx="12" fill={fill[n.tone ?? "app"]} stroke="var(--line)" strokeWidth="1.5" strokeDasharray={n.tone === "ext" ? "0" : "0"} />
              <text x={n.x + 14} y={n.y + 24} fontSize="13" fontWeight="700" fill={text(n.tone)}>{n.title}</text>
              <text x={n.x + 14} y={n.y + 42} fontSize="10.5" fill={n.tone === "ai" ? "var(--dark-meta)" : "var(--ink-3)"}>{n.sub}</text>
            </g>
          ))}
        </svg>
        <div className="mt-3 flex flex-wrap gap-4 font-mono text-[11px] uppercase tracking-[0.06em] text-cap">
          <span>White: external source or person</span><span>Dark: AI (Gemini Flash only)</span><span>Beige: stored data</span><span>Panel: our application code</span>
        </div>
      </Panel>

      <Panel className="overflow-x-auto">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-[180px_1fr_200px_200px] gap-4 border-b border-line bg-thead px-4 py-2 font-mono text-[10px] font-medium tracking-[0.06em] text-cap">
            <span>COMPONENT</span><span>RESPONSIBILITY</span><span>TECHNOLOGY</span><span>CODE</span>
          </div>
          {table.map(([n, r, t, f]) => (
            <div key={n} className="grid grid-cols-[180px_1fr_200px_200px] gap-4 border-t border-line-soft px-4 py-3 text-[13px] first:border-t-0">
              <span className="font-bold">{n}</span><span className="text-ink-2">{r}</span><span className="text-ink-2">{t}</span><span className="font-mono text-xs text-ink-3">{f}</span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="p-5">
        <Cap>Brief requirements → where they are met</Cap>
        <ul className="mt-3 grid gap-x-8 gap-y-1.5 text-[13px] text-ink-2 sm:grid-cols-2">
          <li>Live external data: GitHub, website, job boards, engineering blog</li>
          <li>All AI tasks on Gemini Flash (no other model)</li>
          <li>Languages, cloud tooling and team activity per company</li>
          <li>Two-paragraph summary and a non-template first line</li>
          <li>Weekly refresh so stale research does not reach a call</li>
          <li>Add or remove companies without touching code</li>
          <li>Relevance in the three contexts: cloud, microservices, language</li>
          <li>Deployed on Vercel with a public URL</li>
        </ul>
      </Panel>
    </div>
  );
}
