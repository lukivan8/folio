import type { SharedSource } from "./library";
import type { Doc, Summary, Files, Compiled, DataBlock } from "./model";
export type Bridge = {
  listSources: () => Promise<SharedSource[]>;
  saveSource: (source: SharedSource) => Promise<string>;
  runtime: (html: string) => Promise<string>;
  disposeRuntime: (url: string) => Promise<void>;
  list: () => Promise<Summary[]>;
  load: (id: string) => Promise<Doc>;
  save: (doc: Doc) => Promise<string>;
  openFolder: () => Promise<Doc | null>;
  reveal: (id: string) => Promise<unknown>;
  exportCopy: (id: string) => Promise<string | false>;
  compile: (files: Files, ids: string[]) => Promise<Compiled>;
  account: () => Promise<{ connected: boolean; type?: string; plan?: string }>;
  login: () => Promise<unknown>;
  generate: (
    block: DataBlock,
    prompt: string,
  ) => Promise<{
    files?: Files;
    clarification?: boolean;
    reply: string;
    threadId: string;
  }>;
  cancel: () => Promise<unknown>;
  onEvent: (cb: (v: any) => void) => () => void;
};
declare global {
  interface Window {
    folio?: Bridge;
  }
}
export const desktop = !!window.folio;
const read = (): Record<string, Doc> =>
  JSON.parse(localStorage.getItem("folio-preview-v1") || "{}");
export const bridge: Bridge = window.folio || {
  listSources: async () =>
    JSON.parse(localStorage.getItem("folio-source-library-v1") || "[]"),
  saveSource: async (source) => {
    const records: SharedSource[] = JSON.parse(
      localStorage.getItem("folio-source-library-v1") || "[]",
    );
    localStorage.setItem(
      "folio-source-library-v1",
      JSON.stringify([...records.filter((r) => r.id !== source.id), source]),
    );
    return "browser";
  },
  runtime: async () => "",
  disposeRuntime: async () => {},
  list: async () =>
    Object.values(read()).map(({ id, title, updated, trashed }) => ({
      id,
      title,
      updated,
      trashed,
    })),
  load: async (id) => read()[id],
  save: async (doc) => {
    const docs = read();
    docs[doc.id] = doc;
    localStorage.setItem("folio-preview-v1", JSON.stringify(docs));
    return "browser";
  },
  openFolder: async () => {
    throw Error("Open the Folio desktop app to open a local document folder.");
  },
  reveal: async () => {
    throw Error("Use the desktop app to reveal document files.");
  },
  exportCopy: async () => {
    throw Error("Use the desktop app to export a portable document folder.");
  },
  compile: async () => {
    throw Error("Run the desktop app for the trusted artifact compiler.");
  },
  account: async () => ({ connected: false }),
  login: async () => {
    throw Error("Open the desktop app to connect ChatGPT.");
  },
  generate: async () => {
    throw Error(
      "AI generation is available in the desktop app. Your prompt is saved.",
    );
  },
  cancel: async () => {},
  onEvent: () => () => {},
};
