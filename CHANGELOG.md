# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- Catastro MCP server with 9 tools (property lookup, address resolution, geocoding)
- AEMET MCP server with 10 tools (forecasts, observations, alerts, UV, fire risk, beach conditions)
- AEMETClient in shared package for double-call API pattern with API key management
- Catastro validators (province code, municipality code, cadastral reference, coordinate)
- AEMET validators (municipio code, station ID, area code)
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
- BOE MCP server with 14 tools (legislation search, documents, articles, corpus)
- Shared package with BaseAPIClient (caching, retry), XML parser, date utilities, NIF validator
- legalize-es corpus integration (12,000+ Spanish laws as Markdown via git submodule)
