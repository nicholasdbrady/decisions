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
 * component shows which field, so weather, stocks, and clocks all compose from
 * the same parts. The approved look of each one is in DESIGN.md, "A2UI catalog
 * (Fluent 2)".
 *
 * Bindable props must use A2UI's Dynamic* schemas. A plain `z.string()` reaches
 * the renderer as the raw `{path}` binding instead of the resolved value.
 *
 * Records travel as a JSON string through a DynamicString, so one binding can
 * carry a whole list that arrives with the API output.
 *
 * `icon` and `tone` are closed sets (see `ICONS` and `TONES` in `fluent/tone.tsx`).
 * Unknown names fall back to no icon and the neutral tone. The tones are:
 * neutral, clear, clouds, rain, storm, snow, fog, up, down, warn, time, compute,
 * list, record, plan.
 *
 * Every addition needs a matching renderer in `catalog.tsx`; TypeScript enforces that.
 */
export const JEV_CATALOG_ID = "https://jev.local/specification/v1/catalog.json";

const ComponentId = z.string();

export const jevDefinitions = {
  Header: {
    description:
      "The card head on white: a one-sentence `title` that answers the question, and a small " +
      "`caption` naming the place, the source, and the measure.",
    props: z.object({
      title: DynamicStringSchema,
      caption: DynamicStringSchema.optional(),
    }),
  },
  Hero: {
    description:
      "The tinted head of a card: the `title` lead, then a drawn illustration, the one value that " +
      "answers the question, and a real-data context visual, with stats below. `art` is one of " +
      "rain, clouds, clear, trend, clock, split; anything else draws the tone icon. `captionTone` " +
      "is up or down. `context` is a JSON string, one of " +
      "`{ kind: 'forecast', steps: { label: string, value: number, rain?: number }[] }`, " +
      "`{ kind: 'trend', points: number[], labels?: [string, string] }`, " +
      "`{ kind: 'day', places: { name: string, rise: number, set: number, now: number }[] }` " +
      "(hours of the local day), or `{ kind: 'parts', parts: { label: string, value: number }[] }`. " +
      "`stats` is a JSON string of `{ label, value, tone?, note?, shape? }[]`, where `shape` is " +
      "`{ kind: 'range', lo, hi, at }`, `{ kind: 'meter', pct }`, or `{ kind: 'bearing', deg }`.",
    props: z.object({
      title: DynamicStringSchema.optional(),
      value: DynamicStringSchema,
      unit: DynamicStringSchema.optional(),
      caption: DynamicStringSchema.optional(),
      captionTone: DynamicStringSchema.optional(),
      tone: DynamicStringSchema.optional(),
      art: DynamicStringSchema.optional(),
      context: DynamicStringSchema.optional(),
      contextCaption: DynamicStringSchema.optional(),
      stats: DynamicStringSchema.optional(),
    }),
  },
  Panel: {
    description:
      "An edge-to-edge band in the wash of one condition's tone. It holds the answer (a Metric, " +
      "Chips, a Range, or choices) and passes its tone to everything inside it.",
    props: z.object({
      child: ComponentId,
      tone: DynamicStringSchema.optional(),
    }),
  },
  Metric: {
    description:
      "The computed answer inside a Panel: the tone icon, the value shown large with a muted " +
      "`unit`, and a `caption` note under it. `icon` replaces the tone icon.",
    props: z.object({
      value: DynamicStringSchema,
      unit: DynamicStringSchema.optional(),
      caption: DynamicStringSchema.optional(),
      tone: DynamicStringSchema.optional(),
      icon: DynamicStringSchema.optional(),
    }),
  },
  Chips: {
    description:
      "Short facts as pills, a few words each. `items` is a JSON string of " +
      "`{ label: string, icon?: string }[]`. Chips never invent values.",
    props: z.object({
      items: DynamicStringSchema,
    }),
  },
  Strip: {
    description:
      "Equal tiles over a short sequence such as days or hours. `items` is a JSON string of " +
      "`{ label, value, sub?, icon?, delta?, lo?, hi?, at?, current?, flag? }[]`. `lo`/`hi` draw " +
      "a span and `at` a point on the shared `scale`, a JSON `[low, high]` computed from the " +
      "full set. `flag` is `{ text: string, tone?: string, icon?: string }`, such as a drop " +
      "with '100%'. `current` marks the tile for now.",
    props: z.object({
      items: DynamicStringSchema,
      scale: DynamicStringSchema.optional(),
      tone: DynamicStringSchema.optional(),
    }),
  },
  Range: {
    description:
      "Where a value sits between its low and high, such as today's temperature or a 52-week " +
      "price. `suffix` follows every number (such as '°'), `unit` follows the value only, and " +
      "`digits` fixes the decimals. `lowLabel`/`highLabel` name the ends.",
    props: z.object({
      low: DynamicNumberSchema,
      high: DynamicNumberSchema,
      value: DynamicNumberSchema.optional(),
      unit: DynamicStringSchema.optional(),
      suffix: DynamicStringSchema.optional(),
      digits: DynamicNumberSchema.optional(),
      lowLabel: DynamicStringSchema.optional(),
      highLabel: DynamicStringSchema.optional(),
      tone: DynamicStringSchema.optional(),
    }),
  },
  Ranked: {
    description:
      "Comparable rows, best first, each its own bar. `items` is a JSON string of " +
      "`{ label: string, value: string, sub?: string, delta?: number, bar?: number }[]`. " +
      "`delta` colors the value up or down; `bar` is 0..1 and fills the row.",
    props: z.object({
      items: DynamicStringSchema,
      tone: DynamicStringSchema.optional(),
    }),
  },
  Facts: {
    description:
      "The fields around an answer, led by the one that answers this question. `title` is the " +
      "lead. `featured` names the fact (by `id` or `label`) shown large in the tinted head; " +
      "`order` is a JSON string of ids or labels for the rest, most relevant first. `items` is " +
      "a JSON string of `{ id?, label, value, unit?, note?, noteTone?, icon?, bearing?, shape? }[]`, " +
      "where `shape` is one of range `{ lo, hi, at, ends? }`, meter `{ pct }`, gap " +
      "`{ lo, hi, from, to }`, day `{ rise, set, now, ends? }`, parts `{ parts, labels }`, or " +
      "slots `{ values, labels }`, each with `kind`. `more` titles the fold and `collapsed` " +
      "starts it closed.",
    props: z.object({
      items: DynamicStringSchema,
      title: DynamicStringSchema.optional(),
      tone: DynamicStringSchema.optional(),
      featured: DynamicStringSchema.optional(),
      order: DynamicStringSchema.optional(),
      more: DynamicStringSchema.optional(),
      collapsed: DynamicBooleanSchema.optional(),
    }),
  },
  Choice: {
    description:
      "The face of one clarify option inside a Button: the `name`, a likelihood meter from " +
      "`share` (0..1), and, when the answer is cheap, its `value` and `context` computed ahead " +
      "of the pick. `top` draws the leading candidate larger.",
    props: z.object({
      name: DynamicStringSchema,
      share: DynamicNumberSchema.optional(),
      value: DynamicStringSchema.optional(),
      context: DynamicStringSchema.optional(),
      top: DynamicBooleanSchema.optional(),
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
