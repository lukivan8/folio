import ts from "typescript";
import path from "node:path";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import type { Files } from "../src/model";
import { SDK_SOURCE } from "./sdk-source";
const require = createRequire(
  typeof __filename === "string" ? __filename : import.meta.url,
);
export function typecheck(files: Files) {
  const nativeLib = path.dirname(require.resolve("typescript"));
  const resourcePath = (process as NodeJS.Process & { resourcesPath?: string })
    .resourcesPath;
  const libRoot = existsSync(path.join(nativeLib, "lib.es2022.full.d.ts"))
    ? nativeLib
    : path.join(resourcePath || ".", "folio-types", "typescript");
  if (!existsSync(path.join(libRoot, "lib.es2022.full.d.ts")))
    throw Error(
      "Bundled TypeScript standard libraries are missing. Reinstall this application build.",
    );
  const modules = path.resolve(
    path.dirname(require.resolve("react/package.json")),
    "..",
  );
  const root = path.join(modules, "..", "__folio_candidate__");
  const sources: Record<string, string> = {};
  for (const [name, source] of Object.entries({
    "analysis.ts": files.analysis,
    "view.tsx": files.view,
    "checks.ts": files.checks,
    "sdk.ts": SDK_SOURCE,
  }))
    sources[path.join(root, name)] = source;
  const allowed = new Set([
    "react",
    "react/jsx-runtime",
    "react-dom/client",
    "recharts",
    "@carbon/charts-react",
    "@carbon/react",
    "@carbon/react/icons",
    "./analysis",
    "./checks",
    "./view",
    "@folio/sdk",
  ]);
  for (const [name, source] of Object.entries(sources)) {
    const file = ts.createSourceFile(
      name,
      source,
      ts.ScriptTarget.ES2022,
      true,
    );
    const visit = (node: ts.Node) => {
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier) &&
        !allowed.has(node.moduleSpecifier.text)
      )
        throw Error("Import is not approved: " + node.moduleSpecifier.text);
      if (
        ts.isCallExpression(node) &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          (ts.isIdentifier(node.expression) &&
            node.expression.text === "require"))
      )
        throw Error("Dynamic imports and require are not approved");
      ts.forEachChild(node, visit);
    };
    visit(file);
  }
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX,
    noEmit: true,
    skipLibCheck: true,
    strict: false,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    types: [],
  };
  const host = ts.createCompilerHost(options);
  const originalRead = host.readFile.bind(host);
  const originalExists = host.fileExists.bind(host);
  const originalGet = host.getSourceFile.bind(host);
  host.getDefaultLibFileName = () => path.join(libRoot, "lib.es2022.full.d.ts");
  host.getDefaultLibLocation = () => libRoot;
  const approved = (p: string) =>
    path.resolve(p).startsWith(modules + path.sep) ||
    path.resolve(p).startsWith(libRoot + path.sep);
  host.fileExists = (p) => p in sources || (approved(p) && originalExists(p));
  host.readFile = (p) =>
    sources[p] ?? (approved(p) ? originalRead(p) : undefined);
  host.getSourceFile = (p, version) => {
    const text = host.readFile(p);
    return text === undefined
      ? undefined
      : ts.createSourceFile(p, text, version, true);
  };
  host.resolveModuleNames = (names, containing) =>
    names.map((name) => {
      if (name === "@folio/sdk")
        return {
          resolvedFileName: path.join(root, "sdk.ts"),
          isExternalLibraryImport: false,
        };
      if (name.startsWith("./")) {
        const base = path.resolve(path.dirname(containing), name);
        for (const ext of ["", ".ts", ".tsx"])
          if (base + ext in sources)
            return {
              resolvedFileName: base + ext,
              isExternalLibraryImport: false,
            };
      }
      return ts.resolveModuleName(name, containing, options, host)
        .resolvedModule;
    });
  const program = ts.createProgram(Object.keys(sources), options, host);
  const diagnostics = ts
    .getPreEmitDiagnostics(program)
    .filter((d) => !!d.file && d.file.fileName in sources);
  if (diagnostics.length)
    throw Error(
      diagnostics
        .slice(0, 10)
        .map(
          (d) =>
            `${path.basename(d.file!.fileName)}:${d.file!.getLineAndCharacterOfPosition(d.start || 0).line + 1}: ${ts.flattenDiagnosticMessageText(d.messageText, " ")}`,
        )
        .join("\n"),
    );
}
