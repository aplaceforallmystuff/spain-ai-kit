import { describe, it, expect } from 'vitest';
import { AEMETClient } from './aemet-client.js';
import { ValidationError } from './validation.js';

describe('AEMETClient', () => {
  it('throws ValidationError when API key is missing', () => {
    expect(
      () =>
        new AEMETClient({
          baseURL: 'https://opendata.aemet.es/opendata/',
          apiKey: '',
        })
    ).toThrow(ValidationError);
  });

  it('includes signup URL in error message', () => {
    try {
      new AEMETClient({ baseURL: 'https://opendata.aemet.es/opendata/', apiKey: '' });
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
