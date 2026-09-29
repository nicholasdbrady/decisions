import { z } from "zod";
import {
  DynamicBooleanSchema,
  DynamicNumberSchema,
  DynamicStringSchema,
  type CatalogDefinitions,
} from "@copilotkit/a2ui-renderer";

/**
 * The JEV catalog: generic, data-shaped components that sit on top of the A2UI
 * basic catalog. None of them knows a domain. JEV decides at run time which
 * component shows which field, so weather, stocks, and bills all compose from
 * the same parts.
 *
 * Bindable props must use A2UI's Dynamic* schemas. A plain `z.string()` reaches
 * the renderer as the raw `{path}` binding instead of the resolved value.
 *
 * Records travel as a JSON string through a DynamicString, so one binding can
 * carry a whole list that arrives with the API output.
 *
 * `icon` and `tone` are closed sets (see `ICONS` and `TONES` in `catalog.tsx`).
 * Unknown names fall back to no icon and the neutral tone.
 *
 * Every addition needs a matching renderer in `catalog.tsx`; TypeScript enforces that.
 */
export const JEV_CATALOG_ID = "https://jev.local/specification/v1/catalog.json";

const ComponentId = z.string();

export const jevDefinitions = {
  Header: {
    description:
      "The card head: a short uppercase kind label with an icon tile, then the answer as a title. " +
      "`source` is a small provenance badge such as 'Open-Meteo' or 'Yahoo Finance'.",
    props: z.object({
      kind: DynamicStringSchema,
      title: DynamicStringSchema.optional(),
      subtitle: DynamicStringSchema.optional(),
      icon: DynamicStringSchema.optional(),
      tone: DynamicStringSchema.optional(),
      source: DynamicStringSchema.optional(),
    }),
  },
  Hero: {
    description:
      "The one value that answers the question, shown large with its unit and a caption. " +
      "`aside` and `asideCaption` sit on the right for a secondary reading such as a high and low.",
    props: z.object({
      value: DynamicStringSchema,
      unit: DynamicStringSchema.optional(),
      caption: DynamicStringSchema.optional(),
      icon: DynamicStringSchema.optional(),
      aside: DynamicStringSchema.optional(),
      asideCaption: DynamicStringSchema.optional(),
    }),
  },
  Panel: {
    description:
      "A tinted container that carries a condition through color: clear, clouds, rain, storm, snow, " +
      "fog, up, down, warn, time, compute, list, record, plan, or neutral.",
    props: z.object({
      child: ComponentId,
      tone: DynamicStringSchema.optional(),
    }),
  },
  Chips: {
    description:
      "Short facts as soft pills. `items` is a JSON string of `{ label: string, icon?: string }[]`.",
    props: z.object({
      items: DynamicStringSchema,
    }),
  },
  Strip: {
    description:
      "A row of equal columns over a sequence such as days or hours. `items` is a JSON string of " +
      "`{ label: string, value: string, sub?: string, icon?: string, flag?: string }[]`. " +
      "`flag` is a small accent note such as '60%'.",
    props: z.object({
      items: DynamicStringSchema,
      caption: DynamicStringSchema.optional(),
    }),
  },
  Range: {
    description:
      "Where a current value sits between a low and a high, such as today's temperature or a 52-week price.",
    props: z.object({
      low: DynamicNumberSchema,
      high: DynamicNumberSchema,
      value: DynamicNumberSchema.optional(),
      unit: DynamicStringSchema.optional(),
      caption: DynamicStringSchema.optional(),
    }),
  },
  Ranked: {
    description:
      "Comparable rows, best first. `items` is a JSON string of " +
      "`{ label: string, value: string, sub?: string, delta?: number, bar?: number }[]`. " +
      "`delta` colors the row up or down; `bar` is 0..1 and draws a proportion.",
    props: z.object({
      items: DynamicStringSchema,
      caption: DynamicStringSchema.optional(),
    }),
  },
  Facts: {
    description:
      "A dense label and value grid for the remaining fields. `items` is a JSON string of " +
      "`{ label: string, value: string }[]`. Set `collapsed` to fold it behind its title.",
    props: z.object({
      items: DynamicStringSchema,
      title: DynamicStringSchema.optional(),
      collapsed: DynamicBooleanSchema.optional(),
    }),
  },
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
      "`series` is a JSON string of `{ labels: string[], series: Record<string, number[]> }`. " +
      "Set `unit` (such as '%') to label each run's last value in the legend.",
    props: z.object({
      series: DynamicStringSchema,
      unit: DynamicStringSchema.optional(),
      caption: DynamicStringSchema.optional(),
    }),
  },
} satisfies CatalogDefinitions;
