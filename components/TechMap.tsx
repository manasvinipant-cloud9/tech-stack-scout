"use client";

import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import type { Source, Tech } from "@/lib/types";
import { TechLogo } from "./Logos";
import { StatusPill } from "./ui";

const GROUPS: { key: string; title: string; cats: string[] }[] = [
  { key: "infra", title: "Cloud and infrastructure", cats: ["Cloud", "Orchestration", "IaC", "Observability"] },
  { key: "lang", title: "Programming languages", cats: ["Language"] },
  { key: "dev", title: "Frameworks and developer tools", cats: ["Framework", "CI/CD", "Build", "Data", "Security", "Other"] },
];
const LABEL: Record<Source, string> = { github: "GitHub", website: "Website", jobs: "Job board", blog: "Eng blog", none: "No source" };

type State = "confirmed" | "sourced" | "unsupported";
const stateOf = (t: Tech): State => (t.status === "confirmed" && t.source !== "none" ? "confirmed" : t.source !== "none" ? "sourced" : "unsupported");
const STATE_TEXT: Record<State, string> = { confirmed: "Directly evidenced", sourced: "Inferred from a source", unsupported: "Inferred, no source" };

type Props = { techs: Tech[]; shares: { name: string; pct: number }[]; links: Partial<Record<Source, string>>; verified: string; stale: boolean };

/** Structured technology map. Click any technology to see the evidence behind it. */
export default function TechMap({ techs, shares, links, verified, stale }: Props) {
  const [sel, setSel] = useState<string | null>(null);
  const share = useMemo(() => new Map(shares.map((s) => [s.name.toLowerCase(), s.pct])), [shares]);
  const groups = GROUPS.map((g) => ({ ...g, items: techs.filter((t) => g.cats.includes(t.category)).sort((a, b) => Number(stateOf(a) !== "confirmed") - Number(stateOf(b) !== "confirmed")) })).filter((g) => g.items.length);
  const current = techs.find((t) => t.name === sel);

  if (!techs.length) return <p className="rounded-lg border border-dashed p-5 text-sm text-ink-3" style={{ borderColor: "var(--line-ctl)" }}>No technologies were identified from the public signals we found. That does not mean none are in use.</p>;

  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <div key={g.key}>
          <div className="mb-2 flex items-baseline gap-2"><h3 className="text-[13px] font-semibold">{g.title}</h3><span className="font-mono text-[11px] text-ink-4">{g.items.length}</span></div>
          <ul className="flex flex-wrap gap-2">
            {g.items.map((t) => {
              const st = stateOf(t);
              const on = sel === t.name;
              const pct = g.key === "lang" ? share.get(t.name.toLowerCase()) : undefined;
              return (
                <li key={t.name}>
                  <button onClick={() => setSel(on ? null : t.name)} aria-pressed={on} aria-label={`${t.name}: ${STATE_TEXT[st]}. Show evidence`}
                    className={`inline-flex h-8 items-center gap-2 rounded-lg border px-2.5 text-[13px] transition-colors ${on ? "border-accent bg-raised" : "border-line bg-sunken hover:border-line-ctl hover:bg-raised"} ${st === "confirmed" ? "text-ink" : "text-ink-2"}`}
                    style={st !== "confirmed" ? { borderStyle: "dashed", borderColor: on ? "var(--accent)" : "var(--dashed)" } : undefined}>
                    <TechLogo name={t.name} size={14} />
                    <span className="font-medium">{t.name}</span>
                    {pct != null && <span className="font-mono text-[11px] text-ink-3">{pct}%</span>}
                    {st === "confirmed" ? <span className="h-1.5 w-1.5 rounded-full bg-good-dot" aria-hidden /> : <span className="font-mono text-[11px] text-ink-4" aria-hidden>{st === "sourced" ? "~" : "?"}</span>}
                    {t.relevance === "High" && <span className="rounded bg-btn/90 px-1 font-mono text-[9px] font-bold uppercase text-white" title="High relevance to your product">High fit</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      {current && (
        <div className="pop rounded-lg border border-line bg-sunken p-3.5" role="region" aria-label={`Evidence for ${current.name}`}>
          <div className="flex flex-wrap items-center gap-2">
            <TechLogo name={current.name} size={16} /><span className="text-sm font-semibold">{current.name}</span>
            <span className="text-xs text-ink-4">{current.category}</span>
            <StatusPill tone={stateOf(current) === "confirmed" ? "good" : stateOf(current) === "sourced" ? "warn" : "neutral"}>{STATE_TEXT[stateOf(current)]}</StatusPill>
          </div>
          <p className="mt-2 text-[13px] text-ink-2">{current.evidence || "No evidence text was recorded."}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-4">
            {current.source !== "none" && (links[current.source] ? (
              <a href={links[current.source]} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">Open {LABEL[current.source]} source <ExternalLink className="h-3 w-3" /></a>
            ) : <span>Source: {LABEL[current.source]}</span>)}
            <span>Relevance to your product: {current.relevance}</span>
            <span>{stale ? "Last verified" : "Verified"} {verified}</span>
          </div>
        </div>
      )}

      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-ink-4">
        <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-good-dot" /> Directly evidenced</span>
        <span><span className="font-mono">~</span> Inferred from a source</span>
        <span><span className="font-mono">?</span> Inferred, no source</span>
        <span><span className="rounded bg-btn/90 px-1 font-mono text-[9px] font-bold uppercase text-white">High fit</span> High relevance to your product</span>
      </p>
    </div>
  );
}
