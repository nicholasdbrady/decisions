"use client";

import {
  Caption1,
  Text,
  makeStyles,
  mergeClasses,
  tokens,
} from "@fluentui/react-components";

import { records, str, num, useTone, wash } from "./tone";

type RankedItemInput = {
  label?: unknown;
  value?: unknown;
  sub?: unknown;
  delta?: unknown;
  bar?: unknown;
};

type RankedItem = {
  label: string;
  value: string;
  sub: string;
  delta: number | null;
  bar: number | null;
};

const motion = {
  animationDuration: "700ms",
  animationTimingFunction: tokens.curveDecelerateMid,
  animationFillMode: "both",
} as const;

const useStyles = makeStyles({
  bars: {
    margin: 0,
    padding: 0,
    listStyle: "none",
    display: "grid",
    rowGap: "6px",
  },
  barRow: {
    position: "relative",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    columnGap: "12px",
    alignItems: "center",
    minHeight: "48px",
    padding: "6px 12px",
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground3,
    overflow: "hidden",
  },
  barFill: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    transformOrigin: "0 50%",
    "@media (prefers-reduced-motion: no-preference)": {
      ...motion,
      animationName: {
        from: { transform: "scaleX(0)" },
        to: { transform: "scaleX(1)" },
      },
    },
  },
  barText: { position: "relative", display: "grid", minWidth: 0 },
  barValue: { position: "relative" },
  secondary: { color: tokens.colorNeutralForeground2 },
  num: { fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" },
  up: { color: tokens.colorPaletteGreenForeground1 },
  down: { color: tokens.colorPaletteRedForeground1 },
});

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function parseItems(value: unknown): RankedItem[] {
  return records<RankedItemInput>(value)
    .map((item) => {
      const label = str(item.label);
      const itemValue = str(item.value);
      if (!label || !itemValue) return null;
      const bar = num(item.bar);
      return {
        label,
        value: itemValue,
        sub: str(item.sub),
        delta: num(item.delta),
        bar: bar === null ? null : clamp(bar, 0, 1),
      };
    })
    .filter((item): item is RankedItem => item !== null);
}

function Value({ item }: { item: RankedItem }) {
  const styles = useStyles();
  const tone =
    item.delta === null ? undefined : item.delta >= 0 ? styles.up : styles.down;
  return (
    <Text weight="semibold" className={mergeClasses(styles.num, tone)}>
      {item.value}
    </Text>
  );
}

export function RankedView(props: { items?: unknown; tone?: unknown }) {
  const styles = useStyles();
  const tone = useTone(props.tone);
  const items = parseItems(props.items);

  if (items.length === 0) return null;

  return (
    <ol className={styles.bars}>
      {items.map((item, index) => (
        <li key={`${item.label}-${index}`} className={styles.barRow}>
          {item.bar !== null ? (
            <span
              aria-hidden
              className={styles.barFill}
              style={{
                width: `${item.bar * 100}%`,
                backgroundColor: wash(tone, index === 0 ? 26 : 16),
                animationDelay: `${index * 80}ms`,
              }}
            />
          ) : null}
          <span className={styles.barText}>
            <Text weight="semibold">{item.label}</Text>
            {item.sub ? (
              <Caption1 className={styles.secondary}>{item.sub}</Caption1>
            ) : null}
          </span>
          <span className={styles.barValue}>
            <Value item={item} />
          </span>
        </li>
      ))}
    </ol>
  );
}
