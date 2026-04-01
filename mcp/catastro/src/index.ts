#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  BaseAPIClient,
  parseXML,
  wrapToolHandler,
  validateProvinceCode,
  validateMunicipalityCode,
  validateCadastralRef,
  validateCoordinate,
} from '@spain-ai-kit/shared';
import { z } from 'zod/v3';

const CALLEJERO_BASE =
  'https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCallejeroCodigos.asmx/';
const COORDENADAS_BASE =
  'https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCoordenadas.asmx/';

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
  version: '0.1.2',
});

function extractCatastroError(parsed: Record<string, unknown>): string | null {
  const root = Object.values(parsed)[0] as Record<string, unknown> | undefined;
  if (!root) return null;
  const lerr = root['lerr'] as Record<string, unknown> | undefined;
  if (!lerr) return null;
  const err = lerr['err'] as Record<string, unknown> | undefined;
  if (!err) return null;
  return (err['des'] as string) ?? null;
}

// ─── Directory tools ────────────────────────────────────────────────────────

server.tool(
  'list_provinces',
  'List all Spanish provinces with their codes. Use province codes for other Catastro lookups.',
  {},
  wrapToolHandler(async () => {
    const xml = await callejero.get<string>('ConsultaProvincia', {
      cacheTTL: 24 * 60 * 60 * 1000,
      responseType: 'text' as never,
    });
    const parsed = parseXML(xml);
    const error = extractCatastroError(parsed);
    if (error) throw new Error(`Catastro error: ${error}`);
    return { content: [{ type: 'text', text: JSON.stringify(parsed, null, 2) }] };
  })
);

// @ts-expect-error — MCP SDK deep type instantiation with zod generics
server.tool(
  'list_municipalities',
  'List municipalities in a Spanish province. Use the province code from list_provinces.',
  { provinceCode: z.string() },
  wrapToolHandler(async ({ provinceCode }) => {
    validateProvinceCode(provinceCode);
    const xml = await callejero.get<string>('ConsultaMunicipioCodigos', {
      cacheTTL: 24 * 60 * 60 * 1000,
      responseType: 'text' as never,
      params: {
        CodigoProvincia: provinceCode,
        CodigoMunicipio: '',
        CodigoMunicipioINE: '',
      },
    });
    const parsed = parseXML(xml);
    const error = extractCatastroError(parsed);
    if (error) throw new Error(`Catastro error: ${error}`);
    return { content: [{ type: 'text', text: JSON.stringify(parsed, null, 2) }] };
  })
);

server.tool(
  'list_streets',
  'List streets in a municipality. Use codes from list_provinces and list_municipalities.',
  { provinceCode: z.string(), municipalityCode: z.string() },
  wrapToolHandler(async ({ provinceCode, municipalityCode }) => {
    validateProvinceCode(provinceCode);
    validateMunicipalityCode(municipalityCode);
    const xml = await callejero.get<string>('ConsultaViaCodigos', {
      cacheTTL: 1 * 60 * 60 * 1000,
      responseType: 'text' as never,
      params: {
        CodigoProvincia: provinceCode,
        CodigoMunicipio: municipalityCode,
        CodigoMunicipioINE: '',
        CodigoVia: '',
      },
    });
    const parsed = parseXML(xml);
    const error = extractCatastroError(parsed);
    if (error) throw new Error(`Catastro error: ${error}`);
    return { content: [{ type: 'text', text: JSON.stringify(parsed, null, 2) }] };
  })
);

server.tool(
  'lookup_address',
  'Get the cadastral reference for a specific street address. Use street codes from list_streets.',
  {
    provinceCode: z.string(),
    municipalityCode: z.string(),
    streetCode: z.string(),
    number: z.string(),
  },
  wrapToolHandler(async ({ provinceCode, municipalityCode, streetCode, number }) => {
    validateProvinceCode(provinceCode);
    validateMunicipalityCode(municipalityCode);
    const xml = await callejero.get<string>('ConsultaNumeroCodigos', {
      responseType: 'text' as never,
      params: {
        CodigoProvincia: provinceCode,
        CodigoMunicipio: municipalityCode,
        CodigoMunicipioINE: '',
        CodigoVia: streetCode,
        Numero: number,
      },
    });
    const parsed = parseXML(xml);
    const error = extractCatastroError(parsed);
    if (error) throw new Error(`Catastro error: ${error}`);
    return { content: [{ type: 'text', text: JSON.stringify(parsed, null, 2) }] };
  })
);

// ─── Property tools ──────────────────────────────────────────────────────────

server.tool(
  'get_property',
  'Get property data (non-protected) by cadastral reference. Returns building info, area, use type.',
  {
    provinceCode: z.string(),
    municipalityCode: z.string(),
    cadastralRef: z.string(),
  },
  wrapToolHandler(async ({ provinceCode, municipalityCode, cadastralRef }) => {
    validateProvinceCode(provinceCode);
    validateMunicipalityCode(municipalityCode);
    validateCadastralRef(cadastralRef);
    const xml = await callejero.get<string>('Consulta_DNPRC_Codigos', {
      responseType: 'text' as never,
      params: {
        CodigoProvincia: provinceCode,
        CodigoMunicipio: municipalityCode,
        CodigoMunicipioINE: '',
        RC: cadastralRef,
      },
    });
    const parsed = parseXML(xml);
    const error = extractCatastroError(parsed);
    if (error) throw new Error(`Catastro error: ${error}`);
    return { content: [{ type: 'text', text: JSON.stringify(parsed, null, 2) }] };
  })
);

server.tool(
  'get_property_by_parcel',
  'Get property data by polygon and parcel codes (rural properties).',
  {
    provinceCode: z.string(),
    municipalityCode: z.string(),
    polygon: z.string(),
    parcel: z.string(),
  },
  wrapToolHandler(async ({ provinceCode, municipalityCode, polygon, parcel }) => {
    validateProvinceCode(provinceCode);
    validateMunicipalityCode(municipalityCode);
    const xml = await callejero.get<string>('Consulta_DNPPP_Codigos', {
      responseType: 'text' as never,
      params: {
        CodigoProvincia: provinceCode,
        CodigoMunicipio: municipalityCode,
        CodigoMunicipioINE: '',
        CodigoPoligono: polygon,
        CodigoParcela: parcel,
      },
    });
    const parsed = parseXML(xml);
    const error = extractCatastroError(parsed);
    if (error) throw new Error(`Catastro error: ${error}`);
    return { content: [{ type: 'text', text: JSON.stringify(parsed, null, 2) }] };
  })
);

// ─── Geocoding tools ─────────────────────────────────────────────────────────

server.tool(
  'get_coordinates',
  'Get geographic coordinates (lat/lon) for a cadastral reference.',
  {
    provinceCode: z.string(),
    municipalityCode: z.string(),
    cadastralRef: z.string(),
  },
  wrapToolHandler(async ({ provinceCode, municipalityCode, cadastralRef }) => {
    validateProvinceCode(provinceCode);
    validateMunicipalityCode(municipalityCode);
    validateCadastralRef(cadastralRef);
    const xml = await coordenadas.get<string>('Consulta_CPMRC', {
      responseType: 'text' as never,
      params: {
        Provincia: provinceCode,
        Municipio: municipalityCode,
        SRS: 'EPSG:4326',
        RC: cadastralRef,
      },
    });
    const parsed = parseXML(xml);
    const error = extractCatastroError(parsed);
    if (error) throw new Error(`Catastro error: ${error}`);
    return { content: [{ type: 'text', text: JSON.stringify(parsed, null, 2) }] };
  })
);

server.tool(
  'get_reference_at_coordinates',
  'Reverse geocode: get the cadastral reference at specific coordinates.',
  { lat: z.number(), lon: z.number() },
  wrapToolHandler(async ({ lat, lon }) => {
    validateCoordinate(lat, 'latitude');
    validateCoordinate(lon, 'longitude');
    const xml = await coordenadas.get<string>('Consulta_RCCOOR', {
      responseType: 'text' as never,
      params: { SRS: 'EPSG:4326', Coordenada_X: lon, Coordenada_Y: lat },
    });
    const parsed = parseXML(xml);
    const error = extractCatastroError(parsed);
    if (error) throw new Error(`Catastro error: ${error}`);
    return { content: [{ type: 'text', text: JSON.stringify(parsed, null, 2) }] };
  })
);

// @ts-expect-error — MCP SDK deep type instantiation with zod generics
server.tool(
  'find_properties_nearby',
  'Find cadastral references within a distance of given coordinates.',
  { lat: z.number(), lon: z.number(), distance: z.number().optional() },
  wrapToolHandler(async ({ lat, lon, distance }) => {
    validateCoordinate(lat, 'latitude');
    validateCoordinate(lon, 'longitude');
    const xml = await coordenadas.get<string>('Consulta_RCCOOR_Distancia', {
      responseType: 'text' as never,
      params: {
        SRS: 'EPSG:4326',
        Coordenada_X: lon,
        Coordenada_Y: lat,
        Distancia: distance ?? 50,
      },
    });
    const parsed = parseXML(xml);
    const error = extractCatastroError(parsed);
    if (error) throw new Error(`Catastro error: ${error}`);
    return { content: [{ type: 'text', text: JSON.stringify(parsed, null, 2) }] };
  })
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Catastro MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
