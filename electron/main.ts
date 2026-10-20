import {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  shell,
  protocol,
  net,
  session,
} from "electron";
import path from "node:path";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { SourceLibrary } from "./library";
import { Storage } from "./storage";
import { compile } from "./compiler";
import { CodexAdapter } from "./codex";
import type { Doc } from "../src/model";
let win: BrowserWindow;
let storage: Storage;
let codex: CodexAdapter;
let quitting = false;
let saveQueue = Promise.resolve();
protocol.registerSchemesAsPrivileged(
  ["folio", "folio-artifact"].map((scheme) => ({
    scheme,
    privileges: { standard: true, secure: true, supportFetchAPI: true },
  })),
);
if (process.env.FOLIO_PROFILE_DIR)
  app.setPath("userData", path.resolve(process.env.FOLIO_PROFILE_DIR));
const localRoot =
  process.env.FOLIO_DATA_DIR || path.join(app.getPath("userData"), "documents");
app.whenReady().then(async () => {
  const runtimes = new Map<string, string>();
  protocol.handle("folio-artifact", (request) => {
    const token = new URL(request.url).pathname.slice(1);
    const html = runtimes.get(token);
    return new Response(html || "Runtime expired", {
      status: html ? 200 : 404,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  });
  storage = new Storage(localRoot);
  codex = new CodexAdapter(path.join(app.getPath("userData"), "agent-empty"));
  protocol.handle("folio", (request) => {
    const url = new URL(request.url);
    const relative =
      decodeURIComponent(url.pathname).replace(/^\//, "") || "index.html";
    const target = path.resolve(__dirname, "../dist", relative);
    const base = path.resolve(__dirname, "../dist");
    if (!target.startsWith(base + path.sep))
      return new Response("Forbidden", { status: 403 });
    return net.fetch(pathToFileURL(target).toString());
  });
  session.defaultSession.setPermissionRequestHandler((_w, _p, cb) => cb(false));
  win = new BrowserWindow({
    width: 1440,
    height: 980,
    minWidth: 900,
    minHeight: 650,
    title: "Folio",
    backgroundColor: "#f7f9f5",
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 20, y: 22 },
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
      webSecurity: true,
    },
  });
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (e) => e.preventDefault());
  session.defaultSession.webRequest.onHeadersReceived((details, cb) => {
    if (details.url.startsWith("folio-artifact:")) {
      cb({ responseHeaders: details.responseHeaders });
      return;
    }
    cb({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [
          `default-src 'self' folio:; script-src 'self' ${process.env.FOLIO_DEV_URL ? "'unsafe-inline'" : ""}; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob:; frame-src 'self' folio-artifact: about: blob:; worker-src 'self' blob:; connect-src 'self' ws://127.0.0.1:5173; object-src 'none'; base-uri 'none'`,
        ],
      },
    });
  });
  const handle = (name: string, fn: (...args: any[]) => unknown) =>
    ipcMain.handle("folio:" + name, (event, ...args) => {
      if (
        event.sender !== win.webContents ||
        event.senderFrame !== win.webContents.mainFrame
      )
        throw Error("Untrusted IPC sender");
      return fn(...args);
    });
  const library = new SourceLibrary(storage);
  handle("listSources", () => library.list());
  handle("saveSource", (record) => {
    const task = saveQueue.then(() => library.save(record));
    saveQueue = task.then(
      () => {},
      () => {},
    );
    return task;
  });
  handle("list", () => storage.list());
  handle("load", (id: string) => storage.load(id));
  handle("save", (doc: Doc) => {
    const task = saveQueue.then(() => storage.save(doc));
    saveQueue = task.then(
      () => {},
      () => {},
    );
    return task;
  });
  handle("openFolder", async () => {
    const result = await dialog.showOpenDialog(win, {
      title: "Open a Folio document folder",
      properties: ["openDirectory"],
    });
    return result.canceled ? null : storage.openFolder(result.filePaths[0]);
  });
  handle("reveal", (id: string) => shell.openPath(storage.dir(id)));
  handle("exportCopy", async (id: string) => {
    await saveQueue;
    const r = await dialog.showOpenDialog(win, {
      title: "Choose a folder for the portable copy",
      properties: ["openDirectory", "createDirectory"],
    });
    if (r.canceled) return false;
    const target = path.join(
      r.filePaths[0],
      `Folio-${id.slice(0, 8)}-${Date.now()}`,
    );
    await fs.cp(storage.dir(id), target, {
      recursive: true,
      filter: (p) => !p.endsWith(".folio-lock"),
    });
    return target;
  });
  // Carbon chart/control styles and two offline Plex fonts are embedded in the trusted shell.
  handle("runtime", (html: string) => {
    if (typeof html !== "string" || html.length > 1024 * 1024)
      throw Error("Invalid runtime document");
    const token = randomUUID();
    runtimes.set(token, html);
    return "folio-artifact://runtime/" + token;
  });
  handle("disposeRuntime", (url: string) => {
    if (url.startsWith("folio-artifact://runtime/"))
      runtimes.delete(new URL(url).pathname.slice(1));
  });
  handle("compile", (files: any, ids: string[]) => compile(files, ids));
  handle("account", () => codex.account());
  handle("login", async () => {
    const r = await codex.login();
    const u = new URL(r.authUrl);
    if (
      u.protocol !== "https:" ||
      !["auth.openai.com", "chatgpt.com", "auth0.openai.com"].includes(
        u.hostname,
      )
    )
      throw Error("Unexpected login destination");
    await shell.openExternal(r.authUrl);
    return true;
  });
  handle("generate", (block: any, prompt: string) =>
    codex.generate(block, prompt),
  );
  handle("cancel", () => codex.cancel());
  codex.on("status", (v) =>
    win.webContents.send("folio:event", { type: "account", ...v }),
  );
  codex.on("progress", (v) =>
    win.webContents.send("folio:event", { type: "progress", ...v }),
  );
  win.webContents.on("console-message", (event) => {
    if (event.level === "error") console.error("Renderer:", event.message);
  });
  if (process.env.FOLIO_DEV_URL) await win.loadURL(process.env.FOLIO_DEV_URL);
  else await win.loadURL("folio://app/index.html");
  win.on("close", (e) => {
    if (!quitting) {
      e.preventDefault();
      win.webContents.send("folio:event", { type: "closing" });
      setTimeout(async () => {
        await saveQueue;
        quitting = true;
        await storage.release();
        codex.stop();
        win.destroy();
        app.quit();
      }, 1000);
    }
  });
});
app.on("window-all-closed", () => app.quit());
app.on("before-quit", () => {
  codex?.stop();
});
