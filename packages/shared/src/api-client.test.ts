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
