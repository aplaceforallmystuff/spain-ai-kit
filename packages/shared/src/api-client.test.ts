import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseAPIClient } from './api-client.js';

// Mock axios at module level
vi.mock('axios', () => {
  const mockGet = vi.fn();
  return {
    default: {
      create: () => ({ get: mockGet }),
      isAxiosError: (e: unknown) => e instanceof Error && 'isAxiosError' in (e as Record<string, unknown>),
    },
    // Re-export for named imports
    isAxiosError: (e: unknown) => e instanceof Error && 'isAxiosError' in (e as Record<string, unknown>),
  };
});

// Access the mock after module setup
async function getMockGet() {
  const axios = await import('axios');
  const instance = axios.default.create({} as never);
  return (instance as unknown as { get: ReturnType<typeof vi.fn> }).get;
}

describe('BaseAPIClient', () => {
  let client: BaseAPIClient;
  let mockGet: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    mockGet = await getMockGet();
    mockGet.mockReset();
    client = new BaseAPIClient({
      baseURL: 'https://api.example.com/',
      cacheTTL: 5000,
      maxRetries: 2,
    });
  });

  it('returns data from a GET request', async () => {
    mockGet.mockResolvedValueOnce({ data: { result: 'ok' } });
    const result = await client.get<{ result: string }>('test');
    expect(result).toEqual({ result: 'ok' });
  });

  it('caches subsequent identical requests', async () => {
    mockGet.mockResolvedValueOnce({ data: { value: 1 } });

    const first = await client.get('path');
    const second = await client.get('path');

    expect(first).toEqual(second);
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('respects cache TTL override', async () => {
    mockGet.mockResolvedValue({ data: { value: 1 } });

    // Request with 0 TTL should not cache
    await client.get('no-cache', { cacheTTL: 0 });
    await client.get('no-cache', { cacheTTL: 0 });

    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  it('clearCache forces fresh requests', async () => {
    mockGet.mockResolvedValue({ data: { value: 1 } });

    await client.get('cached');
    client.clearCache();
    await client.get('cached');

    expect(mockGet).toHaveBeenCalledTimes(2);
  });
});

describe('rate limiting', () => {
  let client: BaseAPIClient;
  let mockGet: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    mockGet = await getMockGet();
    mockGet.mockReset();
    client = new BaseAPIClient({
      baseURL: 'https://api.example.com/',
      cacheTTL: 5000,
      maxRetries: 2,
    });
  });

  it('delays requests when rate limit is reached', async () => {
    const rateLimitedClient = new BaseAPIClient({
      baseURL: 'https://api.example.com/',
      cacheTTL: 0,
      maxRequestsPerSecond: 2,
    });

    mockGet.mockResolvedValue({ data: { ok: true } });

    const start = Date.now();
    await Promise.all([
      rateLimitedClient.get('a'),
      rateLimitedClient.get('b'),
      rateLimitedClient.get('c'),
    ]);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(400);
    expect(mockGet).toHaveBeenCalledTimes(3);
  });

  it('does not delay when rate limit is not set', async () => {
    mockGet.mockResolvedValue({ data: { ok: true } });

    const start = Date.now();
    await Promise.all([
      client.get('x'),
      client.get('y'),
      client.get('z'),
    ]);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(200);
  });
});
