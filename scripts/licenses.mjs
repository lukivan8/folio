import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
const r = spawnSync("npm", ["ls", "--omit=dev", "--all", "--long", "--json"], {
  encoding: "utf8",
  maxBuffer: 20 * 1024 * 1024,
});
const tree = JSON.parse(r.stdout);
const packages = new Map();
async function visit(node) {
  if (node.path && node.name) {
    try {
      const p = JSON.parse(
        await fs.readFile(path.join(node.path, "package.json"), "utf8"),
      );
      packages.set(p.name + "@" + p.version, {
        name: p.name,
        version: p.version,
        license: p.license || p.licenses || "SEE PACKAGE LICENSE",
        root: node.path,
      });
    } catch {}
  }
  for (const child of Object.values(node.dependencies || {}))
    await visit(child);
}
await visit(tree);
const folder = "docs/third-party-licenses";
await fs.mkdir(folder, { recursive: true });
const report = [];
for (const p of [...packages.values()].sort((a, b) =>
  a.name.localeCompare(b.name),
)) {
  if (p.name === "folio-local") continue;
  const files = (await fs.readdir(p.root)).filter((n) =>
    /^(licen[sc]e|copying|notice)([._-]|$)/i.test(n),
  );
  const notices = [];
  for (const n of files) {
    const source = path.join(p.root, n);
    if (!(await fs.stat(source)).isFile()) continue;
    const target = p.name.replaceAll("/", "__") + "-" + p.version + "-" + n;
    await fs.copyFile(source, path.join(folder, target));
    notices.push(target);
  }
  report.push({
    name: p.name,
    version: p.version,
    license: p.license,
    notices,
  });
}
await fs.writeFile(
  "docs/dependency-licenses.json",
  JSON.stringify(report, null, 2) + "\n",
);
await fs.writeFile(
  "docs/DEPENDENCIES.md",
  "# Runtime dependency licenses\n\nGenerated from the locked production dependency tree. Original available notices are preserved in `third-party-licenses/`. Electron also includes its Chromium notices inside the app bundle. This inventory is not a legal opinion.\n\n| Package | Version | License |\n|---|---|---|\n" +
    report
      .map(
        (p) =>
          `| ${p.name} | ${p.version} | ${typeof p.license === "string" ? p.license : JSON.stringify(p.license)} |`,
      )
      .join("\n") +
    "\n\nThe Folio book mark retains its original ISC-licensed geometry; see `third-party-licenses/folio-book-mark-ISC-LICENSE`.\n",
);
console.log(`Recorded ${report.length} runtime dependency licenses.`);
