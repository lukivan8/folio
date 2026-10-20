import { Menu, MenuItem, MenuButton } from "@carbon/react";
import { TextField } from "./components/ui/Fields";
import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, ReactNodeViewRenderer } from "@tiptap/react";
import { Node, mergeAttributes, type Editor } from "@tiptap/core";
import "./editor/editor.css";
import { textExtensions } from "./editor/extensions";
import {
  TextBold as Bold,
  TextItalic as Italic,
  TextUnderline as Underline,
  TextStrikethrough as Strikethrough,
  Heading as Heading1,
  Heading as Heading2,
  Heading as Heading3,
  ListBulleted as List,
  ListNumbered as ListOrdered,
  Task as ListTodo,
  Quotes as Quote,
  Subtract as Minus,
  Table as Table2,
  Link,
  Code,
  Undo as Undo2,
  Redo as Redo2,
  Add as Plus,
  ChartBar as BarChart3,
  Draggable as GripVertical,
  Copy,
  TrashCan as Trash2,
  TextFont as Type,
  ChevronDown,
  ArrowUp,
  ArrowDown,
} from "@carbon/react/icons";
import { relocateBlock } from "./block-order";
import { DataBlockView } from "./DataBlock";
import { newBlock, type Doc } from "./model";
import { useWorkspace } from "./workspace";
import { importCSV } from "./import";
import { IconButton, Modal, Button } from "./ui";
const DataNode = Node.create({
  name: "dataBlock",
  group: "block",
  atom: true,
  draggable: false,
  selectable: true,
  addAttributes() {
    return { id: { default: null } };
  },
  parseHTML() {
    return [{ tag: "div[data-folio-block]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-folio-block": "" })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(DataBlockView);
  },
});
const commands = [
  {
    title: "Text",
    hint: "A plain paragraph",
    icon: Type,
    run: (e: Editor) => e.chain().focus().setParagraph().run(),
  },
  {
    title: "Heading 1",
    hint: "Large section heading",
    icon: Heading1,
    run: (e: Editor) => e.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    title: "Heading 2",
    hint: "Medium section heading",
    icon: Heading2,
    run: (e: Editor) => e.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    title: "Heading 3",
    hint: "Small section heading",
    icon: Heading3,
    run: (e: Editor) => e.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    title: "Bullet list",
    hint: "A simple list",
    icon: List,
    run: (e: Editor) => e.chain().focus().toggleBulletList().run(),
  },
  {
    title: "Numbered list",
    hint: "A sequence of steps",
    icon: ListOrdered,
    run: (e: Editor) => e.chain().focus().toggleOrderedList().run(),
  },
  {
    title: "Checklist",
    hint: "Keep track of tasks",
    icon: ListTodo,
    run: (e: Editor) => e.chain().focus().toggleTaskList().run(),
  },
  {
    title: "Quote",
    hint: "Highlight a thought",
    icon: Quote,
    run: (e: Editor) => e.chain().focus().toggleBlockquote().run(),
  },
  {
    title: "Divider",
    hint: "A subtle separation",
    icon: Minus,
    run: (e: Editor) => e.chain().focus().setHorizontalRule().run(),
  },
  {
    title: "Table",
    hint: "An editable 3 × 3 table",
    icon: Table2,
    run: (e: Editor) =>
      e
        .chain()
        .focus()
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
  },
  {
    title: "Data block",
    hint: "CSV + interactive analysis",
    icon: BarChart3,
    run: (e: Editor, id?: string) =>
      e
        .chain()
        .focus()
        .insertContent([
          { type: "dataBlock", attrs: { id } },
          { type: "paragraph" },
        ])
        .run(),
  },
];
export function DocumentEditor({
  doc,
  onChange,
  onEditor,
}: {
  doc: Doc;
  onChange: (json: any) => void;
  onEditor: (e: Editor) => void;
}) {
  const w = useWorkspace();
  const current = useRef({ onChange, w });
  current.current = { onChange, w };
  const [slash, setSlash] = useState<{
    from: number;
    to: number;
    query: string;
  } | null>(null);
  const [insert, setInsert] = useState(false);
  const [selected, setSelected] = useState(0);
  const [blockMenu, setBlockMenu] = useState(false);
  const blockMenuAnchor = useRef<HTMLButtonElement>(null);
  const [gutter, setGutter] = useState({ pos: 0, top: 0 });
  const blockTarget = useRef<number | null>(null);
  const body = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    from: number;
    startY: number;
    boundary: number;
    moved: boolean;
  } | null>(null);
  const suppressClick = useRef(0);
  const [dropGuide, setDropGuide] = useState<number | null>(null);
  const [menuTop, setMenuTop] = useState(32);
  const [link, setLink] = useState<string | null>(null);
  const menuState = useRef({ slash, insert, selected });
  menuState.current = { slash, insert, selected };
  const editor = useEditor({
    extensions: [...textExtensions(), DataNode],
    content: doc.content,
    editable: !doc.readOnly,
    editorProps: {
      attributes: { class: "prose-editor", "aria-label": "Document content" },
      handleKeyDown: (_view, e) => {
        const s = menuState.current;
        if (s.slash || s.insert) {
          const filtered = commands.filter((c) =>
            c.title.toLowerCase().includes(s.slash?.query.toLowerCase() || ""),
          );
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setSelected(
              (v) =>
                (v + (e.key === "ArrowDown" ? 1 : -1) + filtered.length) %
                filtered.length,
            );
            return true;
          }
          if (e.key === "Escape") {
            setSlash(null);
            setInsert(false);
            return true;
          }
          if (e.key === "Enter" && filtered.length) {
            e.preventDefault();
            chooseRef.current(filtered[s.selected % filtered.length]);
            return true;
          }
        }
        return false;
      },
      handleDrop: (view, event) => {
        if (event.dataTransfer?.files.length) {
          const files = Array.from(event.dataTransfer.files);
          if (files.some((f) => /\.csv$|\.tsv$/i.test(f.name))) {
            event.preventDefault();
            const pos =
              view.posAtCoords({ left: event.clientX, top: event.clientY })
                ?.pos || view.state.doc.content.size;
            void (async () => {
              try {
                if (files.length > 5)
                  throw Error("A block supports at most five CSV sources.");
                const sources = await Promise.all(
                  files.map(async (f) =>
                    importCSV(new Uint8Array(await f.arrayBuffer()), f.name),
                  ),
                );
                const b = newBlock();
                b.sources = sources.map(
                  (source) =>
                    current.current.w.registerSource?.(source) || source,
                );
                current.current.w.updateBlock(b.id, b);
                view.dispatch(
                  view.state.tr.insert(
                    pos,
                    view.state.schema.nodes.dataBlock.create({ id: b.id }),
                  ),
                );

                current.current.w.notify(
                  "CSV attached to a new data block. Review its parsing in Sources.",
                );
              } catch (error) {
                current.current.w.notify((error as Error).message);
              }
            })();
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor: e }) => {
      current.current.onChange(e.getJSON());
      const { $from } = e.state.selection;
      const before = $from.parent.textBetween(0, $from.parentOffset);
      const match = before.match(/(?:^|\s)\/([^/]*)$/);
      if (match && match[1].length < 40) {
        setSlash({
          from: $from.pos - match[1].length - 1,
          to: $from.pos,
          query: match[1],
        });
        setSelected(0);
      } else setSlash(null);
    },
    onSelectionUpdate: ({ editor: e }) => {
      setBlockMenu(false);
      const { $from } = e.state.selection;
      const pos = $from.depth ? $from.before(1) : $from.pos;
      const dom = e.view.nodeDOM(pos);
      if (dom instanceof HTMLElement && body.current)
        setGutter({
          pos,
          top:
            (dom.querySelector(".data-header") || dom).getBoundingClientRect()
              .top - body.current.getBoundingClientRect().top,
        });
    },
  });
  const chooseRef = useRef<(c: (typeof commands)[number]) => void>(() => {});
  const choose = (c: (typeof commands)[number]) => {
    if (!editor) return;
    if (insert && blockTarget.current !== null) {
      const node = editor.state.doc.nodeAt(blockTarget.current);
      if (node) {
        const pos = blockTarget.current + node.nodeSize;
        editor
          .chain()
          .insertContentAt(pos, { type: "paragraph" })
          .setTextSelection(pos + 1)
          .run();
      }
    }
    if (slash)
      editor.chain().deleteRange({ from: slash.from, to: slash.to }).run();
    let id: string | undefined;
    if (c.title === "Data block") {
      const b = newBlock();
      id = b.id;
      current.current.w.updateBlock(b.id, b);
    }
    c.run(editor, id);
    setSlash(null);
    setInsert(false);
    setSelected(0);
    blockTarget.current = null;
  };
  chooseRef.current = choose;
  useEffect(() => {
    if (editor) onEditor(editor);
  }, [editor]);
  useEffect(() => {
    editor?.setEditable(!doc.readOnly);
  }, [doc.readOnly, editor]);
  useEffect(() => {
    if (!editor) return;
    const finish = () => {
      const state = drag.current;
      drag.current = null;
      setDropGuide(null);
      if (state?.moved) {
        suppressClick.current = Date.now();
        const tr = relocateBlock(editor.state, state.from, state.boundary);
        if (tr) editor.view.dispatch(tr);
        blockTarget.current = null;
      }
    };
    window.addEventListener("mouseup", finish, true);
    window.addEventListener("pointerup", finish, true);
    return () => {
      window.removeEventListener("mouseup", finish, true);
      window.removeEventListener("pointerup", finish, true);
    };
  }, [editor]);
  if (!editor) return null;
  const active = (name: string) => editor.isActive(name);
  const formatButtons = [
    {
      label: "Bold",
      icon: Bold,
      active: active("bold"),
      run: () => editor.chain().focus().toggleBold().run(),
    },
    {
      label: "Italic",
      icon: Italic,
      active: active("italic"),
      run: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: "Underline",
      icon: Underline,
      active: active("underline"),
      run: () => editor.chain().focus().toggleUnderline().run(),
    },
    {
      label: "Strikethrough",
      icon: Strikethrough,
      active: active("strike"),
      run: () => editor.chain().focus().toggleStrike().run(),
    },
    {
      label: "Inline code",
      icon: Code,
      active: active("code"),
      run: () => editor.chain().focus().toggleCode().run(),
    },
  ];
  function selectedBlock() {
    const { $from } = editor!.state.selection;
    let pos =
      blockTarget.current ?? ($from.depth ? $from.before(1) : $from.pos);
    let node = editor!.state.doc.nodeAt(pos);
    if (!node) {
      node = editor!.state.doc.lastChild!;
      pos = editor!.state.doc.content.size - node.nodeSize;
    }
    return { pos, node };
  }
  function duplicate() {
    const { pos, node } = selectedBlock();
    if (node.type.name === "dataBlock") {
      const id = w.duplicateBlock(node.attrs.id);
      editor!
        .chain()
        .insertContentAt(pos + node.nodeSize, {
          type: "dataBlock",
          attrs: { id },
        })
        .run();
    } else
      editor!
        .chain()
        .insertContentAt(pos + node.nodeSize, node.toJSON())
        .run();
    setBlockMenu(false);
  }
  function move(direction: number) {
    const { pos, node } = selectedBlock();
    const all: { pos: number; node: any }[] = [];
    editor!.state.doc.forEach((n, p) => all.push({ pos: p, node: n }));
    const idx = all.findIndex((n) => n.pos === pos);
    const target = all[idx + direction];
    if (!target) return;
    const tr = relocateBlock(
      editor!.state,
      pos,
      direction < 0 ? target.pos : target.pos + target.node.nodeSize,
    );
    if (tr) editor!.view.dispatch(tr);
    blockTarget.current = null;
    setBlockMenu(false);
  }
  function trackBlock(target: EventTarget | null) {
    if (!editor || !(target instanceof HTMLElement)) return;
    if (blockMenu || insert || drag.current) return;
    editor.state.doc.forEach((_node, pos) => {
      const dom = editor.view.nodeDOM(pos);
      if (
        dom instanceof HTMLElement &&
        (dom === target || dom.contains(target as globalThis.Node))
      ) {
        setGutter({
          pos,
          top:
            (dom.querySelector(".data-header") || dom).getBoundingClientRect()
              .top - body.current!.getBoundingClientRect().top,
        });
      }
    });
  }
  const filtered = commands.filter((c) =>
    c.title.toLowerCase().includes(slash?.query.toLowerCase() || ""),
  );
  return (
    <div className="editor-shell">
      <div
        className="format-toolbar"
        role="toolbar"
        aria-label="Document formatting"
      >
        <MenuButton
          className="text-style"
          label={editor.isActive("heading") ? "Heading" : "Text"}
          kind="ghost"
          size="sm"
          onClick={() => {
            blockTarget.current = null;
            setSlash(null);
            setInsert(false);
          }}
        >
          {commands.map((c) => (
            <MenuItem
              key={c.title}
              label={c.title}
              renderIcon={c.icon}
              onClick={() => choose(c)}
            />
          ))}
        </MenuButton>
        <span className="toolbar-divider" />
        {formatButtons.map((b) => (
          <span key={b.label} className={b.active ? "format-active" : ""}>
            <IconButton label={b.label} onClick={b.run} isSelected={b.active}>
              <b.icon size={16} />
            </IconButton>
          </span>
        ))}
        <IconButton
          label="Insert link"
          onClick={() => setLink(editor.getAttributes("link").href || "")}
        >
          <Link size={16} />
        </IconButton>
        <span className="toolbar-divider" />
        <IconButton
          label="Bullet list"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List size={20} />
        </IconButton>
        <IconButton
          label="Checklist"
          onClick={() => editor.chain().focus().toggleTaskList().run()}
        >
          <ListTodo size={16} />
        </IconButton>
        <span className="toolbar-divider" />
        <IconButton
          label="Undo"
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 size={16} />
        </IconButton>
        <IconButton
          label="Redo"
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 size={16} />
        </IconButton>
        <div className="toolbar-right">
          <IconButton
            label="Insert block"
            onClick={() => {
              setInsert(!insert);
              setSlash(null);
            }}
          >
            <Plus size={20} />
          </IconButton>
        </div>
      </div>
      <div
        className="editor-body"
        ref={body}
        onMouseMove={(event) => trackBlock(event.target)}
        onPointerOver={(event) => trackBlock(event.target)}
        onFocusCapture={(event) => trackBlock(event.target)}
      >
        <div
          className="block-controls"
          style={{
            top: gutter.top,
            display: doc.readOnly ? "none" : undefined,
          }}
        >
          <IconButton
            label="Insert block below"
            onClick={() => {
              blockTarget.current = gutter.pos;
              setMenuTop(gutter.top + 30);
              setSelected(0);
              setSlash(null);
              setInsert(!insert);
              editor.commands.focus();
            }}
          >
            <Plus size={16} />
          </IconButton>
          <div className="menu-anchor">
            <button
              className="block-drag-button"
              ref={blockMenuAnchor}
              title={`Block actions · ${(editor.state.doc.nodeAt(gutter.pos)?.type.name || "text").replace(/([A-Z])/g, " $1").toLowerCase()} · drag to move`}
              aria-label={`Block actions · ${(editor.state.doc.nodeAt(gutter.pos)?.type.name || "text").replace(/([A-Z])/g, " $1").toLowerCase()} · drag to move`}
              onPointerDown={(event) => {
                if (event.button !== 0 || doc.readOnly) return;
                drag.current = {
                  from: gutter.pos,
                  startY: event.clientY,
                  boundary: gutter.pos,
                  moved: false,
                };
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={(event) => {
                const state = drag.current;
                if (
                  !state ||
                  (Math.abs(event.clientY - state.startY) < 5 && !state.moved)
                )
                  return;
                state.moved = true;
                let boundary = editor.state.doc.content.size;
                let top = editor.view.dom.getBoundingClientRect().bottom;
                editor.state.doc.forEach((_node, pos) => {
                  const dom = editor.view.nodeDOM(pos);
                  if (!(dom instanceof HTMLElement)) return;
                  const rect = dom.getBoundingClientRect();
                  if (
                    event.clientY < rect.top + rect.height / 2 &&
                    boundary === editor.state.doc.content.size
                  ) {
                    boundary = pos;
                    top = rect.top;
                  }
                });
                state.boundary = boundary;
                setDropGuide(top - body.current!.getBoundingClientRect().top);
              }}
              onPointerUp={(event) => {
                if (event.currentTarget.hasPointerCapture(event.pointerId))
                  event.currentTarget.releasePointerCapture(event.pointerId);
              }}
              onPointerCancel={() => {
                drag.current = null;
                setDropGuide(null);
              }}
              onClick={() => {
                if (Date.now() - suppressClick.current < 200) return;
                suppressClick.current = 0;
                blockTarget.current = gutter.pos;
                setBlockMenu(!blockMenu);
              }}
            >
              <GripVertical size={16} />
            </button>
            <Menu
              open={blockMenu}
              label="Block actions"
              size="sm"
              x={blockMenuAnchor.current?.getBoundingClientRect().right || 0}
              y={blockMenuAnchor.current?.getBoundingClientRect().bottom || 0}
              onClose={() => setBlockMenu(false)}
            >
              <MenuItem
                label="Duplicate"
                renderIcon={Copy}
                onClick={duplicate}
              />
              <MenuItem
                label="Move up"
                renderIcon={ArrowUp}
                onClick={() => {
                  move(-1);
                  setBlockMenu(false);
                }}
              />
              <MenuItem
                label="Move down"
                renderIcon={ArrowDown}
                onClick={() => {
                  move(1);
                  setBlockMenu(false);
                }}
              />
              <MenuItem
                label="Delete"
                renderIcon={Trash2}
                kind="danger"
                onClick={() => {
                  const { pos, node } = selectedBlock();
                  editor
                    .chain()
                    .focus()
                    .deleteRange({ from: pos, to: pos + node.nodeSize })
                    .run();
                  setBlockMenu(false);
                }}
              />
            </Menu>
          </div>
        </div>
        {dropGuide !== null && (
          <div className="block-drop-guide" style={{ top: dropGuide }} />
        )}
        <EditorContent editor={editor} />
        {(slash || insert) && (
          <div
            id="folio-block-menu"
            className="slash-menu"
            style={{
              top: slash
                ? Math.max(
                    0,
                    editor.view.coordsAtPos(editor.state.selection.from)
                      .bottom -
                      (body.current?.getBoundingClientRect().top || 0),
                  ) + 8
                : menuTop,
            }}
            role="listbox"
            aria-label="Insert a block"
          >
            <li role="presentation" className="menu-caption">
              {slash ? "INSERT BLOCK" : "WRITE & INSERT"}
            </li>
            {filtered.length ? (
              filtered.map((c, i) => (
                <Button
                  size="lg"
                  className="command-option"
                  role="option"
                  aria-selected={selected === i}
                  key={c.title}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(c);
                  }}
                >
                  <span className="command-icon">
                    <c.icon size={20} />
                  </span>
                  <span>
                    <strong>{c.title}</strong>
                    <small>{c.hint}</small>
                  </span>
                </Button>
              ))
            ) : (
              <li role="presentation">No matching block types.</li>
            )}
          </div>
        )}
      </div>
      <Button
        renderIcon={Plus}
        className="insert-end"
        onClick={() => {
          editor.chain().focus("end").run();
          blockTarget.current = null;
          setMenuTop(body.current?.offsetHeight || 0);
          setSelected(0);
          setInsert(true);
        }}
      >
        Add a block<span>or type / anywhere on the page</span>
      </Button>
      {link !== null && (
        <Modal title="Insert link" onClose={() => setLink(null)}>
          <div className="inspector-content">
            <div>
              URL
              <TextField
                aria-label="URL"
                autoFocus
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://…"
              />
            </div>
            <div className="dialog-actions">
              <Button
                onClick={() => {
                  editor.chain().focus().unsetLink().run();
                  setLink(null);
                }}
              >
                Remove link
              </Button>
              <Button
                kind="primary"
                onClick={() => {
                  if (/^https?:\/\//i.test(link)) {
                    editor
                      .chain()
                      .focus()
                      .extendMarkRange("link")
                      .setLink({ href: link })
                      .run();
                    setLink(null);
                  } else
                    w.notify("Use a URL beginning with https:// or http://.");
                }}
              >
                Apply
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
