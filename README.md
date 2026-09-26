# JEV Command Canvas

A keyboard-first prototype that uses JEV to classify natural-language input into one of 15 bounded UI schemas. The application owns the schemas and rendering; JEV only selects and ranks them.

## Architecture

- `frontend/`: Next.js command canvas, live 250 ms JEV classification, deterministic schema rendering, local history, and the optional Inspector.
- `backend/`: FastAPI, the direct OpenRouter Decisions adapter, switching policy, and a Microsoft Agent Framework AG-UI endpoint.
- `DESIGN.md`: the shipped Desktop Command Workspace design system.

The low-latency path calls `/api/classify` directly. Agent enrichment is a separate path exposed as AG-UI at `/api/ag-ui`, so slower model work does not delay schema selection.

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
- GPT-6 Luna enrichment: blocked until the mandatory Foundry setup workflow is authorized.
- CopilotKit runtime bridge: implemented through the package's v2 single-route endpoint. The bridge deliberately loads CopilotKit's own nested AG-UI client so its private agent contract stays isolated from the application's newer direct AG-UI dependency.

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
