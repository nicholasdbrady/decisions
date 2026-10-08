"use client";

import "./catalog.css";

import {
  Catalog,
  basicCatalog,
  createCatalog,
} from "@copilotkit/a2ui-renderer";

import { basicOverrides } from "./basics";
import { JEV_CATALOG_ID, jevDefinitions } from "./definitions";
import { AnswerView } from "./fluent/answer";
import { FactsView } from "./fluent/facts";
import { HeroView } from "./fluent/hero";
import {
  ChipsView,
  ChoiceView,
  HeaderView,
  MetricView,
  PanelView,
} from "./fluent/panel";
import { RangeView } from "./fluent/range";
import { RankedView } from "./fluent/ranked";
import { StripView } from "./fluent/strip";
import { str } from "./fluent/tone";

type Runs = { labels: string[]; series: Record<string, number[]> };

function parseRuns(value: unknown): Runs | null {
  try {
    const parsed = JSON.parse(str(value)) as Runs;
    return parsed && typeof parsed === "object" && parsed.series
      ? parsed
      : null;
  } catch {
    return null;
  }
}

const STROKES = ["#1d4ed8", "#c2410c", "#6d28d9", "#15803d", "#be123c"];
const WIDTH = 320;
const HEIGHT = 110;

function linePath(points: number[], low: number, high: number): string {
  const span = high - low || 1;
  const step = points.length > 1 ? WIDTH / (points.length - 1) : 0;
  return points
    .map((point, index) => {
      const y = HEIGHT - ((point - low) / span) * HEIGHT;
      return `${index === 0 ? "M" : "L"}${(index * step).toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

const jevComponents = createCatalog(
  jevDefinitions,
  {
    Answer: ({ props }) => <AnswerView {...props} />,
    Header: ({ props }) => <HeaderView {...props} />,
    Hero: ({ props }) => <HeroView {...props} />,
    Panel: ({ props, children }) => (
      <PanelView tone={props.tone}>
        {props.child ? children(props.child) : null}
      </PanelView>
    ),
    Metric: ({ props }) => <MetricView {...props} />,
    Chips: ({ props }) => <ChipsView {...props} />,
    Strip: ({ props }) => <StripView {...props} />,
    Range: ({ props }) => <RangeView {...props} />,
    Ranked: ({ props }) => <RankedView {...props} />,
    Facts: ({ props }) => <FactsView {...props} />,
    Choice: ({ props }) => <ChoiceView {...props} />,
    Chart: ({ props }) => {
      const runs = parseRuns(props.series);
      const caption = str(props.caption);
      const unit = str(props.unit);
      const names = runs ? Object.keys(runs.series) : [];
      if (!runs || names.length === 0) return null;

      const every = names.flatMap((name) => runs.series[name] ?? []);
      const low = Math.min(...every);
      const high = Math.max(...every);
      const labels = runs.labels ?? [];

      return (
        <figure className="jev-chart">
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            preserveAspectRatio="none"
            role="img"
            aria-label={caption || `${names.join(", ")} over time`}
          >
            {low < 0 && high > 0 ? (
              <line
                x1={0}
                x2={WIDTH}
                y1={HEIGHT - ((0 - low) / (high - low || 1)) * HEIGHT}
                y2={HEIGHT - ((0 - low) / (high - low || 1)) * HEIGHT}
                className="jev-chart-zero"
              />
            ) : null}
            {names.map((name, index) => (
              <path
                key={name}
                d={linePath(runs.series[name] ?? [], low, high)}
                fill="none"
                stroke={STROKES[index % STROKES.length]}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
          {labels.length > 1 ? (
            <div className="jev-chart-axis">
              <span>{labels[0]}</span>
              <span>{labels[labels.length - 1]}</span>
            </div>
          ) : null}
          <ul className="jev-chart-legend">
            {names.map((name, index) => {
              const run = runs.series[name] ?? [];
              const last = run[run.length - 1];
              return (
                <li key={name}>
                  <i style={{ background: STROKES[index % STROKES.length] }} />
                  {name}
                  {unit && typeof last === "number" ? (
                    <small>{`${last > 0 ? "+" : ""}${last.toFixed(1)}${unit}`}</small>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {caption ? (
            <figcaption className="jev-caption">{caption}</figcaption>
          ) : null}
        </figure>
      );
    },
  },
  { catalogId: JEV_CATALOG_ID, includeBasicCatalog: false },
);

export const jevCatalog = new Catalog(
  JEV_CATALOG_ID,
  [
    ...Array.from(basicCatalog.components.values()),
    ...basicOverrides,
    ...Array.from(jevComponents.components.values()),
  ],
  Array.from(basicCatalog.functions.values()),
);
