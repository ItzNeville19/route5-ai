/**
 * Route5 desktop shell — loads the Next.js app in a BrowserWindow.
 * Dev: expects Next at ELECTRON_START_URL (default http://127.0.0.1:3000).
 * Packaged: spawns the standalone server from resources, then opens the same URL.
 */
const { app, BrowserWindow, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const http = require("http");

const pkgPath = path.join(__dirname, "..", "package.json");
const appName = fs.existsSync(pkgPath)
  ? JSON.parse(fs.readFileSync(pkgPath, "utf8")).name || "app"
  : "app";

const DEFAULT_PORT = process.env.PORT || "3000";
const START_URL =
  process.env.ELECTRON_START_URL || `http://127.0.0.1:${DEFAULT_PORT}`;

let mainWindow = null;
let nextChild = null;

function waitForHttp(url, maxMs = 120000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        if (Date.now() - start > maxMs) {
          reject(new Error(`Server did not respond at ${url}`));
          return;
        }
        setTimeout(tick, 400);
      });
    };
    tick();
  });
}

function standaloneRoot() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "standalone", appName);
  }
  return path.join(__dirname, "..", ".next", "standalone", appName);
}

function ensureNodePath() {
  if (process.platform === "darwin") {
    const extra = ["/opt/homebrew/bin", "/usr/local/bin", `${process.env.HOME || ""}/.nvm/versions/node`];
    process.env.PATH = `${extra.filter(Boolean).join(":")}:${process.env.PATH || ""}`;
  }
}

function startStandaloneServer() {
  ensureNodePath();
  const root = standaloneRoot();
  const serverJs = path.join(root, "server.js");
  if (!fs.existsSync(serverJs)) {
    console.error(
      "[electron] Missing standalone server. Run: npm run build && node scripts/prepare-electron.mjs"
    );
    return null;
  }
  const nodeBin = process.env.ELECTRON_NODE_PATH || "node";
  nextChild = spawn(nodeBin, [serverJs],
    {
      cwd: root,
      env: {
        ...process.env,
        PORT: DEFAULT_PORT,
        HOSTNAME: "127.0.0.1",
        NODE_ENV: "production",
      },
      stdio: "inherit",
    }
  );
  nextChild.on("error", (err) => {
    console.error("[electron] Failed to start Next server:", err);
  });
  nextChild.on("exit", (code) => {
    if (code && code !== 0) {
      console.error("[electron] Next server exited with", code);
    }
  });
  return nextChild;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 900,
    minHeight: 600,
    show: false,
    backgroundColor: "#0c0c0e",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.loadURL(START_URL).catch((err) => {
    console.error("[electron] loadURL failed:", err);
    mainWindow.loadURL(
      `data:text/html,<html><body style="font:14px system-ui;padding:24px;background:#0c0c0e;color:#e4e4e7"><p>Could not load Route5.</p><p>Start Next first: <code>npm run dev</code> or use the packaged app after <code>npm run electron:dist</code>.</p><pre>${String(
        err
      )}</pre></body></html>`
    );
    mainWindow.show();
  });
}

async function ready() {
  if (app.isPackaged) {
    startStandaloneServer();
    try {
      await waitForHttp(START_URL);
    } catch (e) {
      console.error(e);
    }
  }

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}

app.whenReady().then(ready);

app.on("window-all-closed", () => {
  if (nextChild) {
    try {
      nextChild.kill("SIGTERM");
    } catch {
      /* ignore */
    }
    nextChild = null;
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (nextChild) {
    try {
      nextChild.kill("SIGTERM");
    } catch {
      /* ignore */
    }
  }
});
