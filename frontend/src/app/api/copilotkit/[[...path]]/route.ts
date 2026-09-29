import {
  CopilotRuntime,
  createCopilotHonoHandler,
} from "@copilotkit/runtime/v2";
import { HttpAgent } from "@ag-ui/client";

const backendUrl =
  process.env.AG_UI_BACKEND_URL ?? "http://127.0.0.1:8000/api/ag-ui";

const runtime = new CopilotRuntime({
  agents: {
    commandCanvas: new HttpAgent({
      agentId: "jev-a2ui-canvas",
      description: "JEV selects the surface; the backend assembles A2UI v0.9",
      url: backendUrl,
    }),
    // Phase 0 baseline only: Luna authors the whole surface.
    lunaAuthored: new HttpAgent({
      agentId: "luna-a2ui-author",
      description: "Luna writes the A2UI surface itself",
      url: `${backendUrl}/authored`,
    }),
  },
  a2ui: { agents: ["commandCanvas", "lunaAuthored"] },
});

// Multi-route mode: the provider has no `useSingleEndpoint`, so the client
// negotiates the transport with `GET /info` and then posts to a per-agent path.
// That needs the catch-all segment this file sits in.
const endpoint = createCopilotHonoHandler({
  runtime,
  basePath: "/api/copilotkit",
});

export function GET(request: Request) {
  return endpoint.fetch(request);
}

export function POST(request: Request) {
  return endpoint.fetch(request);
}