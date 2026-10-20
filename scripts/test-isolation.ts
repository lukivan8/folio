import { CodexAdapter } from "../electron/codex";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
const root = await fs.mkdtemp(path.join(os.tmpdir(), "folio-boundary-"));
const codex = new CodexAdapter(path.join(root, "approved"));
try {
  await codex.start();
  const inside = path.join(codex.cwd, "inside.txt");
  const outside = path.join(root, "outside.txt");
  await fs.writeFile(inside, "APPROVED");
  await fs.writeFile(outside, "FORBIDDEN_CANARY");
  for (const [name, command] of [
    ["approved read", ["/bin/cat", inside]],
    ["unapproved read", ["/bin/cat", outside]],
    ["network", ["/usr/bin/curl", "--max-time", "3", "https://example.com"]],
  ] as const) {
    const r = await codex.request("command/exec", {
      command: [...command],
      cwd: codex.cwd,
      permissionProfile: "folio",
      timeoutMs: 5000,
    });
    const output = JSON.stringify(r);
    if (name === "approved read" && !output.includes("APPROVED"))
      throw Error("Approved read denied");
    if (name === "unapproved read" && output.includes("FORBIDDEN_CANARY"))
      throw Error("Filesystem boundary failed");
    if (name === "network" && r.exitCode === 0)
      throw Error("Network boundary failed");
    console.log(
      name + ": " + (name === "approved read" ? "allowed" : "denied"),
    );
  }
} finally {
  codex.stop();
  await fs.rm(root, { recursive: true, force: true });
}
