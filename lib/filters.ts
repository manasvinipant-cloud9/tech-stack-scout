import type { Company } from "./db";
import { matchCount } from "./checklist";
import { hasData, isStale, unsourcedCount } from "./derive";

export const FILTERS = [
  { key: "all", label: "All" },
  { key: "icp3", label: "ICP match 3/3" },
  { key: "fit60", label: "Fit ≥ 60" },
  { key: "stale", label: "Stale" },
  { key: "attention", label: "Needs attention" },
] as const;

export type FilterKey = (typeof FILTERS)[number]["key"];

const tests: Record<FilterKey, (c: Company) => boolean> = {
  all: () => true,
  icp3: (c) => hasData(c) && matchCount(c) === 3,
  fit60: (c) => (c.fit_score ?? -1) >= 60,
  stale: (c) => isStale(c),
  // failed last run, never researched, stale, or fit reasons without a source
  attention: (c) => c.status === "error" || !hasData(c) || isStale(c) || unsourcedCount(c) > 0,
};

export const applyFilter = (rows: Company[], key: FilterKey) => rows.filter(tests[key]);
export const parseFilter = (v: string | undefined): FilterKey => (FILTERS.some((f) => f.key === v) ? (v as FilterKey) : "all");
export const countFor = (rows: Company[], key: FilterKey) => rows.filter(tests[key]).length;
