#!/usr/bin/env node
/**
 * Workspace theme audit — validates `globals.css` against `workspace-themes.ts`:
 * - Every non-auto theme id appears in CSS with merged variables (base shell + overrides)
 * - Foreground / muted / canvas are never identical hex pairs
 * - WCAG-style contrast: fg vs canvas ≥ 4.5:1, muted vs canvas ≥ 3:1
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const MIN_FG_ON_CANVAS = 4.5;
const MIN_MUTED_ON_CANVAS = 3.0;

function hexToRgb(hex) {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (h.length !== 6) return null;
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function relativeLuminance({ r, g, b }) {
  const lin = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const R = lin(r);
  const G = lin(g);
  const B = lin(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contrastRatio(hexA, hexB) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  if (!a || !b) return null;
  const L1 = relativeLuminance(a);
  const L2 = relativeLuminance(b);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

function normalizeHex(hex) {
  if (!hex) return null;
  let h = hex.trim().toLowerCase();
  if (h.length === 4 && h[0] === "#") {
    h = `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`;
  }
  return h.length === 7 && h[0] === "#" ? h : null;
}

function parseThemeIds() {
  const src = fs.readFileSync(path.join(root, "src/lib/workspace-themes.ts"), "utf8");
  const m = /export const WORKSPACE_THEME_IDS = \[([\s\S]*?)\] as const/.exec(src);
  if (!m) throw new Error("Could not find WORKSPACE_THEME_IDS in workspace-themes.ts");
  return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
}

function extractBalancedBody(css, openBraceIdx) {
  if (css[openBraceIdx] !== "{") return null;
  let depth = 0;
  for (let k = openBraceIdx; k < css.length; k++) {
    if (css[k] === "{") depth++;
    else if (css[k] === "}") {
      depth--;
      if (depth === 0) return css.slice(openBraceIdx + 1, k);
    }
  }
  return null;
}

/** Base Route5 signed-in shell (tokens + defaults before any `.workspace-theme-*`). */
function extractBaseRoute5ShellBlock(css) {
  const marker = "/* ── Route5 workspace (signed-in):";
  const i = css.indexOf(marker);
  if (i === -1) return null;
  const from = css.indexOf(".theme-route5-command.theme-agent-shell {", i);
  if (from === -1) return null;
  const brace = from + ".theme-route5-command.theme-agent-shell ".length;
  return extractBalancedBody(css, brace);
}

function findThemeOverrideBodies(css, id) {
  const re = new RegExp(`workspace-theme-${id}(?![a-z0-9])`, "g");
  const seenBrace = new Set();
  const bodies = [];
  let m;
  while ((m = re.exec(css)) !== null) {
    const brace = css.indexOf("{", m.index);
    if (brace === -1 || seenBrace.has(brace)) continue;
    seenBrace.add(brace);
    const body = extractBalancedBody(css, brace);
    if (body != null) bodies.push(body);
  }
  return bodies;
}

function lastHexInMerged(merged, prop) {
  const re = new RegExp(`${prop}\\s*:\\s*(#[0-9a-fA-F]{3,6})\\b`, "gi");
  let last = null;
  let mm;
  while ((mm = re.exec(merged)) !== null) {
    last = normalizeHex(mm[1]);
  }
  return last;
}

function parseThemeIdsFromCss(css) {
  const found = new Set();
  const re = /workspace-theme-([a-z0-9]+)(?![a-z0-9])/g;
  let m;
  while ((m = re.exec(css)) !== null) {
    found.add(m[1]);
  }
  return found;
}

function main() {
  const ids = parseThemeIds();
  const css = fs.readFileSync(path.join(root, "src/app/globals.css"), "utf8");
  const concrete = ids.filter((id) => id !== "auto");
  const errors = [];
  const warnings = [];

  const base = extractBaseRoute5ShellBlock(css);
  if (!base) {
    errors.push("Could not find base .theme-route5-command.theme-agent-shell { … } block");
  }

  const cssThemeIds = parseThemeIdsFromCss(css);
  for (const id of concrete) {
    if (!cssThemeIds.has(id)) {
      errors.push(`Theme id "${id}" not found in globals.css (no workspace-theme-${id} class)`);
    }
  }

  for (const id of concrete) {
    const overrides = findThemeOverrideBodies(css, id);
    const merged = `${base ?? ""}\n${overrides.join("\n")}`;

    const canvas = lastHexInMerged(merged, "--workspace-canvas");
    const fg = lastHexInMerged(merged, "--workspace-fg") || lastHexInMerged(merged, "color");
    const muted = lastHexInMerged(merged, "--workspace-muted-fg");
    const ios = lastHexInMerged(merged, "--ios-secondary");

    if (!canvas || !fg || !muted) {
      errors.push(
        `Theme "${id}": after merging base + overrides, missing --workspace-canvas, --workspace-fg/--color, or --workspace-muted-fg`
      );
      continue;
    }

    const norm = (h) => h.replace("#", "").toLowerCase();
    if (norm(fg) === norm(canvas)) {
      errors.push(`Theme "${id}": --workspace-fg matches --workspace-canvas (${fg})`);
    }
    if (norm(muted) === norm(canvas)) {
      errors.push(`Theme "${id}": --workspace-muted-fg matches --workspace-canvas (${muted})`);
    }
    if (ios && norm(ios) !== norm(muted)) {
      warnings.push(`Theme "${id}": --ios-secondary (${ios}) ≠ --workspace-muted-fg (${muted})`);
    }

    const rFg = contrastRatio(fg, canvas);
    const rMuted = contrastRatio(muted, canvas);
    if (rFg == null || rMuted == null) {
      errors.push(`Theme "${id}": contrast parse failed`);
      continue;
    }
    if (rFg < MIN_FG_ON_CANVAS) {
      errors.push(
        `Theme "${id}": fg/canvas ${rFg.toFixed(2)}:1 < ${MIN_FG_ON_CANVAS}:1 (${fg} on ${canvas})`
      );
    }
    if (rMuted < MIN_MUTED_ON_CANVAS) {
      errors.push(
        `Theme "${id}": muted/canvas ${rMuted.toFixed(2)}:1 < ${MIN_MUTED_ON_CANVAS}:1 (${muted} on ${canvas})`
      );
    }
  }

  for (const w of warnings) {
    console.warn(`⚠ ${w}`);
  }
  if (errors.length) {
    console.error("Workspace theme audit failed:\n");
    for (const e of errors) console.error(`  • ${e}`);
    process.exit(1);
  }
  console.log(
    `✓ Workspace theme audit passed (${concrete.length} themes): merged tokens, no fg/muted=canvas, contrast ≥ ${MIN_FG_ON_CANVAS} / ${MIN_MUTED_ON_CANVAS}.`
  );
}

main();
