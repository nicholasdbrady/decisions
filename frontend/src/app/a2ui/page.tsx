"use client";

import "@copilotkit/react-core/v2/styles.css";
import { CopilotChat } from "@copilotkit/react-core/v2";

// Phase 0 proof surface: JEV picks the surface, the MAF agent assembles A2UI v0.9,
// and CopilotKit's built-in A2UI renderer paints it inside the chat transcript.
export default function A2uiProof() {
  return (
    <main className="mx-auto flex h-dvh w-full max-w-3xl flex-col p-4">
      <CopilotChat agentId="commandCanvas" className="h-full" />
    </main>
  );
}