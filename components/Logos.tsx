"use client";

import { useEffect, useState } from "react";

const mono = (name: string) => name.replace(/[^A-Za-z0-9+#]/g, "").slice(0, 2).toUpperCase() || "?";

/** Company logo from the site's favicon; falls back to a monogram if it can't be loaded. */
export function CompanyLogo({ name, domain, size = 32 }: { name: string; domain: string; size?: number }) {
  const [bad, setBad] = useState(false);
  return (
    <span className={`grid shrink-0 place-items-center overflow-hidden rounded-lg border border-line text-[11px] font-bold ${bad ? "bg-chip text-ink-2" : "bg-[#eef3f0]"}`} style={{ width: size, height: size }} aria-hidden>
      {bad ? mono(name) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`} alt="" width={size - 8} height={size - 8} loading="lazy" onError={() => setBad(true)} className="rounded-sm" />
      )}
    </span>
  );
}

const SLUGS: Record<string, string> = {
  go: "go", typescript: "typescript", javascript: "javascript", python: "python", java: "openjdk", kotlin: "kotlin", rust: "rust", ruby: "ruby",
  scala: "scala", "c++": "cplusplus", c: "c", swift: "swift", elixir: "elixir", php: "php", "c#": "dotnet", "node.js": "nodedotjs", react: "react",
  "next.js": "nextdotjs", vue: "vuedotjs", angular: "angular", kubernetes: "kubernetes", docker: "docker", terraform: "terraform", postgresql: "postgresql",
  postgres: "postgresql", mysql: "mysql", redis: "redis", kafka: "apachekafka", mongodb: "mongodb", elasticsearch: "elasticsearch", datadog: "datadog",
  grafana: "grafana", prometheus: "prometheus", jenkins: "jenkins", "github actions": "githubactions", circleci: "circleci", bazel: "bazel", grpc: "grpc",
  graphql: "graphql", cloudflare: "cloudflare", vercel: "vercel", "google cloud": "googlecloud", gcp: "googlecloud", nix: "nixos", mdx: "mdx",
  helm: "helm", nomad: "nomad", vault: "vault", consul: "consul", gitlab: "gitlab", github: "github", sentry: "sentry", stripe: "stripe", shopify: "shopify",
};
const probe = new Map<string, boolean>();

/** Technology logo drawn in the current text colour (so it works in both themes); monogram if no logo exists. */
export function TechLogo({ name, size = 16 }: { name: string; size?: number }) {
  const slug = SLUGS[name.toLowerCase()];
  const [ok, setOk] = useState<boolean | null>(slug ? (probe.get(slug) ?? null) : false);
  useEffect(() => {
    if (!slug || probe.has(slug)) { if (slug) setOk(probe.get(slug) ?? false); return; }
    const img = new Image();
    img.onload = () => { probe.set(slug, true); setOk(true); };
    img.onerror = () => { probe.set(slug, false); setOk(false); };
    img.src = `https://cdn.simpleicons.org/${slug}`;
  }, [slug]);
  if (slug && ok) {
    const url = `url(https://cdn.simpleicons.org/${slug})`;
    return <span aria-hidden className="inline-block shrink-0 bg-current" style={{ width: size, height: size, WebkitMask: `${url} center/contain no-repeat`, mask: `${url} center/contain no-repeat` }} />;
  }
  return <span aria-hidden className="grid shrink-0 place-items-center rounded-[4px] bg-chip font-mono text-[8px] font-bold text-ink-3" style={{ width: size, height: size }}>{mono(name)}</span>;
}
