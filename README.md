<div align="center">

# 🏛️ Spain AI Kit 🇪🇸

![Spain AI Kit](https://assets.jimchristian.net/spain-ai-kit/hero.jpg)

<sup>Plaza de España, Sevilla — AI-generated hero image</sup>

  <h3>🇪🇸 AI, meet Spain's open government data</h3>
  <p>Build AI-powered applications on top of Spanish statistics, legislation, land registry, and meteorological data</p>

![](https://badge.mcpx.dev?type=server&features=resources,tools 'MCP server with features')
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-20+-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Claude Desktop](https://img.shields.io/badge/Claude_Desktop-Ready-5E45CE?logo=anthropic&logoColor=white)](https://claude.ai)
[![Claude Code](https://img.shields.io/badge/Claude_Code-Compatible-5E45CE?logo=anthropic&logoColor=white)](https://docs.anthropic.com/en/docs/claude-code)
[![Nx](https://img.shields.io/badge/Nx-Monorepo-143055?logo=nx&logoColor=white)](https://nx.dev)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

</div>

> [!NOTE]
> This is a community-driven open source project and is not affiliated with, endorsed by, or connected to the Spanish government or any official Spanish institutions. All data is sourced from public APIs published by their respective agencies.

## 🌍 Spain's Open Data Landscape

Spain runs one of Europe's most extensive public data infrastructures. The **Boletín Oficial del Estado** traces its lineage to the *Gaceta de Madrid* — first published in **1661** — and today publishes every national law, royal decree, and official announcement as structured open data. The **Instituto Nacional de Estadística** exposes thousands of statistical series through a public JSON API. The **Catastro** offers free cadastral lookups for every property in the country. **AEMET** serves forecasts for more than **8,000 municipalities** across Spain's 17 autonomous communities and two autonomous cities.

The problem: most of this is locked behind XML envelopes, SOAP endpoints, Spanish-only documentation, and idiosyncratic JSON-stat formats. Spain AI Kit makes it usable from an AI assistant in one line of config.

- **12,000+** consolidated Spanish laws queryable as Markdown (national + all 17 autonomous communities)
- **70+** statistical operations from INE — demographics, economics, employment, housing, tourism
- **50 provinces, 8,000+ municipalities** covered for address and cadastral lookups
- **Daily BOE gazette** searchable by date, keyword, subject, or legal scope
- **Weather, UV, fire risk, and beach forecasts** for the whole country

## 📖 What is Spain AI Kit?

Spain AI Kit is a collection of **MCP (Model Context Protocol) servers** that connect AI assistants — Claude Desktop, Claude Code, Cursor, and anything else that speaks MCP — directly to Spanish government open data APIs. No scraping, no API wrangling, no translating Spanish JSON-stat by hand.

### 🎯 What is MCP?

[Model Context Protocol](https://modelcontextprotocol.io) is an open standard that lets AI applications plug into external data sources and tools through a consistent interface. Each Spain AI Kit package is a standalone MCP server you can install and mount independently — use one, use them all, or compose them with other MCP servers.

Inspired by [estonia-ai-kit](https://github.com/stefanoamorelli/estonia-ai-kit) by Stefano Amorelli.

## 📦 What's Included

| Package | Description | Data source | Auth | Status |
|---------|-------------|-------------|------|--------|
| [`@spain-ai-kit/ine-mcp-server`](./mcp/ine) | National statistics (demographics, economy, employment) | [INE Tempus3](https://servicios.ine.es/wstempus/js/) | None | ✅ Shipped |
| [`@spain-ai-kit/boe-mcp-server`](./mcp/boe) | Official gazette + 12,000+ consolidated laws | [BOE Open Data](https://www.boe.es/datosabiertos/) + [legalize-es](https://github.com/legalize-dev/legalize-es) | None | ✅ Shipped |
| [`@spain-ai-kit/catastro-mcp-server`](./mcp/catastro) | Land registry, addresses, geocoding | [Catastro OVC](https://ovc.catastro.meh.es/) | None | ✅ Shipped |
| [`@spain-ai-kit/aemet-mcp-server`](./mcp/aemet) | Weather, forecasts, UV, alerts, fire risk | [AEMET OpenData](https://opendata.aemet.es/) | Free API key | ✅ Shipped |
| [`@spain-ai-kit/shared`](./packages/shared) | Shared utilities (HTTP client, XML parser, validators) | — | — | ✅ Ready |

### 🗺️ Roadmap

| Service | Description | Auth |
|---------|-------------|------|
| **datos.gob.es** | National open data catalog (CKAN) — umbrella over thousands of datasets | None |
| **CNMV** | Comisión Nacional del Mercado de Valores — securities market commission | None |
| **AEAT** | Agencia Tributaria — tax declarations and obligations | Cl@ve |
| **SEPE** | Servicio Público de Empleo Estatal — employment service | Cl@ve |

## 🚀 Quick Start

### Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

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

```bash
claude mcp add spain-ine -- npx @spain-ai-kit/ine-mcp-server
claude mcp add spain-boe -- npx @spain-ai-kit/boe-mcp-server
claude mcp add spain-catastro -- npx @spain-ai-kit/catastro-mcp-server
claude mcp add spain-aemet --env AEMET_API_KEY=your-key -- npx @spain-ai-kit/aemet-mcp-server
```

> [!TIP]
> **AEMET API key** — The weather server requires a free API key. Get one in 30 seconds at [opendata.aemet.es](https://opendata.aemet.es/centrodedescargas/altaUsuario) — just enter your email. The other three servers need zero setup.

### Try it

Once configured, ask your AI assistant things like:

- 💬 *"What is the current CPI in Spain?"*
- 💬 *"Search Spanish law about data protection and summarise the most recent changes"*
- 💬 *"Show me employment statistics for Valencia province over the last 5 years"*
- 💬 *"What does the foreigners law say about residence permits for UK nationals?"*
- 💬 *"What property is at Calle Gran Vía 1, Madrid? Get me the cadastral reference"*
- 💬 *"Is there a weather alert for Andalucía today?"*
- 💬 *"What's the UV index in Málaga and should I put sunscreen on the kids?"*
- 💬 *"Find properties within 100 metres of these coordinates"*

For detailed usage examples, tips, and troubleshooting, see the **[User Guide](docs/GUIDE.md)**.

## 🔧 MCP Servers

### INE — National Statistics

`@spain-ai-kit/ine-mcp-server` — connects to the [Instituto Nacional de Estadística](https://www.ine.es/) JSON API. 70+ statistical operations covering demographics, economics, employment, housing, tourism, and more.

| Tool | Description |
|------|-------------|
| `list_operations` | List all available statistical operations |
| `search_operations` | Search operations by keyword (in Spanish) |
| `get_operation` | Get metadata for a specific operation |
| `list_tables` | List data tables for an operation |
| `get_table_data` | Get actual data from a table |
| `get_series` | Get a specific time series |
| `get_variable_values` | Get values for a variable (provinces, age groups, etc.) |

### BOE — Legislation

`@spain-ai-kit/boe-mcp-server` — connects to the [Boletín Oficial del Estado](https://www.boe.es/) open data API and the [legalize-es](https://github.com/legalize-dev/legalize-es) legislation corpus.

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

### Catastro — Land Registry

`@spain-ai-kit/catastro-mcp-server` — connects to the [Dirección General del Catastro](https://www.catastro.hacienda.gob.es/) web services. Property lookups, address resolution, and geocoding for all of Spain.

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

### AEMET — Weather

`@spain-ai-kit/aemet-mcp-server` — connects to [AEMET OpenData](https://opendata.aemet.es/) for weather forecasts, observations, and alerts across Spain.

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

## 📚 Legislation Corpus

The BOE server optionally integrates with [legalize-es](https://github.com/legalize-dev/legalize-es), which provides the full consolidated text of 12,000+ Spanish laws as Markdown files with Git-tracked reform history.

To enable corpus search, clone with submodules:

```bash
git clone --recurse-submodules https://github.com/aplaceforallmystuff/spain-ai-kit.git
# Or if already cloned:
git submodule update --init
```

**Coverage:** national legislation + all 17 autonomous communities and 2 autonomous cities — Andalucía, Aragón, Asturias, Baleares, Canarias, Cantabria, Castilla-La Mancha, Castilla y León, Catalunya, Ceuta, Extremadura, Galicia, La Rioja, Madrid, Melilla, Murcia, Navarra, País Vasco, Valencia.

## ⚡ Technical Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **MCP servers** | TypeScript, [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk) | AI assistant integration |
| **HTTP** | Native fetch with rate limiting | API communication |
| **Data formats** | JSON-stat 2.0, XML (fast-xml-parser), JSON | Handle varied Spanish government data formats |
| **Monorepo** | [Nx](https://nx.dev) + npm workspaces | Consistent tooling and code sharing |
| **Testing** | [Vitest](https://vitest.dev) | Unit and integration tests |
| **Types** | TypeScript strict mode, ES2022 | Type safety across the kit |

## 🛠️ Project Structure

```
spain-ai-kit/
├── mcp/
│   ├── ine/              # INE Statistics MCP server
│   ├── boe/              # BOE Legislation MCP server
│   ├── catastro/         # Catastro Land Registry MCP server
│   └── aemet/            # AEMET Weather MCP server
├── packages/
│   └── shared/           # Shared utilities (HTTP client, XML parser, validators)
├── corpus/
│   └── legalize-es/      # Git submodule — legislation as Markdown
├── docs/
│   └── GUIDE.md          # User guide with examples and troubleshooting
├── nx.json
└── tsconfig.base.json
```

## 🧑‍💻 Development

### Prerequisites

- [Node.js 20+](https://nodejs.org/)
- [Git](https://git-scm.com/) (with submodule support for the legislation corpus)

### Setup

```bash
# Clone with submodules
git clone --recurse-submodules https://github.com/aplaceforallmystuff/spain-ai-kit.git
cd spain-ai-kit

# Install all workspace dependencies
npm install

# Build all packages (shared first, then MCP servers)
npm run build

# Run tests
npm test

# Format with Prettier
npm run format

# Watch mode for development
npm run dev
```

### Conventions

- npm scope: `@spain-ai-kit/*`
- MCP servers: `@spain-ai-kit/{service}-mcp-server`
- Shared code: `@spain-ai-kit/shared`
- TypeScript strict mode, ES2022 target
- All tool handlers wrapped with `wrapToolHandler` (unified error handling)
- All user inputs validated before API calls (validators live in `@spain-ai-kit/shared`)
- Rate limiting on all API clients (`maxRequestsPerSecond`)

## 🔗 Spanish Government Resources

- 🏛️ [BOE — Boletín Oficial del Estado](https://www.boe.es/) — Official State Gazette
- 📊 [INE — Instituto Nacional de Estadística](https://www.ine.es/) — National Statistics Institute
- 🏠 [Catastro — Dirección General del Catastro](https://www.catastro.hacienda.gob.es/) — Land registry
- 🌤️ [AEMET — Agencia Estatal de Meteorología](https://www.aemet.es/) — State Meteorological Agency
- 📂 [datos.gob.es](https://datos.gob.es/) — National open data portal
- 🧾 [AEAT — Agencia Tributaria](https://www.agenciatributaria.es/) — Tax agency
- 💼 [SEPE — Servicio Público de Empleo Estatal](https://www.sepe.es/) — Employment service

## 🤝 Contributing

PRs and issues welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on adding new MCP servers and contributing to existing ones.

Fork → Branch → Commit → Push → PR

## ⚖️ License

MIT — see [LICENSE](LICENSE) for details.

Legislative content sourced from public government APIs is in the public domain. The `legalize-es` corpus is distributed under its own license — see that repository for details.

---

<div align="center">
  <p>
    <strong>Copyright © 2026 Jim Christian</strong><br>
    Released under the MIT License<br>
    <a href="https://jimchristian.net">jimchristian.net</a><br>
    <br>
    Made with ❤️ in Valencia for Spain's open data 🇪🇸<br>
  </p>
</div>
