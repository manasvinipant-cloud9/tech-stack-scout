// Gathers public engineering signals: GitHub org activity + homepage tech fingerprints.

export type GithubSignals = {
  org: string;
  url: string;
  publicRepos: number;
  languageBytes: Record<string, number>;
  reposPushedLast90d: number;
  totalStars: number;
  topTopics: string[];
  recentRepos: { name: string; description: string | null; language: string | null; pushed_at: string; stars: number }[];
};

export type SiteSignals = {
  title: string | null;
  description: string | null;
  server: string | null;
  poweredBy: string | null;
  generator: string | null;
  scriptHosts: string[];
  hints: string[];
};

export type JobSignals = {
  source: "Greenhouse" | "Lever" | "Ashby";
  board: string;
  totalOpen: number;
  engineeringOpen: number;
  sampleTitles: string[];
};

export type Signals = { github: GithubSignals | null; site: SiteSignals | null; jobs: JobSignals | null };

const gh = (path: string) =>
  fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "tech-stack-scout",
      ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
    },
    signal: AbortSignal.timeout(10_000),
  });

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

async function findOrg(name: string, domain: string, hint: string | null) {
  const root = domain.split(".").slice(-2, -1)[0] ?? domain;
  const candidates = [...new Set([hint, root, slug(name), name.toLowerCase().replace(/\s+/g, "-")].filter(Boolean) as string[])];
  const matchesDomain = (o: { blog?: string | null; email?: string | null }) =>
    `${o.blog ?? ""} ${o.email ?? ""}`.toLowerCase().includes(root);

  for (const c of candidates) {
    const r = await gh(`/orgs/${encodeURIComponent(c)}`).catch(() => null);
    if (!r?.ok) continue;
    const o = await r.json();
    // An explicit hint is trusted; guesses must be corroborated by the org's website/email or exact name.
    if (c === hint || matchesDomain(o) || slug(o.login) === slug(root) || slug(o.name ?? "") === slug(name)) return o.login as string;
  }
  const s = await gh(`/search/users?q=${encodeURIComponent(name)}+type:org&per_page=5`).catch(() => null);
  if (s?.ok) {
    for (const item of (await s.json()).items ?? []) {
      const o = await (await gh(`/orgs/${item.login}`).catch(() => null))?.json().catch(() => null);
      if (o && matchesDomain(o)) return o.login as string;
    }
  }
  return null;
}

export async function githubSignals(name: string, domain: string, hint: string | null): Promise<GithubSignals | null> {
  const org = await findOrg(name, domain, hint);
  if (!org) return null;
  const r = await gh(`/orgs/${org}/repos?type=public&sort=pushed&per_page=60`);
  if (!r.ok) return null;
  const repos: any[] = await r.json();
  const cutoff = Date.now() - 90 * 864e5;
  const owned = repos.filter((x) => !x.fork && !x.archived);

  const languageBytes: Record<string, number> = {};
  for (const repo of owned.slice(0, 12)) {
    const lr = await gh(`/repos/${org}/${repo.name}/languages`).catch(() => null);
    if (!lr?.ok) continue;
    for (const [k, v] of Object.entries((await lr.json()) as Record<string, number>)) languageBytes[k] = (languageBytes[k] ?? 0) + v;
  }
  const topics: Record<string, number> = {};
  for (const repo of owned) for (const t of repo.topics ?? []) topics[t] = (topics[t] ?? 0) + 1;

  return {
    org,
    url: `https://github.com/${org}`,
    publicRepos: repos.length,
    languageBytes,
    reposPushedLast90d: owned.filter((x) => new Date(x.pushed_at).getTime() > cutoff).length,
    totalStars: owned.reduce((n, x) => n + (x.stargazers_count ?? 0), 0),
    topTopics: Object.entries(topics).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([t]) => t),
    recentRepos: owned.slice(0, 8).map((x) => ({
      name: x.name, description: x.description, language: x.language, pushed_at: x.pushed_at, stars: x.stargazers_count ?? 0,
    })),
  };
}

const HINTS: [RegExp, string][] = [
  [/_next\/static|__next/i, "Next.js"], [/react/i, "React"], [/vue/i, "Vue"], [/angular/i, "Angular"],
  [/cloudfront|amazonaws/i, "AWS"], [/googleapis|gstatic|googleusercontent/i, "Google Cloud/Google services"],
  [/azure|msecnd/i, "Azure"], [/cloudflare/i, "Cloudflare"], [/vercel/i, "Vercel"], [/netlify/i, "Netlify"],
  [/fastly/i, "Fastly"], [/segment\.com/i, "Segment"], [/datadog/i, "Datadog"], [/sentry/i, "Sentry"],
  [/stripe/i, "Stripe"], [/hubspot/i, "HubSpot"], [/salesforce/i, "Salesforce"], [/shopify/i, "Shopify"],
];

export async function siteSignals(domain: string): Promise<SiteSignals | null> {
  try {
    const r = await fetch(`https://${domain}`, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; TechStackScout/1.0)" },
      signal: AbortSignal.timeout(10_000),
      redirect: "follow",
    });
    const html = (await r.text()).slice(0, 400_000);
    const meta = (n: string) =>
      html.match(new RegExp(`<meta[^>]+(?:name|property)=["']${n}["'][^>]+content=["']([^"']*)["']`, "i"))?.[1] ?? null;
    const hosts = new Set<string>();
    for (const m of html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)) {
      try { hosts.add(new URL(m[1], `https://${domain}`).host); } catch {}
    }
    const haystack = [html, r.headers.get("server"), r.headers.get("x-powered-by"), r.headers.get("via"), [...hosts].join(" ")].join(" ");
    return {
      title: html.match(/<title[^>]*>([^<]*)/i)?.[1]?.trim().slice(0, 200) ?? null,
      description: meta("description")?.slice(0, 300) ?? null,
      server: r.headers.get("server"),
      poweredBy: r.headers.get("x-powered-by"),
      generator: meta("generator"),
      scriptHosts: [...hosts].slice(0, 20),
      hints: HINTS.filter(([re]) => re.test(haystack)).map(([, n]) => n),
    };
  } catch {
    return null;
  }
}

const ENG_RE = /engineer|developer|\bsre\b|devops|platform|infrastructure|security|machine learning|\bml\b|data scientist|architect|software/i;

type Job = { title: string };

const getJson = async (url: string) => {
  const r = await fetch(url, { signal: AbortSignal.timeout(8_000), headers: { "User-Agent": "tech-stack-scout" } }).catch(() => null);
  return r?.ok ? await r.json().catch(() => null) : null;
};

const BOARDS: [JobSignals["source"], (t: string) => Promise<Job[] | null>][] = [
  ["Greenhouse", async (t) => {
    const d = await getJson(`https://boards-api.greenhouse.io/v1/boards/${t}/jobs`);
    return d?.jobs ? d.jobs.map((j: any) => ({ title: j.title })) : null;
  }],
  ["Lever", async (t) => {
    const d = await getJson(`https://api.lever.co/v0/postings/${t}?mode=json`);
    return Array.isArray(d) ? d.map((j: any) => ({ title: j.text })) : null;
  }],
  ["Ashby", async (t) => {
    const d = await getJson(`https://api.ashbyhq.com/posting-api/job-board/${t}`);
    return d?.jobs ? d.jobs.map((j: any) => ({ title: j.title })) : null;
  }],
];

/** Public ATS job boards need no API key. We guess the board token from the domain/name. */
export async function jobSignals(name: string, domain: string, githubOrg: string | null): Promise<JobSignals | null> {
  const root = domain.split(".").slice(-2, -1)[0] ?? domain;
  const tokens = [...new Set([root, slug(name), name.toLowerCase().replace(/\s+/g, "-"), githubOrg?.toLowerCase()].filter(Boolean) as string[])];
  for (const token of tokens) {
    const hits = await Promise.all(BOARDS.map(async ([source, fetchJobs]) => ({ source, jobs: await fetchJobs(token).catch(() => null) })));
    const hit = hits.find((h) => h.jobs && h.jobs.length > 0);
    if (!hit?.jobs) continue;
    const eng = hit.jobs.filter((j) => ENG_RE.test(j.title));
    return {
      source: hit.source,
      board: token,
      totalOpen: hit.jobs.length,
      engineeringOpen: eng.length,
      sampleTitles: eng.slice(0, 20).map((j) => j.title),
    };
  }
  return null;
}

export async function gatherSignals(name: string, domain: string, hint: string | null): Promise<Signals> {
  const [github, site, jobs] = await Promise.all([
    githubSignals(name, domain, hint).catch(() => null),
    siteSignals(domain),
    jobSignals(name, domain, hint).catch(() => null),
  ]);
  return { github, site, jobs };
}
