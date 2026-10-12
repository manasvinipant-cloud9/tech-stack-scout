import { dbConfigured, getSetting, setSetting } from "./db";
import { setStaleDays } from "./derive";

export type IcpSettings = { clouds: string[]; languages: string[] };
export type ResearchSettings = { staleDays: number; batchSize: number };
export type AppSettings = IcpSettings & ResearchSettings;

const list = (v: string | undefined, d: string[]) => (v?.trim() ? v.split(",").map((s) => s.trim()).filter(Boolean) : d);
export const defaultSettings = (): AppSettings => ({
  clouds: list(process.env.ICP_CLOUDS, ["AWS", "GCP", "Azure"]),
  languages: list(process.env.ICP_LANGUAGES, ["Go", "Java", "Python", "TypeScript", "Kotlin", "Rust"]),
  staleDays: 7,
  batchSize: 12,
});
export const defaultIcp = defaultSettings;

// Server-side cache so synchronous code (checklist, isStale) can read saved settings. Pages call loadSettings() first.
let cache: { at: number; v: AppSettings } | null = null;
const TTL = 10_000;
const apply = (v: AppSettings) => { setStaleDays(v.staleDays); cache = { at: Date.now(), v }; return v; };

export const currentIcp = (): IcpSettings => cache?.v ?? defaultSettings();

export async function loadSettings(): Promise<AppSettings> {
  if (cache && Date.now() - cache.at < TTL) return cache.v;
  const v = defaultSettings();
  if (dbConfigured()) {
    try {
      const icp = await getSetting<IcpSettings>("icp");
      if (icp?.clouds?.length && icp?.languages?.length) { v.clouds = icp.clouds; v.languages = icp.languages; }
      const r = await getSetting<ResearchSettings>("research");
      if (r?.staleDays) v.staleDays = r.staleDays;
      if (r?.batchSize) v.batchSize = r.batchSize;
    } catch {}
  }
  return apply(v);
}
export const loadIcp = loadSettings; // existing pages call this name

export async function saveSettings(patch: Partial<AppSettings>) {
  const cur = await loadSettings();
  const next: AppSettings = { ...cur, ...patch };
  await setSetting("icp", { clouds: next.clouds, languages: next.languages });
  await setSetting("research", { staleDays: next.staleDays, batchSize: next.batchSize });
  return apply(next);
}
export const saveIcp = (v: IcpSettings) => saveSettings(v);
