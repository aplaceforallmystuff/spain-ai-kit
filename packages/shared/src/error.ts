import axios from 'axios';
import { ValidationError } from './validation.js';

export interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

export function wrapToolHandler<T>(
  handler: (params: T) => Promise<ToolResult>,
): (params: T) => Promise<ToolResult> {
  return async (params: T): Promise<ToolResult> => {
    try {
      return await handler(params);
    } catch (error) {
      if (error instanceof ValidationError) {
        return {
          content: [{ type: 'text', text: error.message }],
          isError: true,
        };
      }

      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const statusText = error.response?.statusText ?? 'Unknown';
        const message = status
          ? `Request failed (HTTP ${status}: ${statusText}). The requested resource may not exist or the service may be temporarily unavailable.`
          : `Network error: ${error.message}. The API may be temporarily unavailable.`;
        return {
          content: [{ type: 'text', text: message }],
          isError: true,
        };
      }

      console.error('Unexpected tool error:', error);
      return {
        content: [{ type: 'text', text: 'An internal error occurred. Check server logs for details.' }],
        isError: true,
      };
    }
  };
}
