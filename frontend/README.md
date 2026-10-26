# Frontend

Next.js implementation of the JEV command canvas.

## Run

```powershell
Copy-Item .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`. The frontend expects the FastAPI backend at `http://127.0.0.1:8000` unless `NEXT_PUBLIC_API_BASE_URL` overrides it.

## Behavior

- Debounces classification for 250 ms.
- Aborts superseded requests.
- Rejects stale responses with generation IDs.
- Renders one of 15 application-owned schemas.
- Stores completed local records in browser storage.
- Opens the JEV Inspector as a desktop panel or narrow-screen drawer.

The CopilotKit runtime is available at `/api/copilotkit` and proxies the `commandCanvas` agent to the Python AG-UI endpoint. Because the installed CopilotKit preview carries an older private AG-UI contract, `src/lib/copilotkit-http-agent.ts` isolates its nested client from the application's newer direct AG-UI dependency.

## Validate

```powershell
npm run lint
npx tsc --noEmit
npm run build
```
