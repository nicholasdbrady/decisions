import {
  CopilotRuntime,
  createCopilotEndpointSingleRoute,
} from "@copilotkit/runtime/v2";

import { HttpAgent } from "@/lib/copilotkit-http-agent";

const backendUrl =
  process.env.AG_UI_BACKEND_URL ?? "http://127.0.0.1:8000/api/ag-ui";

const runtime = new CopilotRuntime({
  agents: {
    commandCanvas: new HttpAgent({
      agentId: "jev-command-canvas",
      description: "JEV command-canvas AG-UI agent",
      url: backendUrl,
    }),
  },
});

const endpoint = createCopilotEndpointSingleRoute({
  runtime,
  basePath: "/api/copilotkit",
});

export function GET(request: Request) {
  return endpoint.fetch(request);
}

export function POST(request: Request) {
  return endpoint.fetch(request);
}
