"use client";

import { CopilotKit } from "@copilotkit/react-core";

export function Providers({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <CopilotKit
      runtimeUrl="/api/copilotkit"
      agent="commandCanvas"
      showDevConsole={false}
      enableInspector={false}
    >
      {children}
    </CopilotKit>
  );
}
