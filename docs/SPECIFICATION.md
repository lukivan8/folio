> Historical product specification, with private validation examples generalized for public release. UI foundation choices are superseded by the current [canonical Carbon design-system reference](DESIGN_SYSTEM.md).

Version 1 product and technical specification  
20 October 2026  
Status: implementation baseline. The product name is undecided.

Build a free, open-source desktop application where a person writes a document, attaches CSV data to a block, and asks AI to create an interactive visualization inside that block. The document remains the main working surface. Users can inspect the data and analytical methodology without opening source code.

V1 proves one complete loop: create a document → write normally → insert a data block → attach CSV → describe a visualization → interact with the result → ask for a change → reopen the saved document.

# 1 Product direction

The application combines ordinary document editing with programmable data blocks. People edit prose themselves using familiar Notion-style controls. Inside a data block, Codex edits an underlying TypeScript project and produces an HTML-based interactive experience.

A data block can contain a chart, table, dashboard, calculator, filter, or several coordinated elements. It is not limited to a catalog of chart types. The application supplies stable boundaries for data, parameters, inspection, execution, and saving. Skills guide the agent in how to use those boundaries.

The user sees the analytical artifact, its controls, its sources, and its methodology. Source files remain ordinary local files, but the product does not require users to navigate or edit them.

The local application is useful without a product account or hosted backend. AI uses the user's supported ChatGPT and Codex access. Local storage does not mean offline inference: prompts and any data the agent reads can be sent to the configured AI provider.

## 1.1 Initial users and validation

Recurring product-usage reports provide a technical use case. Everyday analytical tasks provide a usability case for someone who should not need to understand a codebase.

For V1, both use exported CSV files. Live analytics integrations are later work.

Success means a user returns to an existing document, replaces or adds data, and continues the analysis. A visually impressive first generation alone is insufficient.

## 1.2 Product principles

- A document is useful before AI is connected.

- Direct text editing should feel immediate and predictable.

- AI belongs to an individual data block in V1.

- Interactivity can use custom generated UI.

- Sources, calculations, assumptions, and exclusions remain inspectable.

- A failed generation never replaces a working result.

- User-owned files remain portable and readable outside the application.

- The application enforces execution and access boundaries. Agent instructions guide analytical behavior.

# 2 Scope and release decisions

“MUST” identifies a V1 release requirement. “SHOULD” identifies a preferred implementation with room for equivalent behavior. “Later” identifies work outside V1.

The following defaults make the specification implementable without additional product decisions: English UI, macOS Apple Silicon as the first supported release, MIT licensing for application-owned code, React and TypeScript for generated UI, and CSV as the only data input format. These defaults can change before implementation; they are not additional user commitments.

## 2.1 Included in V1

| Area           | Required behavior                                                                                  |
| -------------- | -------------------------------------------------------------------------------------------------- |
| Documents      | Create, open, rename, duplicate, trash, restore, autosave                                          |
| Editing        | Paragraphs, headings, lists, checklists, quotes, dividers, links, inline formatting, simple tables |
| Block controls | Slash menu, insert button, drag handle, duplicate, delete, keyboard selection                      |
| Data           | One or more CSV files attached to a data block; preview and parse settings                         |
| AI             | Block-specific conversation, generation, clarification, revision, cancel, retry                    |
| Output         | Custom HTML-based UI compiled from React and TypeScript                                            |
| Inspection     | App-owned source, methodology, result data, and run detail panels                                  |
| Interactivity  | Filters and controls operating locally without an AI request                                       |
| Persistence    | Portable document directory, source snapshots, artifact revisions, saved parameters                |
| Recovery       | Last working revision, failed draft retention, restore                                             |
| Desktop        | Installable app; no terminal or separate JavaScript setup required                                 |

## 2.2 Outside V1

Document-wide chat, AI editing ordinary document text, cross-block calculations, shared document agents, live databases, Excel and PDF ingestion, screenshots as data, scheduled execution, cloud hosting, publishing links, collaboration, organizational permissions, and mobile clients are later work.

V1 does not expose a source-code editor, terminal, model marketplace, arbitrary package installation, Python runtime, or generated backend services. It does not aim for complete Notion feature parity: nested pages, databases, synced blocks, comments, and multi-column page layouts are excluded.

These exclusions constrain the first implementation, not the long-term artifact model.

# 3 Primary workflows

## 3.1 Create and write

1. Open the application and choose New document.

2. Enter a title and start typing.

3. Use slash commands, the insertion control, or keyboard shortcuts to add and format blocks.

4. Reorder blocks and mix prose with data blocks.

5. Autosave persists changes. Closing and reopening restores the document.

An empty document offers a writing surface and a subtle insertion hint. Authentication must not interrupt this workflow.

## 3.2 Create an interactive analysis

1. Insert Data block through the slash menu or insertion control.

2. Drop a CSV file into it or choose Add CSV.

3. Inspect a preview and confirm parsing where necessary.

4. Enter an instruction such as “Show daily active users over time with a date range filter and weekday versus weekend comparison.”

5. If AI is not connected, complete connection without losing the file or prompt.

6. Codex reads the block's source definitions and relevant data, then creates the implementation and analytical description.

7. The application compiles, validates, and executes the candidate.

8. A successful candidate appears inside the block. Source and Methodology controls remain visible.

9. The user changes a filter locally or asks a follow-up in the same block.

Do not replace a missing active-user measure with event counts. If the CSV lacks enough information to calculate DAU, ask for clarification or label the available measure accurately.

## 3.3 Revise an existing block

Selecting Ask AI opens the block's conversation. A request such as “Use bars instead and highlight the latest week” resumes that block's thread.

The current working visualization remains visible while a candidate is prepared. Successful validation promotes the candidate automatically and offers Undo change. Failed or cancelled candidates leave the current revision intact.

The agent may modify that block's generated files and methodology. It may not change document text, reorder blocks, or edit sibling data blocks.

## 3.4 Update a source

Replace CSV imports a new immutable source revision. The previous working artifact retains its original source until an updated candidate succeeds.

If the new file is compatible with the existing calculation, the application can rerun it without AI. A successful rerun atomically promotes the new source and results. If a required column is absent or incompatible, keep the old working result, show the pending source revision, and offer Ask AI to adapt.

There is no silent column remapping or partial replacement of a working calculation.

## 3.5 Return to work

Opening a document shows the last saved working results and parameter values without calling AI. The block then restores its local runtime. Cached results remain labelled while runtime initialization is in progress.

If the runtime fails, show the saved result table and an actionable error. The document's prose and source inspection remain usable.

# 4 Application layout

## 4.1 Document shell

Use a restrained writing interface with a collapsible document sidebar, title, document canvas, save status, and a small settings menu. The sidebar lists local documents by title and recent activity and offers New document and Open folder.

The main canvas uses a comfortable reading width. Data blocks can expand within the canvas; a focused view supports larger interactive output without changing the document structure.

There is no permanent global chat panel in V1.

## 4.2 Ordinary editor controls

The editor MUST support:

- Paragraphs; headings 1 through 3.

- Bulleted, numbered, and checklist lists with indentation.

- Quotes, dividers, and simple editable tables.

- Bold, italic, underline, strikethrough, inline code, and links.

- A selection toolbar and familiar keyboard shortcuts.

- A slash menu with keyboard navigation and search.

- A hover insertion control and block drag handle.

- Block duplicate, delete, and turn-into where conversion is meaningful.

- Copy and paste of text and common formatted content.

- Undo and redo for ordinary editor operations.

Enter continues a paragraph or list. Enter on an empty list item exits the list. Escape dismisses menus and returns focus. Backspace at a data-block boundary must not silently destroy its files.

CSV dropped on an empty data block attaches there. CSV dropped elsewhere on the canvas offers to create a data block at that location.

Simple tables in prose are manually edited content; they are distinct from result tables inside data blocks.

## 4.3 Data block layout

The host-owned frame contains a title, status, source count, Sources, Methodology, Result data, Ask AI, and an overflow menu. These controls remain available regardless of the generated visualization.

An empty block shows Add CSV and an instruction field. After generation, the visualization occupies the body; the conversation is collapsed by default.

Ask AI opens an attached conversation drawer or expanded block section. Keep only one expanded block conversation per document by default. Collapsing it does not cancel a run.

The overflow menu contains Rename, Duplicate, Focus, Revisions, Reveal folder, and Delete. Debug logs may be available under advanced diagnostics; implementation logs are not the primary user experience.

## 4.4 Interaction and focus

Clicking a filter, table, tooltip, or chart must operate that element without opening chat. Block selection uses the surrounding frame. Keyboard focus entering an embedded visualization must have a documented path back to the editor.

Generated content must not draw over host controls. Each block supports responsive sizing, bounded automatic height, and focused viewing. Long result tables scroll within their panel.

# 5 CSV ingestion and source inspection

## 5.1 Import contract

V1 MUST support UTF-8 CSV with optional BOM, comma, semicolon, and tab delimiters, quoted fields, escaped quotes, embedded newlines, and LF or CRLF line endings.

The host parser proposes a delimiter, header presence, and column types. Before generation, the source panel shows the interpretation and permits corrections. Unsupported encodings produce a clear error with conversion guidance; they are never decoded silently with replacement characters.

Default release limits are 25 MiB per file, 100,000 data rows per file, 200 columns, and five sources per block. These are product limits to verify on the target machine. Exceeding a limit rejects the import without truncating it.

Import copies bytes into the document. It does not retain a dependency on the original desktop file path. Names are sanitized for display and never used directly as filesystem paths.

## 5.2 Parsing behavior

Preserve raw strings alongside an explicit parsing plan. Treat identifier-like values conservatively: a value such as 00123 must not lose its leading zeros through automatic numeric inference.

Store each column's stable ID, original header, display label, type, missing-value rules, and optional date or number format. Duplicate and empty headers receive distinct internal IDs. The UI shows original and assigned names.

Ambiguous dates, decimal separators, ragged records, and invalid typed values produce warnings or blocking errors. Significant parse choices require confirmation. Show counts and example rows for rejected or unresolved values. Never silently drop malformed records.

Store timezone assumptions for timestamp interpretation. A date-only field remains a date without invented timezone conversion. File row count excludes the header.

## 5.3 Sources panel

For every attached source, show:

- Display name, original filename, imported time, byte size, and source revision.

- Full row count, column count, schema, parse settings, and warnings.

- A searchable or paginated raw-data preview and typed-data preview.

- Whether the active visualization uses this source.

- Which source revision the active artifact used.

- Replace and download-original actions.

An initial preview can show 100 rows, but it must be labelled as a preview of the complete source. Calculations use the complete accepted dataset.

Removing a source used by an active artifact cannot leave that artifact appearing current. Retain the historical source for its revision and require a replacement or regeneration before promoting a new current artifact.

# 6 AI behavior inside a block

## 6.1 Connection

Manage Codex connection in settings and offer the same flow when the first block request is submitted. Show connected, disconnected, signing in, unavailable, and usage-limited states.

The application MUST use an official supported authentication mechanism and a pinned compatible Codex app-server version. Reuse an existing supported local Codex login when available. Provide an official browser login when needed; do not parse token files or copy credentials into document projects.

For the initial free local release, app-server-managed ChatGPT authentication is the integration baseline, subject to verification against the pinned distribution. Migration to Sign in with ChatGPT is a separate adapter decision if required for distribution. No hosted subscription relay is part of this design.

Subscription eligibility and provider limits are external constraints. A failed or limited request does not trigger paid API fallback. Preserve the prompt and explain the next action.

## 6.2 Block context

Each request receives the instruction, the block title, current artifact manifest, attached source schemas and parse warnings, source revisions, current parameters, relevant conversation history, and the bundled block-authoring skill.

The agent can inspect only the selected block's approved source snapshots and draft workspace. Document prose, sibling blocks, home-directory files, browser sessions, and unrelated projects are excluded from V1 context.

Use schema and small previews for orientation, then tools to inspect the actual data when required. Do not treat a sample as the entire dataset. Disclosure before the first AI use explains that source content read by the agent may be sent to the provider.

Persist a thread association per block. If a thread cannot be resumed, start a replacement from the current artifact and saved summary. Do not make the artifact depend on provider conversation retention.

## 6.3 Agent authoring rules

The bundled skill MUST instruct the agent to:

- Clarify missing analytical definitions when they materially change the result.

- Use actual sources; never invent fallback data for a real analysis.

- Separate calculation code from presentation code.

- Expose units, aggregation, filters, missing-value treatment, and assumptions.

- Declare which source columns each analytical step uses.

- Use host-provided data and parameter APIs.

- Produce explicit empty, loading, and error states.

- Validate calculations against the supplied data.

- Preserve working features unless the requested change requires altering them.

- Keep the implementation within approved browser dependencies and permissions.

These are instructions, not a security boundary. Host validation and access control are separate requirements.

## 6.4 Conversation and progress

The conversation shows user requests, useful assistant replies, clarifying questions, and concise progress. Suggested phases are Inspecting data, Building, Checking, and Updating block.

Show Stop while a run is active. Persist a typed prompt before sending it. Support retry after failure and answering clarifying questions in the same thread.

Only one generation per block and one generation application-wide run at a time in V1. Additional requests enter a visible queue and remain cancellable. Users can continue editing prose or interacting with working blocks while AI runs.

Avoid a percentage progress indicator without real progress measurements. Detailed tool logs belong in optional diagnostics.

# 7 Interactive artifacts and inspection

## 7.1 Rendering model

A generated artifact is a browser application, compiled from React and TypeScript to HTML, CSS, and JavaScript. HTML-like dynamic elements include forms, filters, sliders, tables, SVG or canvas charts, tooltips, and interactive layouts.

The host supports custom composition within a fixed runtime contract. It does not require all visualizations to be instances of a predefined chart component.

V1 generated code runs in a browser sandbox. Heavy calculation can run in a dedicated Web Worker. There is no arbitrary generated Node or Bun service, shell script, or native extension at visualization runtime.

## 7.2 Minimum artifact structure

Every artifact MUST contain these responsibilities, even if the first implementation uses only a few files:

```text
artifact.json          Stable IDs, source references, parameters, method steps
analysis.ts           Calculation and preparation of result datasets
view.tsx              Presentation and interaction
checks.ts             Analytical assertions for this artifact
```

The artifact manifest is declarative data. The host validates and reads it without executing generated code. It is the source for the app-owned inspection UI.

Methods and data-source descriptions cannot exist only as code comments or generated labels inside the visualization. They must also be represented in the manifest and run record.

## 7.3 Manifest contract

The manifest identifies the format version, block and artifact revision, browser entry points, required source IDs and schema expectations, parameters, method steps, output datasets, and expected checks.

Each method step has a stable ID, title, plain-language description, input source or result references, used columns, filters, aggregation or formula, units, assumptions, missing-value policy, and output references. Code references connect the method to the corresponding analysis implementation.

Parameters specify ID, human label, type, default, allowed values or bounds, and whether they affect calculation or presentation. Unknown fields can be preserved within a namespaced extensions object; unsupported major format versions open read-only.

## 7.4 Methodology panel

Present a readable explanation of the current calculation:

1. Sources and columns used.

2. Inclusion criteria and filters.

3. Transformations, formulas, and aggregation.

4. Units, date interpretation, and grouping.

5. Missing, invalid, and excluded row treatment.

6. Assumptions and known analytical limitations.

7. Current parameter values and their effect.

For example: “Group by calendar date. Count distinct user_id among included events for each date. Exclude rows missing user_id or date and report their count.” If only preaggregated daily counts exist, describe that source accurately instead.

The panel comes from the same artifact revision as the active result. Generated content cannot hide or replace it.

A validated manifest proves required explanations are present. It does not prove that the analytical interpretation is correct. The UI should say Checks passed rather than claiming the analysis has been independently verified.

## 7.5 Result data and run record

Result data displays the tables used to produce the visualization, with full row counts, types, units, and download as CSV. The visual and result table must consume the same result dataset.

A run record stores artifact hash, source hashes and parse revisions, parameter values, runtime version, timestamps, duration, output hashes, row counts, exclusions, warnings, and check outcomes.

Every result dataset identifies the method step and input datasets that produced it. This is enough for source-to-result inspection in V1; a general lineage graph UI is later work.

Exports must handle spreadsheet formula-like values safely, with an explicit raw-data option if needed. Original source download remains byte-preserving.

## 7.6 Runtime API

The host SDK exposes a deliberately small browser-facing surface:

```typescript
type BlockContext = {
  sources: SourceCatalog; // approved snapshots only
  params: ParameterValues;
  state: JsonValue; // saved UI state
};

type AnalysisResult = {
  datasets: Record<string, ResultTable>;
  steps: StepRun[];
  warnings: AnalysisWarning[];
};

export function analyze(context: BlockContext): Promise<AnalysisResult>;

export function View(props: {
  result: AnalysisResult;
  params: ParameterValues;
  setParams: (patch: ParameterPatch) => void;
}): React.ReactNode;
```

These types define the intended contract; the implementation must publish complete versioned schemas and SDK types. Sources are obtained through capability-bound handles, never arbitrary local paths.

Analytical parameter changes rerun analysis locally. Presentation-only changes rerender locally. Neither requires Codex. Persist only schema-validated JSON state, with a 1 MiB per-block limit.

Current parameter values must remain visible in the host inspector even if generated controls are custom. No backend query language or universal execution graph is required in V1.

# 8 State and revision behavior

Keep generation state separate from the presence of a working artifact.

| Generation state | User experience                        |
| ---------------- | -------------------------------------- |
| Empty            | Add data and an instruction            |
| Ready            | Sources accepted; generation available |
| Queued           | Request saved and waiting              |
| Generating       | Progress and Stop                      |
| Needs input      | Clarification or required approval     |
| Validating       | Compilation, analysis, and checks      |
| Failed           | Error, retained prompt, retry          |
| Cancelled        | Run stopped; working artifact retained |
| Idle             | Working artifact available             |

A block with a working artifact can be Generating, Failed, or Cancelled without losing that artifact.

## 8.1 Candidate promotion

Generation writes to a new draft directory. The host validates the candidate, compiles with its trusted build pipeline, executes analysis, checks outputs, and performs a render readiness check.

Only then does it atomically update the active pointer to a complete bundle of code, manifest, source revisions, parameters, result data, and run record.

If a source or parameter changes during generation, the candidate is validated against its original snapshot. It cannot silently become current for a newer input state. Revalidate it or mark it outdated.

## 8.2 Validation

Required checks include manifest schema validity, confined source references, approved imports, TypeScript and build success, result schema validity, method-to-output references, finite numeric output rules, source row accounting, and successful rendering.

Generated analytical assertions must check meaningful properties, such as known fixture totals or counts derived independently. Passing self-written assertions is supporting evidence, not a guarantee.

Allow at most two automatic repair attempts after candidate failure. Further attempts require a user retry or clarification. Cancellation prevents all late completion events from promoting a result.

## 8.3 Undo and restore

Editor undo handles prose, document structure, and data-block insertion or removal. A block's successful AI change creates a separate artifact checkpoint and Undo change action.

Restore switches atomically to a previous artifact bundle, including its sources and methodology. Do not pretend that undoing a chart also undoes unrelated prose edits.

Deleting a running block cancels its work before placing it in document trash. Duplication creates a new block ID and independent conversation association; immutable source bytes may be shared internally until changed.

# 9 Desktop architecture

Use a thin Electron shell with a web-based document editor. Keep the artifact format and block runtime independent of Electron so a future browser or cloud host can implement the same contract.

| Layer               | V1 choice                   | Responsibility                                        |
| ------------------- | --------------------------- | ----------------------------------------------------- |
| Desktop shell       | Electron and TypeScript     | Windows, lifecycle, file dialogs, process supervision |
| Host UI             | React and TypeScript        | Editor, sidebar, block frame, inspectors              |
| Text editor         | Tiptap open-source core     | Rich text and custom data-block node                  |
| App build           | electron-vite               | Trusted main, preload, and renderer builds            |
| Development tooling | Bun                         | Package management, scripts, workspaces               |
| AI adapter          | Local Codex app-server      | Authentication, threads, turns, streaming, approvals  |
| Artifact compiler   | Host-owned esbuild pipeline | Browser-only compilation with approved imports        |
| Calculation         | TypeScript in Web Worker    | CSV-based analysis without generated backend code     |
| Artifact view       | Sandboxed browser frame     | Interactive output                                    |
| Storage             | Local directories and JSON  | Canonical document, sources, artifacts, recovery      |

Bun is not forced into Electron's main process. A separate Bun backend is unnecessary for this CSV-only V1. The trusted host can add runtime services later without changing the basic document model.

Use a small, pinned dependency set for generated blocks: React, the block SDK, one CSV/data utility layer, and a chart library such as Recharts. Custom SVG, canvas, and HTML remain available. The final library version and package compatibility must be pinned during implementation.

DuckDB is optional later infrastructure for larger datasets or SQL workflows. It is not a prerequisite for this release.

## 9.1 Host and agent ownership

The host owns document JSON, block ordering, source imports, canonical manifests, revision promotion, active pointers, settings, and credentials.

The agent owns only candidate artifact files in its staged block workspace. It receives read access to approved source snapshots. It does not receive write access to canonical document storage.

Build commands use trusted configuration outside the agent-writable directory. Never run an agent-provided package.json script, Vite config, build plugin, or dependency install as part of rendering a candidate.

## 9.2 Codex protocol adapter

Start and supervise a compatible local app-server child process over stdio. Initialize the connection, inspect account state, start or resume a thread per block, submit turns, stream events, handle required approvals, and support interruption.

Map provider events to application state through an adapter. Persist application run IDs, thread IDs, and checkpoint associations. Do not scatter raw protocol assumptions across editor components.

Provider completion alone does not activate a result; host validation does. Process exit, disconnection, duplicate events, and interrupted turns must be handled idempotently.

Limit the child process environment to required variables. Avoid inheriting unrelated API keys or unrestricted user MCP configuration into block sessions.

# 10 Isolation and data access

## 10.1 Browser rendering

The host renderer uses context isolation, sandboxing, and no Node integration, with a narrowly typed preload bridge. Generated content receives no Electron preload bridge.

Render blocks in sandboxed frames on a separate origin from the editor. Use an opaque-origin iframe with script execution enabled and without same-origin, forms, popup, or navigation privileges. Do not use inline generated DOM in the editor.

Use a strict content security policy that allows only host-delivered artifact resources and forbids arbitrary network connections. Bundle dependencies locally. Validate message schema, size, frame identity, and run identity; communicate through a dedicated capability-bound MessagePort rather than trusting origin alone.

The iframe may request its own approved data, parameters, result export, or bounded resize. It cannot request a path read, spawn a process, access another block, or invoke Codex.

A browser iframe alone does not guarantee isolation from CPU exhaustion. Calculation workers must be terminable, frame responsiveness must be monitored, and the host must support unloading a blocked visualization. A hanging block must not prevent document recovery.

## 10.2 Agent execution

A working-directory setting is not filesystem isolation. Configure and verify the actual Codex sandbox and tool permissions on the supported platform.

The session may read its approved source copies and write its draft directory. Network access and arbitrary dependency installs are denied by default. Where a tool needs broader access, the request must be surfaced through a concrete approval or refused; it cannot silently relax the sandbox.

Source data and generated files are untrusted inputs. CSV text that resembles an instruction must remain data. Immutable hashes and host path checks protect canonical files even if an agent disregards its skill.

If the selected tool or operating system cannot enforce the required boundary, that configuration is not a supported V1 release path.

## 10.3 Local services and privacy

Prefer Electron IPC and app-managed resource serving over an exposed local HTTP API. If loopback HTTP is necessary, bind only to loopback, authenticate access with per-session capabilities, validate origin and host, and expose no path-based filesystem endpoint.

Credentials live in supported provider storage or the OS credential store, never inside documents. Telemetry is off by default. Diagnostic logs must redact credentials and source row contents unless a user explicitly includes them in a local diagnostic export.

# 11 Storage and portability

Each document is a directory with a versioned manifest and editor content. The application offers Reveal folder and Open folder. Moving or copying the directory preserves the document without its original absolute path.

```text
document/
  document.json
  content.json
  sources/
    source-id/
      revision-id/
        original.csv
        source.json
  blocks/
    block-id/
      block.json
      revisions/
        revision-id/
          artifact.json
          analysis.ts
          view.tsx
          checks.ts
          results/
          run.json
      drafts/
  history/
```

document.json stores the document ID, title, format version, timestamps, and app compatibility metadata. content.json stores canonical Tiptap JSON and stable data-block references.

block.json stores title, attached source references, active artifact pointer, parameter and UI state, and local conversation metadata. Provider credentials are excluded. Cached runtime assets can be rebuilt and are not canonical content.

The on-disk schema and SDK are public parts of the open-source project. Generated code is available through ordinary files even though hidden in the normal UI.

## 11.1 Saving and recovery

Autosave editor changes after 500 ms of idle time and flush before close. Use temporary writes and atomic replacement, with a recovery journal for coordinated updates. Saved status appears only after durable write completion.

Do not continuously rewrite immutable source and artifact revisions. Retain checkpoints until explicit cleanup. Deleting a document moves it to recoverable application trash; permanent deletion is a separate action.

Use a document lock to prevent concurrent writes by multiple app instances. A second instance opens read-only. Detect external file modifications and offer reload or Save a copy; never overwrite them silently.

Unknown newer major formats open read-only with a compatibility explanation. Future migrations make a recovery copy before changing canonical content.

# 12 Performance and accessibility

These are release targets measured on a Mac mini M4 with 16 GB RAM, not claims about an implementation that already exists.

- Cold launch to usable empty editor: within 3 seconds.

- Cached 200-block document, including five data blocks, opens within 2 seconds.

- Ordinary typing should remain within a 50 ms p95 input-to-paint budget during background generation.

- A 25 MiB supported CSV import completes within 5 seconds without blocking editor input.

- Typical filters over 100,000 rows settle within 1 second; longer operations show progress and cancellation.

- Inactive data blocks suspend expensive rendering while preserving saved output and controls.

- A runaway analysis can be terminated within 2 seconds of Stop.

- Generation time is provider-dependent; show elapsed time and meaningful state.

The application and generated UI SHOULD meet WCAG 2.2 AA expectations: keyboard operation, visible focus, labelled controls, readable contrast, and no color-only encoding. Result tables provide an accessible alternative to chart marks. Support system reduced-motion settings and standard macOS keyboard shortcuts.

# 13 Failure behavior

| Situation                       | Required response                                                                     |
| ------------------------------- | ------------------------------------------------------------------------------------- |
| Not authenticated               | Retain prompt and source; offer connection                                            |
| Usage limit or provider failure | Keep working result; show retry guidance                                              |
| Ambiguous request               | Ask inside the selected block                                                         |
| Empty valid CSV                 | Show empty-data state; do not fabricate a visualization                               |
| Invalid CSV                     | Explain parse error and affected rows; do not truncate                                |
| Missing required column         | Retain old revision; request adaptation                                               |
| Build or analysis failure       | Keep active revision; retain draft and diagnostics                                    |
| Cancelled generation            | Stop work; never promote late output                                                  |
| Runtime crash                   | Unload frame; retain document and inspectable results                                 |
| App crash                       | Recover saved editor state and complete active pointer                                |
| Disk full or permission denied  | Show unsaved state; preserve recoverable changes                                      |
| External document modification  | Prevent silent overwrite                                                              |
| Offline                         | Permit editing and existing local interactivity; disable AI requests with explanation |

Error messages describe the problem and the available action. Full stack traces are optional diagnostics.

# 14 Acceptance criteria

Each item is a release gate.

| ID  | Scenario                                                    | Expected outcome                                                            |
| --- | ----------------------------------------------------------- | --------------------------------------------------------------------------- |
| A01 | Launch without authentication                               | Create and edit a document                                                  |
| A02 | Use editor controls                                         | Format, insert, reorder, duplicate, undo, and delete ordinary blocks        |
| A03 | Save and reopen                                             | Restore title, content, order, and block references                         |
| A04 | Import supported CSV variants                               | Preserve bytes and expose correct parse settings                            |
| A05 | Import malformed or oversized CSV                           | Explain failure without silent row loss                                     |
| A06 | Generate from a real CSV                                    | Render custom interactive output using complete accepted data               |
| A07 | Ask for DAU without a user identifier or suitable aggregate | Clarify or label the available measure accurately                           |
| A08 | Inspect output                                              | Identify source revision, methods, assumptions, exclusions, and result rows |
| A09 | Change a filter                                             | Recompute locally, persist values, and make no AI request                   |
| A10 | Ask a block-specific revision                               | Change only that block's candidate files                                    |
| A11 | Cancel or fail a revision                                   | Preserve the last working artifact                                          |
| A12 | Restore a revision                                          | Restore code, data references, methodology, and results together            |
| A13 | Replace a compatible CSV                                    | Rerun and promote new source and output together                            |
| A14 | Replace an incompatible CSV                                 | Keep old result and show pending source issue                               |
| A15 | Disconnect or restart Codex                                 | Keep document usable and recover the block workflow                         |
| A16 | Crash during promotion                                      | Reopen a complete old or new revision, never mixed state                    |
| A17 | Copy document directory                                     | Open it elsewhere with sources and saved artifacts intact                   |
| A18 | Attempt forbidden file or network access                    | Deny it without exposing host privileges                                    |
| A19 | Feed prompt-like CSV text                                   | Treat it as data and preserve block access restrictions                     |
| A20 | Hang calculation or visualization                           | Recover editor use and retain source and result inspection                  |
| A21 | Navigate by keyboard                                        | Operate editor, block controls, inspectors, and runtime controls            |
| A22 | Use installed release on a clean supported machine          | Complete the workflow without a terminal or development toolchain           |

Analytical verification fixtures MUST cover counts versus distinct counts, sums versus averages, null handling, duplicate rows, leading-zero identifiers, ambiguous dates, and filtered populations. Deterministic checks compare result tables to known expected values.

AI integration tests MUST include a small fixed set of representative CSV tasks, clarification, a successful follow-up, cancellation, and a deliberately broken candidate. Separate provider-dependent tests from the deterministic local test suite.

# 15 Implementation sequence

## Milestone 1 Document foundation

Build the packaged Electron shell, local document lifecycle, Tiptap editor, custom data-block node, stable IDs, autosave, trash, and crash recovery.

Exit condition: a mixed document containing placeholder data blocks survives close, reopen, duplication, reorder, and recovery.

## Milestone 2 Data and runtime contract

Implement CSV import, source snapshots, parse inspection, SDK types, a hand-authored interactive block, calculation worker, result data, and methodology inspection.

Exit condition: a manually authored artifact can filter real CSV data, expose its method, persist state, and reopen without AI.

## Milestone 3 Codex authoring loop

Add connection, per-block threads, staged candidate files, block-scoped tools, progress, clarification, cancellation, and bounded repair.

Exit condition: a prompt generates and revises an artifact while ordinary document editing remains responsive.

## Milestone 4 Validation and recovery

Implement atomic promotion, source replacement, revision restore, sandbox verification, dependency restrictions, and runtime failure handling.

Exit condition: failure, cancellation, denied access, and crashes preserve a consistent working document.

## Milestone 5 Real use and release

Build a product-usage report from a representative CSV export. Observe a nontechnical user completing a real task without explaining the underlying project structure. Fix interaction and analytical-inspection failures before expanding scope.

Package the app with a reproducible dependency setup and supported runtime provisioning. Audit bundled dependency licenses, publish format and SDK documentation, include sample CSV fixtures, and provide one-command contributor setup.

Exit condition: at least one recurring report is updated in place, and a second user completes the central workflow without editing code.

# 16 Later development

After V1, add document-context chat that can read prose and selected blocks, then propose or apply document edits with clear revision boundaries. Existing block identities and the artifact API should support this without replacing V1 files.

Subsequent work can add cross-block dependencies, source connectors, larger analytical runtimes, open publishing to user-selected providers, and portable report bundles.

A managed commercial offering can later operate cloud runtimes, scheduled refreshes, AI usage, shared workspaces, and enterprise controls. The local product and user-directed publishing remain free. Hosted inference must use its own supported authentication and billing arrangement rather than repurposing local subscription authentication.

Preserve portability through a versioned artifact format and runtime adapter. Do not build multi-user storage, billing, or cloud orchestration as hidden V1 prerequisites.

# 17 External integration references

These references support platform integration choices. The product behaviors and schemas above are project requirements.

- [Codex app-server](https://learn.chatgpt.com/docs/app-server) documents threads, turns, events, interruption, and account flows. Verify supported authentication and sandbox behavior against the pinned release.

- [Sign in with ChatGPT app-server integration](https://developers.openai.com/siwc/token-sharing-open-source/codex-app-server) is the documented alternative when the application owns its ChatGPT authorization lifecycle.

- [Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security/) informs the host renderer, preload, IPC, sandbox, and navigation boundaries.

- [Tiptap open-source editor](https://tiptap.dev/open-source-to-platform) is the proposed rich-text foundation. Use only packages with compatible open-source licenses; paid templates and services are unnecessary for this scope.
