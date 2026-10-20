import fs from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import type { Doc, Summary } from "../src/model";
const digest = (s: string) => createHash("sha256").update(s).digest("hex");
export const validId = (id: string) => {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id))
    throw Error("Invalid local identifier");
  return id;
};
export async function atomic(file: string, data: string | Uint8Array) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temp = file + "." + randomUUID() + ".tmp";
  const h = await fs.open(temp, "wx");
  try {
    await h.writeFile(data);
    await h.sync();
  } finally {
    await h.close();
  }
  await fs.rename(temp, file);
  const parent = await fs.open(path.dirname(file), "r");
  try {
    await parent.sync();
  } finally {
    await parent.close();
  }
}
export class Storage {
  paths = new Map<string, string>();
  locks = new Set<string>();
  constructor(public root: string) {}
  dir(id: string) {
    return this.paths.get(id) || path.join(this.root, validId(id));
  }
  async list(): Promise<Summary[]> {
    await fs.mkdir(this.root, { recursive: true });
    const names = await fs.readdir(this.root);
    const docs: Summary[] = [];
    for (const name of names) {
      try {
        const m = JSON.parse(
          await fs.readFile(
            path.join(this.root, name, "document.json"),
            "utf8",
          ),
        );
        this.paths.set(m.id, path.join(this.root, name));
        docs.push({
          id: m.id,
          title: m.title,
          updated: m.updated,
          trashed: m.trashed,
        });
      } catch {
        /* Ignore non-document directories. */
      }
    }
    return docs.sort((a, b) => b.updated.localeCompare(a.updated));
  }
  async fingerprint(dir: string): Promise<string> {
    const entries: string[] = [];
    const walk = async (base: string) => {
      for (const item of (await fs.readdir(base, { withFileTypes: true })).sort(
        (a, b) => a.name.localeCompare(b.name),
      )) {
        if (
          item.name === ".folio-lock" ||
          item.name === "integrity.json" ||
          item.name === "recovery.json" ||
          item.name.endsWith(".tmp")
        )
          continue;
        const file = path.join(base, item.name);
        if (item.isSymbolicLink())
          throw Error(
            "Document folders cannot contain symbolic links. Copy ordinary files into a new document.",
          );
        if (item.isDirectory()) await walk(file);
        else
          entries.push(
            path.relative(dir, file) +
              ":" +
              digest((await fs.readFile(file)).toString("base64")),
          );
      }
    };
    await walk(dir);
    return digest(entries.join("\n"));
  }
  async recover(dir: string) {
    try {
      const journal = JSON.parse(
        await fs.readFile(path.join(dir, "history", "recovery.json"), "utf8"),
      );
      if (journal.doc) {
        await this.persist(dir, journal.doc);
        await fs.unlink(path.join(dir, "history", "recovery.json"));
      }
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }
  }
  async openFolder(dir: string) {
    const meta = JSON.parse(
      await fs.readFile(path.join(dir, "document.json"), "utf8"),
    );
    validId(meta.id);
    this.paths.set(meta.id, dir);
    return this.load(meta.id);
  }
  async load(id: string): Promise<Doc> {
    const dir = this.dir(id);
    let readOnly = false;
    try {
      await fs.mkdir(dir, { recursive: true });
      const lock = path.join(dir, ".folio-lock");
      if (!this.locks.has(dir)) {
        try {
          await fs.writeFile(lock, String(process.pid), { flag: "wx" });
          this.locks.add(dir);
        } catch {
          const pid = Number(await fs.readFile(lock, "utf8"));
          let running = true;
          try {
            process.kill(pid, 0);
          } catch {
            running = false;
          }
          if (!running) {
            await fs.unlink(lock);
            await fs.writeFile(lock, String(process.pid), { flag: "wx" });
            this.locks.add(dir);
          } else readOnly = true;
        }
      }
      if (!readOnly) await this.recover(dir);
      const raw = await fs.readFile(path.join(dir, "state.json"), "utf8");
      const doc = JSON.parse(raw) as Doc;
      doc.diskVersion = await this.fingerprint(dir);
      let changed = false;
      try {
        changed =
          JSON.parse(
            await fs.readFile(path.join(dir, "integrity.json"), "utf8"),
          ).hash !== doc.diskVersion;
      } catch {}
      doc.readOnly = readOnly || doc.version !== 1 || changed;
      return doc;
    } catch (e) {
      throw e;
    }
  }
  async save(doc: Doc) {
    validId(doc.id);
    if (doc.version !== 1 || doc.readOnly)
      throw Error("This document is read-only. Save a copy to continue.");
    const dir = this.dir(doc.id);
    let current: string | undefined;
    try {
      current = await fs.readFile(path.join(dir, "state.json"), "utf8");
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }
    if (current && doc.diskVersion !== (await this.fingerprint(dir)))
      throw Error(
        "This document changed outside Folio. Reload it or save a copy.",
      );
    if (!this.locks.has(dir)) {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, ".folio-lock"), String(process.pid), {
        flag: "wx",
      });
      this.locks.add(dir);
    }
    const clean = structuredClone(doc);
    delete clean.diskVersion;
    delete clean.readOnly;
    await atomic(
      path.join(dir, "history", "recovery.json"),
      JSON.stringify({ doc: clean }),
    );
    await this.persist(dir, clean);
    await fs.unlink(path.join(dir, "history", "recovery.json"));
    return this.fingerprint(dir);
  }
  async persist(dir: string, doc: Doc) {
    for (const block of Object.values(doc.blocks)) {
      validId(block.id);
      const snapshots = [
        ...block.sources,
        ...block.revisions.flatMap((r) => r.sources),
      ];
      for (const s of snapshots) {
        validId(s.id);
        validId(s.revision);
        const sd = path.join(dir, "sources", s.id, s.revision);
        try {
          await fs.access(path.join(sd, "source.json"));
        } catch {
          await atomic(
            path.join(sd, "original.csv"),
            Buffer.from(s.original, "base64"),
          );
          const { rows, text, original, ...meta } = s;
          await atomic(
            path.join(sd, "source.json"),
            JSON.stringify(meta, null, 2),
          );
        }
      }
      for (const r of block.revisions) {
        validId(r.id);
        const rd = path.join(dir, "blocks", block.id, "revisions", r.id);
        try {
          await fs.access(path.join(rd, "run.json"));
        } catch {
          await atomic(
            path.join(rd, "artifact.json"),
            JSON.stringify(r.files.manifest, null, 2),
          );
          await atomic(path.join(rd, "analysis.ts"), r.files.analysis);
          await atomic(path.join(rd, "view.tsx"), r.files.view);
          await atomic(path.join(rd, "checks.ts"), r.files.checks);
          await atomic(
            path.join(rd, "results", "data.json"),
            JSON.stringify(r.result),
          );
          await atomic(
            path.join(rd, "run.json"),
            JSON.stringify(
              {
                id: r.id,
                created: r.created,
                sourceRefs: r.sourceRefs,
                params: r.params,
                ...r.run,
                sourceHashes: Object.fromEntries(
                  r.sources.map((s) => [s.revision, s.hash]),
                ),
                sourceParseRevisions: Object.fromEntries(
                  r.sources.map((s) => [s.id, s.revision]),
                ),
                outputHashes: Object.fromEntries(
                  Object.entries(r.result.datasets).map(([id, t]) => [
                    id,
                    digest(JSON.stringify(t)),
                  ]),
                ),
                resultHash: digest(JSON.stringify(r.result)),
                rowCounts: {
                  input: r.result.inputRows,
                  included: r.result.includedRows,
                  excluded: r.result.excludedRows,
                },
                checks: r.result.checks,
              },
              null,
              2,
            ),
          );
        }
      }
      const { sources, revisions, ...meta } = block;
      await atomic(
        path.join(dir, "blocks", block.id, "block.json"),
        JSON.stringify(meta, null, 2),
      );
      if (block.draft)
        await atomic(
          path.join(dir, "blocks", block.id, "drafts", "last.json"),
          JSON.stringify(block.draft, null, 2),
        );
    }
    await atomic(
      path.join(dir, "content.json"),
      JSON.stringify(doc.content, null, 2),
    );
    const { content, blocks, ...meta } = doc;
    await atomic(
      path.join(dir, "document.json"),
      JSON.stringify(meta, null, 2),
    );
    await atomic(path.join(dir, "state.json"), JSON.stringify(doc));
    await atomic(
      path.join(dir, "integrity.json"),
      JSON.stringify({ hash: await this.fingerprint(dir) }),
    );
  }
  async release() {
    for (const dir of this.locks)
      await fs.unlink(path.join(dir, ".folio-lock")).catch(() => {});
    this.locks.clear();
  }
}
