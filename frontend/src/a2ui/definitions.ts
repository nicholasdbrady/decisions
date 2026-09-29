import { z } from "zod";
import {
  DynamicStringSchema,
  type CatalogDefinitions,
} from "@copilotkit/a2ui-renderer";

/**
 * The JEV catalog: what the backend may use on top of the A2UI basic catalog.
 * Definitions are platform-agnostic, so the assembler and the renderer agree on
 * one contract.
 *
 * Bindable props must use A2UI's Dynamic* schemas. A plain `z.string()` reaches
 * the renderer as the raw `{path}` binding instead of the resolved value.
 *
 * Phase 2 grows this list. Every addition needs a matching renderer in
 * `catalog.tsx`; TypeScript enforces that.
 */
export const JEV_CATALOG_ID = "https://jev.local/specification/v1/catalog.json";

export const jevDefinitions = {
  Metric: {
    description:
      "A single computed answer shown large, with a caption naming what it measures.",
    props: z.object({
      value: DynamicStringSchema,
      caption: DynamicStringSchema.optional(),
    }),
  },
  Chart: {
    description:
      "Several named runs of numbers over shared labels, drawn as overlaid lines. " +
      "`series` is a JSON string of `{ labels: string[], series: Record<string, number[]> }`.",
    props: z.object({
      series: DynamicStringSchema,
      caption: DynamicStringSchema.optional(),
    }),
  },
} satisfies CatalogDefinitions;
