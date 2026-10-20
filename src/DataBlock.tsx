import { Notice } from "./components/ui/Notice";
import {
  OverflowMenu,
  OverflowMenuItem,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Accordion,
  AccordionItem,
} from "@carbon/react";
import { SelectItem } from "@carbon/react";
import { SelectField, TextAreaField, TextField } from "./components/ui/Fields";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./workspace/analysis.css";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import {
  ChartBar as BarChart3,
  DataBase as Database,
  Chemistry as FlaskConical,
  Table as Table2,
  AiGenerate as Sparkles,
  OverflowMenuHorizontal as MoreHorizontal,
  Csv as FileSpreadsheet,
  Add as Plus,
  Maximize as Maximize2,
  Copy,
  TrashCan as Trash2,
  RecentlyViewed as History,
  FolderOpen,
  Undo as Undo2,
  ArrowUp,
  InProgress as LoaderCircle,
  Draggable as GripVertical,
  CheckmarkOutline as CheckCircle2,
  CloseOutline as PanelTopClose,
  WarningAlt as AlertCircle,
} from "@carbon/react/icons";
import { useWorkspace } from "./workspace";
import {
  activeRevision,
  type Files,
  type Source,
  type Revision,
  type Result,
  type Compiled,
  uid,
  validateParams,
} from "./model";
import { bridge } from "./bridge";
import { Button, IconButton, Badge, Modal, Progress } from "./ui";
import {
  SourcesPanel,
  MethodPanel,
  ResultsPanel,
  RunPanel,
} from "./Inspectors";
import { Runtime } from "./Runtime";
import { importCSV } from "./import";
import { starter } from "./starter";
import { enqueue } from "./queue";
type Candidate = {
  files: Files;
  compiled: Compiled;
  sources: Source[];
  params: Record<string, unknown>;
  started: number;
  token: string;
  reply?: string;
  threadId?: string;
};
export function DataBlockView({ node }: NodeViewProps) {
  return (
    <NodeViewWrapper
      className="data-node"
      contentEditable={false}
      data-block-id={node.attrs.id}
    >
      <AnalysisBlock id={node.attrs.id} />
    </NodeViewWrapper>
  );
}
export function AnalysisBlock({ id }: { id: string }) {
  const w = useWorkspace();
  const block = w.blocks[id];
  const [panel, setPanel] = useState<string | null>(null);
  const [focusedTab, setFocusedTab] = useState("Visualization");
  const conversation = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [compiled, setCompiled] = useState<Compiled | null>(null);
  const [result, setResult] = useState<Result | undefined>();
  const [consent, setConsent] = useState(false);
  const [importing, setImporting] = useState(false);
  const [runtimeEpoch, setRuntimeEpoch] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const replaceId = useRef<string | undefined>(undefined);
  const cancel = useRef<(() => void) | undefined>(undefined);
  const token = useRef<string>("");
  const current = useRef(block);
  current.current = block;
  const liveResult = useRef<Result | undefined>(undefined);
  const revision = block ? activeRevision(block) : undefined;
  const expanded = w.expanded === block?.id;
  const focus = expanded && w.paneMode === "focus";
  useEffect(() => {
    if (expanded && conversation.current)
      conversation.current.scrollTop = Number(
        localStorage.getItem("folio-chat-scroll-" + id) || 0,
      );
  }, [expanded, id]);
  useEffect(() => {
    if (!phase) {
      setElapsed(0);
      return;
    }
    const started = Date.now();
    const t = setInterval(
      () => setElapsed(Math.floor((Date.now() - started) / 1000)),
      1000,
    );
    return () => clearInterval(t);
  }, [!!phase]);
  useEffect(
    () => () => {
      cancel.current?.();
      token.current = "";
    },
    [],
  );
  useEffect(() => {
    if (!revision) {
      setCompiled(null);
      setResult(undefined);
      return;
    }
    let alive = true;
    setError("");
    setResult(revision.result);
    if (revision.compiled) setCompiled(revision.compiled);
    else
      bridge
        .compile(
          revision.files,
          revision.sources.map((s) => s.id),
        )
        .then((c) => {
          if (alive) setCompiled(c);
        })
        .catch((e) => {
          if (alive) setError(e.message);
        });
    return () => {
      alive = false;
    };
  }, [revision?.id, runtimeEpoch]);
  useEffect(
    () =>
      bridge.onEvent((e) => {
        if (e.type === "progress" && e.blockId === block?.id) setPhase(e.phase);
      }),
    [block?.id],
  );
  if (!block)
    return (
      <div className="data-node">
        <Notice kind="error">
          This block reference is unavailable. Restore the document from a
          recovery copy.
        </Notice>
      </div>
    );
  const update = (value: any) => w.updateBlock(block.id, value);
  const isBusy = !!phase;
  const ask = () => w.setExpanded(expanded ? null : block.id);
  function chooseFile(id?: string) {
    replaceId.current = id;
    fileInput.current?.click();
  }
  async function receive(files: FileList | File[]) {
    if (w.readOnly) return;
    setError("");
    setImporting(true);
    try {
      for (const file of Array.from(files)) {
        if (!/\.csv$|\.tsv$/i.test(file.name))
          throw Error("Only CSV and tab-separated CSV files are supported.");
        if (!replaceId.current && current.current.sources.length >= 5)
          throw Error("Each data block supports up to five CSV files.");
        let source = await importCSV(
          new Uint8Array(await file.arrayBuffer()),
          file.name,
          { id: replaceId.current },
        );
        source = w.registerSource?.(source) || source;
        update((b: any) => ({
          ...b,
          sources: replaceId.current
            ? b.sources.map((s: Source) =>
                s.id === replaceId.current ? source : s,
              )
            : [...b.sources, source],
        }));
        replaceId.current = undefined;
      }
      setPanel("Sources");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setImporting(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }
  async function prepare(
    files: Files,
    sources: Source[],
    reply?: string,
    threadId?: string,
  ) {
    files = structuredClone(files);
    const runToken = token.current;
    setPhase("Checking");
    try {
      const c = await bridge.compile(
        files,
        sources.map((s) => s.id),
      );
      if (token.current !== runToken) return;
      const previous = activeRevision(current.current);
      const values = { ...current.current.params };
      for (const p of files.manifest.parameters) {
        const old = previous?.files.manifest.parameters.find(
          (v) => v.id === p.id,
        );
        if (old && values[p.id] === old.default && p.default !== old.default)
          values[p.id] = p.default;
      }
      const params = validateParams(files.manifest, values);
      setCandidate({
        files,
        compiled: c,
        sources: structuredClone(sources),
        params,
        started: Date.now(),
        token: runToken,
        reply,
        threadId,
      });
    } catch (e) {
      if (token.current === runToken)
        fail((e as Error).message, files, sources);
    }
  }
  function fail(message: string, files?: Files, sources?: Source[]) {
    setError(
      /(?:analysis\.ts|view\.tsx|checks\.ts):\d/.test(message)
        ? "The candidate did not pass code validation. Your working result is preserved. Recheck the saved draft or ask AI to revise it."
        : message.replace(/^Error invoking remote method '[^']+': Error: /, ""),
    );
    setPhase("");
    setCandidate(null);
    update((b: any) => ({
      ...b,
      draft: {
        files,
        sources: structuredClone(sources || current.current.sources),
        error: message,
        at: new Date().toISOString(),
      },
    }));
  }
  async function promote(r: Result, c: Candidate) {
    if (token.current !== c.token) return;
    const revisionId = uid();
    c.files.manifest = {
      ...c.files.manifest,
      blockId: block.id,
      revisionId,
      sourceRevisions: Object.fromEntries(
        c.sources.map((s) => [s.id, s.revision]),
      ),
      entryPoints: {
        analysis: "analysis.ts",
        view: "view.tsx",
        checks: "checks.ts",
      },
    };
    const hash = Array.from(
      new Uint8Array(
        await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(JSON.stringify(c.files)),
        ),
      ),
    )
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("");
    if (token.current !== c.token) return;
    token.current = "";
    const next: Revision = {
      id: revisionId,
      created: new Date().toISOString(),
      files: c.files,
      compiled: c.compiled,
      sources: c.sources,
      sourceRefs: c.sources.map((s) => s.revision),
      params: c.params,
      result: r,
      run: {
        duration: Date.now() - c.started,
        hash,
        runtime: "folio-sdk/1 · browser worker",
      },
    };
    update((b: any) => ({
      ...b,
      title: c.files.manifest.title,
      params: c.params,
      active: next.id,
      revisions: [...b.revisions, next],
      threadId: c.threadId || b.threadId,
      messages: c.reply
        ? [
            ...b.messages,
            { role: "assistant", text: c.reply, at: new Date().toISOString() },
          ]
        : b.messages,
      draft: undefined,
    }));
    setPhase("");
    setCandidate(null);
    setError("");
    w.notify("New working revision ready · Undo change is available");
  }
  function retryDraft() {
    const draft = current.current.draft;
    if (!draft?.files) return;
    token.current = uid();
    setError("");
    void prepare(
      draft.files,
      draft.sources || current.current.sources,
      "Validated the retained AI draft without another AI request.",
    );
  }
  function stop() {
    token.current = "";
    cancel.current?.();
    setCandidate(null);
    setPhase("");
    setError("Generation cancelled. Your last working revision is preserved.");
  }
  async function generate(request = block.prompt) {
    if (!request.trim() || isBusy || w.readOnly) return;
    if (!localStorage.getItem("folio-ai-consent")) {
      setConsent(true);
      return;
    }
    if (!block.sources.length) {
      setError("Attach a CSV before asking AI.");
      return;
    }
    if (block.sources.some((s) => !s.confirmed)) {
      setPanel("Sources");
      setError("Review and accept parsing for each CSV before generation.");
      return;
    }
    setError("");
    const runToken = uid();
    token.current = runToken;
    setPhase("Queued");
    const prompt = request;
    const snapshot = structuredClone(block);
    update((b: any) => ({
      ...b,
      prompt: "",
      messages: [
        ...b.messages,
        { role: "user", text: prompt, at: new Date().toISOString() },
      ],
    }));
    cancel.current = enqueue(
      block.id,
      async () => {
        try {
          const answer = await bridge.generate(snapshot, prompt);
          if (token.current !== runToken) return;
          if (answer.clarification) {
            update((b: any) => ({
              ...b,
              threadId: answer.threadId,
              messages: [
                ...b.messages,
                {
                  role: "assistant",
                  text: answer.reply,
                  at: new Date().toISOString(),
                },
              ],
            }));
            setPhase("");
            return;
          }
          if (
            snapshot.sources.map((s) => s.revision).join() !==
            current.current.sources.map((s) => s.revision).join()
          )
            throw Error(
              "The sources changed while AI was working. Your current artifact is preserved; retry with the new sources.",
            );
          await prepare(
            answer.files!,
            snapshot.sources,
            answer.reply,
            answer.threadId,
          );
        } catch (e) {
          if (token.current === runToken) fail((e as Error).message);
        }
      },
      () => setPhase("Inspecting data"),
      () => {},
    );
  }
  async function localStarter() {
    if (!block.sources.length) return;
    setError("");
    token.current = uid();
    setPhase("Building");
    await prepare(
      starter(block.sources[0]),
      [block.sources[0]],
      "Created a local exploration from your CSV. No AI request was made.",
    );
  }
  function sourceUpdate(s: Source) {
    update((b: any) => ({
      ...b,
      sources: b.sources.map((v: Source) => (v.id === s.id ? s : v)),
    }));
  }
  async function confirmSource(s: Source) {
    sourceUpdate(s);
    const active = activeRevision(current.current);
    if (
      active &&
      active.sources.some((v) => v.id === s.id && v.revision !== s.revision)
    ) {
      const previous = active.sources.find((v) => v.id === s.id)!;
      if (
        JSON.stringify(previous.columns.map((c) => [c.label, c.type])) !==
        JSON.stringify(s.columns.map((c) => [c.label, c.type]))
      ) {
        setError(
          "The replacement schema differs. The working artifact still uses the previous source. Ask AI to adapt.",
        );
        return;
      }
      const next = active.sources.map((v) => (v.id === s.id ? s : v));
      token.current = uid();
      await prepare(
        active.files,
        next,
        "Updated the compatible CSV locally, without an AI request.",
      );
    } else w.notify("CSV parsing accepted");
  }
  function restore(r: Revision) {
    stop();
    update({ active: r.id, params: r.params });
    setPanel(null);
    setError("");
    w.notify("Restored code, sources, methodology, and results together");
  }
  function attach(sourceId: string) {
    const source = w.library?.find((s) => s.id === sourceId)?.source;
    if (source)
      update((b: any) => ({
        ...b,
        sources: [
          ...b.sources.filter((s: Source) => s.id !== source.id),
          structuredClone(source),
        ].slice(-5),
      }));
  }
  const openFocus = () => {
    w.openFocus?.(block.id);
  };
  const runtime =
    revision && compiled ? (
      <Runtime
        key={revision.id + "-" + runtimeEpoch}
        compiled={compiled}
        files={revision.files}
        sources={revision.sources}
        params={block.params}
        onParams={(p) => update({ params: p })}
        onResult={(r) => {
          liveResult.current = r;
          setResult(r);
        }}
        onError={setError}
      />
    ) : revision ? (
      <div className="runtime-fallback">
        <p>
          {error
            ? "Saved result · runtime unavailable"
            : "Restoring local visualization…"}
        </p>
        <ResultsPanel result={revision.result} />
      </div>
    ) : null;
  const sourceNames = block.sources.map((s) => s.name).join(", ");
  const assistant = (
    <section
      className="assistant-session"
      hidden={!expanded || focus}
      aria-label={block.title + " conversation"}
    >
      <div className="assistant-context-note">
        {w.sourceView ? "Exploring source" : "Selected visualization"} ·{" "}
        {sourceNames || "Choose a shared source"}
      </div>
      <div
        className="assistant-history"
        ref={conversation}
        onScroll={(e) =>
          localStorage.setItem(
            "folio-chat-scroll-" + id,
            String(e.currentTarget.scrollTop),
          )
        }
      >
        {!block.messages.length && (
          <div className="assistant-intro">
            <Sparkles size={24} />
            <h3>
              {w.sourceView
                ? "What would you like to understand?"
                : "Develop this visualization"}
            </h3>
            <p>
              Ask a question about {sourceNames || "a shared dataset"}. Your
              calculation, source rows, and methodology stay inspectable.
            </p>
          </div>
        )}
        {block.messages.map((m, i) => (
          <article className={"assistant-message " + m.role} key={i}>
            <strong>{m.role === "user" ? "You" : "Folio"}</strong>
            <p>{m.text}</p>
          </article>
        ))}
        {phase && (
          <div className="assistant-progress" role="status">
            <Progress label={phase} />
            <span>Elapsed {elapsed}s</span>
          </div>
        )}
        {(error || block.draft?.error) && (
          <div className="assistant-error">
            <Notice kind="error">
              <p>
                {error ||
                  "The last candidate needs attention. Your working visualization is preserved."}
              </p>
            </Notice>
            {block.draft?.files ? (
              <Button onClick={retryDraft}>Recheck saved draft</Button>
            ) : block.messages.some((m) => m.role === "user") ? (
              <Button
                onClick={() =>
                  void generate(
                    [...block.messages]
                      .reverse()
                      .find((m) => m.role === "user")!.text,
                  )
                }
              >
                Retry request
              </Button>
            ) : null}
            {revision && (
              <Button
                onClick={() => {
                  setRuntimeEpoch((v) => v + 1);
                  setError("");
                }}
              >
                Reload visualization
              </Button>
            )}
          </div>
        )}
        {revision && (
          <div className="assistant-finding-actions">
            <Button renderIcon={Maximize2} onClick={openFocus}>
              Focus visualization
            </Button>
            {w.onAddToDocument && (
              <Button
                renderIcon={Plus}
                kind="tertiary"
                onClick={() => w.onAddToDocument?.(block)}
              >
                Add to document
              </Button>
            )}
            <Button onClick={() => setPanel("Revisions")}>
              Revision history
            </Button>
          </div>
        )}
      </div>
      <form
        className="assistant-composer"
        onSubmit={(e) => {
          e.preventDefault();
          void generate();
        }}
      >
        {!block.sources.length && (
          <div>
            Source
            <SelectField
              aria-label="Assistant source"
              value=""
              onChange={(e) => attach(e.target.value)}
            >
              <SelectItem value="" text={"Choose a shared source"} />
              {w.library?.map((s) => (
                <SelectItem key={s.id} value={s.id} text={s.source.name} />
              ))}
            </SelectField>
          </div>
        )}
        <TextAreaField
          aria-label="Ask about this data"
          placeholder={
            revision
              ? "Ask a follow-up or request a change…"
              : "Ask a question about this source…"
          }
          value={block.prompt}
          disabled={w.readOnly}
          onChange={(e) => update({ prompt: e.target.value })}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              void generate();
            }
          }}
        />
        <div className="assistant-composer-actions">
          <small>
            {isBusy
              ? "Your working visualization remains available"
              : "⌘ Enter to send"}
          </small>
          {isBusy ? (
            <Button kind="tertiary" onClick={stop}>
              Stop
            </Button>
          ) : (
            <IconButton
              label="Send request"
              onClick={() => void generate()}
              disabled={!block.prompt.trim() || w.readOnly}
            >
              <ArrowUp size={20} />
            </IconButton>
          )}
        </div>
        {block.sources.length > 0 && !revision && (
          <Button
            onClick={() => void localStarter()}
            disabled={isBusy || block.sources.some((s) => !s.confirmed)}
          >
            Create local exploration
          </Button>
        )}
        {block.sources.some((s) => !s.confirmed) && (
          <p className="muted">
            Review parsing in the source workspace before generation.
          </p>
        )}
      </form>
    </section>
  );
  const focused = (
    <section
      className="focused-analysis"
      aria-label={block.title + " focused visualization"}
    >
      <Tabs
        selectedIndex={[
          "Visualization",
          "Sources",
          "Methodology",
          "Result data",
        ].indexOf(focusedTab)}
        onChange={({ selectedIndex }) =>
          setFocusedTab(
            ["Visualization", "Sources", "Methodology", "Result data"][
              selectedIndex
            ],
          )
        }
      >
        <TabList aria-label="Inspect visualization">
          <Tab>Visualization</Tab>
          <Tab>Sources</Tab>
          <Tab>Methodology</Tab>
          <Tab>Result data</Tab>
        </TabList>
        <TabPanels>
          <TabPanel className="focused-analysis-content">{runtime}</TabPanel>
          <TabPanel className="focused-analysis-content">
            <SourcesPanel
              block={block}
              revision={revision}
              onUpdate={sourceUpdate}
              onConfirm={(s) => void confirmSource(s)}
              onAdd={() => chooseFile()}
              onReplace={chooseFile}
            />
          </TabPanel>
          <TabPanel className="focused-analysis-content">
            <MethodPanel revision={revision} params={block.params} />
          </TabPanel>
          <TabPanel className="focused-analysis-content">
            <ResultsPanel result={result || revision?.result} />
          </TabPanel>
        </TabPanels>
      </Tabs>
      <div className="inspection-controls">
        <Button
          onClick={() => setPanel("Run details")}
          title="Declared analytical assertions and host consistency checks; not independent verification"
        >
          Run details
        </Button>
      </div>
      {revision && (
        <small
          className="focus-run-status"
          title="These are declared checks and host consistency tests, not independent verification."
        >
          {(result || revision.result).includedRows.toLocaleString()} included
          rows · {revision.result.checks.length} declared checks passed
        </small>
      )}
    </section>
  );
  return (
    <>
      <section
        className={"analysis-block " + (expanded ? "context-selected" : "")}
        aria-label={block.title}
        data-analysis-id={block.id}
      >
        <div className="analysis-heading">
          {revision && (
            <input
              className="analysis-title"
              aria-label="Visualization title"
              value={block.title}
              disabled={w.readOnly}
              onClick={() => {
                if (w.expanded) w.setExpanded(block.id);
              }}
              onChange={(e) => update({ title: e.target.value })}
            />
          )}
          <div className="analysis-actions">
            <IconButton
              label="Open assistant for visualization"
              onClick={() => w.setExpanded(block.id)}
            >
              <Sparkles size={16} />
            </IconButton>
            <IconButton
              label="Focus visualization"
              onClick={openFocus}
              disabled={!revision}
            >
              <Maximize2 size={16} />
            </IconButton>
            <OverflowMenu
              aria-label="Visualization options"
              iconDescription="Visualization options"
              flipped
              size="sm"
            >
              <OverflowMenuItem
                itemText="Inspect sources, methods and results"
                onClick={() => {
                  openFocus();
                  setFocusedTab("Methodology");
                }}
              />
              <OverflowMenuItem
                itemText="Revision history"
                onClick={() => setPanel("Revisions")}
              />
              {block.revisions.length > 1 && (
                <OverflowMenuItem
                  itemText="Undo last revision"
                  onClick={() =>
                    restore(
                      block.revisions[
                        Math.max(
                          0,
                          block.revisions.findIndex(
                            (r) => r.id === block.active,
                          ) - 1,
                        )
                      ],
                    )
                  }
                />
              )}
            </OverflowMenu>
          </div>
        </div>
        {revision ? (
          focus ? (
            <div className="visualization-in-pane">
              <Maximize2 size={20} />
              Visualization open in the right pane
              <Button onClick={() => w.setExpanded(block.id)}>
                Return to page
              </Button>
            </div>
          ) : (
            runtime
          )
        ) : phase ? (
          <div className="analysis-placeholder" role="status">
            Preparing visualization… Your request is in the assistant.
          </div>
        ) : (
          <form
            className="empty-visualization"
            onSubmit={(e) => {
              e.preventDefault();
              w.setExpanded(block.id);
              void generate();
            }}
          >
            <div>
              <span>Source</span>
              <SelectField
                aria-label="Source for visualization"
                value={block.sources[0]?.id || ""}
                onChange={(e) => attach(e.target.value)}
                disabled={w.readOnly}
              >
                <SelectItem value="" text={"Choose a shared source"} />
                {w.library?.map((s) => (
                  <SelectItem key={s.id} value={s.id} text={s.source.name} />
                ))}
                {block.sources
                  .filter((s) => !w.library?.some((r) => r.id === s.id))
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id} text={s.name} />
                  ))}
              </SelectField>
            </div>
            <div className="empty-visualization-request">
              <TextField
                aria-label="Visualization request"
                placeholder="What would you like to see?"
                value={block.prompt}
                disabled={w.readOnly}
                onChange={(e) => update({ prompt: e.target.value })}
              />
              <IconButton
                label="Explore visualization"
                onClick={() => {
                  w.setExpanded(block.id);
                  if (block.prompt.trim()) void generate();
                }}
              >
                <ArrowUp size={16} />
              </IconButton>
            </div>
            {!w.library?.length && (
              <small>
                Import a CSV from Sources in the workspace navigation.
              </small>
            )}
          </form>
        )}
        {revision && (
          <div className="analysis-provenance">
            <span
              title={revision.sources
                .map(
                  (s) =>
                    s.name +
                    " · imported " +
                    new Date(s.imported).toLocaleString(),
                )
                .join("; ")}
            >
              {sourceNames} · imported{" "}
              {new Date(
                revision.sources[0]?.imported || revision.created,
              ).toLocaleDateString()}{" "}
              · local snapshot
            </span>
            {Object.entries(block.params)
              .filter(([key, value]) =>
                revision.files.manifest.parameters.some(
                  (p) => p.id === key && p.default !== value,
                ),
              )
              .map(([key, value]) => (
                <span key={key}>
                  {
                    revision.files.manifest.parameters.find((p) => p.id === key)
                      ?.label
                  }
                  : {String(value)}
                </span>
              ))}
            {block.sources.some(
              (s) => !revision.sourceRefs.includes(s.revision),
            ) && <span>Using saved source revision</span>}
          </div>
        )}
      </section>
      {w.assistantHost && createPortal(assistant, w.assistantHost)}
      {focus && w.focusHost && createPortal(focused, w.focusHost)}
      <input
        ref={fileInput}
        type="file"
        accept=".csv,.tsv,text/csv"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) void receive(e.target.files);
        }}
      />
      {candidate && (
        <div className="candidate-validation" aria-label="Validating candidate">
          <Runtime
            key={candidate.token}
            compiled={candidate.compiled}
            files={candidate.files}
            sources={candidate.sources}
            params={candidate.params}
            onParams={() => {}}
            onResult={(r) => void promote(r, candidate)}
            onError={(e) => fail(e, candidate.files, candidate.sources)}
          />
        </div>
      )}
      {panel && (
        <Modal
          title={panel === "Revisions" ? "Revision history" : panel}
          onClose={() => setPanel(null)}
          wide
        >
          {panel === "Sources" ? (
            <SourcesPanel
              block={block}
              revision={revision}
              onUpdate={sourceUpdate}
              onConfirm={(s) => void confirmSource(s)}
              onAdd={() => chooseFile()}
              onReplace={chooseFile}
            />
          ) : panel === "Methodology" ? (
            <MethodPanel revision={revision} params={block.params} />
          ) : panel === "Result data" ? (
            <ResultsPanel result={result || revision?.result} />
          ) : panel === "Run details" ? (
            <RunPanel revision={revision} result={result} />
          ) : (
            <div className="inspector-content">
              {!block.revisions.length && <p>No working revisions yet.</p>}
              {[...block.revisions].reverse().map((r, i) => (
                <div className="revision-item" key={r.id}>
                  <History size={20} />
                  <div>
                    <strong>{r.files.manifest.title}</strong>
                    <p>
                      {new Date(r.created).toLocaleString()} ·{" "}
                      {r.id.slice(0, 8)} · {r.result.inputRows.toLocaleString()}{" "}
                      source rows
                    </p>
                  </div>
                  {r.id === block.active ? (
                    <Badge tone="success">Active</Badge>
                  ) : (
                    <Button kind="tertiary" onClick={() => restore(r)}>
                      Restore
                    </Button>
                  )}
                </div>
              ))}
              {block.draft && (
                <div className="retained-draft">
                  <Notice kind="warning">
                    Retained draft needs attention.
                  </Notice>

                  <Accordion size="sm">
                    <AccordionItem title="Validation diagnostics">
                      <pre style={{ whiteSpace: "pre-wrap" }}>
                        {block.draft.error}
                      </pre>
                    </AccordionItem>
                  </Accordion>
                  <small>{block.draft.at}</small>
                  {block.draft.files && (
                    <Button
                      kind="tertiary"
                      onClick={() => {
                        setPanel(null);
                        retryDraft();
                      }}
                    >
                      Recheck saved draft
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </Modal>
      )}
      {consent && (
        <Modal
          title="Connect your analysis to AI"
          onClose={() => setConsent(false)}
        >
          <div className="inspector-content">
            <p>
              Codex can read the selected block’s CSV sources, instructions, and
              current artifact. Content it reads may be sent to OpenAI using
              your ChatGPT access.
            </p>
            <p>
              Your document prose and other blocks are excluded. Local editing
              and filtering work without an AI request.
            </p>
            <div className="dialog-actions">
              <Button onClick={() => setConsent(false)}>Cancel</Button>
              <Button
                kind="primary"
                onClick={() => {
                  localStorage.setItem("folio-ai-consent", "yes");
                  setConsent(false);
                  void generate();
                }}
              >
                Continue with this block
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
