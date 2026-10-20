# Architecture and public format v1

## Process boundaries

- Electron main owns file dialogs, durable storage, locks, integrity checks, compilation, and Codex supervision. The host renderer has context isolation and Chromium sandboxing enabled, Node integration disabled, and a typed preload bridge with individual IPC methods. Only the top-level trusted renderer can call these methods. Navigation, popups, and browser permissions are denied.
- React and Tiptap own one ordered document of blocks: paragraphs, headings, lists, tables, and data. A shared gutter inserts, duplicates, deletes, and reorders any top-level block, including pointer dragging with a drop guide. New workspaces begin with a blank paragraph, and the data assistant opens only on request. A stable `dataBlock` node references block state by UUID. Official Carbon React components supply controls, navigation, tables, menus, overlays, and states. IBM Plex fonts and the default White theme are bundled locally; the [canonical design-system reference](DESIGN_SYSTEM.md) governs UI changes.
- Generated React/TypeScript is type-checked through a read-restricted compiler host and bundled with trusted esbuild configuration. It cannot supply build plugins, install packages, or execute a build script. Static imports are limited to React, ReactDOM, Carbon React/icons, Carbon Charts React, legacy Recharts, `@folio/sdk`, and the virtual artifact modules. Dynamic imports and `require` are rejected. The runtime SDK is a context/props contract; no host-privileged function is exposed.
- A generated view is served through the capability-addressed `folio-artifact:` protocol and runs in an opaque-origin `sandbox="allow-scripts"` iframe with no preload bridge. A nonce-based CSP denies network, forms, arbitrary external resources, and evaluation. A fresh MessageChannel is bound to the exact frame on load; only validated parameters, bounded resize, result/check records, errors, and heartbeat messages are accepted. Analysis and analytical assertions run in a terminable worker. The app unloads an unresponsive frame and retains saved results.
- Codex app-server communicates over stdio. The pinned release uses a named `folio` permission profile allowing minimal platform reads and the empty agent directory, denying other reads/writes and command network access. Source access uses a host-owned `read_source` dynamic tool, limited to that block's approved source IDs and pages of at most 500 rows. Host shell, browser, apps, plugins, hooks, skill discovery, code mode, and user MCP servers are disabled. No provider tokens are read by application code or copied into documents. Account and login operations use the official protocol.

## Document directory

```text
document/
  document.json                 # version, identity, title, timestamps, trash state
  content.json                  # Tiptap JSON with stable block references
  state.json                    # complete transaction snapshot for deterministic reopen
  integrity.json                # fingerprint of all persisted document files
  .folio-lock                   # process lock; not portable content
  sources/<source-id>/<revision-id>/
    original.csv                # exact UTF-8 input bytes, including original BOM/newlines
    source.json                 # parse settings, schema, hash, import details
  blocks/<block-id>/
    block.json                  # active pointer, parameters, prompt, conversation association
    revisions/<revision-id>/
      artifact.json
      analysis.ts
      view.tsx
      checks.ts
      results/data.json
      run.json
    drafts/last.json             # retained failed draft and diagnostics
  history/recovery.json          # write-ahead recovery journal, removed on completion
```

`state.json` is the atomic transaction checkpoint; readable sidecars expose its source, artifact, editor, and run records. A durable recovery journal is written before projections and the final state snapshot. Startup completes an interrupted journal before loading. Sources and artifact directories are immutable after creation. The active revision pointer lives in the transaction snapshot, preventing a partial code/data promotion.

All identity-based path segments are validated. Symbolic links in document trees are rejected. External changes are detected through a fingerprint across the complete directory; an already-open document is not silently overwritten. A document changed while closed opens read-only if its integrity stamp differs. Use a copy to preserve recoverable application state, or repair the external files separately. Unknown format versions and concurrent locks also open read-only. Stale process locks are recovered. Trash is a recoverable document flag, never permanent deletion.

A portable copy excludes the process lock and contains all CSV bytes, sources, code, methods, results, parameters, and conversations required for local inspection. It contains no credentials. Duplicate operations assign new document/block identities and discard provider thread associations.

## Artifact SDK

Public TypeScript types live in `src/sdk.ts` and `src/model.ts`. `analyze(context)` receives only approved `sources`, validated `params`, and JSON `state`. Sources contain stable column IDs and raw row strings. `checks(result, context)` returns named pass/fail assertions. `View({result, params, setParams})` renders a custom React interface. Parameters are declared by the manifest and validated by the host; changing them recomputes in the local worker, without AI.

The manifest supplies source IDs, named parameters, and method steps with column references, formulas, units, missing-value policies, assumptions, and output names. The host validates source confinement, method/output relationships, numeric finiteness, table width, source row accounting, and analytical checks before promotion. DOM mount readiness is checked before activation; passing these checks does not establish independent analytical correctness.

## Sources and limits

CSV parsing runs in a dedicated import worker. Supported encodings/dialects: UTF-8, optional BOM, comma/semicolon/tab delimiters, quotes/escaped quotes, embedded newlines, LF/CRLF. Limits are 25 MiB, 100,000 data rows, 200 columns, five sources. Limit and malformed-record failures reject the import instead of truncating it. Raw strings remain canonical. Identifiers and leading zeros remain strings. Ambiguous dates remain text with warnings; user overrides must pass typed-value validation.

The source inspector offers full counts, complete paginated/searchable raw and typed previews, parsing corrections, immutable replacement revisions, and original-byte downloads. A compatible source replacement is rerun and promoted with its output; an incompatible replacement remains pending while the old working bundle remains active.

## Integration references

- [Official Codex app-server](https://learn.chatgpt.com/docs/app-server)
- [Official permission-profile schema](https://learn.chatgpt.com/docs/config-file/config-reference)
- [Electron security](https://www.electronjs.org/docs/latest/tutorial/security/)
- [IBM Carbon](https://www.carbondesignsystem.com/)

## Shared sources and workspace presentation

The `_sources/<source-id>.json` library lives under the local document-store root. Each record owns an original source snapshot and independent exploration block, revisions, conversation, and draft. Writes are atomic and use a disk digest to reject conflicting updates. Existing document sources are registered additively without rewriting document content or source/artifact IDs.

Adding a finding creates a fresh block instance while preserving immutable artifact revision IDs, source IDs, source snapshots, code, methodology, and current parameters. It inserts a plain editable paragraph beside the functioning block. Provider thread associations and chat are not copied into that new block. Portable documents remain self-contained; the source exploration library is local to the workspace and is not included in an individual document export.

Navigation and working-surface selection, pane sizes/visibility, assistant context, focus mode, and chat scroll positions use local workspace preferences. They are not analytical inputs and do not alter portable source/revision bundles. Charts mount through the same isolated runtime in inline or focused presentation. The runtime shares Carbon theme/control CSS, official Carbon Charts styles, and embedded bundled IBM Plex fonts; it suppresses a leading generated title because the host owns the title.

Shared-source refresh keeps the source identity and creates a new imported revision requiring parsing review. Existing artifact bundles keep their frozen input snapshots until a new revision is generated. A source refresh does not silently change results in every referencing document.

## Carbon runtime resources

The trusted runtime HTML shell is capped at 1 MiB to accommodate embedded Carbon chart/control styles and two offline Plex fonts. CSV input and generated code remain separate, with their existing source/result/code bounds. Opaque-origin sandboxing, nonce CSP, blocked network access, workers, source confinement, and validation/promotion remain unchanged. The JavaScript SDK exposes a serializable Carbon theme bridge without host capabilities. The compiler resolves approved Carbon packages through their official ESM entries so unused components/charts are excluded.

Optional `FOLIO_PROFILE_DIR` isolates Electron preferences during QA; normal application storage is unchanged. Contributor/agent guidance lives in [AGENTS.md](../AGENTS.md) and links to the one [design-system reference](DESIGN_SYSTEM.md).

Runtime frame heights are bounded to 3,000 CSS pixels so explanatory notes can scroll with the pane/document rather than forcing a second inner scrollbar, while pathological output remains bounded.
