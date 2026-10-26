"use client";

import {
  type ComponentType,
  type CSSProperties,
  useEffect,
  useState,
} from "react";
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
  Tag,
  Text,
  Title3,
  tokens,
} from "@fluentui/react-components";
import {
  ArrowTrending24Regular,
  ArrowTrendingDown16Regular,
  ArrowTrendingDown24Regular,
  Bookmark24Regular,
  Briefcase16Regular,
  Calculator24Regular,
  CalendarLtr16Regular,
  Circle24Regular,
  Clock16Regular,
  Clock24Regular,
  DataBarVertical16Regular,
  Drop16Regular,
  Globe16Regular,
  TaskListLtr24Regular,
  Temperature16Regular,
  TextBulletListLtr24Regular,
  Trophy16Regular,
  Warning24Regular,
  WeatherCloudy24Regular,
  WeatherFog24Regular,
  WeatherMoon16Regular,
  WeatherRain24Regular,
  WeatherSnow24Regular,
  WeatherSunny24Regular,
  WeatherThunderstorm24Regular,
} from "@fluentui/react-icons";

import { FluentRoot } from "@/fluent/root";

/**
 * Panel and Chips lab. A Panel carries one condition through color; Chips are
 * the short facts beside the answer. Weather is our OpenWeather provider
 * (Redmond, Sep 29, 2026, 3:49 PM PDT), the stock is Yahoo Finance, and the
 * clock reading is computed live in this browser with `Intl`, as `zoneinfo`
 * does on the server.
 */

type Icon = ComponentType<{
  className?: string;
  style?: CSSProperties;
  "aria-hidden"?: boolean;
}>;

/** Every tone the Panel contract names, as a Fluent palette tint and ink. */
type ToneName =
  | "neutral"
  | "clear"
  | "clouds"
  | "rain"
  | "storm"
  | "snow"
  | "fog"
  | "up"
  | "down"
  | "warn"
  | "time"
  | "compute"
  | "list"
  | "record"
  | "plan";

const palette = (name: string) => ({
  tint: (tokens as Record<string, string>)[`colorPalette${name}Background2`],
  ink: (tokens as Record<string, string>)[`colorPalette${name}Foreground2`],
});

const PANEL_TONES: Record<
  ToneName,
  { tint: string; ink: string; icon: Icon; hue: string; means: string }
> = {
  neutral: {
    tint: tokens.colorNeutralBackground3,
    ink: tokens.colorNeutralForeground2,
    icon: Circle24Regular,
    hue: "Neutral",
    means: "No condition",
  },
  clear: {
    ...palette("Marigold"),
    icon: WeatherSunny24Regular,
    hue: "Marigold",
    means: "Clear sky",
  },
  clouds: {
    ...palette("Steel"),
    icon: WeatherCloudy24Regular,
    hue: "Steel",
    means: "Clouds",
  },
  rain: {
    ...palette("Blue"),
    icon: WeatherRain24Regular,
    hue: "Blue",
    means: "Rain",
  },
  storm: {
    ...palette("Grape"),
    icon: WeatherThunderstorm24Regular,
    hue: "Grape",
    means: "Storm",
  },
  snow: {
    ...palette("LightTeal"),
    icon: WeatherSnow24Regular,
    hue: "Light teal",
    means: "Snow",
  },
  fog: {
    ...palette("Mink"),
    icon: WeatherFog24Regular,
    hue: "Mink",
    means: "Fog",
  },
  up: {
    ...palette("Green"),
    icon: ArrowTrending24Regular,
    hue: "Green",
    means: "Gain",
  },
  down: {
    ...palette("Red"),
    icon: ArrowTrendingDown24Regular,
    hue: "Red",
    means: "Loss",
  },
  warn: {
    ...palette("DarkOrange"),
    icon: Warning24Regular,
    hue: "Dark orange",
    means: "Caution",
  },
  time: {
    ...palette("Lavender"),
    icon: Clock24Regular,
    hue: "Lavender",
    means: "Clocks and dates",
  },
  compute: {
    ...palette("Teal"),
    icon: Calculator24Regular,
    hue: "Teal",
    means: "A computed result",
  },
  list: {
    ...palette("Cornflower"),
    icon: TextBulletListLtr24Regular,
    hue: "Cornflower",
    means: "A list",
  },
  record: {
    ...palette("Brown"),
    icon: Bookmark24Regular,
    hue: "Brown",
    means: "A saved record",
  },
  plan: {
    ...palette("Purple"),
    icon: TaskListLtr24Regular,
    hue: "Purple",
    means: "A plan",
  },
};

const TONE_ORDER = Object.keys(PANEL_TONES) as ToneName[];

const washOf = (tone: ToneName, pct = 9) =>
  `color-mix(in srgb, ${PANEL_TONES[tone].ink} ${pct}%, ${tokens.colorNeutralBackground1})`;

/** Chips contract: `{ label, icon? }[]`. */
type Chip = { label: string; icon?: Icon };

type Reading = {
  id: string;
  name: string;
  prompt: string;
  tone: ToneName;
  lead: string;
  caption: string;
  value: string;
  unit?: string;
  note: string;
  chips: Chip[];
};

const WEATHER: Reading = {
  id: "weather",
  name: "Redmond now",
  prompt: "is it raining in redmond",
  tone: "rain",
  lead: "Yes, light rain. It eases after 8 PM.",
  caption: "Redmond, WA · OpenWeather · 3:49 PM PDT",
  value: "61°",
  note: "Light rain · feels 61°",
  chips: [
    { label: "Rain chance 100%", icon: Drop16Regular },
    { label: "Low 58° tonight", icon: Temperature16Regular },
    { label: "Humidity 91%", icon: Drop16Regular },
    { label: "Sunset 6:52 PM", icon: WeatherMoon16Regular },
  ],
};

const STOCK: Reading = {
  id: "stock",
  name: "MSFT close",
  prompt: "how did msft close",
  tone: "down",
  lead: "MSFT closed flat, down 0.05%.",
  caption: "Yahoo Finance · Sep 29, 2026 · close",
  value: "508.96",
  unit: "USD",
  note: "−0.26 from 509.22",
  chips: [
    { label: "Day 502.40–513.64", icon: ArrowTrendingDown16Regular },
    { label: "8% below 52-week high", icon: Trophy16Regular },
    { label: "Volume 19.5M", icon: DataBarVertical16Regular },
  ],
};

/** Seattle → Tokyo, worked out from the browser clock like `time_between`. */
function clockReading(now: Date): Reading {
  const zone = (tz: string, o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-US", { timeZone: tz, ...o }).format(now);
  const offset = (tz: string) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    }).formatToParts(now);
    const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
    const wall = Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      get("hour"),
      get("minute"),
    );
    const utc = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
    );
    return (wall - utc) / 3_600_000;
  };
  const home = "America/Los_Angeles";
  const there = "Asia/Tokyo";
  const hours = offset(there) - offset(home);
  const dayHome = zone(home, { weekday: "short", day: "numeric" });
  const dayThere = zone(there, { weekday: "short", day: "numeric" });
  const hourThere = Number(zone(there, { hour: "numeric", hourCycle: "h23" }));
  const working = hourThere >= 9 && hourThere < 18;
  return {
    id: "clock",
    name: "Tokyo time",
    prompt: "what time is it in tokyo",
    tone: "time",
    lead: `Tokyo is ${Math.abs(hours)} hours ${hours >= 0 ? "ahead" : "behind"}.`,
    caption: "Computed now from this device’s clock · Asia/Tokyo",
    value: zone(there, { hour: "numeric", minute: "2-digit" }),
    note: zone(there, { weekday: "long", month: "short", day: "numeric" }),
    chips: [
      {
        label: dayHome === dayThere ? "Same day" : "Tomorrow there",
        icon: CalendarLtr16Regular,
      },
      {
        label: `Seattle ${zone(home, { hour: "numeric", minute: "2-digit" })}`,
        icon: Clock16Regular,
      },
      {
        label: working ? "Business hours there" : "Outside business hours",
        icon: Briefcase16Regular,
      },
      { label: "JST, no daylight saving", icon: Globe16Regular },
    ],
  };
}

const motion = {
  animationDuration: "500ms",
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

  card: {
    padding: "24px",
    rowGap: "20px",
    "@media (max-width: 480px)": { padding: "20px 16px" },
  },
  flush: { padding: 0, rowGap: 0, overflow: "hidden" },
  section: {
    padding: "24px",
    display: "grid",
    rowGap: "20px",
    "@media (max-width: 480px)": { padding: "20px 16px" },
  },
  sectionTop: { paddingBottom: "20px" },
  head: { display: "grid", rowGap: "4px" },
  lead: { margin: 0, textWrap: "pretty" },

  // The answer: a drawing, the figure, and its note.
  answer: {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr)",
    columnGap: "16px",
    alignItems: "center",
  },
  heroIcon: {
    width: "48px",
    height: "48px",
    "@media (max-width: 480px)": { width: "40px", height: "40px" },
  },
  figure: { display: "grid", rowGap: "2px", minWidth: 0 },
  big: {
    display: "flex",
    alignItems: "baseline",
    columnGap: "6px",
    fontSize: tokens.fontSizeHero800,
    lineHeight: tokens.lineHeightHero800,
    fontWeight: tokens.fontWeightSemibold,
    fontVariantNumeric: "tabular-nums",
    letterSpacing: "-0.02em",
    color: tokens.colorNeutralForeground1,
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

  // C · Tile: the tone lives in one square beside the lead.
  tileHead: {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr)",
    columnGap: "16px",
    alignItems: "start",
  },
  tile: {
    display: "grid",
    placeItems: "center",
    width: "48px",
    height: "48px",
    borderRadius: tokens.borderRadiusXLarge,
  },
  tileIcon: { width: "24px", height: "24px" },
  tileBody: { display: "grid", rowGap: "16px", minWidth: 0 },

  // Chips.
  chips: {
    margin: 0,
    padding: 0,
    listStyle: "none",
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  chip: {
    maxWidth: "100%",
    "@media (prefers-reduced-motion: no-preference)": {
      ...motion,
      animationName: {
        from: { opacity: 0, transform: "translateY(4px)" },
        to: { opacity: 1, transform: "translateY(0)" },
      },
    },
  },
  chipTag: {
    height: "28px",
    borderRadius: tokens.borderRadiusCircular,
    fontVariantNumeric: "tabular-nums",
  },
  chipIcon: { width: "16px", height: "16px" },
  skelChip: { width: "112px", height: "28px" },

  // Tone palette.
  tones: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
    gap: "8px",
  },
  swatch: {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr)",
    columnGap: "10px",
    alignItems: "center",
    padding: "12px",
    borderRadius: tokens.borderRadiusLarge,
  },
  swatchText: { display: "grid", minWidth: 0 },
});

type Mode = "complete" | "streaming";
const ARRIVED = 2;

function Head({ r }: { r: Reading }) {
  const styles = useStyles();
  return (
    <div className={styles.head}>
      <Title3 as="h2" className={styles.lead}>
        {r.lead}
      </Title3>
      <Caption1 className={styles.muted}>{r.caption}</Caption1>
    </div>
  );
}

function Answer({ r, icon = true }: { r: Reading; icon?: boolean }) {
  const styles = useStyles();
  const { ink, icon: Glyph } = PANEL_TONES[r.tone];
  return (
    <div className={icon ? styles.answer : undefined}>
      {icon ? (
        <Glyph aria-hidden className={styles.heroIcon} style={{ color: ink }} />
      ) : null}
      <div className={styles.figure}>
        <span className={styles.big}>
          {r.value}
          {r.unit ? <span className={styles.unit}>{r.unit}</span> : null}
        </span>
        <Text className={styles.secondary}>{r.note}</Text>
      </div>
    </div>
  );
}

type ChipLook = "tint" | "white" | "outline";

function Chips({ r, look, mode }: { r: Reading; look: ChipLook; mode: Mode }) {
  const styles = useStyles();
  const { tint, ink } = PANEL_TONES[r.tone];
  const chips = mode === "streaming" ? r.chips.slice(0, ARRIVED) : r.chips;
  const skin: CSSProperties =
    look === "tint"
      ? { backgroundColor: tint, color: ink, borderColor: "transparent" }
      : look === "white"
        ? {
            backgroundColor: tokens.colorNeutralBackground1,
            color: tokens.colorNeutralForeground1,
            borderColor: "transparent",
          }
        : {};
  return (
    <ul
      className={styles.chips}
      aria-label="Details"
      aria-busy={mode === "streaming"}
    >
      {chips.map((c, i) => {
        const Glyph = c.icon;
        return (
          <li
            key={c.label}
            className={styles.chip}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <Tag
              size="small"
              appearance={look === "outline" ? "outline" : "filled"}
              className={styles.chipTag}
              style={skin}
              icon={
                Glyph ? (
                  <Glyph
                    aria-hidden
                    className={styles.chipIcon}
                    style={{ color: ink }}
                  />
                ) : undefined
              }
            >
              {c.label}
            </Tag>
          </li>
        );
      })}
      {mode === "streaming"
        ? r.chips.slice(ARRIVED).map((c) => (
            <li key={c.label} aria-hidden>
              <Skeleton>
                <SkeletonItem shape="rectangle" className={styles.skelChip} />
              </Skeleton>
            </li>
          ))
        : null}
    </ul>
  );
}

/** A · Wash: the whole panel is the condition. */
function PanelWash({ r, mode }: { r: Reading; mode: Mode }) {
  const styles = useStyles();
  return (
    <Card className={mergeClasses(styles.card, styles.flush)}>
      <div
        className={styles.section}
        style={{ backgroundColor: washOf(r.tone) }}
      >
        <Head r={r} />
        <Answer r={r} />
        <Chips r={r} look="tint" mode={mode} />
      </div>
    </Card>
  );
}

/** B · Split: the lead on white, the answer and its facts on the wash. */
function PanelSplit({ r, mode }: { r: Reading; mode: Mode }) {
  const styles = useStyles();
  return (
    <Card className={mergeClasses(styles.card, styles.flush)}>
      <div className={mergeClasses(styles.section, styles.sectionTop)}>
        <Head r={r} />
      </div>
      <div
        className={styles.section}
        style={{ backgroundColor: washOf(r.tone) }}
      >
        <Answer r={r} />
        <Chips r={r} look="white" mode={mode} />
      </div>
    </Card>
  );
}

/** C · Tile: a white card; the tone lives in one square beside the lead. */
function PanelTile({ r, mode }: { r: Reading; mode: Mode }) {
  const styles = useStyles();
  const { tint, ink, icon: Glyph } = PANEL_TONES[r.tone];
  return (
    <Card className={styles.card}>
      <div className={styles.tileHead}>
        <span className={styles.tile} style={{ backgroundColor: tint }}>
          <Glyph
            aria-hidden
            className={styles.tileIcon}
            style={{ color: ink }}
          />
        </span>
        <div className={styles.tileBody}>
          <Head r={r} />
          <Answer r={r} icon={false} />
          <Chips r={r} look="outline" mode={mode} />
        </div>
      </div>
    </Card>
  );
}

const VARIANTS = [
  {
    letter: "A",
    name: "Wash",
    note: "The whole panel sits on the tone wash; chips are tinted pills.",
    View: PanelWash,
  },
  {
    letter: "B",
    name: "Split",
    note: "Like Range: the lead on white, the answer and white chips on the wash.",
    View: PanelSplit,
  },
  {
    letter: "C",
    name: "Tile",
    note: "A white card; the tone lives in one square. Chips are outline tags.",
    View: PanelTile,
  },
];

function Tones() {
  const styles = useStyles();
  return (
    <section className={styles.variant} aria-label="Tones">
      <div className={styles.variantLabel}>
        <Text size={500} weight="semibold">
          Tones
        </Text>
        <Caption1 className={styles.muted}>
          All 15 tones the Panel contract names, each a Fluent palette pair.
        </Caption1>
      </div>
      <Card className={styles.card}>
        <div className={styles.tones}>
          {TONE_ORDER.map((t) => {
            const { ink, icon: Glyph, hue, means } = PANEL_TONES[t];
            return (
              <div
                key={t}
                className={styles.swatch}
                style={{ backgroundColor: washOf(t) }}
              >
                <Glyph
                  aria-hidden
                  className={styles.tileIcon}
                  style={{ color: ink }}
                />
                <span className={styles.swatchText}>
                  <Text weight="semibold">{t}</Text>
                  <Caption1 className={styles.secondary}>
                    {means} · {hue}
                  </Caption1>
                </span>
              </div>
            );
          })}
        </div>
      </Card>
    </section>
  );
}

function Lab() {
  const styles = useStyles();
  const [now, setNow] = useState<Date | null>(null);
  const [rid, setRid] = useState("weather");
  const [mode, setMode] = useState<Mode>("complete");
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 30_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, []);
  const readings = [WEATHER, STOCK, ...(now ? [clockReading(now)] : [])];
  const r = readings.find((x) => x.id === rid) ?? WEATHER;
  return (
    <main className={styles.page}>
      <header className={styles.intro}>
        <Title3 as="h1">Panel and Chips</Title3>
        <Body1 className={styles.introText}>
          A panel carries one condition through color: rain, a loss, a clock.
          Chips are the short facts beside the answer. JEV picks the tone and
          which facts earn a chip; Python supplies the values.
        </Body1>
        <div className={styles.tabs}>
          <TabList
            selectedValue={r.id}
            onTabSelect={(_, d) => setRid(d.value as string)}
            aria-label="Reading"
          >
            <Tab value="weather">{WEATHER.name}</Tab>
            <Tab value="stock">{STOCK.name}</Tab>
            <Tab value="clock" disabled={!now}>
              Tokyo time
            </Tab>
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
        <Caption1 className={styles.muted}>“{r.prompt}”</Caption1>
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
          <View key={`${r.id}-${mode}`} r={r} mode={mode} />
        </section>
      ))}
      <Tones />
    </main>
  );
}

export default function ChipsLabPage() {
  return (
    <FluentRoot>
      <Lab />
    </FluentRoot>
  );
}
