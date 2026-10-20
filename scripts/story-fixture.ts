import fs from "node:fs/promises";
import { parseCSV } from "../src/csv";
import { starter } from "../src/starter";
import { compile } from "../electron/compiler";
import { sourceWorkspace } from "../src/library";
const s = await parseCSV(
  new TextEncoder().encode(
    "date,active_users,workspace_id\n2026-10-01,120,0001\n2026-10-02,150,0002\n2026-10-03,160,0001",
  ),
  "workspaces.csv",
);
s.confirmed = true;
const bar = starter(s);
const line = structuredClone(bar);
line.manifest.parameters.find((p) => p.id === "chart")!.default = "line";
const payload = {
  record: sourceWorkspace(s),
  bar,
  line,
  compiledBar: await compile(bar, [s.id]),
  compiledLine: await compile(line, [s.id]),
};
await fs.mkdir("src/stories/fixtures", { recursive: true });
await fs.writeFile(
  "src/stories/fixtures/workspace.json",
  JSON.stringify(payload),
);
