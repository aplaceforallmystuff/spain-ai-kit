# Spain AI Kit

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MCP](https://img.shields.io/badge/MCP-Compatible-blue)](https://modelcontextprotocol.io)

Connect AI applications to Spanish government open data and legal infrastructure.

An open-source SDK providing MCP (Model Context Protocol) servers for Spanish government APIs. Query national statistics, search legislation, and access 12,000+ consolidated laws — all from your AI assistant.

Inspired by [estonia-ai-kit](https://github.com/stefanoamorelli/estonia-ai-kit).

## Quick Start

### Claude Desktop

Add to your Claude Desktop config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "spain-ine": {
      "command": "npx",
      "args": ["@spain-ai-kit/ine-mcp-server"]
    },
    "spain-boe": {
      "command": "npx",
      "args": ["@spain-ai-kit/boe-mcp-server"]
    }
  }
}
```

### Claude Code

```json
{
  "mcpServers": {
    "spain-ine": {
      "command": "npx",
      "args": ["@spain-ai-kit/ine-mcp-server"]
    },
    "spain-boe": {
      "command": "npx",
      "args": ["@spain-ai-kit/boe-mcp-server"]
    }
  }
}
```

Then ask Claude things like:
- "What is the current CPI in Spain?"
- "Search Spanish law about data protection"
- "Show me employment statistics for Valencia"
- "What does the foreigners law say about residence permits?"

## MCP Servers

### INE — National Statistics (`@spain-ai-kit/ine-mcp-server`)

Connects to the [Instituto Nacional de Estadistica](https://www.ine.es/) JSON API. 70+ statistical operations covering demographics, economics, employment, housing, tourism, and more.

| Tool | Description |
|------|-------------|
| `list_operations` | List all available statistical operations |
| `search_operations` | Search operations by keyword (in Spanish) |
| `get_operation` | Get metadata for a specific operation |
| `list_tables` | List data tables for an operation |
| `get_table_data` | Get actual data from a table |
| `get_series` | Get a specific time series |
| `get_variable_values` | Get values for a variable (provinces, age groups, etc.) |

**Data source:** [INE Tempus3 API](https://servicios.ine.es/wstempus/js/) — public, no authentication required.

### BOE — Legislation (`@spain-ai-kit/boe-mcp-server`)

Connects to the [Boletin Oficial del Estado](https://www.boe.es/) open data API and the [legalize-es](https://github.com/legalize-dev/legalize-es) legislation corpus.

| Tool | Description |
|------|-------------|
| `search_legislation` | Search consolidated legislation by keyword, date, scope |
| `get_document` | Get full document with metadata and legal analysis |
| `get_document_metadata` | Get document metadata (title, dates, status) |
| `get_document_analysis` | Get legal analysis (subjects, references, amendments) |
| `get_document_index` | Get table of contents (articles, sections) |
| `get_article` | Get text of a specific article |
| `get_daily_summary` | Get BOE daily gazette for a date |
| `list_subjects` | List all subject categories |
| `list_departments` | List all government departments that publish in the BOE |
| `list_scopes` | List legal scopes (Estatal, Autonómico, etc.) |
| `list_legal_ranks` | List legal document types (Ley Orgánica, Real Decreto, etc.) |
| `search_corpus` | Full-text search across 12,000+ laws (requires legalize-es submodule) |
| `read_corpus_law` | Read a specific law's full Markdown text |

**Data sources:**
- [BOE Open Data API](https://www.boe.es/datosabiertos/) — public, no authentication required
- [legalize-es](https://github.com/legalize-dev/legalize-es) — 12,000+ Spanish laws as Markdown, reform history tracked via Git

## Legislation Corpus

The BOE server optionally integrates with [legalize-es](https://github.com/legalize-dev/legalize-es), which provides the full consolidated text of 12,000+ Spanish laws as Markdown files with Git-tracked reform history.

To enable corpus search:

```bash
git clone --recurse-submodules https://github.com/aplaceforallmystuff/spain-ai-kit.git
# Or if already cloned:
git submodule update --init
```

Coverage: national legislation + all 17 autonomous communities (Andalucia, Aragon, Asturias, Baleares, Canarias, Cantabria, Castilla-La Mancha, Castilla y Leon, Catalunya, Ceuta, Extremadura, Galicia, La Rioja, Madrid, Melilla, Murcia, Navarra, Pais Vasco, Valencia).

## Development

```bash
# Clone with submodules
git clone --recurse-submodules https://github.com/aplaceforallmystuff/spain-ai-kit.git
cd spain-ai-kit

# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test

# Format code
npm run format
```

### Project Structure

```
spain-ai-kit/
├── mcp/
│   ├── ine/              # INE Statistics MCP server
│   └── boe/              # BOE Legislation MCP server
├── packages/
│   └── shared/           # Shared utilities (API client, types, XML parser)
├── corpus/
│   └── legalize-es/      # Git submodule — legislation as Markdown
├── nx.json
└── tsconfig.base.json
```

## Roadmap

Future servers and features under consideration:

| Service | Description | Auth |
|---------|-------------|------|
| **Catastro** | Property registry and cadastral data | No |
| **datos.gob.es** | National open data portal (umbrella for many datasets) | No |
| **AEAT** | Tax agency (declarations, obligations) | Cl@ve |
| **CNMV** | Securities market commission | No |
| **SEPE** | Employment service | Cl@ve |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on adding new MCP servers and contributing to existing ones.

## License

MIT — see [LICENSE](LICENSE) for details.

Legislative content sourced from public government APIs is in the public domain.
