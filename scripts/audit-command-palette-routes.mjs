import { promises as fs } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const appDir = path.join(repoRoot, "src", "app");
const paletteFile = path.join(repoRoot, "src", "lib", "command-palette-items.ts");

function isRouteGroupSegment(segment) {
  return segment.startsWith("(") && segment.endsWith(")");
}

function isDynamicSegment(segment) {
  return /^\[.*\]$/.test(segment);
}

function normalizeHref(href) {
  const clean = href.split("#")[0]?.split("?")[0] ?? href;
  if (!clean) return "/";
  if (clean === "/") return "/";
  return clean.endsWith("/") ? clean.slice(0, -1) : clean;
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walk(abs)));
    } else if (entry.isFile()) {
      out.push(abs);
    }
  }
  return out;
}

function routeFromPagePath(pageFile) {
  const rel = path.relative(appDir, pageFile);
  const noSuffix = rel.replace(/(^|[/\\])page\.tsx$/, "");
  const parts = noSuffix.split(path.sep).filter(Boolean);
  const routeParts = [];
  for (const part of parts) {
    if (isRouteGroupSegment(part)) continue;
    if (isDynamicSegment(part)) break;
    routeParts.push(part);
  }
  if (routeParts.length === 0) return "/";
  return `/${routeParts.join("/")}`;
}

async function collectStaticRoutes() {
  const files = await walk(appDir);
  const pageFiles = files.filter((f) => /[/\\]page\.tsx$/.test(f));
  const routes = new Set();
  for (const pageFile of pageFiles) {
    routes.add(routeFromPagePath(pageFile));
  }
  return routes;
}

async function collectPaletteHrefs() {
  const src = await fs.readFile(paletteFile, "utf8");
  const hrefRegex = /href:\s*"([^"]+)"/g;
  const hrefs = new Set();
  let match;
  while ((match = hrefRegex.exec(src)) !== null) {
    const href = normalizeHref(match[1] ?? "");
    if (href.startsWith("/")) hrefs.add(href);
  }
  return hrefs;
}

async function main() {
  const [routes, hrefs] = await Promise.all([collectStaticRoutes(), collectPaletteHrefs()]);
  const missing = [...hrefs].filter((href) => !routes.has(href)).sort();

  if (missing.length > 0) {
    console.error("Command palette contains href values with no matching static page route:");
    for (const href of missing) {
      console.error(`- ${href}`);
    }
    process.exit(1);
  }

  console.log(`Command palette route audit passed (${hrefs.size} static hrefs).`);
}

main().catch((err) => {
  console.error("Command palette route audit failed:", err);
  process.exit(1);
});
