"use client";

import { useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";

export default function Login() {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode }),
    });
    if (r.ok) window.location.href = "/";
    else {
      setError("Wrong passcode");
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <div className="mb-6 self-end"><ThemeToggle /></div>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Tech Stack Scout</h1>
      <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">Enter the team passcode to continue.</p>
      <form onSubmit={submit} className="space-y-3">
        <input
          type="password"
          autoFocus
          required
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          placeholder="Passcode"
          className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900"
        />
        {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}
        <button disabled={busy} className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
          {busy ? "Checking…" : "Continue"}
        </button>
      </form>
    </main>
  );
}
