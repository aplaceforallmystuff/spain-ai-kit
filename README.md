# Spain AI Kit

Connect AI applications to Spanish government open data and legal infrastructure.

Inspired by [estonia-ai-kit](https://github.com/stefanoamorelli/estonia-ai-kit).

## MCP Servers

| Server | Source | Description |
|--------|--------|-------------|
| `@spain-ai-kit/ine-mcp-server` | [INE](https://www.ine.es/) | Spanish National Statistics Institute - demographics, economics, census data via JSON-stat API |
| `@spain-ai-kit/boe-mcp-server` | [BOE](https://www.boe.es/) | Boletín Oficial del Estado - Spanish official gazette, legislation, and legal documents via XML API |

## RAG Pipelines

| Pipeline | Source | Description |
|----------|--------|-------------|
| `rag/boe` | BOE | Document search over Spanish legislation (planned) |

## Future Services

| Service | Source | Description |
|---------|--------|-------------|
| Catastro | [Catastro](https://www.catastro.meh.es/) | Property registry and cadastral data |
| AEAT | [AEAT](https://www.agenciatributaria.es/) | Tax agency (authenticated) |
| CNMV | [CNMV](https://www.cnmv.es/) | Securities market commission |

## Development

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test

# Format code
npm run format
```

## Project Structure

```
spain-ai-kit/
├── mcp/
│   ├── ine/          # INE Statistics MCP server
│   └── boe/          # BOE Legal docs MCP server
├── packages/
│   └── shared/       # Shared utilities
├── rag/
│   └── boe/          # BOE RAG pipeline (planned)
├── nx.json
└── tsconfig.base.json
```

## License

MIT
