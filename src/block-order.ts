import type { EditorState, Transaction } from "@tiptap/pm/state";

/** Move a whole top-level block to a document boundary, preserving its content. */
export function relocateBlock(
  state: EditorState,
  from: number,
  boundary: number,
): Transaction | null {
  const positions: number[] = [];
  state.doc.forEach((_node, pos) => positions.push(pos));
  positions.push(state.doc.content.size);
  if (!positions.includes(from) || !positions.includes(boundary)) return null;
  const node = state.doc.nodeAt(from);
  if (!node || boundary === from || boundary === from + node.nodeSize)
    return null;
  const tr = state.tr.delete(from, from + node.nodeSize);
  return tr.insert(boundary > from ? boundary - node.nodeSize : boundary, node);
}
