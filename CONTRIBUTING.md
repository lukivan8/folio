# Contributing to Folio

Folio is a development-preview desktop application. The tested native target is macOS Apple Silicon; browser components and deterministic checks can also be developed elsewhere.

## Start here

1. Follow the [README setup](README.md#get-started) and create a branch from `main`.
2. Read [AGENTS.md](AGENTS.md), the [architecture](docs/ARCHITECTURE.md), and the [canonical Carbon design-system reference](docs/DESIGN_SYSTEM.md).
3. Use an isolated data/profile directory from the README. Never test externally with someone's real documents or CSV data.
4. Keep changes focused. Explain the user-visible problem, resulting behavior, and validation in your pull request.

IBM Carbon is the default design authority for Folio. Before introducing a component or interaction pattern, check for an official Carbon equivalent. Prefer Carbon components, tokens, and documented behavior. Custom implementations require a concrete product need and must remain consistent with Carbon. The linked design-system document is the single canonical reference.

## Implement and verify

- UI changes belong with adjacent Storybook stories, including useful empty, error, narrow, focus, and keyboard states. Follow [component development](docs/COMPONENTS.md).
- Preserve document/source/artifact identities and portable formats. Keep original CSV bytes, frozen revisions, parameters, methodology, drafts, and conversations intact.
- Separate analysis from visualization. Update authoring instructions/templates when changing generated output contracts.
- Add meaningful regressions for behavioral fixes. Prefer tests of observable results over copies of implementation details.
- Never hand-edit generated bundles or `node_modules`. Commit the lockfile when intentionally changing dependencies.

Before submitting:

```sh
npm test
npm run check:ui
npm run build
```

For compiler or packaged-runtime changes, also run `npm run package` and `npm run test:package` on the supported Mac. For native workspace changes, inspect wide/narrow desktop layouts and verify focus, overlays, scrolling, resizing, save, and reopen. Provider checks are opt-in and use synthetic data only; they are not prerequisites for ordinary contributions.

Refresh license notices after production dependency changes with `node scripts/licenses.mjs`, then review the generated inventory. The precompiled Storybook workspace fixture is synthetic and can be regenerated intentionally with `npx tsx scripts/story-fixture.ts`; inspect its diff and rerun UI checks.

## Pull requests

Describe the concrete trigger and before/after behavior. Include relevant checks and screenshots for visible changes, plus any known limits. Do not include private documents, auth state, provider transcripts, diagnostic dumps, or generated application binaries. Existing specification styling choices are historical; current Carbon guidance takes precedence.

There is no CLA. Contributions are submitted under the repository's MIT license; third-party material must retain its original license and attribution.
