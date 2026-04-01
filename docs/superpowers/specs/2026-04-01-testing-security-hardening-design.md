# Testing & Security Hardening Design

**Date:** 2026-04-01
**Status:** Approved
**Scope:** Two-phase hardening of spain-ai-kit monorepo

## Context

The monorepo ships two MCP servers (INE statistics, BOE legislation) that proxy requests to Spanish government APIs. Current state: 29 tests passing (unit + integration), Zod type validation on inputs, retry/timeout/caching in the HTTP client. No CI, no input sanitization beyond types, no error wrapping in tool handlers, no dependency automation.

## Phase 1: Essentials

Ship as a single PR. Goal: prevent real problems from day one.

### A. GitHub Actions CI

File: `.github/workflows/ci.yml`

- **Trigger:** push to `main`, all PRs
- **Matrix:** Node 20, Node 22 (active LTS lines)
- **Jobs:**
  1. `build-and-test` — install, build, unit tests, `npm audit --audit-level=moderate`
  2. `integration` — runs on push to `main` only (not PRs). These tests hit live government APIs and can be slow/flaky. Separate job so PR checks stay fast.
- **Timeout:** 10 minutes per job

### B. Input Validation

Add validation helpers to `@spain-ai-kit/shared` and apply at the top of each MCP tool handler.

| Helper | Rule | Applied To |
|--------|------|-----------|
| `validateBOEId(id)` | Regex `^BOE-[A-Z]-\d{4}-\d+$` — rejects path traversal, whitespace, special chars | `get_document`, `get_document_metadata`, `get_document_analysis`, `get_document_index`, `get_article`, `read_corpus_law` |
| `validateDateBOE(date)` | Regex `^\d{8}$` + valid date check via `Date` constructor | `get_daily_summary`, `search_legislation` from/to params |
| `validateNumericId(id)` | Positive integer, max 999999999 | `get_operation`, `list_tables`, `get_table_data`, `get_variable_values` |
| `validateSeriesCode(code)` | Regex `^[A-Za-z0-9]+$` — alphanumeric only, no path chars | `get_series` |
| `validateBlockId(id)` | Regex `^[A-Za-z0-9_-]+$` — alphanumeric, hyphens, underscores | `get_article` blockId |

Each validator throws a descriptive error that the error wrapper (section C) catches and returns as an MCP error response.

### C. Error Wrapping in MCP Tools

Wrap every tool handler in a try/catch that:

1. Catches axios errors — extracts status code and message, returns MCP error content (`isError: true`) with a user-friendly message (e.g., "Document BOE-A-2000-544 not found (HTTP 404)")
2. Catches validation errors — returns the validation message as MCP error content
3. Catches unexpected errors — returns generic "Internal error" message, logs full error to stderr
4. Never exposes raw stack traces or internal paths to the LLM

Implementation: a shared `wrapToolHandler` higher-order function in `@spain-ai-kit/shared` that each server uses.

### D. Node Version Pinning

- Add `"engines": { "node": ">=20" }` to root `package.json`
- Add `.nvmrc` containing `20`

## Phase 2: Comprehensive Hardening

Ship as a second PR after Phase 1 merges.

### E. Pre-commit Hooks

Install `husky` + `lint-staged` as dev dependencies.

- **lint-staged config:** run `prettier --check` and `tsc --noEmit` on staged `.ts` files
- **husky setup:** `.husky/pre-commit` runs `lint-staged`
- Prevents broken builds and formatting drift from being committed

### F. Dependency Automation

File: `.github/dependabot.yml`

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
    groups:
      minor-and-patch:
        update-types: ["minor", "patch"]
    open-pull-requests-limit: 5
```

`npm audit` already runs in CI from Phase 1.

### G. Explicit XML Parser Security Config

Update `packages/shared/src/xml.ts` XMLParser options:

```typescript
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  processEntities: false,
  htmlEntities: false,
});
```

Defaults are already safe in fast-xml-parser v5, but explicit config:
- Documents security intent for future maintainers
- Survives version upgrades that might change defaults
- Makes security auditors happy

### H. Rate Limiting

Add a token-bucket rate limiter to `BaseAPIClient`:

- New constructor option: `maxRequestsPerSecond` (default: unlimited for backward compat)
- INE server sets: 10 req/sec
- BOE server sets: 5 req/sec
- Implementation: track timestamps of last N requests, delay if bucket is empty
- Prevents runaway LLM tool-call loops from hammering government APIs

### I. Corpus Error Logging

Replace silent `catch {}` blocks in `mcp/boe/src/corpus.ts` with `console.error` calls:

- `buildIndex` directory read errors: log which directory failed
- `search` file read errors: log which file was unreadable
- `readLaw` read errors: log the file path

Add `SPAIN_AI_KIT_DEBUG=1` env var support for verbose corpus indexing output (file count per jurisdiction, total index time).

### J. Security Tests

New test files focused on security boundaries:

**`packages/shared/src/validation.test.ts`:**
- Path traversal in BOE IDs rejected (`../../../etc/passwd`)
- Malformed dates rejected (`99999999`, `abcdefgh`, empty string)
- Negative/zero/huge numeric IDs rejected
- Series codes with special chars rejected
- Valid inputs accepted (positive cases)

**`packages/shared/src/xml.test.ts` (additions):**
- XML with entity declarations doesn't expand them
- XML with external entity references doesn't resolve them

**`mcp/boe/src/index.test.ts` (additions):**
- Tool handler returns MCP error format (not raw exception) for invalid input
- Tool handler returns MCP error format for HTTP 404/500

**`mcp/ine/src/index.test.ts` (additions):**
- Same error-format tests for INE tools

### K. Resilience Tests

**`packages/shared/src/api-client.test.ts` (additions):**
- Concurrent requests to the same endpoint use cache (not duplicate HTTP calls)
- Rate limiter delays requests when bucket is empty

**`mcp/boe/src/corpus.test.ts` (new):**
- Concurrent `search()` calls don't double-build the index (regression test for race condition fix)

## File Change Summary

### Phase 1
| File | Action |
|------|--------|
| `.github/workflows/ci.yml` | Create |
| `packages/shared/src/validation.ts` | Create — input validators |
| `packages/shared/src/validation.test.ts` | Create — validation tests |
| `packages/shared/src/error.ts` | Create — `wrapToolHandler` helper |
| `packages/shared/src/index.ts` | Update — export new modules |
| `mcp/ine/src/index.ts` | Update — wrap handlers, add validation |
| `mcp/boe/src/index.ts` | Update — wrap handlers, add validation |
| `package.json` | Update — add `engines` field |
| `.nvmrc` | Create |

### Phase 2
| File | Action |
|------|--------|
| `.github/dependabot.yml` | Create |
| `packages/shared/src/xml.ts` | Update — explicit security config |
| `packages/shared/src/xml.test.ts` | Update — entity expansion tests |
| `packages/shared/src/api-client.ts` | Update — rate limiter |
| `packages/shared/src/api-client.test.ts` | Update — rate limiter + concurrency tests |
| `mcp/boe/src/corpus.ts` | Update — error logging |
| `mcp/boe/src/corpus.test.ts` | Create — concurrency regression test |
| `mcp/boe/src/index.test.ts` | Update — error format tests |
| `mcp/ine/src/index.test.ts` | Update — error format tests |
| `package.json` | Update — add husky, lint-staged |
| `.husky/pre-commit` | Create |

## Success Criteria

- CI runs on every PR and blocks merge on failure
- All MCP tool inputs validated before reaching external APIs
- No raw stack traces or internal paths exposed to LLM consumers
- Dependency updates automated via Dependabot
- Pre-commit hooks prevent broken builds
- Security test suite covers path traversal, entity expansion, error format
- Rate limiting prevents API abuse from runaway tool loops
