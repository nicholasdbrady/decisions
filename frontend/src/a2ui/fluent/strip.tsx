"use client";

import {
  Caption1,
  makeStyles,
  mergeClasses,
  Skeleton,
  SkeletonItem,
  Text,
  tokens,
} from "@fluentui/react-components";

import {
  Glyph,
  TONES,
  records,
  str,
  num,
  toneOf,
  useTone,
  wash,
  type Tone,
} from "./tone";

type FlagInput = { text?: unknown; tone?: unknown; icon?: unknown };
type StripItemInput = {
  label?: unknown;
  value?: unknown;
  sub?: unknown;
  icon?: unknown;
  delta?: unknown;
  lo?: unknown;
  hi?: unknown;
  at?: unknown;
  current?: unknown;
  flag?: unknown;
};

type Flag = { text: string; tone: Tone; icon: string };
type StripItem = {
  label: string;
  value: string;
  sub: string;
  icon: string;
  delta: number | null;
  lo: number | null;
  hi: number | null;
  at: number | null;
  current: boolean;
  flag: Flag | null;
};

const motion = {
  animationDuration: "700ms",
  animationTimingFunction: tokens.curveDecelerateMid,
  animationFillMode: "both",
} as const;

const useStyles = makeStyles({
  root: {
    minWidth: 0,
  },
  muted: { color: tokens.colorNeutralForeground3 },
  secondary: { color: tokens.colorNeutralForeground2 },
  num: { fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" },
  up: { color: tokens.colorPaletteGreenForeground1 },
  down: { color: tokens.colorPaletteRedForeground1 },
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
  pop: {
    "@media (prefers-reduced-motion: no-preference)": {
      ...motion,
      animationName: {
        from: { opacity: 0, transform: "scale(0.4)" },
        to: { opacity: 1, transform: "scale(1)" },
      },
    },
  },
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
  icon: { width: "24px", height: "24px", flexShrink: 0 },
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
  track: {
    position: "relative",
    justifySelf: "stretch",
    height: "4px",
    margin: "0 8px",
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
    width: "10px",
    height: "10px",
    margin: "-5px 0 0 -5px",
    borderRadius: tokens.borderRadiusCircular,
    boxShadow: `0 0 0 2px ${tokens.colorNeutralBackground1}`,
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
  skeleton: {
    minHeight: "168px",
    borderRadius: tokens.borderRadiusLarge,
  },
});

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function pct(value: number, [low, high]: [number, number]) {
  if (high === low) return 50;
  return clamp(((value - low) / (high - low)) * 100, 0, 100);
}

function parseFlag(value: unknown, fallbackTone: Tone): Flag | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const flag = value as FlagInput;
  const text = str(flag.text);
  if (!text) return null;
  const tone = toneOf(flag.tone) ?? fallbackTone;
  return { text, tone, icon: str(flag.icon) || TONES[tone].icon };
}

function parseItems(value: unknown, tone: Tone): StripItem[] {
  return records<StripItemInput>(value)
    .map((item) => {
      const label = str(item.label);
      const itemValue = str(item.value);
      if (!label || !itemValue) return null;
      return {
        label,
        value: itemValue,
        sub: str(item.sub),
        icon: str(item.icon),
        delta: num(item.delta),
        lo: num(item.lo),
        hi: num(item.hi),
        at: num(item.at),
        current:
          item.current === true || str(item.current).toLowerCase() === "true",
        flag: parseFlag(item.flag, tone),
      };
    })
    .filter((item): item is StripItem => item !== null);
}

function parseScale(
  value: unknown,
  items: StripItem[],
): [number, number] | null {
  const scale = records<unknown>(value)
    .map(num)
    .filter((entry): entry is number => entry !== null);
  if (scale.length >= 2 && scale[0] !== scale[1])
    return [Math.min(scale[0], scale[1]), Math.max(scale[0], scale[1])];

  const values = items
    .flatMap((item) => [item.lo, item.hi, item.at])
    .filter((entry): entry is number => entry !== null);
  if (values.length === 0) return null;
  const low = Math.min(...values);
  const high = Math.max(...values);
  return low === high ? [low - 1, high + 1] : [low, high];
}

function Sub({ item }: { item: StripItem }) {
  const styles = useStyles();
  if (!item.sub) return null;
  const tone =
    item.delta === null
      ? styles.muted
      : item.delta >= 0
        ? styles.up
        : styles.down;
  return (
    <Caption1 className={mergeClasses(styles.num, tone)}>{item.sub}</Caption1>
  );
}

function FlagMark({ flag }: { flag: Flag }) {
  const styles = useStyles();
  const { tint, ink } = TONES[flag.tone];
  return (
    <span className={styles.flag} style={{ backgroundColor: tint, color: ink }}>
      <Glyph name={flag.icon} size={12} />
      {flag.text}
    </span>
  );
}

function PendingTile() {
  const styles = useStyles();
  return (
    <li aria-hidden>
      <Skeleton>
        <SkeletonItem className={styles.skeleton} />
      </Skeleton>
    </li>
  );
}

export function StripView(props: {
  items?: unknown;
  scale?: unknown;
  tone?: unknown;
}) {
  const styles = useStyles();
  const tone = useTone(props.tone);
  const items = parseItems(props.items, tone);
  const scale = parseScale(props.scale, items);
  const { ink } = TONES[tone];
  const soft = `color-mix(in srgb, ${ink} 42%, ${tokens.colorNeutralBackground1})`;

  if (items.length === 0) return null;

  return (
    <div className={styles.root}>
      <ol className={styles.tiles}>
        {items.map((item, index) => {
          const left =
            scale !== null && item.lo !== null ? pct(item.lo, scale) : 0;
          const right =
            scale !== null && item.hi !== null ? pct(item.hi, scale) : 0;
          const hasSpan =
            scale !== null && item.lo !== null && item.hi !== null;
          const spanLeft = Math.min(left, right);
          const spanWidth = Math.abs(right - left);
          const point =
            scale !== null && item.at !== null ? pct(item.at, scale) : null;

          return (
            <li
              key={`${item.label}-${index}`}
              className={styles.tile}
              style={item.current ? { backgroundColor: wash(tone) } : undefined}
              aria-current={item.current ? "true" : undefined}
            >
              <Text
                size={200}
                className={item.current ? undefined : styles.secondary}
                weight={item.current ? "semibold" : "regular"}
              >
                {item.label}
              </Text>
              {item.icon ? (
                <Glyph
                  name={item.icon}
                  size={24}
                  color={item.flag ? ink : tokens.colorNeutralForeground2}
                  className={styles.icon}
                />
              ) : (
                <span />
              )}
              <span className={styles.tileValue}>{item.value}</span>
              {item.sub ? <Sub item={item} /> : <span />}
              <span className={styles.track} aria-hidden>
                {hasSpan ? (
                  <span
                    className={mergeClasses(styles.trackBar, styles.growX)}
                    style={{
                      left: `${spanLeft}%`,
                      width: `${spanWidth}%`,
                      backgroundColor: item.current ? ink : soft,
                      animationDelay: `${index * 70}ms`,
                    }}
                  />
                ) : null}
                {point !== null && (!hasSpan || item.current) ? (
                  <span
                    className={mergeClasses(styles.trackDot, styles.pop)}
                    style={{
                      left: `${point}%`,
                      backgroundColor: hasSpan
                        ? tokens.colorNeutralForeground1
                        : item.current
                          ? ink
                          : soft,
                      animationDelay: `${index * 70 + 200}ms`,
                    }}
                  />
                ) : null}
              </span>
              {item.flag ? <FlagMark flag={item.flag} /> : <span />}
            </li>
          );
        })}
        {items.length === 1 ? <PendingTile /> : null}
      </ol>
    </div>
  );
}
