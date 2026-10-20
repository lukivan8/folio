import Papa from "papaparse";
import { LIMITS, uid, type Source, type Column } from "./model";
export async function parseCSV(
  bytes: Uint8Array,
  name: string,
  options: { delimiter?: string; header?: boolean; id?: string } = {},
): Promise<Source> {
  if (bytes.length > LIMITS.bytes)
    throw Error(
      "This file exceeds the 25 MiB limit. Split it into smaller CSV files.",
    );
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw Error(
      "Unsupported encoding. Export this CSV as UTF-8 and try again.",
    );
  }
  const parsed = Papa.parse<string[]>(text, {
    delimiter: options.delimiter || "",
    skipEmptyLines: true,
    delimitersToGuess: [",", ";", "\t"],
  });
  const errors = parsed.errors.filter(
    (e) => e.code !== "UndetectableDelimiter",
  );
  if (errors.length)
    throw Error(
      errors.map((e) => `Row ${(e.row ?? 0) + 1}: ${e.message}`).join("; "),
    );
  const data = parsed.data;
  const header = options.header ?? true;
  const width = data[0]?.length ?? 0;
  if (width > LIMITS.columns)
    throw Error("This file exceeds the 200-column limit.");
  const rows = header ? data.slice(1) : data;
  if (rows.length > LIMITS.rows)
    throw Error(
      "This file exceeds the 100,000-row limit. No rows have been imported.",
    );
  const ragged = rows
    .map((r, i) => (r.length !== width ? i + (header ? 2 : 1) : 0))
    .filter(Boolean);
  if (ragged.length)
    throw Error(
      `Inconsistent column count on ${ragged.length} rows (first: ${ragged.slice(0, 5).join(", ")}). No rows were discarded.`,
    );
  const warnings: string[] = [];
  const names = new Map<string, number>();
  const columns: Column[] = Array.from({ length: width }, (_, i) => {
    const original = header ? data[0][i] : "";
    let label = original.trim() || `Column ${i + 1}`;
    const n = names.get(label) || 0;
    names.set(label, n + 1);
    if (n) {
      warnings.push(
        `Duplicate header “${label}” assigned a distinct column ID.`,
      );
      label += ` (${n + 1})`;
    }
    const values = rows.map((r) => r[i]).filter((v) => v.trim() !== "");
    const identifier =
      /\b(id|code|zip|phone|sku)\b/i.test(original) ||
      values.some((v) => /^0\d/.test(v));
    const type: Column["type"] =
      !identifier &&
      values.length &&
      values.every((v) => /^-?(?:\d+\.?\d*|\.\d+)$/.test(v))
        ? "number"
        : values.length && values.every((v) => /^\d{4}-\d{2}-\d{2}$/.test(v))
          ? "date"
          : "text";
    if (values.some((v) => /^\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}$/.test(v)))
      warnings.push(`“${label}” contains ambiguous dates; retained as text.`);
    return { id: `c${i}`, original, label, type, missing: [""] };
  });
  const hash = Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new Uint8Array(bytes)),
    ),
  )
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return {
    id: options.id || uid(),
    revision: uid(),
    name: name.replace(/[\x00-\x1f/\\]/g, "_"),
    imported: new Date().toISOString(),
    hash,
    bytes: bytes.length,
    original: btoa(binary),
    text,
    delimiter: parsed.meta.delimiter || ",",
    header,
    columns,
    rows,
    warnings,
    confirmed: false,
  };
}
