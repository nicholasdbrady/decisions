# Backend

FastAPI service for the JEV command canvas.

## Endpoints

- `GET /health`: configuration, provider readiness, and telemetry state.
- `POST /api/classify`: direct Microsoft Decision-1 classification.
- `POST /api/expand`: Luna list expansion.
- `POST /api/extract`: card-field extraction over the fast, web, or Python lane.
- `POST /api/judge`: Decision-1 pick between candidate card fills.
- `POST /api/ag-ui`: Microsoft Agent Framework AG-UI event stream.

## Tracing

Every request emits OpenTelemetry spans that go to the Application Insights
resource connected to the Foundry project, so Foundry's server-side agent traces
and this app's client-side spans share one store. View them in the Foundry portal
under **Agents → Traces**, or in Application Insights **Transaction search**.

What is instrumented:

| Layer | Spans |
| --- | --- |
| FastAPI | one server span per request |
| httpx | one client span per Decision-1 or Luna call |
| Decision-1 | `chat Decision-1` with the chosen schema, confidence, margin, every noul signal, and token usage |
| Luna | `chat gpt-6-luna` per lane with reasoning effort, tools used, token usage, and the Python the model ran |
| Extraction | `extract <card> (<lane>)` with the lane, `computed_by`, and the final answer |
| Agent Framework | agent, workflow, and tool spans from AG-UI, which uses the AG-UI thread id as `gen_ai.conversation.id` |

Attributes follow the OpenTelemetry GenAI semantic conventions (`gen_ai.*`), plus
a `decision.*` namespace for decision data.

`OTEL_SENSITIVE_DATA` is off by default. Set it to `true` only when capturing
prompts, card values, and generated code is acceptable.

Settings (all optional, `.env` or environment):

| Variable | Default | Purpose |
| --- | --- | --- |
| `OTEL_ENABLED` | `true` | Master switch |
| `OTEL_SENSITIVE_DATA` | `false` | Capture prompts, values, and code |
| `OTEL_USE_FOUNDRY_APP_INSIGHTS` | `true` | Read the connection string from the Foundry project |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | unset | Use this instead of the project lookup |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | unset | Export to a local collector when there is no App Insights |
| `OTEL_CONSOLE_EXPORTERS` | `false` | Print spans to the console |
| `OTEL_SERVICE_NAME` | `jev-command-canvas` | Service name on every span |

## Data providers

Cards never ask a model for a fact that an authority can supply.

| Provider | Key | Used by |
| --- | --- | --- |
| [`holidays`](https://pypi.org/project/holidays/) (local package, no key) | — | `countdown` resolves a named holiday to a real date |
| [Open Exchange Rates](https://openexchangerates.org/) | `OPENXCHANGERATES_APP_ID` | `convert` when both sides are currencies; rates are cached for an hour |
| [OpenWeather](https://openweathermap.org/api) | `OPENWEATHER_API_KEY` | `weather` geocoding, current conditions, and a five-day strip |

The free Open Exchange Rates plan is locked to a USD base, so a cross-rate is derived as `quote / base`. Every provider returns `None` rather than raising, so a missing key degrades a card instead of breaking it. `/health` reports which providers are configured.

| Variable | Default | Purpose |
| --- | --- | --- |
| `OPENXCHANGERATES_APP_ID` | unset | Currency conversion |
| `OPENWEATHER_API_KEY` | unset | Weather and geocoding |
| `DEFAULT_COUNTRY` | `US` | Holiday calendar |
| `DEFAULT_SUBDIVISION` | unset | State or province holidays, e.g. `WA` |
| `DEFAULT_WEATHER_UNITS` | `imperial` | Fallback units when the text does not imply one |

The current AG-UI agent verifies the transport boundary and returns an explicit pending-enrichment acknowledgement. It does not pretend that Foundry enrichment succeeded before the GPT-6 Luna provider is installed and configured.

Run with:

```powershell
Copy-Item .env.example .env
uv sync
uv run backend
```

Test with:

```powershell
uv run pytest -q
uv run ruff check .
```