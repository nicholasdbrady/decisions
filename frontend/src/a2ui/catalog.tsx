"use client";

import { createCatalog } from "@copilotkit/a2ui-renderer";

import { JEV_CATALOG_ID, jevDefinitions } from "./definitions";

/**
 * React renderers for the JEV catalog, merged with the A2UI basic catalog so
 * Card, Column, Row, Text, TextField, ChoicePicker, and Button keep working.
 *
 * Phase 1 keeps the markup plain. Fluent UI v9 lands in Phase 2.
 */

/** The renderer resolves bindings before calling us; the prop type stays the union. */
function resolved(value: unknown): string {
  return typeof value === "string" ? value : "";
}
export const jevCatalog = createCatalog(
  jevDefinitions,
  {
    Metric: ({ props }) => {
      const caption = resolved(props.caption);
      return (
        <div className="flex flex-col gap-1">
          <span className="text-3xl font-semibold tabular-nums">
            {resolved(props.value)}
          </span>
          {caption ? (
            <span className="text-xs uppercase tracking-wide opacity-60">{caption}</span>
          ) : null}
        </div>
      );
    },
  },
  { catalogId: JEV_CATALOG_ID, includeBasicCatalog: true },
);
