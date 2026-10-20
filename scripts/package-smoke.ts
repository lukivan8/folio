import { spawnSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { parseCSV } from "../src/csv";
import { starter } from "../src/starter";
const app = path.resolve("release/mac-arm64/Folio.app/Contents");
const executable = path.join(app, "MacOS/Folio");
const compiler = path.join(
  app,
  "Resources/app.asar/build-electron/compiler.cjs",
);
const source = await parseCSV(
  new TextEncoder().encode("group,value\na,1\nb,2"),
  "smoke.csv",
);
const candidates = [
  { name: "Bundled local starter", files: starter(source), sources: [source] },
];
for (const [name, file] of [
  ["Legacy real-provider revision", "fixtures/ai-line-revision.json"],
  ["Carbon real-provider revision", "fixtures/ai-carbon-revision.json"],
]) {
  if (fs.existsSync(file)) {
    const fixture = JSON.parse(fs.readFileSync(file, "utf8"));
    candidates.push({ name, ...fixture });
  }
}
for (const c of candidates) {
  const result = spawnSync(
    executable,
    [
      "-e",
      `const fs=require('node:fs');const input=JSON.parse(fs.readFileSync(0,'utf8'));require(process.argv[1]).compile(input.files,input.ids).then(c=>{if(!c.view||!c.worker)throw Error('Empty compile');console.log('Packaged compiler passed');}).catch(e=>{console.error(e.message);process.exitCode=1;});`,
      compiler,
    ],
    {
      input: JSON.stringify({
        files: c.files,
        ids: c.sources.map((s: any) => s.id),
      }),
      encoding: "utf8",
      env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
    },
  );
  if (result.status !== 0) throw Error(c.name + ": " + result.stderr);
  console.log(c.name + ": " + result.stdout.trim());
}
