import { NextResponse } from "next/server";
import { checklist } from "@/lib/checklist";
import { getCompany } from "@/lib/db";
import { fitCategory, hasData, isStale, relativeTime, sourceLinks, whyLine } from "@/lib/derive";
import { loadSettings } from "@/lib/settings";

/** Compact, precomputed view of one account for the Accounts quick-view drawer. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  await loadSettings();
  const c = await getCompany(id);
  if (!c) return NextResponse.json({ error: "Company not found" }, { status: 404 });
  const researched = hasData(c);
  const links = sourceLinks(c);
  return NextResponse.json({
    id: c.id, name: c.company_name, domain: c.domain, status: c.status, error: c.error,
    researched, stale: isStale(c), fit: c.fit_score, fitCat: fitCategory(c.fit_score), fresh: relativeTime(c.last_updated),
    checks: researched ? checklist(c).map((x) => ({ key: x.key, label: x.label, status: x.status, value: x.value, evidence: x.evidence })) : [],
    why: researched ? whyLine(c) : null,
    summary: c.summary?.split(/\n\s*\n/)[0] ?? null,
    hook: c.outreach_hook, hookSignal: c.analysis?.hook?.signal ?? null,
    techs: (c.analysis?.technologies ?? []).filter((t) => t.status === "confirmed").slice(0, 8).map((t) => t.name),
    roles: c.hiring_roles, repos: c.signals?.github?.reposPushedLast90d ?? null, publicRepos: c.signals?.github?.publicRepos ?? null,
    sources: links.map((l) => ({ label: l.label, url: l.url })),
  });
}
