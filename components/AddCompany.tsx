"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";
import { btnPrimary, btnSecondary, inputCls } from "./ui";

export function AddCompanyForm({ autoFocus = false }: { autoFocus?: boolean }) {
  const router = useRouter();
  const [f, setF] = useState({ company_name: "", domain: "", github_org: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const r = await fetch("/api/companies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      setErr(data.error ?? "Could not add company");
      setBusy(false);
      return;
    }
    // Research runs in the background; the account page polls until it finishes.
    fetch(`/api/companies/${data.id}/refresh`, { method: "POST" }).catch(() => {});
    router.push(`/accounts/${data.id}`);
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
        <input className={inputCls} placeholder="Company" required autoFocus={autoFocus} value={f.company_name} onChange={(e) => setF({ ...f, company_name: e.target.value })} />
        <input className={inputCls} placeholder="Domain (stripe.com)" required value={f.domain} onChange={(e) => setF({ ...f, domain: e.target.value })} />
        <input className={inputCls} placeholder="GitHub org (optional)" value={f.github_org} onChange={(e) => setF({ ...f, github_org: e.target.value })} />
        <button disabled={busy} className={btnPrimary}>{busy ? "Adding…" : "Research"}</button>
      </div>
      {err && <p className="text-[13px] text-bad">{err}</p>}
    </form>
  );
}

export function AddCompanyButton() {
  const [open, setOpen] = useState(false);
  return (
    <div className="w-full sm:w-auto">
      <button onClick={() => setOpen((o) => !o)} className={btnPrimary}>
        <Plus className="h-4 w-4" /> Research a company
      </button>
      {open && (
        <div className="mt-3 w-full rounded-[14px] border border-line bg-panel p-4 sm:absolute sm:right-8 sm:z-10 sm:w-[720px] sm:shadow-lg">
          <AddCompanyForm autoFocus />
          <button onClick={() => setOpen(false)} className={`${btnSecondary} mt-3`}>Cancel</button>
        </div>
      )}
    </div>
  );
}
