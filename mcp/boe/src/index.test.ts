import { describe, it, expect } from 'vitest';
import { BaseAPIClient, parseXML } from '@spain-ai-kit/shared';

const API_BASE = 'https://www.boe.es/datosabiertos/api/';
const client = new BaseAPIClient({ baseURL: API_BASE, cacheTTL: 0 });

interface BOESearchResponse {
  status: { code: string; text: string };
  data: Array<{ identificador: string; titulo: string }>;
}

describe('BOE API integration', () => {
  it('searches consolidated legislation', async () => {
    const result = await client.get<BOESearchResponse>(
      'legislacion-consolidada',
      {
        params: { limit: 3 },
        headers: { Accept: 'application/json' },
      },
    );
    expect(result).toHaveProperty('status');
    expect(result).toHaveProperty('data');
  }, 15_000);

  it('retrieves document metadata by ID', async () => {
    // BOE-A-2000-544 = Ley Orgánica 4/2000 (immigration law)
    const result = await client.get<BOESearchResponse>(
      'legislacion-consolidada/id/BOE-A-2000-544/metadatos',
      { headers: { Accept: 'application/json' } },
    );
    expect(result).toHaveProperty('data');
  }, 15_000);

  it('parses daily summary XML', async () => {
    // Use a known past date to avoid empty results
    const xml = await client.get<string>('boe/sumario/20260101', {
      headers: { Accept: 'application/xml' },
      responseType: 'text' as never,
    });
    const parsed = parseXML(xml);
    expect(parsed).toHaveProperty('response');
  }, 15_000);

  it('retrieves subject categories', async () => {
    const result = await client.get<BOESearchResponse>('datos-auxiliares/materias', {
      headers: { Accept: 'application/json' },
    });
    expect(result).toHaveProperty('data');
  }, 15_000);

  it('retrieves legal ranks', async () => {
    const result = await client.get<BOESearchResponse>('datos-auxiliares/rangos', {
      headers: { Accept: 'application/json' },
    });
    expect(result).toHaveProperty('data');
  }, 15_000);
});
