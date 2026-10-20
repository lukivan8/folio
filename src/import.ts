import type { Source } from "./model";
export function importCSV(
  bytes: Uint8Array,
  name: string,
  options: Record<string, unknown> = {},
): Promise<Source> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./csv.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (e) => {
      worker.terminate();
      e.data.error ? reject(Error(e.data.error)) : resolve(e.data.source);
    };
    worker.onerror = (e) => {
      worker.terminate();
      reject(Error(e.message));
    };
    worker.postMessage({ bytes, name, options });
  });
}
