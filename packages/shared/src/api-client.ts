import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import type { APIClientOptions, CacheEntry } from './types.js';

/**
 * HTTP client with in-memory caching and retry logic.
 * Both MCP servers extend or instantiate this for their API calls.
 */
export class BaseAPIClient {
  protected http: AxiosInstance;
  private cache = new Map<string, CacheEntry<unknown>>();
  private maxRetries: number;
  private cacheTTL: number;

  constructor(options: APIClientOptions) {
    this.maxRetries = options.maxRetries ?? 3;
    this.cacheTTL = options.cacheTTL ?? 5 * 60 * 1000;

    this.http = axios.create({
      baseURL: options.baseURL,
      timeout: options.timeout ?? 30_000,
      headers: {
        'User-Agent': 'spain-ai-kit/0.1.0',
      },
    });
  }

  /**
   * GET request with caching and retry.
   */
  async get<T>(path: string, config?: AxiosRequestConfig & { cacheTTL?: number }): Promise<T> {
    const cacheKey = `${path}?${JSON.stringify(config?.params ?? {})}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data as T;
    }

    const ttl = config?.cacheTTL ?? this.cacheTTL;
    const data = await this.fetchWithRetry<T>(path, config);

    if (ttl > 0) {
      this.cache.set(cacheKey, { data, expiresAt: Date.now() + ttl });
    }

    return data;
  }

  private async fetchWithRetry<T>(path: string, config?: AxiosRequestConfig, attempt = 1): Promise<T> {
    try {
      const response = await this.http.get<T>(path, config);
      return response.data;
    } catch (error) {
      if (attempt >= this.maxRetries) throw error;

      const isRetryable =
        axios.isAxiosError(error) &&
        (!error.response || error.response.status >= 500);

      if (!isRetryable) throw error;

      const delay = Math.min(1000 * 2 ** (attempt - 1), 10_000);
      await new Promise((r) => setTimeout(r, delay));
      return this.fetchWithRetry<T>(path, config, attempt + 1);
    }
  }

  clearCache(): void {
    this.cache.clear();
  }
}
