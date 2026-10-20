import { build } from "esbuild";
await build({
  entryPoints: {
    main: "electron/main.ts",
    preload: "electron/preload.ts",
    compiler: "electron/compiler.ts",
  },
  outdir: "build-electron",
  outExtension: { ".js": ".cjs" },
  bundle: true,
  platform: "node",
  format: "cjs",
  external: ["electron", "esbuild", "@openai/codex", "typescript"],
  target: "node22",
  logLevel: "info",
});
