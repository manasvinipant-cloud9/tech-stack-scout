# Components Map: Stack Scout

```mermaid
flowchart LR
  subgraph Sources[Live public sources]
    GH[GitHub REST API<br/>org, repos, languages, activity]
    WEB[Company website<br/>headers, script hosts, meta]
    JOBS[Job boards<br/>Greenhouse / Lever / Ashby<br/>titles + descriptions]
    BLOG[Engineering blog<br/>RSS / Atom]
  end

  CRON[Vercel Cron<br/>weekly, Mon 06:00 UTC]
  COL[Signal collector<br/>lib/signals.ts]
  GEM[[Gemini Flash via OpenRouter<br/>google/* models, Google-only providers<br/>lib/llm.ts + lib/gemini.ts<br/>stack, architecture, fit reasons,<br/>summary, first line]]
  GUARD[Evidence guard + scoring<br/>fit score, ICP checklist<br/>lib/research.ts, lib/checklist.ts]
  DB[(Neon Postgres<br/>target_companies, account_notes)]
  UI[Next.js dashboard<br/>dashboard, accounts, tech stack, notes]
  USER([Nikhil, account executive])

  GH --> COL
  WEB --> COL
  JOBS --> COL
  BLOG --> COL
  CRON -->|stale or failed accounts| COL
  COL --> GEM --> GUARD --> DB --> UI
  USER -->|add / remove / refresh| UI
  UI -->|manual refresh| COL
```

| Component | Responsibility | Technology | Code |
|---|---|---|---|
| Signal collector | Pulls public engineering signals from four live sources in parallel | fetch, Next.js route handlers | `lib/signals.ts` |
| Job-description reader | Reads up to 15 engineering posts; counts tool and microservices mentions | Greenhouse / Lever / Ashby public APIs | `lib/signals.ts` |
| Engineering-blog reader | Discovers a feed and reads recent posts and cadence | RSS / Atom parsing | `lib/signals.ts` |
| Gemini analyst | Stack classification (confirmed / inferred + source), architecture, fit reasons, open questions, two-paragraph summary, personalised first line | Google Gemini Flash (`google/gemini-3.8-flash`, fallback `3.7-flash`) via OpenRouter restricted to Google providers; direct Gemini API as alternate | `lib/gemini.ts`, `lib/llm.ts` |
| Evidence guard | Claims citing sources we never collected become "inferred / no source" | TypeScript | `lib/gemini.ts` |
| Fit score | Σ strength of sourced fit reasons ÷ 15 | TypeScript | `lib/research.ts` |
| ICP checklist | Cloud, microservices, language checks vs configurable targets | TypeScript, env | `lib/checklist.ts`, `lib/icp.ts` |
| Watchlist store | Companies, cached intelligence, notes | Neon serverless Postgres | `lib/db.ts` |
| Weekly refresh | Re-researches accounts that are new, older than 7 days, or failed | Vercel Cron | `app/api/cron/refresh`, `vercel.json` |
| Dashboard | Priority table, KPIs, signal coverage, states, light and dark themes | Next.js App Router, Tailwind v4 | `app/(app)`, `components/` |

The same map is shown live in the app at `/components-map`.
