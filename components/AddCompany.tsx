"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
import { toast } from "@/lib/toast";
import { openAddCompany } from "@/lib/ui-events";
import { Dialog } from "./Dialog";
import { btnPrimary, btnSecondary, inputCls } from "./ui";

type Mode = "add" | "research";

function AddForm({ mode, onDone }: { mode: Mode; onDone: () => void }) {
  const router = useRouter();
  const [f, setF] = useState({ company_name: "", domain: "", github_org: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const r = await fetch("/api/companies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setErr(d.error ?? "Could not add the company"); setBusy(false); return; }
    onDone();
    if (mode === "research") {
      // Research runs in the background; the account page polls until it finishes.
      fetch(`/api/companies/${d.id}/refresh`, { method: "POST" }).then(async (res) => {
        if (res.ok) toast(`Research finished for ${d.company_name}`);
        else toast((await res.json().catch(() => ({}))).error ?? `Research failed for ${d.company_name}`, "error");
        router.refresh();
      }).catch(() => toast(`Research failed for ${d.company_name}`, "error"));
      toast(`${d.company_name} added. Research started.`, "info");
      router.push(`/accounts/${d.id}`);
    } else {
      toast(`${d.company_name} added to the watchlist. It will be researched in the next weekly run, or open it to research now.`);
      router.refresh();
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block"><span className="mb-1 block text-xs font-medium text-ink-3">Company name</span>
        <input className={inputCls} required autoFocus placeholder="Stripe" value={f.company_name} onChange={(e) => setF({ ...f, company_name: e.target.value })} /></label>
      <label className="block"><span className="mb-1 block text-xs font-medium text-ink-3">Website domain</span>
        <input className={inputCls} required placeholder="stripe.com" value={f.domain} onChange={(e) => setF({ ...f, domain: e.target.value })} /></label>
      <label className="block"><span className="mb-1 block text-xs font-medium text-ink-3">GitHub organization <span className="text-ink-5">(optional, improves accuracy)</span></span>
        <input className={inputCls} placeholder="stripe" value={f.github_org} onChange={(e) => setF({ ...f, github_org: e.target.value })} /></label>
      {err && <p className="text-[13px] text-bad" role="alert">{err}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onDone} className={btnSecondary}>Cancel</button>
        <button disabled={busy} className={btnPrimary}>{busy ? "Adding…" : mode === "research" ? "Add and research" : "Add to watchlist"}</button>
      </div>
    </form>
  );
}

/** Buttons only: the dialog itself lives in the app shell so the command palette can open it too. */
export function AddCompanyButtons({ primary = "add", only }: { primary?: Mode; only?: Mode }) {
  const btn = (m: Mode) => (m === primary ? btnPrimary : btnSecondary);
  return (
    <>
      {only !== "research" && <button onClick={() => openAddCompany("add")} className={btn("add")}><Plus className="h-4 w-4" /> Add company</button>}
      {only !== "add" && <button onClick={() => openAddCompany("research")} className={btn("research")}><Search className="h-3.5 w-3.5" /> Research a company</button>}
    </>
  );
}

/** Shell-level host for the add / research dialog. */
export function AddCompanyHost() {
  const [mode, setMode] = useState<Mode | null>(null);
  useEffect(() => {
    const on = (e: Event) => setMode((e as CustomEvent).detail.mode as Mode);
    window.addEventListener("stack-add-company", on);
    return () => window.removeEventListener("stack-add-company", on);
  }, []);
  return (
    <Dialog open={mode != null} onClose={() => setMode(null)} title={mode === "research" ? "Research a company" : "Add company"}
      description={mode === "research" ? "Adds the company and gathers public engineering signals right away." : "Adds the company to your watchlist without researching it yet."}>
      {mode && <AddForm mode={mode} onDone={() => setMode(null)} />}
    </Dialog>
  );
}

/** Inline form used by the empty state. */
export function AddCompanyInline() {
  return <div className="mx-auto max-w-md text-left"><AddForm mode="research" onDone={() => {}} /></div>;
}
