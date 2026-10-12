import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { IcpStrip } from "@/components/Icp";
import { CopyButton } from "@/components/CopyButton";
import { PrintButton } from "@/components/PrintButton";
import { Cap } from "@/components/ui";
import { getAccount } from "@/lib/account";
import { checklist } from "@/lib/checklist";
import { SOURCE_LABEL, daysSince, facts, fmtDateYear, hasData, isStale } from "@/lib/derive";
import { productName } from "@/lib/product";
import { loadIcp } from "@/lib/settings";

export const dynamic = "force-dynamic";

/** One printable page Nikhil can read in a minute before the call. */
export default async function CallBrief({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  await loadIcp();
  const c = await getAccount(id);
  if (!c) notFound();
  if (!hasData(c)) {
    return (
      <div>
        <Link href={`/accounts/${id}`} className="link text-[13px]">← Back to {c.company_name}</Link>
        <p className="mt-6 text-sm text-ink-3">{c.company_name} hasn&apos;t been researched yet, so there&apos;s nothing to brief on.</p>
      </div>
    );
  }
  const a = c.analysis;
  const checks = checklist(c);
  const gaps = [
    ...checks.filter((x) => x.status === "unknown").map((x) => `${x.label}: no evidence found`),
    ...(a?.fit_reasons.filter((r) => r.source === "none").map((r) => `Unsourced: ${r.context}`) ?? []),
  ];
  const confirmed = a?.technologies.filter((t) => t.status === "confirmed").slice(0, 10) ?? [];
  const reasons = a?.fit_reasons.filter((r) => r.source !== "none") ?? [];
  const stale = isStale(c);

  return (
    <article className="mx-auto max-w-[820px] space-y-6 print:max-w-none">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/accounts/${id}`} className="inline-flex items-center gap-1 text-[13px] text-ink-3 hover:text-ink"><ChevronLeft className="h-3.5 w-3.5" /> {c.company_name}</Link>
        <PrintButton />
      </div>

      <header className="border-b-2 border-ink pb-4">
        <Cap>Call brief · {productName()}</Cap>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-[40px] font-extrabold leading-none tracking-[-0.04em]">{c.company_name}</h1>
          <div className="text-right">
            <div className="text-[44px] font-extrabold leading-[0.9] tracking-[-0.05em] text-accent">{c.fit_score ?? "—"}</div>
            <div className="text-[11px] uppercase tracking-[0.08em] text-ink-3">Fit with {productName()}</div>
          </div>
        </div>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-4">
          {c.domain} · researched {fmtDateYear(c.last_updated!)}{stale ? ` · STALE ${daysSince(c.last_updated!)}D` : ""}
        </p>
      </header>

      {c.outreach_hook && (
        <section className="rounded-[14px] bg-deep p-5 text-dark-text print:border print:border-ink print:bg-transparent print:text-ink">
          <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.08em] text-lime print:text-cap">
            <span>Say first · model-generated</span>
            <span className="print:hidden"><CopyButton text={c.outreach_hook} /></span>
          </div>
          <p className="mt-2 text-[17px] font-semibold leading-snug">{c.outreach_hook}</p>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-base font-bold">Is this account relevant?</h2>
        <IcpStrip checks={checks} />
      </section>

      <section>
        <h2 className="mb-2 text-base font-bold">At a glance</h2>
        <ul className="space-y-1 text-[15px]">
          {facts(c).map((f) => <li key={f}>{f}</li>)}
          {c.activity_notes && <li className="text-ink-2">{c.activity_notes}</li>}
        </ul>
      </section>

      {confirmed.length > 0 && (
        <section>
          <h2 className="mb-2 text-base font-bold">Confirmed stack</h2>
          <p className="font-mono text-[13px] leading-relaxed">{confirmed.map((t) => `${t.name} (${SOURCE_LABEL[t.source]})`).join(" · ")}</p>
        </section>
      )}

      {reasons.length > 0 && (
        <section>
          <h2 className="mb-2 text-base font-bold">Why it fits</h2>
          <ul className="space-y-1.5 text-sm">
            {reasons.map((r) => (
              <li key={r.context}><span className="text-ink-2">{r.context}</span> <span className="font-semibold text-accent">→ {r.capability}</span> <span className="font-mono text-[11px] text-ink-4">{SOURCE_LABEL[r.source]}</span></li>
            ))}
          </ul>
        </section>
      )}

      {a && a.open_questions.length > 0 && (
        <section>
          <h2 className="mb-2 text-base font-bold">Ask on the call</h2>
          <ol className="list-decimal space-y-1 pl-5 text-[15px]">{a.open_questions.map((q) => <li key={q}>{q}</li>)}</ol>
        </section>
      )}

      {gaps.length > 0 && (
        <section className="rounded-xl border border-dashed p-4" style={{ borderColor: "var(--dashed)" }}>
          <h2 className="mb-1 text-sm font-bold text-brown">Don&apos;t assume: evidence gaps</h2>
          <ul className="space-y-0.5 text-[13px] text-ink-2">{gaps.map((g) => <li key={g}>— {g}</li>)}</ul>
        </section>
      )}

      <p className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-4">
        Public signals only: GitHub, website, job boards, engineering blog. Generated by Stack Scout with Gemini Flash.
      </p>
    </article>
  );
}
