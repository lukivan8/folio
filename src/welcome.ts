import { uid, type Doc } from "./model";
export function emptyDoc(): Doc {
  const now = new Date().toISOString();
  return {
    version: 1,
    id: uid(),
    title: "Untitled document",
    created: now,
    updated: now,
    content: { type: "doc", content: [{ type: "paragraph" }] },
    blocks: {},
  };
}
