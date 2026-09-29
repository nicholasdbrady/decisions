"use client";

import { useRef, useState, type ReactNode } from "react";
import { useServerInsertedHTML } from "next/navigation";
import {
  createDOMRenderer,
  FluentProvider,
  RendererProvider,
  renderToStyleElements,
  SSRProvider,
  webLightTheme,
} from "@fluentui/react-components";

/** Fluent 2 style registry for the App Router: Griffel rules render with the server HTML. */
export function FluentRoot({ children }: { children: ReactNode }) {
  const [renderer] = useState(() => createDOMRenderer());
  const inserted = useRef(false);

  useServerInsertedHTML(() => {
    if (inserted.current) return null;
    inserted.current = true;
    return <>{renderToStyleElements(renderer)}</>;
  });

  return (
    <RendererProvider renderer={renderer}>
      <SSRProvider>
        <FluentProvider theme={webLightTheme}>{children}</FluentProvider>
      </SSRProvider>
    </RendererProvider>
  );
}
