import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
});

/**
 * Parse XML string to a JS object.
 * Used by the BOE MCP server for API responses.
 */
export function parseXML<T = Record<string, unknown>>(xml: string): T {
  return parser.parse(xml) as T;
}
