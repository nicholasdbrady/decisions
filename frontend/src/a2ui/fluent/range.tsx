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

import { TONES, num, str, useTone } from "./tone";

const motion = {
  animationDuration: "700ms",
  animationTimingFunction: tokens.curveDecelerateMid,
  animationFillMode: "both",
} as const;

const useStyles = makeStyles({
  root: {
    display: "grid",
    rowGap: "16px",
    minWidth: 0,
  },
  num: { fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" },
  muted: { color: tokens.colorNeutralForeground3 },
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
    height: "12px",
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorNeutralBackground5,
  },
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
    width: "20px",
    height: "20px",
    margin: "-10px 0 0 -10px",
    borderRadius: tokens.borderRadiusCircular,
    boxShadow: `0 0 0 3px ${tokens.colorNeutralBackground1}`,
  },
  railEnds: {
    display: "flex",
    justifyContent: "space-between",
    columnGap: "16px",
  },
  railEnd: { display: "grid", rowGap: "0" },
  railEndRight: { textAlign: "right" },
  skeleton: { display: "grid", rowGap: "12px" },
});

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function percent(value: number, low: number, high: number) {
  if (high === low) return 50;
  return clamp(((value - low) / (high - low)) * 100, 0, 100);
}

function formatNumber(value: number, digits: number | null, suffix: string) {
  const options =
    digits === null
      ? { maximumFractionDigits: 2 }
      : {
          minimumFractionDigits: Math.max(0, digits),
          maximumFractionDigits: Math.max(0, digits),
        };
  return `${value.toLocaleString(undefined, options)}${suffix}`;
}

function RangePending() {
  const styles = useStyles();
  return (
    <Skeleton aria-label="Loading range" className={styles.skeleton}>
      <SkeletonItem size={12} />
      <SkeletonItem size={16} style={{ width: "40%" }} />
    </Skeleton>
  );
}

export function RangeView(props: {
  low?: unknown;
  high?: unknown;
  value?: unknown;
  unit?: unknown;
  suffix?: unknown;
  digits?: unknown;
  lowLabel?: unknown;
  highLabel?: unknown;
  tone?: unknown;
  showValue?: unknown;
}) {
  const styles = useStyles();
  const tone = useTone(props.tone);
  const { ink } = TONES[tone];
  const low = num(props.low);
  const high = num(props.high);
  const value = num(props.value);
  const digitsRaw = num(props.digits);
  const digits =
    digitsRaw === null ? null : Math.max(0, Math.min(6, Math.trunc(digitsRaw)));
  const suffix = str(props.suffix);
  const unit = str(props.unit);
  const lowLabel = str(props.lowLabel) || "Low";
  const highLabel = str(props.highLabel) || "High";
  const showValue = props.showValue !== false;

  if (low === null || high === null || value === null) return <RangePending />;

  const at = percent(value, low, high);
  const format = (entry: number) => formatNumber(entry, digits, suffix);

  return (
    <div className={styles.root}>
      {showValue ? (
        <span className={styles.rangeBig}>
          {format(value)}
          {unit ? <span className={styles.unit}>{unit}</span> : null}
        </span>
      ) : null}
      <div className={styles.rail}>
        <span
          className={styles.railTrack}
          role="img"
          aria-label={`${format(value)}, ${Math.round(at)}% of the way from ${format(low)} to ${format(high)}`}
        >
          <span
            className={mergeClasses(styles.railFill, styles.growX)}
            style={{
              width: `${at}%`,
              backgroundColor: `color-mix(in srgb, ${ink} 45%, ${tokens.colorNeutralBackground1})`,
            }}
          />
          <span
            className={mergeClasses(styles.railMark, styles.pop)}
            style={{
              left: `clamp(10px, ${at}%, calc(100% - 10px))`,
              backgroundColor: ink,
              animationDelay: "400ms",
            }}
          />
        </span>
        <span className={styles.railEnds}>
          <span className={styles.railEnd}>
            <Text weight="semibold" className={styles.num}>
              {format(low)}
            </Text>
            <Caption1 className={styles.muted}>{lowLabel}</Caption1>
          </span>
          <span className={mergeClasses(styles.railEnd, styles.railEndRight)}>
            <Text weight="semibold" className={styles.num}>
              {format(high)}
            </Text>
            <Caption1 className={styles.muted}>{highLabel}</Caption1>
          </span>
        </span>
      </div>
    </div>
  );
}
