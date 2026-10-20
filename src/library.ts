import { newBlock, uid, type Source, type DataBlock, type Doc } from "./model";
export type SharedSource = {
  id: string;
  source: Source;
  analysis: DataBlock;
  updated: string;
  diskVersion?: string;
};
export function sourceWorkspace(source: Source): SharedSource {
  const analysis = newBlock();
  analysis.title = source.name.replace(/\.(csv|tsv)$/i, "");
  analysis.sources = [structuredClone(source)];
  return {
    id: source.id,
    source: structuredClone(source),
    analysis,
    updated: new Date().toISOString(),
  };
}
/** Copy a finding without copying its conversation or rewriting source/revision identities. */
export function insertFinding(
  doc: Doc,
  analysis: DataBlock,
  narrative: string,
): Doc {
  const block = structuredClone(analysis);
  block.id = uid();
  block.messages = [];
  block.prompt = "";
  delete block.threadId;
  delete block.draft;
  const paragraph = {
    type: "paragraph",
    ...(narrative.trim()
      ? { content: [{ type: "text", text: narrative.trim() }] }
      : {}),
  };
  return {
    ...doc,
    updated: new Date().toISOString(),
    blocks: analysis.active ? { ...doc.blocks, [block.id]: block } : doc.blocks,
    content: {
      ...doc.content,
      content: [
        ...(doc.content.content || []),
        paragraph,
        ...(analysis.active
          ? [{ type: "dataBlock", attrs: { id: block.id } }]
          : []),
        { type: "paragraph" },
      ],
    },
  };
}
