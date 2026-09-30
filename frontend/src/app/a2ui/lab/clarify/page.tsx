"use client";

import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
import {
  Body1,
  Button,
  Caption1,
  Card,
  Input,
  Label,
  makeStyles,
  mergeClasses,
  shorthands,
  MessageBar,
  MessageBarBody,
  Skeleton,
  SkeletonItem,
  Spinner,
  Tab,
  TabList,
  Tag,
  Text,
  Title2,
  Title3,
  tokens,
} from "@fluentui/react-components";
import {
  ArrowRight20Regular,
  ArrowUndo16Regular,
  Checkmark16Regular,
  Clock24Regular,
  Globe20Regular,
  Search20Regular,
} from "@fluentui/react-icons";

import { FluentRoot } from "@/fluent/root";

/**
 * Clarify lab: ChoicePicker, TextField and Button. The case is the real gate
 * from `time_between`: "what time is it over there right now" never names a
 * place, JEV was 57% sure (the floor is 75%), and it ranked New York 49%,
 * London 30%, Tokyo 7%. The rest fill from the registry with no share. The
 * answer after a pick is computed live in this browser with `Intl`, as
 * `zoneinfo` does on the server.
 */

/** The `CITIES` closed set from `capabilities/clock.py`. */
const CITIES: Record<string, [string, string]> = {
  seattle: ["Seattle / Redmond / Bellevue, Washington", "America/Los_Angeles"],
  san_francisco: [
    "San Francisco or the Bay Area, California",
    "America/Los_Angeles",
  ],
  los_angeles: ["Los Angeles or San Diego, California", "America/Los_Angeles"],
  denver: ["Denver or Salt Lake City", "America/Denver"],
  chicago: ["Chicago, Dallas, Austin, or Houston", "America/Chicago"],
  new_york: [
    "New York, Boston, Atlanta, Miami, or Toronto",
    "America/New_York",
  ],
  mexico_city: ["Mexico City", "America/Mexico_City"],
  sao_paulo: ["Sao Paulo or Rio de Janeiro", "America/Sao_Paulo"],
  london: ["London, Dublin, Manchester, or Edinburgh", "Europe/London"],
  paris: ["Paris, Madrid, Barcelona, Rome, or Amsterdam", "Europe/Paris"],
  berlin: ["Berlin, Munich, Zurich, Vienna, or Stockholm", "Europe/Berlin"],
  athens: ["Athens, Helsinki, or Kyiv", "Europe/Athens"],
  moscow: ["Moscow or Saint Petersburg", "Europe/Moscow"],
  dubai: ["Dubai or Abu Dhabi", "Asia/Dubai"],
  mumbai: ["Mumbai, Delhi, Bangalore, or anywhere in India", "Asia/Kolkata"],
  singapore: ["Singapore or Kuala Lumpur", "Asia/Singapore"],
  hong_kong: ["Hong Kong, Shenzhen, Beijing, or Shanghai", "Asia/Hong_Kong"],
  tokyo: ["Tokyo, Osaka, or anywhere in Japan", "Asia/Tokyo"],
  seoul: ["Seoul", "Asia/Seoul"],
  sydney: ["Sydney, Brisbane, or Canberra", "Australia/Sydney"],
  melbourne: ["Melbourne", "Australia/Melbourne"],
  perth: ["Perth", "Australia/Perth"],
  auckland: ["Auckland or Wellington", "Pacific/Auckland"],
  johannesburg: ["Johannesburg or Cape Town", "Africa/Johannesburg"],
  lagos: ["Lagos", "Africa/Lagos"],
  cairo: ["Cairo", "Africa/Cairo"],
};

const HOME = "America/Los_Angeles";
const PROMPT = "what time is it over there right now";

type Place = { key: string; name: string; aliases: string; pct?: number };

const title = (key: string) =>
  key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const place = (key: string, pct?: number): Place => ({
  key,
  name: title(key),
  aliases: CITIES[key][0],
  pct,
});

/** `gate()` order: JEV's ranking first, then the registry, capped at six. */
const OPTIONS: Place[] = [
  place("new_york", 49),
  place("london", 30),
  place("tokyo", 7),
  place("seattle"),
  place("san_francisco"),
  place("los_angeles"),
];
const RANKED = OPTIONS.filter((o) => o.pct !== undefined);
const REST = OPTIONS.filter((o) => o.pct === undefined);
const ALL = Object.keys(CITIES).map(
  (k) => OPTIONS.find((o) => o.key === k) ?? place(k),
);

/** The resolver's first tier: a direct match on the key or any alias. */
function direct(typed: string): Place | undefined {
  const q = typed.trim().toLowerCase();
  if (q.length < 2) return undefined;
  return ALL.find(
    (p) =>
      p.key.replace(/_/g, " ") === q || p.aliases.toLowerCase().includes(q),
  );
}

function offset(now: Date, tz: string) {
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
  return (wall - Math.floor(now.getTime() / 60_000) * 60_000) / 3_600_000;
}

type Result = {
  lead: string;
  value: string;
  note: string;
  home: string;
  day: string;
  delta: string;
};

function timeIn(p: Place, now: Date): Result {
  const tz = CITIES[p.key][1];
  const fmt = (z: string, o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-US", { timeZone: z, ...o }).format(now);
  const hours = offset(now, tz) - offset(now, HOME);
  const amount = `${Math.abs(hours)} hour${Math.abs(hours) === 1 ? "" : "s"}`;
  return {
    lead:
      hours === 0
        ? `${p.name} is on the same clock.`
        : `${p.name} is ${amount} ${hours > 0 ? "ahead" : "behind"}.`,
    value: fmt(tz, { hour: "numeric", minute: "2-digit" }),
    note: fmt(tz, { weekday: "long", month: "short", day: "numeric" }),
    home: `Seattle ${fmt(HOME, { hour: "numeric", minute: "2-digit" })}`,
    day: fmt(tz, { weekday: "short" }),
    delta:
      hours === 0
        ? "Same clock"
        : `${Math.abs(hours)} h ${hours > 0 ? "ahead" : "behind"}`,
  };
}

/* ───────────────────────── The card's life ───────────────────────── */

type How = { kind: "pick" } | { kind: "typed"; text: string };
type Status =
  | { kind: "asking" }
  | { kind: "working"; place?: Place; how: How }
  | { kind: "done"; place: Place; how: How }
  | { kind: "declined"; text: string };

type Mode = "complete" | "streaming" | "submitted" | "declined";

const TOKYO = OPTIONS[2];
const UNKNOWN = "Reykjavik";

function initial(mode: Mode): Status {
  if (mode === "submitted")
    return { kind: "done", place: TOKYO, how: { kind: "pick" } };
  if (mode === "declined") return { kind: "declined", text: UNKNOWN };
  return { kind: "asking" };
}

/**
 * A pick re-dispatches in ~0.8 s (measured). A typed place that misses the
 * list goes on to JEV and then Luna with web search, which took 5–18 s in
 * measured runs; this lab shortens that wait to 2.4 s.
 */
function useClarify(mode: Mode) {
  const [status, setStatus] = useState<Status>(() => initial(mode));
  useEffect(() => {
    if (status.kind !== "working") return;
    const found = status.place;
    const id = window.setTimeout(
      () =>
        setStatus(
          found
            ? { kind: "done", place: found, how: status.how }
            : {
                kind: "declined",
                text: status.how.kind === "typed" ? status.how.text : "",
              },
        ),
      found ? 800 : 2400,
    );
    return () => window.clearTimeout(id);
  }, [status]);
  return {
    status,
    pick: (p: Place) =>
      setStatus({ kind: "working", place: p, how: { kind: "pick" } }),
    type: (text: string) =>
      setStatus({
        kind: "working",
        place: direct(text),
        how: { kind: "typed", text: text.trim() },
      }),
    reset: () => setStatus({ kind: "asking" }),
  };
}

type Clarify = ReturnType<typeof useClarify>;

/* ───────────────────────────── Styles ───────────────────────────── */

const ink = tokens.colorPaletteLavenderForeground2;
const tint = tokens.colorPaletteLavenderBackground2;
const wash = `color-mix(in srgb, ${ink} 9%, ${tokens.colorNeutralBackground1})`;

const rise = {
  animationDuration: "500ms",
  animationTimingFunction: tokens.curveDecelerateMid,
  animationFillMode: "both",
  animationName: {
    from: { opacity: 0, transform: "translateY(4px)" },
    to: { opacity: 1, transform: "translateY(0)" },
  },
} as const;

const focusRing = {
  outlineStyle: "solid",
  outlineWidth: "2px",
  outlineColor: tokens.colorStrokeFocus2,
  outlineOffset: "2px",
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
  wrap: { flexWrap: "wrap", flexShrink: 1, minWidth: 0 },
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

  card: { padding: 0, rowGap: 0, overflow: "hidden" },
  section: {
    padding: "24px",
    display: "grid",
    rowGap: "20px",
    "@media (max-width: 480px)": { padding: "20px 16px" },
  },
  sectionTop: { paddingBottom: "20px" },
  band: { backgroundColor: wash },
  head: { display: "grid", rowGap: "4px" },
  lead: { margin: 0, textWrap: "balance" },
  group: { display: "grid", rowGap: "8px" },
  groupLabel: { color: tokens.colorNeutralForeground2 },
  arrive: { "@media (prefers-reduced-motion: no-preference)": rise },

  // A · Ranked rows.
  rows: {
    margin: 0,
    padding: 0,
    listStyle: "none",
    display: "grid",
    rowGap: "6px",
  },
  row: {
    width: "100%",
    minHeight: "48px",
    display: "grid",
    gridTemplateColumns: "minmax(88px, 9rem) minmax(0, 1fr) 3.5ch",
    alignItems: "center",
    columnGap: "16px",
    padding: "0 16px",
    ...shorthands.borderStyle("none"),
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    fontFamily: tokens.fontFamilyBase,
    fontSize: tokens.fontSizeBase300,
    textAlign: "start",
    cursor: "pointer",
    boxShadow: tokens.shadow2,
    transitionProperty: "box-shadow, transform",
    transitionDuration: tokens.durationFaster,
    transitionTimingFunction: tokens.curveEasyEase,
    ":hover": { boxShadow: tokens.shadow8 },
    ":active": { transform: "scale(0.995)" },
    ":focus-visible": focusRing,
    ":disabled": { cursor: "default", boxShadow: "none" },
    "@media (max-width: 480px)": {
      gridTemplateColumns: "minmax(0, 1fr) 3.5ch",
      rowGap: "6px",
      padding: "10px 14px",
    },
  },
  rowName: {
    fontWeight: tokens.fontWeightSemibold,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  track: {
    height: "6px",
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tint,
    overflow: "hidden",
    "@media (max-width: 480px)": { gridColumn: "1 / -1", gridRow: 2 },
  },
  fill: {
    display: "block",
    height: "100%",
    borderRadius: "inherit",
    backgroundColor: ink,
    transformOrigin: "left",
    "@media (prefers-reduced-motion: no-preference)": {
      animationDuration: "700ms",
      animationTimingFunction: tokens.curveDecelerateMax,
      animationFillMode: "both",
      animationName: {
        from: { transform: "scaleX(0)" },
        to: { transform: "scaleX(1)" },
      },
    },
  },
  pct: {
    justifySelf: "end",
    fontVariantNumeric: "tabular-nums",
    color: tokens.colorNeutralForeground2,
  },
  quiet: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  pill: {
    minHeight: "36px",
    padding: "0 14px",
    ...shorthands.borderStyle("none"),
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    fontFamily: tokens.fontFamilyBase,
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    fontVariantNumeric: "tabular-nums",
    display: "inline-flex",
    alignItems: "center",
    columnGap: "8px",
    cursor: "pointer",
    boxShadow: tokens.shadow2,
    transitionProperty: "box-shadow",
    transitionDuration: tokens.durationFaster,
    ":hover": { boxShadow: tokens.shadow8 },
    ":focus-visible": focusRing,
    ":disabled": { cursor: "default", boxShadow: "none" },
  },
  pillPct: {
    fontWeight: tokens.fontWeightRegular,
    color: tokens.colorNeutralForeground3,
  },

  // Custom input.
  other: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    columnGap: "8px",
    alignItems: "end",
  },
  otherField: { display: "grid", rowGap: "6px", minWidth: 0 },
  input: { width: "100%" },

  // D · Answer first.
  clock: {
    width: "100%",
    minHeight: "64px",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    alignItems: "center",
    columnGap: "16px",
    padding: "10px 16px",
    ...shorthands.borderStyle("none"),
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    fontFamily: tokens.fontFamilyBase,
    textAlign: "start",
    cursor: "pointer",
    boxShadow: tokens.shadow2,
    transitionProperty: "box-shadow, transform",
    transitionDuration: tokens.durationFaster,
    transitionTimingFunction: tokens.curveEasyEase,
    ":hover": { boxShadow: tokens.shadow8 },
    ":active": { transform: "scale(0.995)" },
    ":focus-visible": focusRing,
    ":disabled": { cursor: "default", boxShadow: "none" },
  },
  clockWho: { display: "grid", rowGap: "6px", minWidth: 0 },
  clockMeter: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 8rem) auto",
    alignItems: "center",
    columnGap: "8px",
  },
  clockTime: { display: "grid", justifyItems: "end", rowGap: "2px" },
  clockValue: {
    fontSize: tokens.fontSizeBase600,
    lineHeight: tokens.lineHeightBase600,
    fontWeight: tokens.fontWeightSemibold,
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
  },
  clockFirst: {
    minHeight: "88px",
    boxShadow: tokens.shadow4,
  },
  clockValueFirst: {
    fontSize: tokens.fontSizeHero700,
    lineHeight: tokens.lineHeightHero700,
    letterSpacing: "-0.02em",
    "@media (max-width: 480px)": {
      fontSize: tokens.fontSizeBase600,
      lineHeight: tokens.lineHeightBase600,
    },
  },

  // B · Best guess.
  guess: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    alignItems: "center",
    columnGap: "16px",
    rowGap: "12px",
    padding: "20px",
    borderRadius: tokens.borderRadiusXLarge,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow4,
    "@media (max-width: 480px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
      padding: "16px",
    },
  },
  guessText: { display: "grid", rowGap: "2px", minWidth: 0 },
  guessName: { margin: 0 },
  guessMeter: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 12rem) auto",
    alignItems: "center",
    columnGap: "10px",
    marginTop: "6px",
  },

  // C · Type first.
  search: { display: "grid", rowGap: "10px" },
  results: {
    margin: 0,
    padding: "6px",
    listStyle: "none",
    display: "grid",
    rowGap: "2px",
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow4,
  },
  result: {
    width: "100%",
    minHeight: "52px",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    alignItems: "center",
    columnGap: "16px",
    padding: "8px 12px",
    ...shorthands.borderStyle("none"),
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: "transparent",
    color: tokens.colorNeutralForeground1,
    fontFamily: tokens.fontFamilyBase,
    fontSize: tokens.fontSizeBase300,
    textAlign: "start",
    cursor: "pointer",
    ":hover": { backgroundColor: tokens.colorNeutralBackground1Hover },
    ":focus-visible": focusRing,
    ":disabled": { cursor: "default" },
  },
  resultText: { display: "grid", minWidth: 0 },
  resultAlias: {
    color: tokens.colorNeutralForeground3,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  mark: {
    backgroundColor: tint,
    color: "inherit",
    borderRadius: tokens.borderRadiusSmall,
    padding: "0 1px",
  },
  mini: {
    display: "grid",
    gridTemplateColumns: "48px 3.5ch",
    alignItems: "center",
    columnGap: "8px",
  },
  lookup: { color: ink },

  // Answer after a pick.
  answer: {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr)",
    columnGap: "16px",
    alignItems: "center",
  },
  heroIcon: {
    width: "48px",
    height: "48px",
    color: ink,
    "@media (max-width: 480px)": { width: "40px", height: "40px" },
  },
  figure: { display: "grid", rowGap: "2px", minWidth: 0 },
  big: {
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
  after: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "8px",
  },
  chip: {
    height: "28px",
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    ...shorthands.borderColor("transparent"),
    fontVariantNumeric: "tabular-nums",
  },
  chipIcon: { width: "16px", height: "16px", color: ink },
  working: {
    display: "flex",
    alignItems: "center",
    columnGap: "12px",
    minHeight: "48px",
  },
  skelRow: { width: "100%", height: "48px" },
  skelLine: { width: "60%", height: "16px" },
});

/* ───────────────────────────── Shared ───────────────────────────── */

function Head({ status, ask }: { status: Status; ask?: string }) {
  const styles = useStyles();
  const now = useNow();
  if (status.kind === "done" && now) {
    return (
      <div className={styles.head}>
        <Title3 as="h2" className={styles.lead}>
          {timeIn(status.place, now).lead}
        </Title3>
        <Caption1 className={styles.muted}>
          Time difference · computed now from this device’s clock
        </Caption1>
      </div>
    );
  }
  return (
    <div className={styles.head}>
      <Title3 as="h2" className={styles.lead}>
        {ask ?? "Which place do you want the time for?"}
      </Title3>
      <Caption1 className={styles.muted}>
        Time difference · the question didn’t name a place
      </Caption1>
    </div>
  );
}

function useNow() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 30_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, []);
  return now;
}

function Meter({ pct }: { pct: number }) {
  const styles = useStyles();
  return (
    <span className={styles.track} aria-hidden>
      <span className={styles.fill} style={{ width: `${Math.max(pct, 2)}%` }} />
    </span>
  );
}

/** The TextField plus Button pair: anything typed goes to the resolver. */
function Other({
  c,
  label,
  placeholder,
  initialText = "",
}: {
  c: Clarify;
  label: string;
  placeholder: string;
  initialText?: string;
}) {
  const styles = useStyles();
  const id = useId();
  const [text, setText] = useState(initialText);
  const busy = c.status.kind === "working";
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (text.trim()) c.type(text);
  };
  return (
    <form className={styles.other} onSubmit={submit}>
      <div className={styles.otherField}>
        <Label htmlFor={id} size="small" className={styles.groupLabel}>
          {label}
        </Label>
        <Input
          id={id}
          className={styles.input}
          value={text}
          placeholder={placeholder}
          disabled={busy}
          contentBefore={<Globe20Regular aria-hidden />}
          onChange={(_, d) => setText(d.value)}
        />
      </div>
      <Button
        type="submit"
        appearance="primary"
        disabled={busy || !text.trim()}
      >
        Use this
      </Button>
    </form>
  );
}

/** What a submit becomes: working, then the answer or an honest decline. */
function Outcome({ c, children }: { c: Clarify; children: ReactNode }) {
  const styles = useStyles();
  const now = useNow();
  const s = c.status;

  if (s.kind === "working") {
    const label = s.place
      ? `Getting the time in ${s.place.name}…`
      : `Looking up “${s.how.kind === "typed" ? s.how.text : ""}”…`;
    return (
      <div className={styles.working} role="status">
        <Spinner size="small" aria-hidden />
        <Text className={styles.secondary}>{label}</Text>
      </div>
    );
  }

  if (s.kind === "done" && now) {
    const r = timeIn(s.place, now);
    const how =
      s.how.kind === "typed"
        ? `You typed “${s.how.text}” → ${s.place.name}`
        : `You picked ${s.place.name}`;
    return (
      <div className={mergeClasses(styles.group, styles.arrive)} role="status">
        <div className={styles.answer}>
          <Clock24Regular aria-hidden className={styles.heroIcon} />
          <div className={styles.figure}>
            <span className={styles.big}>{r.value}</span>
            <Text className={styles.secondary}>{r.note}</Text>
          </div>
        </div>
        <div className={styles.after}>
          <Tag
            size="small"
            className={styles.chip}
            icon={
              <Checkmark16Regular aria-hidden className={styles.chipIcon} />
            }
          >
            {how}
          </Tag>
          <Tag size="small" className={styles.chip}>
            {r.home}
          </Tag>
          <Button
            size="small"
            appearance="transparent"
            icon={<ArrowUndo16Regular aria-hidden />}
            onClick={c.reset}
          >
            Change place
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {s.kind === "declined" ? (
        <MessageBar intent="warning" role="alert">
          <MessageBarBody>
            “{s.text}” is not a place this can compute yet. Pick one below, or
            type a nearby city.
          </MessageBarBody>
        </MessageBar>
      ) : null}
      {children}
    </>
  );
}

function Streaming({ rows = 3 }: { rows?: number }) {
  const styles = useStyles();
  return (
    <Skeleton aria-label="Loading choices" className={styles.group}>
      <SkeletonItem shape="rectangle" className={styles.skelLine} />
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonItem key={i} shape="rectangle" className={styles.skelRow} />
      ))}
    </Skeleton>
  );
}

function Shell({
  c,
  mode,
  ask,
  children,
}: {
  c: Clarify;
  mode: Mode;
  ask?: string;
  children: ReactNode;
}) {
  const styles = useStyles();
  return (
    <Card className={styles.card}>
      <div className={mergeClasses(styles.section, styles.sectionTop)}>
        <Head status={c.status} ask={ask} />
      </div>
      <div
        className={mergeClasses(styles.section, styles.band)}
        aria-busy={mode === "streaming" || c.status.kind === "working"}
      >
        {mode === "streaming" ? (
          <Streaming />
        ) : (
          <Outcome c={c}>{children}</Outcome>
        )}
      </div>
    </Card>
  );
}

/* ─────────────────────────── Directions ─────────────────────────── */

/** A · Ranked: the Ranked rows as one-tap choices, then the rest, then a field. */
function ClarifyRanked({ mode }: { mode: Mode }) {
  const styles = useStyles();
  const c = useClarify(mode);
  const typed = c.status.kind === "declined" ? c.status.text : "";
  return (
    <Shell c={c} mode={mode}>
      <div className={styles.group}>
        <Text size={200} className={styles.groupLabel}>
          Most likely
        </Text>
        <ul className={styles.rows}>
          {RANKED.map((o) => (
            <li key={o.key}>
              <button
                type="button"
                className={styles.row}
                onClick={() => c.pick(o)}
                aria-label={`${o.name}, ${o.pct}% likely`}
              >
                <span className={styles.rowName}>{o.name}</span>
                <Meter pct={o.pct!} />
                <Caption1 className={styles.pct}>{o.pct}%</Caption1>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className={styles.group}>
        <Text size={200} className={styles.groupLabel}>
          Also in the list
        </Text>
        <div className={styles.quiet}>
          {REST.map((o) => (
            <button
              key={o.key}
              type="button"
              className={styles.pill}
              onClick={() => c.pick(o)}
            >
              {o.name}
            </button>
          ))}
        </div>
      </div>
      <Other
        key={typed}
        c={c}
        label="Somewhere else"
        placeholder="Type any place, like Osaka or Reykjavik"
        initialText={typed}
      />
    </Shell>
  );
}

/** B · Best guess: confirm JEV’s top pick in one tap; the rest are pills. */
function ClarifyGuess({ mode }: { mode: Mode }) {
  const styles = useStyles();
  const c = useClarify(mode);
  const [top, ...others] = RANKED;
  const typed = c.status.kind === "declined" ? c.status.text : "";
  return (
    <Shell c={c} mode={mode}>
      <div className={styles.guess}>
        <div className={styles.guessText}>
          <Title2 as="p" className={styles.guessName}>
            {top.name}?
          </Title2>
          <Caption1 className={styles.secondary}>
            Best guess · {top.aliases}
          </Caption1>
          <span className={styles.guessMeter}>
            <Meter pct={top.pct!} />
            <Caption1 className={styles.pct}>{top.pct}% likely</Caption1>
          </span>
        </div>
        <Button
          appearance="primary"
          size="large"
          icon={<ArrowRight20Regular aria-hidden />}
          iconPosition="after"
          onClick={() => c.pick(top)}
        >
          Yes, {top.name}
        </Button>
      </div>
      <div className={styles.group}>
        <Text size={200} className={styles.groupLabel}>
          Or another place
        </Text>
        <div className={styles.quiet}>
          {[...others, ...REST].map((o) => (
            <button
              key={o.key}
              type="button"
              className={styles.pill}
              onClick={() => c.pick(o)}
            >
              {o.name}
              {o.pct !== undefined ? (
                <span className={styles.pillPct}>{o.pct}%</span>
              ) : null}
            </button>
          ))}
        </div>
      </div>
      <Other
        key={typed}
        c={c}
        label="Not listed?"
        placeholder="Type any place"
        initialText={typed}
      />
    </Shell>
  );
}

function Highlight({ text, query }: { text: string; query: string }) {
  const styles = useStyles();
  const q = query.trim().toLowerCase();
  const at = q.length >= 2 ? text.toLowerCase().indexOf(q) : -1;
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark className={styles.mark}>{text.slice(at, at + q.length)}</mark>
      {text.slice(at + q.length)}
    </>
  );
}

/** C · Type first: one field; JEV’s ranking is the empty state, aliases filter. */
function ClarifyType({ mode }: { mode: Mode }) {
  const styles = useStyles();
  const c = useClarify(mode);
  const id = useId();
  const [text, setText] = useState(
    c.status.kind === "declined" ? c.status.text : "",
  );
  const q = text.trim().toLowerCase();
  const matches = useMemo(
    () =>
      q.length < 2
        ? OPTIONS
        : ALL.filter(
            (p) =>
              p.name.toLowerCase().includes(q) ||
              p.aliases.toLowerCase().includes(q),
          ).slice(0, 6),
    [q],
  );
  const busy = c.status.kind === "working";
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (matches.length && q.length >= 2) c.pick(matches[0]);
    else if (q) c.type(text);
  };
  return (
    <Shell c={c} mode={mode}>
      <form className={styles.search} onSubmit={submit} role="search">
        <Label htmlFor={id} size="small" className={styles.groupLabel}>
          Type a place, or pick one
        </Label>
        <Input
          id={id}
          size="large"
          value={text}
          disabled={busy}
          placeholder="Tokyo, Osaka, Reykjavik…"
          contentBefore={<Search20Regular aria-hidden />}
          onChange={(_, d) => setText(d.value)}
          aria-describedby={`${id}-hint`}
        />
        <Caption1 id={`${id}-hint`} className={styles.muted}>
          {q.length < 2
            ? "Most likely first. Nearby cities count: “Osaka” finds Tokyo."
            : `${matches.length || "No"} match${matches.length === 1 ? "" : "es"} in the list`}
        </Caption1>
        <ul className={styles.results} aria-label="Places">
          {matches.map((p) => (
            <li key={p.key}>
              <button
                type="button"
                className={styles.result}
                onClick={() => c.pick(p)}
                disabled={busy}
              >
                <span className={styles.resultText}>
                  <Text weight="semibold">
                    <Highlight text={p.name} query={text} />
                  </Text>
                  <Caption1 className={styles.resultAlias}>
                    <Highlight text={p.aliases} query={text} />
                  </Caption1>
                </span>
                {p.pct !== undefined ? (
                  <span className={styles.mini}>
                    <Meter pct={p.pct} />
                    <Caption1 className={styles.pct}>{p.pct}%</Caption1>
                  </span>
                ) : null}
              </button>
            </li>
          ))}
          {q.length >= 2 && !matches.length ? (
            <li>
              <button type="submit" className={styles.result} disabled={busy}>
                <span className={styles.resultText}>
                  <Text weight="semibold" className={styles.lookup}>
                    Look up “{text.trim()}”
                  </Text>
                  <Caption1 className={styles.resultAlias}>
                    Not in the list. We’ll search for it.
                  </Caption1>
                </span>
                <ArrowRight20Regular aria-hidden className={styles.lookup} />
              </button>
            </li>
          ) : null}
        </ul>
      </form>
    </Shell>
  );
}

/**
 * D · Answer first: the time is free to compute, so the likeliest places each
 * show it now. A tap only settles which one; nothing waits on the question.
 */
function ClarifyAnswer({ mode }: { mode: Mode }) {
  const styles = useStyles();
  const c = useClarify(mode);
  const now = useNow();
  const typed = c.status.kind === "declined" ? c.status.text : "";
  return (
    <Shell
      c={c}
      mode={mode}
      ask="Which place did you mean? Here’s the time in each."
    >
      <div className={styles.group}>
        <Text size={200} className={styles.groupLabel}>
          The time now in the most likely places
        </Text>
        <ul className={styles.rows}>
          {RANKED.map((o, i) => {
            const r = now ? timeIn(o, now) : null;
            return (
              <li
                key={o.key}
                className={styles.arrive}
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <button
                  type="button"
                  className={mergeClasses(
                    styles.clock,
                    i === 0 && styles.clockFirst,
                  )}
                  onClick={() => c.pick(o)}
                  aria-label={`${o.name}, ${o.pct}% likely${r ? `, ${r.value} ${r.day}, ${r.delta}` : ""}`}
                >
                  <span className={styles.clockWho}>
                    <Text weight="semibold" size={i === 0 ? 500 : 400}>
                      {o.name}
                    </Text>
                    <span className={styles.clockMeter}>
                      <Meter pct={o.pct!} />
                      <Caption1 className={styles.pct}>{o.pct}%</Caption1>
                    </span>
                  </span>
                  <span className={styles.clockTime}>
                    <span
                      className={mergeClasses(
                        styles.clockValue,
                        i === 0 && styles.clockValueFirst,
                      )}
                    >
                      {r?.value ?? "—"}
                    </span>
                    <Caption1 className={styles.secondary}>
                      {r ? `${r.day} · ${r.delta}` : ""}
                    </Caption1>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <div className={styles.group}>
        <Text size={200} className={styles.groupLabel}>
          Also in the list
        </Text>
        <div className={styles.quiet}>
          {REST.map((o) => (
            <button
              key={o.key}
              type="button"
              className={styles.pill}
              onClick={() => c.pick(o)}
            >
              {o.name}
            </button>
          ))}
        </div>
      </div>
      <Other
        key={typed}
        c={c}
        label="Somewhere else"
        placeholder="Type any place, like Osaka or Reykjavik"
        initialText={typed}
      />
    </Shell>
  );
}

const VARIANTS = [
  {
    letter: "D",
    name: "Answer first",
    note: "The time is free to compute, so the likeliest places show it now. A tap only settles which one.",
    View: ClarifyAnswer,
  },
  {
    letter: "A",
    name: "Ranked",
    note: "The Ranked rows become one-tap choices with their likelihood; the rest are pills; a field takes anything.",
    View: ClarifyRanked,
  },
  {
    letter: "B",
    name: "Best guess",
    note: "Confirm the best guess in one tap. Everything else is a pill or typed.",
    View: ClarifyGuess,
  },
  {
    letter: "C",
    name: "Type first",
    note: "One field. The most likely places show before you type; aliases filter the full list.",
    View: ClarifyType,
  },
];

function Lab() {
  const styles = useStyles();
  const [mode, setMode] = useState<Mode>("complete");
  return (
    <main className={styles.page}>
      <header className={styles.intro}>
        <Title3 as="h1">Clarify</Title3>
        <Body1 className={styles.introText}>
          When JEV cannot read a required argument, the card asks instead of
          guessing. The choices are JEV’s own ranking; the field accepts
          anything, and a resolver places it afterward. Try the cards: a pick or
          a typed place runs the real flow.
        </Body1>
        <div className={styles.tabs}>
          <TabList
            className={styles.wrap}
            selectedValue={mode}
            onTabSelect={(_, d) => setMode(d.value as Mode)}
            aria-label="Card state"
          >
            <Tab value="complete">Complete</Tab>
            <Tab value="streaming">Streaming</Tab>
            <Tab value="submitted">Submitted</Tab>
            <Tab value="declined">Not found</Tab>
          </TabList>
        </div>
        <Caption1 className={styles.muted}>“{PROMPT}”</Caption1>
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
          <View key={mode} mode={mode} />
        </section>
      ))}
    </main>
  );
}

export default function ClarifyLabPage() {
  return (
    <FluentRoot>
      <Lab />
    </FluentRoot>
  );
}
