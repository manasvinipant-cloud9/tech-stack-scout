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
| Add / remove companies without touching code | "Add company" / "Research a company" dialogs and a confirmed remove, or edit `target_companies` directly in Postgres |
| All AI on Gemini Flash | Only `google/gemini-3.8-flash` (fallback `google/gemini-3.7-flash`) is called, via OpenRouter restricted to Google's own providers (`google-vertex`, `google-ai-studio`, no fallbacks); or the Gemini API directly. No other vendor's model is used |

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
A collapsible sidebar (icon rail on tablet, drawer on phones) links five workspaces. A global **⌘K command palette** (also `/`) jumps to any company or page and runs quick actions.
- **Overview:** a bento command centre. A hero metric (strong ICP matches, with its 3/2/1/none breakdown), supporting metrics that link to filtered lists, a prioritised **Recommended next actions** queue (outreach-ready accounts, fit evidence to complete, research to refresh or retry), fit distribution, signal coverage, "What changed" (score movement and new engineering signals) and a research timeline. Actions and insights never repeat each other. A "watchlist landscape" row charts the cloud and language mix against your ICP targets, and a fit-vs-hiring scatter shows which high-fit accounts are actively hiring (accounts with no public job board are listed as unknown, not plotted as zero).
- **Accounts:** the watchlist, with search, five saved views, filters (ICP match, fit range, status, freshness, cloud, language), sorting, bulk refresh and remove, and add or remove with confirmation. All filter state lives in the URL. **Master–detail:** clicking a row opens a quick-view drawer (step through the list with `j`/`k`); the full profile remembers the filtered list you came from and offers previous/next.
- **Account Intelligence:** a research dossier per company: engineering context, why the account fits (ICP criteria, missing evidence, expandable evidence per fit reason), an interactive technology map with logos, engineering activity (expandable hiring, blog and repository evidence), the suggested opening line with its signal and source (regenerate or copy), open questions, a "How this was researched" methodology panel with evidence coverage, research history, and a language-share bar.
- **Research & Signals:** coverage across the watchlist (account × signal matrix) with five states (evidence found, partial, no evidence found, not researched, research failed), accounts missing fit evidence, a research-freshness distribution, a refresh queue, and a chronological refresh log.
- **Outreach Studio:** pick a company, review its context and the observations a line could rest on, then generate, regenerate and copy an evidence-backed opening line.
- **Settings:** editable ICP targets and research preferences (stale threshold, weekly per-run limit), all saved to the database and honoured by the weekly job; read-only status for the schedule and integrations.
- Dark theme by default with a light option; responsive from phone to desktop; loading, empty, stale, error and missing-evidence states throughout. Glass (blur) is used only for the command palette, dialogs and floating menus; tables, charts and content panels stay solid.

## Run locally
```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL and OPENROUTER_API_KEY (or GEMINI_API_KEY) at minimum
npm run dev
```
The `target_companies` and `account_notes` tables are created automatically on first request.

## Environment variables
| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon Postgres connection string (required) |
| `OPENROUTER_API_KEY` | Preferred AI route: OpenRouter, Google models only (`OPENROUTER_MODEL`, `OPENROUTER_FALLBACK_MODEL` optional) |
| `GEMINI_API_KEY` | Alternative route when no OpenRouter key is set: Google AI Studio key (`GEMINI_MODEL` optional) |
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
