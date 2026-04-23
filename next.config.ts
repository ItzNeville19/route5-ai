import path from "path";
import { fileURLToPath } from "url";
import type { NextConfig } from "next";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  /** Ship a Node server bundle for the Electron desktop app (`npm run electron:dist`). */
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
  experimental: {
    /** Smaller client bundles for heavy animation/graph libs (see Next docs). */
    optimizePackageImports: ["framer-motion", "recharts"],
  },
  /** Prefer this repo as Turbopack root when multiple lockfiles exist on the machine. */
  turbopack: {
    root: projectRoot,
  },
  async headers() {
    const base = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value:
          "camera=(), microphone=(), geolocation=(), interest-cohort=(), browsing-topics=()",
      },
    ];
    if (process.env.NODE_ENV === "production") {
      base.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      });
    }
    return [
      {
        source: "/:path*",
        headers: base,
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img.clerk.com", pathname: "/**" },
    ],
  },
  async redirects() {
    return [
      { source: "/pitch", destination: "/product", permanent: true },
      { source: "/docs/ceo-brief", destination: "/docs", permanent: false },
      { source: "/docs/sales-playbook", destination: "/docs", permanent: false },
      { source: "/projects", destination: "/companies", permanent: false },
      { source: "/projects/:projectId", destination: "/companies/:projectId", permanent: false },
      { source: "/api/companies", destination: "/api/projects", permanent: false },
      { source: "/api/companies/:companyId", destination: "/api/projects/:companyId", permanent: false },
      { source: "/api/companies/:companyId/commitments", destination: "/api/projects/:companyId/commitments", permanent: false },
      { source: "/api/companies/:companyId/commitments/:commitmentId", destination: "/api/projects/:companyId/commitments/:commitmentId", permanent: false },
      { source: "/api/companies/:companyId/extractions/:extractionId", destination: "/api/projects/:companyId/extractions/:extractionId", permanent: false },
      { source: "/api/companies/:companyId/extractions/:extractionId/duplicate", destination: "/api/projects/:companyId/extractions/:extractionId/duplicate", permanent: false },
    ];
  },
  /** Dev: allow 127.0.0.1 so HMR / error overlay work when not using localhost hostname */
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
