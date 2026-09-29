# JEV Command Canvas

A keyboard-first prototype where JEV turns natural language into UI. On the `a2ui` branch the omnibar no longer picks from a fixed set of cards: JEV selects a **capability** (a typed Python function) with closed-set arguments, the capability runs deterministically, and the surface is derived from the **shape** of whatever it returns. No card is predefined per intent. The application owns rendering; no model ever writes UI.

## Architecture

- `frontend/`: Next.js command canvas, live 250 ms JEV classification, deterministic schema rendering, local history, and the optional Inspector.
- `frontend/src/components/a2ui-omnibar.tsx`: the omnibar on the A2UI stack (`/a2ui`). It sends debounced text through the CopilotKit runtime and paints whatever surface the agent returns; it never calls `/api/*` itself.
- `backend/`: FastAPI, the direct OpenRouter Decisions adapter, switching policy, and a Microsoft Agent Framework AG-UI endpoint.
- `DESIGN.md`: the shipped Desktop Command Workspace design system.

The low-latency path calls `/api/classify` directly. Agent enrichment is a separate path exposed as AG-UI at `/api/ag-ui`, so slower model work does not delay schema selection. A Luna-authored A2UI baseline is mounted at `/api/ag-ui/authored` for latency comparison only.

## Run locally

Backend:

```powershell
Set-Location .\backend
Copy-Item .env.example .env
uv sync
uv run backend
```

Frontend:

```powershell
Set-Location .\frontend
Copy-Item .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`. The backend listens on `http://127.0.0.1:8000`.

## Configuration

- `OPENROUTER_API_KEY`: required for live JEV classification.
- JEV model: `~typesafe/jev-latest` through the OpenRouter Decisions API.
- Foundry uses Microsoft Entra authentication.
- Foundry project endpoint: `https://foundry-agent-factory.services.ai.azure.com/api/projects/foundry-project`
- Foundry deployment: `gpt-6-luna`

Secrets are not stored in this repository.

## Current integration status

- Direct OpenRouter JEV classification: implemented.
- Bounded dynamic UI and Inspector: implemented.
- Microsoft Agent Framework AG-UI SSE endpoint: implemented and protocol-smoke-tested.
- GPT-6 Luna enrichment: implemented over Foundry with Entra authentication.
- CopilotKit runtime bridge: implemented with `createCopilotHonoHandler` in **multi-route** mode, mounted at the catch-all `frontend/src/app/api/copilotkit/[[...path]]/route.ts`, with the public `@ag-ui/client` package. No private nested imports. This is load-bearing: `createCopilotEndpointSingleRoute` is deprecated and single-route mode does not serve `GET /info`, which the provider negotiates against before it will POST a run. A plain `route.ts` 404s `/info` and nothing renders.
- A2UI surfaces (branch `a2ui`): the backend emits A2UI v0.9 operations and the CopilotKit A2UI renderer paints them. User actions round-trip back through AG-UI.
- Surface assembly (branch `a2ui`): one builder per schema in `backend/src/backend/surfaces/`. `convert` has a purpose-built surface; every other schema falls through to a generic builder, so any card JEV selects paints. The frontend catalog in `frontend/src/a2ui/` merges the A2UI basic catalog and adds JEV components.
- Lane selection (branch `a2ui`): the agent, not the browser, decides which Luna lanes to run. JEV's own `needs_lookup` and `needs_computation` signals arrive with the classification, so the choice costs no extra round trip. Lanes run in parallel, the Python lane wins on arithmetic, and JEV judges when the fast and web lanes disagree.

## Capability dispatch and shape rendering (branch `a2ui`)

The card is no longer chosen; it is derived.

1. `backend/src/backend/capabilities/` holds typed functions. Each declares its arguments as closed sets (`Arg`), so JEV only ever picks from enumerated values.
2. `backend/src/backend/dispatch.py` asks JEV one batched Decisions question covering every capability and every argument, then calls the winner.
3. `backend/src/backend/shapes.py` inspects the returned value and picks a shape — `Metric`, `Ranked`, `Chart`, `Alternatives`, `Clarify` — from the data itself.
4. `frontend/src/a2ui/catalog.tsx` provides one renderer per shape. Adding a capability needs no frontend change unless it returns a genuinely new shape.

The legacy 21-schema pipeline still runs as a fallback when JEV declines every capability, so prompts such as `split a $120 dinner between 4 people` keep working (Inspector `Reason: initial_match`). A capability win reports `Reason: capability_dispatch`.

### Market data

`compare_stocks` reads Yahoo's unofficial `/v8/finance/chart` endpoint directly. `xfinance` was dropped: it adds a dependency without solving the only hard part, which is rate limiting.

Yahoo publishes no rate limits for this endpoint, so the policy follows the consistent community guidance: browser-like headers, honour `Retry-After`, otherwise exponential backoff with jitter, and a 10-minute per-symbol cache. Because an omnibar cannot stall, a requested wait longer than 4 s is abandoned immediately in favour of cached data — a stale price beats an empty card. `backend/tests/test_market.py` pins all four paths.

## A2UI package matrix (Phase 0, verified)

Stable releases only. No canaries, no prereleases.

| Side | Package | Version |
| --- | --- | --- |
| Frontend | `@copilotkit/react-core` | 1.73.0 |
| Frontend | `@copilotkit/runtime` | 1.73.0 |
| Frontend | `@copilotkit/a2ui-renderer` | 1.73.0 |
| Frontend | `@ag-ui/client` | 0.0.59 |
| Frontend | `@ag-ui/a2ui-middleware` | 0.0.10 (nested under the runtime) |
| Frontend | `@a2ui/web_core` | 0.10.4 (A2UI v0.9) |
| Frontend | `zod` | 3.25.76 |
| Backend | `agent-framework-ag-ui[a2ui]` | 1.4.0 |
| Backend | `agent-framework-core` | 1.19.0 |
| Backend | `agent-framework-openai` | 1.14.4 |
| Backend | `ag-ui-a2ui-toolkit` | 0.0.4 |
| Backend | `ag-ui-protocol` | 0.1.22 |

Notes:

- `@copilotkit/react-core@latest` resolves to the `2.0.0-next.1` prerelease. Pin 1.73.0 instead.
- `@copilotkit/a2ui-renderer` types catalog definitions against zod 3, so the frontend stays on zod 3. Nothing in this app needs zod 4.
- Custom catalog props that carry data bindings must use A2UI's `Dynamic*` schemas. A plain `z.string()` reaches the renderer as the raw `{path}` object and React refuses to render it.
- The A2UI surface is repainted in place by reusing a stable tool-call id, so the renderer replaces the same activity message.
- `gpt-6-luna` is used only through `/openai/v1/responses`. The chat-completions endpoint is not used anywhere: the JEV path calls Responses directly and the authored baseline uses MAF's `OpenAIChatClient`, which is the Responses client.
- The Inspector no longer classifies in the browser. The agent attaches its JEV decision, candidates, signals, lane choice, and extracted values to the `render_surface` tool call, and the page reads them from the assistant message.
- After editing `globals.css` while `next dev` is running, the Turbopack CSS cache can keep serving the old file. Delete `.next` and restart if a new rule does not apply.

### Measured latency (n=5, warm, through the CopilotKit runtime)

| Path | First painted surface (median) | Range |
| --- | --- | --- |
| JEV-assembled (`commandCanvas`) | 2982 ms | 2354–4295 ms |
| Luna-authored (`lunaAuthored`) | 3649 ms | 2759–6048 ms |

User action round trip on the JEV-assembled surface: 225 ms median (213–251 ms). No model is in that loop.

### Measured JEV latency: batched capability dispatch vs single classify

Five prompts × three rounds against the live Decisions API, measured in-process (no HTTP, no rendering):

| Call | n | min | p50 | p95 | max |
| --- | --- | --- | --- | --- | --- |
| Capability dispatch (batched, all capabilities + arguments) | 15 | 667 ms | 782 ms | 1417 ms | 1587 ms |
| Legacy single classify (schema only) | 15 | 604 ms | 722 ms | 785 ms | 1010 ms |

Batching every capability and argument into one Decisions call costs about 60 ms at p50. The tail is the real difference: p95 nearly doubles. That is the price of removing predefined UI, and it stays inside the 400 ms debounce budget for typical input.

## Validation

```powershell
Set-Location .\backend
uv run pytest -q
uv run ruff check .

Set-Location ..\frontend
npm run lint
npx tsc --noEmit
npm run build
```
