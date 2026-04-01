# Spain AI Kit

MCP servers connecting AI applications to Spanish government open data and legal infrastructure.

## What This Is

A TypeScript monorepo (Nx + npm workspaces) providing MCP servers for Spanish government APIs. Inspired by [estonia-ai-kit](https://github.com/stefanoamorelli/estonia-ai-kit).

## Spanish Service Mapping

| Spanish Service | API | Auth | Status |
|----------------|-----|------|--------|
| **INE** (Instituto Nacional de Estadística) | JSON-stat at `servicios.ine.es/wstempus/js` | No | Shipped |
| **BOE** (Boletín Oficial del Estado) | XML at `boe.es/datosabiertos/api` | No | Shipped |
| **Catastro** (Dirección General del Catastro) | SOAP/REST at `ovc.catastro.meh.es` | No | Shipped |
| **AEMET** (Agencia Estatal de Meteorología) | REST at `opendata.aemet.es/opendata` | Free API key | Shipped |
| **AEAT** (Agencia Tributaria) | cl@ve authentication | Yes | Future |
| **datos.gob.es** | CKAN catalog at `datos.gob.es/apidata` | No | Future |

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

### Catastro (OVC Web Services)
- Callejero base: `https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCallejeroCodigos.asmx/`
- Coordenadas base: `https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCoordenadas.asmx/`
- Operations: province/municipality/street lookup, property data by cadastral ref, geocoding, reverse geocoding
- Format: XML (SOAP endpoints, callable via HTTP GET)
- No auth required

### AEMET (OpenData API)
- Base: `https://opendata.aemet.es/opendata/`
- Auth: API key via `AEMET_API_KEY` env var (free signup at opendata.aemet.es)
- Double-call pattern: first call returns envelope with temporary `datos` URL, second call fetches actual data
- Operations: municipal forecasts (daily/hourly), observations, alerts, UV index, fire risk, beach conditions
- Format: JSON
- Uses `AEMETClient` (extends BaseAPIClient) in shared package

## Build & Test

```bash
npm install        # Install all workspace deps
npm run build      # Build all packages (nx run-many, shared first)
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
- All tool handlers wrapped with `wrapToolHandler` (error handling)
- All user inputs validated before API calls (validators in shared)
- Rate limiting on all API clients (`maxRequestsPerSecond`)
