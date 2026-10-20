import { test } from "node:test";
import assert from "node:assert/strict";
import { Schema } from "@tiptap/pm/model";
import { EditorState } from "@tiptap/pm/state";
import { relocateBlock } from "../src/block-order";
const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    text: { group: "inline" },
    paragraph: { group: "block", content: "inline*" },
    dataBlock: { group: "block", atom: true, attrs: { id: {} } },
  },
});
const paragraph = (text: string) =>
  schema.node("paragraph", null, schema.text(text));
const state = () =>
  EditorState.create({
    schema,
    doc: schema.node("doc", null, [
      paragraph("A"),
      schema.node("dataBlock", { id: "analysis" }),
      paragraph("B"),
    ]),
  });
test("paragraphs and data blocks move through the same ordered document", () => {
  const original = state();
  const tr = relocateBlock(original, 0, original.doc.content.size)!;
  const moved = original.apply(tr);
  assert.deepEqual(
    moved.doc.content.content.map((n) =>
      n.type.name === "dataBlock" ? n.attrs.id : n.textContent,
    ),
    ["analysis", "B", "A"],
  );
  const restored = moved.apply(relocateBlock(moved, 4, 0)!);
  assert.ok(restored.doc.eq(original.doc));
});
test("data identity survives reordering and invalid boundaries are ignored", () => {
  const original = state();
  const moved = original.apply(relocateBlock(original, 3, 0)!);
  assert.equal(moved.doc.firstChild?.attrs.id, "analysis");
  assert.equal(relocateBlock(original, 1, 0), null);
  assert.equal(relocateBlock(original, 0, 2), null);
  assert.equal(relocateBlock(original, 3, 4), null);
});
