# Component development

IBM Carbon is the default authority. Read [the canonical design-system reference](DESIGN_SYSTEM.md) before changing UI. Use current official documentation and supported public components; do not create a second implementation of a Carbon primitive.

## Ownership

- `src/styles/carbon.scss`: official Carbon React styles and local IBM Plex font registration.
- `src/styles/tokens.scss`, `src/design-system.ts`: Carbon-derived CSS/JavaScript token bridges shared with isolated artifacts; see the canonical reference for theme and package choices.
- `src/components/ui/`: thin Carbon defaults, stable IDs/accessible names for portal-mounted icon buttons, body-portal dialogs with launcher restoration for conditional owners, form labels, and notification composition. Carbon owns control styling, keyboard behavior, tooltips, focus trapping, and status visuals.
- `src/editor/`: Tiptap text extensions and a task node view mounting a real Carbon Checkbox beside a Tiptap-owned contentDOM. Checklist schema and saved documents remain unchanged. Editor styles handle prose, selection, and dragging only.
- `src/workspace/`: resizable/collapsible pane composition, source-library hook, contextual assistant/focused view, and integration stories. Navigation uses Carbon side-nav links, inspectors use Carbon tables/pagination, and overlays use Carbon menus/modals.
- `src/style.css`: remaining product-specific layout and inspection content. Do not add global overrides for Carbon component colors, fonts, focus, borders, or corners.
- `src/styles/runtime.scss`, `src/Runtime.tsx`: isolated visualization styling with official Carbon Charts CSS and offline fonts. No host privilege is exposed.

## Workflow

1. Check the official Carbon equivalent and supported variants before adding a component. Record a concrete product-specific exception in the canonical reference if Carbon cannot provide it.
2. Add/update an adjacent Storybook story using the actual production component. Include relevant disabled, loading/error, long-text, nested, read-only, keyboard, and narrow states.
3. Fix the owning component or stylesheet. Do not patch user document content to compensate for UI bugs.
4. Run `npm test`, `npm run check:ui`, and `npm run build`. Changes to compiler/runtime/package boundaries also require `npm run test:package` and native Electron verification.
5. Inspect representative wide/narrow screens. Automation does not replace an independent accessibility or visual audit.

Run `npm run storybook` at http://127.0.0.1:6006. `npm run check:ui` runs 30 Chromium stories/checks and builds a static catalog. Primitive/editor stories include axe checks. The full-workspace sandbox flow is interaction-tested; iframe content and product semantics also require native review. Fixtures never use the user's documents or real AI account.

Regenerate synthetic compiled artifacts after changing templates with `npx tsx scripts/story-fixture.ts`. Build output, release bundles, and static Storybook are excluded from Vite's development watcher.

## Regressions

- Live checklist alignment/toggling across completed, wrapped, nested, read-only, and narrow states. The Carbon checkbox is paired with the first text line, while Tiptap retains editable content.
- Typing keeps a collapsed caret and separate paragraphs, without a page-wide outline, even when app CSS loads last. Controls retain Carbon keyboard focus.
- Dialogs remain visible when the owning finding is hidden. Keyboard focus stays inside the modal and returns to its launcher after conditional unmount.
- Source chat generates a real compiler-built Carbon chart fixture, clears the composer, opens focused methodology, returns to a draft, inserts one editable finding/visualization into an open document, edits prose with the assistant closed, and restores context/drafts after remount.
- Cancellation leaves the working revision active and rejects a late response. Pane separators resize with keyboard arrows/Home/End.
