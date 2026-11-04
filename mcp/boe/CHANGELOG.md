# Changelog

## [0.1.2] - 2026-11-04

### Fixed

- Support `SPAIN_AI_KIT_CORPUS_PATH` when using the published package. The optional legalize-es corpus remains a separate download (community PR #40 by @Ayorinha, fixes #38).
- Return informational configuration diagnostics when the corpus is unavailable.
- Preserve valid template literals and newline-based search snippets during PR integration.
- Refresh release dependencies and use the patched Zod package through its compatible v3 entry point.

### Added

- Regression coverage for configured corpus discovery, matching lines and reading complete law text.
- Installation, configuration, tool reference and troubleshooting documentation for npm users.
