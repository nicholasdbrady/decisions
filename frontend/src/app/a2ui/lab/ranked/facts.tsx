"use client";

import { type ComponentType, type CSSProperties, useState } from "react";
import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  Caption1,
  Card,
  makeStyles,
  mergeClasses,
  Skeleton,
  SkeletonItem,
  Text,
  Title3,
  tokens,
} from "@fluentui/react-components";
import {
  CalendarLtr20Regular,
  Clock20Regular,
  DataArea20Regular,
  DataTrending20Regular,
  DataTrending48Regular,
  Drop20Regular,
  Flag20Regular,
  Gauge20Regular,
  Money20Regular,
  People20Regular,
  Receipt20Regular,
  Receipt48Regular,
  Temperature20Regular,
  Wallet20Regular,
  Wallet48Regular,
  WeatherCloudy48Regular,
  WeatherDrizzle20Regular,
  WeatherDrizzle48Regular,
  WeatherMoon20Regular,
  WeatherSunny20Regular,
} from "@fluentui/react-icons";

/**
 * Answer-first Facts. One data set can answer several questions, so the card
 * features the fact that answers this one and ranks the rest by relevance. In
 * the product JEV picks `featured` and `order`; here both are fixtures.
 * Weather comes from our OpenWeather provider (Redmond, Sep 29, 2026, 3:49 PM
 * PDT), the stock from Yahoo Finance, and the split is computed.
 */

export type Tone = "up" | "time" | "compute" | "rain";
export type FactsMode = "complete" | "streaming" | "collapsed";

export const TONES: Record<Tone, { tint: string; ink: string }> = {
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

export const wash = (tone: Tone, pct = 9) =>
  `color-mix(in srgb, ${TONES[tone].ink} ${pct}%, ${tokens.colorNeutralBackground1})`;

type Icon = ComponentType<{
  className?: string;
  style?: CSSProperties;
  "aria-hidden"?: boolean;
}>;

/** A shape only where the data has one. `ends` label the scale in the feature. */
type Viz =
  | {
      kind: "range";
      lo: number;
      hi: number;
      at: number;
      ends: [string, string];
    }
  | { kind: "meter"; pct: number }
  | { kind: "gap"; lo: number; hi: number; from: number; to: number }
  | {
      kind: "day";
      rise: number;
      set: number;
      now: number;
      ends: [string, string];
    }
  | { kind: "parts"; parts: number[]; labels: string[] }
  | { kind: "slots"; values: number[]; labels: string[] };

type Fact = {
  id: string;
  label: string;
  value: string;
  unit?: string;
  note?: string;
  noteTone?: "up" | "down";
  viz?: Viz;
  icon?: Icon;
  /** A larger drawing for when this fact is featured. */
  hero?: Icon;
  bearing?: number;
};

type Intent = {
  prompt: string;
  lead: string;
  featured: string;
  order: string[];
};

export type FactsReading = {
  id: string;
  name: string;
  title: string;
  tone: Tone;
  facts: Fact[];
  intents: Intent[];
};

const WEEK52 = { lo: 349.2, hi: 553.72 };
const RISE = 7 + 4 / 60;
const SET = 18 + 52 / 60;

export const FACTS: FactsReading[] = [
  {
    id: "weather",
    name: "Weather",
    title: "More readings",
    tone: "rain",
    facts: [
      {
        id: "temp",
        label: "Temperature",
        value: "61",
        unit: "°F",
        note: "Overcast · feels like 61°",
        viz: { kind: "range", lo: 58, hi: 63, at: 61, ends: ["58°", "63°"] },
        icon: Temperature20Regular,
        hero: WeatherCloudy48Regular,
      },
      {
        id: "rain",
        label: "Chance of rain",
        value: "100",
        unit: "%",
        note: "Light rain until about 11 PM, dry after midnight",
        viz: {
          kind: "slots",
          values: [100, 55, 28, 0, 0],
          labels: ["5 PM", "8 PM", "11 PM", "2 AM", "5 AM"],
        },
        icon: WeatherDrizzle20Regular,
        hero: WeatherDrizzle48Regular,
      },
      {
        id: "wind",
        label: "Wind",
        value: "3 mph SW",
        note: "Up to 7 mph tonight",
        bearing: 235,
      },
      {
        id: "humidity",
        label: "Humidity",
        value: "91%",
        note: "Very humid",
        viz: { kind: "meter", pct: 91 },
        icon: Drop20Regular,
      },
      {
        id: "daylight",
        label: "Daylight",
        value: "11 h 48 m",
        note: "Sunset in 3 h 3 m",
        viz: {
          kind: "day",
          rise: RISE,
          set: SET,
          now: 15 + 49 / 60,
          ends: ["7:04 AM", "6:52 PM"],
        },
        icon: WeatherSunny20Regular,
      },
      {
        id: "tomorrow",
        label: "Tomorrow",
        value: "53° – 64°",
        note: "Broken clouds, no rain",
        icon: CalendarLtr20Regular,
      },
      {
        id: "pressure",
        label: "Pressure",
        value: "1013 hPa",
        note: "Standard sea-level pressure",
        icon: Gauge20Regular,
      },
    ],
    intents: [
      {
        prompt: "weather in redmond",
        lead: "61° and overcast in Redmond, with light rain until about 11 PM.",
        featured: "temp",
        order: ["rain", "wind", "humidity", "daylight", "tomorrow", "pressure"],
      },
      {
        prompt: "do i need an umbrella tonight",
        lead: "Yes, until about 11 PM. Light rain is likely, then it dries out.",
        featured: "rain",
        order: ["tomorrow", "temp", "wind", "humidity", "daylight", "pressure"],
      },
    ],
  },
  {
    id: "stock",
    name: "Stock",
    title: "Closing detail",
    tone: "up",
    facts: [
      {
        id: "close",
        label: "Close",
        value: "$508.96",
        note: "−$0.26 (−0.05%) today",
        noteTone: "down",
        viz: {
          kind: "range",
          lo: 502.4,
          hi: 513.64,
          at: 508.96,
          ends: ["Low $502.40", "High $513.64"],
        },
        icon: DataTrending20Regular,
        hero: DataTrending48Regular,
      },
      {
        id: "week52",
        label: "52-week range",
        value: "8% below the high",
        note: "$349.20 to $553.72",
        viz: {
          kind: "range",
          ...WEEK52,
          at: 508.96,
          ends: ["$349.20", "$553.72"],
        },
        icon: Flag20Regular,
        hero: DataTrending48Regular,
      },
      {
        id: "d50",
        label: "50-day average",
        value: "$478.12",
        note: "Close is 6.5% above it",
        viz: { kind: "gap", ...WEEK52, from: 478.12, to: 508.96 },
        icon: DataArea20Regular,
      },
      {
        id: "d200",
        label: "200-day average",
        value: "$432.15",
        note: "Close is 17.8% above it",
        viz: { kind: "gap", ...WEEK52, from: 432.15, to: 508.96 },
        icon: DataArea20Regular,
      },
      {
        id: "volume",
        label: "Volume",
        value: "20.02M",
        icon: DataTrending20Regular,
      },
      { id: "cap", label: "Market cap", value: "$3.78T", icon: Money20Regular },
      {
        id: "open",
        label: "Open",
        value: "$508.13",
        note: "$1.09 below the previous close",
        icon: Clock20Regular,
      },
      {
        id: "prev",
        label: "Previous close",
        value: "$509.22",
        icon: Clock20Regular,
      },
    ],
    intents: [
      {
        prompt: "msft stock",
        lead: "Microsoft closed at $508.96, down $0.26 on the day.",
        featured: "close",
        order: ["week52", "d50", "volume", "cap", "open", "prev", "d200"],
      },
      {
        prompt: "is msft near its 52-week high",
        lead: "Close, but not at it: $508.96 is 8% below the high of $553.72.",
        featured: "week52",
        order: ["close", "d50", "d200", "cap", "volume", "open", "prev"],
      },
    ],
  },
  {
    id: "split",
    name: "Split",
    title: "Breakdown",
    tone: "compute",
    facts: [
      {
        id: "each",
        label: "Each pays",
        value: "$36.00",
        note: "$30 of food and $6 of tip",
        viz: { kind: "parts", parts: [30, 6], labels: ["Food $30", "Tip $6"] },
        icon: Wallet20Regular,
        hero: Wallet48Regular,
      },
      {
        id: "tip",
        label: "Tip",
        value: "$24.00",
        note: "20% of $120",
        viz: { kind: "meter", pct: 20 },
        icon: Receipt20Regular,
        hero: Receipt48Regular,
      },
      {
        id: "total",
        label: "Total",
        value: "$144.00",
        note: "Food $120 and tip $24",
        viz: { kind: "parts", parts: [120, 24], labels: ["Food", "Tip"] },
        icon: Receipt20Regular,
      },
      {
        id: "tipEach",
        label: "Tip each",
        value: "$6.00",
        icon: Money20Regular,
      },
      { id: "people", label: "People", value: "4", icon: People20Regular },
      { id: "bill", label: "Bill", value: "$120.00", icon: Receipt20Regular },
    ],
    intents: [
      {
        prompt: "split $120 four ways with 20% tip",
        lead: "Each person pays $36, including a $6 tip.",
        featured: "each",
        order: ["total", "tip", "tipEach", "people", "bill"],
      },
      {
        prompt: "what's the tip on $120 at 20% for 4 of us",
        lead: "The tip is $24, which is $6 each.",
        featured: "tip",
        order: ["tipEach", "total", "each", "bill", "people"],
      },
    ],
  },
];

const grow = {
  "@media (prefers-reduced-motion: no-preference)": {
    animationDuration: "700ms",
    animationTimingFunction: tokens.curveDecelerateMid,
    animationFillMode: "both",
  },
} as const;

const useStyles = makeStyles({
  card: { padding: 0, rowGap: 0, overflow: "hidden" },
  head: { padding: "24px", display: "grid", rowGap: "20px" },
  lead: { margin: 0, textWrap: "pretty" },
  muted: { color: tokens.colorNeutralForeground3 },
  secondary: { color: tokens.colorNeutralForeground2 },
  up: { color: tokens.colorPaletteGreenForeground1 },
  down: { color: tokens.colorPaletteRedForeground1 },
  num: { fontVariantNumeric: "tabular-nums" },

  growX: {
    transformOrigin: "0 50%",
    ...grow,
    "@media (prefers-reduced-motion: no-preference)": {
      ...grow["@media (prefers-reduced-motion: no-preference)"],
      animationName: {
        from: { transform: "scaleX(0)" },
        to: { transform: "scaleX(1)" },
      },
    },
  },
  growY: {
    transformOrigin: "50% 100%",
    "@media (prefers-reduced-motion: no-preference)": {
      ...grow["@media (prefers-reduced-motion: no-preference)"],
      animationName: {
        from: { transform: "scaleY(0)" },
        to: { transform: "scaleY(1)" },
      },
    },
  },

  // The featured fact: drawing, figure, and its shape in one row.
  feature: {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, auto) minmax(0, 1fr)",
    columnGap: "24px",
    rowGap: "16px",
    alignItems: "center",
    "@media (max-width: 640px)": {
      gridTemplateColumns: "auto minmax(0, 1fr)",
      columnGap: "16px",
    },
  },
  heroIcon: {
    width: "56px",
    height: "56px",
    "@media (max-width: 480px)": { width: "44px", height: "44px" },
  },
  figure: { display: "grid", rowGap: "2px", minWidth: 0 },
  big: {
    display: "flex",
    alignItems: "baseline",
    columnGap: "4px",
    fontSize: tokens.fontSizeHero800,
    lineHeight: tokens.lineHeightHero800,
    fontWeight: tokens.fontWeightSemibold,
    fontVariantNumeric: "tabular-nums",
    letterSpacing: "-0.02em",
    color: tokens.colorNeutralForeground1,
    textWrap: "balance",
    "@media (max-width: 480px)": {
      fontSize: tokens.fontSizeHero700,
      lineHeight: tokens.lineHeightHero700,
    },
  },
  bigWords: {
    fontSize: tokens.fontSizeBase600,
    lineHeight: tokens.lineHeightBase600,
    letterSpacing: "-0.01em",
  },
  unit: {
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightRegular,
    color: tokens.colorNeutralForeground3,
    letterSpacing: 0,
  },
  wide: {
    display: "grid",
    rowGap: "6px",
    minWidth: 0,
    "@media (max-width: 640px)": { gridColumn: "1 / -1" },
  },

  // Shapes.
  bar: {
    position: "relative",
    justifySelf: "stretch",
    height: "6px",
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorNeutralBackground5,
  },
  barBig: { height: "10px" },
  small: { maxWidth: "200px", marginTop: "6px" },
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
  markBig: { width: "16px", height: "16px", margin: "-8px 0 0 -8px" },
  tick: {
    position: "absolute",
    top: "-3px",
    bottom: "-3px",
    width: "2px",
    marginLeft: "-1px",
    backgroundColor: tokens.colorNeutralForeground3,
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
  ends: {
    display: "flex",
    justifyContent: "space-between",
    columnGap: "12px",
    color: tokens.colorNeutralForeground3,
    fontVariantNumeric: "tabular-nums",
  },
  sky: {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr) auto",
    columnGap: "8px",
    alignItems: "center",
    justifySelf: "stretch",
  },
  skySmall: { maxWidth: "220px", marginTop: "6px" },
  parts: {
    display: "flex",
    columnGap: "3px",
    justifySelf: "stretch",
    height: "8px",
  },
  partsBig: { height: "14px" },
  part: { height: "100%", borderRadius: tokens.borderRadiusSmall },
  slots: {
    display: "grid",
    gridAutoFlow: "column",
    gridAutoColumns: "minmax(0, 1fr)",
    columnGap: "6px",
    alignItems: "end",
    justifySelf: "stretch",
  },
  slotsSmall: { height: "24px", maxWidth: "200px", marginTop: "6px" },
  slotsBig: { height: "72px" },
  slot: {
    display: "grid",
    gridTemplateRows: "auto minmax(0, 1fr)",
    alignItems: "end",
    justifyItems: "center",
    rowGap: "4px",
    height: "100%",
  },
  slotBar: {
    width: "100%",
    minHeight: "2px",
    borderRadius: `${tokens.borderRadiusMedium} ${tokens.borderRadiusMedium} ${tokens.borderRadiusSmall} ${tokens.borderRadiusSmall}`,
  },
  slotLabels: {
    display: "grid",
    gridAutoFlow: "column",
    gridAutoColumns: "minmax(0, 1fr)",
    columnGap: "6px",
    textAlign: "center",
    color: tokens.colorNeutralForeground3,
  },
  legend: {
    display: "flex",
    flexWrap: "wrap",
    columnGap: "14px",
    rowGap: "4px",
    color: tokens.colorNeutralForeground2,
  },
  swatch: {
    display: "inline-block",
    width: "10px",
    height: "10px",
    borderRadius: tokens.borderRadiusSmall,
    marginRight: "6px",
    verticalAlign: "-1px",
  },

  // The ranked rest.
  body: { padding: "8px 24px 20px" },
  fold: { margin: "0 -12px" },
  foldHead: {
    display: "flex",
    alignItems: "baseline",
    columnGap: "8px",
    minWidth: 0,
  },
  preview: {
    color: tokens.colorNeutralForeground3,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    minWidth: 0,
  },
  panel: { margin: "4px 12px 8px" },
  grid: {
    margin: 0,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(176px, 1fr))",
    columnGap: "28px",
    rowGap: "22px",
  },
  cell: { display: "grid", rowGap: "2px", alignContent: "start", minWidth: 0 },
  label: {
    display: "flex",
    alignItems: "center",
    columnGap: "6px",
    color: tokens.colorNeutralForeground3,
  },
  icon: { width: "16px", height: "16px", flexShrink: 0 },
  dd: { margin: 0, display: "grid", justifyItems: "start", rowGap: "2px" },
  value: {
    fontSize: tokens.fontSizeBase400,
    lineHeight: tokens.lineHeightBase400,
    fontWeight: tokens.fontWeightSemibold,
    fontVariantNumeric: "tabular-nums",
  },
  skel: { display: "grid", rowGap: "12px", marginTop: "20px" },
});

function Bearing({
  deg,
  ink,
  size = 16,
}: {
  deg: number;
  ink: string;
  size?: number;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
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

function Shape({ viz, ink, big }: { viz: Viz; ink: string; big?: boolean }) {
  const styles = useStyles();
  const pos = (v: number, lo: number, hi: number) =>
    ((v - lo) / (hi - lo)) * 100;

  if (viz.kind === "slots") {
    return (
      <>
        <span
          className={mergeClasses(
            styles.slots,
            big ? styles.slotsBig : styles.slotsSmall,
          )}
          aria-hidden
        >
          {viz.values.map((v, i) => (
            <span key={i} className={styles.slot}>
              {big ? (
                <Caption1 className={styles.num} style={{ color: ink }}>
                  {v}%
                </Caption1>
              ) : (
                <span />
              )}
              <span
                className={mergeClasses(styles.slotBar, styles.growY)}
                style={{
                  height: `${Math.max(v, 3)}%`,
                  backgroundColor: ink,
                  opacity: v ? 0.35 + (v / 100) * 0.65 : 0.25,
                  animationDelay: `${i * 70}ms`,
                }}
              />
            </span>
          ))}
        </span>
        {big ? (
          <span className={styles.slotLabels} aria-hidden>
            {viz.labels.map((l) => (
              <Caption1 key={l}>{l}</Caption1>
            ))}
          </span>
        ) : null}
      </>
    );
  }

  if (viz.kind === "parts") {
    const total = viz.parts.reduce((a, b) => a + b, 0);
    return (
      <>
        <span
          className={mergeClasses(
            styles.parts,
            big ? styles.partsBig : styles.small,
          )}
          aria-hidden
        >
          {viz.parts.map((v, i) => (
            <span
              key={i}
              className={mergeClasses(styles.part, styles.growX)}
              style={{
                flexGrow: v / total,
                backgroundColor: ink,
                opacity: i ? 0.4 : 1,
                animationDelay: `${i * 120}ms`,
              }}
            />
          ))}
        </span>
        {big ? (
          <span className={styles.legend}>
            {viz.labels.map((l, i) => (
              <Caption1 key={l}>
                <span
                  className={styles.swatch}
                  style={{ backgroundColor: ink, opacity: i ? 0.4 : 1 }}
                />
                {l}
              </Caption1>
            ))}
          </span>
        ) : null}
      </>
    );
  }

  if (viz.kind === "day") {
    const at = (h: number) => `${(h / 24) * 100}%`;
    return (
      <>
        <span
          className={mergeClasses(
            styles.sky,
            big ? undefined : styles.skySmall,
          )}
          aria-hidden
        >
          <WeatherSunny20Regular
            className={styles.icon}
            style={{ color: ink }}
          />
          <span className={mergeClasses(styles.bar, big && styles.barBig)}>
            <span
              className={mergeClasses(styles.fill, styles.growX)}
              style={{
                left: at(viz.rise),
                width: `${((viz.set - viz.rise) / 24) * 100}%`,
                backgroundColor: ink,
                opacity: 0.45,
              }}
            />
            <span className={styles.now} style={{ left: at(viz.now) }} />
          </span>
          <WeatherMoon20Regular
            className={styles.icon}
            style={{ color: ink }}
          />
        </span>
        {big ? (
          <span className={styles.ends}>
            <Caption1>{viz.ends[0]}</Caption1>
            <Caption1>{viz.ends[1]}</Caption1>
          </span>
        ) : (
          <Caption1 className={styles.muted}>
            {viz.ends[0]} to {viz.ends[1]}
          </Caption1>
        )}
      </>
    );
  }

  const shell = mergeClasses(styles.bar, big ? styles.barBig : styles.small);
  if (viz.kind === "meter") {
    return (
      <span className={shell} aria-hidden>
        <span
          className={mergeClasses(styles.fill, styles.growX)}
          style={{ width: `${viz.pct}%`, backgroundColor: ink }}
        />
      </span>
    );
  }
  if (viz.kind === "gap") {
    const from = pos(viz.from, viz.lo, viz.hi);
    const to = pos(viz.to, viz.lo, viz.hi);
    return (
      <span className={shell} aria-hidden>
        <span
          className={mergeClasses(styles.fill, styles.growX)}
          style={{
            left: `${from}%`,
            width: `${to - from}%`,
            backgroundColor: ink,
            opacity: 0.45,
          }}
        />
        <span className={styles.tick} style={{ left: `${from}%` }} />
        <span
          className={styles.mark}
          style={{ left: `${to}%`, backgroundColor: ink }}
        />
      </span>
    );
  }
  return (
    <>
      <span className={shell} aria-hidden>
        <span
          className={mergeClasses(styles.fill, styles.growX)}
          style={{ width: "100%", backgroundColor: ink, opacity: 0.3 }}
        />
        <span
          className={mergeClasses(styles.mark, big && styles.markBig)}
          style={{
            left: `${pos(viz.at, viz.lo, viz.hi)}%`,
            backgroundColor: ink,
          }}
        />
      </span>
      {big ? (
        <span className={styles.ends}>
          <Caption1>{viz.ends[0]}</Caption1>
          <Caption1>{viz.ends[1]}</Caption1>
        </span>
      ) : null}
    </>
  );
}

function Featured({ x, ink }: { x: Fact; ink: string }) {
  const styles = useStyles();
  const Hero = x.hero ?? x.icon;
  const words = /[a-z]{3}/i.test(x.value);
  return (
    <div className={styles.feature}>
      {Hero ? (
        <Hero className={styles.heroIcon} style={{ color: ink }} aria-hidden />
      ) : (
        <span />
      )}
      <div className={styles.figure}>
        <Caption1 className={styles.secondary}>{x.label}</Caption1>
        <span className={mergeClasses(styles.big, words && styles.bigWords)}>
          {x.value}
          {x.unit ? <span className={styles.unit}>{x.unit}</span> : null}
        </span>
        {x.note ? (
          <Caption1
            className={x.noteTone ? styles[x.noteTone] : styles.secondary}
          >
            {x.note}
          </Caption1>
        ) : null}
      </div>
      {x.viz ? (
        <div className={styles.wide}>
          <Shape viz={x.viz} ink={ink} big />
        </div>
      ) : null}
    </div>
  );
}

function Cell({ x, ink }: { x: Fact; ink: string }) {
  const styles = useStyles();
  const Glyph = x.icon;
  return (
    <div className={styles.cell}>
      <dt className={styles.label}>
        {x.bearing !== undefined ? (
          <Bearing deg={x.bearing} ink={ink} />
        ) : Glyph ? (
          <Glyph className={styles.icon} style={{ color: ink }} aria-hidden />
        ) : null}
        <Caption1>{x.label}</Caption1>
      </dt>
      <dd className={styles.dd}>
        <span className={styles.value}>
          {x.value}
          {x.unit}
        </span>
        {x.viz ? <Shape viz={x.viz} ink={ink} /> : null}
        {x.note ? (
          <Caption1
            className={x.noteTone ? styles[x.noteTone] : styles.secondary}
          >
            {x.note}
          </Caption1>
        ) : null}
      </dd>
    </div>
  );
}

export function FactsCard({
  f,
  intent,
  mode,
}: {
  f: FactsReading;
  intent: Intent;
  mode: FactsMode;
}) {
  const styles = useStyles();
  const { ink } = TONES[f.tone];
  const byId = new Map(f.facts.map((x) => [x.id, x]));
  const featured = byId.get(intent.featured)!;
  const ranked = intent.order.map((id) => byId.get(id)!);
  const rest = mode === "streaming" ? ranked.slice(0, 2) : ranked;
  const [open, setOpen] = useState(mode !== "collapsed");
  const preview = ranked
    .slice(0, 3)
    .map((x) => `${x.label} ${x.value}${x.unit ?? ""}`)
    .join(" · ");
  return (
    <Card className={styles.card}>
      <div className={styles.head} style={{ backgroundColor: wash(f.tone) }}>
        <Title3 as="h2" className={styles.lead}>
          {intent.lead}
        </Title3>
        <Featured x={featured} ink={ink} />
      </div>
      <div className={styles.body}>
        <Accordion
          collapsible
          className={styles.fold}
          openItems={open ? ["facts"] : []}
          onToggle={() => setOpen((o) => !o)}
        >
          <AccordionItem value="facts">
            <AccordionHeader expandIconPosition="end">
              <span className={styles.foldHead}>
                <Text weight="semibold">{f.title}</Text>
                <Caption1 className={styles.muted}>{ranked.length}</Caption1>
                {open ? null : (
                  <Caption1 className={styles.preview}>{preview}</Caption1>
                )}
              </span>
            </AccordionHeader>
            <AccordionPanel className={styles.panel}>
              <dl className={styles.grid}>
                {rest.map((x) => (
                  <Cell key={x.id} x={x} ink={ink} />
                ))}
              </dl>
              {mode === "streaming" ? (
                <Skeleton
                  aria-label="Loading more readings"
                  className={styles.skel}
                >
                  <SkeletonItem size={24} />
                  <SkeletonItem size={24} />
                </Skeleton>
              ) : null}
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      </div>
    </Card>
  );
}
