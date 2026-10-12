// Client-safe constants for the Accounts saved views (no server imports here).
export const VIEWS = [
  { key: "all", label: "All accounts" },
  { key: "strong", label: "Strong matches" },
  { key: "ready", label: "Ready for outreach" },
  { key: "needs", label: "Needs research" },
  { key: "stale", label: "Stale research" },
] as const;
export type ViewKey = (typeof VIEWS)[number]["key"];
