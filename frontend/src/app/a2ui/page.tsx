"use client";

import "@copilotkit/react-core/v2/styles.css";

import { A2uiOmnibar } from "@/components/a2ui-omnibar";
import { FluentRoot } from "@/fluent/root";

// The omnibar on the A2UI stack: JEV picks the surface, the MAF agent assembles
// A2UI v0.9 operations, and CopilotKit's renderer paints them with our catalog.
export default function A2uiPage() {
  return (
    <FluentRoot>
      <A2uiOmnibar />
    </FluentRoot>
  );
}
