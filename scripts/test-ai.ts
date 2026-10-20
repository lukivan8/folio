import { CodexAdapter } from "../electron/codex";
import { parseCSV } from "../src/csv";
import { compile } from "../electron/compiler";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
const root = await fs.mkdtemp(path.join(os.tmpdir(), "folio-codex-"));
const codex = new CodexAdapter(root);
try {
  console.log(
    "Checking pinned app-server protocol and supported account state…",
  );
  console.log(await codex.account());
  const models = await codex.request("model/list", { includeHidden: false });
  console.log(
    models.data.map((m: any) => ({ model: m.model, default: m.isDefault })),
  );
  if (!process.argv.includes("--generate")) {
    console.log(
      "Read-only protocol smoke test complete; no generation requested.",
    );
  } else {
    const s = await parseCSV(
      new TextEncoder().encode(
        "date,user_id,amount\n2026-10-01,001,10\n2026-10-01,001,20\n2026-10-01,002,5\n2026-10-02,003,7",
      ),
      "fixed-task.csv",
    );
    s.confirmed = true;
    const b = {
      id: "test-block",
      title: "Distinct users",
      sources: [s],
      revisions: [],
      params: {},
      prompt: "",
      messages: [],
    };
    codex.on("progress", (v) => console.log(v.phase));
    const r = await codex.generate(
      b,
      "Show distinct active users per date as a bar chart. Count each user once per date.",
    );
    if (!r.files) throw Error("Expected artifact");
    await compile(r.files, [s.id]);
    console.log(
      "Real provider candidate built successfully:",
      r.files.manifest.title,
    );
    await fs.writeFile(path.join(root, "candidate.json"), JSON.stringify(r));
    console.log("Candidate retained in temporary test directory.");
  }
} finally {
  codex.stop();
}
