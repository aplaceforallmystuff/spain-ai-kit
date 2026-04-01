# Contributing to Spain AI Kit

Thanks for your interest in contributing! This guide covers how to add new MCP servers, fix bugs, and improve existing functionality.

## Adding a New MCP Server

### 1. Scaffold the package

```bash
mkdir -p mcp/<service-name>/src
```

Copy `mcp/ine/package.json` as a template and update:
- Package name: `@spain-ai-kit/<service>-mcp-server`
- Description, keywords, bin name
- Keep the same dependency versions

Copy `mcp/ine/tsconfig.json` as-is (it extends the base config).

### 2. Follow the established patterns

Every MCP server in this repo follows the same architecture:

```typescript
// mcp/<service>/src/index.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod/v3';
import { BaseAPIClient, wrapToolHandler } from '@spain-ai-kit/shared';

// 1. Create API client(s) with caching and rate limiting
const client = new BaseAPIClient({
  baseURL: 'https://api.example.es/',
  cacheTTL: 10 * 60 * 1000,    // 10 min default
  maxRequestsPerSecond: 5,       // Be respectful to government APIs
});

// 2. Create MCP server
const server = new McpServer({
  name: '@spain-ai-kit/<service>-mcp-server',
  version: '0.1.0', // update to match package.json version
});

// 3. Define tools — ALWAYS wrap with wrapToolHandler
server.tool(
  'tool_name',
  'Description for the LLM (be helpful and specific)',
  { param: z.string().describe('What this parameter is and examples') },
  wrapToolHandler(async ({ param }) => {
    validateSomething(param);  // Validate BEFORE hitting the API
    const data = await client.get<ResponseType>(`endpoint/${param}`);
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
    };
  }),
);

// 4. Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('<Service> MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
```

### 3. Required patterns

**Input validation:** Every user-supplied parameter must be validated before it reaches an API call. Add validators to `packages/shared/src/validation.ts` and export them from the shared index. This prevents path traversal, injection, and malformed requests.

**Error wrapping:** Every tool handler must be wrapped with `wrapToolHandler()`. This catches validation errors, HTTP errors, and unexpected exceptions, returning structured MCP error responses instead of raw stack traces.

**Rate limiting:** Set `maxRequestsPerSecond` on every API client. Government APIs don't always document their rate limits, so be conservative (5-10 req/sec).

**Caching:** Set appropriate `cacheTTL` values. Reference data (province lists, categories) can cache for 24h. Dynamic data (forecasts, daily summaries) should cache for 5-30 minutes.

### 4. If the API needs authentication

See the AEMET server (`mcp/aemet/`) for the pattern:
- API key comes from an environment variable (e.g., `AEMET_API_KEY`)
- If the key is missing, throw a `ValidationError` with clear setup instructions and a signup URL
- Document the env var in the README config examples

For APIs requiring cl@ve (Spain's citizen auth), authentication is out of scope for now — see the roadmap.

### 5. TypeScript workaround

The MCP SDK sometimes triggers `TS2589: Type instantiation is excessively deep` when Zod schemas interact with `server.tool()` generics. If you see this, add `// @ts-expect-error` above the affected `server.tool()` call:

```typescript
// @ts-expect-error — MCP SDK deep type instantiation with zod generics
server.tool('tool_name', ...);
```

This is a known SDK issue, not a bug in your code.

### 6. Testing

- **Unit tests** for validators go in `packages/shared/src/validation.test.ts`
- **Integration tests** go in `mcp/<service>/src/index.test.ts` and hit the live API
- Integration tests that require API keys should use `it.skipIf(!hasKey)` to skip gracefully in CI
- Use 15-second timeouts for integration tests (`}, 15_000)`)

### 7. Documentation

- Add your server's tools table to the root `README.md`
- Add config examples to both Claude Desktop and Claude Code blocks
- Add 2-3 example prompts to the "Then ask Claude things like" section
- Update `CHANGELOG.md` under `[Unreleased]`
- Add a section in `docs/GUIDE.md` with usage examples and tips

## Code Standards

- TypeScript strict mode
- ES2022 target, ESM modules
- Tests with vitest
- Format with prettier (`npm run format`)
- Pre-commit hooks enforce formatting and build checks

## Development Commands

```bash
npm install          # Install all workspace deps
npm run build        # Build all packages (shared first, then servers)
npm test             # Run all tests
npm run format       # Format with prettier
npm run dev          # Watch mode for all packages
```

Build a single package:
```bash
npx nx run @spain-ai-kit/shared:build
npx nx run @spain-ai-kit/ine-mcp-server:test
```

## Shared Package (`@spain-ai-kit/shared`)

Shared utilities used by all servers:

| Export | Purpose |
|--------|---------|
| `BaseAPIClient` | HTTP client with caching, retry, rate limiting |
| `AEMETClient` | Extends BaseAPIClient with double-call pattern + API key |
| `parseXML` | XML → JS object (with XXE prevention) |
| `wrapToolHandler` | Error wrapping for MCP tool handlers |
| `ValidationError` | Custom error class for input validation |
| `validate*` | Input validators (BOE IDs, dates, province codes, etc.) |
| `formatDateBOE`, `formatDateISO`, `ineTimestampToISO` | Date utilities |
| `validateNIF` | Spanish NIF/NIE document number validator |

When adding shared functionality, export it from `packages/shared/src/index.ts`.

## Pull Request Process

1. Fork the repo and create a feature branch
2. Implement your changes with tests
3. Run `npm run build && npm test` to verify
4. Run `npm run format` to fix formatting
5. Submit a PR with a clear description of what the server does and which API it connects to

## Commit Messages

Follow conventional commits:

```
feat(ine): add tourism statistics tools
fix(boe): handle XML encoding edge case
docs: update README with new server
test(catastro): add geocoding integration tests
```
