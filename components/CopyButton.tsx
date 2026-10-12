"use client";

import { useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="text-[13px] text-dark-meta transition-colors duration-100 hover:text-white"
    >
      {done ? "Copied" : "Copy"}
    </button>
  );
}
