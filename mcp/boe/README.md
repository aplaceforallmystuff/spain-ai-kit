# MCP BOE Server

[![npm version](https://img.shields.io/npm/v/@spain-ai-kit/boe-mcp-server.svg)](https://www.npmjs.com/package/@spain-ai-kit/boe-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MCP](https://img.shields.io/badge/MCP-Compatible-blue)](https://modelcontextprotocol.io)

Access Spanish legislation and official gazette documents through the [BOE Open Data API](https://www.boe.es/datosabiertos/).

## Why Use This?

- Search consolidated Spanish legislation.
- Read document metadata, articles and daily summaries.
- Discover BOE subjects, departments, scopes and legal ranks.
- Search an optional local Markdown corpus without calling the BOE API.

## Features

| Source                   | Capabilities                                                          |
| ------------------------ | --------------------------------------------------------------------- |
| BOE API                  | Legislation, documents, articles, daily summaries and reference lists |
| Local legalize-es corpus | Full-text keyword search and reading indexed laws                     |

## Prerequisites

Node.js 20 or later and an MCP client. The live BOE tools need internet access; no API key is required. Corpus tools need an existing legalize-es directory with jurisdiction folders such as `es` and `es-vc`.

## Installation

```bash
npx -y @spain-ai-kit/boe-mcp-server
```

For development, clone the repository with HTTPS, run `npm ci` at its root, build `@spain-ai-kit/shared`, then build `@spain-ai-kit/boe-mcp-server`.

## Configuration

### Claude Desktop

Add this entry to your client's MCP configuration:

```json
{
  "mcpServers": {
    "boe": {
      "command": "npx",
      "args": ["-y", "@spain-ai-kit/boe-mcp-server"],
      "env": {
        "SPAIN_AI_KIT_CORPUS_PATH": "/absolute/path/to/legalize-es"
      }
    }
  }
}
```

### Claude Code

Use the same `mcpServers` entry in `.mcp.json`. Omit the optional corpus environment variable when you only need the live BOE tools.

The corpus is large and is not included in the npm package. `SPAIN_AI_KIT_CORPUS_PATH` points to the directory containing `es`, rather than to an individual law. In a source checkout, the default is the repository's `corpus/legalize-es` directory. Relative configured paths resolve from the server's working directory; an absolute path is recommended.

## Usage Examples

- "Find consolidated legislation about protección de datos."
- "Read the metadata for BOE-A-2000-544."
- "Search the local corpus for derechos fundamentales and read a matching law."

## Available Tools

| Tool                    | Purpose                                                                          |
| ----------------------- | -------------------------------------------------------------------------------- |
| `search_legislation`    | Search consolidated legislation with optional date, scope and pagination filters |
| `get_document`          | Read consolidated document text                                                  |
| `get_document_metadata` | Read document metadata                                                           |
| `get_document_analysis` | Read a document's legal analysis                                                 |
| `get_document_index`    | List document sections                                                           |
| `get_article`           | Read a document block or article                                                 |
| `get_daily_summary`     | Read a daily BOE summary                                                         |
| `list_subjects`         | List subject categories                                                          |
| `list_departments`      | List departments                                                                 |
| `list_scopes`           | List jurisdiction scopes                                                         |
| `list_legal_ranks`      | List legal ranks                                                                 |
| `search_corpus`         | Search local law text by `query`, with optional `jurisdiction` and `limit`       |
| `read_corpus_law`       | Read a local law by `identifier` (BOE ID or filename)                            |

## Development

From the repository root:

```bash
npm run build --workspace=@spain-ai-kit/shared
npm run build --workspace=@spain-ai-kit/boe-mcp-server
npm test --workspace=@spain-ai-kit/boe-mcp-server
npm audit --audit-level=high --workspace=@spain-ai-kit/boe-mcp-server
```

The test suite includes live BOE checks. For the offline corpus regression tests, append `-- src/corpus.test.ts` to the test command.

## Troubleshooting

If the corpus is unavailable, check that the configured path exists and contains an `es` folder. The package does not download the corpus. Search results contain matching lines; `read_corpus_law` returns the complete Markdown text. Live BOE failures can be retried after checking connectivity and document identifiers.

## Contributing

See the repository's [contribution guide](https://github.com/aplaceforallmystuff/spain-ai-kit/blob/main/CONTRIBUTING.md).

## License

MIT. See [LICENSE](https://github.com/aplaceforallmystuff/spain-ai-kit/blob/main/LICENSE).

## Links

- [BOE Open Data](https://www.boe.es/datosabiertos/)
- [MCP documentation](https://modelcontextprotocol.io)
- [Spain AI Kit guide](https://github.com/aplaceforallmystuff/spain-ai-kit/blob/main/docs/GUIDE.md)
