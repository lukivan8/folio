import { BrandMark } from "./components/BrandMark";
import { Notice } from "./components/ui/Notice";
import {
  SideNavItems,
  SideNavLink,
  Search as CarbonSearch,
  OverflowMenu,
  OverflowMenuItem,
  ContentSwitcher,
  Switch,
  ToastNotification,
  InlineLoading,
} from "@carbon/react";
import { SelectItem } from "@carbon/react";
import { TextField, SelectField, TextAreaField } from "./components/ui/Fields";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import {
  Document as FileText,
  Add as Plus,
  Search,
  SidePanelClose as PanelLeftClose,
  SidePanelOpen as PanelLeftOpen,
  FolderOpen,
  Settings,
  TrashCan as Trash2,
  OverflowMenuHorizontal as MoreHorizontal,
  Copy,
  Download,
  Undo as RotateCcw,
  Checkmark as Check,
  CloudOffline as CloudOff,
  ChevronRight,
  Book as BookOpen,
  ArrowUpRight,
  Watson as Flower2,
  AiGenerate as Sparkles,
  Security as ShieldCheck,
  Keyboard,
  Information as Info,
  DataBase as Database,
  SidePanelOpen as PanelRightOpen,
  SidePanelClose as PanelRightClose,
  Maximize as Maximize2,
  Chat as MessageSquare,
  Close as X,
} from "@carbon/react/icons";
import { bridge, desktop } from "./bridge";
import {
  type Doc,
  type Summary,
  type DataBlock,
  uid,
  duplicateDoc,
  activeRevision,
  LIMITS,
  type Source,
} from "./model";
import { AnalysisBlock } from "./DataBlock";
import { SourcesPanel } from "./Inspectors";
import { importCSV } from "./import";
import { insertFinding, type SharedSource } from "./library";
import { useSourceLibrary } from "./workspace/useSourceLibrary";
import { PaneDivider } from "./workspace/PaneDivider";
import "./workspace/workspace.css";
import { emptyDoc } from "./welcome";
import { DocumentEditor } from "./Editor";
import { WorkspaceContext } from "./workspace";
import { Badge, Button, IconButton, Modal } from "./ui";
export default function App() {
  const [rightOverlays, setRightOverlays] = useState(
    () => window.matchMedia("(max-width:1056px)").matches,
  );
  useEffect(() => {
    const query = window.matchMedia("(max-width:1056px)");
    const update = () => setRightOverlays(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const [docs, setDocs] = useState<Summary[]>([]);
  const [doc, setDoc] = useState<Doc | null>(null);
  const [editorEpoch, setEditorEpoch] = useState(0);
  const committingFinding = useRef(false);
  const [sidebar, setSidebar] = useState(
    () => localStorage.getItem("folio-navigation-open") !== "false",
  );
  const [search, setSearch] = useState("");
  const [trash, setTrash] = useState(false);
  const [saveStatus, setSaveStatus] = useState("Saved locally");
  const [toast, setToast] = useState("");
  const [settings, setSettings] = useState(false);
  const [account, setAccount] = useState<{ connected: boolean; plan?: string }>(
    { connected: false },
  );
  const [accountError, setAccountError] = useState("");
  const [connecting, setConnecting] = useState(false);
  type Context = { kind: "doc" | "source"; owner: string; block: string };
  const [context, setContext] = useState<Context | null>(() => {
    try {
      return JSON.parse(
        localStorage.getItem("folio-assistant-context") || "null",
      );
    } catch {
      return null;
    }
  });
  const [surface, setSurface] = useState<{
    kind: "doc" | "source";
    id: string;
  }>({ kind: "doc", id: "" });
  const [paneMode, setPaneMode] = useState<"assistant" | "focus">(() =>
    localStorage.getItem("folio-pane-mode") === "focus" ? "focus" : "assistant",
  );
  const [rightOpen, setRightOpen] = useState(
    () => localStorage.getItem("folio-right-open") !== "false",
  );
  const [centerOpen, setCenterOpen] = useState(
    () => localStorage.getItem("folio-center-open") !== "false",
  );
  const [navWidth, setNavWidth] = useState(
    () => Number(localStorage.getItem("folio-nav-width")) || 260,
  );
  const [rightWidth, setRightWidth] = useState(
    () => Number(localStorage.getItem("folio-right-width")) || 420,
  );
  const [assistantHost, setAssistantHost] = useState<HTMLDivElement | null>(
    null,
  );
  const [focusHost, setFocusHost] = useState<HTMLDivElement | null>(null);
  const [sourceTab, setSourceTab] = useState(
    () => localStorage.getItem("folio-source-tab") || "Data",
  );
  const [adding, setAdding] = useState<DataBlock | null>(null);
  const [targetDocument, setTargetDocument] = useState("new");
  const [finding, setFinding] = useState("");
  const [newTitle, setNewTitle] = useState("Research notes");
  const [importingSource, setImportingSource] = useState(false);
  const sourceInput = useRef<HTMLInputElement>(null);
  const replacingSource = useRef<string | undefined>(undefined);
  useEffect(() => {
    const input = sourceInput.current;
    const cancelled = () => {
      replacingSource.current = undefined;
    };
    input?.addEventListener("cancel", cancelled);
    return () => input?.removeEventListener("cancel", cancelled);
  }, []);
  const restoredSurface = useRef(false);
  const [help, setHelp] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const docRef = useRef<Doc | null>(null);
  const revision = useRef(0);
  const saved = useRef(0);
  const diskVersion = useRef<string | undefined>(undefined);
  const saving = useRef<Promise<void> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const editorRef = useRef<Editor | null>(null);
  const notify = useCallback((s: string) => setToast(s), []);
  const library = useSourceLibrary(notify);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(t);
  }, [toast]);
  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    if (saving.current) {
      await saving.current;
      return;
    }
    if (
      !docRef.current ||
      saved.current === revision.current ||
      docRef.current.readOnly
    )
      return;
    saving.current = (async () => {
      while (
        docRef.current &&
        saved.current !== revision.current &&
        !docRef.current.readOnly
      ) {
        const version = revision.current;
        const snapshot = {
          ...docRef.current,
          diskVersion: diskVersion.current,
        };
        try {
          const next = await bridge.save(snapshot);
          if (docRef.current.id !== snapshot.id) return;
          diskVersion.current = next;
          docRef.current.diskVersion = next;
          saved.current = version;
          setSaveStatus(desktop ? "Saved locally" : "Saved in browser");
          setSaveError(false);
          setDocs((v) =>
            [
              ...v.filter((d) => d.id !== snapshot.id),
              {
                id: snapshot.id,
                title: snapshot.title,
                updated: snapshot.updated,
                trashed: snapshot.trashed,
              },
            ].sort((a, b) => b.updated.localeCompare(a.updated)),
          );
        } catch (e) {
          setSaveStatus("Not saved");
          setSaveError(true);
          notify((e as Error).message);
          break;
        }
      }
    })().finally(() => {
      saving.current = null;
    });
    await saving.current;
  }, [notify]);
  const mutate = useCallback(
    (fn: (d: Doc) => Doc) => {
      if (!docRef.current || docRef.current.readOnly) return;
      const next = fn(docRef.current);
      next.updated = new Date().toISOString();
      docRef.current = next;
      setDoc(next);
      revision.current++;
      setSaveStatus("Saving…");
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), 500);
    },
    [flush],
  );
  const activate = useCallback(
    async (next: Doc, isNew = false) => {
      await flush();
      docRef.current = next;
      diskVersion.current = next.diskVersion;
      revision.current = isNew ? 1 : 0;
      saved.current = 0;
      setDoc(next);
      setEditorEpoch((v) => v + 1);
      setSurface({ kind: "doc", id: next.id });
      setCenterOpen(true);
      setSaveStatus(isNew ? "Saving…" : "Saved locally");
      setSaveError(false);
      localStorage.setItem("folio-last-document", next.id);
      if (isNew) await flush();
    },
    [flush],
  );
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await bridge.list();
        if (!alive) return;
        setDocs(list);
        const last = localStorage.getItem("folio-last-document");
        const first =
          list.find((d) => d.id === last && !d.trashed) ||
          list.find((d) => !d.trashed);
        if (first) await activate(await bridge.load(first.id));
        else await activate(emptyDoc(), true);
      } catch (e) {
        notify((e as Error).message);
        await activate(emptyDoc(), true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  useEffect(
    () =>
      bridge.onEvent((e) => {
        if (e.type === "closing") {
          void flush();
          void library.flush();
        }
        if (e.type === "account" && e.refresh) void refreshAccount();
      }),
    [flush, library.flush],
  );
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        void flush();
        void library.flush();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        void activate(emptyDoc(), true);
      }
      if (e.key === "Escape") {
        setHelp(false);
        if (
          !e.defaultPrevented &&
          window.matchMedia("(max-width:1056px)").matches &&
          e.target instanceof HTMLElement &&
          e.target.closest(".assistant-pane")
        ) {
          setRightOpen(false);
          setCenterOpen(true);
          requestAnimationFrame(() =>
            document
              .querySelector<HTMLButtonElement>(
                'button[aria-label="Open assistant"]',
              )
              ?.focus(),
          );
        }
      }
    };
    window.addEventListener("keydown", handler);
    const close = () => void flush();
    window.addEventListener("beforeunload", close);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("beforeunload", close);
    };
  }, [flush, activate]);
  async function refreshAccount() {
    try {
      setAccount(await bridge.account());
      setAccountError("");
    } catch (e) {
      setAccount({ connected: false });
      setAccountError((e as Error).message);
    }
  }
  async function connect() {
    setConnecting(true);
    try {
      await bridge.login();
      setAccountError(
        "Finish signing in in your browser, then refresh connection.",
      );
    } catch (e) {
      setAccountError((e as Error).message);
    } finally {
      setConnecting(false);
    }
  }
  const updateBlock = useCallback(
    (
      id: string,
      update: Partial<DataBlock> | ((b: DataBlock) => DataBlock),
    ) => {
      mutate((d) => ({
        ...d,
        blocks: {
          ...d.blocks,
          [id]:
            typeof update === "function"
              ? update(d.blocks[id])
              : { ...d.blocks[id], ...update },
        },
      }));
    },
    [mutate],
  );
  const duplicateBlock = useCallback(
    (id: string) => {
      const nextId = uid();
      mutate((d) => {
        const b = structuredClone(d.blocks[id]);
        b.id = nextId;
        delete b.threadId;
        b.title += " (copy)";
        return { ...d, blocks: { ...d.blocks, [nextId]: b } };
      });
      return nextId;
    },
    [mutate],
  );
  async function openFolder() {
    try {
      await flush();
      const next = await bridge.openFolder();
      if (next) {
        setDocs((v) => [...v.filter((d) => d.id !== next.id), next]);
        await activate(next);
        setTrash(false);
      }
    } catch (e) {
      notify((e as Error).message);
    }
  }
  async function copyDoc() {
    if (!docRef.current) return;
    const copy = duplicateDoc(docRef.current);
    await activate(copy, true);
  }
  async function toggleTrash(value: boolean) {
    mutate((d) => ({ ...d, trashed: value }));
    await flush();

    setTrash(value);
    notify(value ? "Document moved to recoverable trash" : "Document restored");
  }
  useEffect(() => {
    localStorage.setItem("folio-navigation-open", String(sidebar));
    localStorage.setItem("folio-center-open", String(centerOpen));
    localStorage.setItem("folio-pane-mode", paneMode);
    localStorage.setItem("folio-source-tab", sourceTab);
  }, [sidebar, centerOpen, paneMode, sourceTab]);
  useEffect(() => {
    localStorage.setItem("folio-assistant-context", JSON.stringify(context));
    localStorage.setItem("folio-right-open", String(rightOpen));
  }, [context, rightOpen]);
  useEffect(() => {
    localStorage.setItem("folio-nav-width", String(navWidth));
  }, [navWidth]);
  useEffect(() => {
    localStorage.setItem("folio-right-width", String(rightWidth));
  }, [rightWidth]);
  useEffect(() => {
    if (!doc || restoredSurface.current || !library.sources.length) return;
    restoredSurface.current = true;
    try {
      const last = JSON.parse(localStorage.getItem("folio-surface") || "null");
      if (
        last?.kind === "source" &&
        library.sources.some((s) => s.id === last.id)
      )
        setSurface(last);
    } catch {}
  }, [doc, library.sources]);
  useEffect(() => {
    if (restoredSurface.current)
      localStorage.setItem("folio-surface", JSON.stringify(surface));
  }, [surface]);
  const selectedSource =
    surface.kind === "source"
      ? library.sources.find((r) => r.id === surface.id)
      : undefined;
  const contextSource =
    context?.kind === "source"
      ? library.sources.find((r) => r.id === context.owner)
      : undefined;
  const contextBlock =
    context?.kind === "doc" && context.owner === doc?.id
      ? doc.blocks[context.block]
      : contextSource?.analysis;
  function selectSource(record: SharedSource) {
    setSurface({ kind: "source", id: record.id });
    setSourceTab("Data");
    setCenterOpen(true);
    setContext({ kind: "source", owner: record.id, block: record.analysis.id });
    setPaneMode("assistant");
    setRightOpen(true);
    localStorage.setItem(
      "folio-surface",
      JSON.stringify({ kind: "source", id: record.id }),
    );
    if (window.innerWidth < 900) setSidebar(false);
  }
  async function selectDocument(id: string) {
    try {
      await Promise.all([flush(), library.flush()]);
      await activate(await bridge.load(id));
      setTrash(false);
      localStorage.setItem(
        "folio-surface",
        JSON.stringify({ kind: "doc", id }),
      );
      if (context?.kind === "doc" && context.owner !== id) setContext(null);
    } catch (e) {
      notify((e as Error).message);
    }
  }
  async function receiveSources(files: FileList | File[]) {
    setImportingSource(true);
    try {
      if (replacingSource.current && files.length !== 1)
        throw Error("Choose one CSV to replace this shared source.");
      for (const file of Array.from(files)) {
        if (file.size > LIMITS.bytes)
          throw Error(
            "This file exceeds the 25 MiB limit. Split it into smaller CSV files.",
          );
        if (!/\.(csv|tsv)$/i.test(file.name))
          throw Error("Choose a CSV or TSV file.");
        const source = await importCSV(
          new Uint8Array(await file.arrayBuffer()),
          file.name,
          replacingSource.current ? { id: replacingSource.current } : {},
        );
        const record = library.register(source);
        selectSource(record);
      }
      await library.flush();
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setImportingSource(false);
      replacingSource.current = undefined;
      if (sourceInput.current) sourceInput.current.value = "";
    }
  }
  function changeSharedSource(id: string, source: Source) {
    library.update(id, (r) => ({
      ...r,
      source,
      analysis: {
        ...r.analysis,
        sources: r.analysis.sources.map((s) =>
          s.id === source.id ? source : s,
        ),
      },
    }));
  }
  function selectAnalysis(
    kind: "doc" | "source",
    owner: string,
    id: string | null,
    mode: "assistant" | "focus" = "assistant",
  ) {
    if (!id) {
      setRightOpen(false);
      return;
    }
    setContext({ kind, owner, block: id });
    setPaneMode(mode);
    setRightOpen(true);
    if (mode === "focus") setRightWidth((v) => Math.max(520, v));
  }
  function addFinding(block: DataBlock) {
    setAdding(structuredClone(block));
    setFinding(
      [...block.messages].reverse().find((m) => m.role === "assistant")?.text ||
        block.title,
    );
    setTargetDocument(doc && !doc.trashed ? doc.id : "new");
  }
  async function commitFinding() {
    if (!adding || committingFinding.current) return;
    committingFinding.current = true;
    try {
      await Promise.all([flush(), library.flush()]);
      const destination =
        targetDocument === "new"
          ? { ...emptyDoc(), title: newTitle.trim() || "Research notes" }
          : targetDocument === docRef.current?.id
            ? docRef.current!
            : await bridge.load(targetDocument);
      if (destination.readOnly)
        throw Error("Choose a writable document or create a new one.");
      await activate(insertFinding(destination, adding, finding), true);
      setAdding(null);
      notify("Finding added. The original exploration stays in Sources.");
      localStorage.setItem(
        "folio-surface",
        JSON.stringify({ kind: "doc", id: destination.id }),
      );
    } catch (e) {
      notify((e as Error).message);
    } finally {
      committingFinding.current = false;
    }
  }
  function workspaceFor(
    kind: "doc" | "source",
    owner: string,
    blocks: Record<string, DataBlock>,
    readOnly = false,
  ) {
    return {
      blocks,
      readOnly,
      docId: owner,
      notify,
      expanded:
        context?.kind === kind && context.owner === owner
          ? context.block
          : null,
      setExpanded: (id: string | null) => selectAnalysis(kind, owner, id),
      openFocus: (id: string) => selectAnalysis(kind, owner, id, "focus"),
      paneMode,
      assistantHost,
      focusHost,
      library: library.sources,
      sourceView: kind === "source",
      registerSource: (source: Source) => library.register(source).source,
      onAddToDocument: kind === "source" ? addFinding : undefined,
      updateBlock: (
        id: string,
        change: Partial<DataBlock> | ((b: DataBlock) => DataBlock),
      ) => {
        if (kind === "doc") {
          if (docRef.current?.id === owner) updateBlock(id, change);
        } else
          library.update(owner, (r) => {
            const next =
              typeof change === "function"
                ? change(r.analysis)
                : { ...r.analysis, ...change };
            return {
              ...r,
              analysis: next,
              source: next.sources.find((s) => s.id === r.id) || r.source,
            };
          });
      },
      duplicateBlock: (id: string) =>
        kind === "doc" ? duplicateBlock(id) : id,
    };
  }
  const shown = docs.filter(
    (d) =>
      !!d.trashed === trash &&
      d.title.toLowerCase().includes(search.toLowerCase()),
  );
  const sourceShown = library.sources.filter((r) =>
    r.source.name.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div
      className={
        "folio-workspace " +
        (!sidebar ? "nav-collapsed " : "") +
        (rightOpen ? "has-assistant " : "") +
        (!centerOpen ? "center-collapsed" : "")
      }
      style={
        {
          "--nav-width": navWidth + "px",
          "--assistant-width": rightWidth + "px",
        } as React.CSSProperties
      }
    >
      {sidebar && (
        <>
          <aside
            className="workspace-navigation"
            aria-label="Workspace navigation"
          >
            <div className="navigation-title">
              <BrandMark size={24} />
              <strong>
                Folio<span>.</span>
              </strong>
              <IconButton
                label="Collapse navigation"
                onClick={() => setSidebar(false)}
              >
                <PanelLeftClose size={20} />
              </IconButton>
            </div>
            <div className="workspace-search">
              <CarbonSearch
                size="sm"
                labelText="Search workspace"
                aria-label="Search workspace"
                placeholder="Find a document or source"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <section className="navigation-section">
              <header>
                <h2>{trash ? "Trash" : "Documents"}</h2>
                <IconButton
                  label="New document"
                  onClick={() => {
                    setTrash(false);
                    void activate(emptyDoc(), true);
                  }}
                >
                  <Plus size={16} />
                </IconButton>
              </header>
              <nav aria-label="Documents">
                <SideNavItems isSideNavExpanded>
                  {shown.map((d) => (
                    <SideNavLink
                      as="a"
                      isSideNavExpanded
                      renderIcon={FileText}
                      href={"#document-" + d.id}
                      key={d.id}
                      isActive={surface.kind === "doc" && doc?.id === d.id}
                      onClick={(e) => {
                        e.preventDefault();
                        void selectDocument(d.id);
                      }}
                    >
                      <span>{d.title || "Untitled document"}</span>
                    </SideNavLink>
                  ))}
                </SideNavItems>
                {!shown.length && (
                  <p className="navigation-hint">
                    {trash ? "Trash is empty" : "No documents yet"}
                  </p>
                )}
              </nav>
            </section>
            <section className="navigation-section">
              <header>
                <h2>Sources</h2>
                <IconButton
                  label="Import CSV source"
                  onClick={() => sourceInput.current?.click()}
                  disabled={importingSource}
                >
                  <Plus size={16} />
                </IconButton>
              </header>
              <nav aria-label="Shared data sources">
                <SideNavItems isSideNavExpanded>
                  {sourceShown.map((r) => (
                    <SideNavLink
                      as="a"
                      isSideNavExpanded
                      large
                      renderIcon={Database}
                      className="source-nav-link"
                      href={"#source-" + r.id}
                      key={r.id}
                      isActive={
                        surface.kind === "source" && surface.id === r.id
                      }
                      onClick={(e) => {
                        e.preventDefault();
                        selectSource(r);
                      }}
                    >
                      <span>
                        {r.source.name}
                        <small>
                          {r.source.confirmed
                            ? "Local snapshot"
                            : "Review parsing"}{" "}
                          · {r.source.rows.length.toLocaleString()} rows
                        </small>
                      </span>
                    </SideNavLink>
                  ))}
                </SideNavItems>
                {!sourceShown.length && (
                  <Button
                    renderIcon={Plus}
                    className="source-import-empty"
                    onClick={() => sourceInput.current?.click()}
                  >
                    <span>
                      Import a CSV<small>Reuse it across documents</small>
                    </span>
                  </Button>
                )}
              </nav>
              {importingSource && (
                <InlineLoading description="Importing complete CSV…" />
              )}
            </section>
            <div className="navigation-footer">
              <Button
                renderIcon={FileText}
                onClick={() => setCenterOpen(!centerOpen)}
              >
                {centerOpen
                  ? "Collapse working surface"
                  : "Open working surface"}
              </Button>
              <Button
                renderIcon={MessageSquare}
                onClick={() => {
                  if (!centerOpen && rightOpen) setCenterOpen(true);
                  setRightOpen(!rightOpen);
                }}
              >
                {rightOpen ? "Close assistant" : "Open assistant"}
              </Button>
              <Button renderIcon={Trash2} onClick={() => setTrash(!trash)}>
                Trash
              </Button>
              <Button renderIcon={FolderOpen} onClick={openFolder}>
                Open folder
              </Button>
              <Button
                renderIcon={Settings}
                onClick={() => {
                  setSettings(true);
                  void refreshAccount();
                }}
              >
                Settings
              </Button>
              <small>Local workspace · original files retained</small>
            </div>
          </aside>
          <PaneDivider
            label="Resize navigation"
            value={navWidth}
            onChange={setNavWidth}
            min={200}
            max={380}
          />
        </>
      )}
      <main
        inert={rightOverlays && rightOpen}
        className={"working-pane " + (!centerOpen ? "pane-collapsed" : "")}
      >
        <header className="working-pane-header">
          {!sidebar && (
            <IconButton
              label="Open navigation"
              onClick={() => setSidebar(true)}
            >
              <PanelLeftOpen size={20} />
            </IconButton>
          )}
          <div className="working-breadcrumb">
            <span>{surface.kind === "source" ? "Sources" : "Documents"}</span>
            <ChevronRight size={16} />
            <strong>
              {selectedSource?.source.name || doc?.title || "Workspace"}
            </strong>
          </div>
          <div className="working-header-actions">
            <small className={saveError ? "unsaved" : ""}>
              {surface.kind === "source" ? library.status : saveStatus}
            </small>
            <IconButton
              label="Collapse working surface"
              onClick={() => {
                setCenterOpen(false);
                setRightOpen(true);
              }}
            >
              <PanelLeftClose size={16} />
            </IconButton>
            {!rightOpen && (
              <IconButton
                label="Open assistant"
                onClick={() => setRightOpen(true)}
              >
                <PanelRightOpen size={20} />
              </IconButton>
            )}
            <OverflowMenu
              aria-label="Document options"
              iconDescription="Document options"
              flipped
              size="sm"
            >
              <OverflowMenuItem
                itemText="Duplicate document"
                disabled={surface.kind !== "doc"}
                onClick={() => void copyDoc()}
              />
              <OverflowMenuItem
                itemText="Save portable copy"
                disabled={surface.kind !== "doc"}
                onClick={() =>
                  void flush()
                    .then(() => bridge.exportCopy(doc!.id))
                    .catch((e) => notify(e.message))
                }
              />
              <OverflowMenuItem
                itemText="Reveal document folder"
                disabled={surface.kind !== "doc"}
                onClick={() =>
                  void bridge.reveal(doc!.id).catch((e) => notify(e.message))
                }
              />
              <OverflowMenuItem
                itemText={doc?.trashed ? "Restore document" : "Move to trash"}
                disabled={surface.kind !== "doc"}
                isDelete={!doc?.trashed}
                onClick={() => void toggleTrash(!doc?.trashed)}
              />
              <OverflowMenuItem
                itemText="Keyboard shortcuts"
                hasDivider
                onClick={() => setHelp(true)}
              />
            </OverflowMenu>
          </div>
        </header>
        {!desktop && (
          <div className="preview-banner">
            Browser preview · desktop app provides portable folders,
            compilation, and AI.
          </div>
        )}
        {saveError && (
          <div className="app-warning">
            <Notice kind="error">Document changes are not saved.</Notice>
            <Button onClick={() => void flush()}>Retry save</Button>
          </div>
        )}
        {doc?.readOnly && (
          <div className="app-warning">
            <Notice kind="warning">This document is read-only.</Notice>
            <Button onClick={() => void copyDoc()}>Save a copy</Button>
          </div>
        )}
        {doc?.trashed && surface.kind === "doc" && (
          <div className="app-warning">
            <Notice kind="warning">This document is in trash.</Notice>
            <Button onClick={() => void toggleTrash(false)}>Restore</Button>
          </div>
        )}
        <div className="working-pane-scroll" hidden={surface.kind !== "doc"}>
          {doc && (
            <WorkspaceContext.Provider
              value={workspaceFor("doc", doc.id, doc.blocks, !!doc.readOnly)}
            >
              <article className="continuous-document">
                <input
                  className="document-title"
                  aria-label="Document title"
                  placeholder="Untitled document"
                  value={doc.title}
                  disabled={doc.readOnly}
                  onChange={(e) =>
                    mutate((d) => ({ ...d, title: e.target.value }))
                  }
                />
                <p className="document-byline">
                  Local document · edited{" "}
                  {new Date(doc.updated).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
                <DocumentEditor
                  key={doc.id + ":" + editorEpoch}
                  doc={doc}
                  onChange={(content) => {
                    if (docRef.current?.id === doc.id)
                      mutate((d) => ({ ...d, content }));
                  }}
                  onEditor={(e) => {
                    editorRef.current = e;
                  }}
                />
              </article>
            </WorkspaceContext.Provider>
          )}
        </div>
        <div
          className="working-pane-scroll source-surface"
          hidden={surface.kind !== "source"}
        >
          {selectedSource && (
            <>
              <div className="source-workspace-title">
                <Database size={24} />
                <h1>{selectedSource.source.name}</h1>
                <p>
                  {selectedSource.source.rows.length.toLocaleString()} rows ·{" "}
                  {selectedSource.source.columns.length} columns · imported{" "}
                  {new Date(selectedSource.source.imported).toLocaleString()}
                </p>
                <small>
                  Local snapshot. Re-import to refresh; no live connection.
                </small>
                <div className="source-workspace-actions">
                  <Button
                    kind="secondary"
                    onClick={() =>
                      selectAnalysis(
                        "source",
                        selectedSource.id,
                        selectedSource.analysis.id,
                      )
                    }
                  >
                    Ask assistant
                  </Button>
                  <Button
                    kind="tertiary"
                    onClick={() => addFinding(selectedSource.analysis)}
                    disabled={
                      !selectedSource.analysis.messages.some(
                        (m) => m.role === "assistant",
                      ) && !activeRevision(selectedSource.analysis)
                    }
                  >
                    Add to document
                  </Button>
                </div>
              </div>
              <div className="source-surface-tabs">
                <ContentSwitcher
                  size="sm"
                  selectedIndex={sourceTab === "Data" ? 0 : 1}
                  onChange={({ index }) =>
                    setSourceTab(index === 0 ? "Data" : "Finding")
                  }
                  aria-label="Source view"
                >
                  <Switch name="data" text="Data & schema" />
                  <Switch
                    name="finding"
                    text={
                      activeRevision(selectedSource.analysis)
                        ? "Working finding · ready"
                        : "Working finding"
                    }
                  />
                </ContentSwitcher>
              </div>
              <div hidden={sourceTab !== "Data"}>
                <SourcesPanel
                  key={selectedSource.id}
                  block={selectedSource.analysis}
                  revision={activeRevision(selectedSource.analysis)}
                  onUpdate={(source) =>
                    changeSharedSource(selectedSource.id, source)
                  }
                  onConfirm={(source) => {
                    changeSharedSource(selectedSource.id, source);
                    notify("Source parsing accepted. Ready to explore.");
                  }}
                  onAdd={() => sourceInput.current?.click()}
                  onReplace={(id) => {
                    replacingSource.current = id;
                    sourceInput.current?.click();
                  }}
                />
              </div>
            </>
          )}
          {library.sources.map((record) => (
            <div
              key={record.id}
              hidden={surface.id !== record.id || sourceTab !== "Finding"}
            >
              <WorkspaceContext.Provider
                value={workspaceFor("source", record.id, {
                  [record.analysis.id]: record.analysis,
                })}
              >
                <div className="source-finding">
                  <AnalysisBlock id={record.analysis.id} />
                </div>
              </WorkspaceContext.Provider>
            </div>
          ))}
        </div>
      </main>
      {rightOpen && (
        <PaneDivider
          label="Resize assistant"
          value={rightWidth}
          onChange={setRightWidth}
          min={340}
          max={900}
          reverse
        />
      )}
      <aside
        className={"assistant-pane " + (!rightOpen ? "pane-collapsed" : "")}
        aria-label={
          paneMode === "focus" ? "Focused visualization pane" : "Assistant pane"
        }
      >
        <header className="assistant-pane-header">
          {!sidebar && !centerOpen && (
            <IconButton
              label="Open navigation"
              onClick={() => setSidebar(true)}
            >
              <PanelLeftOpen size={16} />
            </IconButton>
          )}
          {!centerOpen && (
            <IconButton
              label="Open working surface"
              onClick={() => setCenterOpen(true)}
            >
              <FileText size={16} />
            </IconButton>
          )}
          <div className="assistant-pane-title">
            <span>
              {paneMode === "focus" ? "Focused visualization" : "Assistant"}
            </span>
            <strong>
              {contextBlock?.title || "Choose a source or visualization"}
            </strong>
          </div>
          <IconButton
            label={
              paneMode === "focus"
                ? "Return to conversation"
                : "Focus selected visualization"
            }
            disabled={paneMode !== "focus" && !contextBlock?.active}
            onClick={() => {
              setPaneMode(paneMode === "focus" ? "assistant" : "focus");
              if (paneMode !== "focus") setRightWidth((v) => Math.max(520, v));
            }}
          >
            {paneMode === "focus" ? (
              <MessageSquare size={16} />
            ) : (
              <Maximize2 size={16} />
            )}
          </IconButton>
          <IconButton
            label="Close right pane"
            onClick={() => {
              setRightOpen(false);
              if (!centerOpen) setCenterOpen(true);
            }}
          >
            <PanelRightClose size={16} />
          </IconButton>
        </header>
        <div
          className="assistant-pane-body"
          ref={setAssistantHost}
          hidden={paneMode !== "assistant" || !contextBlock}
        />
        <div
          className="assistant-pane-body"
          ref={setFocusHost}
          hidden={paneMode !== "focus" || !contextBlock}
        />
        {!contextBlock && (
          <div className="assistant-empty">
            <Sparkles size={24} />
            <h2>Think with your data</h2>
            <p>
              Open a source to investigate it, or choose the assistant action
              beside a visualization. Each context keeps its own conversation.
            </p>
            <Button onClick={() => sourceInput.current?.click()}>
              Import a CSV
            </Button>
          </div>
        )}
      </aside>
      <input
        type="file"
        accept=".csv,.tsv,text/csv"
        multiple
        hidden
        ref={sourceInput}
        onChange={(e) => {
          if (e.target.files) void receiveSources(e.target.files);
        }}
      />
      {adding && (
        <Modal title="Add finding to document" onClose={() => setAdding(null)}>
          <form
            className="inspector-content"
            onSubmit={(e) => {
              e.preventDefault();
              void commitFinding();
            }}
          >
            <div>
              Destination
              <SelectField
                aria-label="Destination document"
                value={targetDocument}
                onChange={(e) => setTargetDocument(e.target.value)}
              >
                <SelectItem value="new" text={"Create a new document"} />
                {docs
                  .filter((d) => !d.trashed)
                  .map((d) => (
                    <SelectItem key={d.id} value={d.id} text={d.title} />
                  ))}
              </SelectField>
            </div>
            {targetDocument === "new" && (
              <div>
                Document title
                <TextField
                  aria-label="New document title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>
            )}
            <div>
              Editable finding
              <TextAreaField
                aria-label="Finding narrative"
                rows={6}
                value={finding}
                onChange={(e) => setFinding(e.target.value)}
              />
            </div>
            <p className="muted">
              {activeRevision(adding)
                ? "The functioning visualization, current parameters, original source references, calculations and methodology will be inserted."
                : "This finding will be inserted as editable prose."}{" "}
              The source exploration history stays in Sources.
            </p>
            <div className="dialog-actions">
              <Button onClick={() => setAdding(null)}>Cancel</Button>
              <Button kind="primary" onClick={() => void commitFinding()}>
                Add finding
              </Button>
            </div>
          </form>
        </Modal>
      )}
      {toast && (
        <div className="notification-stack">
          <ToastNotification
            kind="info"
            lowContrast
            title="Folio"
            subtitle={toast}
            onClose={() => setToast("")}
            timeout={8000}
            role="status"
          />
        </div>
      )}
      {settings && (
        <Modal title="Workspace settings" onClose={() => setSettings(false)}>
          <div className="inspector-content">
            <div className="settings-section">
              <span className="settings-icon">
                <Sparkles size={24} />
              </span>
              <div>
                <h3>AI connection</h3>
                <p>Use your supported ChatGPT access through Codex.</p>
              </div>
              <Badge tone={account.connected ? "success" : "neutral"}>
                {account.connected ? "Connected" : "Disconnected"}
              </Badge>
            </div>
            <p>
              Writing, CSV inspection, and existing visualizations work without
              connecting. AI receives only the selected block’s context.
              Provider limits apply; there is no paid API fallback.
            </p>
            {account.connected && (
              <p className="check-pass">
                ChatGPT {account.plan || ""} · Codex 0.155.1
              </p>
            )}
            {accountError && <Notice kind="warning">{accountError}</Notice>}
            <div className="dialog-actions">
              <Button kind="tertiary" onClick={() => void refreshAccount()}>
                Refresh connection
              </Button>
              <Button
                kind="primary"
                disabled={connecting}
                onClick={() => void connect()}
              >
                {connecting ? "Opening browser…" : "Connect ChatGPT"}
              </Button>
            </div>
            <hr />
            <div className="settings-section">
              <ShieldCheck size={24} />
              <div>
                <h3>Your files, locally</h3>
                <p>
                  Documents contain their original CSVs, source code, results,
                  and revision history. Telemetry is off.
                </p>
              </div>
            </div>
            <Button renderIcon={FolderOpen} onClick={openFolder}>
              Open a document folder
            </Button>
            <hr />
            <p className="muted">
              Folio v0.1.0 · MIT licensed · Material Design 3<br />
              Development build. Release validation is documented in the
              project.
            </p>
          </div>
        </Modal>
      )}
      {help && (
        <Modal title="Make yourself at home" onClose={() => setHelp(false)}>
          <div className="inspector-content">
            <h3>Keyboard shortcuts</h3>
            <dl className="shortcut-list">
              <dt>New document</dt>
              <dd>⌘ N</dd>
              <dt>Save now</dt>
              <dd>⌘ S</dd>
              <dt>Bold / italic / underline</dt>
              <dd>⌘ B / I / U</dd>
              <dt>Undo / redo</dt>
              <dd>⌘ Z / ⇧ ⌘ Z</dd>
              <dt>Insert a block</dt>
              <dd>/</dd>
              <dt>Choose slash command</dt>
              <dd>↑ ↓ Enter</dd>
              <dt>Submit block prompt</dt>
              <dd>⌘ Enter</dd>
              <dt>Return from visualization</dt>
              <dd>Shift Tab / Tab</dd>
            </dl>
            <p className="muted">
              Use the handle beside any block to duplicate, move, or delete it.
              Drag the handle beside any block to reorder it.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
