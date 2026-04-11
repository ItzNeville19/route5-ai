/**
 * After `next build`, copy assets the standalone server expects next to server.js.
 * Next emits `.next/standalone/<package-name>/server.js`.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const appName = pkg.name || "app";
const standaloneApp = path.join(root, ".next", "standalone", appName);
const serverJs = path.join(standaloneApp, "server.js");

if (!fs.existsSync(serverJs)) {
  console.error(
    `prepare-electron: ${serverJs} not found. Run \`npm run build\` first.`
  );
  process.exit(1);
}

const staticSrc = path.join(root, ".next", "static");
const staticDest = path.join(standaloneApp, ".next", "static");
if (fs.existsSync(staticSrc)) {
  fs.mkdirSync(path.dirname(staticDest), { recursive: true });
  fs.cpSync(staticSrc, staticDest, { recursive: true });
  console.log(
    `prepare-electron: copied .next/static → standalone/${appName}/.next/static`
  );
}

const publicSrc = path.join(root, "public");
const publicDest = path.join(standaloneApp, "public");
if (fs.existsSync(publicSrc)) {
  fs.cpSync(publicSrc, publicDest, { recursive: true });
  console.log(`prepare-electron: copied public → standalone/${appName}/public`);
}

console.log("prepare-electron: ready for electron-builder");
