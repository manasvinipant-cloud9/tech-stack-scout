import { neon } from "@neondatabase/serverless";

export type Company = {
  id: number;
  company_name: string;
  domain: string;
  github_org: string | null;
  status: "pending" | "researching" | "ready" | "error";
  last_updated: string | null;
  languages: string[];
  infrastructure: string[];
  activity_level: string | null;
  activity_notes: string | null;
  summary: string | null;
  outreach_hook: string | null;
  error: string | null;
  created_at: string;
};

export const dbConfigured = () => Boolean(process.env.DATABASE_URL);

let _sql: ReturnType<typeof neon> | null = null;
function sql() {
  if (!_sql) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}

let schemaReady: Promise<void> | null = null;
export function ensureSchema() {
  schemaReady ??= (async () => {
    await sql()`
      CREATE TABLE IF NOT EXISTS target_companies (
        id             SERIAL PRIMARY KEY,
        company_name   TEXT NOT NULL,
        domain         TEXT NOT NULL UNIQUE,
        github_org     TEXT,
        status         TEXT NOT NULL DEFAULT 'pending',
        last_updated   TIMESTAMPTZ,
        languages      JSONB NOT NULL DEFAULT '[]'::jsonb,
        infrastructure JSONB NOT NULL DEFAULT '[]'::jsonb,
        activity_level TEXT,
        activity_notes TEXT,
        summary        TEXT,
        outreach_hook  TEXT,
        signals        JSONB,
        error          TEXT,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
  })().catch((e) => {
    schemaReady = null;
    throw e;
  });
  return schemaReady;
}

const COLS = `id, company_name, domain, github_org, status, last_updated, languages,
  infrastructure, activity_level, activity_notes, summary, outreach_hook, error, created_at`;

const toCompany = (r: Record<string, unknown>) => r as unknown as Company;

export async function listCompanies(): Promise<Company[]> {
  await ensureSchema();
  const rows = (await sql().query(
    `SELECT ${COLS} FROM target_companies ORDER BY created_at DESC`
  )) as Record<string, unknown>[];
  return rows.map(toCompany);
}

export async function getCompany(id: number) {
  await ensureSchema();
  const rows = (await sql().query(`SELECT ${COLS} FROM target_companies WHERE id = $1`, [id])) as Record<string, unknown>[];
  return rows[0] ? toCompany(rows[0]) : null;
}

export async function addCompany(name: string, domain: string, githubOrg: string | null) {
  await ensureSchema();
  const rows = (await sql().query(
    `INSERT INTO target_companies (company_name, domain, github_org)
     VALUES ($1, $2, $3)
     ON CONFLICT (domain) DO NOTHING
     RETURNING ${COLS}`,
    [name, domain, githubOrg]
  )) as Record<string, unknown>[];
  return rows[0] ? toCompany(rows[0]) : null;
}

export async function removeCompany(id: number) {
  await ensureSchema();
  await sql().query(`DELETE FROM target_companies WHERE id = $1`, [id]);
}

export async function setStatus(id: number, status: Company["status"], error: string | null = null) {
  await sql().query(`UPDATE target_companies SET status = $2, error = $3 WHERE id = $1`, [id, status, error]);
}

export async function saveIntel(
  id: number,
  d: {
    githubOrg: string | null;
    languages: string[];
    infrastructure: string[];
    activityLevel: string;
    activityNotes: string;
    summary: string;
    outreachHook: string;
    signals: unknown;
  }
) {
  await sql().query(
    `UPDATE target_companies SET
       status = 'ready', error = NULL, last_updated = now(),
       github_org = COALESCE($2, github_org),
       languages = $3::jsonb, infrastructure = $4::jsonb,
       activity_level = $5, activity_notes = $6, summary = $7,
       outreach_hook = $8, signals = $9::jsonb
     WHERE id = $1`,
    [id, d.githubOrg, JSON.stringify(d.languages), JSON.stringify(d.infrastructure),
     d.activityLevel, d.activityNotes, d.summary, d.outreachHook, JSON.stringify(d.signals)]
  );
}

/** Stalest first; never-researched companies come before everything else. */
export async function listStale(limit: number): Promise<Company[]> {
  await ensureSchema();
  const rows = (await sql().query(
    `SELECT ${COLS} FROM target_companies
     WHERE status <> 'researching' OR last_updated IS NULL
     ORDER BY last_updated ASC NULLS FIRST LIMIT $1`,
    [limit]
  )) as Record<string, unknown>[];
  return rows.map(toCompany);
}
