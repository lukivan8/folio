import { z } from "zod";
export const uid = () => crypto.randomUUID();
export const LIMITS = {
  bytes: 25 * 1024 * 1024,
  rows: 100000,
  columns: 200,
  sources: 5,
};
export type Column = {
  id: string;
  original: string;
  label: string;
  type: "text" | "number" | "date";
  missing: string[];
};
export type Source = {
  id: string;
  revision: string;
  name: string;
  imported: string;
  hash: string;
  bytes: number;
  original: string;
  text: string;
  delimiter: string;
  header: boolean;
  columns: Column[];
  rows: string[][];
  warnings: string[];
  confirmed: boolean;
};
export const manifestSchema = z.object({
  version: z.literal(1),
  blockId: z.string().optional(),
  revisionId: z.string().optional(),
  sourceRevisions: z.record(z.string(), z.string()).optional(),
  entryPoints: z
    .object({ analysis: z.string(), view: z.string(), checks: z.string() })
    .optional(),
  extensions: z.record(z.string(), z.unknown()).optional(),
  title: z.string().min(1),
  sourceIds: z.array(z.string()).min(1),
  parameters: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      type: z.enum(["string", "number", "boolean"]),
      default: z.union([z.string(), z.number(), z.boolean()]),
      options: z.array(z.string()).optional(),
      min: z.number().optional(),
      max: z.number().optional(),
    }),
  ),
  methods: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        description: z.string(),
        columns: z.array(z.string()),
        formula: z.string(),
        units: z.string(),
        missing: z.string(),
        assumptions: z.string(),
        outputs: z.array(z.string()),
      }),
    )
    .min(1),
});
export type Manifest = z.infer<typeof manifestSchema>;
export type Table = {
  columns: string[];
  rows: (string | number | boolean | null)[][];
  methodId: string;
  units?: string;
};
export type Result = {
  datasets: Record<string, Table>;
  inputRows: number;
  includedRows: number;
  excludedRows: number;
  warnings: string[];
  checks: { name: string; passed: boolean }[];
};
export type Files = {
  manifest: Manifest;
  analysis: string;
  view: string;
  checks: string;
};
export type Revision = {
  id: string;
  created: string;
  files: Files;
  sourceRefs: string[];
  sources: Source[];
  params: Record<string, unknown>;
  result: Result;
  run: { duration: number; hash: string; runtime: string };
  compiled?: Compiled;
};
export type Compiled = { view: string; worker: string };
export type Message = { role: "user" | "assistant"; text: string; at: string };
export type DataBlock = {
  id: string;
  title: string;
  sources: Source[];
  revisions: Revision[];
  active?: string;
  params: Record<string, unknown>;
  prompt: string;
  messages: Message[];
  threadId?: string;
  draft?: { files?: Files; sources?: Source[]; error: string; at: string };
  state?: string;
};
export type Doc = {
  version: 1;
  id: string;
  title: string;
  created: string;
  updated: string;
  content: any;
  blocks: Record<string, DataBlock>;
  trashed?: boolean;
  diskVersion?: string;
  readOnly?: boolean;
};
export type Summary = Pick<Doc, "id" | "title" | "updated" | "trashed">;
export function newBlock(): DataBlock {
  return {
    id: uid(),
    title: "Untitled analysis",
    sources: [],
    revisions: [],
    params: {},
    prompt: "",
    messages: [],
  };
}
export function validateParams(
  manifest: Manifest,
  params: Record<string, unknown>,
) {
  const out: Record<string, unknown> = {};
  for (const p of manifest.parameters) {
    const v = params[p.id] ?? p.default;
    if (typeof v !== p.type) throw Error(`Invalid ${p.label}`);
    if (p.options && !p.options.includes(v as string))
      throw Error(`Unknown ${p.label}`);
    if (
      typeof v === "number" &&
      (!Number.isFinite(v) ||
        (p.min !== undefined && v < p.min) ||
        (p.max !== undefined && v > p.max))
    )
      throw Error(`Out-of-range ${p.label}`);
    out[p.id] = v;
  }
  if (JSON.stringify(out).length > 1024 * 1024)
    throw Error("State exceeds 1 MiB");
  return out;
}
export function validateResult(
  result: Result,
  files: Files,
  sources: Source[],
) {
  if (!result || !result.datasets || !Array.isArray(result.checks))
    throw Error("Missing result datasets or analytical checks");
  if (
    [result.inputRows, result.includedRows, result.excludedRows].some(
      (n) => !Number.isSafeInteger(n) || n < 0,
    ) ||
    !Array.isArray(result.warnings) ||
    result.warnings.some((w) => typeof w !== "string") ||
    !Object.keys(result.datasets).length
  )
    throw Error("Invalid result schema or row counts");
  const count = sources
    .filter((s) => files.manifest.sourceIds.includes(s.id))
    .reduce((n, s) => n + s.rows.length, 0);
  if (
    result.inputRows !== count ||
    result.includedRows + result.excludedRows !== count
  )
    throw Error("Source row accounting failed");
  if (
    !result.checks.length ||
    result.checks.some(
      (c) => c.passed !== true || typeof c.name !== "string" || !c.name.trim(),
    )
  )
    throw Error("Analytical checks failed");
  for (const [id, t] of Object.entries(result.datasets)) {
    if (
      !files.manifest.methods.some(
        (m) => m.id === t.methodId && m.outputs.includes(id),
      )
    )
      throw Error("Result has no matching methodology step");
    if (
      !Array.isArray(t.columns) ||
      t.columns.some((c) => typeof c !== "string") ||
      !Array.isArray(t.rows) ||
      t.rows.some(
        (r) =>
          !Array.isArray(r) ||
          r.length !== t.columns.length ||
          r.some(
            (v) =>
              (v !== null &&
                !["string", "number", "boolean"].includes(typeof v)) ||
              (typeof v === "number" && !Number.isFinite(v)),
          ),
      )
    )
      throw Error("Invalid result table");
  }
  return result;
}
export const activeRevision = (b: DataBlock) =>
  b.revisions.find((r) => r.id === b.active);
export function safeCSV(table: Table, raw = false) {
  return [table.columns, ...table.rows]
    .map((r) =>
      r
        .map((v) => {
          let s = String(v ?? "");
          if (!raw && /^[\s]*[=+@-]/.test(s)) s = "'" + s;
          return '"' + s.replaceAll('"', '""') + '"';
        })
        .join(","),
    )
    .join("\r\n");
}
export function duplicateDoc(doc: Doc): Doc {
  const copy = structuredClone(doc);
  copy.id = uid();
  copy.title += " (copy)";
  copy.created = copy.updated = new Date().toISOString();
  delete copy.diskVersion;
  delete copy.readOnly;
  const ids: Record<string, string> = {};
  copy.blocks = Object.fromEntries(
    Object.values(copy.blocks).map((b) => {
      const old = b.id;
      b.id = uid();
      ids[old] = b.id;
      delete b.threadId;
      return [b.id, b];
    }),
  );
  const visit = (n: any) => {
    if (n.type === "dataBlock") n.attrs.id = ids[n.attrs.id];
    n.content?.forEach(visit);
  };
  visit(copy.content);
  return copy;
}
