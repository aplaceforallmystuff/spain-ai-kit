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
    },
    "spain-catastro": {
      "command": "npx",
      "args": ["@spain-ai-kit/catastro-mcp-server"]
    },
    "spain-aemet": {
      "command": "npx",
      "args": ["@spain-ai-kit/aemet-mcp-server"],
      "env": {
        "AEMET_API_KEY": "your-api-key-here"
      }
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
    },
    "spain-catastro": {
      "command": "npx",
      "args": ["@spain-ai-kit/catastro-mcp-server"]
    },
    "spain-aemet": {
      "command": "npx",
      "args": ["@spain-ai-kit/aemet-mcp-server"],
      "env": {
        "AEMET_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

> **AEMET API Key:** The weather server requires a free API key. Get one in 30 seconds at [opendata.aemet.es](https://opendata.aemet.es/centrodedescargas/altaUsuario) — just enter your email. The other servers need no setup.

Then ask Claude things like:
- "What is the current CPI in Spain?"
- "Search Spanish law about data protection"
- "Show me employment statistics for Valencia"
- "What does the foreigners law say about residence permits?"
- "What property is at this Madrid address?"
- "Look up the cadastral reference for Puerta del Sol"
- "What's the weather forecast for Valencia this week?"
- "Are there any weather alerts in Spain right now?"
- "What's the UV index in Málaga today?"

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

### Catastro — Land Registry (`@spain-ai-kit/catastro-mcp-server`)

Connects to the [Dirección General del Catastro](https://www.catastro.hacienda.gob.es/) web services. Property lookups, address resolution, and geocoding for all of Spain.

| Tool | Description |
|------|-------------|
| `list_provinces` | List all Spanish provinces with codes |
| `list_municipalities` | List municipalities in a province |
| `list_streets` | List streets in a municipality |
| `lookup_address` | Get cadastral reference for a street address |
| `get_property` | Get property data by cadastral reference |
| `get_property_by_parcel` | Get property data by polygon/parcel codes |
| `get_coordinates` | Get lat/lon for a cadastral reference |
| `get_reference_at_coordinates` | Reverse geocode: coordinates to cadastral reference |
| `find_properties_nearby` | Find properties within distance of coordinates |

**Data source:** [Catastro OVC Web Services](https://ovc.catastro.meh.es/) — public, no authentication required.

### AEMET — Weather (`@spain-ai-kit/aemet-mcp-server`)

Connects to [AEMET OpenData](https://opendata.aemet.es/) for weather forecasts, observations, and alerts across Spain. Requires a free API key.

| Tool | Description |
|------|-------------|
| `search_municipalities` | Search municipalities by name for forecast codes |
| `list_municipalities` | List all 8,000+ Spanish municipalities |
| `get_forecast_daily` | Daily weather forecast for a municipality |
| `get_forecast_hourly` | Hourly forecast (48h) for a municipality |
| `get_current_observations` | Current weather from all stations |
| `get_station_observations` | Last 12h observations from a specific station |
| `get_weather_alerts` | Active adverse weather alerts by region |
| `get_beach_forecast` | Beach weather forecast |
| `get_uv_index` | UV radiation index prediction |
| `get_fire_risk` | Forest fire risk levels |

**Data source:** [AEMET OpenData API](https://opendata.aemet.es/) — free API key required ([sign up](https://opendata.aemet.es/centrodedescargas/altaUsuario)).

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
│   ├── boe/              # BOE Legislation MCP server
│   ├── catastro/         # Catastro Land Registry MCP server
│   └── aemet/            # AEMET Weather MCP server
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
| **datos.gob.es** | National open data portal (umbrella for many datasets) | No |
| **AEAT** | Tax agency (declarations, obligations) | Cl@ve |
| **CNMV** | Securities market commission | No |
| **SEPE** | Employment service | Cl@ve |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on adding new MCP servers and contributing to existing ones.

## License

MIT — see [LICENSE](LICENSE) for details.

Legislative content sourced from public government APIs is in the public domain.
