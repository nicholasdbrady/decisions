"use client";

import { type CSSProperties, useState } from "react";
import {
  Body1,
  Caption1,
  Card,
  makeStyles,
  mergeClasses,
  Skeleton,
  SkeletonItem,
  Tab,
  TabList,
  Text,
  Title3,
  tokens,
} from "@fluentui/react-components";

import { FluentRoot } from "@/fluent/root";
import { MSFT_CLOSE } from "../graph/trend-data";

/**
 * Hero lab, round 3: directions B2 and B3 with illustrations and motion. Every reading is real:
 * our OpenWeather provider for Redmond (Sep 29, 2026, 3:49 PM PDT) and Yahoo Finance daily
 * closes; the Tokyo time and the bill split are computed. Each reading carries a
 * small context visual so the number never stands alone.
 */

type Tone = "rain" | "up" | "time" | "compute";
/** A stat gets a shape only when its data has one: a span, a share, or a bearing. */
type Viz =
  | { kind: "range"; lo: number; hi: number; at: number }
  | { kind: "meter"; pct: number }
  | { kind: "bearing"; deg: number };
type Stat = {
  label: string;
  value: string;
  tone?: "up" | "down";
  note?: string;
  viz?: Viz;
};
type Reading = {
  id: string;
  prompt: string;
  lead: string;
  value: string;
  unit?: string;
  caption?: string;
  captionTone?: "up" | "down";
  tone: Tone;
  stats: Stat[];
  context?: string;
};

const READINGS: Reading[] = [
  {
    id: "weather",
    prompt: "weather in redmond",
    lead: "Overcast and 61° in Redmond, with light rain likely this evening.",
    value: "61",
    unit: "°F",
    caption: "Overcast clouds · feels like 61°",
    tone: "rain",
    stats: [
      {
        label: "Today",
        value: "58° – 63°",
        note: "Near the high now",
        viz: { kind: "range", lo: 58, hi: 63, at: 61 },
      },
      {
        label: "Rain",
        value: "100%",
        note: "Light rain by 5 PM",
        viz: { kind: "meter", pct: 100 },
      },
      {
        label: "Wind",
        value: "3 mph SW",
        note: "Up to 7 mph tonight",
        viz: { kind: "bearing", deg: 235 },
      },
      {
        label: "Humidity",
        value: "91%",
        note: "Pressure 1013 hPa",
        viz: { kind: "meter", pct: 91 },
      },
    ],
    context: "Next 15 hours",
  },
  {
    id: "stock",
    prompt: "msft stock",
    lead: "Microsoft closed at $508.96, flat on the day and up 38% in three months.",
    value: "$508.96",
    caption: "−$0.26 (−0.05%) today",
    captionTone: "down",
    tone: "up",
    stats: [
      { label: "3 months", value: "+38.1%", tone: "up" },
      {
        label: "3-month range",
        value: "$368.57 – $516.17",
        note: "1.4% below the high",
        viz: { kind: "range", lo: 368.57, hi: 516.17, at: 508.96 },
      },
      { label: "Prev close", value: "$509.22" },
    ],
    context: "Daily close, Jun 29 – Sep 29",
  },
  {
    id: "time",
    prompt: "what time is it in tokyo",
    lead: "It is 6:40 in the morning in Tokyo, 16 hours ahead of Seattle.",
    value: "6:40",
    unit: "AM",
    caption: "Wednesday, Sep 30 · JST",
    tone: "time",
    stats: [
      { label: "Seattle", value: "2:40 PM Tue" },
      { label: "Difference", value: "+16 h" },
      { label: "Tokyo sunrise", value: "5:36 AM" },
    ],
    context: "Where each city is in its day",
  },
  {
    id: "split",
    prompt: "split $120 dinner four ways with 20% tip",
    lead: "Each of the four pays $36, with the 20% tip included.",
    value: "$36.00",
    caption: "each, tip included",
    tone: "compute",
    stats: [
      { label: "Bill", value: "$120.00" },
      { label: "Tip · 20%", value: "$24.00" },
      { label: "Total", value: "$144.00" },
      { label: "People", value: "4" },
    ],
    context: "$30 of food and $6 of tip per person",
  },
];

/** Palette pairs: a strong tint for panels and ink for icons and marks. */
const TONES: Record<Tone, { tint: string; ink: string }> = {
  rain: {
    tint: tokens.colorPaletteBlueBackground2,
    ink: tokens.colorPaletteBlueForeground2,
  },
  up: {
    tint: tokens.colorPaletteGreenBackground2,
    ink: tokens.colorPaletteGreenForeground2,
  },
  time: {
    tint: tokens.colorPaletteLavenderBackground2,
    ink: tokens.colorPaletteLavenderForeground2,
  },
  compute: {
    tint: tokens.colorPaletteTealBackground2,
    ink: tokens.colorPaletteTealForeground2,
  },
};

/** A quiet wash of the tone over the card surface, for full-bleed regions. */
const wash = (tone: Tone) =>
  `color-mix(in srgb, ${TONES[tone].ink} 9%, ${tokens.colorNeutralBackground1})`;

const useStyles = makeStyles({
  page: {
    minHeight: "100vh",
    backgroundColor: tokens.colorNeutralBackground2,
    padding: "48px 24px 96px",
    display: "grid",
    alignContent: "start",
    justifyItems: "center",
    rowGap: "40px",
  },
  intro: { width: "min(760px, 100%)", display: "grid", rowGap: "12px" },
  introText: { color: tokens.colorNeutralForeground2, maxWidth: "62ch" },
  tabs: { display: "flex", flexWrap: "wrap", columnGap: "24px", rowGap: "4px" },
  variant: { width: "min(760px, 100%)", display: "grid", rowGap: "12px" },
  variantLabel: {
    display: "flex",
    alignItems: "baseline",
    columnGap: "10px",
    flexWrap: "wrap",
  },
  variantLetter: {
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorBrandForeground1,
  },
  muted: { color: tokens.colorNeutralForeground3 },
  card: { padding: "24px", rowGap: "20px" },
  flush: { padding: 0, rowGap: 0, overflow: "hidden" },
  lead: { margin: 0, textWrap: "pretty" },

  // Illustration: drawn per reading, in the tone, alive but quiet.
  art: {
    width: "96px",
    height: "96px",
    overflow: "visible",
    "@media (max-width: 480px)": { width: "72px", height: "72px" },
  },
  grow: {
    transformBox: "fill-box",
    transformOrigin: "50% 100%",
    "@media (prefers-reduced-motion: no-preference)": {
      animationName: {
        from: { transform: "scaleY(0)" },
        to: { transform: "scaleY(1)" },
      },
      animationDuration: "700ms",
      animationTimingFunction: tokens.curveDecelerateMid,
      animationFillMode: "both",
    },
  },
  growX: {
    transformOrigin: "0 50%",
    "@media (prefers-reduced-motion: no-preference)": {
      animationName: {
        from: { transform: "scaleX(0)" },
        to: { transform: "scaleX(1)" },
      },
      animationDuration: "600ms",
      animationTimingFunction: tokens.curveDecelerateMid,
      animationFillMode: "both",
    },
  },
  draw: {
    strokeDasharray: "1",
    "@media (prefers-reduced-motion: no-preference)": {
      animationName: {
        from: { strokeDashoffset: "1" },
        to: { strokeDashoffset: "0" },
      },
      animationDuration: "1100ms",
      animationTimingFunction: tokens.curveDecelerateMid,
      animationFillMode: "both",
    },
  },
  fade: {
    "@media (prefers-reduced-motion: no-preference)": {
      animationName: { from: { opacity: 0 }, to: { opacity: 1 } },
      animationDuration: "600ms",
      animationDelay: "400ms",
      animationFillMode: "both",
    },
  },
  rise: {
    "@media (prefers-reduced-motion: no-preference)": {
      animationName: {
        from: { transform: "translateY(10px)", opacity: 0 },
        to: { transform: "translateY(0)", opacity: 1 },
      },
      animationDuration: "1200ms",
      animationTimingFunction: tokens.curveDecelerateMid,
      animationFillMode: "both",
    },
  },
  explode: {
    transform: "translate(var(--dx), var(--dy))",
    "@media (prefers-reduced-motion: no-preference)": {
      animationName: {
        from: { transform: "translate(0, 0)" },
        to: { transform: "translate(var(--dx), var(--dy))" },
      },
      animationDuration: "700ms",
      animationDelay: "250ms",
      animationTimingFunction: tokens.curveDecelerateMid,
      animationFillMode: "both",
    },
  },
  plot: { position: "relative" },
  reveal: {
    "@media (prefers-reduced-motion: no-preference)": {
      animationName: {
        from: { clipPath: "inset(-8px 100% -8px 0)" },
        to: { clipPath: "inset(-8px 0 -8px 0)" },
      },
      animationDuration: "1100ms",
      animationTimingFunction: tokens.curveDecelerateMid,
      animationFillMode: "both",
    },
  },
  dot: {
    position: "absolute",
    width: "10px",
    height: "10px",
    margin: "-5px 0 0 -5px",
    borderRadius: tokens.borderRadiusCircular,
    boxShadow: `0 0 0 2px ${tokens.colorNeutralBackground1}`,
  },

  figure: { display: "grid", rowGap: "4px", minWidth: 0 },
  value: {
    display: "flex",
    alignItems: "baseline",
    columnGap: "4px",
    fontSize: tokens.fontSizeHero900,
    lineHeight: tokens.lineHeightHero900,
    fontWeight: tokens.fontWeightSemibold,
    fontVariantNumeric: "tabular-nums",
    letterSpacing: "-0.02em",
    color: tokens.colorNeutralForeground1,
    "@media (max-width: 480px)": {
      fontSize: tokens.fontSizeHero800,
      lineHeight: tokens.lineHeightHero800,
    },
  },
  unit: {
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightRegular,
    color: tokens.colorNeutralForeground3,
    letterSpacing: 0,
  },
  caption: { color: tokens.colorNeutralForeground2 },
  up: { color: tokens.colorPaletteGreenForeground1 },
  down: { color: tokens.colorPaletteRedForeground1 },

  // Stats: one even row that wraps, never a separate column.
  stats: {
    margin: 0,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(128px, 1fr))",
    columnGap: "16px",
    rowGap: "12px",
  },
  stat: {
    display: "grid",
    rowGap: "2px",
    minWidth: 0,
    alignContent: "start",
  },
  statBody: {
    margin: 0,
    display: "grid",
    justifyItems: "start",
    rowGap: "2px",
  },
  statValue: {
    fontVariantNumeric: "tabular-nums",
    display: "inline-flex",
    alignItems: "center",
    columnGap: "6px",
  },
  shape: {
    justifySelf: "stretch",
    position: "relative",
    height: "6px",
    maxWidth: "160px",
    marginTop: "6px",
    marginBottom: "2px",
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorNeutralBackground5,
  },
  fill: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: "inherit",
  },
  mark: {
    position: "absolute",
    top: "50%",
    width: "12px",
    height: "12px",
    margin: "-6px 0 0 -6px",
    borderRadius: tokens.borderRadiusCircular,
    boxShadow: `0 0 0 2px ${tokens.colorNeutralBackground1}`,
  },

  // Illustration, number, and context share one row; context drops below on phones.
  answer: {
    display: "grid",
    gridTemplateColumns: "auto minmax(140px, auto) minmax(0, 1fr)",
    columnGap: "24px",
    rowGap: "16px",
    alignItems: "center",
    "@media (max-width: 640px)": {
      gridTemplateColumns: "auto minmax(0, 1fr)",
      columnGap: "16px",
    },
  },
  wide: { "@media (max-width: 640px)": { gridColumn: "1 / -1" } },
  context: { display: "grid", rowGap: "6px", minWidth: 0 },

  // B2 · Header: a tinted head, a plain body.
  top: { padding: "24px", display: "grid", rowGap: "20px" },
  bottom: { padding: "20px 24px 24px", display: "grid", rowGap: "20px" },

  // B3 · Panel: the lead on the card, the reading in a tinted panel.
  panel: {
    padding: "20px",
    borderRadius: tokens.borderRadiusXLarge,
    display: "grid",
    rowGap: "16px",
  },

  // Context visuals.
  svg: { display: "block", width: "100%", height: "64px", overflow: "visible" },
  ticks: { position: "relative", height: "16px" },
  tick: {
    position: "absolute",
    top: 0,
    whiteSpace: "nowrap",
    color: tokens.colorNeutralForeground3,
  },
  legend: {
    display: "flex",
    flexWrap: "wrap",
    columnGap: "12px",
    rowGap: "4px",
    alignItems: "center",
    color: tokens.colorNeutralForeground3,
  },
  swatch: {
    display: "inline-block",
    width: "10px",
    height: "10px",
    borderRadius: tokens.borderRadiusSmall,
    marginRight: "6px",
    verticalAlign: "-1px",
  },
  tracks: { display: "grid", rowGap: "10px" },
  track: {
    display: "grid",
    gridTemplateColumns: "56px minmax(0, 1fr)",
    columnGap: "12px",
    alignItems: "center",
  },
  bar: {
    position: "relative",
    height: "12px",
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground5,
  },
  day: {
    position: "absolute",
    top: 0,
    bottom: 0,
    borderRadius: tokens.borderRadiusSmall,
  },
  now: {
    position: "absolute",
    top: "-4px",
    bottom: "-4px",
    width: "3px",
    marginLeft: "-1.5px",
    borderRadius: tokens.borderRadiusSmall,
    backgroundColor: tokens.colorNeutralForeground1,
  },
  split: { display: "flex", columnGap: "4px", height: "28px" },
  share: {
    flexGrow: 1,
    display: "flex",
    borderRadius: tokens.borderRadiusMedium,
    overflow: "hidden",
  },
});

type Mode = "complete" | "streaming" | "partial";

/** Partial drops what a thin API response usually lacks: caption, stats, context. */
const view = (r: Reading, mode: Mode): Reading =>
  mode === "partial"
    ? { ...r, caption: undefined, stats: [], context: undefined }
    : r;

/** OpenWeather forecast steps are three hours apart. */
const HOURS = [61, 61, 59, 58, 53];
const RAIN = [100, 55, 28, 0, 0];

function Ticks({ marks }: { marks: [number, string][] }) {
  const styles = useStyles();
  return (
    <div className={styles.ticks} aria-hidden>
      {marks.map(([at, label], i) => (
        <Caption1
          key={i}
          className={styles.tick}
          style={{
            left: `${at * 100}%`,
            transform: `translateX(-${at * 100}%)`,
          }}
        >
          {label}
        </Caption1>
      ))}
    </div>
  );
}

function Forecast({ ink }: { ink: string }) {
  const styles = useStyles();
  const w = 240;
  const slot = w / HOURS.length;
  const x = (i: number) => slot * i + slot / 2;
  const y = (t: number) => 6 + ((62 - t) / 10) * 24;
  const line = HOURS.map((t, i) => `${i ? "L" : "M"}${x(i)},${y(t)}`).join("");
  return (
    <>
      <div className={styles.plot}>
        <svg
          className={mergeClasses(styles.svg, styles.reveal)}
          viewBox={`0 0 ${w} 64`}
          preserveAspectRatio="none"
          role="img"
          aria-label="Temperature falls from 61° at 5 PM to 53° by 5 AM; chance of rain falls from 100% to 0% after midnight."
        >
          {RAIN.map((p, i) => (
            <rect
              key={i}
              x={slot * i + 2}
              y={64 - Math.max((p / 100) * 40, 1.5)}
              width={slot - 4}
              height={Math.max((p / 100) * 40, 1.5)}
              rx={1.5}
              fill={ink}
              opacity={0.28}
              className={styles.grow}
              style={{ animationDelay: `${i * 45}ms` }}
            />
          ))}
          <path
            d={line}
            fill="none"
            stroke={ink}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <span
          className={styles.dot}
          style={{
            left: `${(x(0) / w) * 100}%`,
            top: `${(y(HOURS[0]) / 64) * 100}%`,
            backgroundColor: ink,
          }}
        />
      </div>
      <Ticks
        marks={[
          [0.1, "5 PM"],
          [0.5, "11 PM"],
          [0.9, "5 AM"],
        ]}
      />
      <div className={styles.legend}>
        <Caption1>
          <span className={styles.swatch} style={{ backgroundColor: ink }} />
          Temperature, 61° to 53°
        </Caption1>
        <Caption1>
          <span
            className={styles.swatch}
            style={{ backgroundColor: ink, opacity: 0.28 }}
          />
          Chance of rain
        </Caption1>
      </div>
    </>
  );
}

function Trend({ ink }: { ink: string }) {
  const styles = useStyles();
  const w = 240;
  const lo = Math.min(...MSFT_CLOSE);
  const hi = Math.max(...MSFT_CLOSE);
  const x = (i: number) => (i / (MSFT_CLOSE.length - 1)) * w;
  const y = (v: number) => 4 + ((hi - v) / (hi - lo)) * 56;
  const line = MSFT_CLOSE.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(
    "",
  );
  const last = MSFT_CLOSE[MSFT_CLOSE.length - 1];
  return (
    <>
      <div className={styles.plot}>
        <svg
          className={mergeClasses(styles.svg, styles.reveal)}
          viewBox={`0 0 ${w} 64`}
          preserveAspectRatio="none"
          role="img"
          aria-label="Microsoft rose from $368.57 on Jun 29 to $508.96 on Sep 29, with a jump on Jul 30."
        >
          <path
            d={`${line}L${w},64L0,64Z`}
            fill={ink}
            fillOpacity={0.12}
            className={styles.fade}
          />
          <path
            d={line}
            fill="none"
            stroke={ink}
            strokeWidth={2}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <span
          className={mergeClasses(styles.dot, styles.fade)}
          style={{
            left: "100%",
            top: `${(y(last) / 64) * 100}%`,
            backgroundColor: ink,
            animationDelay: "1000ms",
          }}
        />
      </div>
      <Ticks
        marks={[
          [0, "Jun 29 · $368.57"],
          [1, "Sep 29 · $508.96"],
        ]}
      />
    </>
  );
}

const CITIES = [
  {
    city: "Seattle",
    label: "2:40 PM, daylight 7:04 AM to 6:52 PM",
    now: 14 + 40 / 60,
    rise: 7 + 4 / 60,
    set: 18 + 52 / 60,
  },
  {
    city: "Tokyo",
    label: "6:40 AM, daylight 5:36 AM to 5:32 PM",
    now: 6 + 40 / 60,
    rise: 5 + 36 / 60,
    set: 17 + 32 / 60,
  },
];

function Day({ tint }: { tint: string }) {
  const styles = useStyles();
  const pct = (h: number) => `${(h / 24) * 100}%`;
  return (
    <div className={styles.tracks}>
      {CITIES.map((c) => (
        <div key={c.city} className={styles.track}>
          <Caption1 className={styles.muted}>{c.city}</Caption1>
          <div
            className={styles.bar}
            role="img"
            aria-label={`${c.city}: ${c.label}`}
          >
            <span
              className={mergeClasses(styles.day, styles.growX)}
              style={{
                left: pct(c.rise),
                width: pct(c.set - c.rise),
                backgroundColor: tint,
              }}
            />
            <span
              className={styles.dot}
              style={{
                left: pct(c.now),
                top: "50%",
                backgroundColor: tokens.colorNeutralForeground1,
              }}
            />
          </div>
        </div>
      ))}
      <div className={styles.track}>
        <span />
        <Ticks
          marks={[
            [0, "12 AM"],
            [0.25, "6"],
            [0.5, "12 PM"],
            [0.75, "6"],
            [1, "12 AM"],
          ]}
        />
      </div>
    </div>
  );
}

function Split({ ink }: { ink: string }) {
  const styles = useStyles();
  return (
    <>
      <div
        className={styles.split}
        role="img"
        aria-label="Four equal shares of $36: $30 of food and $6 of tip each."
      >
        {[0, 1, 2, 3].map((n) => (
          <span
            key={n}
            className={mergeClasses(styles.share, styles.growX)}
            style={{ animationDelay: `${n * 110}ms` }}
          >
            <span
              style={{ flexGrow: 30, backgroundColor: ink, opacity: 0.85 }}
            />
            <span
              style={{ flexGrow: 6, backgroundColor: ink, opacity: 0.35 }}
            />
          </span>
        ))}
      </div>
      <div className={styles.legend}>
        <Caption1>
          <span
            className={styles.swatch}
            style={{ backgroundColor: ink, opacity: 0.85 }}
          />
          Food $30
        </Caption1>
        <Caption1>
          <span
            className={styles.swatch}
            style={{ backgroundColor: ink, opacity: 0.35 }}
          />
          Tip $6
        </Caption1>
      </div>
    </>
  );
}

/** Point on a circle, clockwise from 12 o'clock. */
const at = (cx: number, cy: number, r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.sin(a), cy - r * Math.cos(a)] as const;
};
const wedge = (from: number, to: number) => {
  const [x0, y0] = at(48, 50, 30, from);
  const [x1, y1] = at(48, 50, 30, to);
  return `M48,50L${x0},${y0}A30,30 0 0 1 ${x1},${y1}Z`;
};

function Art({ r }: { r: Reading }) {
  const styles = useStyles();
  const { tint, ink } = TONES[r.tone];
  const line = {
    fill: "none",
    stroke: ink,
    strokeWidth: 3,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <svg className={styles.art} viewBox="0 0 96 96" aria-hidden>
      {r.id === "weather" ? (
        <>
          <g>
            <path
              d="M30 62h38a15 15 0 0 0 2-29.9A21 21 0 0 0 30 29a16.5 16.5 0 0 0 0 33z"
              {...line}
              fill={tint}
              strokeWidth={2.5}
            />
          </g>
          {[
            [36, 0],
            [48, 350],
            [60, 700],
            [42, 1050],
            [54, 1400],
          ].map(([x, d]) => (
            <line
              key={d}
              x1={x}
              y1={70}
              x2={x - 2}
              y2={78}
              {...line}
              strokeWidth={2.5}
            />
          ))}
        </>
      ) : null}
      {r.id === "stock" ? (
        <>
          <line
            x1={14}
            y1={80}
            x2={82}
            y2={80}
            {...line}
            strokeWidth={2}
            opacity={0.35}
          />
          {[
            [20, 20],
            [38, 32],
            [56, 46],
          ].map(([x, h], i) => (
            <rect
              key={x}
              x={x}
              y={76 - h}
              width={14}
              height={h}
              rx={3}
              fill={tint}
              className={styles.grow}
              style={{ animationDelay: `${i * 120}ms` }}
            />
          ))}
          <path
            d="M14 60 32 44 46 50 78 18"
            pathLength={1}
            className={styles.draw}
            style={{ animationDelay: "300ms" }}
            {...line}
          />
          <path
            d="M64 18h14v14"
            pathLength={1}
            className={styles.draw}
            style={{ animationDelay: "1100ms" }}
            {...line}
          />
        </>
      ) : null}
      {r.id === "time" ? (
        <>
          <g className={styles.rise}>
            <circle
              cx={78}
              cy={20}
              r={8}
              fill={tint}
              stroke={ink}
              strokeWidth={2}
            />
            {[0, 60, 120, 240, 300].map((d) => {
              const [x0, y0] = at(78, 20, 12, d);
              const [x1, y1] = at(78, 20, 16, d);
              return (
                <line
                  key={d}
                  x1={x0}
                  y1={y0}
                  x2={x1}
                  y2={y1}
                  {...line}
                  strokeWidth={2}
                />
              );
            })}
          </g>
          <circle
            cx={48}
            cy={52}
            r={30}
            fill={tokens.colorNeutralBackground1}
            stroke={ink}
            strokeWidth={2.5}
          />
          {Array.from({ length: 12 }, (_, i) => {
            const [x0, y0] = at(48, 52, i % 3 ? 26 : 23, i * 30);
            const [x1, y1] = at(48, 52, 28, i * 30);
            return (
              <line
                key={i}
                x1={x0}
                y1={y0}
                x2={x1}
                y2={y1}
                stroke={ink}
                strokeWidth={i % 3 ? 1.25 : 2}
                strokeLinecap="round"
                opacity={i % 3 ? 0.5 : 1}
              />
            );
          })}
          <line
            x1={48}
            y1={52}
            x2={48}
            y2={37}
            {...line}
            transform="rotate(200 48 52)"
          />
          <line
            x1={48}
            y1={52}
            x2={48}
            y2={30}
            {...line}
            strokeWidth={2.25}
            transform="rotate(240 48 52)"
          />
          <g>
            <line
              x1={48}
              y1={56}
              x2={48}
              y2={28}
              stroke={ink}
              strokeWidth={1.25}
              strokeLinecap="round"
              opacity={0.7}
            />
          </g>
          <circle cx={48} cy={52} r={2.5} fill={ink} />
        </>
      ) : null}
      {r.id === "split" ? (
        <>
          {[0, 1, 2, 3].map((q) => {
            const [dx, dy] = at(0, 0, 3, q * 90 + 45);
            return (
              <g
                key={q}
                className={styles.explode}
                style={
                  { "--dx": `${dx}px`, "--dy": `${dy}px` } as CSSProperties
                }
              >
                <path
                  d={wedge(q * 90, q * 90 + 75)}
                  fill={ink}
                  opacity={0.85}
                />
                <path
                  d={wedge(q * 90 + 75, q * 90 + 90)}
                  fill={ink}
                  opacity={0.35}
                />
              </g>
            );
          })}
        </>
      ) : null}
    </svg>
  );
}

function Context({ r, mode }: { r: Reading; mode: Mode }) {
  const styles = useStyles();
  if (mode === "streaming")
    return (
      <Skeleton aria-label="Loading context">
        <SkeletonItem style={{ width: "100%", height: "64px" }} />
      </Skeleton>
    );
  if (!r.context) return null;
  const { tint, ink } = TONES[r.tone];
  return (
    <div className={styles.context}>
      <Caption1 className={styles.muted}>{r.context}</Caption1>
      {r.id === "weather" ? <Forecast ink={ink} /> : null}
      {r.id === "stock" ? <Trend ink={ink} /> : null}
      {r.id === "time" ? <Day tint={tint} /> : null}
      {r.id === "split" ? <Split ink={ink} /> : null}
    </div>
  );
}

function Value({ r, mode }: { r: Reading; mode: Mode }) {
  const styles = useStyles();
  if (mode === "streaming")
    return (
      <Skeleton aria-label="Loading value">
        <SkeletonItem style={{ width: "160px", height: "48px" }} />
        <SkeletonItem size={12} style={{ width: "140px", marginTop: "8px" }} />
      </Skeleton>
    );
  return (
    <div className={styles.figure}>
      <span className={styles.value}>
        {r.value}
        {r.unit ? <span className={styles.unit}>{r.unit}</span> : null}
      </span>
      {r.caption ? (
        <Body1
          className={mergeClasses(
            styles.caption,
            r.captionTone && styles[r.captionTone],
          )}
        >
          {r.caption}
        </Body1>
      ) : null}
    </div>
  );
}

function Lead({ r, mode }: { r: Reading; mode: Mode }) {
  const styles = useStyles();
  return (
    <Title3 as="p" className={styles.lead}>
      {mode === "streaming"
        ? r.lead.split(" ").slice(0, 6).join(" ") + "…"
        : r.lead}
    </Title3>
  );
}

function Shape({ viz, ink }: { viz: Viz; ink: string }) {
  const styles = useStyles();
  if (viz.kind === "bearing") return null;
  if (viz.kind === "meter")
    return (
      <div className={styles.shape} aria-hidden>
        <span
          className={styles.fill}
          style={{ width: `${viz.pct}%`, backgroundColor: ink }}
        />
      </div>
    );
  const at = ((viz.at - viz.lo) / (viz.hi - viz.lo)) * 100;
  return (
    <div className={styles.shape} aria-hidden>
      <span
        className={styles.fill}
        style={{ right: 0, backgroundColor: ink, opacity: 0.3 }}
      />
      <span
        className={styles.mark}
        style={{ left: `${at}%`, backgroundColor: ink }}
      />
    </div>
  );
}

/** Wind arrow: points where the wind blows to, from the bearing it comes from. */
function Bearing({ deg, ink }: { deg: number; ink: string }) {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" aria-hidden>
      <g transform={`rotate(${(deg + 180) % 360} 8 8)`}>
        <path
          d="M8 2v12M4 6l4-4 4 4"
          fill="none"
          stroke={ink}
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

function Stats({ r, mode }: { r: Reading; mode: Mode }) {
  const styles = useStyles();
  if (mode !== "complete" || !r.stats.length) return null;
  const { ink } = TONES[r.tone];
  return (
    <dl className={styles.stats}>
      {r.stats.map((s) => (
        <div key={s.label} className={styles.stat}>
          <dt>
            <Caption1 className={styles.muted}>{s.label}</Caption1>
          </dt>
          <dd className={styles.statBody}>
            <Text
              weight="semibold"
              className={mergeClasses(
                styles.statValue,
                s.tone && styles[s.tone],
              )}
            >
              {s.viz?.kind === "bearing" ? (
                <Bearing deg={s.viz.deg} ink={ink} />
              ) : null}
              {s.value}
            </Text>
            {s.viz ? <Shape viz={s.viz} ink={ink} /> : null}
            {s.note ? (
              <Caption1 className={styles.muted}>{s.note}</Caption1>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Answer({ r, mode }: { r: Reading; mode: Mode }) {
  const styles = useStyles();
  return (
    <div className={styles.answer}>
      <Art r={r} />
      <Value r={r} mode={mode} />
      <div className={styles.wide}>
        <Context r={r} mode={mode} />
      </div>
    </div>
  );
}

function Header({ r, mode }: { r: Reading; mode: Mode }) {
  const styles = useStyles();
  const hasBody = mode === "complete" && r.stats.length > 0;
  return (
    <Card className={mergeClasses(styles.card, styles.flush)}>
      <div className={styles.top} style={{ backgroundColor: wash(r.tone) }}>
        <Lead r={r} mode={mode} />
        <Answer r={r} mode={mode} />
      </div>
      {hasBody ? (
        <div className={styles.bottom}>
          <Stats r={r} mode={mode} />
        </div>
      ) : null}
    </Card>
  );
}

function Panel({ r, mode }: { r: Reading; mode: Mode }) {
  const styles = useStyles();
  return (
    <Card className={styles.card}>
      <Lead r={r} mode={mode} />
      <div className={styles.panel} style={{ backgroundColor: wash(r.tone) }}>
        <Answer r={r} mode={mode} />
      </div>
      <Stats r={r} mode={mode} />
    </Card>
  );
}

const VARIANTS = [
  {
    letter: "B2",
    name: "Header",
    note: "The tone holds the answer; the facts sit on plain paper below.",
    View: Header,
  },
  {
    letter: "B3",
    name: "Panel",
    note: "The lead stays on paper; the answer lives in one tinted panel.",
    View: Panel,
  },
];

function Lab() {
  const styles = useStyles();
  const [mode, setMode] = useState<Mode>("complete");
  const [id, setId] = useState(READINGS[0].id);
  const reading = view(READINGS.find((r) => r.id === id)!, mode);
  return (
    <main className={styles.page}>
      <header className={styles.intro}>
        <Title3 as="h1">Hero · round 3</Title3>
        <Body1 className={styles.introText}>
          B2 and B3 with drawn illustrations. Stats now take a shape only where
          the data has one: today&apos;s range with where we are in it, rain and
          humidity as a share, wind with its bearing.
        </Body1>
        <div className={styles.tabs}>
          <TabList
            selectedValue={id}
            onTabSelect={(_, d) => setId(d.value as string)}
            aria-label="Reading"
          >
            {READINGS.map((r) => (
              <Tab key={r.id} value={r.id}>
                {r.id[0].toUpperCase() + r.id.slice(1)}
              </Tab>
            ))}
          </TabList>
          <TabList
            selectedValue={mode}
            onTabSelect={(_, d) => setMode(d.value as Mode)}
            aria-label="Card state"
          >
            <Tab value="complete">Complete</Tab>
            <Tab value="streaming">Streaming</Tab>
            <Tab value="partial">Partial</Tab>
          </TabList>
        </div>
        <Caption1 className={styles.muted}>“{reading.prompt}”</Caption1>
      </header>
      {VARIANTS.map(({ letter, name, note, View }) => (
        <section key={letter} className={styles.variant} aria-label={name}>
          <div className={styles.variantLabel}>
            <Text size={500} className={styles.variantLetter}>
              {letter}
            </Text>
            <Text size={500} weight="semibold">
              {name}
            </Text>
            <Caption1 className={styles.muted}>{note}</Caption1>
          </div>
          <View key={`${id}-${mode}`} r={reading} mode={mode} />
        </section>
      ))}
    </main>
  );
}

export default function HeroLabPage() {
  return (
    <FluentRoot>
      <Lab />
    </FluentRoot>
  );
}
