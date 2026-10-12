# Stack Scout: Tech Stack Scout for B2B sales

AI-powered engineering intelligence for an enterprise account executive's target-account watchlist. Before a call, the AE sees what a company builds in, what cloud and infrastructure it visibly runs, how actively the team is building and hiring, whether the account matches the product's relevance contexts, and a personalised first line for outreach.

**Live app:** see the submission notes · **Components map:** [`/components-map`](./docs/COMPONENTS_MAP.md) (also live in the app)

## What it does
For every company on the watchlist the system collects **live public signals**, analyses them with **Gemini Flash**, stores the result in **Neon Postgres**, and keeps it fresh with a **weekly refresh**.

| Brief requirement | How it is met |
|---|---|
| Dominant languages in the public codebase | GitHub REST API: language bytes across the org's repos, documentation/markup excluded |
| Cloud / infrastructure tooling visibly in use | Website fingerprint, repo topics, **job-description tool mentions**, **engineering-blog** posts, classified by Gemini |
| How actively the team is building | Repos pushed in 90 days, stars, open engineering roles, blog cadence |
| Two-paragraph engineering summary | Gemini, grounded only in the collected evidence |
| Non-template first line for outreach | Gemini, one sentence referencing a concrete detail; over-long openers are auto-rewritten |
| Relevant in cloud / microservices / language contexts | **ICP checklist** per account (targets configurable via env) |
| Refreshed weekly | Vercel Cron, Mondays 06:00 UTC; "stale" means more than 7 days |
| Add / remove companies without touching code | UI form and remove button, or edit `target_companies` directly in Postgres |
| All AI on Gemini Flash | `@google/genai`; no other model is called |

### Evidence rules
Every claim shows a source and a date. A technology is **confirmed** only when a collected signal shows it; otherwise it is **inferred**. If Gemini cites a source we never collected, the claim is downgraded to "no source". The **fit score** is the strength of *sourced* fit reasons ÷ 15; unsourced reasons score 0. The score and the checklist are computed in code, not by the model.

## Architecture
```
GitHub · website · job boards (titles + descriptions) · engineering blog
        → signal collector (lib/signals.ts)
        → Gemini Flash (lib/gemini.ts) → evidence guard + scoring (lib/research.ts, lib/checklist.ts)
        → Neon Postgres (lib/db.ts) → Next.js dashboard
Vercel Cron (weekly) → collector for stale / failed accounts
```
Full diagram and component table: [docs/COMPONENTS_MAP.md](./docs/COMPONENTS_MAP.md).

## Screens
- **Dashboard:** KPI strip, fit distribution, signal coverage, priority accounts (sorted by ICP match, then fit), insights.
- **Accounts:** the full watchlist.
- **Account → Overview / Tech stack / Notes & research:** engineering environment, fit mapping, technology inventory (confirmed vs inferred), research sources, notes.
- Loading, empty, stale, error and missing-evidence states; light and dark themes.

## Run locally
```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL and GEMINI_API_KEY at minimum
npm run dev
```
The `target_companies` and `account_notes` tables are created automatically on first request.

## Environment variables
| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon Postgres connection string (required) |
| `GEMINI_API_KEY` | Google AI Studio key (required); `GEMINI_MODEL` optional |
| `GITHUB_TOKEN` | Optional; raises the GitHub rate limit from 60 to 5000 requests/hour |
| `CRON_SECRET` | Secures `/api/cron/refresh` (Vercel sends it as a bearer token) |
| `PRODUCT_NAME`, `PRODUCT_PITCH` | What the AE sells; drives fit reasons and openers |
| `ICP_CLOUDS`, `ICP_LANGUAGES` | Target clouds and languages for the relevance checklist |
| `APP_PASSCODE` | Optional shared passcode gate; leave unset for a public deployment |

## Deploy
Import the repo into Vercel, add the variables above, and deploy. `vercel.json` registers the weekly cron.

## Known limits
- Only **public** signals are used: private repos, internal tooling and on-prem infrastructure are invisible, and the UI says "no evidence" rather than guessing.
- Job boards are discovered by guessing the board token from the domain; companies on other ATS platforms show no hiring data.
- Conference talks are not collected.
