"use client";

import dynamic from "next/dynamic";

import { FluentRoot } from "@/fluent/root";

// Fluent charts read `document` when their module loads, so they render on the client only.
const Lab = dynamic(() => import("./lab"), { ssr: false });

export default function GraphLabPage() {
  return (
    <FluentRoot>
      <Lab />
    </FluentRoot>
  );
}
