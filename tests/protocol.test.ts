import { test } from "node:test";
import assert from "node:assert/strict";
import { CodexAdapter } from "../electron/codex";
import { parseCSV } from "../src/csv";
test("dynamic source tools refuse sibling sources and late completion cannot resolve a new turn", async () => {
  const s = await parseCSV(new TextEncoder().encode("id,n\n001,4"), "x.csv");
  const b = {
    id: "block",
    title: "Data",
    sources: [s],
    revisions: [],
    params: {},
    prompt: "",
    messages: [],
  };
  const adapter = new CodexAdapter("/tmp/folio-protocol-test-no-files");
  const sent: any[] = [];
  adapter.send = (m) => {
    sent.push(m);
  };
  let completions = 0;
  adapter.running = {
    threadId: "thread",
    turnId: "new-turn",
    cancelled: false,
    block: b,
    text: "",
    resolve: () => {
      completions++;
    },
    reject: () => {
      completions++;
    },
  };
  adapter.handle({
    id: 1,
    method: "item/tool/call",
    params: {
      tool: "read_source",
      arguments: { sourceId: "other-block-source", offset: 0, limit: 1 },
    },
  });
  assert(sent[0].error);
  adapter.handle({
    id: 2,
    method: "item/tool/call",
    params: {
      tool: "read_source",
      arguments: { sourceId: s.id, offset: 0, limit: 1 },
    },
  });
  assert(sent[1].result.success);
  assert(sent[1].result.contentItems[0].text.includes("001"));
  adapter.handle({
    method: "turn/completed",
    params: {
      threadId: "thread",
      turn: { id: "old-turn", status: "completed" },
    },
  });
  assert.equal(completions, 0);
  assert(adapter.running);
  adapter.running.cancelled = true;
  adapter.handle({
    method: "turn/completed",
    params: {
      threadId: "thread",
      turn: { id: "new-turn", status: "completed" },
    },
  });
  assert.equal(completions, 0);
});
