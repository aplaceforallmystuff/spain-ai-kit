# Catastro + AEMET MCP Servers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two new MCP servers to spain-ai-kit: Catastro (land registry, 9 tools, zero auth) and AEMET (weather, 10 tools, user API key).

**Architecture:** Catastro uses the existing BaseAPIClient + parseXML pattern (SOAP/REST endpoints returning XML). AEMET introduces a new AEMETClient extending BaseAPIClient that handles the double-call pattern and API key injection. Both servers follow the established wrapToolHandler + validation pattern.

**Tech Stack:** TypeScript, MCP SDK, axios, fast-xml-parser, zod, vitest

---

## Part 1: Catastro Server

### Task 1: Catastro Validators

**Files:**
- Modify: `packages/shared/src/validation.ts`
- Modify: `packages/shared/src/validation.test.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Add Catastro validators to validation.ts**

Append to `packages/shared/src/validation.ts`:

```typescript
/**
 * Validate a Spanish province code (1-52).
 */
export function validateProvinceCode(code: string): void {
  if (!/^\d{1,2}$/.test(code)) {
    throw new ValidationError(
      `Invalid province code "${code}". Must be 1-2 digits (e.g., "28" for Madrid).`,
    );
  }
  const num = parseInt(code, 10);
  if (num < 1 || num > 52) {
    throw new ValidationError(
      `Invalid province code "${code}". Must be between 1 and 52.`,
    );
  }
}

/**
 * Validate a Catastro municipality code (1-3 digits).
 */
export function validateMunicipalityCode(code: string): void {
  if (!/^\d{1,3}$/.test(code)) {
    throw new ValidationError(
      `Invalid municipality code "${code}". Must be 1-3 digits.`,
    );
  }
}

/**
 * Validate a cadastral reference (14-20 alphanumeric characters).
 */
export function validateCadastralRef(rc: string): void {
  if (!/^[A-Za-z0-9]{14,20}$/.test(rc)) {
    throw new ValidationError(
      `Invalid cadastral reference "${rc}". Must be 14-20 alphanumeric characters.`,
    );
  }
}

/**
 * Validate a coordinate value (finite number).
 */
export function validateCoordinate(coord: number, label: string): void {
  if (!Number.isFinite(coord)) {
    throw new ValidationError(
      `Invalid ${label} coordinate "${coord}". Must be a finite number.`,
    );
  }
}
```

- [ ] **Step 2: Add Catastro validator tests**

Append to `packages/shared/src/validation.test.ts`:

```typescript
describe('validateProvinceCode', () => {
  it('accepts valid province codes', () => {
    expect(() => validateProvinceCode('1')).not.toThrow();
    expect(() => validateProvinceCode('28')).not.toThrow();
    expect(() => validateProvinceCode('52')).not.toThrow();
  });

  it('rejects invalid province codes', () => {
    expect(() => validateProvinceCode('0')).toThrow(ValidationError);
    expect(() => validateProvinceCode('53')).toThrow(ValidationError);
    expect(() => validateProvinceCode('abc')).toThrow(ValidationError);
    expect(() => validateProvinceCode('')).toThrow(ValidationError);
    expect(() => validateProvinceCode('123')).toThrow(ValidationError);
  });
});

describe('validateMunicipalityCode', () => {
  it('accepts valid municipality codes', () => {
    expect(() => validateMunicipalityCode('1')).not.toThrow();
    expect(() => validateMunicipalityCode('50')).not.toThrow();
    expect(() => validateMunicipalityCode('900')).not.toThrow();
  });

  it('rejects invalid codes', () => {
    expect(() => validateMunicipalityCode('')).toThrow(ValidationError);
    expect(() => validateMunicipalityCode('abcd')).toThrow(ValidationError);
    expect(() => validateMunicipalityCode('1234')).toThrow(ValidationError);
  });
});

describe('validateCadastralRef', () => {
  it('accepts valid cadastral references', () => {
    expect(() => validateCadastralRef('36050A07700004')).not.toThrow();
    expect(() => validateCadastralRef('13077A01800039')).not.toThrow();
    expect(() => validateCadastralRef('9872023VH5797S0001WX')).not.toThrow();
  });

  it('rejects invalid references', () => {
    expect(() => validateCadastralRef('')).toThrow(ValidationError);
    expect(() => validateCadastralRef('short')).toThrow(ValidationError);
    expect(() => validateCadastralRef('has spaces 1234567')).toThrow(ValidationError);
    expect(() => validateCadastralRef('../../../etc/passwd')).toThrow(ValidationError);
  });
});

describe('validateCoordinate', () => {
  it('accepts valid coordinates', () => {
    expect(() => validateCoordinate(40.4168, 'lat')).not.toThrow();
    expect(() => validateCoordinate(-3.7038, 'lon')).not.toThrow();
    expect(() => validateCoordinate(0, 'x')).not.toThrow();
  });

  it('rejects invalid coordinates', () => {
    expect(() => validateCoordinate(NaN, 'lat')).toThrow(ValidationError);
    expect(() => validateCoordinate(Infinity, 'lon')).toThrow(ValidationError);
    expect(() => validateCoordinate(-Infinity, 'x')).toThrow(ValidationError);
  });
});
```

- [ ] **Step 3: Update shared index exports**

Add to `packages/shared/src/index.ts`:

```typescript
export {
  validateProvinceCode,
  validateMunicipalityCode,
  validateCadastralRef,
  validateCoordinate,
} from './validation.js';
```

- [ ] **Step 4: Run tests and build**

Run: `cd /Users/jameschristian/Dev/spain-ai-kit && npx nx run @spain-ai-kit/shared:test && npm run build`
Expected: All tests pass, all packages build

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/validation.ts packages/shared/src/validation.test.ts packages/shared/src/index.ts
git commit -m "feat(shared): add Catastro input validators (province, municipality, cadastral ref, coordinate)"
```

---

### Task 2: Catastro Package Scaffold

**Files:**
- Create: `mcp/catastro/package.json`
- Create: `mcp/catastro/tsconfig.json`
- Create: `mcp/catastro/src/index.ts` (minimal, just server startup)

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@spain-ai-kit/catastro-mcp-server",
  "version": "0.1.0",
  "description": "MCP server for Catastro (Dirección General del Catastro) - Spanish Land Registry",
  "private": false,
  "main": "dist/index.js",
  "type": "module",
  "bin": {
    "catastro-mcp-server": "./dist/index.js"
  },
  "files": [
    "dist",
    "README.md"
  ],
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/aplaceforallmystuff/spain-ai-kit.git",
    "directory": "mcp/catastro"
  },
  "keywords": [
    "mcp",
    "spain",
    "catastro",
    "cadastre",
    "property",
    "land-registry",
    "ai",
    "claude"
  ],
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx watch src/index.ts",
    "test": "vitest run"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.17.0",
    "@spain-ai-kit/shared": "*",
    "axios": "^1.11.0",
    "zod": "^3.25.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.9.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["src/**/*.test.ts"]
}
```

- [ ] **Step 3: Create minimal src/index.ts**

```typescript
#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { BaseAPIClient, parseXML, wrapToolHandler } from '@spain-ai-kit/shared';

const CALLEJERO_BASE = 'https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCallejeroCodigos.asmx/';
const COORDENADAS_BASE = 'https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCoordenadas.asmx/';

const callejero = new BaseAPIClient({
  baseURL: CALLEJERO_BASE,
  cacheTTL: 10 * 60 * 1000,
  maxRequestsPerSecond: 5,
});

const coordenadas = new BaseAPIClient({
  baseURL: COORDENADAS_BASE,
  cacheTTL: 10 * 60 * 1000,
  maxRequestsPerSecond: 5,
});

const server = new McpServer({
  name: '@spain-ai-kit/catastro-mcp-server',
  version: '0.1.0',
});

// Tools will be added in Task 3

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Catastro MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
```

- [ ] **Step 4: Install deps and build**

Run: `cd /Users/jameschristian/Dev/spain-ai-kit && npm install && npm run build`
Expected: All 4 packages build (shared, ine, boe, catastro)

- [ ] **Step 5: Commit**

```bash
git add mcp/catastro/
git commit -m "feat(catastro): scaffold Catastro MCP server package"
```

---

### Task 3: Catastro Directory Tools (list_provinces, list_municipalities, list_streets, lookup_address)

**Files:**
- Modify: `mcp/catastro/src/index.ts`

- [ ] **Step 1: Add imports and types**

Add after the existing imports at top of `mcp/catastro/src/index.ts`:

```typescript
import { z } from 'zod/v3';
import {
  BaseAPIClient,
  parseXML,
  wrapToolHandler,
  validateProvinceCode,
  validateMunicipalityCode,
} from '@spain-ai-kit/shared';
```

(Remove the existing import line that doesn't have z or the validators.)

Add after the server setup:

```typescript
// --- Catastro XML response helpers ---

/**
 * Extract error message from Catastro XML response, if present.
 * Catastro returns errors in <lerr><err><des> elements.
 */
function extractCatastroError(parsed: Record<string, unknown>): string | null {
  const root = Object.values(parsed)[0] as Record<string, unknown> | undefined;
  if (!root) return null;
  const lerr = root['lerr'] as Record<string, unknown> | undefined;
  if (!lerr) return null;
  const err = lerr['err'] as Record<string, unknown> | undefined;
  if (!err) return null;
  return (err['des'] as string) ?? null;
}
```

- [ ] **Step 2: Add list_provinces tool**

```typescript
server.tool(
  'list_provinces',
  'List all Spanish provinces with their codes. Use province codes for other Catastro lookups.',
  {},
  wrapToolHandler(async () => {
    const xml = await callejero.get<string>('ConsultaProvincia', {
      responseType: 'text' as never,
      cacheTTL: 24 * 60 * 60 * 1000, // 24h
    });
    const parsed = parseXML(xml);
    const error = extractCatastroError(parsed);
    if (error) {
      return { content: [{ type: 'text' as const, text: `Catastro error: ${error}` }], isError: true };
    }
    return { content: [{ type: 'text' as const, text: JSON.stringify(parsed, null, 2) }] };
  }),
);
```

- [ ] **Step 3: Add list_municipalities tool**

```typescript
server.tool(
  'list_municipalities',
  'List municipalities in a Spanish province. Use the province code from list_provinces.',
  { provinceCode: z.string().describe('Province code (e.g., "28" for Madrid, "46" for Valencia)') },
  wrapToolHandler(async ({ provinceCode }) => {
    validateProvinceCode(provinceCode);
    const xml = await callejero.get<string>('ConsultaMunicipioCodigos', {
      params: { CodigoProvincia: provinceCode, CodigoMunicipio: '', CodigoMunicipioINE: '' },
      responseType: 'text' as never,
      cacheTTL: 24 * 60 * 60 * 1000,
    });
    const parsed = parseXML(xml);
    const error = extractCatastroError(parsed);
    if (error) {
      return { content: [{ type: 'text' as const, text: `Catastro error: ${error}` }], isError: true };
    }
    return { content: [{ type: 'text' as const, text: JSON.stringify(parsed, null, 2) }] };
  }),
);
```

- [ ] **Step 4: Add list_streets tool**

```typescript
server.tool(
  'list_streets',
  'List streets in a municipality. Use codes from list_provinces and list_municipalities.',
  {
    provinceCode: z.string().describe('Province code'),
    municipalityCode: z.string().describe('Municipality code'),
  },
  wrapToolHandler(async ({ provinceCode, municipalityCode }) => {
    validateProvinceCode(provinceCode);
    validateMunicipalityCode(municipalityCode);
    const xml = await callejero.get<string>('ConsultaViaCodigos', {
      params: { CodigoProvincia: provinceCode, CodigoMunicipio: municipalityCode, CodigoMunicipioINE: '', CodigoVia: '' },
      responseType: 'text' as never,
      cacheTTL: 60 * 60 * 1000,
    });
    const parsed = parseXML(xml);
    const error = extractCatastroError(parsed);
    if (error) {
      return { content: [{ type: 'text' as const, text: `Catastro error: ${error}` }], isError: true };
    }
    return { content: [{ type: 'text' as const, text: JSON.stringify(parsed, null, 2) }] };
  }),
);
```

- [ ] **Step 5: Add lookup_address tool**

```typescript
server.tool(
  'lookup_address',
  'Get the cadastral reference for a specific street address. Use street codes from list_streets.',
  {
    provinceCode: z.string().describe('Province code'),
    municipalityCode: z.string().describe('Municipality code'),
    streetCode: z.string().describe('Street code (from list_streets)'),
    number: z.string().describe('Street number'),
  },
  wrapToolHandler(async ({ provinceCode, municipalityCode, streetCode, number }) => {
    validateProvinceCode(provinceCode);
    validateMunicipalityCode(municipalityCode);
    const xml = await callejero.get<string>('ConsultaNumeroCodigos', {
      params: {
        CodigoProvincia: provinceCode,
        CodigoMunicipio: municipalityCode,
        CodigoMunicipioINE: '',
        CodigoVia: streetCode,
        Numero: number,
      },
      responseType: 'text' as never,
    });
    const parsed = parseXML(xml);
    const error = extractCatastroError(parsed);
    if (error) {
      return { content: [{ type: 'text' as const, text: `Catastro error: ${error}` }], isError: true };
    }
    return { content: [{ type: 'text' as const, text: JSON.stringify(parsed, null, 2) }] };
  }),
);
```

- [ ] **Step 6: Build and verify**

Run: `npm run build`
Expected: All packages build

- [ ] **Step 7: Commit**

```bash
git add mcp/catastro/src/index.ts
git commit -m "feat(catastro): add directory tools (provinces, municipalities, streets, address lookup)"
```

---

### Task 4: Catastro Property + Geocoding Tools

**Files:**
- Modify: `mcp/catastro/src/index.ts`

- [ ] **Step 1: Add property lookup tools**

Add after the directory tools, updating the import to include `validateCadastralRef`:

```typescript
server.tool(
  'get_property',
  'Get property data (non-protected) by cadastral reference. Returns building info, area, use type.',
  {
    provinceCode: z.string().describe('Province code'),
    municipalityCode: z.string().describe('Municipality code'),
    cadastralRef: z.string().describe('Cadastral reference (14-20 alphanumeric chars, e.g., "9872023VH5797S0001WX")'),
  },
  wrapToolHandler(async ({ provinceCode, municipalityCode, cadastralRef }) => {
    validateProvinceCode(provinceCode);
    validateMunicipalityCode(municipalityCode);
    validateCadastralRef(cadastralRef);
    const xml = await callejero.get<string>('Consulta_DNPRC_Codigos', {
      params: {
        CodigoProvincia: provinceCode,
        CodigoMunicipio: municipalityCode,
        CodigoMunicipioINE: '',
        RC: cadastralRef,
      },
      responseType: 'text' as never,
    });
    const parsed = parseXML(xml);
    const error = extractCatastroError(parsed);
    if (error) {
      return { content: [{ type: 'text' as const, text: `Catastro error: ${error}` }], isError: true };
    }
    return { content: [{ type: 'text' as const, text: JSON.stringify(parsed, null, 2) }] };
  }),
);

server.tool(
  'get_property_by_parcel',
  'Get property data by polygon and parcel codes (rural properties).',
  {
    provinceCode: z.string().describe('Province code'),
    municipalityCode: z.string().describe('Municipality code'),
    polygon: z.string().describe('Polygon code'),
    parcel: z.string().describe('Parcel code'),
  },
  wrapToolHandler(async ({ provinceCode, municipalityCode, polygon, parcel }) => {
    validateProvinceCode(provinceCode);
    validateMunicipalityCode(municipalityCode);
    const xml = await callejero.get<string>('Consulta_DNPPP_Codigos', {
      params: {
        CodigoProvincia: provinceCode,
        CodigoMunicipio: municipalityCode,
        CodigoMunicipioINE: '',
        CodigoPoligono: polygon,
        CodigoParcela: parcel,
      },
      responseType: 'text' as never,
    });
    const parsed = parseXML(xml);
    const error = extractCatastroError(parsed);
    if (error) {
      return { content: [{ type: 'text' as const, text: `Catastro error: ${error}` }], isError: true };
    }
    return { content: [{ type: 'text' as const, text: JSON.stringify(parsed, null, 2) }] };
  }),
);
```

- [ ] **Step 2: Add geocoding tools**

Update import to include `validateCoordinate`:

```typescript
server.tool(
  'get_coordinates',
  'Get geographic coordinates (lat/lon) for a cadastral reference.',
  {
    provinceCode: z.string().describe('Province code'),
    municipalityCode: z.string().describe('Municipality code'),
    cadastralRef: z.string().describe('Cadastral reference (14 chars for the parcel)'),
  },
  wrapToolHandler(async ({ provinceCode, municipalityCode, cadastralRef }) => {
    validateProvinceCode(provinceCode);
    validateMunicipalityCode(municipalityCode);
    validateCadastralRef(cadastralRef);
    const xml = await coordenadas.get<string>('Consulta_CPMRC', {
      params: {
        Provincia: provinceCode,
        Municipio: municipalityCode,
        SRS: 'EPSG:4326',
        RC: cadastralRef,
      },
      responseType: 'text' as never,
    });
    const parsed = parseXML(xml);
    const error = extractCatastroError(parsed);
    if (error) {
      return { content: [{ type: 'text' as const, text: `Catastro error: ${error}` }], isError: true };
    }
    return { content: [{ type: 'text' as const, text: JSON.stringify(parsed, null, 2) }] };
  }),
);

server.tool(
  'get_reference_at_coordinates',
  'Reverse geocode: get the cadastral reference at specific coordinates.',
  {
    lat: z.number().describe('Latitude (WGS84)'),
    lon: z.number().describe('Longitude (WGS84)'),
  },
  wrapToolHandler(async ({ lat, lon }) => {
    validateCoordinate(lat, 'latitude');
    validateCoordinate(lon, 'longitude');
    const xml = await coordenadas.get<string>('Consulta_RCCOOR', {
      params: { SRS: 'EPSG:4326', Coordenada_X: lon, Coordenada_Y: lat },
      responseType: 'text' as never,
    });
    const parsed = parseXML(xml);
    const error = extractCatastroError(parsed);
    if (error) {
      return { content: [{ type: 'text' as const, text: `Catastro error: ${error}` }], isError: true };
    }
    return { content: [{ type: 'text' as const, text: JSON.stringify(parsed, null, 2) }] };
  }),
);

server.tool(
  'find_properties_nearby',
  'Find cadastral references within a distance of given coordinates.',
  {
    lat: z.number().describe('Latitude (WGS84)'),
    lon: z.number().describe('Longitude (WGS84)'),
    distance: z.number().optional().describe('Search radius in meters (default: 50)'),
  },
  wrapToolHandler(async ({ lat, lon, distance }) => {
    validateCoordinate(lat, 'latitude');
    validateCoordinate(lon, 'longitude');
    const xml = await coordenadas.get<string>('Consulta_RCCOOR_Distancia', {
      params: {
        SRS: 'EPSG:4326',
        Coordenada_X: lon,
        Coordenada_Y: lat,
        Distancia: distance ?? 50,
      },
      responseType: 'text' as never,
    });
    const parsed = parseXML(xml);
    const error = extractCatastroError(parsed);
    if (error) {
      return { content: [{ type: 'text' as const, text: `Catastro error: ${error}` }], isError: true };
    }
    return { content: [{ type: 'text' as const, text: JSON.stringify(parsed, null, 2) }] };
  }),
);
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: All packages build

- [ ] **Step 4: Commit**

```bash
git add mcp/catastro/src/index.ts
git commit -m "feat(catastro): add property lookup and geocoding tools"
```

---

### Task 5: Catastro Integration Tests

**Files:**
- Create: `mcp/catastro/src/index.test.ts`

- [ ] **Step 1: Write integration tests**

```typescript
import { describe, it, expect } from 'vitest';
import { BaseAPIClient, parseXML } from '@spain-ai-kit/shared';

const CALLEJERO_BASE = 'https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCallejeroCodigos.asmx/';
const COORDENADAS_BASE = 'https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCoordenadas.asmx/';

const callejero = new BaseAPIClient({ baseURL: CALLEJERO_BASE, cacheTTL: 0 });
const coordenadas = new BaseAPIClient({ baseURL: COORDENADAS_BASE, cacheTTL: 0 });

describe('Catastro API integration', () => {
  it('lists provinces', async () => {
    const xml = await callejero.get<string>('ConsultaProvincia', {
      responseType: 'text' as never,
    });
    const parsed = parseXML(xml);
    expect(parsed).toBeDefined();
    // Spain has 52 provinces (50 + Ceuta + Melilla)
    const text = JSON.stringify(parsed);
    expect(text).toContain('MADRID');
  }, 15_000);

  it('lists municipalities for Madrid province (28)', async () => {
    const xml = await callejero.get<string>('ConsultaMunicipioCodigos', {
      params: { CodigoProvincia: '28', CodigoMunicipio: '', CodigoMunicipioINE: '' },
      responseType: 'text' as never,
    });
    const parsed = parseXML(xml);
    expect(parsed).toBeDefined();
    const text = JSON.stringify(parsed);
    expect(text).toContain('MADRID');
  }, 15_000);

  it('reverse geocodes Madrid coordinates', async () => {
    // Puerta del Sol, Madrid
    const xml = await coordenadas.get<string>('Consulta_RCCOOR', {
      params: { SRS: 'EPSG:4326', Coordenada_X: -3.7038, Coordenada_Y: 40.4168 },
      responseType: 'text' as never,
    });
    const parsed = parseXML(xml);
    expect(parsed).toBeDefined();
    const text = JSON.stringify(parsed);
    // Should return a cadastral reference in Madrid
    expect(text).toContain('MADRID');
  }, 15_000);
});
```

- [ ] **Step 2: Run tests**

Run: `npx nx run @spain-ai-kit/catastro-mcp-server:test`
Expected: 3 tests pass

- [ ] **Step 3: Run full test suite**

Run: `npm run build && npm test`
Expected: All packages build and test (shared 64+, boe 7, ine 4, catastro 3)

- [ ] **Step 4: Commit**

```bash
git add mcp/catastro/src/index.test.ts
git commit -m "test(catastro): add integration tests for province list, municipality list, reverse geocoding"
```

---

### Task 6: Catastro README + Root README Update

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add Catastro to Quick Start config**

In `README.md`, add to both Claude Desktop and Claude Code JSON blocks:

```json
"spain-catastro": {
  "command": "npx",
  "args": ["@spain-ai-kit/catastro-mcp-server"]
}
```

- [ ] **Step 2: Add Catastro tools table**

After the BOE section, add:

```markdown
### Catastro — Land Registry (`@spain-ai-kit/catastro-mcp-server`)

Connects to the [Dirección General del Catastro](https://www.catastro.hacienda.gob.es/) web services. Property lookups, address resolution, and geocoding for all of Spain.

| Tool | Description |
|------|-------------|
| `list_provinces` | List all Spanish provinces with codes |
| `list_municipalities` | List municipalities in a province |
| `list_streets` | List streets in a municipality |
| `lookup_address` | Get cadastral reference for a street address |
| `get_property` | Get property data by cadastral reference |
| `get_property_by_parcel` | Get property data by polygon/parcel codes |
| `get_coordinates` | Get lat/lon for a cadastral reference |
| `get_reference_at_coordinates` | Reverse geocode: coordinates to cadastral reference |
| `find_properties_nearby` | Find properties within distance of coordinates |

**Data source:** [Catastro OVC Web Services](https://ovc.catastro.meh.es/) — public, no authentication required.
```

- [ ] **Step 3: Add example prompts**

Add to the "Then ask Claude things like:" section:

```markdown
- "What property is at this Madrid address?"
- "Look up the cadastral reference for Puerta del Sol"
```

- [ ] **Step 4: Update project structure**

Add `│   └── catastro/          # Catastro Land Registry MCP server` to the project structure tree.

- [ ] **Step 5: Update roadmap**

Mark Catastro as implemented, keep AEMET as next.

- [ ] **Step 6: Commit**

```bash
git add README.md
git commit -m "docs: add Catastro server to README with tools table and config examples"
```

---

## Part 2: AEMET Server

### Task 7: AEMETClient in Shared Package

**Files:**
- Create: `packages/shared/src/aemet-client.ts`
- Create: `packages/shared/src/aemet-client.test.ts`
- Modify: `packages/shared/src/types.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Add AEMETClientOptions to types.ts**

Append to `packages/shared/src/types.ts`:

```typescript
/**
 * Options for the AEMETClient (extends BaseAPIClient options).
 */
export interface AEMETClientOptions extends APIClientOptions {
  /** AEMET API key (from AEMET_API_KEY env var) */
  apiKey: string;
}
```

- [ ] **Step 2: Create aemet-client.ts**

```typescript
// packages/shared/src/aemet-client.ts
import axios from 'axios';
import { BaseAPIClient } from './api-client.js';
import { ValidationError } from './validation.js';
import type { AEMETClientOptions } from './types.js';

/**
 * AEMET API client with double-call pattern and API key injection.
 *
 * AEMET's API returns a JSON envelope with a temporary URL in `datos`.
 * This client resolves the double-call automatically.
 */
export class AEMETClient extends BaseAPIClient {
  private apiKey: string;

  constructor(options: AEMETClientOptions) {
    super(options);
    this.apiKey = options.apiKey;
    if (!this.apiKey) {
      throw new ValidationError(
        'AEMET_API_KEY environment variable is required. ' +
        'Get a free API key at https://opendata.aemet.es/centrodedescargas/altaUsuario',
      );
    }
  }

  /**
   * Fetch data from AEMET using the double-call pattern:
   * 1. Call the API endpoint → get envelope with temporary `datos` URL
   * 2. Fetch the actual data from the temporary URL
   */
  async getData<T>(path: string, cacheTTL?: number): Promise<T> {
    const envelope = await this.get<{ estado: number; datos: string; metadatos: string }>(
      path,
      {
        headers: { api_key: this.apiKey },
        cacheTTL: 0, // Don't cache the envelope (URLs are temporary)
      },
    );

    if (!envelope.datos) {
      throw new Error(`AEMET returned no data URL for ${path}`);
    }

    // Second call: fetch actual data from temporary URL
    const response = await axios.get<T>(envelope.datos, {
      headers: { 'User-Agent': 'spain-ai-kit/0.1.0' },
      timeout: 30_000,
    });

    return response.data;
  }
}
```

- [ ] **Step 3: Write AEMETClient tests**

```typescript
// packages/shared/src/aemet-client.test.ts
import { describe, it, expect, vi } from 'vitest';
import { AEMETClient } from './aemet-client.js';
import { ValidationError } from './validation.js';

describe('AEMETClient', () => {
  it('throws ValidationError when API key is missing', () => {
    expect(() => new AEMETClient({
      baseURL: 'https://opendata.aemet.es/opendata/',
      apiKey: '',
    })).toThrow(ValidationError);
  });

  it('throws ValidationError with signup URL in message', () => {
    try {
      new AEMETClient({
        baseURL: 'https://opendata.aemet.es/opendata/',
        apiKey: '',
      });
    } catch (e) {
      expect((e as Error).message).toContain('opendata.aemet.es');
      expect((e as Error).message).toContain('AEMET_API_KEY');
    }
  });

  it('constructs successfully with a valid API key', () => {
    const client = new AEMETClient({
      baseURL: 'https://opendata.aemet.es/opendata/',
      apiKey: 'test-key-123',
    });
    expect(client).toBeDefined();
  });
});
```

- [ ] **Step 4: Export from shared index**

Add to `packages/shared/src/index.ts`:

```typescript
export { AEMETClient } from './aemet-client.js';
export type { AEMETClientOptions } from './types.js';
```

- [ ] **Step 5: Run tests and build**

Run: `npx nx run @spain-ai-kit/shared:test && npm run build`
Expected: All tests pass, all packages build

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/aemet-client.ts packages/shared/src/aemet-client.test.ts packages/shared/src/types.ts packages/shared/src/index.ts
git commit -m "feat(shared): add AEMETClient with double-call pattern and API key validation"
```

---

### Task 8: AEMET Validators

**Files:**
- Modify: `packages/shared/src/validation.ts`
- Modify: `packages/shared/src/validation.test.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Add AEMET validators**

Append to `packages/shared/src/validation.ts`:

```typescript
/**
 * Validate an AEMET municipality code (5 digits, optional "id" prefix).
 */
export function validateMunicipioCode(code: string): void {
  if (!/^(id)?\d{5}$/.test(code)) {
    throw new ValidationError(
      `Invalid municipio code "${code}". Must be 5 digits, optionally prefixed with "id" (e.g., "28079" or "id28079" for Madrid).`,
    );
  }
}

/**
 * Validate an AEMET station ID (alphanumeric).
 */
export function validateStationId(id: string): void {
  if (!/^[A-Za-z0-9]+$/.test(id)) {
    throw new ValidationError(
      `Invalid station ID "${id}". Must be alphanumeric.`,
    );
  }
}

/**
 * Validate an AEMET area code for alerts/fire risk.
 */
export function validateAEMETArea(area: string): void {
  const validAreas = ['esp', '61', '62', '63', '64', '65', '66', '67', '68', '69', '70', '71', '72', '73', '74', '75', '76', '77', '78', '79', 'p', 'c'];
  if (!validAreas.includes(area)) {
    throw new ValidationError(
      `Invalid AEMET area code "${area}". Use "esp" for all Spain, region codes 61-79, or "p"/"c" for fire risk.`,
    );
  }
}
```

- [ ] **Step 2: Add AEMET validator tests**

Append to `packages/shared/src/validation.test.ts`:

```typescript
describe('validateMunicipioCode', () => {
  it('accepts valid municipio codes', () => {
    expect(() => validateMunicipioCode('28079')).not.toThrow();
    expect(() => validateMunicipioCode('id28079')).not.toThrow();
    expect(() => validateMunicipioCode('46250')).not.toThrow();
  });

  it('rejects invalid codes', () => {
    expect(() => validateMunicipioCode('')).toThrow(ValidationError);
    expect(() => validateMunicipioCode('2807')).toThrow(ValidationError); // 4 digits
    expect(() => validateMunicipioCode('280790')).toThrow(ValidationError); // 6 digits
    expect(() => validateMunicipioCode('abcde')).toThrow(ValidationError);
  });
});

describe('validateStationId', () => {
  it('accepts valid station IDs', () => {
    expect(() => validateStationId('3129')).not.toThrow();
    expect(() => validateStationId('B228')).not.toThrow();
  });

  it('rejects invalid IDs', () => {
    expect(() => validateStationId('')).toThrow(ValidationError);
    expect(() => validateStationId('stat/ion')).toThrow(ValidationError);
  });
});

describe('validateAEMETArea', () => {
  it('accepts valid area codes', () => {
    expect(() => validateAEMETArea('esp')).not.toThrow();
    expect(() => validateAEMETArea('61')).not.toThrow();
    expect(() => validateAEMETArea('p')).not.toThrow();
    expect(() => validateAEMETArea('c')).not.toThrow();
  });

  it('rejects invalid codes', () => {
    expect(() => validateAEMETArea('')).toThrow(ValidationError);
    expect(() => validateAEMETArea('99')).toThrow(ValidationError);
    expect(() => validateAEMETArea('invalid')).toThrow(ValidationError);
  });
});
```

- [ ] **Step 3: Export from shared index**

Add to `packages/shared/src/index.ts`:

```typescript
export {
  validateMunicipioCode,
  validateStationId,
  validateAEMETArea,
} from './validation.js';
```

- [ ] **Step 4: Run tests and build**

Run: `npx nx run @spain-ai-kit/shared:test && npm run build`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/validation.ts packages/shared/src/validation.test.ts packages/shared/src/index.ts
git commit -m "feat(shared): add AEMET input validators (municipio, station, area codes)"
```

---

### Task 9: AEMET Package Scaffold + All Tools

**Files:**
- Create: `mcp/aemet/package.json`
- Create: `mcp/aemet/tsconfig.json`
- Create: `mcp/aemet/src/index.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@spain-ai-kit/aemet-mcp-server",
  "version": "0.1.0",
  "description": "MCP server for AEMET (Agencia Estatal de Meteorología) - Spanish Weather Service",
  "private": false,
  "main": "dist/index.js",
  "type": "module",
  "bin": {
    "aemet-mcp-server": "./dist/index.js"
  },
  "files": [
    "dist",
    "README.md"
  ],
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/aplaceforallmystuff/spain-ai-kit.git",
    "directory": "mcp/aemet"
  },
  "keywords": [
    "mcp",
    "spain",
    "aemet",
    "weather",
    "forecast",
    "meteorology",
    "ai",
    "claude"
  ],
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx watch src/index.ts",
    "test": "vitest run"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.17.0",
    "@spain-ai-kit/shared": "*",
    "axios": "^1.11.0",
    "zod": "^3.25.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.9.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["src/**/*.test.ts"]
}
```

- [ ] **Step 3: Create src/index.ts with all 10 tools**

```typescript
#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod/v3';
import {
  AEMETClient,
  wrapToolHandler,
  validateMunicipioCode,
  validateStationId,
  validateAEMETArea,
} from '@spain-ai-kit/shared';

const apiKey = process.env.AEMET_API_KEY ?? '';

const client = new AEMETClient({
  baseURL: 'https://opendata.aemet.es/opendata/',
  apiKey,
  cacheTTL: 30 * 60 * 1000, // 30 min default
  maxRequestsPerSecond: 5,
});

const server = new McpServer({
  name: '@spain-ai-kit/aemet-mcp-server',
  version: '0.1.0',
});

// --- Municipality reference data (cached) ---

let municipiosCache: Array<{ id: string; nombre: string }> | null = null;

async function getMunicipios(): Promise<Array<{ id: string; nombre: string }>> {
  if (municipiosCache) return municipiosCache;
  municipiosCache = await client.getData<Array<{ id: string; nombre: string }>>(
    'api/maestro/municipios',
  );
  return municipiosCache;
}

// --- Tools ---

server.tool(
  'list_municipalities',
  'List all Spanish municipalities with their AEMET codes. Use these codes for forecast lookups.',
  {},
  wrapToolHandler(async () => {
    const municipios = await getMunicipios();
    return {
      content: [{
        type: 'text' as const,
        text: `${municipios.length} municipalities. Use search_municipalities to find specific ones.`,
      }],
    };
  }),
);

server.tool(
  'search_municipalities',
  'Search Spanish municipalities by name. Returns matching municipalities with their AEMET codes for use in forecast tools.',
  { query: z.string().describe('Municipality name to search (e.g., "Madrid", "Valencia", "Barcelona")') },
  wrapToolHandler(async ({ query }) => {
    const municipios = await getMunicipios();
    const q = query.toLowerCase();
    const matches = municipios.filter(m => m.nombre.toLowerCase().includes(q));
    if (matches.length === 0) {
      return {
        content: [{ type: 'text' as const, text: `No municipalities found matching "${query}".` }],
      };
    }
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(matches.slice(0, 20), null, 2),
      }],
    };
  }),
);

server.tool(
  'get_forecast_daily',
  'Get daily weather forecast for a Spanish municipality (today + next days). Includes temperature, precipitation probability, wind, sky state.',
  { municipio: z.string().describe('Municipality code (5 digits, e.g., "28079" for Madrid). Use search_municipalities to find codes.') },
  wrapToolHandler(async ({ municipio }) => {
    validateMunicipioCode(municipio);
    const data = await client.getData<unknown>(
      `api/prediccion/especifica/municipio/diaria/${municipio}`,
    );
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
    };
  }),
);

server.tool(
  'get_forecast_hourly',
  'Get hourly weather forecast (48 hours) for a Spanish municipality. More granular than daily forecast.',
  { municipio: z.string().describe('Municipality code (5 digits)') },
  wrapToolHandler(async ({ municipio }) => {
    validateMunicipioCode(municipio);
    const data = await client.getData<unknown>(
      `api/prediccion/especifica/municipio/horaria/${municipio}`,
    );
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
    };
  }),
);

server.tool(
  'get_current_observations',
  'Get current weather observations from all AEMET stations across Spain. Returns temperature, humidity, wind, pressure, etc.',
  {},
  wrapToolHandler(async () => {
    const data = await client.getData<unknown>('api/observacion/convencional/todas');
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
    };
  }),
);

server.tool(
  'get_station_observations',
  'Get the last 12 hours of weather observations from a specific AEMET station.',
  { stationId: z.string().describe('Station climatological index (e.g., "3129" for Madrid Retiro)') },
  wrapToolHandler(async ({ stationId }) => {
    validateStationId(stationId);
    const data = await client.getData<unknown>(
      `api/observacion/convencional/datos/estacion/${stationId}`,
    );
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
    };
  }),
);

server.tool(
  'get_weather_alerts',
  'Get active adverse weather alerts (rain, wind, snow, heat, cold) for a region or all of Spain.',
  { area: z.string().optional().describe('Area code: "esp" for all Spain, or region code 61-79 (default: "esp")') },
  wrapToolHandler(async ({ area }) => {
    const areaCode = area ?? 'esp';
    validateAEMETArea(areaCode);
    const data = await client.getData<unknown>(
      `api/avisos_cap/ultimoelaborado/area/${areaCode}`,
    );
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
    };
  }),
);

server.tool(
  'get_beach_forecast',
  'Get weather forecast for a specific beach (cloudiness, precipitation, wind, wave height, water temperature).',
  { beachCode: z.string().describe('Beach code from AEMET') },
  wrapToolHandler(async ({ beachCode }) => {
    const data = await client.getData<unknown>(
      `api/prediccion/especifica/playa/${beachCode}`,
    );
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
    };
  }),
);

server.tool(
  'get_uv_index',
  'Get UV radiation index prediction for Spain. Higher values mean more sun protection needed.',
  { day: z.number().optional().describe('Day ahead: 0=today, 1=tomorrow, up to 4 (default: 0)') },
  wrapToolHandler(async ({ day }) => {
    const d = day ?? 0;
    const data = await client.getData<unknown>(`api/prediccion/especifica/uvi/${d}`);
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
    };
  }),
);

server.tool(
  'get_fire_risk',
  'Get current forest fire risk levels across Spain.',
  { area: z.string().optional().describe('"p" for mainland + Balearics, "c" for Canary Islands (default: "p")') },
  wrapToolHandler(async ({ area }) => {
    const areaCode = area ?? 'p';
    validateAEMETArea(areaCode);
    const data = await client.getData<unknown>(
      `api/incendios/mapasriesgo/estimado/area/${areaCode}`,
    );
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
    };
  }),
);

// --- Start ---

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('AEMET MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
```

- [ ] **Step 4: Install deps and build**

Run: `cd /Users/jameschristian/Dev/spain-ai-kit && npm install && npm run build`
Expected: All 5 packages build

- [ ] **Step 5: Commit**

```bash
git add mcp/aemet/
git commit -m "feat(aemet): add AEMET MCP server with 10 weather tools"
```

---

### Task 10: AEMET Integration Tests

**Files:**
- Create: `mcp/aemet/src/index.test.ts`

- [ ] **Step 1: Write tests (skip gracefully without API key)**

```typescript
import { describe, it, expect } from 'vitest';
import { AEMETClient } from '@spain-ai-kit/shared';

const apiKey = process.env.AEMET_API_KEY ?? '';
const hasKey = apiKey.length > 0;

describe('AEMET API integration', () => {
  it.skipIf(!hasKey)('lists municipalities', async () => {
    const client = new AEMETClient({
      baseURL: 'https://opendata.aemet.es/opendata/',
      apiKey,
      cacheTTL: 0,
    });
    const municipios = await client.getData<Array<{ id: string; nombre: string }>>(
      'api/maestro/municipios',
    );
    expect(Array.isArray(municipios)).toBe(true);
    expect(municipios.length).toBeGreaterThan(8000); // Spain has ~8100 municipalities
  }, 30_000);

  it.skipIf(!hasKey)('gets daily forecast for Madrid (28079)', async () => {
    const client = new AEMETClient({
      baseURL: 'https://opendata.aemet.es/opendata/',
      apiKey,
      cacheTTL: 0,
    });
    const forecast = await client.getData<unknown>(
      'api/prediccion/especifica/municipio/diaria/28079',
    );
    expect(forecast).toBeDefined();
    expect(Array.isArray(forecast) || typeof forecast === 'object').toBe(true);
  }, 30_000);

  it('skips integration tests without AEMET_API_KEY', () => {
    if (!hasKey) {
      console.error('AEMET integration tests skipped — set AEMET_API_KEY env var to run them');
    }
    expect(true).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npx nx run @spain-ai-kit/aemet-mcp-server:test`
Expected: 1 test passes (skip message), 2 skipped (no API key in local dev)

- [ ] **Step 3: Full test suite**

Run: `npm run build && npm test`
Expected: All packages build and test

- [ ] **Step 4: Commit**

```bash
git add mcp/aemet/src/index.test.ts
git commit -m "test(aemet): add integration tests (skip gracefully without API key)"
```

---

### Task 11: AEMET README + Root README Update

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add AEMET to Quick Start config**

In `README.md`, add to both Claude Desktop and Claude Code JSON blocks:

```json
"spain-aemet": {
  "command": "npx",
  "args": ["@spain-ai-kit/aemet-mcp-server"],
  "env": {
    "AEMET_API_KEY": "your-api-key-here"
  }
}
```

- [ ] **Step 2: Add API key callout after Quick Start**

After the config blocks, before "Then ask Claude things like:", add:

```markdown
> **AEMET API Key:** The weather server requires a free API key. Get one in 30 seconds at [opendata.aemet.es](https://opendata.aemet.es/centrodedescargas/altaUsuario) — just enter your email. The other servers need no setup.
```

- [ ] **Step 3: Add AEMET tools table**

After the Catastro section:

```markdown
### AEMET — Weather (`@spain-ai-kit/aemet-mcp-server`)

Connects to [AEMET OpenData](https://opendata.aemet.es/) for weather forecasts, observations, and alerts across Spain. Requires a free API key.

| Tool | Description |
|------|-------------|
| `search_municipalities` | Search municipalities by name for forecast codes |
| `list_municipalities` | List all 8,000+ Spanish municipalities |
| `get_forecast_daily` | Daily weather forecast for a municipality |
| `get_forecast_hourly` | Hourly forecast (48h) for a municipality |
| `get_current_observations` | Current weather from all stations |
| `get_station_observations` | Last 12h observations from a specific station |
| `get_weather_alerts` | Active adverse weather alerts by region |
| `get_beach_forecast` | Beach weather forecast |
| `get_uv_index` | UV radiation index prediction |
| `get_fire_risk` | Forest fire risk levels |

**Data source:** [AEMET OpenData API](https://opendata.aemet.es/) — free API key required ([sign up](https://opendata.aemet.es/centrodedescargas/altaUsuario)).
```

- [ ] **Step 4: Add example prompts**

```markdown
- "What's the weather forecast for Valencia this week?"
- "Are there any weather alerts in Spain right now?"
- "What's the UV index in Málaga today?"
```

- [ ] **Step 5: Update project structure and roadmap**

Add `│   └── aemet/             # AEMET Weather MCP server` to the tree. Mark AEMET as implemented in the roadmap.

- [ ] **Step 6: Commit**

```bash
git add README.md
git commit -m "docs: add AEMET server to README with tools table, API key instructions, and config examples"
```

---

### Task 12: Update CHANGELOG + Final Verification

**Files:**
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Update CHANGELOG**

Add to the `[Unreleased]` section under `### Added`:

```markdown
- Catastro MCP server with 9 tools (property lookup, address resolution, geocoding)
- AEMET MCP server with 10 tools (forecasts, observations, alerts, UV, fire risk, beach conditions)
- AEMETClient in shared package for double-call API pattern with API key management
- Catastro validators (province code, municipality code, cadastral reference, coordinate)
- AEMET validators (municipio code, station ID, area code)
```

- [ ] **Step 2: Full build and test**

Run: `npm run build && npm test`
Expected: All 5 packages build, all tests pass

- [ ] **Step 3: Commit and push**

```bash
git add CHANGELOG.md
git commit -m "docs: update CHANGELOG with Catastro and AEMET servers"
git push
```
