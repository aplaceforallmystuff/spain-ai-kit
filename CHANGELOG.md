# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### BOE corpus fix

- BOE package 0.1.2 adds `SPAIN_AI_KIT_CORPUS_PATH` for installed-package deployments, informational corpus diagnostics, and search/read regression coverage (community PR #40 by @Ayorinha; fixes #38).
- Corrected escaped template literals and preserved newline-based search snippets during integration.
- Updated the BOE package documentation and refreshed release dependencies; the BOE workspace audit reports no vulnerabilities.
- Use the patched Zod package through its compatible `zod/v3` entry point across workspaces and remove obsolete TypeScript suppression comments, so the monorepo production audit also passes.

### Security

- Resolved all 83 open Dependabot alerts (7 critical, 23 high, 49 moderate, 4 low) — every alert on the repository now reports `fixed`, and `npm audit` reports 0 vulnerabilities
- Runtime dependency floors raised so downstream consumers resolve patched versions, not just this repo's lockfile: `axios` `^1.11.0` → `^1.18.1` (28 advisories including proxy credential leaks, SSRF via NO_PROXY bypass, and prototype-pollution MitM), `@modelcontextprotocol/sdk` `^1.17.0` → `^1.30.0` (pulls patched `hono`, `express`/`body-parser`, `qs`, `ajv`/`fast-uri`, `express-rate-limit`/`ip-address`), `fast-xml-parser` → `^5.10.1`
- Dev tooling upgraded: `vitest` `^2.0.0` → `^4.1.10` (critical: arbitrary file read/execute via the Vitest UI server), `nx` `^21.4.0` → `^23.1.0`, `tsx` → `^4.23.1`
- Added npm `overrides` for `axios` and `brace-expansion`, which `nx` pins to exact vulnerable versions. These are dev-tooling only — no published package depends on an override to be non-vulnerable

### Changed

- Test scoping now pinned by an explicit `vitest.config.ts` per workspace, extending a shared `vitest.shared.ts`. vitest 4 dropped `**/dist/**` from its default `exclude`, which made every suite run twice — the second time against stale compiled output

## [0.1.2] - 2026-04-01

### Added

- Catastro MCP server with 9 tools (property lookup, address resolution, geocoding)
- AEMET MCP server with 10 tools (forecasts, observations, alerts, UV, fire risk, beach conditions)
- AEMETClient in shared package for double-call API pattern with API key management
- Catastro validators (province code, municipality code, cadastral reference, coordinate)
- AEMET validators (municipio code, station ID, area code)
- User guide (`docs/GUIDE.md`) with installation, usage examples, and troubleshooting

## [0.1.1] - 2026-04-01

### Added

- Input validation for all MCP tool parameters (BOE IDs, dates, numeric IDs, series codes, block IDs)
- Error wrapping (`wrapToolHandler`) for structured MCP error responses — no raw stack traces
- Token-bucket rate limiting in BaseAPIClient (INE: 10 req/sec, BOE: 5 req/sec)
- GitHub Actions CI with Node 20/22 matrix and integration tests
- Dependabot for weekly npm and GitHub Actions dependency updates
- Pre-commit hooks via husky + lint-staged (prettier + build check)
- Corpus error logging (replaces silent catch blocks)
- `SPAIN_AI_KIT_DEBUG=1` env var for verbose corpus indexing output
- Corpus concurrency regression test

### Changed

- XML parser now explicitly disables entity processing (`processEntities: false`)
- INE cache key fix: query params passed via `params` object, not URL string
- `ineTimestampToISO` auto-detects Unix seconds vs milliseconds
- BOE metadata/analysis/index tools unwrap array responses to single objects
- Nx build ordering: shared package builds before MCP servers (`^build` dependency)
- `npm audit` in CI scoped to production dependencies only

### Fixed

- CorpusIndex race condition on concurrent `buildIndex()` calls
- Stale `.js`/`.d.ts` build artifacts in `src/` prevented by `.gitignore` rules

## [0.1.0] - 2026-03-10

### Added

- Initial monorepo scaffold with Nx + npm workspaces
- INE MCP server with 7 tools (statistics, operations, tables, series, variables)
- BOE MCP server with 13 tools (legislation search, documents, articles, corpus)
- Shared package with BaseAPIClient (caching, retry), XML parser, date utilities, NIF validator
- legalize-es corpus integration (12,000+ Spanish laws as Markdown via git submodule)
