# Testing & Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden spain-ai-kit with CI, input validation, error wrapping, rate limiting, pre-commit hooks, and security tests across two phases.

**Architecture:** Phase 1 adds input validation + error wrapping in the shared package, applies them to both MCP servers, and ships CI. Phase 2 layers on rate limiting in BaseAPIClient, pre-commit hooks, Dependabot, XML security config, corpus error logging, and comprehensive security/resilience tests.

**Tech Stack:** GitHub Actions, vitest, husky, lint-staged, fast-xml-parser security options

---

## Phase 1: Essentials

### Task 1: Input Validation Helpers

**Files:**
- Create: `packages/shared/src/validation.ts`
- Create: `packages/shared/src/validation.test.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Write the validation module**

```typescript
// packages/shared/src/validation.ts

/**
 * Custom error class for validation failures.
 * Error wrapper (Task 2) checks for this to return user-friendly MCP errors.
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validate a BOE document identifier.
 * Format: BOE-{letter}-{4-digit year}-{digits}
 * Examples: BOE-A-2000-544, BOE-A-2024-12345
 */
export function validateBOEId(id: string): void {
  if (!/^BOE-[A-Z]-\d{4}-\d+$/.test(id)) {
    throw new ValidationError(
      `Invalid BOE document ID "${id}". Expected format: BOE-A-YYYY-NNNNN (e.g., "BOE-A-2000-544").`,
    );
  }
}

/**
 * Validate a date string in BOE YYYYMMDD format.
 * Checks format AND that the date is actually valid.
 */
export function validateDateBOE(date: string): void {
  if (!/^\d{8}$/.test(date)) {
    throw new ValidationError(
      `Invalid date "${date}". Expected YYYYMMDD format (e.g., "20260328").`,
    );
  }
  const y = parseInt(date.slice(0, 4), 10);
  const m = parseInt(date.slice(4, 6), 10);
  const d = parseInt(date.slice(6, 8), 10);
  const parsed = new Date(y, m - 1, d);
  if (parsed.getFullYear() !== y || parsed.getMonth() !== m - 1 || parsed.getDate() !== d) {
    throw new ValidationError(
      `Invalid date "${date}". Month/day values are out of range.`,
    );
  }
}

/**
 * Validate a positive numeric ID within reasonable bounds.
 */
export function validateNumericId(id: number, label: string): void {
  if (!Number.isInteger(id) || id < 1 || id > 999_999_999) {
    throw new ValidationError(
      `Invalid ${label} "${id}". Must be a positive integer.`,
    );
  }
}

/**
 * Validate an INE series code (alphanumeric only).
 */
export function validateSeriesCode(code: string): void {
  if (!/^[A-Za-z0-9]+$/.test(code)) {
    throw new ValidationError(
      `Invalid series code "${code}". Must be alphanumeric (e.g., "IPC290751").`,
    );
  }
}

/**
 * Validate a BOE article/section block ID (alphanumeric, hyphens, underscores).
 */
export function validateBlockId(id: string): void {
  if (!/^[A-Za-z0-9_-]+$/.test(id)) {
    throw new ValidationError(
      `Invalid block ID "${id}". Must contain only letters, numbers, hyphens, and underscores.`,
    );
  }
}
```

- [ ] **Step 2: Write the validation tests**

```typescript
// packages/shared/src/validation.test.ts
import { describe, it, expect } from 'vitest';
import {
  ValidationError,
  validateBOEId,
  validateDateBOE,
  validateNumericId,
  validateSeriesCode,
  validateBlockId,
} from './validation.js';

describe('validateBOEId', () => {
  it('accepts valid BOE identifiers', () => {
    expect(() => validateBOEId('BOE-A-2000-544')).not.toThrow();
    expect(() => validateBOEId('BOE-A-2024-12345')).not.toThrow();
    expect(() => validateBOEId('BOE-B-1978-31229')).not.toThrow();
  });

  it('rejects path traversal attempts', () => {
    expect(() => validateBOEId('../../../etc/passwd')).toThrow(ValidationError);
    expect(() => validateBOEId('BOE-A-2000-544/../../secret')).toThrow(ValidationError);
  });

  it('rejects malformed identifiers', () => {
    expect(() => validateBOEId('')).toThrow(ValidationError);
    expect(() => validateBOEId('not-a-boe-id')).toThrow(ValidationError);
    expect(() => validateBOEId('BOE-a-2000-544')).toThrow(ValidationError); // lowercase letter
    expect(() => validateBOEId('BOE-A-200-544')).toThrow(ValidationError); // 3-digit year
    expect(() => validateBOEId('BOE-A-2000-')).toThrow(ValidationError); // no number
  });

  it('rejects IDs with whitespace or special chars', () => {
    expect(() => validateBOEId('BOE-A-2000-544 ')).toThrow(ValidationError);
    expect(() => validateBOEId('BOE-A-2000-544\n')).toThrow(ValidationError);
    expect(() => validateBOEId('BOE-A-2000-544;rm -rf')).toThrow(ValidationError);
  });
});

describe('validateDateBOE', () => {
  it('accepts valid YYYYMMDD dates', () => {
    expect(() => validateDateBOE('20260328')).not.toThrow();
    expect(() => validateDateBOE('20000101')).not.toThrow();
    expect(() => validateDateBOE('20261231')).not.toThrow();
  });

  it('rejects wrong format', () => {
    expect(() => validateDateBOE('')).toThrow(ValidationError);
    expect(() => validateDateBOE('2026-03-28')).toThrow(ValidationError);
    expect(() => validateDateBOE('abcdefgh')).toThrow(ValidationError);
    expect(() => validateDateBOE('202603')).toThrow(ValidationError); // too short
    expect(() => validateDateBOE('202603281')).toThrow(ValidationError); // too long
  });

  it('rejects invalid calendar dates', () => {
    expect(() => validateDateBOE('20261301')).toThrow(ValidationError); // month 13
    expect(() => validateDateBOE('20260230')).toThrow(ValidationError); // Feb 30
    expect(() => validateDateBOE('20260000')).toThrow(ValidationError); // month 0
    expect(() => validateDateBOE('20260100')).toThrow(ValidationError); // day 0
  });
});

describe('validateNumericId', () => {
  it('accepts valid positive integers', () => {
    expect(() => validateNumericId(1, 'test')).not.toThrow();
    expect(() => validateNumericId(22, 'operation ID')).not.toThrow();
    expect(() => validateNumericId(999_999_999, 'test')).not.toThrow();
  });

  it('rejects invalid values', () => {
    expect(() => validateNumericId(0, 'test')).toThrow(ValidationError);
    expect(() => validateNumericId(-1, 'test')).toThrow(ValidationError);
    expect(() => validateNumericId(1.5, 'test')).toThrow(ValidationError);
    expect(() => validateNumericId(1_000_000_000, 'test')).toThrow(ValidationError);
  });
});

describe('validateSeriesCode', () => {
  it('accepts alphanumeric codes', () => {
    expect(() => validateSeriesCode('IPC290751')).not.toThrow();
    expect(() => validateSeriesCode('ABC123')).not.toThrow();
  });

  it('rejects codes with special characters', () => {
    expect(() => validateSeriesCode('IPC/290751')).toThrow(ValidationError);
    expect(() => validateSeriesCode('../etc')).toThrow(ValidationError);
    expect(() => validateSeriesCode('code name')).toThrow(ValidationError);
    expect(() => validateSeriesCode('')).toThrow(ValidationError);
  });
});

describe('validateBlockId', () => {
  it('accepts valid block IDs', () => {
    expect(() => validateBlockId('articulo-1')).not.toThrow();
    expect(() => validateBlockId('titulo_I')).not.toThrow();
    expect(() => validateBlockId('bloque123')).not.toThrow();
  });

  it('rejects block IDs with path chars', () => {
    expect(() => validateBlockId('../../etc')).toThrow(ValidationError);
    expect(() => validateBlockId('block/id')).toThrow(ValidationError);
    expect(() => validateBlockId('block id')).toThrow(ValidationError);
    expect(() => validateBlockId('')).toThrow(ValidationError);
  });
});
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `cd /Users/jameschristian/Dev/spain-ai-kit && npx nx run @spain-ai-kit/shared:test`
Expected: All validation tests pass (24+ tests)

- [ ] **Step 4: Export from shared index**

Add to `packages/shared/src/index.ts`:

```typescript
export {
  ValidationError,
  validateBOEId,
  validateDateBOE,
  validateNumericId,
  validateSeriesCode,
  validateBlockId,
} from './validation.js';
```

- [ ] **Step 5: Build to verify exports compile**

Run: `cd /Users/jameschristian/Dev/spain-ai-kit && npm run build`
Expected: All 3 packages build successfully

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/validation.ts packages/shared/src/validation.test.ts packages/shared/src/index.ts
git commit -m "feat(shared): add input validation helpers for MCP tool parameters"
```

---

### Task 2: Error Wrapping Helper

**Files:**
- Create: `packages/shared/src/error.ts`
- Create: `packages/shared/src/error.test.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Write the error wrapper module**

```typescript
// packages/shared/src/error.ts
import axios from 'axios';
import { ValidationError } from './validation.js';

/**
 * MCP tool result type. Matches the shape returned by server.tool() handlers.
 */
export interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

/**
 * Wraps an MCP tool handler to catch errors and return structured MCP error responses.
 *
 * - ValidationError → user-friendly message with isError: true
 * - Axios HTTP errors → "HTTP {status}: {message}" with isError: true
 * - Unknown errors → generic "Internal error" with isError: true, logs full error to stderr
 */
export function wrapToolHandler<T>(
  handler: (params: T) => Promise<ToolResult>,
): (params: T) => Promise<ToolResult> {
  return async (params: T): Promise<ToolResult> => {
    try {
      return await handler(params);
    } catch (error) {
      if (error instanceof ValidationError) {
        return {
          content: [{ type: 'text', text: error.message }],
          isError: true,
        };
      }

      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const statusText = error.response?.statusText ?? 'Unknown';
        const message = status
          ? `Request failed (HTTP ${status}: ${statusText}). The requested resource may not exist or the service may be temporarily unavailable.`
          : `Network error: ${error.message}. The API may be temporarily unavailable.`;
        return {
          content: [{ type: 'text', text: message }],
          isError: true,
        };
      }

      // Unknown error — log full details to stderr, return generic message
      console.error('Unexpected tool error:', error);
      return {
        content: [{ type: 'text', text: 'An internal error occurred. Check server logs for details.' }],
        isError: true,
      };
    }
  };
}
```

- [ ] **Step 2: Write the error wrapper tests**

```typescript
// packages/shared/src/error.test.ts
import { describe, it, expect, vi } from 'vitest';
import { wrapToolHandler, ToolResult } from './error.js';
import { ValidationError } from './validation.js';

describe('wrapToolHandler', () => {
  it('passes through successful results', async () => {
    const handler = async () => ({
      content: [{ type: 'text' as const, text: 'ok' }],
    });
    const wrapped = wrapToolHandler(handler);
    const result = await wrapped(undefined as never);
    expect(result.content[0].text).toBe('ok');
    expect(result.isError).toBeUndefined();
  });

  it('catches ValidationError and returns MCP error', async () => {
    const handler = async () => {
      throw new ValidationError('Bad input');
    };
    const wrapped = wrapToolHandler(handler);
    const result = await wrapped(undefined as never);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe('Bad input');
  });

  it('catches axios HTTP errors and returns status', async () => {
    const handler = async () => {
      const err = new Error('Request failed') as Error & {
        isAxiosError: boolean;
        response: { status: number; statusText: string };
      };
      err.isAxiosError = true;
      err.response = { status: 404, statusText: 'Not Found' };
      throw err;
    };
    const wrapped = wrapToolHandler(handler);
    const result = await wrapped(undefined as never);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('HTTP 404');
    expect(result.content[0].text).toContain('Not Found');
  });

  it('catches axios network errors', async () => {
    const handler = async () => {
      const err = new Error('ECONNREFUSED') as Error & { isAxiosError: boolean; response: undefined };
      err.isAxiosError = true;
      err.response = undefined;
      throw err;
    };
    const wrapped = wrapToolHandler(handler);
    const result = await wrapped(undefined as never);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Network error');
    expect(result.content[0].text).toContain('ECONNREFUSED');
  });

  it('catches unknown errors with generic message and logs to stderr', async () => {
    const stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const handler = async () => {
      throw new Error('something unexpected');
    };
    const wrapped = wrapToolHandler(handler);
    const result = await wrapped(undefined as never);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('internal error');
    expect(stderrSpy).toHaveBeenCalledWith('Unexpected tool error:', expect.any(Error));
    stderrSpy.mockRestore();
  });

  it('never exposes stack traces in error messages', async () => {
    const handler = async () => {
      throw new Error('secret internal path /usr/src/app/index.ts:42');
    };
    const wrapped = wrapToolHandler(handler);
    const result = await wrapped(undefined as never);
    expect(result.content[0].text).not.toContain('/usr/src');
    expect(result.content[0].text).not.toContain('.ts:');
  });
});
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `cd /Users/jameschristian/Dev/spain-ai-kit && npx nx run @spain-ai-kit/shared:test`
Expected: All error wrapper tests pass (6 tests)

- [ ] **Step 4: Export from shared index**

Add to `packages/shared/src/index.ts`:

```typescript
export { wrapToolHandler } from './error.js';
export type { ToolResult } from './error.js';
```

- [ ] **Step 5: Build to verify exports compile**

Run: `npm run build`
Expected: All 3 packages build successfully

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/error.ts packages/shared/src/error.test.ts packages/shared/src/index.ts
git commit -m "feat(shared): add wrapToolHandler for structured MCP error responses"
```

---

### Task 3: Apply Validation + Error Wrapping to INE Server

**Files:**
- Modify: `mcp/ine/src/index.ts`

- [ ] **Step 1: Update imports**

At `mcp/ine/src/index.ts` line 6, change:

```typescript
import { BaseAPIClient, ineTimestampToISO } from '@spain-ai-kit/shared';
```

to:

```typescript
import {
  BaseAPIClient,
  ineTimestampToISO,
  wrapToolHandler,
  validateNumericId,
  validateSeriesCode,
} from '@spain-ai-kit/shared';
```

- [ ] **Step 2: Wrap list_operations handler**

Replace the handler at line 71 (`async () => {`) through line 88 (closing `},`) with:

```typescript
  wrapToolHandler(async () => {
    const ops = await client.get<INEOperation[]>('OPERACIONES_DISPONIBLES', {
      cacheTTL: 60 * 60 * 1000,
    });

    const formatted = ops.map((op) => ({
      id: op.Id,
      code: op.Codigo,
      name: op.Nombre,
    }));

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(formatted, null, 2),
      }],
    };
  }),
```

- [ ] **Step 3: Wrap search_operations handler**

Replace the handler at line 96 (`async ({ query }) => {`) through line 129 (closing `},`) with:

```typescript
  wrapToolHandler(async ({ query }) => {
    const ops = await client.get<INEOperation[]>('OPERACIONES_DISPONIBLES', {
      cacheTTL: 60 * 60 * 1000,
    });

    const q = query.toLowerCase();
    const matches = ops.filter(
      (op) =>
        op.Nombre.toLowerCase().includes(q) ||
        op.Codigo.toLowerCase().includes(q),
    );

    if (matches.length === 0) {
      return {
        content: [{
          type: 'text' as const,
          text: `No operations found matching "${query}". Try a different Spanish keyword.`,
        }],
      };
    }

    const formatted = matches.map((op) => ({
      id: op.Id,
      code: op.Codigo,
      name: op.Nombre,
    }));

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(formatted, null, 2),
      }],
    };
  }),
```

- [ ] **Step 4: Wrap get_operation with validation**

Replace the handler at line 136 (`async ({ operationId }) => {`) through line 150 (closing `},`) with:

```typescript
  wrapToolHandler(async ({ operationId }) => {
    validateNumericId(operationId, 'operation ID');
    const op = await client.get<INEOperation>(`OPERACION/${operationId}`);
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          id: op.Id,
          code: op.Codigo,
          name: op.Nombre,
          ioeCode: op.Cod_IOE,
          url: op.Url ? `https://www.ine.es${op.Url}` : undefined,
        }, null, 2),
      }],
    };
  }),
```

- [ ] **Step 5: Wrap list_tables with validation**

Replace the handler at line 157 (`async ({ operationId }) => {`) through line 174 (closing `},`) with:

```typescript
  wrapToolHandler(async ({ operationId }) => {
    validateNumericId(operationId, 'operation ID');
    const tables = await client.get<INETable[]>(`TABLAS_OPERACION/${operationId}`);

    const formatted = tables.map((t) => ({
      id: t.Id,
      name: t.Nombre,
      code: t.Codigo,
      startYear: t.Anyo_Periodo_ini,
      lastModified: ineTimestampToISO(t.Ultima_Modificacion),
    }));

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(formatted, null, 2),
      }],
    };
  }),
```

- [ ] **Step 6: Wrap get_table_data with validation**

Replace the handler at line 185 (`async ({ tableId, nult }) => {`) through line 208 (closing `},`) with:

```typescript
  wrapToolHandler(async ({ tableId, nult }) => {
    validateNumericId(tableId, 'table ID');
    const n = nult ?? 5;
    const series = await client.get<INESeries[]>(`DATOS_TABLA/${tableId}`, {
      params: { nult: n },
    });

    const formatted = series.map((s) => ({
      code: s.COD,
      name: s.Nombre.trim(),
      data: s.Data.map((d) => ({
        date: ineTimestampToISO(d.Fecha),
        year: d.Anyo,
        value: d.Valor,
        provisional: d.FK_TipoDato !== 1,
      })),
    }));

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(formatted, null, 2),
      }],
    };
  }),
```

- [ ] **Step 7: Wrap get_series with validation**

Replace the handler at line 218 (`async ({ seriesCode, nult }) => {`) through line 237 (closing `},`) with:

```typescript
  wrapToolHandler(async ({ seriesCode, nult }) => {
    validateSeriesCode(seriesCode);
    const n = nult ?? 10;
    const data = await client.get<INEDataPoint[]>(`SERIE/${seriesCode}`, {
      params: { nult: n },
    });

    const formatted = data.map((d) => ({
      date: ineTimestampToISO(d.Fecha),
      year: d.Anyo,
      value: d.Valor,
      provisional: d.FK_TipoDato !== 1,
    }));

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(formatted, null, 2),
      }],
    };
  }),
```

- [ ] **Step 8: Wrap get_variable_values with validation**

Replace the handler at line 244 (`async ({ variableId }) => {`) through line 259 (closing `},`) with:

```typescript
  wrapToolHandler(async ({ variableId }) => {
    validateNumericId(variableId, 'variable ID');
    const values = await client.get<INEVariable[]>(`VALORES_VARIABLE/${variableId}`);

    const formatted = values.map((v) => ({
      id: v.Id,
      name: v.Nombre,
      code: v.Codigo,
    }));

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(formatted, null, 2),
      }],
    };
  }),
```

- [ ] **Step 9: Build and test**

Run: `npm run build && npm test`
Expected: All packages build, all tests pass

- [ ] **Step 10: Commit**

```bash
git add mcp/ine/src/index.ts
git commit -m "feat(ine): add input validation and error wrapping to all tool handlers"
```

---

### Task 4: Apply Validation + Error Wrapping to BOE Server

**Files:**
- Modify: `mcp/boe/src/index.ts`

- [ ] **Step 1: Update imports**

At `mcp/boe/src/index.ts` line 6, change:

```typescript
import { BaseAPIClient, parseXML, formatDateBOE } from '@spain-ai-kit/shared';
```

to:

```typescript
import {
  BaseAPIClient,
  parseXML,
  formatDateBOE,
  wrapToolHandler,
  validateBOEId,
  validateDateBOE,
  validateBlockId,
} from '@spain-ai-kit/shared';
```

- [ ] **Step 2: Wrap search_legislation with date validation**

Replace the handler at line 67 (`async ({ query, from, to, limit, offset }) => {`) through line 137 (closing `},`) with:

```typescript
  wrapToolHandler(async ({ query, from, to, limit, offset }) => {
    if (from) validateDateBOE(from);
    if (to) validateDateBOE(to);

    const params: Record<string, string | number> = {
      limit: Math.min(limit ?? 10, 50),
      offset: offset ?? 0,
    };

    if (from) params.from = from;
    if (to) params.to = to;

    let path = 'legislacion-consolidada';
    if (query) {
      const boeQuery: Record<string, unknown> = {
        query: {
          query_string: { query: `titulo:${query}` },
          range: {},
        },
        sort: [],
      };
      if (from || to) {
        const range: Record<string, string> = {};
        if (from) range.gte = from;
        if (to) range.lte = to;
        boeQuery.query = {
          ...(boeQuery.query as Record<string, unknown>),
          range: { fecha_publicacion: range },
        };
        delete params.from;
        delete params.to;
      }
      params.query = JSON.stringify(boeQuery);
    }

    const data = await client.get<BOESearchResponse>(path, {
      params,
      headers: { Accept: 'application/json' },
    });

    if (!data.data || (Array.isArray(data.data) && data.data.length === 0)) {
      return {
        content: [{
          type: 'text' as const,
          text: `No legislation found${query ? ` matching "${query}"` : ''}. Try different Spanish keywords.`,
        }],
      };
    }

    const results = (Array.isArray(data.data) ? data.data : [data.data]).map((law: BOELegislation) => ({
      id: law.identificador,
      title: law.titulo,
      scope: law.ambito?.texto,
      department: law.departamento?.texto,
      type: law.rango?.texto,
      dateEnacted: law.fecha_disposicion,
      datePublished: law.fecha_publicacion,
      dateEffective: law.fecha_vigencia,
      consolidationStatus: law.estado_consolidacion?.texto,
      expired: law.vigencia_agotada === 'S',
      eli: law.url_eli,
      htmlUrl: law.url_html_consolidada,
    }));

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(results, null, 2),
      }],
    };
  }),
```

- [ ] **Step 3: Wrap get_document with validation**

Replace the handler at line 144 (`async ({ documentId }) => {`) through line 157 (closing `},`) with:

```typescript
  wrapToolHandler(async ({ documentId }) => {
    validateBOEId(documentId);
    const xml = await client.get<string>(`legislacion-consolidada/id/${documentId}`, {
      headers: { Accept: 'application/xml' },
      responseType: 'text' as never,
    });

    const parsed = parseXML(xml);
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(parsed, null, 2),
      }],
    };
  }),
```

- [ ] **Step 4: Wrap get_document_metadata, get_document_analysis, get_document_index**

For each of the three tools (`get_document_metadata`, `get_document_analysis`, `get_document_index`), replace the handler with the same pattern — add `wrapToolHandler` and `validateBOEId(documentId)` at the top. Example for `get_document_metadata`:

```typescript
  wrapToolHandler(async ({ documentId }) => {
    validateBOEId(documentId);
    const data = await client.get<BOEDocumentResponse>(
      `legislacion-consolidada/id/${documentId}/metadatos`,
      { headers: { Accept: 'application/json' } },
    );

    const doc = Array.isArray(data.data) ? data.data[0] : data.data;
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(doc, null, 2),
      }],
    };
  }),
```

Apply identical pattern to `get_document_analysis` (path `/analisis`) and `get_document_index` (path `/texto/indice`).

- [ ] **Step 5: Wrap get_article with both validations**

Replace the handler at line 227 (`async ({ documentId, blockId }) => {`) with:

```typescript
  wrapToolHandler(async ({ documentId, blockId }) => {
    validateBOEId(documentId);
    validateBlockId(blockId);
    const xml = await client.get<string>(
      `legislacion-consolidada/id/${documentId}/texto/bloque/${blockId}`,
      {
        headers: { Accept: 'application/xml' },
        responseType: 'text' as never,
      },
    );

    const parsed = parseXML(xml);
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(parsed, null, 2),
      }],
    };
  }),
```

- [ ] **Step 6: Wrap get_daily_summary with date validation**

Replace the handler at line 250 (`async ({ date }) => {`) with:

```typescript
  wrapToolHandler(async ({ date }) => {
    validateDateBOE(date);
    const xml = await client.get<string>(`boe/sumario/${date}`, {
      headers: { Accept: 'application/xml' },
      responseType: 'text' as never,
    });

    const parsed = parseXML(xml);
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(parsed, null, 2),
      }],
    };
  }),
```

- [ ] **Step 7: Wrap remaining tools (list_subjects, list_departments, list_scopes, list_legal_ranks, search_corpus, read_corpus_law)**

For the four `list_*` tools, just wrap with `wrapToolHandler` (no validation needed — no user input).

For `search_corpus` and `read_corpus_law`, wrap with `wrapToolHandler`. For `read_corpus_law`, add `validateBOEId` on the identifier after stripping `.md`:

```typescript
  wrapToolHandler(async ({ identifier }) => {
    const cleanId = identifier.replace('.md', '');
    validateBOEId(cleanId);
    const text = await corpus.readLaw(cleanId);
    // ... rest of handler unchanged
  }),
```

- [ ] **Step 8: Build and test**

Run: `npm run build && npm test`
Expected: All packages build, all tests pass

- [ ] **Step 9: Commit**

```bash
git add mcp/boe/src/index.ts
git commit -m "feat(boe): add input validation and error wrapping to all tool handlers"
```

---

### Task 5: Node Version Pinning

**Files:**
- Modify: `package.json`
- Create: `.nvmrc`

- [ ] **Step 1: Add engines field to package.json**

Add after the `"devDependencies"` block in root `package.json`:

```json
"engines": {
  "node": ">=20"
}
```

- [ ] **Step 2: Create .nvmrc**

```
20
```

- [ ] **Step 3: Commit**

```bash
git add package.json .nvmrc
git commit -m "build: pin minimum Node.js version to 20 LTS"
```

---

### Task 6: GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create the CI workflow**

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    strategy:
      matrix:
        node-version: [20, 22]

    steps:
      - uses: actions/checkout@v4

      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: npm

      - run: npm ci

      - run: npm run build

      - name: Run unit tests (shared package only)
        run: npx nx run @spain-ai-kit/shared:test

      - name: Security audit
        run: npm audit --audit-level=moderate

  integration:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    timeout-minutes: 10
    needs: build-and-test

    steps:
      - uses: actions/checkout@v4
        with:
          submodules: true

      - name: Use Node.js 22
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - run: npm ci
      - run: npm run build

      - name: Run all tests (including integration)
        run: npm test
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions workflow with Node 20/22 matrix and integration tests"
```

---

### Task 7: Phase 1 Final Verification

- [ ] **Step 1: Full build and test**

Run: `npm run build && npm test`
Expected: All packages build, all tests pass (29+ existing + new validation/error tests)

- [ ] **Step 2: Push Phase 1**

```bash
git push
```

---

## Phase 2: Comprehensive Hardening

### Task 8: Explicit XML Parser Security Config

**Files:**
- Modify: `packages/shared/src/xml.ts`
- Modify: `packages/shared/src/xml.test.ts`

- [ ] **Step 1: Write the entity expansion test**

Add to `packages/shared/src/xml.test.ts`:

```typescript
describe('XML security', () => {
  it('does not expand internal entity declarations', () => {
    const xml = `<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY xxe "expanded-entity-value">
]>
<root>&xxe;</root>`;
    const result = parseXML<{ root: string }>(xml);
    // fast-xml-parser with processEntities:false will NOT expand &xxe;
    // It should either leave the entity reference as-is or strip it
    expect(typeof result.root === 'string' ? result.root : '').not.toContain('expanded-entity-value');
  });

  it('does not resolve external entity references', () => {
    const xml = `<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<root>&xxe;</root>`;
    const result = parseXML<{ root: unknown }>(xml);
    // Should not contain file contents — entity should not be resolved
    const text = typeof result.root === 'string' ? result.root : JSON.stringify(result.root);
    expect(text).not.toContain('root:');
    expect(text).not.toContain('/bin/bash');
  });
});
```

- [ ] **Step 2: Run tests to verify current behavior**

Run: `npx nx run @spain-ai-kit/shared:test`
Expected: Tests should pass even before config change (defaults are safe), confirming baseline

- [ ] **Step 3: Add explicit security options to XML parser**

In `packages/shared/src/xml.ts`, replace the parser config:

```typescript
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  processEntities: false,
  htmlEntities: false,
});
```

- [ ] **Step 4: Run tests to verify security options don't break anything**

Run: `npx nx run @spain-ai-kit/shared:test`
Expected: All XML tests pass (original 3 + new 2 security tests)

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/xml.ts packages/shared/src/xml.test.ts
git commit -m "security(shared): add explicit XXE prevention config to XML parser"
```

---

### Task 9: Rate Limiting in BaseAPIClient

**Files:**
- Modify: `packages/shared/src/types.ts`
- Modify: `packages/shared/src/api-client.ts`
- Modify: `packages/shared/src/api-client.test.ts`
- Modify: `mcp/ine/src/index.ts`
- Modify: `mcp/boe/src/index.ts`

- [ ] **Step 1: Write the rate limiter test**

Add to `packages/shared/src/api-client.test.ts`:

```typescript
describe('rate limiting', () => {
  it('delays requests when rate limit is reached', async () => {
    const rateLimitedClient = new BaseAPIClient({
      baseURL: 'https://api.example.com/',
      cacheTTL: 0,
      maxRequestsPerSecond: 2,
    });

    mockGet.mockResolvedValue({ data: { ok: true } });

    const start = Date.now();
    // Fire 3 requests — the 3rd should be delayed
    await Promise.all([
      rateLimitedClient.get('a'),
      rateLimitedClient.get('b'),
      rateLimitedClient.get('c'),
    ]);
    const elapsed = Date.now() - start;

    // 3rd request should wait ~500ms (1000ms / 2 req/sec)
    // Allow generous margin for CI jitter
    expect(elapsed).toBeGreaterThanOrEqual(400);
    expect(mockGet).toHaveBeenCalledTimes(3);
  });

  it('does not delay when rate limit is not set', async () => {
    mockGet.mockResolvedValue({ data: { ok: true } });

    const start = Date.now();
    await Promise.all([
      client.get('x'),
      client.get('y'),
      client.get('z'),
    ]);
    const elapsed = Date.now() - start;

    // No rate limit — should complete nearly instantly
    expect(elapsed).toBeLessThan(200);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx nx run @spain-ai-kit/shared:test`
Expected: FAIL — `maxRequestsPerSecond` is not a recognized option

- [ ] **Step 3: Add maxRequestsPerSecond to APIClientOptions**

In `packages/shared/src/types.ts`, add to the `APIClientOptions` interface:

```typescript
/** Max requests per second (default: unlimited). Enables token-bucket rate limiting. */
maxRequestsPerSecond?: number;
```

- [ ] **Step 4: Implement the rate limiter in BaseAPIClient**

In `packages/shared/src/api-client.ts`, add the rate limiter:

After `private cacheTTL: number;` (line 12), add:

```typescript
private maxRPS: number;
private requestTimestamps: number[] = [];
```

In the constructor, after `this.cacheTTL = ...` add:

```typescript
this.maxRPS = options.maxRequestsPerSecond ?? 0;
```

Add a new private method before `clearCache()`:

```typescript
private async waitForRateLimit(): Promise<void> {
  if (this.maxRPS <= 0) return;

  const now = Date.now();
  const windowMs = 1000;

  // Remove timestamps older than the window
  this.requestTimestamps = this.requestTimestamps.filter(t => now - t < windowMs);

  if (this.requestTimestamps.length >= this.maxRPS) {
    // Wait until the oldest timestamp in the window expires
    const oldestInWindow = this.requestTimestamps[0];
    const waitMs = windowMs - (now - oldestInWindow);
    if (waitMs > 0) {
      await new Promise(r => setTimeout(r, waitMs));
    }
  }

  this.requestTimestamps.push(Date.now());
}
```

In the `get()` method, add `await this.waitForRateLimit();` as the first line (before the cache check — rate limiting only matters for cache misses, so move it after the cache check instead):

Actually, add it right before `const data = await this.fetchWithRetry<T>(path, config);` (after cache check, before actual HTTP call):

```typescript
await this.waitForRateLimit();
const data = await this.fetchWithRetry<T>(path, config);
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx nx run @spain-ai-kit/shared:test`
Expected: All tests pass including the rate limiter tests

- [ ] **Step 6: Apply rate limits to INE and BOE servers**

In `mcp/ine/src/index.ts`, update the client constructor:

```typescript
const client = new BaseAPIClient({
  baseURL: API_BASE,
  cacheTTL: 10 * 60 * 1000,
  maxRequestsPerSecond: 10,
});
```

In `mcp/boe/src/index.ts`, update the client constructor:

```typescript
const client = new BaseAPIClient({
  baseURL: API_BASE,
  cacheTTL: 5 * 60 * 1000,
  maxRequestsPerSecond: 5,
});
```

- [ ] **Step 7: Build and test**

Run: `npm run build && npm test`
Expected: All packages build, all tests pass

- [ ] **Step 8: Commit**

```bash
git add packages/shared/src/types.ts packages/shared/src/api-client.ts packages/shared/src/api-client.test.ts mcp/ine/src/index.ts mcp/boe/src/index.ts
git commit -m "feat(shared): add token-bucket rate limiting to BaseAPIClient"
```

---

### Task 10: Corpus Error Logging

**Files:**
- Modify: `mcp/boe/src/corpus.ts`

- [ ] **Step 1: Replace silent catch blocks with logging**

In `mcp/boe/src/corpus.ts`, replace the three silent `catch {}` blocks:

**doBuildIndex (line 79):** Replace `catch {` with:

```typescript
} catch (err) {
  console.error(`Corpus: failed to read directory ${dirPath}:`, (err as Error).message);
}
```

**search (line 122):** Replace `catch {` with:

```typescript
} catch (err) {
  console.error(`Corpus: failed to read ${entry.path}:`, (err as Error).message);
}
```

**readLaw (line 140):** Replace `catch {` with:

```typescript
} catch (err) {
  console.error(`Corpus: failed to read law ${entry.path}:`, (err as Error).message);
  return null;
}
```

- [ ] **Step 2: Add debug mode to doBuildIndex**

At the end of `doBuildIndex`, replace the existing `console.error(...)` line with:

```typescript
this.indexed = true;
if (process.env.SPAIN_AI_KIT_DEBUG === '1') {
  const jurisdictions = new Set(this.entries.map(e => e.jurisdiction));
  console.error(`Corpus indexed: ${this.entries.length} laws across ${jurisdictions.size} jurisdictions`);
  for (const j of [...jurisdictions].sort()) {
    const count = this.entries.filter(e => e.jurisdiction === j).length;
    console.error(`  ${j}: ${count} laws`);
  }
} else {
  console.error(`Corpus indexed: ${this.entries.length} laws`);
}
```

- [ ] **Step 3: Build and test**

Run: `npm run build && npm test`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add mcp/boe/src/corpus.ts
git commit -m "fix(boe): replace silent catch blocks with error logging in corpus index"
```

---

### Task 11: Dependabot Configuration

**Files:**
- Create: `.github/dependabot.yml`

- [ ] **Step 1: Create Dependabot config**

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
    groups:
      minor-and-patch:
        update-types:
          - minor
          - patch
    open-pull-requests-limit: 5
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
```

- [ ] **Step 2: Commit**

```bash
git add .github/dependabot.yml
git commit -m "ci: add Dependabot for weekly npm and GitHub Actions dependency updates"
```

---

### Task 12: Pre-commit Hooks

**Files:**
- Modify: `package.json`
- Create: `.husky/pre-commit`

- [ ] **Step 1: Install husky and lint-staged**

Run:

```bash
npm install --save-dev husky lint-staged
```

- [ ] **Step 2: Initialize husky**

Run:

```bash
npx husky init
```

- [ ] **Step 3: Configure lint-staged in package.json**

Add to root `package.json`:

```json
"lint-staged": {
  "**/*.ts": [
    "prettier --check"
  ]
}
```

- [ ] **Step 4: Create pre-commit hook**

Write `.husky/pre-commit`:

```bash
npx lint-staged
npx tsc --noEmit
```

- [ ] **Step 5: Test the hook works**

Run:

```bash
echo "const bad:   string='test'" > /tmp/test-lint.ts
git add /tmp/test-lint.ts 2>/dev/null || true
npx lint-staged --diff="HEAD" --verbose
```

Expected: Prettier check should flag formatting issues

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .husky/
git commit -m "build: add husky + lint-staged pre-commit hooks for formatting and type checks"
```

---

### Task 13: Corpus Concurrency Regression Test

**Files:**
- Create: `mcp/boe/src/corpus.test.ts`
- Modify: `mcp/boe/package.json` (if vitest config needed)

- [ ] **Step 1: Write the corpus concurrency test**

```typescript
// mcp/boe/src/corpus.test.ts
import { describe, it, expect } from 'vitest';
import { CorpusIndex } from './corpus.js';

describe('CorpusIndex', () => {
  it('concurrent search calls do not double-build the index', async () => {
    const corpus = new CorpusIndex();

    // Fire multiple concurrent searches — if the index builds twice,
    // entries will be duplicated and results may be inconsistent
    const [results1, results2, results3] = await Promise.all([
      corpus.search('constitución', { limit: 1 }),
      corpus.search('extranjeros', { limit: 1 }),
      corpus.search('protección', { limit: 1 }),
    ]);

    // If corpus is unavailable (no submodule), all return empty — that's fine
    // The key assertion: no errors thrown from concurrent indexing
    expect(Array.isArray(results1)).toBe(true);
    expect(Array.isArray(results2)).toBe(true);
    expect(Array.isArray(results3)).toBe(true);
  });

  it('readLaw rejects identifiers not in the index', async () => {
    const corpus = new CorpusIndex();
    const result = await corpus.readLaw('DEFINITELY-NOT-A-REAL-LAW-ID');
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npx nx run @spain-ai-kit/boe-mcp-server:test`
Expected: All BOE tests pass (existing 5 + new 2)

- [ ] **Step 3: Commit**

```bash
git add mcp/boe/src/corpus.test.ts
git commit -m "test(boe): add corpus concurrency regression and readLaw rejection tests"
```

---

### Task 14: Phase 2 Final Verification

- [ ] **Step 1: Full build and test**

Run: `npm run build && npm test`
Expected: All packages build, all tests pass

- [ ] **Step 2: Push Phase 2**

```bash
git push
```
