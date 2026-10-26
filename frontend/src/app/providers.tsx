"use client";

import { CopilotKit } from "@copilotkit/react-core";

import { jevCatalog } from "@/a2ui/catalog";

export function Providers({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <CopilotKit
      runtimeUrl="/api/copilotkit"
      agent="commandCanvas"
      showDevConsole={false}
      enableInspector={false}
      a2ui={{ catalog: jevCatalog }}
    >
      {children}
    </CopilotKit>
  );
}
