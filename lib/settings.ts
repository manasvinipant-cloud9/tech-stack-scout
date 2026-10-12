import { dbConfigured, getSetting, setSetting } from "./db";

export type IcpSettings = { clouds: string[]; languages: string[] };

const list = (v: string | undefined, d: string[]) => (v?.trim() ? v.split(",").map((s) => s.trim()).filter(Boolean) : d);
export const defaultIcp = (): IcpSettings => ({
  clouds: list(process.env.ICP_CLOUDS, ["AWS", "GCP", "Azure"]),
  languages: list(process.env.ICP_LANGUAGES, ["Go", "Java", "Python", "TypeScript", "Kotlin", "Rust"]),
});

// Server-side cache so the synchronous checklist code can read the saved ICP. Pages call loadIcp() first.
let cache: { at: number; v: IcpSettings } | null = null;
const TTL = 10_000;

export const currentIcp = (): IcpSettings => cache?.v ?? defaultIcp();

export async function loadIcp(): Promise<IcpSettings> {
  if (cache && Date.now() - cache.at < TTL) return cache.v;
  let v = defaultIcp();
  if (dbConfigured()) {
    try {
      const saved = await getSetting<IcpSettings>("icp");
      if (saved?.clouds?.length && saved?.languages?.length) v = saved;
    } catch {}
  }
  cache = { at: Date.now(), v };
  return v;
}

export async function saveIcp(v: IcpSettings) {
  await setSetting("icp", v);
  cache = { at: Date.now(), v };
}
