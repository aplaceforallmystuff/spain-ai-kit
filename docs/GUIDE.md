# Spain AI Kit — User Guide

A complete guide to installing, configuring, and using the Spain AI Kit MCP servers with your AI assistant.

## What is this?

Spain AI Kit connects AI assistants (Claude, and any MCP-compatible client) to Spanish government data. Instead of searching the web for Spanish statistics, laws, property records, or weather, your AI assistant can query official government APIs directly and get structured, accurate data.

**Four servers, 40 tools:**

| Server | What you can ask | Auth |
|--------|-----------------|------|
| **INE** (Statistics) | CPI, population, employment, tourism, housing prices | None |
| **BOE** (Legislation) | Search laws, read articles, check legal status | None |
| **Catastro** (Property) | Property lookups, address → cadastral ref, geocoding | None |
| **AEMET** (Weather) | Forecasts, alerts, UV index, fire risk, beach conditions | Free API key |

## Installation

### Prerequisites

- **Node.js 20+** (check with `node --version`)
- **An MCP-compatible AI client** — Claude Desktop, Claude Code, or any app supporting the [Model Context Protocol](https://modelcontextprotocol.io)

### Option 1: Use directly via npx (recommended)

No installation needed. Just add the servers to your AI client's config. Each server runs on demand via `npx`.

### Option 2: Clone for development

```bash
git clone --recurse-submodules https://github.com/aplaceforallmystuff/spain-ai-kit.git
cd spain-ai-kit
npm install
npm run build
npm test   # All tests should pass
```

The `--recurse-submodules` flag pulls in [legalize-es](https://github.com/legalize-dev/legalize-es), a corpus of 12,000+ Spanish laws as Markdown. This enables the BOE server's `search_corpus` and `read_corpus_law` tools. Without the submodule, those two tools return a helpful setup message instead of failing.

## Configuration

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

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

Add to your project's `.claude/settings.json` or global `~/.claude.json`:

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

### Pick and choose

You don't need all four servers. Install only the ones you need:

- **Just statistics?** Add only `spain-ine`
- **Legal research?** Add `spain-boe`
- **Property lookups?** Add `spain-catastro`
- **Weather?** Add `spain-aemet` (requires API key)

### AEMET API Key Setup

The weather server is the only one that needs an API key. It's free and takes 30 seconds:

1. Go to [opendata.aemet.es/centrodedescargas/altaUsuario](https://opendata.aemet.es/centrodedescargas/altaUsuario)
2. Enter your email address
3. Check your email for the API key
4. Paste it into the `AEMET_API_KEY` field in your config

If you don't set up the key, the AEMET server will show a clear error message with the signup link when you try to use it. The other three servers work immediately with zero setup.

## Usage Examples

Once configured, just ask your AI assistant naturally. It will call the right tools automatically.

### Statistics (INE)

```
"What is Spain's current inflation rate?"
→ Uses get_table_data to fetch CPI data

"Show me population statistics for Valencia"
→ Uses search_operations to find demographic datasets, then get_table_data

"Compare unemployment rates across Spanish provinces"
→ Uses list_operations, get_table_data with province breakdowns

"What are the latest tourism numbers for Spain?"
→ Uses search_operations("turismo"), then fetches relevant tables
```

**Tips for INE queries:**
- Search keywords work best in Spanish: "poblacion", "empleo", "precios", "turismo", "vivienda"
- INE has 112 statistical operations — use `search_operations` to find the right one
- Use `get_variable_values` to see what breakdowns are available (by province, age, sex, etc.)

### Legislation (BOE)

```
"What does Spanish law say about data protection?"
→ Uses search_legislation("proteccion datos")

"Show me the foreigners law"
→ Uses search_legislation("extranjeros"), then get_document for BOE-A-2000-544

"What articles cover residence permits in the immigration law?"
→ Uses get_document_index to get table of contents, then get_article for specific sections

"What laws were published today in the BOE?"
→ Uses get_daily_summary with today's date

"Search the full text of Spanish laws for 'vivienda habitual'"
→ Uses search_corpus (requires legalize-es submodule)
```

**Tips for BOE queries:**
- Keywords should be in Spanish for best results
- `search_legislation` searches titles and metadata; `search_corpus` searches full law text
- Use `get_document_analysis` to see how a law relates to other legislation
- The corpus covers national + all 17 autonomous community laws

### Property (Catastro)

```
"What property is at Avenida Concha Espina 1, Madrid?"
→ Uses list_provinces → list_municipalities → list_streets → lookup_address

"Look up cadastral reference 9872023VH5797S0001WX"
→ Uses get_property to fetch building data, area, and use type

"What properties are near coordinates 40.453, -3.688?"
→ Uses find_properties_nearby

"Get the GPS coordinates for this cadastral reference"
→ Uses get_coordinates

"What's the cadastral reference at latitude 40.4168, longitude -3.7038?"
→ Uses get_reference_at_coordinates
```

**Tips for Catastro queries:**
- Catastro uses a hierarchical code system: province → municipality → street → number
- The AI will chain multiple tools together to resolve an address
- Cadastral references are 14-20 character alphanumeric codes
- Coordinates use WGS84 (standard GPS) latitude/longitude
- Not all locations have cadastral references (e.g., public plazas, roads)

### Weather (AEMET)

```
"What's the weather forecast for Valencia this week?"
→ Uses search_municipalities("Valencia") to get code, then get_forecast_daily

"Is it going to rain in Barcelona tomorrow?"
→ Uses get_forecast_hourly for 48-hour detail

"Are there any weather alerts in Spain right now?"
→ Uses get_weather_alerts("esp")

"What's the UV index in Malaga today?"
→ Uses get_uv_index(0)

"What's the fire risk in the Canary Islands?"
→ Uses get_fire_risk("c")

"What are the beach conditions at Playa de la Malvarrosa?"
→ Uses get_beach_forecast with the beach code
```

**Tips for AEMET queries:**
- Municipality codes are 5 digits (e.g., 28079 for Madrid). Use `search_municipalities` first.
- AEMET updates forecasts periodically — data is cached for 30 minutes
- Weather alerts use region codes 61-79, or "esp" for all of Spain
- Station IDs for observations are alphanumeric (e.g., "3129" for Madrid Retiro)

## Combining Servers

The real power is combining data from multiple servers in one conversation:

```
"I'm thinking about buying property in Valencia. Can you look up the
cadastral data for this address, check what the current property laws
say, and tell me what the weather is like there this week?"
→ Catastro for property data, BOE for legislation, AEMET for weather

"What's the population trend in Malaga province, and what's the
average property density per municipality?"
→ INE for population statistics, Catastro for property lookups

"Are there any new laws published today that affect property owners?"
→ BOE get_daily_summary + search_legislation
```

## Troubleshooting

### Server won't start

1. Check Node.js version: `node --version` (needs 20+)
2. Try running the server directly: `npx @spain-ai-kit/ine-mcp-server`
3. If you see npm errors, try clearing the cache: `npx clear-npx-cache`

### AEMET returns "API key required"

Make sure `AEMET_API_KEY` is set in the `env` block of your config, not as a command-line argument. The key should be the raw string from AEMET's email, no quotes needed in the JSON value.

### BOE corpus search says "not found"

The legislation corpus requires the git submodule. If you're using `npx`, the corpus isn't available (it's 500MB+). For corpus search, clone the repo with `--recurse-submodules` and run locally.

### Catastro returns "no existe"

- Province codes are 1-52 (not INE codes, which go higher)
- Municipality codes are Catastro-specific (use `list_municipalities` to find them)
- Not all coordinates have cadastral references — plazas, roads, and public spaces may return no data
- Cadastral references must be 14-20 alphanumeric characters

### Slow responses

- First request to each server is slower (npm downloads the package)
- INE and Catastro API responses are cached for 10 minutes by default
- AEMET uses a double-call pattern (two HTTP requests per tool call) — slightly slower than other servers
- If a government API is down, the server will retry 3 times with exponential backoff before failing

### Tools not showing up in Claude

MCP servers load at session start. If you just added the config, restart Claude Desktop or start a new Claude Code session.

## API Data Sources

All data comes directly from official Spanish government APIs:

| Server | Agency | API Documentation |
|--------|--------|-------------------|
| INE | Instituto Nacional de Estadistica | [servicios.ine.es](https://servicios.ine.es/wstempus/js/) |
| BOE | Agencia Estatal Boletin Oficial del Estado | [boe.es/datosabiertos](https://www.boe.es/datosabiertos/) |
| Catastro | Direccion General del Catastro | [catastro.hacienda.gob.es](https://www.catastro.hacienda.gob.es/) |
| AEMET | Agencia Estatal de Meteorologia | [opendata.aemet.es](https://opendata.aemet.es/) |

No data is stored, modified, or cached beyond the current session. All queries go directly to the government APIs.

## Language

Spanish government APIs return data primarily in Spanish. Search keywords work best in Spanish:

| English | Spanish keyword |
|---------|----------------|
| population | poblacion |
| employment | empleo |
| prices / inflation | precios |
| tourism | turismo |
| housing | vivienda |
| foreigners / immigration | extranjeros |
| data protection | proteccion datos |
| property | propiedad / inmueble |

Your AI assistant will handle the translation in its responses — you can ask questions in English and get answers in English, even though the underlying data is in Spanish.
