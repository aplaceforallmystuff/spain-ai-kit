import { describe, it, expect } from 'vitest';
import { AEMETClient } from '@spain-ai-kit/shared';

const apiKey = process.env.AEMET_API_KEY ?? '';
const hasKey = apiKey.length > 0;

describe('AEMET API integration', () => {
  it.skipIf(!hasKey)(
    'lists municipalities',
    async () => {
      const client = new AEMETClient({
        baseURL: 'https://opendata.aemet.es/opendata/',
        apiKey,
        cacheTTL: 0,
      });
      const municipios =
        await client.getData<Array<{ id: string; nombre: string }>>('api/maestro/municipios');
      expect(Array.isArray(municipios)).toBe(true);
      expect(municipios.length).toBeGreaterThan(8000);
    },
    30_000
  );

  it.skipIf(!hasKey)(
    'gets daily forecast for Madrid (28079)',
    async () => {
      const client = new AEMETClient({
        baseURL: 'https://opendata.aemet.es/opendata/',
        apiKey,
        cacheTTL: 0,
      });
      const forecast = await client.getData<unknown>(
        'api/prediccion/especifica/municipio/diaria/28079'
      );
      expect(forecast).toBeDefined();
      expect(Array.isArray(forecast) || typeof forecast === 'object').toBe(true);
    },
    30_000
  );

  it('skips integration tests without AEMET_API_KEY', () => {
    if (!hasKey) {
      console.error('AEMET integration tests skipped — set AEMET_API_KEY env var to run them');
    }
    expect(true).toBe(true);
  });
});
