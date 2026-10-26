"use client";

import { useState } from "react";
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
import {
  FACTS,
  FactsCard,
  type FactsMode,
  type Tone,
  TONES,
  wash,
} from "./facts";

/**
 * Ranked and Facts lab. Every reading is real: Yahoo Finance for Sep 29, 2026,
 * our OpenWeather provider for Redmond at 3:49 PM PDT, and computed clocks and
 * a computed bill split. Tower heights are published structural heights.
 */

/** Ranked contract: `{ label, value, sub?, delta?, bar? }[]`, best first. */
type Row = {
  label: string;
  value: string;
  sub?: string;
  delta?: number;
  bar?: number;
};
type RankedReading = {
  id: string;
  name: string;
  prompt: string;
  lead: string;
  caption: string;
  tone: Tone;
  rows: Row[];
};

const RANKED: RankedReading[] = [
  {
    id: "stocks",
    name: "Stocks",
    prompt: "compare msft nvda amd over the past three months",
    lead: "Microsoft gained the most over three months, about three times AMD's gain.",
    caption: "Change in close, Jun 29 to Sep 29, 2026",
    tone: "up",
    rows: [
      {
        label: "MSFT",
        sub: "Microsoft · $508.96",
        value: "+38.1%",
        delta: 38.1,
        bar: 1,
      },
      {
        label: "NVDA",
        sub: "NVIDIA · $227.21",
        value: "+16.5%",
        delta: 16.5,
        bar: 0.433,
      },
      {
        label: "AMD",
        sub: "AMD · $607.57",
        value: "+12.6%",
        delta: 12.6,
        bar: 0.331,
      },
    ],
  },
  {
    id: "clocks",
    name: "Clocks",
    prompt: "what time is it in ny london tokyo sydney",
    lead: "At 2:40 PM in Redmond, Tokyo and Sydney are already into Wednesday.",
    caption: "Hours ahead of Redmond (PDT)",
    tone: "time",
    rows: [
      {
        label: "Sydney",
        sub: "AEST · Wednesday",
        value: "7:40 AM",
        bar: 17 / 17,
      },
      {
        label: "Tokyo",
        sub: "JST · Wednesday",
        value: "6:40 AM",
        bar: 16 / 17,
      },
      { label: "London", sub: "BST · Tuesday", value: "10:40 PM", bar: 8 / 17 },
      {
        label: "New York",
        sub: "EDT · Tuesday",
        value: "5:40 PM",
        bar: 3 / 17,
      },
    ],
  },
  {
    id: "towers",
    name: "Towers",
    prompt: "tallest buildings in the world",
    lead: "Burj Khalifa is 828 m tall, 149 m taller than the next building.",
    caption: "Height to architectural top",
    tone: "compute",
    rows: [
      { label: "Burj Khalifa", sub: "Dubai · 2010", value: "828 m", bar: 1 },
      {
        label: "Merdeka 118",
        sub: "Kuala Lumpur · 2023",
        value: "679 m",
        bar: 679 / 828,
      },
      {
        label: "Shanghai Tower",
        sub: "Shanghai · 2015",
        value: "632 m",
        bar: 632 / 828,
      },
      {
        label: "Makkah Clock Tower",
        sub: "Mecca · 2012",
        value: "601 m",
        bar: 601 / 828,
      },
      {
        label: "Ping An Finance Center",
        sub: "Shenzhen · 2017",
        value: "599 m",
        bar: 599 / 828,
      },
    ],
  },
];

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
  secondary: { color: tokens.colorNeutralForeground2 },
  card: { padding: "24px", rowGap: "16px" },
  flush: { padding: 0, rowGap: 0, overflow: "hidden" },
  lead: { margin: 0, textWrap: "pretty" },
  head: { display: "grid", rowGap: "4px" },
  num: { fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" },
  up: { color: tokens.colorPaletteGreenForeground1 },
  down: { color: tokens.colorPaletteRedForeground1 },

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

  // Ranked A · List: rank, name, value, and a hairline proportion under each row.
  list: { margin: 0, padding: 0, listStyle: "none", display: "grid" },
  item: {
    display: "grid",
    gridTemplateColumns: "24px minmax(0, 1fr) auto",
    columnGap: "12px",
    rowGap: "8px",
    alignItems: "baseline",
    padding: "12px 0",
    borderTop: `1px solid ${tokens.colorNeutralStroke3}`,
    ":first-child": { borderTop: "none", paddingTop: 0 },
    ":last-child": { paddingBottom: 0 },
  },
  rank: {
    color: tokens.colorNeutralForeground3,
    fontVariantNumeric: "tabular-nums",
  },
  name: { display: "grid", rowGap: "2px", minWidth: 0 },
  hair: {
    gridColumn: "2 / -1",
    height: "4px",
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorNeutralBackground5,
    overflow: "hidden",
  },
  hairFill: { height: "100%", borderRadius: "inherit" },

  // Ranked B · Bars: the row is the bar.
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
  barFill: { position: "absolute", top: 0, bottom: 0, left: 0 },
  barText: { position: "relative", display: "grid", minWidth: 0 },
  barValue: { position: "relative" },

  // Ranked C · Leader: the winner on the wash, the rest as a list.
  leader: {
    padding: "24px",
    display: "grid",
    rowGap: "16px",
  },
  leaderRow: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    columnGap: "16px",
    alignItems: "end",
  },
  leaderValue: {
    fontSize: tokens.fontSizeHero800,
    lineHeight: tokens.lineHeightHero800,
    fontWeight: tokens.fontWeightSemibold,
    letterSpacing: "-0.02em",
    fontVariantNumeric: "tabular-nums",
    "@media (max-width: 480px)": {
      fontSize: tokens.fontSizeHero700,
      lineHeight: tokens.lineHeightHero700,
    },
  },
  rest: { padding: "16px 24px 24px" },
  skel: { display: "grid", rowGap: "12px" },
});

type Mode = "complete" | "streaming";

function Pending({ rows }: { rows: number }) {
  const styles = useStyles();
  return (
    <Skeleton aria-label="Loading more rows" className={styles.skel}>
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonItem key={i} size={24} />
      ))}
    </Skeleton>
  );
}

/** Streaming shows the rows that have arrived and holds space for the rest. */
const arrived = <T,>(items: T[], mode: Mode) =>
  mode === "streaming" ? items.slice(0, 2) : items;

function RankedHead({ r }: { r: RankedReading }) {
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

function Value({ row }: { row: Row }) {
  const styles = useStyles();
  const tone =
    row.delta === undefined
      ? undefined
      : row.delta >= 0
        ? styles.up
        : styles.down;
  return (
    <Text weight="semibold" className={mergeClasses(styles.num, tone)}>
      {row.value}
    </Text>
  );
}

function RankList({ r, mode }: { r: RankedReading; mode: Mode }) {
  const styles = useStyles();
  const { ink } = TONES[r.tone];
  const rows = arrived(r.rows, mode);
  return (
    <Card className={styles.card}>
      <RankedHead r={r} />
      <ol className={styles.list}>
        {rows.map((row, i) => (
          <li key={row.label} className={styles.item}>
            <Text className={styles.rank}>{i + 1}</Text>
            <span className={styles.name}>
              <Text weight="semibold">{row.label}</Text>
              {row.sub ? (
                <Caption1 className={styles.muted}>{row.sub}</Caption1>
              ) : null}
            </span>
            <Value row={row} />
            {row.bar !== undefined ? (
              <span className={styles.hair} aria-hidden>
                <span
                  className={mergeClasses(styles.hairFill, styles.growX)}
                  style={{
                    display: "block",
                    width: `${row.bar * 100}%`,
                    backgroundColor: ink,
                    animationDelay: `${i * 80}ms`,
                  }}
                />
              </span>
            ) : null}
          </li>
        ))}
      </ol>
      {mode === "streaming" ? (
        <Pending rows={r.rows.length - rows.length} />
      ) : null}
    </Card>
  );
}

function RankBars({ r, mode }: { r: RankedReading; mode: Mode }) {
  const styles = useStyles();
  const rows = arrived(r.rows, mode);
  return (
    <Card className={styles.card}>
      <RankedHead r={r} />
      <ol className={styles.bars}>
        {rows.map((row, i) => (
          <li key={row.label} className={styles.barRow}>
            {row.bar !== undefined ? (
              <span
                aria-hidden
                className={mergeClasses(styles.barFill, styles.growX)}
                style={{
                  width: `${row.bar * 100}%`,
                  backgroundColor: wash(r.tone, i === 0 ? 26 : 16),
                  animationDelay: `${i * 80}ms`,
                }}
              />
            ) : null}
            <span className={styles.barText}>
              <Text weight="semibold">{row.label}</Text>
              {row.sub ? (
                <Caption1 className={styles.secondary}>{row.sub}</Caption1>
              ) : null}
            </span>
            <span className={styles.barValue}>
              <Value row={row} />
            </span>
          </li>
        ))}
      </ol>
      {mode === "streaming" ? (
        <Pending rows={r.rows.length - rows.length} />
      ) : null}
    </Card>
  );
}

function RankLeader({ r, mode }: { r: RankedReading; mode: Mode }) {
  const styles = useStyles();
  const { ink } = TONES[r.tone];
  const [first, ...others] = arrived(r.rows, mode);
  const delta =
    first.delta === undefined
      ? undefined
      : first.delta >= 0
        ? styles.up
        : styles.down;
  return (
    <Card className={mergeClasses(styles.card, styles.flush)}>
      <div className={styles.leader} style={{ backgroundColor: wash(r.tone) }}>
        <RankedHead r={r} />
        <div className={styles.leaderRow}>
          <span className={styles.name}>
            <Text size={500} weight="semibold">
              {first.label}
            </Text>
            {first.sub ? (
              <Caption1 className={styles.secondary}>{first.sub}</Caption1>
            ) : null}
          </span>
          <span className={mergeClasses(styles.leaderValue, delta)}>
            {first.value}
          </span>
        </div>
      </div>
      <div className={styles.rest}>
        <ol className={styles.list} start={2}>
          {others.map((row, i) => (
            <li key={row.label} className={styles.item}>
              <Text className={styles.rank}>{i + 2}</Text>
              <span className={styles.name}>
                <Text weight="semibold">{row.label}</Text>
                {row.sub ? (
                  <Caption1 className={styles.muted}>{row.sub}</Caption1>
                ) : null}
              </span>
              <Value row={row} />
              {row.bar !== undefined ? (
                <span className={styles.hair} aria-hidden>
                  <span
                    className={mergeClasses(styles.hairFill, styles.growX)}
                    style={{
                      display: "block",
                      width: `${row.bar * 100}%`,
                      backgroundColor: ink,
                      opacity: 0.6,
                      animationDelay: `${i * 80}ms`,
                    }}
                  />
                </span>
              ) : null}
            </li>
          ))}
        </ol>
        {mode === "streaming" ? (
          <Pending rows={r.rows.length - others.length - 1} />
        ) : null}
      </div>
    </Card>
  );
}

const RANKED_VARIANTS = [
  {
    letter: "A",
    name: "List",
    note: "Rank, name, value; a hairline shows the proportion.",
    View: RankList,
  },
  {
    letter: "B",
    name: "Bars",
    note: "Each row is its own bar; the leader fills darker.",
    View: RankBars,
  },
  {
    letter: "C",
    name: "Leader",
    note: "The winner is the answer on the wash; the rest follow.",
    View: RankLeader,
  },
];

type Kind = "ranked" | "facts";

function Lab() {
  const styles = useStyles();
  const [kind, setKind] = useState<Kind>("ranked");
  const [rid, setRid] = useState(RANKED[0].id);
  const [fid, setFid] = useState(FACTS[0].id);
  const [qi, setQi] = useState(0);
  const [mode, setMode] = useState<FactsMode>("complete");
  const ranked = RANKED.find((r) => r.id === rid)!;
  const facts = FACTS.find((f) => f.id === fid)!;
  const intent = facts.intents[qi];
  const readings = kind === "ranked" ? RANKED : FACTS;
  const selected = kind === "ranked" ? rid : fid;
  const rankedMode: Mode = mode === "collapsed" ? "complete" : mode;
  return (
    <main className={styles.page}>
      <header className={styles.intro}>
        <Title3 as="h1">Ranked and Facts</Title3>
        <Body1 className={styles.introText}>
          The same data answers different questions. Facts now leads with the
          fact that answers this one and ranks the rest by relevance. JEV will
          make both choices; here they are fixtures.
        </Body1>
        <div className={styles.tabs}>
          <TabList
            selectedValue={kind}
            onTabSelect={(_, d) => setKind(d.value as Kind)}
            aria-label="Component"
          >
            <Tab value="ranked">Ranked</Tab>
            <Tab value="facts">Facts</Tab>
          </TabList>
          <TabList
            selectedValue={selected}
            onTabSelect={(_, d) => {
              if (kind === "ranked") setRid(d.value as string);
              else {
                setFid(d.value as string);
                setQi(0);
              }
            }}
            aria-label="Reading"
          >
            {readings.map((r) => (
              <Tab key={r.id} value={r.id}>
                {r.name}
              </Tab>
            ))}
          </TabList>
          <TabList
            selectedValue={kind === "ranked" ? rankedMode : mode}
            onTabSelect={(_, d) => setMode(d.value as FactsMode)}
            aria-label="Card state"
          >
            <Tab value="complete">Complete</Tab>
            <Tab value="streaming">Streaming</Tab>
            {kind === "facts" ? <Tab value="collapsed">Collapsed</Tab> : null}
          </TabList>
        </div>
        {kind === "ranked" ? (
          <Caption1 className={styles.muted}>“{ranked.prompt}”</Caption1>
        ) : (
          <TabList
            size="small"
            selectedValue={String(qi)}
            onTabSelect={(_, d) => setQi(Number(d.value))}
            aria-label="Question"
          >
            {facts.intents.map((q, i) => (
              <Tab key={q.prompt} value={String(i)}>
                “{q.prompt}”
              </Tab>
            ))}
          </TabList>
        )}
      </header>
      {kind === "ranked" ? (
        RANKED_VARIANTS.map(({ letter, name, note, View }) => (
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
            <View key={`${rid}-${rankedMode}`} r={ranked} mode={rankedMode} />
          </section>
        ))
      ) : (
        <section className={styles.variant} aria-label="Answer first">
          <div className={styles.variantLabel}>
            <Text size={500} className={styles.variantLetter}>
              A4
            </Text>
            <Text size={500} weight="semibold">
              Answer first
            </Text>
            <Caption1 className={styles.muted}>
              The answering fact leads on the wash; the rest follow in relevance
              order.
            </Caption1>
          </div>
          <FactsCard
            key={`${fid}-${qi}-${mode}`}
            f={facts}
            intent={intent}
            mode={mode}
          />
        </section>
      )}
    </main>
  );
}

export default function RankedLabPage() {
  return (
    <FluentRoot>
      <Lab />
    </FluentRoot>
  );
}
