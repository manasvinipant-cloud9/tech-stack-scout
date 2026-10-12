import Link from "next/link";

/** Horizontal bar list: each bar is a labelled count with a share of the whole, optionally a link into a filtered list. */
export function BarList({ items, total, emptyLabel = "No data yet" }: { items: { label: string; value: number; href?: string; color?: string; note?: string; muted?: boolean }[]; total?: number; emptyLabel?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (!items.length || items.every((i) => i.value === 0)) return <p className="text-sm text-ink-3">{emptyLabel}</p>;
  return (
    <ul className="space-y-1">
      {items.map((i) => {
        const row = (
          <>
            <span className={`truncate text-[13px] ${i.muted ? "text-ink-3" : "font-medium"}`}>{i.label}{i.note && <span className="ml-1.5 font-mono text-[10.5px] font-normal text-ink-4">{i.note}</span>}</span>
            <span className="h-2.5 rounded-full bg-chip"><span className="block h-2.5 rounded-full" style={{ width: i.value ? `${Math.max(4, (i.value / max) * 100)}%` : 0, background: i.color ?? "var(--good-dot)" }} /></span>
            <span className="text-right text-[13px] font-semibold">{i.value}{total ? <span className="font-mono text-[10.5px] font-normal text-ink-4"> /{total}</span> : null}</span>
          </>
        );
        const cls = "grid grid-cols-[minmax(0,148px)_1fr_46px] items-center gap-2.5 rounded-md px-1.5 py-1.5";
        return <li key={i.label}>{i.href ? <Link href={i.href} className={`${cls} transition-colors hover:bg-raised`} aria-label={`${i.label}: ${i.value}${total ? ` of ${total}` : ""} accounts`}>{row}</Link> : <div className={cls}>{row}</div>}</li>;
      })}
    </ul>
  );
}

/** A single stacked bar for a share breakdown (e.g. language share), with a legend carrying the exact percentages. */
export function ShareBar({ parts }: { parts: { name: string; pct: number }[] }) {
  const palette = ["var(--good-dot)", "#7fb8a0", "var(--warn-line)", "#6c8fb0", "#a98fc0", "var(--line-ctl)"];
  if (!parts.length) return null;
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-chip" role="img" aria-label={parts.map((p) => `${p.name} ${p.pct}%`).join(", ")}>
        {parts.map((p, i) => <div key={p.name} title={`${p.name} ${p.pct}%`} style={{ width: `${p.pct}%`, background: palette[i % palette.length] }} />)}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-3">
        {parts.map((p, i) => <li key={p.name} className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: palette[i % palette.length] }} />{p.name} <b className="font-mono text-ink-2">{p.pct}%</b></li>)}
      </ul>
    </div>
  );
}

export type Dot = { id: number; name: string; x: number; y: number; match: number };
const MATCH_COLOR = ["var(--line-ctl)", "var(--warn-line)", "#7fb8a0", "var(--good-dot)"];

/**
 * Fit score (y) against engineering activity (x): which high-fit accounts are also actively building?
 * Reference lines sit at the real fit-category boundaries (60 and 80). Every dot links to its account.
 */
export function FitActivityScatter({ dots, xLabel, footnote }: { dots: Dot[]; xLabel: string; footnote?: string }) {
  const W = 560, H = 300, m = { l: 38, r: 14, t: 12, b: 38 };
  const xMax = Math.max(10, Math.ceil(Math.max(...dots.map((d) => d.x), 0) / 10) * 10);
  const sx = (v: number) => m.l + (v / xMax) * (W - m.l - m.r);
  const sy = (v: number) => H - m.b - (v / 100) * (H - m.t - m.b);
  const labelled = new Set([...dots].sort((a, b) => b.y - a.y || b.x - a.x).slice(0, 6).map((d) => d.id));
  if (!dots.length) return <p className="text-sm text-ink-3">Needs researched accounts with a fit score and a public job board.</p>;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="group" aria-label={`Scatter chart of fit score against ${xLabel}. ${dots.length} accounts.`}>
        {[0, 40, 60, 80, 100].map((v) => (
          <g key={v}>
            <line x1={m.l} x2={W - m.r} y1={sy(v)} y2={sy(v)} stroke="var(--line)" strokeDasharray={v === 60 || v === 80 ? "4 4" : undefined} strokeWidth={v === 60 || v === 80 ? 1 : 0.6} />
            <text x={m.l - 8} y={sy(v) + 3} textAnchor="end" fontSize="10" fill="var(--ink-4)" fontFamily="var(--font-mono)">{v}</text>
          </g>
        ))}
        {Array.from({ length: 5 }, (_, i) => Math.round((xMax / 4) * i)).map((v) => (
          <text key={v} x={sx(v)} y={H - m.b + 16} textAnchor="middle" fontSize="10" fill="var(--ink-4)" fontFamily="var(--font-mono)">{v}</text>
        ))}
        <text x={(W + m.l) / 2} y={H - 4} textAnchor="middle" fontSize="10.5" fill="var(--ink-3)">{xLabel}</text>
        <text x={12} y={(H - m.b + m.t) / 2} textAnchor="middle" fontSize="10.5" fill="var(--ink-3)" transform={`rotate(-90 12 ${(H - m.b + m.t) / 2})`}>Fit score</text>
        {dots.map((d) => (
          <Link key={d.id} href={`/accounts/${d.id}`}>
            <g className="cursor-pointer">
              <title>{`${d.name}: fit ${d.y}, ${d.x} ${xLabel.toLowerCase()}, ${d.match} of 3 ICP criteria`}</title>
              <circle cx={sx(d.x)} cy={sy(d.y)} r={13} fill="transparent" />
              <circle cx={sx(d.x)} cy={sy(d.y)} r={6} fill={MATCH_COLOR[d.match]} stroke="var(--panel)" strokeWidth={1.5} />
              {labelled.has(d.id) && <text x={sx(d.x) + 9} y={sy(d.y) + 3.5} fontSize="10.5" fill="var(--ink-2)">{d.name}</text>}
            </g>
          </Link>
        ))}
      </svg>
      <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-3">
        {[3, 2, 1, 0].map((n) => <li key={n} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: MATCH_COLOR[n] }} />{n === 0 ? "No ICP match" : `${n} of 3 ICP`}</li>)}
        <li className="text-ink-4">Dashed lines mark the 60 and 80 fit boundaries</li>
      </ul>
      {footnote && <p className="mt-1 text-[11px] text-ink-4">{footnote}</p>}
    </div>
  );
}
