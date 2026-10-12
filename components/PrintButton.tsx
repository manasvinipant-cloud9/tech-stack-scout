"use client";

import { Printer } from "lucide-react";
import { btnSecondary } from "./ui";

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className={btnSecondary}>
      <Printer className="h-3.5 w-3.5" /> Print / save PDF
    </button>
  );
}
