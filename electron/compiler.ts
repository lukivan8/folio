import type { Plugin } from "esbuild";
import { manifestSchema, type Files, type Compiled } from "../src/model";
import path from "node:path";
import { typecheck } from "./typecheck";
import { SDK_SOURCE } from "./sdk-source";
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire(
  typeof __filename === "string" ? __filename : import.meta.url,
);
const esbuildPackage = require.resolve(
  `@esbuild/${process.platform}-${process.arch}/package.json`,
);
process.env.ESBUILD_BINARY_PATH = path
  .join(
    path.dirname(esbuildPackage),
    "bin",
    process.platform === "win32" ? "esbuild.exe" : "esbuild",
  )
  .replace("app.asar/", "app.asar.unpacked/");
const { build } = require("esbuild") as typeof import("esbuild");
export async function compile(
  files: Files,
  sourceIds: string[],
): Promise<Compiled> {
  const manifest = manifestSchema.parse(files.manifest);
  if (manifest.sourceIds.some((id) => !sourceIds.includes(id)))
    throw Error("Artifact requests a source outside this block");
  for (const name of ["analysis", "view", "checks"] as const)
    if (typeof files[name] !== "string" || files[name].length > 500000)
      throw Error("Invalid or oversized artifact source");
  const virtual: Record<string, string> = {
    "analysis.ts": files.analysis,
    "view.tsx": files.view,
    "checks.ts": files.checks,
    "entry.tsx": `import React from 'react';import{createRoot}from'react-dom/client';import{View}from'./view';window.__render=(result,params,setParams)=>{window.__root??=createRoot(document.getElementById('artifact'));window.__root.render(React.createElement(View,{result,params,setParams}));};`,
    "sdk.ts": SDK_SOURCE,
    "worker.ts": `import{analyze}from'./analysis';import{checks}from'./checks';self.onmessage=async(e)=>{try{const requestId=e.data.requestId;const result=await analyze(e.data);result.checks=await checks(result,e.data);self.postMessage({result,requestId});}catch(e){self.postMessage({error:String(e?.message||e)});}};`,
  };
  const allowed = new Set([
    "react",
    "react/jsx-runtime",
    "react-dom/client",
    "recharts",
    "@carbon/charts-react",
    "@carbon/react",
    "@carbon/react/icons",
  ]);
  const plugin: Plugin = {
    name: "approved-block-imports",
    setup(b) {
      b.onResolve({ filter: /.*/ }, (args) => {
        if (args.path === "@folio/sdk")
          return { path: "sdk.ts", namespace: "block" };
        if (args.path in virtual)
          return { path: args.path, namespace: "block" };
        if (args.namespace === "block" && args.path.startsWith("./")) {
          const target = args.path.slice(2);
          const key = [target, target + ".ts", target + ".tsx"].find(
            (v) => v in virtual,
          );
          if (!key) throw Error("Unknown local import");
          return { path: key, namespace: "block" };
        }
        if (args.namespace === "block") {
          if (!allowed.has(args.path))
            throw Error(`Import is not approved: ${args.path}`);
          let resolved = require.resolve(args.path);
          if (args.path === "@carbon/react/icons")
            resolved = path.join(
              path.dirname(require.resolve("@carbon/react/package.json")),
              "icons/index.esm.js",
            );
          else if (args.path.startsWith("@carbon/")) {
            const packageFile = require.resolve(args.path + "/package.json");
            const metadata = JSON.parse(fs.readFileSync(packageFile, "utf8"));
            if (metadata.module)
              resolved = path.resolve(
                path.dirname(packageFile),
                metadata.module,
              );
          }
          return {
            path: resolved.replace("app.asar/", "app.asar.unpacked/"),
            namespace: "file",
          };
        }
        return undefined;
      });
      b.onLoad({ filter: /.*/, namespace: "block" }, (args) => ({
        contents: virtual[args.path],
        loader: args.path.endsWith("tsx") ? "tsx" : "ts",
        resolveDir: path.resolve("."),
      }));
    },
  };
  const run = async (entry: string) =>
    (
      await build({
        entryPoints: [entry],
        bundle: true,
        write: false,
        platform: "browser",
        format: "iife",
        target: "es2022",
        plugins: [plugin],
        tsconfigRaw: { compilerOptions: { verbatimModuleSyntax: true } },
        define: { "process.env.NODE_ENV": '"production"' },
        minify: true,
        logLevel: "silent",
      })
    ).outputFiles![0].text;
  typecheck(files);
  const [view, worker] = await Promise.all([
    run("entry.tsx"),
    run("worker.ts"),
  ]);
  return { view, worker };
}
