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
  cacheTTL: 30 * 60 * 1000,
  maxRequestsPerSecond: 5,
});

const server = new McpServer({
  name: '@spain-ai-kit/aemet-mcp-server',
  version: '0.1.0',
});

// --- Municipality cache ---

let municipiosCache: Array<{ id: string; nombre: string }> | null = null;

async function getMunicipios(): Promise<Array<{ id: string; nombre: string }>> {
  if (municipiosCache) return municipiosCache;
  municipiosCache =
    await client.getData<Array<{ id: string; nombre: string }>>('api/maestro/municipios');
  return municipiosCache;
}

// --- Schemas ---

const searchMunicipalitiesSchema = {
  query: z
    .string()
    .describe('Municipality name to search (e.g., "Madrid", "Valencia", "Barcelona")'),
} as const;

const municipioSchema = {
  municipio: z
    .string()
    .describe(
      'Municipality code (5 digits, e.g., "28079" for Madrid). Use search_municipalities to find codes.'
    ),
} as const;

const municipioHourlySchema = {
  municipio: z.string().describe('Municipality code (5 digits)'),
} as const;

const stationSchema = {
  stationId: z.string().describe('Station climatological index (e.g., "3129" for Madrid Retiro)'),
} as const;

const alertsSchema = {
  area: z
    .string()
    .optional()
    .describe('Area code: "esp" for all Spain, or region code 61-79 (default: "esp")'),
} as const;

const beachSchema = {
  beachCode: z.string().describe('Beach code from AEMET'),
} as const;

const uvSchema = {
  day: z.number().optional().describe('Day ahead: 0=today, 1=tomorrow, up to 4 (default: 0)'),
} as const;

const fireRiskSchema = {
  area: z
    .string()
    .optional()
    .describe('"p" for mainland + Balearics, "c" for Canary Islands (default: "p")'),
} as const;

// --- Tools ---

server.tool(
  'list_municipalities',
  'List all Spanish municipalities with their AEMET codes. Use these codes for forecast lookups.',
  {},
  wrapToolHandler(async () => {
    const municipios = await getMunicipios();
    return {
      content: [
        {
          type: 'text' as const,
          text: `${municipios.length} municipalities available. Use search_municipalities to find specific ones by name.`,
        },
      ],
    };
  })
);

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore TS2589: MCP SDK type inference depth limit with many tools
server.tool(
  'search_municipalities',
  'Search Spanish municipalities by name. Returns matching municipalities with their AEMET codes for use in forecast tools.',
  searchMunicipalitiesSchema,
  wrapToolHandler(async ({ query }) => {
    const municipios = await getMunicipios();
    const q = query.toLowerCase();
    const matches = municipios.filter((m) => m.nombre.toLowerCase().includes(q));
    if (matches.length === 0) {
      return {
        content: [{ type: 'text' as const, text: `No municipalities found matching "${query}".` }],
      };
    }
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(matches.slice(0, 20), null, 2),
        },
      ],
    };
  })
);

server.tool(
  'get_forecast_daily',
  'Get daily weather forecast for a Spanish municipality (today + next days). Includes temperature, precipitation probability, wind, sky state.',
  municipioSchema,
  wrapToolHandler(async ({ municipio }) => {
    validateMunicipioCode(municipio);
    const data = await client.getData<unknown>(
      `api/prediccion/especifica/municipio/diaria/${municipio}`
    );
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
    };
  })
);

server.tool(
  'get_forecast_hourly',
  'Get hourly weather forecast (48 hours) for a Spanish municipality. More granular than daily forecast.',
  municipioHourlySchema,
  wrapToolHandler(async ({ municipio }) => {
    validateMunicipioCode(municipio);
    const data = await client.getData<unknown>(
      `api/prediccion/especifica/municipio/horaria/${municipio}`
    );
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
    };
  })
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
  })
);

server.tool(
  'get_station_observations',
  'Get the last 12 hours of weather observations from a specific AEMET station.',
  stationSchema,
  wrapToolHandler(async ({ stationId }) => {
    validateStationId(stationId);
    const data = await client.getData<unknown>(
      `api/observacion/convencional/datos/estacion/${stationId}`
    );
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
    };
  })
);

server.tool(
  'get_weather_alerts',
  'Get active adverse weather alerts (rain, wind, snow, heat, cold) for a region or all of Spain.',
  alertsSchema,
  wrapToolHandler(async ({ area }) => {
    const areaCode = area ?? 'esp';
    validateAEMETArea(areaCode);
    const data = await client.getData<unknown>(`api/avisos_cap/ultimoelaborado/area/${areaCode}`);
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
    };
  })
);

server.tool(
  'get_beach_forecast',
  'Get weather forecast for a specific beach (cloudiness, precipitation, wind, wave height, water temperature).',
  beachSchema,
  wrapToolHandler(async ({ beachCode }) => {
    const data = await client.getData<unknown>(`api/prediccion/especifica/playa/${beachCode}`);
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
    };
  })
);

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore TS2589: MCP SDK type inference depth limit with many tools
server.tool(
  'get_uv_index',
  'Get UV radiation index prediction for Spain. Higher values mean more sun protection needed.',
  uvSchema,
  wrapToolHandler(async ({ day }) => {
    const d = day ?? 0;
    const data = await client.getData<unknown>(`api/prediccion/especifica/uvi/${d}`);
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
    };
  })
);

server.tool(
  'get_fire_risk',
  'Get current forest fire risk levels across Spain.',
  fireRiskSchema,
  wrapToolHandler(async ({ area }) => {
    const areaCode = area ?? 'p';
    validateAEMETArea(areaCode);
    const data = await client.getData<unknown>(
      `api/incendios/mapasriesgo/estimado/area/${areaCode}`
    );
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
    };
  })
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
