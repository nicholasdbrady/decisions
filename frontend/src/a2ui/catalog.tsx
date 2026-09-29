"use client";

import "./catalog.css";

import type { ReactNode } from "react";
import { Catalog, basicCatalog, createCatalog } from "@copilotkit/a2ui-renderer";
import {
  AlertTriangle,
  Calculator,
  Calendar,
  CheckCircle2,
  Clock,
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  DollarSign,
  Droplets,
  Globe2,
  Info,
  List,
  MapPin,
  Plane,
  Receipt,
  Snowflake,
  Sparkles,
  Sun,
  Sunrise,
  Sunset,
  Thermometer,
  TrendingDown,
  TrendingUp,
  Umbrella,
  Users,
  Wind,
  type LucideIcon,
} from "lucide-react";

import { basicOverrides } from "./basics";
import { JEV_CATALOG_ID, jevDefinitions } from "./definitions";

/**
 * React renderers for the JEV catalog. The components are generic: each one
 * draws a data shape (a hero value, a sequence, a ranking), never a domain.
 * JEV picks which shape shows which field at run time.
 *
 * Icons and tones are closed vocabularies so a model can only choose names we
 * can draw. Unknown names degrade to no icon and the neutral tone.
 */

export const ICONS: Record<string, LucideIcon> = {
  alert: AlertTriangle,
  calculator: Calculator,
  calendar: Calendar,
  check: CheckCircle2,
  clock: Clock,
  cloud: Cloud,
  "cloud-sun": CloudSun,
  dollar: DollarSign,
  droplets: Droplets,
  fog: CloudFog,
  globe: Globe2,
  info: Info,
  list: List,
  pin: MapPin,
  plane: Plane,
  rain: CloudRain,
  receipt: Receipt,
  snow: Snowflake,
  sparkles: Sparkles,
  storm: CloudLightning,
  sun: Sun,
  sunrise: Sunrise,
  sunset: Sunset,
  thermometer: Thermometer,
  "trending-down": TrendingDown,
  "trending-up": TrendingUp,
  umbrella: Umbrella,
  users: Users,
  wind: Wind,
};

export const TONES = [
  "neutral",
  "clear",
  "clouds",
  "rain",
  "storm",
  "snow",
  "fog",
  "up",
  "down",
  "warn",
  "time",
  "compute",
  "list",
  "record",
  "plan",
] as const;

/** The renderer resolves bindings before calling us; the prop type stays the union. */
function str(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function num(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function tone(value: unknown): string {
  const name = str(value).toLowerCase();
  return (TONES as readonly string[]).includes(name) ? name : "neutral";
}

function Icon({ name, size = 16 }: { name: unknown; size?: number }): ReactNode {
  const Glyph = ICONS[str(name).toLowerCase()];
  return Glyph ? <Glyph size={size} strokeWidth={2} aria-hidden="true" /> : null;
}

/** Records travel as JSON strings, so a partial paint can hold invalid JSON. */
function records<T>(value: unknown): T[] {
  try {
    const parsed = JSON.parse(str(value)) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

type Runs = { labels: string[]; series: Record<string, number[]> };

function parseRuns(value: unknown): Runs | null {
  try {
    const parsed = JSON.parse(str(value)) as Runs;
    return parsed && typeof parsed === "object" && parsed.series ? parsed : null;
  } catch {
    return null;
  }
}

const STROKES = ["#1d4ed8", "#c2410c", "#6d28d9", "#15803d", "#be123c"];
const WIDTH = 320;
const HEIGHT = 110;

/** Map one run onto the viewBox, sharing the y-scale so the lines compare. */
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

function signed(value: number, digits = 1): string {
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value).toFixed(digits)}%`;
}

type Chip = { label: string; icon?: string };
type Step = { label: string; value: string; sub?: string; icon?: string; flag?: string };
type RankRow = { label: string; value: string; sub?: string; delta?: number; bar?: number };
type Fact = { label: string; value: string };

const jevComponents = createCatalog(
  jevDefinitions,
  {
    Header: ({ props }) => {
      const title = str(props.title);
      const subtitle = str(props.subtitle);
      const source = str(props.source);
      return (
        <header className="jev-header">
          <div className="jev-header-line">
            <span className="jev-tile" data-tone={tone(props.tone)}>
              <Icon name={props.icon} size={15} />
            </span>
            <span className="jev-kind">{str(props.kind)}</span>
            {source ? <span className="jev-source">{source}</span> : null}
          </div>
          {title ? <h2 className="jev-title">{title}</h2> : null}
          {subtitle ? <p className="jev-subtitle">{subtitle}</p> : null}
        </header>
      );
    },
    Hero: ({ props }) => {
      const unit = str(props.unit);
      const caption = str(props.caption);
      const aside = str(props.aside);
      const asideCaption = str(props.asideCaption);
      const icon = Icon({ name: props.icon, size: 34 });
      return (
        <div className="jev-hero">
          {icon ? <span className="jev-hero-icon">{icon}</span> : null}
          <div className="jev-hero-reading">
            <strong>
              {str(props.value)}
              {unit ? <span>{unit}</span> : null}
            </strong>
            {caption ? <small>{caption}</small> : null}
          </div>
          {aside ? (
            <div className="jev-hero-aside">
              <span>{aside}</span>
              {asideCaption ? <small>{asideCaption}</small> : null}
            </div>
          ) : null}
        </div>
      );
    },
    Panel: ({ props, children }) => (
      <div className="jev-panel" data-tone={tone(props.tone)}>
        {props.child ? children(props.child) : null}
      </div>
    ),
    Chips: ({ props }) => {
      const items = records<Chip>(props.items).filter((item) => item?.label);
      if (items.length === 0) return null;
      return (
        <ul className="jev-chips">
          {items.map((item, index) => (
            <li key={`${item.label}-${index}`}>
              <Icon name={item.icon} size={14} />
              {item.label}
            </li>
          ))}
        </ul>
      );
    },
    Strip: ({ props }) => {
      const items = records<Step>(props.items).filter((item) => item?.label);
      const caption = str(props.caption);
      if (items.length === 0) return null;
      return (
        <figure className="jev-strip-wrap">
          {caption ? <figcaption className="jev-caption">{caption}</figcaption> : null}
          <ol className="jev-strip">
            {items.map((item, index) => (
              <li key={`${item.label}-${index}`}>
                <small>{item.label}</small>
                <Icon name={item.icon} size={18} />
                <span>
                  {item.value}
                  {item.sub ? <i>{item.sub}</i> : null}
                </span>
                {item.flag ? <em>{item.flag}</em> : null}
              </li>
            ))}
          </ol>
        </figure>
      );
    },
    Range: ({ props }) => {
      const low = num(props.low);
      const high = num(props.high);
      if (low === null || high === null) return null;
      const value = num(props.value);
      const unit = str(props.unit);
      const caption = str(props.caption);
      const span = high - low || 1;
      const at = value === null ? null : Math.min(Math.max((value - low) / span, 0), 1);
      const show = (n: number) => `${n.toLocaleString()}${unit}`;
      return (
        <div className="jev-range">
          {caption ? <small className="jev-caption">{caption}</small> : null}
          <div className="jev-range-track" role="img" aria-label={`${show(value ?? low)} between ${show(low)} and ${show(high)}`}>
            {at !== null ? <b style={{ left: `${at * 100}%` }} /> : null}
          </div>
          <div className="jev-range-ends">
            <span>{show(low)}</span>
            {value !== null ? <strong>{show(value)}</strong> : null}
            <span>{show(high)}</span>
          </div>
        </div>
      );
    },
    Ranked: ({ props }) => {
      const rows = records<RankRow>(props.items).filter((row) => row?.label);
      const caption = str(props.caption);
      if (rows.length === 0) return null;
      // Drop the bar and delta columns when no row uses them, so values stay right-aligned.
      const bars = rows.some((row) => typeof row.bar === "number");
      const deltas = rows.some((row) => typeof row.delta === "number");
      return (
        <figure className="jev-ranked-wrap">
          {caption ? <figcaption className="jev-caption">{caption}</figcaption> : null}
          <ol className="jev-ranked" data-bars={bars || undefined} data-deltas={deltas || undefined}>
            {rows.map((row, index) => {
              const delta = typeof row.delta === "number" ? row.delta : null;
              const direction = delta === null ? undefined : delta > 0 ? "up" : delta < 0 ? "down" : "flat";
              const bar = typeof row.bar === "number" ? Math.min(Math.max(row.bar, 0), 1) : null;
              return (
                <li key={`${row.label}-${index}`} data-direction={direction}>
                  <span className="jev-ranked-name">
                    <strong>{row.label}</strong>
                    {row.sub ? <small>{row.sub}</small> : null}
                  </span>
                  {bars ? (
                    <i className="jev-ranked-bar">
                      {bar !== null ? <b style={{ transform: `scaleX(${Math.max(bar, 0.02)})` }} /> : null}
                    </i>
                  ) : null}
                  <span className="jev-ranked-value">{row.value}</span>
                  {deltas ? delta !== null ? <span className="jev-delta">{signed(delta)}</span> : <span /> : null}
                </li>
              );
            })}
          </ol>
        </figure>
      );
    },
    Facts: ({ props }) => {
      const facts = records<Fact>(props.items).filter((fact) => fact?.label);
      if (facts.length === 0) return null;
      const title = str(props.title) || "Details";
      const grid = (
        <dl className="jev-facts">
          {facts.map((fact, index) => (
            <div key={`${fact.label}-${index}`}>
              <dt>{fact.label}</dt>
              <dd>{str(fact.value)}</dd>
            </div>
          ))}
        </dl>
      );
      return props.collapsed === true ? (
        <details className="jev-details">
          <summary>
            {title}
            <small>{facts.length}</small>
          </summary>
          {grid}
        </details>
      ) : (
        <section className="jev-facts-wrap">
          {str(props.title) ? <h3 className="jev-subhead">{title}</h3> : null}
          {grid}
        </section>
      );
    },
    Metric: ({ props }) => {
      const caption = str(props.caption);
      return (
        <div className="jev-metric">
          <strong>{str(props.value)}</strong>
          {caption ? <small>{caption}</small> : null}
        </div>
      );
    },
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
            {/* A zero line only means something once a run crosses it. */}
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
                  {unit && typeof last === "number" ? <small>{`${last > 0 ? "+" : ""}${last.toFixed(1)}${unit}`}</small> : null}
                </li>
              );
            })}
          </ul>
          {caption ? <figcaption className="jev-caption">{caption}</figcaption> : null}
        </figure>
      );
    },
  },
  { catalogId: JEV_CATALOG_ID, includeBasicCatalog: false },
);

/**
 * Basic components first, then our restyled basics and JEV components. The
 * catalog keys by name, so later entries replace the plain basic renderers.
 */
export const jevCatalog = new Catalog(
  JEV_CATALOG_ID,
  [
    ...Array.from(basicCatalog.components.values()),
    ...basicOverrides,
    ...Array.from(jevComponents.components.values()),
  ],
  Array.from(basicCatalog.functions.values()),
);
