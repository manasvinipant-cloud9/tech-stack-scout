// Server-only: what makes an account relevant to the product. The brief names three contexts:
// cloud platform, microservices, programming language. Cloud and language targets are configurable.
const list = (v: string | undefined, d: string[]) => (v?.trim() ? v.split(",").map((s) => s.trim()).filter(Boolean) : d);

export const icp = () => ({
  clouds: list(process.env.ICP_CLOUDS, ["AWS", "GCP", "Azure"]),
  languages: list(process.env.ICP_LANGUAGES, ["Go", "Java", "Python", "TypeScript", "Kotlin", "Rust"]),
});
