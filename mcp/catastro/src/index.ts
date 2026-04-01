#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { BaseAPIClient, parseXML, wrapToolHandler } from '@spain-ai-kit/shared';

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
  version: '0.1.0',
});

// Tools will be added in next task

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Catastro MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
