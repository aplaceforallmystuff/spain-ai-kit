# Contributing to Spain AI Kit

Thanks for your interest in contributing! This guide covers how to add new MCP servers, fix bugs, and improve existing functionality.

## Adding a New MCP Server

1. **Create the package directory:**
   ```bash
   mkdir -p mcp/<service-name>/src
   ```

2. **Follow the existing pattern:**
   - Copy `mcp/ine/package.json` as a template
   - Update the package name to `@spain-ai-kit/<service>-mcp-server`
   - Import shared utilities from `@spain-ai-kit/shared`
   - Use `McpServer` from `@modelcontextprotocol/sdk`

3. **API requirements:**
   - Must connect to a public Spanish government API
   - No authentication required for v1 servers
   - Include proper error handling and helpful error messages
   - Cache responses where appropriate (use `BaseAPIClient`)

4. **Documentation:**
   - Add a `README.md` in your server directory
   - Update the root `README.md` with your server's tools table
   - Include the data source URL and attribution

## Code Standards

- TypeScript strict mode
- ES2022 target, ESM modules
- Tests with vitest
- Format with prettier (`npm run format`)

## Pull Request Process

1. Fork the repo and create a feature branch
2. Implement your changes with tests
3. Run `npm run build && npm test` to verify
4. Submit a PR with a clear description of what the server does and which API it connects to

## Commit Messages

Follow conventional commits:

```
feat(ine): add tourism statistics tools
fix(boe): handle XML encoding edge case
docs: update README with new server
```
