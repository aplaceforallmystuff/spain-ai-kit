import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { wrapToolHandler, ToolResult } from './error.js';
import { ValidationError } from './validation.js';

describe('wrapToolHandler', () => {
  it('passes through successful results', async () => {
    const expected: ToolResult = {
      content: [{ type: 'text', text: 'All good' }],
    };
    const wrapped = wrapToolHandler(async (_params: {}) => expected);
    const result = await wrapped({});
    expect(result).toEqual(expected);
    expect(result.isError).toBeUndefined();
  });

  it('catches ValidationError and returns MCP error', async () => {
    const wrapped = wrapToolHandler(async (_params: {}) => {
      throw new ValidationError('Bad input: value must be positive');
    });
    const result = await wrapped({});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe('Bad input: value must be positive');
  });

  it('catches axios HTTP errors and returns status', async () => {
    const axiosError = new axios.AxiosError('Request failed', 'ERR_BAD_RESPONSE', undefined, undefined, {
      status: 404,
      statusText: 'Not Found',
      data: {},
      headers: {},
      config: {} as never,
    });

    const wrapped = wrapToolHandler(async (_params: {}) => {
      throw axiosError;
    });
    const result = await wrapped({});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('HTTP 404');
    expect(result.content[0].text).toContain('Not Found');
  });

  it('catches axios network errors', async () => {
    const networkError = new axios.AxiosError('connect ECONNREFUSED 127.0.0.1:8080');
    // No response — pure network error

    const wrapped = wrapToolHandler(async (_params: {}) => {
      throw networkError;
    });
    const result = await wrapped({});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Network error');
    expect(result.content[0].text).toContain('ECONNREFUSED');
  });

  it('catches unknown errors with generic message and logs to stderr', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const wrapped = wrapToolHandler(async (_params: {}) => {
      throw new Error('something unexpected happened internally');
    });
    const result = await wrapped({});

    expect(result.isError).toBe(true);
    expect(result.content[0].text.toLowerCase()).toContain('internal error');
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('never exposes stack traces in error messages', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const wrapped = wrapToolHandler(async (_params: {}) => {
      const err = new Error('boom');
      // Stack traces typically contain paths like /usr/src/... or file.ts:10
      (err as Error & { extraInfo: string }).extraInfo = '/usr/src/app/server.ts:42 at Object.<anonymous>';
      throw err;
    });
    const result = await wrapped({});

    expect(result.isError).toBe(true);
    const text = result.content[0].text;
    expect(text).not.toContain('/usr/src');
    expect(text).not.toMatch(/\.ts:\d/);

    vi.restoreAllMocks();
  });
});
