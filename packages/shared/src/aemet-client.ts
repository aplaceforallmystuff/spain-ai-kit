import axios from 'axios';
import { BaseAPIClient } from './api-client.js';
import { ValidationError } from './validation.js';
import type { AEMETClientOptions } from './types.js';

export class AEMETClient extends BaseAPIClient {
  private apiKey: string;

  constructor(options: AEMETClientOptions) {
    super(options);
    this.apiKey = options.apiKey;
    if (!this.apiKey) {
      throw new ValidationError(
        'AEMET_API_KEY environment variable is required. ' +
          'Get a free API key at https://opendata.aemet.es/centrodedescargas/altaUsuario'
      );
    }
  }

  async getData<T>(path: string): Promise<T> {
    const envelope = await this.get<{ estado: number; datos: string; metadatos: string }>(path, {
      headers: { api_key: this.apiKey },
      cacheTTL: 0,
    });

    if (!envelope.datos) {
      throw new Error(`AEMET returned no data URL for ${path}`);
    }

    const response = await axios.get<T>(envelope.datos, {
      headers: { 'User-Agent': 'spain-ai-kit/0.1.0' },
      timeout: 30_000,
    });

    return response.data;
  }
}
