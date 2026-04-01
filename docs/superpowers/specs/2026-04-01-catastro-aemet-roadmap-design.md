# Catastro + AEMET MCP Servers Design

**Date:** 2026-04-01
**Status:** Approved
**Scope:** Two new MCP servers added to the spain-ai-kit monorepo

## Context

spain-ai-kit currently ships two MCP servers: INE (statistics) and BOE (legislation). Both are zero-auth, public REST/XML APIs. This spec adds two more:

1. **Catastro** — Spanish Land Registry. Zero auth, SOAP/REST, XML responses. Property lookups, geocoding, address resolution.
2. **AEMET** — Spanish Meteorological Agency. Free API key (user-provided via env var), REST, JSON responses with double-call pattern. Weather forecasts, observations, alerts.

**Build order:** Catastro first (fits existing zero-auth pattern), then AEMET (introduces API key pattern).

## Catastro MCP Server

**Package:** `@spain-ai-kit/catastro-mcp-server`
**Location:** `mcp/catastro/`
**API Base:** `https://ovc.catastro.meh.es/ovcservweb/`
**Auth:** None
**Format:** XML (uses existing `parseXML` from shared)

### Endpoints

Two service families:

**OVCCallejeroCodigos** — Street/property directory:
- Base: `OVCSWLocalizacionRC/OVCCallejeroCodigos.asmx/`
- Methods are invoked via HTTP GET with query parameters, returning XML

**OVCCoordenadas** — Geocoding:
- Base: `OVCSWLocalizacionRC/OVCCoordenadas.asmx/`
- Same HTTP GET pattern

### Tools

| Tool | API Method | Parameters | Description |
|------|-----------|------------|-------------|
| `list_provinces` | `ConsultaProvincia` | (none) | List all Spanish provinces with codes |
| `list_municipalities` | `ConsultaMunicipioCodigos` | `CodigoProvincia` | List municipalities in a province |
| `list_streets` | `ConsultaViaCodigos` | `CodigoProvincia`, `CodigoMunicipio` | List streets in a municipality |
| `lookup_address` | `ConsultaNumeroCodigos` | `CodigoProvincia`, `CodigoMunicipio`, `CodigoVia`, `Numero` | Get cadastral reference for a street address |
| `get_property` | `Consulta_DNPRC_Codigos` | `CodigoProvincia`, `CodigoMunicipio`, `RC` | Get property data by cadastral reference |
| `get_property_by_parcel` | `Consulta_DNPPP_Codigos` | `CodigoProvincia`, `CodigoMunicipio`, `CodigoPoligono`, `CodigoParcela` | Get property data by polygon/parcel |
| `get_coordinates` | `Consulta_CPMRC` | `Provincia`, `Municipio`, `RC` | Get lat/lon for a cadastral reference |
| `get_reference_at_coordinates` | `Consulta_RCCOOR` | `SRS`, `Coordenada_X`, `Coordenada_Y` | Reverse geocode: coordinates to cadastral reference |
| `find_properties_nearby` | `Consulta_RCCOOR_Distancia` | `SRS`, `Coordenada_X`, `Coordenada_Y`, `Distancia` | Find cadastral references within distance of coordinates |

### Input Validation

New validators in shared package:

| Validator | Rule | Applied To |
|-----------|------|-----------|
| `validateProvinceCode(code)` | Regex `^\d{1,2}$`, range 1-52 | Province parameters |
| `validateMunicipalityCode(code)` | Regex `^\d{1,3}$` | Municipality parameters |
| `validateCadastralRef(rc)` | Regex `^[A-Za-z0-9]{14,20}$` — alphanumeric, 14-20 chars | RC parameters |
| `validateCoordinate(coord)` | Finite number | Coordinate parameters |

### Error Handling

Catastro returns errors in a `<control><cuerr>` XML block. Parse this and return structured MCP errors:
- "La provincia no existe" → "Province code not found"
- "El municipio no existe" → "Municipality code not found"
- "La referencia catastral no existe" → "Cadastral reference not found"

Use `wrapToolHandler` for all handlers (same pattern as INE/BOE).

### Caching

- Province list: 24h (never changes)
- Municipality list: 24h
- Street list: 1h
- Property lookups: 10min (default)
- Coordinate lookups: 10min

## AEMET MCP Server

**Package:** `@spain-ai-kit/aemet-mcp-server`
**Location:** `mcp/aemet/`
**API Base:** `https://opendata.aemet.es/opendata/`
**Auth:** API key via `AEMET_API_KEY` env var (free, instant signup at https://opendata.aemet.es/centrodedescargas/altaUsuario)
**Format:** JSON (double-call pattern)

### Double-Call Pattern

AEMET's API uses a two-step fetch:
1. First call returns `{ "estado": 200, "datos": "https://opendata.aemet.es/opendata/sh/...", "metadatos": "..." }`
2. Second call to the `datos` URL returns the actual data

This is handled by a new `AEMETClient` class that extends `BaseAPIClient` with automatic double-call resolution.

### AEMETClient (in shared package)

```typescript
// packages/shared/src/aemet-client.ts
export class AEMETClient extends BaseAPIClient {
  private apiKey: string;

  constructor(options: AEMETClientOptions) {
    super({ ...options, baseURL: 'https://opendata.aemet.es/opendata/' });
    this.apiKey = options.apiKey;
    if (!this.apiKey) {
      throw new ValidationError(
        'AEMET_API_KEY environment variable is required. ' +
        'Get a free API key at https://opendata.aemet.es/centrodedescargas/altaUsuario'
      );
    }
  }

  async getData<T>(path: string): Promise<T> {
    // First call: get temporary data URL
    const meta = await this.get<{ estado: number; datos: string }>(path, {
      headers: { api_key: this.apiKey },
      cacheTTL: 0, // Don't cache the meta response (URLs are temporary)
    });
    // Second call: fetch actual data from temporary URL
    // Use axios directly since the URL is absolute, not relative to baseURL
    const response = await axios.get<T>(meta.datos);
    return response.data;
  }
}
```

Export `AEMETClient` and `AEMETClientOptions` from `@spain-ai-kit/shared`.

### Tools

| Tool | Endpoint | Parameters | Description |
|------|----------|------------|-------------|
| `get_forecast_daily` | `/api/prediccion/especifica/municipio/diaria/{municipio}` | `municipio: string` | Daily forecast for a municipality (today + 6 days) |
| `get_forecast_hourly` | `/api/prediccion/especifica/municipio/horaria/{municipio}` | `municipio: string` | Hourly forecast (48h) for a municipality |
| `get_current_observations` | `/api/observacion/convencional/todas` | (none) | Current weather observations from all stations |
| `get_station_observations` | `/api/observacion/convencional/datos/estacion/{idema}` | `stationId: string` | Last 12h observations from a specific station |
| `get_weather_alerts` | `/api/avisos_cap/ultimoelaborado/area/{area}` | `area: string` (default: "esp") | Active adverse weather alerts |
| `get_beach_forecast` | `/api/prediccion/especifica/playa/{playa}` | `beachCode: string` | Beach conditions forecast |
| `get_uv_index` | `/api/prediccion/especifica/uvi/{dia}` | `day: number` (0-4) | UV radiation index prediction |
| `get_fire_risk` | `/api/incendios/mapasriesgo/estimado/area/{area}` | `area: string` ("p" mainland, "c" canaries) | Current fire risk levels |
| `list_municipalities` | `/api/maestro/municipios` | (none) | All municipality codes for forecast lookups |
| `search_municipalities` | (client-side filter) | `query: string` | Search municipalities by name (filtered over cached list) |

### Input Validation

| Validator | Rule | Applied To |
|-----------|------|-----------|
| `validateMunicipioCode(code)` | Regex `^(id)?\d{5}$` — 5 digits, optional "id" prefix | Municipality forecast params |
| `validateStationId(id)` | Regex `^[A-Za-z0-9]+$` | Station observation params |
| `validateAEMETArea(area)` | Enum check against known area codes | Alert/fire risk params |

### Error Handling

- Missing API key → `ValidationError` with signup URL
- Invalid/expired API key (HTTP 401) → "API key invalid or expired. Check AEMET_API_KEY."
- Rate limited (HTTP 429) → "AEMET rate limit reached. Try again in a moment."
- Use `wrapToolHandler` for all handlers.

### Caching

- Municipality list: 24h (cached heavily, needed for every forecast lookup)
- Forecasts: 30min (AEMET updates forecasts periodically)
- Observations: 5min (near real-time)
- Alerts: 5min
- Beach/UV/fire: 30min

### Configuration

Claude Desktop / Claude Code config:
```json
{
  "mcpServers": {
    "spain-aemet": {
      "command": "npx",
      "args": ["@spain-ai-kit/aemet-mcp-server"],
      "env": {
        "AEMET_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

README includes a callout box:
> **API Key Required:** AEMET requires a free API key. Get one in 30 seconds at [opendata.aemet.es](https://opendata.aemet.es/centrodedescargas/altaUsuario) — just enter your email.

## Shared Package Changes

### New exports:
- `AEMETClient` + `AEMETClientOptions` — double-call client with API key
- `validateProvinceCode`, `validateMunicipalityCode`, `validateCadastralRef`, `validateCoordinate` — Catastro validators
- `validateMunicipioCode`, `validateStationId`, `validateAEMETArea` — AEMET validators

### No breaking changes to existing exports.

## Testing Strategy

### Catastro
- **Unit tests:** Validation helpers (same pattern as existing)
- **Integration tests:** Hit live Catastro endpoints (zero auth, same as INE/BOE)
  - List provinces (should return 52)
  - Get property by known cadastral reference
  - Reverse geocode known Madrid coordinates

### AEMET
- **Unit tests:** Validation helpers, AEMETClient double-call logic (mocked)
- **Integration tests:** Require `AEMET_API_KEY` env var; skip gracefully if not set
  - List municipalities
  - Get daily forecast for Madrid (municipio code 28079)
  - Get current observations

CI: AEMET integration tests only run when `AEMET_API_KEY` is available (add as GitHub Actions secret later, or skip in CI for now).

## README Updates

- Add Catastro and AEMET to the Quick Start config examples
- Add tools tables for both servers
- Add AEMET API key callout
- Update roadmap (mark Catastro and AEMET as complete, datos.gob.es and DGT as future)

## Build Order

1. **Catastro server** — zero-auth, XML, fits existing pattern exactly
2. **AEMET server** — introduces API key pattern and AEMETClient in shared

## Success Criteria

- Both servers build and pass tests
- Catastro: 9 tools querying live API
- AEMET: 10 tools with double-call resolution
- CI green (AEMET integration tests skipped without API key)
- README updated with both servers
- All inputs validated, all errors wrapped
