import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseCSV } from "../src/csv";
import { sourceWorkspace, insertFinding } from "../src/library";
import { emptyDoc } from "../src/welcome";
import { starter } from "../src/starter";
import { Storage } from "../electron/storage";
import { SourceLibrary } from "../electron/library";
async function source() {
  const s = await parseCSV(
    new TextEncoder().encode(
      "date,value,id\n2026-10-01,5,001\n2026-10-02,8,002",
    ),
    "fixture.csv",
  );
  s.confirmed = true;
  return s;
}
test("a finding preserves source, revision, calculations and parameters without copying the conversation", async () => {
  const s = await source();
  const record = sourceWorkspace(s);
  const a = record.analysis;
  a.active = "revision-one";
  a.params = { search: "2026", aggregation: "sum", chart: "line" };
  a.prompt = "Unsent draft";
  a.threadId = "private-thread";
  a.messages = [{ role: "assistant", text: "A finding", at: record.updated }];
  a.revisions = [
    {
      id: a.active,
      created: record.updated,
      files: starter(s),
      sources: [s],
      sourceRefs: [s.revision],
      params: { ...a.params },
      result: {
        datasets: {
          summary: {
            columns: ["date", "value"],
            rows: [["2026-10-01", 5]],
            methodId: "aggregate",
          },
        },
        inputRows: 2,
        includedRows: 1,
        excludedRows: 1,
        checks: [{ name: "accounting", passed: true }],
        warnings: [],
      },
      run: { hash: "h", duration: 1, runtime: "fixture" },
    },
  ];
  const before = structuredClone(record);
  const d = insertFinding(emptyDoc(), a, "Editable conclusion");
  const copy = Object.values(d.blocks)[0];
  assert.notEqual(copy.id, a.id);
  assert.equal(copy.sources[0].id, s.id);
  assert.equal(copy.sources[0].original, s.original);
  assert.deepEqual(copy.revisions, a.revisions);
  assert.deepEqual(copy.params, a.params);
  assert.equal(copy.active, a.active);
  assert.deepEqual(copy.messages, []);
  assert.equal(copy.prompt, "");
  assert.equal(copy.threadId, undefined);
  assert.deepEqual(record, before);
  assert.equal(d.content.content[1].content[0].text, "Editable conclusion");
  const another = insertFinding(emptyDoc(), a, "Another document");
  assert.equal(Object.values(another.blocks)[0].sources[0].id, s.id);
});
test("a narrative-only source finding remains editable prose", async () => {
  const r = sourceWorkspace(await source());
  const d = insertFinding(
    emptyDoc(),
    r.analysis,
    "An observation without a chart",
  );
  assert.deepEqual(d.blocks, {});
  assert(!d.content.content.some((n: any) => n.type === "dataBlock"));
});
test("shared source storage is additive, durable and detects conflicting writes", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "folio-library-"));
  const storage = new Storage(root);
  const d = emptyDoc();
  const r = sourceWorkspace(await source());
  d.blocks[r.analysis.id] = r.analysis;
  d.content = {
    type: "doc",
    content: [{ type: "dataBlock", attrs: { id: r.analysis.id } }],
  };
  await storage.save(d);
  const before = await fs.readFile(
    path.join(storage.dir(d.id), "state.json"),
    "utf8",
  );
  const library = new SourceLibrary(storage);
  const records = await library.list();
  assert.equal(records.length, 1);
  assert.equal(records[0].id, r.source.id);
  assert.equal(
    await fs.readFile(path.join(storage.dir(d.id), "state.json"), "utf8"),
    before,
  );
  const record = records[0];
  record.analysis.prompt = "A preserved draft";
  record.analysis.messages = [
    { role: "user", text: "A source question", at: record.updated },
  ];
  record.diskVersion = await library.save(record);
  const restored = (await new SourceLibrary(storage).list())[0];
  assert.equal(restored.analysis.prompt, "A preserved draft");
  assert.equal(restored.analysis.messages[0].text, "A source question");
  assert.equal(restored.source.original, r.source.original);
  const stale = structuredClone(restored);
  restored.analysis.prompt = "Newer draft";
  await library.save(restored);
  await assert.rejects(() => library.save(stale), /changed outside/);
  await assert.rejects(
    () => library.save({ ...stale, id: "../outside" }),
    /Invalid/,
  );
  await storage.release();
  await fs.rm(root, { recursive: true, force: true });
});
