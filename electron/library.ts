import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { atomic, validId, type Storage } from "./storage";
import { sourceWorkspace, type SharedSource } from "../src/library";
import type { Doc } from "../src/model";
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export class SourceLibrary {
  constructor(private storage: Storage) {}
  file(id: string) {
    return path.join(this.storage.root, "_sources", validId(id) + ".json");
  }
  async list(): Promise<SharedSource[]> {
    const dir = path.join(this.storage.root, "_sources");
    await fs.mkdir(dir, { recursive: true });
    const records: SharedSource[] = [];
    for (const name of await fs.readdir(dir)) {
      if (!name.endsWith(".json")) continue;
      const raw = await fs.readFile(path.join(dir, name), "utf8");
      const record = JSON.parse(raw) as SharedSource;
      validId(record.id);
      records.push({ ...record, diskVersion: hash(raw) });
    }
    // Additive migration. Original documents and their artifact/source IDs remain untouched.
    const known = new Set(records.map((r) => r.id));
    for (const doc of await this.storage.list()) {
      const raw = JSON.parse(
        await fs.readFile(
          path.join(this.storage.dir(doc.id), "state.json"),
          "utf8",
        ),
      ) as Doc;
      for (const block of Object.values(raw.blocks || {}))
        for (const source of block.sources) {
          if (known.has(source.id)) continue;
          const record = sourceWorkspace(source);
          record.diskVersion = await this.save(record);
          records.push(record);
          known.add(record.id);
        }
    }
    return records;
  }
  async save(record: SharedSource) {
    validId(record.id);
    if (
      record.source.id !== record.id ||
      !record.analysis.sources.some((s) => s.id === record.id)
    )
      throw Error("Invalid shared source reference");
    const file = this.file(record.id);
    let previous: string | undefined;
    try {
      previous = await fs.readFile(file, "utf8");
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }
    if (previous && hash(previous) !== record.diskVersion)
      throw Error(
        "This shared source changed outside this window. Reopen Folio before editing it.",
      );
    const { diskVersion: _, ...data } = record;
    const raw = JSON.stringify(data);
    await atomic(file, raw);
    return hash(raw);
  }
}
