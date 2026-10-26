"use client";

import { type ComponentType, type CSSProperties, useState } from "react";
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
import {
  Drop12Filled,
  Star12Filled,
  WeatherCloudy24Regular,
  WeatherDrizzle24Regular,
  WeatherPartlyCloudyDay24Regular,
  WeatherRain24Regular,
  WeatherSunny24Regular,
} from "@fluentui/react-icons";

import { FluentRoot } from "@/fluent/root";
import { type Tone, TONES, wash } from "../ranked/facts";

/**
 * Strip and Range lab. Weather comes from our OpenWeather provider (Redmond,
 * Sep 29, 2026, 3:49 PM PDT): 5 daily rows and 3-hour steps, nothing more.
 * The stock is Yahoo Finance closes; daily change is computed.
 */

type Icon = ComponentType<{
  className?: string;
  style?: CSSProperties;
  "aria-hidden"?: boolean;
}>;

type Flag = { text: string; tone: Tone; icon: Icon };

/**
 * Strip item. The contract today is `{ label, value, sub?, icon?, flag? }`;
 * `lo`/`hi`/`at` are the numbers a shape needs, on the strip's shared scale.
 */
type Item = {
  label: string;
  value: string;
  sub?: string;
  delta?: number;
  icon?: Icon;
  flag?: Flag;
  lo?: number;
  hi?: number;
  at?: number;
  current?: boolean;
};

type StripReading = {
  id: string;
  name: string;
  prompt: string;
  lead: string;
  caption: string;
  tone: Tone;
  scale: [number, number];
  items: Item[];
};

const rain = (pct: number): Flag => ({
  text: `${pct}%`,
  tone: "rain",
  icon: Drop12Filled,
});

const STRIPS: StripReading[] = [
  {
    id: "week",
    name: "5-day forecast",
    prompt: "weather in redmond this week",
    lead: "Rain today, then dry and mild through Saturday.",
    caption: "Redmond, WA · OpenWeather · high and low",
    tone: "rain",
    scale: [52, 68],
    items: [
      {
        label: "Today",
        value: "61°",
        sub: "58°",
        icon: WeatherDrizzle24Regular,
        flag: rain(100),
        lo: 58,
        hi: 61,
        at: 61,
        current: true,
      },
      {
        label: "Wed",
        value: "64°",
        sub: "53°",
        icon: WeatherPartlyCloudyDay24Regular,
        lo: 53,
        hi: 64,
      },
      {
        label: "Thu",
        value: "64°",
        sub: "52°",
        icon: WeatherCloudy24Regular,
        lo: 52,
        hi: 64,
      },
      {
        label: "Fri",
        value: "68°",
        sub: "53°",
        icon: WeatherPartlyCloudyDay24Regular,
        lo: 53,
        hi: 68,
      },
      {
        label: "Sat",
        value: "66°",
        sub: "54°",
        icon: WeatherSunny24Regular,
        lo: 54,
        hi: 66,
      },
    ],
  },
  {
    id: "tonight",
    name: "Tonight",
    prompt: "will it rain tonight",
    lead: "Rain eases after 8 PM and ends by 2 AM.",
    caption: "Redmond, WA · OpenWeather · every 3 hours",
    tone: "rain",
    scale: [52, 62],
    items: [
      {
        label: "5 PM",
        value: "61°",
        icon: WeatherRain24Regular,
        flag: rain(100),
        at: 61,
        current: true,
      },
      {
        label: "8 PM",
        value: "61°",
        icon: WeatherRain24Regular,
        flag: rain(55),
        at: 61,
      },
      {
        label: "11 PM",
        value: "59°",
        icon: WeatherDrizzle24Regular,
        flag: rain(28),
        at: 59,
      },
      { label: "2 AM", value: "58°", icon: WeatherCloudy24Regular, at: 58 },
      {
        label: "5 AM",
        value: "53°",
        sub: "Feels 52°",
        icon: WeatherCloudy24Regular,
        at: 53,
      },
    ],
  },
  {
    id: "msft",
    name: "MSFT week",
    prompt: "how did msft do this week",
    lead: "MSFT is flat today after its best day on Thursday.",
    caption: "Yahoo Finance · close · change from the session before",
    tone: "up",
    scale: [494, 518],
    items: [
      { label: "Sep 23", value: "500.59", sub: "+0.52%", delta: 1, at: 500.59 },
      {
        label: "Sep 24",
        value: "497.93",
        sub: "−0.53%",
        delta: -1,
        at: 497.93,
      },
      {
        label: "Sep 25",
        value: "516.17",
        sub: "+3.66%",
        delta: 1,
        at: 516.17,
        flag: { text: "Best", tone: "up", icon: Star12Filled },
      },
      {
        label: "Sep 28",
        value: "509.22",
        sub: "−1.35%",
        delta: -1,
        at: 509.22,
      },
      {
        label: "Sep 29",
        value: "508.96",
        sub: "−0.05%",
        delta: -1,
        at: 508.96,
        current: true,
      },
    ],
  },
];

/** Range contract: `{ low, high, value?, unit?, caption? }`. */
type RangeReading = {
  id: string;
  name: string;
  prompt: string;
  lead: string;
  caption: string;
  tone: Tone;
  low: number;
  high: number;
  value: number;
  fmt: (n: number) => string;
  unit?: string;
  lowLabel: string;
  highLabel: string;
};

const usd = (n: number) => n.toFixed(2);
const deg = (n: number) => `${n}°`;

const RANGES: RangeReading[] = [
  {
    id: "day",
    name: "MSFT today",
    prompt: "msft day range",
    lead: "MSFT is trading just above the middle of today’s range.",
    caption: "Yahoo Finance · Sep 29, 2026 · close",
    tone: "up",
    low: 502.4,
    high: 513.64,
    value: 508.96,
    fmt: usd,
    unit: "USD",
    lowLabel: "Day low",
    highLabel: "Day high",
  },
  {
    id: "year",
    name: "MSFT 52 weeks",
    prompt: "is msft near its high",
    lead: "MSFT is 8% below its 52-week high.",
    caption: "Yahoo Finance · 52-week range · close Sep 29, 2026",
    tone: "up",
    low: 349.2,
    high: 553.72,
    value: 508.96,
    fmt: usd,
    unit: "USD",
    lowLabel: "52-week low",
    highLabel: "52-week high",
  },
  {
    id: "temp",
    name: "Redmond today",
    prompt: "how warm will it get today",
    lead: "It’s 61° now. Today tops out at 63°.",
    caption: "Redmond, WA · OpenWeather · 3:49 PM PDT",
    tone: "rain",
    low: 58,
    high: 63,
    value: 61,
    fmt: deg,
    lowLabel: "Low",
    highLabel: "High",
  },
];

const motion = {
  animationDuration: "700ms",
  animationTimingFunction: tokens.curveDecelerateMid,
  animationFillMode: "both",
} as const;

const useStyles = makeStyles({
  page: {
    minHeight: "100vh",
    backgroundColor: tokens.colorNeutralBackground2,
    padding: "48px 24px 96px",
    display: "grid",
    alignContent: "start",
    justifyItems: "center",
    rowGap: "40px",
    "@media (max-width: 480px)": { padding: "32px 12px 64px" },
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
  secondary: { color: tokens.colorNeutralForeground2 },
  up: { color: tokens.colorPaletteGreenForeground1 },
  down: { color: tokens.colorPaletteRedForeground1 },
  num: { fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" },

  card: {
    padding: "24px",
    rowGap: "20px",
    "@media (max-width: 480px)": { padding: "20px 16px" },
  },
  flush: { padding: 0, rowGap: 0, overflow: "hidden" },
  head: { display: "grid", rowGap: "4px" },
  lead: { margin: 0, textWrap: "pretty" },

  growX: {
    transformOrigin: "0 50%",
    "@media (prefers-reduced-motion: no-preference)": {
      ...motion,
      animationName: {
        from: { transform: "scaleX(0)" },
        to: { transform: "scaleX(1)" },
      },
    },
  },
  growY: {
    transformOrigin: "50% 100%",
    "@media (prefers-reduced-motion: no-preference)": {
      ...motion,
      animationName: {
        from: { transform: "scaleY(0)" },
        to: { transform: "scaleY(1)" },
      },
    },
  },
  pop: {
    "@media (prefers-reduced-motion: no-preference)": {
      ...motion,
      animationName: {
        from: { opacity: 0, transform: "scale(0.4)" },
        to: { opacity: 1, transform: "scale(1)" },
      },
    },
  },

  flag: {
    display: "inline-flex",
    alignItems: "center",
    columnGap: "3px",
    padding: "1px 6px",
    borderRadius: tokens.borderRadiusCircular,
    fontSize: tokens.fontSizeBase200,
    lineHeight: tokens.lineHeightBase200,
    fontWeight: tokens.fontWeightSemibold,
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
  },
  flagPlain: {
    display: "inline-flex",
    alignItems: "center",
    columnGap: "3px",
    fontSize: tokens.fontSizeBase200,
    lineHeight: tokens.lineHeightBase200,
    fontWeight: tokens.fontWeightSemibold,
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
  },
  icon: { width: "24px", height: "24px", flexShrink: 0 },

  // Strip A · Tiles.
  tiles: {
    margin: 0,
    padding: 0,
    listStyle: "none",
    display: "grid",
    gridAutoFlow: "column",
    gridAutoColumns: "minmax(56px, 1fr)",
    columnGap: "4px",
    overflowX: "auto",
    scrollSnapType: "x mandatory",
    scrollbarWidth: "thin",
  },
  tile: {
    display: "grid",
    gridTemplateRows: "auto 28px auto auto 16px 20px",
    justifyItems: "center",
    alignItems: "center",
    rowGap: "4px",
    padding: "12px 4px",
    borderRadius: tokens.borderRadiusLarge,
    scrollSnapAlign: "start",
    textAlign: "center",
  },
  tileValue: {
    fontSize: tokens.fontSizeBase500,
    lineHeight: tokens.lineHeightBase500,
    fontWeight: tokens.fontWeightSemibold,
    fontVariantNumeric: "tabular-nums",
    "@media (max-width: 480px)": {
      fontSize: tokens.fontSizeBase400,
      lineHeight: tokens.lineHeightBase400,
    },
  },

  // Strip B · Scale: the same columns, each drawn on one shared scale.
  scale: {
    margin: 0,
    padding: 0,
    listStyle: "none",
    display: "grid",
    gridAutoFlow: "column",
    gridAutoColumns: "minmax(56px, 1fr)",
    columnGap: "4px",
  },
  col: {
    display: "grid",
    gridTemplateRows: "auto 28px auto 112px auto 20px",
    justifyItems: "center",
    alignItems: "center",
    rowGap: "6px",
    padding: "12px 0",
    borderRadius: tokens.borderRadiusLarge,
    textAlign: "center",
  },
  plot: { position: "relative", width: "10px", height: "100%" },
  plotRail: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "50%",
    width: "2px",
    marginLeft: "-1px",
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorNeutralBackground5,
  },
  plotBar: {
    position: "absolute",
    left: 0,
    right: 0,
    borderRadius: tokens.borderRadiusCircular,
  },
  plotDot: {
    position: "absolute",
    left: "50%",
    width: "12px",
    height: "12px",
    margin: "0 0 -6px -6px",
    borderRadius: tokens.borderRadiusCircular,
    boxShadow: `0 0 0 2px ${tokens.colorNeutralBackground1}`,
  },

  // Strip C · Rows: one row per item on a shared horizontal scale.
  rows: {
    margin: "0 -12px",
    padding: 0,
    listStyle: "none",
    display: "grid",
    gridTemplateColumns:
      "minmax(52px, auto) minmax(56px, auto) auto minmax(64px, 1fr) auto",
    columnGap: "14px",
    "@media (max-width: 480px)": { columnGap: "10px" },
  },
  row: {
    gridColumn: "1 / -1",
    display: "grid",
    gridTemplateColumns: "subgrid",
    alignItems: "center",
    minHeight: "48px",
    padding: "0 12px",
    borderRadius: tokens.borderRadiusMedium,
    borderTop: `1px solid ${tokens.colorNeutralStroke3}`,
    ":first-child": { borderTop: "none" },
  },
  rowIcon: {
    display: "flex",
    alignItems: "center",
    columnGap: "6px",
    minWidth: 0,
  },
  rowEnd: { textAlign: "right" },
  track: {
    position: "relative",
    height: "6px",
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorNeutralBackground5,
  },
  trackBar: {
    position: "absolute",
    top: 0,
    bottom: 0,
    borderRadius: "inherit",
  },
  trackDot: {
    position: "absolute",
    top: "50%",
    width: "12px",
    height: "12px",
    margin: "-6px 0 0 -6px",
    borderRadius: tokens.borderRadiusCircular,
    boxShadow: `0 0 0 2px ${tokens.colorNeutralBackground1}`,
  },
  tileTrack: { justifySelf: "stretch", height: "4px", margin: "0 8px" },
  tileDot: { width: "10px", height: "10px", margin: "-5px 0 0 -5px" },

  // Range.
  rangeFeature: {
    padding: "24px",
    display: "grid",
    rowGap: "20px",
    "@media (max-width: 480px)": { padding: "20px 16px" },
  },
  rangeTop: {
    padding: "24px 24px 20px",
    display: "grid",
    rowGap: "16px",
    "@media (max-width: 480px)": { padding: "20px 16px 16px" },
  },
  rangeBand: {
    padding: "20px 24px 24px",
    display: "grid",
    rowGap: "16px",
    "@media (max-width: 480px)": { padding: "16px 16px 20px" },
  },
  rangeBig: {
    display: "flex",
    alignItems: "baseline",
    columnGap: "6px",
    fontSize: tokens.fontSizeHero800,
    lineHeight: tokens.lineHeightHero800,
    fontWeight: tokens.fontWeightSemibold,
    fontVariantNumeric: "tabular-nums",
    letterSpacing: "-0.02em",
    "@media (max-width: 480px)": {
      fontSize: tokens.fontSizeHero700,
      lineHeight: tokens.lineHeightHero700,
    },
  },
  unit: {
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightRegular,
    color: tokens.colorNeutralForeground3,
    letterSpacing: 0,
  },
  rail: { display: "grid", rowGap: "8px" },
  railTrack: {
    position: "relative",
    height: "8px",
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorNeutralBackground5,
  },
  railTrackBig: { height: "12px" },
  railFill: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: "inherit",
  },
  railMark: {
    position: "absolute",
    top: "50%",
    width: "16px",
    height: "16px",
    margin: "-8px 0 0 -8px",
    borderRadius: tokens.borderRadiusCircular,
    boxShadow: `0 0 0 3px ${tokens.colorNeutralBackground1}`,
  },
  railMarkBig: { width: "20px", height: "20px", margin: "-10px 0 0 -10px" },
  railValue: {
    position: "relative",
    height: "20px",
  },
  railValueText: {
    position: "absolute",
    bottom: 0,
    transform: "translateX(-50%)",
    fontWeight: tokens.fontWeightSemibold,
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
  },
  railEnds: {
    display: "flex",
    justifyContent: "space-between",
    columnGap: "16px",
  },
  railEnd: { display: "grid", rowGap: "0" },
  railEndRight: { textAlign: "right" },
  skel: { display: "grid", rowGap: "12px" },
});

type Mode = "complete" | "streaming";

/** Streaming shows the items that have arrived and holds space for the rest. */
const ARRIVED = 2;
const arrived = <T,>(items: T[], mode: Mode) =>
  mode === "streaming" ? items.slice(0, ARRIVED) : items;

const pct = (v: number, [lo, hi]: [number, number]) =>
  Math.min(100, Math.max(0, ((v - lo) / (hi - lo)) * 100));

function Head({ lead, caption }: { lead: string; caption: string }) {
  const styles = useStyles();
  return (
    <div className={styles.head}>
      <Title3 as="h2" className={styles.lead}>
        {lead}
      </Title3>
      <Caption1 className={styles.muted}>{caption}</Caption1>
    </div>
  );
}

function FlagMark({ flag, plain }: { flag: Flag; plain?: boolean }) {
  const styles = useStyles();
  const { tint, ink } = TONES[flag.tone];
  const Glyph = flag.icon;
  return (
    <span
      className={plain ? styles.flagPlain : styles.flag}
      style={plain ? { color: ink } : { backgroundColor: tint, color: ink }}
    >
      <Glyph aria-hidden />
      {flag.text}
    </span>
  );
}

function Sub({ item }: { item: Item }) {
  const styles = useStyles();
  if (!item.sub) return null;
  const tone =
    item.delta === undefined
      ? styles.muted
      : item.delta >= 0
        ? styles.up
        : styles.down;
  return (
    <Caption1 className={mergeClasses(styles.num, tone)}>{item.sub}</Caption1>
  );
}

function ItemIcon({ item, ink }: { item: Item; ink: string }) {
  const styles = useStyles();
  if (!item.icon) return <span />;
  const Glyph = item.icon;
  return (
    <Glyph
      aria-hidden
      className={styles.icon}
      style={{ color: item.flag ? ink : tokens.colorNeutralForeground2 }}
    />
  );
}

function PendingCols({ n, h }: { n: number; h: number }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <li key={`p${i}`} aria-hidden>
          <Skeleton>
            <SkeletonItem
              style={{ height: h, borderRadius: tokens.borderRadiusLarge }}
            />
          </Skeleton>
        </li>
      ))}
    </>
  );
}

function StripTiles({ s, mode }: { s: StripReading; mode: Mode }) {
  const styles = useStyles();
  const { ink } = TONES[s.tone];
  const items = arrived(s.items, mode);
  const soft = `color-mix(in srgb, ${ink} 42%, ${tokens.colorNeutralBackground1})`;
  return (
    <Card className={styles.card}>
      <Head lead={s.lead} caption={s.caption} />
      <ol className={styles.tiles} aria-busy={mode === "streaming"}>
        {items.map((it, i) => {
          const hasSpan = it.lo !== undefined && it.hi !== undefined;
          const left = hasSpan ? pct(it.lo!, s.scale) : 0;
          const right = hasSpan ? pct(it.hi!, s.scale) : 0;
          return (
            <li
              key={it.label}
              className={styles.tile}
              style={it.current ? { backgroundColor: wash(s.tone) } : undefined}
              aria-current={it.current ? "true" : undefined}
            >
              <Text
                size={200}
                className={it.current ? undefined : styles.secondary}
                weight={it.current ? "semibold" : "regular"}
              >
                {it.label}
              </Text>
              <ItemIcon item={it} ink={ink} />
              <span className={styles.tileValue}>{it.value}</span>
              {it.sub ? <Sub item={it} /> : <span />}
              <span
                className={mergeClasses(styles.track, styles.tileTrack)}
                aria-hidden
              >
                {hasSpan ? (
                  <span
                    className={mergeClasses(styles.trackBar, styles.growX)}
                    style={{
                      left: `${left}%`,
                      width: `${right - left}%`,
                      backgroundColor: it.current ? ink : soft,
                      animationDelay: `${i * 70}ms`,
                    }}
                  />
                ) : null}
                {it.at !== undefined && (!hasSpan || it.current) ? (
                  <span
                    className={mergeClasses(
                      styles.trackDot,
                      styles.tileDot,
                      styles.pop,
                    )}
                    style={{
                      left: `${pct(it.at, s.scale)}%`,
                      backgroundColor: hasSpan
                        ? tokens.colorNeutralForeground1
                        : it.current
                          ? ink
                          : soft,
                      animationDelay: `${i * 70 + 200}ms`,
                    }}
                  />
                ) : null}
              </span>
              {it.flag ? <FlagMark flag={it.flag} /> : <span />}
            </li>
          );
        })}
        {mode === "streaming" ? (
          <PendingCols n={s.items.length - items.length} h={168} />
        ) : null}
      </ol>
    </Card>
  );
}

function StripScale({ s, mode }: { s: StripReading; mode: Mode }) {
  const styles = useStyles();
  const { ink } = TONES[s.tone];
  const items = arrived(s.items, mode);
  const soft = `color-mix(in srgb, ${ink} 42%, ${tokens.colorNeutralBackground1})`;
  return (
    <Card className={styles.card}>
      <Head lead={s.lead} caption={s.caption} />
      <ol className={styles.scale} aria-busy={mode === "streaming"}>
        {items.map((it, i) => {
          const hasSpan = it.lo !== undefined && it.hi !== undefined;
          return (
            <li
              key={it.label}
              className={styles.col}
              style={it.current ? { backgroundColor: wash(s.tone) } : undefined}
              aria-current={it.current ? "true" : undefined}
            >
              <Text
                size={200}
                className={it.current ? undefined : styles.secondary}
                weight={it.current ? "semibold" : "regular"}
              >
                {it.label}
              </Text>
              <ItemIcon item={it} ink={ink} />
              <Text weight="semibold" className={styles.num}>
                {it.value}
              </Text>
              <span className={styles.plot} aria-hidden>
                <span className={styles.plotRail} />
                {hasSpan ? (
                  <span
                    className={mergeClasses(styles.plotBar, styles.growY)}
                    style={{
                      bottom: `${pct(it.lo!, s.scale)}%`,
                      height: `${pct(it.hi!, s.scale) - pct(it.lo!, s.scale)}%`,
                      backgroundColor: it.current ? ink : soft,
                      animationDelay: `${i * 70}ms`,
                    }}
                  />
                ) : null}
                {it.at !== undefined && (!hasSpan || it.current) ? (
                  <span
                    className={mergeClasses(styles.plotDot, styles.pop)}
                    style={{
                      bottom: `${pct(it.at, s.scale)}%`,
                      backgroundColor: hasSpan
                        ? tokens.colorNeutralForeground1
                        : it.current
                          ? ink
                          : soft,
                      animationDelay: `${i * 70 + 200}ms`,
                    }}
                  />
                ) : null}
              </span>
              {it.sub ? <Sub item={it} /> : <span />}
              {it.flag ? <FlagMark flag={it.flag} /> : <span />}
            </li>
          );
        })}
        {mode === "streaming" ? (
          <PendingCols n={s.items.length - items.length} h={236} />
        ) : null}
      </ol>
    </Card>
  );
}

function StripRows({ s, mode }: { s: StripReading; mode: Mode }) {
  const styles = useStyles();
  const { ink } = TONES[s.tone];
  const items = arrived(s.items, mode);
  const soft = `color-mix(in srgb, ${ink} 42%, ${tokens.colorNeutralBackground1})`;
  return (
    <Card className={styles.card}>
      <Head lead={s.lead} caption={s.caption} />
      <ol className={styles.rows} aria-busy={mode === "streaming"}>
        {items.map((it, i) => {
          const hasSpan = it.lo !== undefined && it.hi !== undefined;
          const left = hasSpan ? pct(it.lo!, s.scale) : 0;
          const right = hasSpan ? pct(it.hi!, s.scale) : 0;
          return (
            <li
              key={it.label}
              className={styles.row}
              style={it.current ? { backgroundColor: wash(s.tone) } : undefined}
              aria-current={it.current ? "true" : undefined}
            >
              <Text weight={it.current ? "semibold" : "regular"}>
                {it.label}
              </Text>
              <span className={styles.rowIcon}>
                {it.icon ? (
                  <>
                    <ItemIcon item={it} ink={ink} />
                    {it.flag ? <FlagMark flag={it.flag} plain /> : null}
                  </>
                ) : (
                  <Sub item={it} />
                )}
              </span>
              {hasSpan ? (
                <Text className={mergeClasses(styles.num, styles.muted)}>
                  {it.sub}
                </Text>
              ) : it.icon && it.sub ? (
                <Sub item={it} />
              ) : !it.icon && it.flag ? (
                <FlagMark flag={it.flag} />
              ) : (
                <span />
              )}
              <span className={styles.track} aria-hidden>
                {hasSpan ? (
                  <span
                    className={mergeClasses(styles.trackBar, styles.growX)}
                    style={{
                      left: `${left}%`,
                      width: `${right - left}%`,
                      backgroundColor: it.current ? ink : soft,
                      animationDelay: `${i * 70}ms`,
                    }}
                  />
                ) : null}
                {it.at !== undefined && (!hasSpan || it.current) ? (
                  <span
                    className={mergeClasses(styles.trackDot, styles.pop)}
                    style={{
                      left: `${pct(it.at, s.scale)}%`,
                      backgroundColor: hasSpan
                        ? tokens.colorNeutralForeground1
                        : it.current
                          ? ink
                          : soft,
                      animationDelay: `${i * 70 + 200}ms`,
                    }}
                  />
                ) : null}
              </span>
              <Text
                weight="semibold"
                className={mergeClasses(styles.num, styles.rowEnd)}
              >
                {it.value}
              </Text>
            </li>
          );
        })}
      </ol>
      {mode === "streaming" ? (
        <Skeleton aria-label="Loading more items" className={styles.skel}>
          {Array.from({ length: s.items.length - items.length }, (_, i) => (
            <SkeletonItem key={i} size={36} />
          ))}
        </Skeleton>
      ) : null}
    </Card>
  );
}

function Rail({ r, big }: { r: RangeReading; big?: boolean }) {
  const styles = useStyles();
  const { ink } = TONES[r.tone];
  const at = pct(r.value, [r.low, r.high]);
  return (
    <div className={styles.rail}>
      {big ? null : (
        <span className={styles.railValue}>
          <Text
            className={styles.railValueText}
            style={{ left: `clamp(32px, ${at}%, calc(100% - 32px))` }}
          >
            {r.fmt(r.value)}
          </Text>
        </span>
      )}
      <span
        className={mergeClasses(styles.railTrack, big && styles.railTrackBig)}
        role="img"
        aria-label={`${r.fmt(r.value)}, ${Math.round(at)}% of the way from ${r.fmt(r.low)} to ${r.fmt(r.high)}`}
      >
        <span
          className={mergeClasses(styles.railFill, styles.growX)}
          style={{
            width: `${at}%`,
            backgroundColor: `color-mix(in srgb, ${ink} 45%, ${tokens.colorNeutralBackground1})`,
          }}
        />
        <span
          className={mergeClasses(
            styles.railMark,
            big && styles.railMarkBig,
            styles.pop,
          )}
          style={{
            left: `${at}%`,
            backgroundColor: ink,
            animationDelay: "400ms",
          }}
        />
      </span>
      <span className={styles.railEnds}>
        <span className={styles.railEnd}>
          <Text weight="semibold" className={styles.num}>
            {r.fmt(r.low)}
          </Text>
          <Caption1 className={styles.muted}>{r.lowLabel}</Caption1>
        </span>
        <span className={mergeClasses(styles.railEnd, styles.railEndRight)}>
          <Text weight="semibold" className={styles.num}>
            {r.fmt(r.high)}
          </Text>
          <Caption1 className={styles.muted}>{r.highLabel}</Caption1>
        </span>
      </span>
    </div>
  );
}

function RangePending() {
  const styles = useStyles();
  return (
    <Skeleton aria-label="Loading range" className={styles.skel}>
      <SkeletonItem size={12} />
      <SkeletonItem size={16} style={{ width: "40%" }} />
    </Skeleton>
  );
}

function RangeRail({ r, mode }: { r: RangeReading; mode: Mode }) {
  const styles = useStyles();
  return (
    <Card className={styles.card}>
      <Head lead={r.lead} caption={r.caption} />
      {mode === "streaming" ? <RangePending /> : <Rail r={r} />}
    </Card>
  );
}

function RangeAnswer({ r, mode }: { r: RangeReading; mode: Mode }) {
  const styles = useStyles();
  return (
    <Card className={mergeClasses(styles.card, styles.flush)}>
      <div
        className={styles.rangeFeature}
        style={{ backgroundColor: wash(r.tone) }}
      >
        <Head lead={r.lead} caption={r.caption} />
        {mode === "streaming" ? (
          <RangePending />
        ) : (
          <>
            <span className={styles.rangeBig}>
              {r.fmt(r.value)}
              {r.unit ? <span className={styles.unit}>{r.unit}</span> : null}
            </span>
            <Rail r={r} big />
          </>
        )}
      </div>
    </Card>
  );
}

function RangePlain({ r, mode }: { r: RangeReading; mode: Mode }) {
  const styles = useStyles();
  return (
    <Card className={mergeClasses(styles.card, styles.flush)}>
      <div className={styles.rangeTop}>
        <Head lead={r.lead} caption={r.caption} />
      </div>
      <div
        className={styles.rangeBand}
        style={{ backgroundColor: wash(r.tone) }}
      >
        {mode === "streaming" ? (
          <RangePending />
        ) : (
          <>
            <span className={styles.rangeBig}>
              {r.fmt(r.value)}
              {r.unit ? <span className={styles.unit}>{r.unit}</span> : null}
            </span>
            <Rail r={r} big />
          </>
        )}
      </div>
    </Card>
  );
}

const STRIP_VARIANTS = [
  {
    letter: "A2",
    name: "Tiles with scale",
    note: "A’s clean tiles; each draws its span or point on the shared scale, with C’s motion.",
    View: StripTiles,
  },
  {
    letter: "B",
    name: "Scale",
    note: "Each column draws its range or point on one shared vertical scale.",
    View: StripScale,
  },
  {
    letter: "C",
    name: "Rows",
    note: "One row per item on a shared horizontal scale. Reads well on phones.",
    View: StripRows,
  },
];

const RANGE_VARIANTS = [
  {
    letter: "B2",
    name: "Answer, plain card",
    note: "The lead stays on white; the value and rail answer on B’s wash.",
    View: RangePlain,
  },
  {
    letter: "A",
    name: "Rail",
    note: "The value rides above its marker; the ends are labelled.",
    View: RangeRail,
  },
  {
    letter: "B",
    name: "Answer",
    note: "The value is the answer on the wash; the rail explains it.",
    View: RangeAnswer,
  },
];

type Kind = "strip" | "range";

function Lab() {
  const styles = useStyles();
  const [kind, setKind] = useState<Kind>("strip");
  const [sid, setSid] = useState(STRIPS[0].id);
  const [rid, setRid] = useState(RANGES[0].id);
  const [mode, setMode] = useState<Mode>("complete");
  const strip = STRIPS.find((s) => s.id === sid)!;
  const range = RANGES.find((r) => r.id === rid)!;
  const readings = kind === "strip" ? STRIPS : RANGES;
  const prompt = kind === "strip" ? strip.prompt : range.prompt;
  return (
    <main className={styles.page}>
      <header className={styles.intro}>
        <Title3 as="h1">Strip and Range</Title3>
        <Body1 className={styles.introText}>
          A strip is a short sequence read left to right: days, hours, or
          sessions. A range places one value between its low and high. Both draw
          on a shared scale so the eye compares shapes, not digits.
        </Body1>
        <div className={styles.tabs}>
          <TabList
            selectedValue={kind}
            onTabSelect={(_, d) => setKind(d.value as Kind)}
            aria-label="Component"
          >
            <Tab value="strip">Strip</Tab>
            <Tab value="range">Range</Tab>
          </TabList>
          <TabList
            selectedValue={kind === "strip" ? sid : rid}
            onTabSelect={(_, d) =>
              kind === "strip"
                ? setSid(d.value as string)
                : setRid(d.value as string)
            }
            aria-label="Reading"
          >
            {readings.map((r) => (
              <Tab key={r.id} value={r.id}>
                {r.name}
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
          </TabList>
        </div>
        <Caption1 className={styles.muted}>“{prompt}”</Caption1>
      </header>
      {kind === "strip"
        ? STRIP_VARIANTS.map(({ letter, name, note, View }) => (
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
              <View key={`${sid}-${mode}`} s={strip} mode={mode} />
            </section>
          ))
        : RANGE_VARIANTS.map(({ letter, name, note, View }) => (
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
              <View key={`${rid}-${mode}`} r={range} mode={mode} />
            </section>
          ))}
    </main>
  );
}

export default function StripLabPage() {
  return (
    <FluentRoot>
      <Lab />
    </FluentRoot>
  );
}
