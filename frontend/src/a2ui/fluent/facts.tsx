"use client";

import { useState } from "react";
import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  Caption1,
  makeStyles,
  mergeClasses,
  Text,
  Title3,
  tokens,
} from "@fluentui/react-components";

import {
  BLEED,
  Glyph,
  TONES,
  type Tone,
  hasIcon,
  num,
  record,
  records,
  str,
  useTone,
  wash,
} from "./tone";

type Shape =
  | {
      kind: "range";
      lo: number;
      hi: number;
      at: number;
      ends?: [string, string];
    }
  | { kind: "meter"; pct: number }
  | { kind: "gap"; lo: number; hi: number; from: number; to: number }
  | {
      kind: "day";
      rise: number;
      set: number;
      now: number;
      ends?: [string, string];
    }
  | { kind: "parts"; parts: number[]; labels: string[] }
  | { kind: "slots"; values: number[]; labels: string[] };

type Fact = {
  id?: string;
  key: string;
  label: string;
  value: string;
  unit?: string;
  note?: string;
  noteTone?: "up" | "down";
  icon?: string;
  bearing?: number;
  shape?: Shape;
};

const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value));
const finite = (value: unknown) => num(value);
const nonEmpty = (value: unknown) => str(value).trim();
const pct = (value: number, lo: number, hi: number) =>
  hi === lo ? 50 : clamp(((value - lo) / (hi - lo)) * 100);
const keyOf = (value: string) => value.trim().toLowerCase();
const bool = (value: unknown) =>
  value === true ||
  (typeof value === "string" && value.toLowerCase() === "true");

const useStyles = makeStyles({
  head: {
    padding: "var(--jev-pad-y) var(--jev-pad-x)",
    display: "grid",
    rowGap: "20px",
  },
  lead: { margin: 0, textWrap: "pretty" },
  muted: { color: tokens.colorNeutralForeground3 },
  secondary: { color: tokens.colorNeutralForeground2 },
  up: { color: tokens.colorPaletteGreenForeground1 },
  down: { color: tokens.colorPaletteRedForeground1 },
  num: { fontVariantNumeric: "tabular-nums" },
  growX: {
    transformOrigin: "0 50%",
    "@media (prefers-reduced-motion: no-preference)": {
      animationName: {
        from: { transform: "scaleX(0)" },
        to: { transform: "scaleX(1)" },
      },
      animationDuration: "700ms",
      animationTimingFunction: tokens.curveDecelerateMid,
      animationFillMode: "both",
    },
  },
  growY: {
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
});

function parsePair(value: unknown): [string, string] | undefined {
  return Array.isArray(value) && value.length >= 2
    ? [nonEmpty(value[0]), nonEmpty(value[1])]
    : undefined;
}

function parseShape(value: unknown): Shape | undefined {
  const shape = record<Record<string, unknown>>(value);
  if (!shape) return undefined;
  if (shape.kind === "meter") {
    const p = finite(shape.pct);
    return p === null ? undefined : { kind: "meter", pct: clamp(p) };
  }
  if (shape.kind === "range") {
    const lo = finite(shape.lo);
    const hi = finite(shape.hi);
    const at = finite(shape.at);
    return lo === null || hi === null || at === null
      ? undefined
      : { kind: "range", lo, hi, at, ends: parsePair(shape.ends) };
  }
  if (shape.kind === "gap") {
    const lo = finite(shape.lo);
    const hi = finite(shape.hi);
    const from = finite(shape.from);
    const to = finite(shape.to);
    return lo === null || hi === null || from === null || to === null
      ? undefined
      : { kind: "gap", lo, hi, from, to };
  }
  if (shape.kind === "day") {
    const rise = finite(shape.rise);
    const set = finite(shape.set);
    const now = finite(shape.now);
    return rise === null || set === null || now === null
      ? undefined
      : { kind: "day", rise, set, now, ends: parsePair(shape.ends) };
  }
  if (shape.kind === "parts" && Array.isArray(shape.parts)) {
    const parts = shape.parts.flatMap((part) => {
      const valueNum = finite(part);
      return valueNum === null || valueNum <= 0 ? [] : [valueNum];
    });
    const labels = Array.isArray(shape.labels)
      ? shape.labels.map((label) => nonEmpty(label)).filter(Boolean)
      : [];
    return parts.length ? { kind: "parts", parts, labels } : undefined;
  }
  if (shape.kind === "slots" && Array.isArray(shape.values)) {
    const values = shape.values.flatMap((slot) => {
      const valueNum = finite(slot);
      return valueNum === null ? [] : [clamp(valueNum)];
    });
    const labels = Array.isArray(shape.labels)
      ? shape.labels.map((label) => nonEmpty(label)).filter(Boolean)
      : [];
    return values.length ? { kind: "slots", values, labels } : undefined;
  }
  return undefined;
}

function parseFacts(value: unknown): Fact[] {
  return records<Record<string, unknown>>(value).flatMap((item, index) => {
    const label = nonEmpty(item.label);
    const factValue = nonEmpty(item.value);
    if (!label || !factValue) return [];
    const id = nonEmpty(item.id) || undefined;
    const icon = nonEmpty(item.icon).toLowerCase();
    const bearing = finite(item.bearing);
    const noteTone = nonEmpty(item.noteTone);
    return [
      {
        id,
        key: id ?? `${label}-${index}`,
        label,
        value: factValue,
        unit: nonEmpty(item.unit) || undefined,
        note: nonEmpty(item.note) || undefined,
        noteTone:
          noteTone === "up" || noteTone === "down" ? noteTone : undefined,
        icon: hasIcon(icon) ? icon : undefined,
        bearing: bearing ?? undefined,
        shape: parseShape(item.shape),
      },
    ];
  });
}

function orderedFacts(
  items: Fact[],
  orderValue: unknown,
  featured: Fact | undefined,
) {
  const byKey = new Map<string, Fact>();
  items.forEach((item) => {
    if (item.id) byKey.set(keyOf(item.id), item);
    byKey.set(keyOf(item.label), item);
  });
  const used = new Set<Fact>();
  if (featured) used.add(featured);
  const ordered = records<unknown>(orderValue).flatMap((entry) => {
    const fact = byKey.get(keyOf(str(entry)));
    if (!fact || used.has(fact)) return [];
    used.add(fact);
    return [fact];
  });
  items.forEach((item) => {
    if (!used.has(item)) ordered.push(item);
  });
  return ordered;
}

function findFeatured(items: Fact[], value: unknown): Fact | undefined {
  const key = keyOf(str(value));
  return key
    ? items.find(
        (item) => keyOf(item.id ?? "") === key || keyOf(item.label) === key,
      )
    : undefined;
}

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

function ShapeView({
  shape,
  ink,
  big,
}: {
  shape: Shape;
  ink: string;
  big?: boolean;
}) {
  const styles = useStyles();
  if (shape.kind === "slots") {
    return (
      <>
        <span
          className={mergeClasses(
            styles.slots,
            big ? styles.slotsBig : styles.slotsSmall,
          )}
          role="img"
          aria-label={`Slots ${shape.values.join(", ")}`}
        >
          {shape.values.map((value, i) => (
            <span key={i} className={styles.slot}>
              {big ? (
                <Caption1 className={styles.num} style={{ color: ink }}>
                  {value}%
                </Caption1>
              ) : (
                <span />
              )}
              <span
                className={mergeClasses(styles.slotBar, styles.growY)}
                style={{
                  height: `${Math.max(value, 3)}%`,
                  backgroundColor: ink,
                  opacity: value ? 0.35 + (value / 100) * 0.65 : 0.25,
                  animationDelay: `${i * 70}ms`,
                }}
              />
            </span>
          ))}
        </span>
        {big && shape.labels.length ? (
          <span className={styles.slotLabels} aria-hidden>
            {shape.labels.map((label) => (
              <Caption1 key={label}>{label}</Caption1>
            ))}
          </span>
        ) : null}
      </>
    );
  }
  if (shape.kind === "parts") {
    const total = shape.parts.reduce((a, b) => a + b, 0);
    return (
      <>
        <span
          className={mergeClasses(
            styles.parts,
            big ? styles.partsBig : styles.small,
          )}
          role="img"
          aria-label={`Parts ${shape.parts.join(", ")}`}
        >
          {shape.parts.map((value, i) => (
            <span
              key={i}
              className={mergeClasses(styles.part, styles.growX)}
              style={{
                flexGrow: total ? value / total : 1,
                backgroundColor: ink,
                opacity: i ? 0.4 : 1,
                animationDelay: `${i * 120}ms`,
              }}
            />
          ))}
        </span>
        {big && shape.labels.length ? (
          <span className={styles.legend}>
            {shape.labels.map((label, i) => (
              <Caption1 key={label}>
                <span
                  className={styles.swatch}
                  style={{ backgroundColor: ink, opacity: i ? 0.4 : 1 }}
                />
                {label}
              </Caption1>
            ))}
          </span>
        ) : null}
      </>
    );
  }
  if (shape.kind === "day") {
    const at = (hour: number) => `${(clamp(hour, 0, 24) / 24) * 100}%`;
    return (
      <>
        <span
          className={mergeClasses(
            styles.sky,
            big ? undefined : styles.skySmall,
          )}
          role="img"
          aria-label={`Daylight from ${shape.rise} to ${shape.set}; now ${shape.now}.`}
        >
          <Glyph name="sun" size={16} color={ink} className={styles.icon} />
          <span className={mergeClasses(styles.bar, big && styles.barBig)}>
            <span
              className={mergeClasses(styles.fill, styles.growX)}
              style={{
                left: at(shape.rise),
                width: at(shape.set - shape.rise),
                backgroundColor: ink,
                opacity: 0.45,
              }}
            />
            <span className={styles.now} style={{ left: at(shape.now) }} />
          </span>
          <Glyph name="moon" size={16} color={ink} className={styles.icon} />
        </span>
        {big && shape.ends ? (
          <span className={styles.ends}>
            <Caption1>{shape.ends[0]}</Caption1>
            <Caption1>{shape.ends[1]}</Caption1>
          </span>
        ) : shape.ends ? (
          <Caption1 className={styles.muted}>
            {shape.ends[0]} to {shape.ends[1]}
          </Caption1>
        ) : null}
      </>
    );
  }
  const shell = mergeClasses(styles.bar, big ? styles.barBig : styles.small);
  if (shape.kind === "meter") {
    return (
      <span className={shell} role="img" aria-label={`${shape.pct}%`}>
        <span
          className={mergeClasses(styles.fill, styles.growX)}
          style={{ width: `${shape.pct}%`, backgroundColor: ink }}
        />
      </span>
    );
  }
  if (shape.kind === "gap") {
    const from = pct(shape.from, shape.lo, shape.hi);
    const to = pct(shape.to, shape.lo, shape.hi);
    return (
      <span
        className={shell}
        role="img"
        aria-label={`Gap from ${shape.from} to ${shape.to}`}
      >
        <span
          className={mergeClasses(styles.fill, styles.growX)}
          style={{
            left: `${Math.min(from, to)}%`,
            width: `${Math.abs(to - from)}%`,
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
      <span
        className={shell}
        role="img"
        aria-label={`${shape.at} between ${shape.lo} and ${shape.hi}`}
      >
        <span
          className={mergeClasses(styles.fill, styles.growX)}
          style={{ width: "100%", backgroundColor: ink, opacity: 0.3 }}
        />
        <span
          className={mergeClasses(styles.mark, big && styles.markBig)}
          style={{
            left: `${pct(shape.at, shape.lo, shape.hi)}%`,
            backgroundColor: ink,
          }}
        />
      </span>
      {big && shape.ends ? (
        <span className={styles.ends}>
          <Caption1>{shape.ends[0]}</Caption1>
          <Caption1>{shape.ends[1]}</Caption1>
        </span>
      ) : null}
    </>
  );
}

function Featured({ fact, ink }: { fact: Fact; ink: string }) {
  const styles = useStyles();
  const words = /[a-z]{3}/i.test(fact.value);
  return (
    <div className={styles.feature}>
      {fact.bearing !== undefined ? (
        <Bearing deg={fact.bearing} ink={ink} size={56} />
      ) : fact.icon ? (
        <Glyph
          name={fact.icon}
          size={56}
          color={ink}
          className={styles.heroIcon}
        />
      ) : (
        <span />
      )}
      <div className={styles.figure}>
        <Caption1 className={styles.secondary}>{fact.label}</Caption1>
        <span className={mergeClasses(styles.big, words && styles.bigWords)}>
          {fact.value}
          {fact.unit ? <span className={styles.unit}>{fact.unit}</span> : null}
        </span>
        {fact.note ? (
          <Caption1
            className={fact.noteTone ? styles[fact.noteTone] : styles.secondary}
          >
            {fact.note}
          </Caption1>
        ) : null}
      </div>
      {fact.shape ? (
        <div className={styles.wide}>
          <ShapeView shape={fact.shape} ink={ink} big />
        </div>
      ) : null}
    </div>
  );
}

function Cell({ fact, ink }: { fact: Fact; ink: string }) {
  const styles = useStyles();
  return (
    <div className={styles.cell}>
      <dt className={styles.label}>
        {fact.bearing !== undefined ? (
          <Bearing deg={fact.bearing} ink={ink} />
        ) : fact.icon ? (
          <Glyph
            name={fact.icon}
            size={16}
            color={ink}
            className={styles.icon}
          />
        ) : null}
        <Caption1>{fact.label}</Caption1>
      </dt>
      <dd className={styles.dd}>
        <span className={styles.value}>
          {fact.value}
          {fact.unit}
        </span>
        {fact.shape ? <ShapeView shape={fact.shape} ink={ink} /> : null}
        {fact.note ? (
          <Caption1
            className={fact.noteTone ? styles[fact.noteTone] : styles.secondary}
          >
            {fact.note}
          </Caption1>
        ) : null}
      </dd>
    </div>
  );
}

export function FactsView(props: {
  items?: unknown;
  title?: unknown;
  tone?: unknown;
  featured?: unknown;
  order?: unknown;
  more?: unknown;
  collapsed?: unknown;
}) {
  const styles = useStyles();
  const tone: Tone = useTone(props.tone);
  const { ink } = TONES[tone];
  const items = parseFacts(props.items);
  const [open, setOpen] = useState(!bool(props.collapsed));
  if (!items.length) return null;
  const title = nonEmpty(props.title);
  const featured = findFeatured(items, props.featured);
  const showHead = Boolean(title || featured);
  const ranked = orderedFacts(items, props.order, featured);
  const more = nonEmpty(props.more) || "More readings";
  const preview = ranked
    .slice(0, 3)
    .map((fact) => `${fact.label} ${fact.value}${fact.unit ?? ""}`)
    .join(" · ");
  return (
    <>
      {showHead ? (
        <section
          className={mergeClasses(BLEED, styles.head)}
          style={{ backgroundColor: wash(tone) }}
        >
          {title ? (
            <Title3 as="h2" className={styles.lead}>
              {title}
            </Title3>
          ) : null}
          {featured ? <Featured fact={featured} ink={ink} /> : null}
        </section>
      ) : null}
      {ranked.length ? (
        <Accordion
          collapsible
          className={styles.fold}
          openItems={open ? ["facts"] : []}
          onToggle={() => setOpen((current) => !current)}
        >
          <AccordionItem value="facts">
            <AccordionHeader expandIconPosition="end">
              <span className={styles.foldHead}>
                <Text weight="semibold">{more}</Text>
                <Caption1 className={styles.muted}>{ranked.length}</Caption1>
                {open ? null : (
                  <Caption1 className={styles.preview}>{preview}</Caption1>
                )}
              </span>
            </AccordionHeader>
            <AccordionPanel className={styles.panel}>
              <dl className={styles.grid}>
                {ranked.map((fact) => (
                  <Cell key={fact.key} fact={fact} ink={ink} />
                ))}
              </dl>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      ) : null}
    </>
  );
}
