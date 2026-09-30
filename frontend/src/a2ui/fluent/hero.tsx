"use client";

import { type CSSProperties } from "react";
import {
  Body1,
  Caption1,
  makeStyles,
  mergeClasses,
  Skeleton,
  SkeletonItem,
  Text,
  Title3,
  tokens,
} from "@fluentui/react-components";

import {
  BLEED,
  Glyph,
  TONES,
  type Tone,
  num,
  record,
  records,
  str,
  useTone,
  wash,
} from "./tone";

type StatShape =
  | { kind: "range"; lo: number; hi: number; at: number }
  | { kind: "meter"; pct: number }
  | { kind: "bearing"; deg: number };

type Stat = {
  label: string;
  value: string;
  tone?: Tone;
  note?: string;
  shape?: StatShape;
};

type ForecastContext = {
  kind: "forecast";
  steps: { label?: unknown; value?: unknown; rain?: unknown }[];
};
type TrendContext = { kind: "trend"; points: unknown[]; labels?: unknown[] };
type DayContext = {
  kind: "day";
  places: { name: string; rise: number; set: number; now: number }[];
};
type PartsContext = {
  kind: "parts";
  parts: { label: string; value: number }[];
};
type HeroContext = ForecastContext | TrendContext | DayContext | PartsContext;

const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value));
const pct = (value: number, lo: number, hi: number) =>
  hi === lo ? 50 : clamp(((value - lo) / (hi - lo)) * 100);
const finite = (value: unknown) => num(value);
const nonEmpty = (value: unknown) => str(value).trim();

const useStyles = makeStyles({
  lead: { margin: 0, textWrap: "pretty" },
  muted: { color: tokens.colorNeutralForeground3 },
  caption: { color: tokens.colorNeutralForeground2 },
  up: { color: tokens.colorPaletteGreenForeground1 },
  down: { color: tokens.colorPaletteRedForeground1 },
  num: { fontVariantNumeric: "tabular-nums" },
  top: {
    padding: "var(--jev-pad-y) var(--jev-pad-x)",
    display: "grid",
    rowGap: "20px",
  },
  art: {
    width: "96px",
    height: "96px",
    overflow: "visible",
    "@media (max-width: 480px)": { width: "72px", height: "72px" },
  },
  glyphArt: {
    display: "grid",
    placeItems: "center",
    width: "96px",
    height: "96px",
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
  stats: {
    margin: 0,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(128px, 1fr))",
    columnGap: "16px",
    rowGap: "12px",
  },
  stat: { display: "grid", rowGap: "2px", minWidth: 0, alignContent: "start" },
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
});

function normalizeStats(value: unknown): Stat[] {
  return records<Record<string, unknown>>(value).flatMap((item) => {
    const label = nonEmpty(item.label);
    const statValue = nonEmpty(item.value);
    if (!label || !statValue) return [];
    const shape = parseStatShape(item.shape);
    return [
      {
        label,
        value: statValue,
        tone: TONES[nonEmpty(item.tone) as Tone]
          ? (nonEmpty(item.tone) as Tone)
          : undefined,
        note: nonEmpty(item.note) || undefined,
        shape,
      },
    ];
  });
}

function parseStatShape(value: unknown): StatShape | undefined {
  const shape = record<Record<string, unknown>>(value);
  if (!shape) return undefined;
  if (shape.kind === "meter") {
    const p = finite(shape.pct);
    return p === null ? undefined : { kind: "meter", pct: clamp(p) };
  }
  if (shape.kind === "bearing") {
    const deg = finite(shape.deg);
    return deg === null ? undefined : { kind: "bearing", deg };
  }
  if (shape.kind === "range") {
    const lo = finite(shape.lo);
    const hi = finite(shape.hi);
    const at = finite(shape.at);
    return lo === null || hi === null || at === null
      ? undefined
      : { kind: "range", lo, hi, at };
  }
  return undefined;
}

function parseContext(value: unknown): HeroContext | null {
  const parsed = record<Record<string, unknown>>(value);
  if (!parsed) return null;
  if (parsed.kind === "forecast" && Array.isArray(parsed.steps)) {
    const steps = parsed.steps
      .map((raw) =>
        raw && typeof raw === "object"
          ? (raw as Record<string, unknown>)
          : null,
      )
      .flatMap((step) => {
        const valueNum = finite(step?.value);
        if (!step || valueNum === null) return [];
        return [{ label: step.label, value: valueNum, rain: step.rain }];
      });
    return steps.length ? { kind: "forecast", steps } : null;
  }
  if (parsed.kind === "trend" && Array.isArray(parsed.points)) {
    const points = parsed.points.flatMap((point) => {
      const pointNum = finite(point);
      return pointNum === null ? [] : [pointNum];
    });
    return points.length
      ? {
          kind: "trend",
          points,
          labels: Array.isArray(parsed.labels) ? parsed.labels : undefined,
        }
      : null;
  }
  if (parsed.kind === "day" && Array.isArray(parsed.places)) {
    const places = parsed.places
      .map((raw) =>
        raw && typeof raw === "object"
          ? (raw as Record<string, unknown>)
          : null,
      )
      .flatMap((place) => {
        const rise = finite(place?.rise);
        const set = finite(place?.set);
        const now = finite(place?.now);
        const name = nonEmpty(place?.name);
        if (!place || !name || rise === null || set === null || now === null)
          return [];
        return [{ name, rise, set, now }];
      });
    return places.length ? { kind: "day", places } : null;
  }
  if (parsed.kind === "parts" && Array.isArray(parsed.parts)) {
    const parts = parsed.parts
      .map((raw) =>
        raw && typeof raw === "object"
          ? (raw as Record<string, unknown>)
          : null,
      )
      .flatMap((part) => {
        const valueNum = finite(part?.value);
        const label = nonEmpty(part?.label);
        if (!part || !label || valueNum === null || valueNum <= 0) return [];
        return [{ label, value: valueNum }];
      });
    return parts.length ? { kind: "parts", parts } : null;
  }
  return null;
}

function Ticks({ marks }: { marks: [number, string][] }) {
  const styles = useStyles();
  return (
    <div className={styles.ticks} aria-hidden>
      {marks.map(([at, label], i) => (
        <Caption1
          key={`${label}-${i}`}
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

function Forecast({ context, ink }: { context: ForecastContext; ink: string }) {
  const styles = useStyles();
  const values = context.steps
    .map((step) => finite(step.value))
    .filter((step): step is number => step !== null);
  const rains = context.steps.map((step) => finite(step.rain) ?? 0);
  const w = 240;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const slot = w / context.steps.length;
  const x = (i: number) => slot * i + slot / 2;
  const y = (v: number) => 6 + (hi === lo ? 0.5 : (hi - v) / (hi - lo)) * 24;
  const line = values.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join("");
  const labels = context.steps.map((step) => nonEmpty(step.label));
  const marks: [number, string][] = labels.flatMap((label, i) =>
    label &&
    (i === 0 ||
      i === Math.floor((labels.length - 1) / 2) ||
      i === labels.length - 1)
      ? [[x(i) / w, label]]
      : [],
  );
  const min = Math.min(...values);
  const max = Math.max(...values);
  const maxRain = Math.max(...rains);
  return (
    <>
      <div className={styles.plot}>
        <svg
          className={mergeClasses(styles.svg, styles.reveal)}
          viewBox={`0 0 ${w} 64`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`Forecast from ${values[0]} to ${values[values.length - 1]}; rain chance peaks at ${maxRain}%.`}
        >
          {rains.map((rain, i) => (
            <rect
              key={i}
              x={slot * i + 2}
              y={64 - Math.max((clamp(rain) / 100) * 40, 1.5)}
              width={Math.max(slot - 4, 1)}
              height={Math.max((clamp(rain) / 100) * 40, 1.5)}
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
            top: `${(y(values[0]) / 64) * 100}%`,
            backgroundColor: ink,
          }}
        />
      </div>
      {marks.length ? <Ticks marks={marks} /> : null}
      <div className={styles.legend}>
        <Caption1>
          <span className={styles.swatch} style={{ backgroundColor: ink }} />
          Values, {min} to {max}
        </Caption1>
        {rains.some((rain) => rain > 0) ? (
          <Caption1>
            <span
              className={styles.swatch}
              style={{ backgroundColor: ink, opacity: 0.28 }}
            />
            Chance of rain
          </Caption1>
        ) : null}
      </div>
    </>
  );
}

function Trend({ context, ink }: { context: TrendContext; ink: string }) {
  const styles = useStyles();
  const points = context.points
    .map((point) => finite(point))
    .filter((point): point is number => point !== null);
  const w = 240;
  const lo = Math.min(...points);
  const hi = Math.max(...points);
  const x = (i: number) =>
    points.length === 1 ? w : (i / (points.length - 1)) * w;
  const y = (v: number) => 4 + (hi === lo ? 0.5 : (hi - v) / (hi - lo)) * 56;
  const line = points.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join("");
  const last = points[points.length - 1];
  const labels =
    context.labels?.map((label) => nonEmpty(label)).filter(Boolean) ?? [];
  return (
    <>
      <div className={styles.plot}>
        <svg
          className={mergeClasses(styles.svg, styles.reveal)}
          viewBox={`0 0 ${w} 64`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`Trend from ${points[0]} to ${last}.`}
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
            left: `${(x(points.length - 1) / w) * 100}%`,
            top: `${(y(last) / 64) * 100}%`,
            backgroundColor: ink,
            animationDelay: "1000ms",
          }}
        />
      </div>
      {labels.length >= 2 ? (
        <Ticks
          marks={[
            [0, labels[0]],
            [1, labels[1]],
          ]}
        />
      ) : null}
    </>
  );
}

function Day({ context, tint }: { context: DayContext; tint: string }) {
  const styles = useStyles();
  const at = (hour: number) => `${(clamp(hour, 0, 24) / 24) * 100}%`;
  return (
    <div className={styles.tracks}>
      {context.places.map((place) => (
        <div key={place.name} className={styles.track}>
          <Caption1 className={styles.muted}>{place.name}</Caption1>
          <div
            className={styles.bar}
            role="img"
            aria-label={`${place.name}: daylight from ${place.rise} to ${place.set}, now ${place.now}.`}
          >
            <span
              className={mergeClasses(styles.day, styles.growX)}
              style={{
                left: at(place.rise),
                width: at(place.set - place.rise),
                backgroundColor: tint,
              }}
            />
            <span
              className={styles.dot}
              style={{
                left: at(place.now),
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

function Parts({ context, ink }: { context: PartsContext; ink: string }) {
  const styles = useStyles();
  const total = context.parts.reduce((sum, part) => sum + part.value, 0);
  return (
    <>
      <div
        className={styles.split}
        role="img"
        aria-label={context.parts
          .map((part) => `${part.label} ${part.value}`)
          .join(", ")}
      >
        {context.parts.map((part, i) => (
          <span
            key={`${part.label}-${i}`}
            className={mergeClasses(styles.share, styles.growX)}
            style={{
              flexGrow: total ? part.value / total : 1,
              backgroundColor: ink,
              opacity: i ? 0.35 : 0.85,
              animationDelay: `${i * 110}ms`,
            }}
          />
        ))}
      </div>
      <div className={styles.legend}>
        {context.parts.map((part, i) => (
          <Caption1 key={`${part.label}-legend`}>
            <span
              className={styles.swatch}
              style={{ backgroundColor: ink, opacity: i ? 0.35 : 0.85 }}
            />
            {part.label}
          </Caption1>
        ))}
      </div>
    </>
  );
}

function ContextVisual({
  context,
  caption,
  tone,
  loading,
}: {
  context: HeroContext | null;
  caption: string;
  tone: Tone;
  loading: boolean;
}) {
  const styles = useStyles();
  if (loading) {
    return (
      <Skeleton aria-label="Loading context">
        <SkeletonItem style={{ width: "100%", height: "64px" }} />
      </Skeleton>
    );
  }
  if (!context) return null;
  const { tint, ink } = TONES[tone];
  return (
    <div className={styles.context}>
      {caption ? <Caption1 className={styles.muted}>{caption}</Caption1> : null}
      {context.kind === "forecast" ? (
        <Forecast context={context} ink={ink} />
      ) : null}
      {context.kind === "trend" ? <Trend context={context} ink={ink} /> : null}
      {context.kind === "day" ? <Day context={context} tint={tint} /> : null}
      {context.kind === "parts" ? <Parts context={context} ink={ink} /> : null}
    </div>
  );
}

const at = (cx: number, cy: number, r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.sin(a), cy - r * Math.cos(a)] as const;
};

const wedge = (from: number, to: number) => {
  const [x0, y0] = at(48, 50, 30, from);
  const [x1, y1] = at(48, 50, 30, to);
  return `M48,50L${x0},${y0}A30,30 0 0 1 ${x1},${y1}Z`;
};

function parseClock(value: string, unit: string) {
  const match = value.match(/(\d{1,2})(?::(\d{2}))?/);
  if (!match) return { hour: 0, minute: 0 };
  let hour = Number(match[1]);
  const minute = Number(match[2] ?? 0);
  const suffix = unit.toLowerCase();
  if (suffix.includes("pm") && hour < 12) hour += 12;
  if (suffix.includes("am") && hour === 12) hour = 0;
  return { hour: hour % 24, minute: clamp(minute, 0, 59) };
}

function Art({
  art,
  tone,
  value,
  unit,
}: {
  art: string;
  tone: Tone;
  value: string;
  unit: string;
}) {
  const styles = useStyles();
  const { tint, ink } = TONES[tone];
  const line = {
    fill: "none",
    stroke: ink,
    strokeWidth: 3,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const name = art.toLowerCase();
  if (!["rain", "clouds", "clear", "trend", "clock", "split"].includes(name)) {
    return (
      <div className={styles.glyphArt} aria-hidden>
        <Glyph name={TONES[tone].icon} size={96} color={ink} />
      </div>
    );
  }
  const time = parseClock(value, unit);
  const hourDeg = ((time.hour % 12) + time.minute / 60) * 30;
  const minuteDeg = time.minute * 6;
  return (
    <svg className={styles.art} viewBox="0 0 96 96" aria-hidden>
      {name === "rain" || name === "clouds" ? (
        <>
          <path
            d="M30 62h38a15 15 0 0 0 2-29.9A21 21 0 0 0 30 29a16.5 16.5 0 0 0 0 33z"
            {...line}
            fill={tint}
            strokeWidth={2.5}
          />
          {name === "rain"
            ? [36, 48, 60, 42, 54].map((x) => (
                <line
                  key={x}
                  x1={x}
                  y1={70}
                  x2={x - 2}
                  y2={78}
                  {...line}
                  strokeWidth={2.5}
                />
              ))
            : null}
        </>
      ) : null}
      {name === "clear" ? (
        <g className={styles.rise}>
          <circle
            cx={48}
            cy={48}
            r={18}
            fill={tint}
            stroke={ink}
            strokeWidth={2.5}
          />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
            const [x0, y0] = at(48, 48, 26, deg);
            const [x1, y1] = at(48, 48, 36, deg);
            return (
              <line
                key={deg}
                x1={x0}
                y1={y0}
                x2={x1}
                y2={y1}
                {...line}
                strokeWidth={2.25}
              />
            );
          })}
        </g>
      ) : null}
      {name === "trend" ? (
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
      {name === "clock" ? (
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
            {[0, 60, 120, 240, 300].map((deg) => {
              const [x0, y0] = at(78, 20, 12, deg);
              const [x1, y1] = at(78, 20, 16, deg);
              return (
                <line
                  key={deg}
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
            transform={`rotate(${hourDeg} 48 52)`}
          />
          <line
            x1={48}
            y1={52}
            x2={48}
            y2={30}
            {...line}
            strokeWidth={2.25}
            transform={`rotate(${minuteDeg} 48 52)`}
          />
          <circle cx={48} cy={52} r={2.5} fill={ink} />
        </>
      ) : null}
      {name === "split"
        ? [0, 1, 2, 3].map((q) => {
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
          })
        : null}
    </svg>
  );
}

function Value({
  value,
  unit,
  caption,
  captionTone,
  loading,
}: {
  value: string;
  unit: string;
  caption: string;
  captionTone: string;
  loading: boolean;
}) {
  const styles = useStyles();
  if (loading) {
    return (
      <Skeleton aria-label="Loading value">
        <SkeletonItem style={{ width: "160px", height: "48px" }} />
        <SkeletonItem size={12} style={{ width: "140px", marginTop: "8px" }} />
      </Skeleton>
    );
  }
  return (
    <div className={styles.figure}>
      <span className={styles.value}>
        {value}
        {unit ? <span className={styles.unit}>{unit}</span> : null}
      </span>
      {caption ? (
        <Body1
          className={mergeClasses(
            styles.caption,
            captionTone === "up" && styles.up,
            captionTone === "down" && styles.down,
          )}
        >
          {caption}
        </Body1>
      ) : null}
    </div>
  );
}

function StatShapeView({ shape, ink }: { shape: StatShape; ink: string }) {
  const styles = useStyles();
  if (shape.kind === "bearing") return null;
  if (shape.kind === "meter") {
    return (
      <div className={styles.shape} aria-hidden>
        <span
          className={mergeClasses(styles.fill, styles.growX)}
          style={{ width: `${shape.pct}%`, backgroundColor: ink }}
        />
      </div>
    );
  }
  return (
    <div className={styles.shape} aria-hidden>
      <span
        className={mergeClasses(styles.fill, styles.growX)}
        style={{ width: "100%", backgroundColor: ink, opacity: 0.3 }}
      />
      <span
        className={styles.mark}
        style={{
          left: `${pct(shape.at, shape.lo, shape.hi)}%`,
          backgroundColor: ink,
        }}
      />
    </div>
  );
}

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

function Stats({ stats, tone }: { stats: Stat[]; tone: Tone }) {
  const styles = useStyles();
  if (!stats.length) return null;
  const { ink } = TONES[tone];
  return (
    <dl className={styles.stats}>
      {stats.map((stat) => (
        <div key={stat.label} className={styles.stat}>
          <dt>
            <Caption1 className={styles.muted}>{stat.label}</Caption1>
          </dt>
          <dd className={styles.statBody}>
            <Text
              weight="semibold"
              className={mergeClasses(
                styles.statValue,
                stat.tone === "up" && styles.up,
                stat.tone === "down" && styles.down,
              )}
            >
              {stat.shape?.kind === "bearing" ? (
                <Bearing deg={stat.shape.deg} ink={ink} />
              ) : null}
              {stat.value}
            </Text>
            {stat.shape ? <StatShapeView shape={stat.shape} ink={ink} /> : null}
            {stat.note ? (
              <Caption1 className={styles.muted}>{stat.note}</Caption1>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function HeroView(props: {
  title?: unknown;
  value?: unknown;
  unit?: unknown;
  caption?: unknown;
  captionTone?: unknown;
  tone?: unknown;
  art?: unknown;
  context?: unknown;
  contextCaption?: unknown;
  stats?: unknown;
}) {
  const styles = useStyles();
  const tone = useTone(props.tone);
  const title = nonEmpty(props.title);
  const value = nonEmpty(props.value);
  const unit = nonEmpty(props.unit);
  const caption = nonEmpty(props.caption);
  const loading = !value;
  const context = parseContext(props.context);
  const stats = loading ? [] : normalizeStats(props.stats);
  const lead =
    loading && title ? `${title.split(/\s+/).slice(0, 6).join(" ")}…` : title;
  const art = nonEmpty(props.art) || TONES[tone].icon;
  return (
    <>
      <section
        className={mergeClasses(BLEED, styles.top)}
        style={{ backgroundColor: wash(tone) }}
      >
        {lead ? (
          <Title3 as="p" className={styles.lead}>
            {lead}
          </Title3>
        ) : null}
        <div className={styles.answer}>
          <Art art={art} tone={tone} value={value} unit={unit} />
          <Value
            value={value}
            unit={unit}
            caption={caption}
            captionTone={nonEmpty(props.captionTone)}
            loading={loading}
          />
          <div className={styles.wide}>
            <ContextVisual
              context={context}
              caption={nonEmpty(props.contextCaption)}
              tone={tone}
              loading={loading}
            />
          </div>
        </div>
      </section>
      <Stats stats={stats} tone={tone} />
    </>
  );
}
