"use client";

import { useState } from "react";
import { btnPrimary, inputCls } from "@/components/ui";

export default function Login() {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode }) });
    if (r.ok) window.location.href = "/";
    else {
      setError("Wrong passcode");
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <div className="mb-6 flex items-center gap-2.5 text-xl font-bold tracking-[-0.02em]">
        <span className="grid h-[30px] w-[30px] place-items-center rounded-full border-2 border-accent"><span className="h-2.5 w-2.5 rounded-full bg-accent" /></span>
        Stack Scout
      </div>
      <p className="mb-5 text-sm text-ink-3">Enter the team passcode to continue.</p>
      <form onSubmit={submit} className="space-y-3">
        <input type="password" autoFocus required value={passcode} onChange={(e) => setPasscode(e.target.value)} placeholder="Passcode" className={inputCls} />
        {error && <p className="text-[13px] text-bad">{error}</p>}
        <button disabled={busy} className={`${btnPrimary} w-full`}>{busy ? "Checking…" : "Continue"}</button>
      </form>
    </main>
  );
}
