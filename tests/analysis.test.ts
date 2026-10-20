import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCSV } from "../src/csv";
import { starter } from "../src/starter";
import { validateResult } from "../src/model";
async function fixture(text: string) {
  const source = await parseCSV(new TextEncoder().encode(text), "fixture.csv");
  const files = starter(source);
  const analyze = (
    await import(
      "data:text/javascript;base64," +
        Buffer.from(files.analysis).toString("base64")
    )
  ).analyze;
  const checks = (
    await import(
      "data:text/javascript;base64," +
        Buffer.from(files.checks).toString("base64")
    )
  ).checks;
  return {
    source,
    files,
    async run(params: Record<string, unknown>) {
      const ctx = { sources: [source], params };
      const result = await analyze(ctx);
      result.checks = await checks(result, ctx);
      return validateResult(result, files, [source]);
    },
  };
}
test("sum, average, count, duplicates, nulls and filtered populations have known values", async () => {
  const f = await fixture(
    "group,value,user_id\na,10,001\na,20,001\na,,002\nb,7,003\na,10,001",
  );
  const sum = await f.run({ aggregation: "sum", search: "" });
  assert.deepEqual(sum.datasets.summary.rows, [
    ["a", 40],
    ["b", 7],
  ]);
  assert.equal(sum.excludedRows, 1);
  const avg = await f.run({ aggregation: "average", search: "" });
  assert.equal(avg.datasets.summary.rows[0][1], 40 / 3);
  const count = await f.run({ aggregation: "count", search: "" });
  assert.deepEqual(count.datasets.summary.rows, [
    ["a", 4],
    ["b", 1],
  ]);
  const filtered = await f.run({ aggregation: "sum", search: "b" });
  assert.deepEqual(filtered.datasets.summary.rows, [["b", 7]]);
  assert.equal(filtered.excludedRows, 4);
  assert.equal(f.source.columns[2].type, "text");
  assert.equal(f.source.rows[0][2], "001");
});
test("empty input and empty filters never fabricate results", async () => {
  const f = await fixture("date,value\n");
  const r = await f.run({ aggregation: "count", search: "" });
  assert.deepEqual(r.datasets.summary.rows, []);
  assert.equal(r.inputRows, 0);
});
