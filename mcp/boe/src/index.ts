#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod/v3';
import { BaseAPIClient, parseXML, formatDateBOE } from '@spain-ai-kit/shared';
import { CorpusIndex } from './corpus.js';

const API_BASE = 'https://www.boe.es/datosabiertos/api/';

const client = new BaseAPIClient({
  baseURL: API_BASE,
  cacheTTL: 5 * 60 * 1000,
});

const corpus = new CorpusIndex();

// --- BOE API response types ---

interface BOELegislation {
  fecha_actualizacion: string;
  identificador: string;
  ambito: { codigo: string; texto: string };
  departamento: { codigo: string; texto: string };
  rango: { codigo: string; texto: string };
  fecha_disposicion: string;
  numero_oficial: string;
  titulo: string;
  fecha_publicacion: string;
  fecha_vigencia: string;
  vigencia_agotada: string;
  estado_consolidacion: { codigo: string; texto: string };
  url_eli: string;
  url_html_consolidada: string;
}

interface BOESearchResponse {
  status: { code: string; text: string };
  data: BOELegislation[];
}

interface BOEDocumentResponse {
  status: { code: string; text: string };
  data: Record<string, unknown> | Record<string, unknown>[];
}

// --- Server setup ---

const server = new McpServer({
  name: '@spain-ai-kit/boe-mcp-server',
  version: '0.1.0',
});

// --- Live API Tools ---

// @ts-expect-error — MCP SDK deep type instantiation with zod generics
server.tool(
  'search_legislation',
  'Search Spanish consolidated legislation by keyword, date range, or scope. Returns matching laws with metadata. Keywords should be in Spanish.',
  {
    query: z.string().optional().describe('Search keyword in Spanish (e.g., "extranjeros", "protección datos", "vivienda")'),
    from: z.string().optional().describe('Start date filter for last update (YYYYMMDD format)'),
    to: z.string().optional().describe('End date filter for last update (YYYYMMDD format)'),
    limit: z.number().optional().describe('Max results to return (default: 10, max: 50)'),
    offset: z.number().optional().describe('Result offset for pagination (default: 0)'),
  },
  async ({ query, from, to, limit, offset }) => {
    const params: Record<string, string | number> = {
      limit: Math.min(limit ?? 10, 50),
      offset: offset ?? 0,
    };

    if (from) params.from = from;
    if (to) params.to = to;

    let path = 'legislacion-consolidada';
    if (query) {
      // BOE uses an Elasticsearch-style query DSL with query_string, range, and sort
      const boeQuery: Record<string, unknown> = {
        query: {
          query_string: { query: `titulo:${query}` },
          range: {},
        },
        sort: [],
      };
      // Integrate date range into the query object if provided
      if (from || to) {
        const range: Record<string, string> = {};
        if (from) range.gte = from;
        if (to) range.lte = to;
        boeQuery.query = {
          ...(boeQuery.query as Record<string, unknown>),
          range: { fecha_publicacion: range },
        };
        // Remove from/to from URL params since they're in the query object
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
  },
);

server.tool(
  'get_document',
  'Get full metadata and legal analysis for a specific BOE document by its identifier (e.g., "BOE-A-2000-544").',
  { documentId: z.string().describe('BOE document identifier (e.g., "BOE-A-2000-544")') },
  async ({ documentId }) => {
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
  },
);

server.tool(
  'get_document_metadata',
  'Get metadata for a specific BOE document (title, dates, scope, department, status).',
  { documentId: z.string().describe('BOE document identifier') },
  async ({ documentId }) => {
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
  },
);

server.tool(
  'get_document_analysis',
  'Get legal analysis for a BOE document — subjects, references to other laws, amendments, and legal relationships.',
  { documentId: z.string().describe('BOE document identifier') },
  async ({ documentId }) => {
    const data = await client.get<BOEDocumentResponse>(
      `legislacion-consolidada/id/${documentId}/analisis`,
      { headers: { Accept: 'application/json' } },
    );

    const doc = Array.isArray(data.data) ? data.data[0] : data.data;
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(doc, null, 2),
      }],
    };
  },
);

server.tool(
  'get_document_index',
  'Get the table of contents (article/section structure) of a consolidated law.',
  { documentId: z.string().describe('BOE document identifier') },
  async ({ documentId }) => {
    const data = await client.get<BOEDocumentResponse>(
      `legislacion-consolidada/id/${documentId}/texto/indice`,
      { headers: { Accept: 'application/json' } },
    );

    const doc = Array.isArray(data.data) ? data.data[0] : data.data;
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(doc, null, 2),
      }],
    };
  },
);

server.tool(
  'get_article',
  'Get the text of a specific article or section from a consolidated law.',
  {
    documentId: z.string().describe('BOE document identifier'),
    blockId: z.string().describe('Article/section block ID (from get_document_index)'),
  },
  async ({ documentId, blockId }) => {
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
  },
);

server.tool(
  'get_daily_summary',
  'Get the BOE daily gazette summary for a specific date. Shows all official publications for that day.',
  { date: z.string().describe('Date in YYYYMMDD format (e.g., "20260328")') },
  async ({ date }) => {
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
  },
);

server.tool(
  'list_subjects',
  'List all subject/topic categories used to classify BOE legislation.',
  {},
  async () => {
    const data = await client.get<BOEDocumentResponse>('datos-auxiliares/materias', {
      headers: { Accept: 'application/json' },
      cacheTTL: 60 * 60 * 1000, // 1 hour
    });

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(data.data, null, 2),
      }],
    };
  },
);

server.tool(
  'list_departments',
  'List all government departments that publish in the BOE.',
  {},
  async () => {
    const data = await client.get<BOEDocumentResponse>('datos-auxiliares/departamentos', {
      headers: { Accept: 'application/json' },
      cacheTTL: 60 * 60 * 1000,
    });

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(data.data, null, 2),
      }],
    };
  },
);

server.tool(
  'list_scopes',
  'List legal scopes (e.g., Estatal, Autonómico) used to classify BOE legislation.',
  {},
  async () => {
    const data = await client.get<BOEDocumentResponse>('datos-auxiliares/ambitos', {
      headers: { Accept: 'application/json' },
      cacheTTL: 60 * 60 * 1000,
    });

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(data.data, null, 2),
      }],
    };
  },
);

server.tool(
  'list_legal_ranks',
  'List legal document ranks/types (e.g., Ley Orgánica, Real Decreto, Constitución).',
  {},
  async () => {
    const data = await client.get<BOEDocumentResponse>('datos-auxiliares/rangos', {
      headers: { Accept: 'application/json' },
      cacheTTL: 60 * 60 * 1000,
    });

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(data.data, null, 2),
      }],
    };
  },
);

// --- Corpus Tools (legalize-es submodule) ---

server.tool(
  'search_corpus',
  'Search the legalize-es legislation corpus (12,000+ Spanish laws as Markdown files). Searches full law text by keyword. Requires the legalize-es git submodule to be initialized.',
  {
    query: z.string().describe('Search keyword (in Spanish)'),
    jurisdiction: z.string().optional().describe('Filter by jurisdiction folder (e.g., "es" for national, "es-vc" for Valencia). Default: all.'),
    limit: z.number().optional().describe('Max results (default: 10)'),
  },
  async ({ query, jurisdiction, limit }) => {
    const results = await corpus.search(query, {
      jurisdiction,
      limit: limit ?? 10,
    });

    if (results.length === 0) {
      if (!corpus.isAvailable()) {
        return {
          content: [{
            type: 'text' as const,
            text: 'legalize-es corpus not found. Run `git submodule update --init` in the spain-ai-kit root to enable corpus search.',
          }],
        };
      }
      return {
        content: [{
          type: 'text' as const,
          text: `No laws found matching "${query}" in the corpus.`,
        }],
      };
    }

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(results, null, 2),
      }],
    };
  },
);

server.tool(
  'read_corpus_law',
  'Read the full Markdown text of a specific law from the legalize-es corpus by its BOE identifier or filename.',
  { identifier: z.string().describe('BOE document ID (e.g., "BOE-A-2000-544") or filename (e.g., "BOE-A-2000-544.md")') },
  async ({ identifier }) => {
    const text = await corpus.readLaw(identifier);

    if (!text) {
      if (!corpus.isAvailable()) {
        return {
          content: [{
            type: 'text' as const,
            text: 'legalize-es corpus not found. Run `git submodule update --init` in the spain-ai-kit root to enable corpus reading.',
          }],
        };
      }
      return {
        content: [{
          type: 'text' as const,
          text: `Law "${identifier}" not found in the corpus.`,
        }],
      };
    }

    return {
      content: [{
        type: 'text' as const,
        text,
      }],
    };
  },
);

// --- Start ---

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('BOE MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
