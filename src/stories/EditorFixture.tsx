import { useState } from "react";
import { DocumentEditor } from "../Editor";
import { WorkspaceContext } from "../workspace";
import { emptyDoc } from "../welcome";
import { newBlock, uid, type Doc } from "../model";

export type EditorFixtureProps = {
  content: Doc["content"];
  readOnly?: boolean;
  width?: number;
  data?: boolean;
};
/** The production editor with an in-memory workspace; never reads user documents. */
function EditorSession({
  content,
  readOnly = false,
  width = 760,
  data = false,
}: EditorFixtureProps) {
  const [doc, setDoc] = useState<Doc>(() => {
    const base = emptyDoc();
    const block = newBlock();
    return {
      ...base,
      readOnly,
      content: data
        ? {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "Write first. Add other blocks as they become useful.",
                  },
                ],
              },
              { type: "dataBlock", attrs: { id: block.id } },
              { type: "paragraph" },
            ],
          }
        : content,
      blocks: data ? { [block.id]: block } : {},
    };
  });
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div style={{ width: "100%", maxWidth: width, padding: "32px 48px" }}>
      <WorkspaceContext.Provider
        value={{
          blocks: doc.blocks,
          readOnly,
          docId: doc.id,
          expanded,
          setExpanded,
          updateBlock: (id, patch) =>
            setDoc((d) => ({
              ...d,
              blocks: {
                ...d.blocks,
                [id]:
                  typeof patch === "function"
                    ? patch(d.blocks[id])
                    : { ...d.blocks[id], ...patch },
              },
            })),
          duplicateBlock: (id) => {
            const next = uid();
            setDoc((d) => ({
              ...d,
              blocks: {
                ...d.blocks,
                [next]: {
                  ...structuredClone(d.blocks[id]),
                  id: next,
                  threadId: undefined,
                },
              },
            }));
            return next;
          },
          notify: () => {},
        }}
      >
        <DocumentEditor
          doc={{ ...doc, readOnly }}
          onChange={(content) => setDoc((d) => ({ ...d, content }))}
          onEditor={() => {}}
        />
      </WorkspaceContext.Provider>
    </div>
  );
}

export function EditorFixture(props: EditorFixtureProps) {
  return (
    <EditorSession
      key={JSON.stringify({ content: props.content, data: props.data })}
      {...props}
    />
  );
}
