export type Source = "github" | "website" | "jobs" | "blog" | "none";

export type Tech = {
  name: string;
  category: string;
  status: "confirmed" | "inferred";
  evidence: string;
  source: Source;
  relevance: "High" | "Medium" | "Low";
};

export type FitReason = {
  context: string;
  capability: string;
  strength: 1 | 2 | 3;
  source: Source;
  evidence: string;
};

export type Analysis = {
  technologies: Tech[];
  cloud: string;
  orchestration: string;
  fit_reasons: FitReason[];
  open_questions: string[];
  hook?: { signal: string; source: Source };
  architecture?: { style: "microservices" | "monolith" | "mixed" | "unknown"; evidence: string; source: Source };
};
