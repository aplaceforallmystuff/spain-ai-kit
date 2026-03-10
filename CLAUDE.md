# Spain AI Kit

MCP servers connecting AI applications to Spanish government open data and legal infrastructure.

## What This Is

A TypeScript monorepo (Nx + npm workspaces) providing MCP servers for Spanish government APIs. Inspired by [estonia-ai-kit](https://github.com/stefanoamorelli/estonia-ai-kit).

## Spanish Service Mapping

| Estonia Equivalent | Spanish Service | API | Auth Required |
|-------------------|----------------|-----|---------------|
| Statistics Estonia | **INE** (Instituto Nacional de Estadística) | JSON-stat at `servicios.ine.es/wstempus/js` | No |
| Riigi Teataja | **BOE** (Boletín Oficial del Estado) | XML at `boe.es/datosabiertos/api` | No |
| Land Board | **Catastro** (future) | OVC/WFS at `ovc.catastro.meh.es` | No |
| Tax Board | **AEAT** (future) | cl@ve authentication | Yes |

## API Endpoints

### INE (JSON-stat API)
- Base: `https://servicios.ine.es/wstempus/js/ES/`
- Operations: list by theme, search, get series data
- Format: JSON-stat 2.0
- No auth, no rate limit documented

### BOE (Open Data API)
- Base: `https://www.boe.es/datosabiertos/api/`
- Operations: search by date/keyword, get document, list summaries
- Format: XML
- No auth required

## Build & Test

```bash
npm install        # Install all workspace deps
npm run build      # Build all packages (nx run-many)
npm test           # Run all tests (vitest)
npm run format     # Prettier
npm run dev        # Watch mode
```

## Conventions

- npm scope: `@spain-ai-kit/*`
- MCP servers: `@spain-ai-kit/{service}-mcp-server`
- Shared code: `@spain-ai-kit/shared`
- Each MCP server is a standalone package in `mcp/`
- TypeScript strict mode, ES2022 target
- Tests with vitest
