import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCSV } from "../src/csv";
import {
  duplicateDoc,
  safeCSV,
  validateParams,
  validateResult,
  type Doc,
} from "../src/model";
import { starter } from "../src/starter";
import { Storage } from "../electron/storage";
import { compile } from "../electron/compiler";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
const bytes = (s: string) => new TextEncoder().encode(s);
test("CSV preserves bytes, BOM, identifiers, escaped quotes, embedded newlines and delimiters", async () => {
  const text =
    '\ufeffuser_id;name;amount\r\n00123;"a; b";12\r\n00456;"a""b\nnext";3\r\n';
  const s = await parseCSV(bytes(text), "../example.csv");
  assert.equal(s.delimiter, ";");
  assert.equal(s.columns[0].type, "text");
  assert.equal(s.rows[0][0], "00123");
  assert.equal(s.rows[1][1], 'a"b\nnext');
  assert.deepEqual(Buffer.from(s.original, "base64"), Buffer.from(bytes(text)));
  assert.equal(s.name, ".._example.csv");
  const tab = await parseCSV(bytes("id\tvalue\n001\t7"), "a.csv");
  assert.equal(tab.delimiter, "\t");
});
test("CSV rejects malformed records, invalid encodings and unsupported sizes", async () => {
  await assert.rejects(
    () => parseCSV(bytes("a,b\n1,2,3"), "bad.csv"),
    /Inconsistent/,
  );
  await assert.rejects(() => parseCSV(bytes('a,b\n"1,2'), "bad.csv"), /Row/);
  await assert.rejects(
    () => parseCSV(new Uint8Array([0xff]), "bad.csv"),
    /UTF-8/,
  );
  await assert.rejects(
    () => parseCSV(new Uint8Array(25 * 1024 * 1024 + 1), "big.csv"),
    /25 MiB/,
  );
});
test("CSV assigns unique columns, retains ambiguous dates and empty valid data", async () => {
  const s = await parseCSV(bytes("id,id,,date\n001,002,x,01/02/2026"), "x.csv");
  assert.deepEqual(
    s.columns.map((c) => c.id),
    ["c0", "c1", "c2", "c3"],
  );
  assert.equal(s.columns[1].label, "id (2)");
  assert.equal(s.columns[3].type, "text");
  assert(s.warnings.some((w) => w.includes("ambiguous")));
  const empty = await parseCSV(bytes("date,value\n"), "empty.csv");
  assert.equal(empty.rows.length, 0);
});
test("safe CSV guards formula-like values with explicit raw option", () => {
  const t = {
    columns: ["x"],
    rows: [["=1+1"], ["hello"], ["@SUM(A1)"]],
    methodId: "m",
  };
  assert(safeCSV(t).includes("'="));
  assert(!safeCSV(t, true).includes("'="));
});
test("compiler confines imports and source references", async () => {
  const s = await parseCSV(bytes("date,value\n2026-01-01,4"), "x.csv");
  const files = starter(s);
  const c = await compile(files, [s.id]);
  assert(c.view.length > 100);
  assert(c.worker.length > 100);
  await assert.rejects(
    () =>
      compile(
        {
          ...files,
          view: 'import fs from "node:fs"; export function View(){return null}',
        },
        [s.id],
      ),
    /not approved/,
  );
  await assert.rejects(() => compile(files, []), /outside this block/);
  await assert.rejects(
    () =>
      compile({ ...files, analysis: 'import "https://bad.test/x.js"' }, [s.id]),
    /not approved/,
  );
});
test("parameters and result row accounting are host validated", async () => {
  const s = await parseCSV(bytes("a,b\nx,1\ny,2"), "x.csv");
  const files = starter(s);
  assert.throws(
    () => validateParams(files.manifest, { aggregation: "wrong" }),
    /Unknown/,
  );
  const result = {
    datasets: {
      summary: { columns: ["a", "b"], rows: [["x", 1]], methodId: "aggregate" },
    },
    inputRows: 2,
    includedRows: 1,
    excludedRows: 0,
    warnings: [],
    checks: [{ name: "accounting", passed: true }],
  };
  assert.throws(() => validateResult(result, files, [s]), /accounting/);
  result.excludedRows = 1;
  validateResult(result, files, [s]);
  result.datasets.summary.rows = [["x", Infinity]];
  assert.throws(() => validateResult(result, files, [s]), /Invalid/);
});
test("portable storage preserves originals and revisions, detects external edits and recovers journal", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "folio-test-"));
  const storage = new Storage(root);
  try {
    const s = await parseCSV(bytes("id,value\n001,5"), "x.csv");
    const d: Doc = {
      version: 1,
      id: "doc-1",
      title: "One",
      created: "now",
      updated: "now",
      content: {
        type: "doc",
        content: [{ type: "dataBlock", attrs: { id: "block-1" } }],
      },
      blocks: {
        "block-1": {
          id: "block-1",
          title: "Data",
          sources: [s],
          revisions: [],
          params: {},
          prompt: "",
          messages: [],
        },
      },
    };
    d.diskVersion = await storage.save(d);
    const loaded = await storage.load(d.id);
    assert.equal(loaded.title, "One");
    const original = await fs.readFile(
      path.join(root, d.id, "sources", s.id, s.revision, "original.csv"),
    );
    assert.deepEqual(original, Buffer.from(s.text));
    const copy = duplicateDoc(loaded);
    assert.notEqual(copy.id, d.id);
    assert.notEqual(Object.keys(copy.blocks)[0], "block-1");
    assert.equal(copy.content.content[0].attrs.id, Object.keys(copy.blocks)[0]);
    await fs.writeFile(
      path.join(root, d.id, "state.json"),
      JSON.stringify({ ...d, title: "External" }),
    );
    await assert.rejects(() => storage.save(d), /outside Folio/);
    await fs.writeFile(
      path.join(root, d.id, "history", "recovery.json"),
      JSON.stringify({ doc: { ...d, title: "Recovered" } }),
    );
    const recovered = await storage.load(d.id);
    assert.equal(recovered.title, "Recovered");
  } finally {
    await storage.release();
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("delimited empty records remain part of the complete accepted population", async () => {
  const s = await parseCSV(bytes("group,value\n,\na,1\n"), "empty-record.csv");
  assert.equal(s.rows.length, 2);
  assert.deepEqual(s.rows[0], ["", ""]);
});
