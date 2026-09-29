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

type Runs = { labels: string[]; series: Record<string, number[]> };

/** The backend sends JSON through a Dynamic string, so parsing can fail on a partial paint. */
function parseRuns(value: unknown): Runs | null {
  try {
    const parsed = JSON.parse(resolved(value)) as Runs;
    return parsed && typeof parsed === "object" && parsed.series ? parsed : null;
  } catch {
    return null;
  }
}

const STROKES = ["#7dd3fc", "#f0abfc", "#fcd34d", "#86efac", "#fca5a5"];
const WIDTH = 320;
const HEIGHT = 96;

/** Map one run onto the viewBox, sharing the y-scale so the lines compare. */
function path(points: number[], low: number, high: number): string {
  const span = high - low || 1;
  const step = points.length > 1 ? WIDTH / (points.length - 1) : 0;
  return points
    .map((point, index) => {
      const y = HEIGHT - ((point - low) / span) * HEIGHT;
      return `${index === 0 ? "M" : "L"}${(index * step).toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
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
    Chart: ({ props }) => {
      const runs = parseRuns(props.series);
      const caption = resolved(props.caption);
      const names = runs ? Object.keys(runs.series) : [];
      if (!runs || names.length === 0) return null;

      const every = names.flatMap((name) => runs.series[name] ?? []);
      const low = Math.min(...every);
      const high = Math.max(...every);
      const labels = runs.labels ?? [];

      return (
        <div className="flex flex-col gap-2">
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="h-24 w-full overflow-visible"
            preserveAspectRatio="none"
            role="img"
            aria-label={caption || `${names.join(", ")} over time`}
          >
            {/* A zero line only means something once a run crosses it. */}
            {low < 0 && high > 0 ? (
              <line
                x1={0}
                x2={WIDTH}
                y1={HEIGHT - ((0 - low) / (high - low || 1)) * HEIGHT}
                y2={HEIGHT - ((0 - low) / (high - low || 1)) * HEIGHT}
                stroke="currentColor"
                strokeDasharray="3 3"
                opacity={0.25}
              />
            ) : null}
            {names.map((name, index) => (
              <path
                key={name}
                d={path(runs.series[name] ?? [], low, high)}
                fill="none"
                stroke={STROKES[index % STROKES.length]}
                strokeWidth={1.75}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs opacity-80">
            {names.map((name, index) => (
              <span key={name} className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: STROKES[index % STROKES.length] }}
                />
                {name}
              </span>
            ))}
          </div>
          {labels.length > 1 ? (
            <div className="flex justify-between text-xs uppercase tracking-wide opacity-50">
              <span>{labels[0]}</span>
              <span>{labels[labels.length - 1]}</span>
            </div>
          ) : null}
          {caption ? <span className="text-xs opacity-60">{caption}</span> : null}
        </div>
      );
    },
  },
  { catalogId: JEV_CATALOG_ID, includeBasicCatalog: true },
);
