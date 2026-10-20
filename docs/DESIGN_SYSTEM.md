# Folio design system — canonical reference

IBM Carbon is the default design authority for Folio. Before introducing a component or interaction pattern, check for an official Carbon equivalent. Prefer Carbon components, tokens, and documented behavior. Custom implementations require a concrete product need and must remain consistent with Carbon.

## Authority and packages

Use current official documentation at https://carbondesignsystem.com/. Consult the installed official package types and Carbon React Storybook for implementation details. Carbon Core v11 is the supported published implementation; experimental v12 guidance is not a reason to copy unreleased components.

- `@carbon/react` 1.118.0 supplies React primitives, styles, and official icons via `@carbon/react/icons`.
- `@carbon/charts-react` / `@carbon/charts` 1.27.21 supply charts. Prefer them for supported chart types; custom SVG, canvas, or HTML is permitted for a concrete analytical need.
- Sass builds official Carbon component styles and shared tokens. `@carbon/styles`, `@carbon/themes`, `@carbon/layout`, `@carbon/type`, `@carbon/motion`, and `@carbon/colors` provide their authoritative values.
- IBM Plex Sans regular, semibold, and italic are bundled locally from `@ibm/plex`. No font CDN is needed. Generated runtimes receive embedded regular and semibold fonts.
- Recharts remains only to compile/reopen existing saved artifacts and their revisions. New templates use Carbon Charts. Material Web, Roboto, and Lucide are removed.

## Theme, typography, and layout

Use Carbon's unmodified **White** default theme. Default blue signals interaction and focus; semantic colors indicate status. Folio's name and existing book mark provide branding. Do not add a sage palette, round every surface, add decorative shadows, or create a competing token scale.

`src/styles/carbon.scss` owns official component styles and local font registration. `src/styles/tokens.scss` exports Carbon White, Carbon spacing, typography, motion, and visualization color tokens. `src/design-system.ts` exports the corresponding capability-free JavaScript theme bridge from the official Carbon packages. Product styles consume these tokens rather than duplicating palette values.

Use Carbon's productive type styles: body-01 for compact controls/tables, body-02 for document prose and assistant messages, label-01 for metadata, and fixed heading roles for hierarchy. Keep document paragraphs comfortably spaced. Use supported small control variants for analytical UI, without shrinking labels to fit. Use layers and subtle borders to group related controls. Borders and outlines indicate real boundaries or selection, rather than enclosing every paragraph/chart in a card.

Retain left document/source navigation, center working surface, and right contextual assistant/focused visualization. Use official side-navigation links, Search, ContentSwitcher, Tabs, tables, Pagination, buttons, menus, modals, tags, notifications, and loading states inside that composition. Carbon owns focus rings, tooltip placement, disabled states, menu keyboard behavior, modal focus trapping, and status icons.

The desktop uses Carbon lg/md/sm breakpoints for responsive behavior. Wrap controls, allow table scrolling, and make pane collapse/return actions keyboard-accessible. Respect reduced motion. Preserve native macOS traffic lights, titlebar dragging regions, keyboard shortcuts, filesystem dialogs, and the Electron isolation boundary.

## Visualization contract

`src/styles/runtime.scss` supplies Carbon White tokens, supported control styles, and presentation rules inside each opaque-origin artifact iframe. `Runtime.tsx` adds the official Carbon Charts stylesheet and embedded Plex fonts. The host renders one title; the generated view omits its own title, card shell, chat, progress controls, and automatic KPI grids.

The approved compiler accepts `@carbon/charts-react`, `@carbon/react`, `@carbon/react/icons`, React, and `@folio/sdk`. Styles are already supplied by the runtime: generated source must not import CSS, install packages, fetch fonts, or load external resources. The SDK exports `carbon` with White theme values, chart defaults, and the official categorical palette. Use `carbon.chartOptions` as a base and Carbon's `ScaleTypes` enum. Configure meaningful axes, units, legends for multiple series, labelled filters, tooltips, accessible chart descriptions, and empty/error states. Disable animation by default; do not hardcode arbitrary colors or fonts.

The manifest, result datasets, source snapshots, parameters, methodology, and declared checks remain authoritative. Visual controls patch declared parameters and recompute locally without changing assistant context. Clearly distinguish row counts from distinct people, report missing/excluded rows, show date ranges/freshness/incomplete periods when relevant, and state analytical caveats. Passing declared checks is not independent verification.

## Justified exceptions

1. **Resizable desktop workspace:** pane geometry, splitters, native titlebar regions, and pane/context persistence are product-specific. Carbon does not supply Folio's editor/source/assistant arrangement. These use Carbon tokens, keyboard-operable separators, and supported primitives internally.
2. **Tiptap editing:** rich-text editing, inline document/visualization title inputs, dragging handles, and the caret-anchored slash-command list must retain Tiptap's transaction/contentDOM behavior. The task node view mounts an actual Carbon Checkbox beside Tiptap-owned editable content; the slash menu composes Carbon Buttons while the editor retains keyboard focus. Formats are unchanged. Editor tables are editable Tiptap nodes styled with Carbon tokens; inspectors use official Carbon Table components.
3. **Conversational and analysis content:** message history, composer orchestration, methodology, revision comparisons, and analytical notes are product content, composed with Carbon fields, notices, tabs, tables, and actions. They are not copies of a Carbon primitive.
4. **Saved artifacts:** stored analysis/view source is not rewritten merely to change design systems. Their calculations, source/artifact IDs, and snapshots stay intact. The runtime neutralizes the outer decorative shell and shares Carbon typography/tokens. Three deprecated Material color-variable names map to Carbon tokens _only inside artifact frames_ so existing saved views continue rendering. There are no Material components, stylesheets, fonts, or dependencies in the host. Hard-coded internal compositions in saved custom views may retain their original chart geometry/palette until revised.

## Official references

- [React installation, styles, and icons](https://www.carbondesignsystem.com/getting-started/developing/carbon-core/react)
- [Theme tokens and default White](https://www.carbondesignsystem.com/building-blocks/foundations/themes/overview)
- [Typography](https://www.carbondesignsystem.com/building-blocks/foundations/typography/overview)
- [Spacing](https://www.carbondesignsystem.com/building-blocks/foundations/spacing/overview)
- [Component guidance](https://www.carbondesignsystem.com/building-blocks/core/components/menu/guidelines)
- [Data visualization overview](https://www.carbondesignsystem.com/building-blocks/data-visualization/overview)
- [Visualization palettes](https://www.carbondesignsystem.com/building-blocks/data-visualization/color-palettes)
- [Carbon Charts React/API](https://charts.carbondesignsystem.com/)

Use this file as the single design-system reference. Contributor instructions, authoring guidance, and component documentation link here rather than defining competing themes.
