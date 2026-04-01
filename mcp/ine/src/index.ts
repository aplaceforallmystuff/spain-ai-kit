#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod/v3';
import { BaseAPIClient, ineTimestampToISO, wrapToolHandler, validateNumericId, validateSeriesCode } from '@spain-ai-kit/shared';

const API_BASE = 'https://servicios.ine.es/wstempus/js/ES/';

const client = new BaseAPIClient({
  baseURL: API_BASE,
  cacheTTL: 10 * 60 * 1000, // 10 min — INE data updates infrequently
});

// --- INE API response types ---

interface INEOperation {
  Id: number;
  Cod_IOE: string;
  Nombre: string;
  Codigo: string;
  Url?: string;
}

interface INETable {
  Id: number;
  Nombre: string;
  Codigo: string;
  FK_Periodicidad: number;
  FK_Publicacion: number;
  Anyo_Periodo_ini: string;
  Ultima_Modificacion: number;
}

interface INEDataPoint {
  Fecha: number;
  FK_TipoDato: number;
  FK_Periodo: number;
  Anyo: number;
  Valor: number;
  Secreto: boolean;
}

interface INESeries {
  COD: string;
  Nombre: string;
  FK_Unidad: number;
  FK_Escala: number;
  Data: INEDataPoint[];
}

interface INEVariable {
  Id: number;
  Nombre: string;
  Codigo?: string;
}

// --- Server setup ---

const server = new McpServer({
  name: '@spain-ai-kit/ine-mcp-server',
  version: '0.1.0',
});

// --- Tools ---

server.tool(
  'list_operations',
  'List all available statistical operations from INE (70+ datasets covering demographics, economics, employment, housing, tourism, etc.)',
  {},
  wrapToolHandler(async () => {
    const ops = await client.get<INEOperation[]>('OPERACIONES_DISPONIBLES', {
      cacheTTL: 60 * 60 * 1000, // 1 hour — this list rarely changes
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
);

// @ts-expect-error — MCP SDK deep type instantiation with zod generics
server.tool(
  'search_operations',
  'Search INE statistical operations by keyword (in Spanish). Returns matching operations with their IDs.',
  { query: z.string().describe('Search keyword (e.g., "población", "empleo", "precios", "turismo")') },
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
);

server.tool(
  'get_operation',
  'Get detailed metadata about a specific INE statistical operation by its ID.',
  { operationId: z.number().describe('Operation ID (from list_operations or search_operations)') },
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
);

server.tool(
  'list_tables',
  'List available data tables for a specific INE operation. Each table contains one or more time series.',
  { operationId: z.number().describe('Operation ID') },
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
);

// @ts-expect-error — MCP SDK deep type instantiation with zod generics
server.tool(
  'get_table_data',
  'Get actual data from an INE table. Returns time series with values. Use nult parameter to limit to most recent data points.',
  {
    tableId: z.number().describe('Table ID (from list_tables)'),
    nult: z.number().optional().describe('Number of most recent data points to return (default: 5)'),
  },
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
);

server.tool(
  'get_series',
  'Get a specific time series by its code. Returns historical data points.',
  {
    seriesCode: z.string().describe('Series code (e.g., "IPC290751")'),
    nult: z.number().optional().describe('Number of most recent data points (default: 10)'),
  },
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
);

server.tool(
  'get_variable_values',
  'Get the possible values for an INE variable (e.g., list of provinces, age groups, nationalities).',
  { variableId: z.number().describe('Variable ID') },
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
);

// --- Start ---

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('INE MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
