# Security

Folio is a development preview, not an independently audited security product. Only the current `main` branch is maintained at present. Known limits and verified boundaries are documented in [VERIFICATION.md](docs/VERIFICATION.md) and [ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Report a vulnerability

Use [GitHub private vulnerability reporting](https://github.com/lukivan8/folio/security/advisories/new). Include affected versions/commits, the boundary involved, reproduction steps using synthetic data, and the observed impact. If private reporting is unavailable, open a public issue asking for a private contact channel **without publishing exploit details or sensitive data**. There is no guaranteed response SLA or bug bounty.

Do not attach real CSV data, portable documents, chat transcripts, credentials, or local profile directories to public reports.

## Trust boundaries

Electron owns filesystem access, provider integration, and the trusted compiler. Generated visualization frames have no preload/host bridge; restrictive CSP and validated messages constrain them. Worker calculations and candidate promotion checks do not independently prove analytical correctness. AI generation can disclose prompts and source content read by the agent to the provider; local storage is not offline inference.

Preserve these boundaries when contributing. Do not weaken sandboxing, source confinement, import allowlists, message validation, or candidate checks to make generated content work. Use synthetic sources and separate data/profile paths for testing.
