# Folio contributor and agent guidance

IBM Carbon is the default design authority for Folio. Before introducing a component or interaction pattern, check for an official Carbon equivalent. Prefer Carbon components, tokens, and documented behavior. Custom implementations require a concrete product need and must remain consistent with Carbon.

Read [the canonical design-system reference](docs/DESIGN_SYSTEM.md) before UI or generated-artifact changes. It defines supported packages, theme, token ownership, runtime integration, official documentation, and the limited product-specific exceptions. Do not introduce a second design system, brand color overrides, or copies of Carbon controls.

Preserve portable document/source/artifact formats and identities. Pane preferences must not become analytical inputs. Keep original CSV bytes, frozen revision snapshots, parameters, methodology, conversations, and saved drafts intact. Never use a real user's data in external test requests; use synthetic fixtures for AI verification.

Use adjacent Storybook stories for component changes and meaningful interaction regressions. Run `npm test`, `npm run check:ui`, and `npm run build`; packaged-runtime changes also require `npm run test:package`. Verify native Electron integration and representative wide/narrow layouts when changing the workspace. Follow [component development](docs/COMPONENTS.md) and [verification](docs/VERIFICATION.md).

For setup on another machine and public contribution workflow, see [README.md](README.md) and [CONTRIBUTING.md](CONTRIBUTING.md). Keep private workspaces, profiles, credentials, original user CSVs, and generated application binaries out of Git. Public fixtures and screenshots must use synthetic data.
