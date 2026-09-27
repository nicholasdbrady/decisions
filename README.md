# JEV Command Canvas

A keyboard-first prototype that uses JEV to classify natural-language input into one of 15 bounded UI schemas. The application owns the schemas and rendering; JEV only selects and ranks them.

## Architecture

- `frontend/`: Next.js command canvas, live 250 ms JEV classification, deterministic schema rendering, local history, and the optional Inspector.
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
- CopilotKit runtime bridge: implemented through the package's v2 single-route endpoint with the public `@ag-ui/client` package. No private nested imports.
- A2UI surfaces (branch `a2ui`): the backend emits A2UI v0.9 operations and the CopilotKit A2UI renderer paints them. User actions round-trip back through AG-UI.

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
| Backend | `agent-framework-ag-ui[a2ui]` | 1.4.0 |
| Backend | `agent-framework-core` | 1.19.0 |
| Backend | `agent-framework-openai` | 1.14.4 |
| Backend | `ag-ui-a2ui-toolkit` | 0.0.4 |
| Backend | `ag-ui-protocol` | 0.1.22 |

Notes:

- `@copilotkit/react-core@latest` resolves to the `2.0.0-next.1` prerelease. Pin 1.73.0 instead.
- The A2UI surface is repainted in place by reusing a stable tool-call id, so the renderer replaces the same activity message.
- `gpt-6-luna` is used only through `/openai/v1/responses`. The chat-completions endpoint is not used anywhere: the JEV path calls Responses directly and the authored baseline uses MAF's `OpenAIChatClient`, which is the Responses client.

### Measured latency (n=5, warm, through the CopilotKit runtime)

| Path | First painted surface (median) | Range |
| --- | --- | --- |
| JEV-assembled (`commandCanvas`) | 2982 ms | 2354–4295 ms |
| Luna-authored (`lunaAuthored`) | 3649 ms | 2759–6048 ms |

User action round trip on the JEV-assembled surface: 225 ms median (213–251 ms). No model is in that loop.

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
