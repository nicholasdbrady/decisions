"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Body1,
  Caption1,
  Card,
  makeStyles,
  Skeleton,
  SkeletonItem,
  Tab,
  TabList,
  Text,
  Title2,
  Title3,
  tokens,
} from "@fluentui/react-components";
import {
  DataVizPalette,
  AreaChart,
  DonutChart,
  FunnelChart,
  GaugeChart,
  HeatMapChart,
  getColorFromToken,
  GroupedVerticalBarChart,
  HorizontalBarChartWithAxis,
  LineChart,
  SankeyChart,
  ScatterChart,
  VerticalBarChart,
  VerticalStackedBarChart,
} from "@fluentui/react-charts";

import * as T from "./trend-data";

/**
 * Graph card lab, comparison family. Every number is real: Yahoo Finance daily
 * closes and volumes for Jun 29 – Sep 29, 2026, fetched from the chart endpoint.
 * Monthly figures run from the first to the last close inside each month.
 */

type Mode = "complete" | "streaming";

const TICKERS = [
  "MSFT",
  "META",
  "AAPL",
  "NVDA",
  "AMD",
  "AMZN",
  "GOOGL",
] as const;
type Ticker = (typeof TICKERS)[number];

const CHANGE_3M: Record<Ticker, number> = {
  MSFT: 38.6,
  META: 30.3,
  AAPL: 17.6,
  NVDA: 16.9,
  AMD: 13.2,
  AMZN: 3.2,
  GOOGL: -3.8,
};

const MONTHS = ["Jul", "Aug", "Sep"] as const;
const MONTHLY_RETURN: Record<"NVDA" | "AMD" | "MSFT", number[]> = {
  NVDA: [1.6, 6.8, 4.9],
  AMD: [-12.0, -2.9, 32.9],
  MSFT: [20.9, 4.0, 1.9],
};
const MONTHLY_VOLUME_B: Record<"NVDA" | "AMD" | "MSFT", number[]> = {
  NVDA: [2.85, 2.68, 2.21],
  AMD: [0.61, 0.46, 0.44],
  MSFT: [0.82, 0.6, 0.41],
};

/** One color per ticker, everywhere, so a stock keeps its identity across charts. */
const COLOR: Record<Ticker, string> = {
  NVDA: getColorFromToken(DataVizPalette.color1),
  AMD: getColorFromToken(DataVizPalette.color2),
  MSFT: getColorFromToken(DataVizPalette.color3),
  AAPL: getColorFromToken(DataVizPalette.color4),
  META: getColorFromToken(DataVizPalette.color5),
  AMZN: getColorFromToken(DataVizPalette.color6),
  GOOGL: getColorFromToken(DataVizPalette.color7),
};

type Scheme = "palette" | "semantic";

/** The color decision JEV makes per chart: identity by series, or meaning by sign. */
const tone = (t: Ticker, v: number, scheme: Scheme) =>
  scheme === "semantic"
    ? getColorFromToken(v < 0 ? DataVizPalette.error : DataVizPalette.success)
    : COLOR[t];

const pct = (n: number) =>
  `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(1)}%`;

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
  variantNote: { color: tokens.colorNeutralForeground3 },
  card: { padding: "24px", rowGap: "16px" },
  lead: { margin: 0, textWrap: "pretty" },
  plot: { width: "100%", minWidth: 0 },
  foot: {
    display: "flex",
    alignItems: "center",
    columnGap: "6px",
    color: tokens.colorNeutralForeground3,
  },
  favicon: {
    width: "16px",
    height: "16px",
    borderRadius: tokens.borderRadiusSmall,
  },
  families: { flexWrap: "wrap" },
  kpis: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "12px",
  },
  kpi: {
    display: "grid",
    rowGap: "4px",
    padding: "16px",
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  kpiName: { color: tokens.colorNeutralForeground3 },
  up: { color: tokens.colorPaletteGreenForeground1 },
  down: { color: tokens.colorPaletteRedForeground1 },
});

function GraphCard({
  lead,
  note,
  streaming,
  children,
}: {
  lead: string;
  note: string;
  streaming: boolean;
  children: ReactNode;
}) {
  const styles = useStyles();
  return (
    <Card className={styles.card}>
      <Title3 as="p" className={styles.lead}>
        {lead}
      </Title3>
      <div className={styles.plot}>
        {streaming ? (
          <Skeleton aria-label="Loading chart">
            <SkeletonItem
              shape="rectangle"
              style={{ height: 260, borderRadius: 8 }}
            />
          </Skeleton>
        ) : (
          children
        )}
      </div>
      <span className={styles.foot}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={styles.favicon}
          src="https://www.google.com/s2/favicons?domain=finance.yahoo.com&sz=64"
          alt=""
        />
        <Caption1>Yahoo Finance · {note}</Caption1>
      </span>
    </Card>
  );
}

const NAME: Record<Ticker, string> = {
  MSFT: "Microsoft",
  META: "Meta",
  AAPL: "Apple",
  NVDA: "NVIDIA",
  AMD: "AMD",
  AMZN: "Amazon",
  GOOGL: "Alphabet",
};

/** Column: one value per category. Negative bars take the error color. */
function ColumnChart({ scheme }: { scheme: Scheme }) {
  return (
    <VerticalBarChart
      height={280}
      hideLegend
      barWidth="auto"
      maxBarWidth={48}
      data={TICKERS.map((t) => ({
        x: t,
        y: CHANGE_3M[t],
        legend: NAME[t],
        color: tone(t, CHANGE_3M[t], scheme),
        yAxisCalloutData: pct(CHANGE_3M[t]),
        barLabel: pct(CHANGE_3M[t]),
      }))}
      yAxisTickFormat={(v: number) => `${v}%`}
      roundedTicks
    />
  );
}

/** Bar: the same comparison laid sideways, ranked. Fluent prints bar labels as bare numbers, so they are off. */
function BarChart({ scheme }: { scheme: Scheme }) {
  const ranked = [...TICKERS].sort((a, b) => CHANGE_3M[a] - CHANGE_3M[b]);
  return (
    <HorizontalBarChartWithAxis
      height={300}
      hideLegend
      hideLabels
      showYAxisLables
      tickFormat={(v: number | Date) => `${v}%`}
      data={ranked.map((t) => ({
        x: CHANGE_3M[t],
        y: t,
        legend: NAME[t],
        color: tone(t, CHANGE_3M[t], scheme),
        xAxisCalloutData: pct(CHANGE_3M[t]),
      }))}
    />
  );
}

/** Clustered column: several series side by side for each category. */
function ClusteredColumnChart() {
  const tickers = ["NVDA", "AMD", "MSFT"] as const;
  return (
    <GroupedVerticalBarChart
      height={280}
      hideLabels
      barWidth="auto"
      maxBarWidth={28}
      data={MONTHS.map((month, i) => ({
        name: month,
        series: tickers.map((t) => ({
          key: `${month}-${t}`,
          legend: t,
          data: MONTHLY_RETURN[t][i],
          color: COLOR[t],
          yAxisCalloutData: pct(MONTHLY_RETURN[t][i]),
        })),
      }))}
      yAxisTickFormat={(v: number) => `${v}%`}
    />
  );
}

/** Stacked column: each column is a total, split into its parts. */
function StackedColumnChart() {
  const tickers = ["NVDA", "MSFT", "AMD"] as const;
  return (
    <VerticalStackedBarChart
      height={280}
      barWidth="auto"
      maxBarWidth={64}
      data={MONTHS.map((month, i) => ({
        xAxisPoint: month,
        chartData: tickers.map((t) => ({
          legend: t,
          data: MONTHLY_VOLUME_B[t][i],
          color: COLOR[t],
          yAxisCalloutData: `${MONTHLY_VOLUME_B[t][i].toFixed(2)}B shares`,
        })),
      }))}
      yAxisTickFormat={(v: number) => (v === 0 ? "0" : `${v}B`)}
    />
  );
}

const total = (i: number) =>
  (
    MONTHLY_VOLUME_B.NVDA[i] +
    MONTHLY_VOLUME_B.AMD[i] +
    MONTHLY_VOLUME_B.MSFT[i]
  ).toFixed(2);

const CHARTS = [
  {
    letter: "1",
    name: "Column",
    note: "One value per category.",
    lead: "Microsoft led seven big tech stocks, up 38.6% in three months. Alphabet was the only one down.",
    source: "3-month change, Jun 29 – Sep 29",
    Chart: ColumnChart,
    semantic: true,
  },
  {
    letter: "2",
    name: "Bar",
    note: "The same comparison, ranked and laid sideways.",
    lead: "Ranked by three-month change, Microsoft and Meta lead and Alphabet trails at −3.8%.",
    source: "3-month change, Jun 29 – Sep 29",
    Chart: BarChart,
    semantic: true,
  },
  {
    letter: "3",
    name: "Clustered column",
    note: "Several series side by side in each group.",
    lead: "AMD swung the hardest: down 12% in July, then up 32.9% in September.",
    source: "Change within each month, first to last close",
    Chart: ClusteredColumnChart,
    semantic: false,
  },
  {
    letter: "4",
    name: "Stacked column",
    note: "Each column is a total, split into its parts.",
    lead: `NVIDIA made up most of the shares traded. Combined volume fell from ${total(0)}B in July to ${total(2)}B in September.`,
    source: "Shares traded per month",
    Chart: StackedColumnChart,
    semantic: false,
  },
];

/* ---------- Trend family: daily data, Jun 29 – Sep 29 ---------- */

const DAYS = T.DATES.map((d) => new Date(`${d}T16:00:00`));
const TREND = {
  NVDA: T.NVDA_CLOSE,
  AMD: T.AMD_CLOSE,
  MSFT: T.MSFT_CLOSE,
} as const;
const VOLUME = {
  NVDA: T.NVDA_VOLUME_M,
  MSFT: T.MSFT_VOLUME_M,
  AMD: T.AMD_VOLUME_M,
} as const;
const day = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
const usd = (n: number) => `$${n.toFixed(2)}`;
const axis = { customDateTimeFormatter: day, xAxisTickCount: 4 } as const;

/** Line: several series over time, rebased to 0% so different prices compare. */
function TrendLine() {
  const series = (["MSFT", "NVDA", "AMD"] as const).map((t) => ({
    legend: NAME[t],
    color: COLOR[t],
    hideNonActiveDots: true,
    data: TREND[t].map((c, i) => {
      const v = (c / TREND[t][0] - 1) * 100;
      return {
        x: DAYS[i],
        y: v,
        xAxisCalloutData: day(DAYS[i]),
        yAxisCalloutData: pct(v),
      };
    }),
  }));
  return (
    <LineChart
      height={280}
      data={{ lineChartData: series }}
      yAxisTickFormat={(v: number) => `${v}%`}
      {...axis}
    />
  );
}

/** Area: one series, filled to zero, for a single quantity over time. */
function TrendArea() {
  const data = T.MSFT_CLOSE.map((c, i) => ({
    x: DAYS[i],
    y: c,
    xAxisCalloutData: day(DAYS[i]),
    yAxisCalloutData: usd(c),
  }));
  return (
    <AreaChart
      height={280}
      hideLegend
      mode="tozeroy"
      enableGradient
      data={{ lineChartData: [{ legend: NAME.MSFT, color: COLOR.MSFT, data }] }}
      yAxisTickFormat={(v: number) => `$${v}`}
      {...axis}
    />
  );
}

/** Stacked area: parts of a total over time; the top edge is the total. */
function TrendStackedArea() {
  const series = (["NVDA", "MSFT", "AMD"] as const).map((t) => ({
    legend: NAME[t],
    color: COLOR[t],
    data: VOLUME[t].map((v, i) => ({
      x: DAYS[i],
      y: v,
      xAxisCalloutData: day(DAYS[i]),
      yAxisCalloutData: `${v.toFixed(1)}M shares`,
    })),
  }));
  return (
    <AreaChart
      height={280}
      data={{ lineChartData: series }}
      yAxisTickFormat={(v: number) => (v === 0 ? "0" : `${v}M`)}
      {...axis}
    />
  );
}

/** Zone: a line with a shaded x-range that names a period. Fluent calls these color fill bars. */
function TrendZone() {
  const low = T.AMD_CLOSE.indexOf(Math.min(...T.AMD_CLOSE));
  const data = T.AMD_CLOSE.map((c, i) => ({
    x: DAYS[i],
    y: c,
    xAxisCalloutData: day(DAYS[i]),
    yAxisCalloutData: usd(c),
  }));
  return (
    <LineChart
      height={280}
      data={{
        lineChartData: [
          { legend: NAME.AMD, color: COLOR.AMD, hideNonActiveDots: true, data },
        ],
      }}
      colorFillBars={[
        {
          legend: "Rebound",
          // Fluent paints fill bars at full strength, so the zone takes a pale tint of the success hue.
          color: "rgba(16, 124, 16, 0.12)",
          data: [{ startX: DAYS[low], endX: DAYS[DAYS.length - 1] }],
        },
      ]}
      yMinValue={Math.floor(Math.min(...T.AMD_CLOSE) / 50) * 50}
      yAxisTickFormat={(v: number) => `$${v}`}
      {...axis}
    />
  );
}

const abs = (n: number) => `${Math.abs(n).toFixed(1)}%`;
const amdLow = Math.min(...T.AMD_CLOSE);
const amdLowDay = day(DAYS[T.AMD_CLOSE.indexOf(amdLow)]);
const amdEnd = T.AMD_CLOSE[T.AMD_CLOSE.length - 1];
const volTotal = DAYS.map(
  (_, i) => T.NVDA_VOLUME_M[i] + T.MSFT_VOLUME_M[i] + T.AMD_VOLUME_M[i],
);
const peak = volTotal.indexOf(Math.max(...volTotal));

const TREND_CHARTS = [
  {
    letter: "1",
    name: "Line",
    note: "Several series over time, rebased to 0% at the start.",
    lead: `Microsoft pulled ahead in July and finished up ${abs((T.MSFT_CLOSE.at(-1)! / T.MSFT_CLOSE[0] - 1) * 100)}. AMD fell 20% by late July, then recovered.`,
    source: "Daily close, change since Jun 29",
    Chart: TrendLine,
  },
  {
    letter: "2",
    name: "Area",
    note: "One quantity over time, filled to zero.",
    lead: `Microsoft rose from ${usd(T.MSFT_CLOSE[0])} to ${usd(T.MSFT_CLOSE.at(-1)!)}, close to its Sep 25 high of ${usd(Math.max(...T.MSFT_CLOSE))}.`,
    source: "Microsoft daily close",
    Chart: TrendArea,
  },
  {
    letter: "3",
    name: "Stacked area",
    note: "Parts of a total over time. The top edge is the total.",
    lead: `Trading peaked on ${day(DAYS[peak])} at ${Math.round(volTotal[peak])}M shares, and NVIDIA alone traded ${Math.round(T.NVDA_VOLUME_M[peak])}M of them.`,
    source: "Shares traded per day",
    Chart: TrendStackedArea,
  },
  {
    letter: "4",
    name: "Zone",
    note: "A line with a shaded period that the lead names.",
    lead: `AMD rebounded ${abs((amdEnd / amdLow - 1) * 100)} from its ${amdLowDay} low of ${usd(amdLow)}.`,
    source: "AMD daily close",
    Chart: TrendZone,
  },
];

/* ---------- Composition family: parts of a whole, from the same daily data ---------- */

const TRIO = ["NVDA", "MSFT", "AMD"] as const;
const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);
const share = (n: number, total: number) =>
  `${((n / total) * 100).toFixed(0)}%`;
const VOL_TOTAL = Object.fromEntries(
  TRIO.map((t) => [t, sum(VOLUME[t])]),
) as Record<(typeof TRIO)[number], number>;
const VOL_ALL = sum(Object.values(VOL_TOTAL));
const moves = (closes: readonly number[]) =>
  closes.slice(1).map((c, i) => (c / closes[i] - 1) * 100);
const NVDA_MOVES = moves(T.NVDA_CLOSE);
const upDays = NVDA_MOVES.filter((m) => m > 0).length;
const downDays = NVDA_MOVES.filter((m) => m < 0).length;
const flatDays = NVDA_MOVES.length - upDays - downDays;
const STAGES = [
  { stage: "Trading days", test: () => true },
  { stage: "Up", test: (m: number) => m > 0 },
  { stage: "Up more than 1%", test: (m: number) => m > 1 },
  { stage: "Up more than 3%", test: (m: number) => m > 3 },
];
const stageCount = (t: (typeof TRIO)[number], i: number) =>
  moves(TREND[t]).filter(STAGES[i].test).length;

/** Pie: a whole split into a few named parts. */
function CompPie() {
  return (
    <DonutChart
      height={280}
      innerRadius={0}
      hideLabels={false}
      showLabelsInPercent
      data={{
        chartData: TRIO.map((t) => ({
          legend: NAME[t],
          data: Math.round(VOL_TOTAL[t]),
          color: COLOR[t],
          yAxisCalloutData: `${(VOL_TOTAL[t] / 1000).toFixed(2)}B shares`,
        })),
      }}
    />
  );
}

/** Donut: a pie with the total in the middle. */
function CompDonut() {
  const slices = [
    {
      legend: "Up",
      data: upDays,
      color: getColorFromToken(DataVizPalette.success),
    },
    {
      legend: "Down",
      data: downDays,
      color: getColorFromToken(DataVizPalette.error),
    },
    ...(flatDays
      ? [
          {
            legend: "Flat",
            data: flatDays,
            color: getColorFromToken(DataVizPalette.disabled),
          },
        ]
      : []),
  ];
  return (
    <DonutChart
      height={280}
      innerRadius={70}
      hideLabels={false}
      valueInsideDonut={`${NVDA_MOVES.length} days`}
      data={{
        chartData: slices.map((s) => ({
          ...s,
          yAxisCalloutData: `${s.data} days`,
        })),
      }}
    />
  );
}

/** Fluent funnels default to 350px wide, so they are given the width of the card. */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) =>
      setWidth(Math.round(e.contentRect.width)),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Stages fade from the series color, so the legend reads as an ordered sequence. */
const fade = (hex: string, i: number, n: number) =>
  `${hex}${Math.round(255 * (1 - (0.6 * i) / Math.max(1, n - 1)))
    .toString(16)
    .padStart(2, "0")}`;

/** Funnel: each stage is a subset of the one before it. Fluent names stages only in the legend. */
function CompFunnel() {
  const [ref, width] = useWidth<HTMLDivElement>();
  return (
    // Fluent draws the funnel legend below its own height, so the wrapper reserves room for it.
    <div ref={ref} style={{ paddingBottom: 48 }}>
      {width > 0 && (
        <FunnelChart
          width={width}
          height={300}
          data={STAGES.map((s, i) => ({
            stage: s.stage,
            value: stageCount("NVDA", i),
            color: fade(COLOR.NVDA, i, STAGES.length),
          }))}
        />
      )}
    </div>
  );
}

/** Stacked funnel: the same stages, split by series. */
function CompStackedFunnel() {
  const [ref, width] = useWidth<HTMLDivElement>();
  return (
    // Fluent draws the funnel legend below its own height, so the wrapper reserves room for it.
    <div ref={ref} style={{ paddingBottom: 48 }}>
      {width > 0 && (
        <FunnelChart
          width={width}
          height={300}
          data={STAGES.map((s, i) => ({
            stage: s.stage,
            subValues: TRIO.map((t) => ({
              category: NAME[t],
              value: stageCount(t, i),
              color: COLOR[t],
            })),
          }))}
        />
      )}
    </div>
  );
}

const COMPOSITION_CHARTS = [
  {
    letter: "1",
    name: "Pie",
    note: "A whole split into a few named parts.",
    lead: `NVIDIA made up ${share(VOL_TOTAL.NVDA, VOL_ALL)} of the ${(VOL_ALL / 1000).toFixed(1)}B shares these three stocks traded.`,
    source: "Shares traded, Jun 29 – Sep 29",
    Chart: CompPie,
  },
  {
    letter: "2",
    name: "Donut",
    note: "A pie with the total in the middle.",
    lead: `NVIDIA closed higher on ${upDays} of ${NVDA_MOVES.length} trading days.`,
    source: "NVIDIA daily close vs. the day before",
    Chart: CompDonut,
  },
  {
    letter: "3",
    name: "Funnel",
    note: "Each stage is a subset of the one before it.",
    lead: `Only ${stageCount("NVDA", 3)} of NVIDIA's ${NVDA_MOVES.length} trading days were gains of more than 3%.`,
    source: "NVIDIA daily change",
    Chart: CompFunnel,
  },
  {
    letter: "4",
    name: "Stacked funnel",
    note: "The same stages, split by series.",
    lead: `AMD had the most big days: ${stageCount("AMD", 3)} gains of more than 3%, against ${stageCount("MSFT", 3)} for Microsoft and ${stageCount("NVDA", 3)} for NVIDIA.`,
    source: "Daily change per stock",
    Chart: CompStackedFunnel,
  },
];

/* ---------- Specialized family: combo and Sankey ---------- */

/** Trading weeks, keyed by the Monday that starts each one. */
const WEEKS = (() => {
  const out: { label: string; volume: number; close: number }[] = [];
  DAYS.forEach((d, i) => {
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const label = day(monday);
    const last = out.at(-1);
    if (last?.label === label) {
      last.volume += T.NVDA_VOLUME_M[i];
      last.close = T.NVDA_CLOSE[i];
    } else
      out.push({ label, volume: T.NVDA_VOLUME_M[i], close: T.NVDA_CLOSE[i] });
  });
  return out;
})();
const busiest = WEEKS.reduce((a, b) => (b.volume > a.volume ? b : a));

/** Combo: bars and a line with different units, the line on a secondary axis. */
function SpecCombo() {
  const closes = WEEKS.map((w) => w.close);
  return (
    <VerticalBarChart
      height={300}
      barWidth="auto"
      maxBarWidth={32}
      hideLabels
      legendProps={{ canSelectMultipleLegends: false }}
      data={WEEKS.map((w) => ({
        x: w.label,
        y: w.volume / 1000,
        legend: "Shares traded",
        color: COLOR.NVDA,
        yAxisCalloutData: `${Math.round(w.volume)}M shares`,
        lineData: {
          y: w.close,
          yAxisCalloutData: usd(w.close),
          useSecondaryYScale: true,
        },
      }))}
      lineLegendText="Friday close"
      lineLegendColor={getColorFromToken(DataVizPalette.color10)}
      // Fluent formats both axes with one function, so volume is in billions (< 10) and price in dollars (>= 10).
      yAxisTickFormat={(v: number) =>
        v === 0 ? "0" : v < 10 ? `${v.toFixed(1)}B` : `$${v}`
      }
      secondaryYScaleOptions={{
        yMinValue: Math.floor(Math.min(...closes) / 20) * 20,
        yMaxValue: Math.ceil(Math.max(...closes) / 20) * 20,
      }}
    />
  );
}

type Dir = "Up" | "Down";
const dir = (m: number): Dir => (m > 0 ? "Up" : "Down");
const PAIRS = NVDA_MOVES.slice(1).map(
  (m, i) => [dir(NVDA_MOVES[i]), dir(m)] as const,
);
const flow = (a: Dir, b: Dir) =>
  PAIRS.filter(([x, y]) => x === a && y === b).length;

/** Sankey: how a quantity moves from one set of states to the next. */
function SpecSankey() {
  const [ref, width] = useWidth<HTMLDivElement>();
  const up = getColorFromToken(DataVizPalette.success);
  const down = getColorFromToken(DataVizPalette.error);
  const nodes = [
    { nodeId: 0, name: "Up day", color: up, borderColor: up },
    { nodeId: 1, name: "Down day", color: down, borderColor: down },
    { nodeId: 2, name: "Up next day", color: up, borderColor: up },
    { nodeId: 3, name: "Down next day", color: down, borderColor: down },
  ];
  const links = (["Up", "Down"] as const).flatMap((a, i) =>
    (["Up", "Down"] as const).map((b, j) => ({
      source: i,
      target: 2 + j,
      value: flow(a, b),
    })),
  );
  return (
    <div ref={ref}>
      {width > 0 && (
        <SankeyChart
          width={width}
          height={280}
          pathColor={getColorFromToken(DataVizPalette.disabled)}
          reflowProps={{ mode: "min-width" }}
          data={{ SankeyChartData: { nodes, links } }}
        />
      )}
    </div>
  );
}

const SPECIALIZED_CHARTS = [
  {
    letter: "1",
    name: "Combo",
    note: "Bars and a line with different units. The line uses the right axis.",
    lead: `NVIDIA's busiest week began ${busiest.label}: ${Math.round(busiest.volume)}M shares traded, with the stock closing that week at ${usd(busiest.close)}.`,
    source: "NVIDIA weekly volume and Friday close",
    Chart: SpecCombo,
  },
  {
    letter: "2",
    name: "Sankey",
    note: "How a quantity moves from one set of states to the next.",
    lead: `After an up day, NVIDIA rose again ${flow("Up", "Up")} of ${flow("Up", "Up") + flow("Up", "Down")} times. After a down day, it rose ${flow("Down", "Up")} of ${flow("Down", "Up") + flow("Down", "Down")} times.`,
    source: "NVIDIA daily direction, one day to the next",
    Chart: SpecSankey,
  },
];

/* ---------- Custom family: KPI, gauge, heat map, scatter ---------- */

const changeOf = (xs: readonly number[]) =>
  (xs[xs.length - 1] / xs[0] - 1) * 100;
const leader = TRIO.reduce((a, b) =>
  changeOf(TREND[b]) > changeOf(TREND[a]) ? b : a,
);

/**
 * Fluent's Sparkline breaks under React StrictMode (its scales are set in an effect)
 * and pins the y-axis at zero, which flattens prices. This one scales min to max.
 */
function Spark({
  values,
  color,
  label,
}: {
  values: readonly number[];
  color: string;
  label: string;
}) {
  const w = 160;
  const h = 36;
  const lo = Math.min(...values);
  const span = Math.max(...values) - lo || 1;
  const pts = values.map(
    (v, i) =>
      `${((i / (values.length - 1)) * w).toFixed(1)},${(h - 2 - ((v - lo) / span) * (h - 4)).toFixed(1)}`,
  );
  return (
    <svg
      width="100%"
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
    >
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** KPI: the latest value, its change, and a sparkline of how it got there. */
function CustomKpi() {
  const styles = useStyles();
  return (
    <div className={styles.kpis}>
      {TRIO.map((t) => {
        const closes = TREND[t];
        const change = changeOf(closes);
        return (
          <div key={t} className={styles.kpi}>
            <Caption1 className={styles.kpiName}>{NAME[t]}</Caption1>
            <Title2 as="p" style={{ margin: 0 }}>
              {usd(closes[closes.length - 1])}
            </Title2>
            <Caption1 className={change < 0 ? styles.down : styles.up}>
              {pct(change)} since Jun 29
            </Caption1>
            <Spark
              values={closes}
              color={COLOR[t]}
              label={`${NAME[t]} daily close, Jun 29 to Sep 29`}
            />
          </div>
        );
      })}
    </div>
  );
}

const MS_LOW = Math.min(...T.MSFT_CLOSE);
const MS_HIGH = Math.max(...T.MSFT_CLOSE);
const MS_LAST = T.MSFT_CLOSE[T.MSFT_CLOSE.length - 1];

/** Gauge: one value placed inside a known range. */
function CustomGauge() {
  const [ref, width] = useWidth<HTMLDivElement>();
  return (
    <div ref={ref}>
      {width > 0 && (
        <GaugeChart
          width={Math.min(width, 360)}
          height={200}
          variant="single-segment"
          minValue={MS_LOW}
          maxValue={MS_HIGH}
          chartValue={MS_LAST}
          chartValueFormat={() => usd(MS_LAST)}
          sublabel={`Sep 29 close · range ${usd(MS_LOW)} – ${usd(MS_HIGH)}`}
          hideMinMax
          hideLegend
          segments={[
            {
              legend: "Three-month range",
              size: MS_HIGH - MS_LOW,
              color: COLOR.MSFT,
            },
          ]}
        />
      )}
    </div>
  );
}

/** Weekly change per ticker: each week's last close against the week before. */
const WEEK_LABELS = WEEKS.map((w) => w.label);
const weekly = (closes: readonly number[]) => {
  const last: number[] = [];
  DAYS.forEach((d, i) => {
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const w = WEEK_LABELS.indexOf(day(monday));
    last[w] = closes[i];
  });
  return last.map(
    (c, w) => (c / (w === 0 ? closes[0] : last[w - 1]) - 1) * 100,
  );
};
const WEEKLY = Object.fromEntries(
  TRIO.map((t) => [t, weekly(TREND[t])]),
) as Record<(typeof TRIO)[number], number[]>;
const WEEK_DATES = WEEK_LABELS.map((_, w) => {
  const first = DAYS.find((d) => {
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return day(monday) === WEEK_LABELS[w];
  })!;
  const monday = new Date(first);
  monday.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  return monday;
});
const HEAT_MAX = Math.ceil(
  Math.max(...TRIO.flatMap((t) => WEEKLY[t].map(Math.abs))),
);
const bestWeek = TRIO.flatMap((t) =>
  WEEKLY[t].map((v, w) => ({ t, v, w })),
).reduce((a, b) => (b.v > a.v ? b : a));

/** Heat map: a grid of values where color carries the size and sign. */
function CustomHeatMap() {
  // Narrow cards rotate the grid: weeks run down the side and tickers across the top.
  const [ref, width] = useWidth<HTMLDivElement>();
  const tall = width > 0 && width < 560;
  const bands = [
    { legend: "Down more than 5%", value: -7, test: (v: number) => v < -5 },
    { legend: "Down 0–5%", value: -2, test: (v: number) => v < 0 && v >= -5 },
    { legend: "Up 0–5%", value: 2, test: (v: number) => v >= 0 && v <= 5 },
    { legend: "Up more than 5%", value: 7, test: (v: number) => v > 5 },
  ];
  return (
    <div ref={ref}>
      {width > 0 && (
        <HeatMapChart
          key={tall ? "tall" : "wide"}
          height={tall ? WEEK_DATES.length * 36 + 60 : 220}
          // Dates, not labels, so Fluent keeps the weeks in order across the bands.
          data={bands.map((b) => ({
            legend: b.legend,
            value: b.value,
            data: TRIO.flatMap((t) =>
              WEEKLY[t].flatMap((v, w) =>
                b.test(v)
                  ? [
                      {
                        x: tall ? t : WEEK_DATES[w],
                        y: tall ? WEEK_DATES[w] : t,
                        value: v,
                        rectText:
                          Math.round(v) === 0 ? "0" : Math.round(v).toString(),
                      },
                    ]
                  : [],
              ),
            ),
          }))}
          xAxisDateFormatString="%b %d"
          yAxisDateFormatString="%b %d"
          domainValuesForColorScale={[-HEAT_MAX, 0, HEAT_MAX]}
          rangeValuesForColorScale={[
            getColorFromToken(DataVizPalette.error),
            "#f5f5f5",
            getColorFromToken(DataVizPalette.success),
          ]}
        />
      )}
    </div>
  );
}

const nvdaMoves = moves(T.NVDA_CLOSE);
const amdMoves = moves(T.AMD_CLOSE);
const corr = (a: number[], b: number[]) => {
  const ma = sum(a) / a.length;
  const mb = sum(b) / b.length;
  const cov = sum(a.map((x, i) => (x - ma) * (b[i] - mb)));
  return (
    cov /
    Math.sqrt(
      sum(a.map((x) => (x - ma) ** 2)) * sum(b.map((y) => (y - mb) ** 2)),
    )
  );
};
const R = corr(nvdaMoves, amdMoves);
const sameWay = nvdaMoves.filter(
  (x, i) => Math.sign(x) === Math.sign(amdMoves[i]),
).length;

/** Scatter: two measures per item, to show whether they move together. */
function CustomScatter() {
  return (
    <ScatterChart
      height={300}
      hideLegend
      data={{
        scatterChartData: [
          {
            legend: "Trading day",
            color: COLOR.AMD,
            data: nvdaMoves.map((x, i) => ({
              x,
              y: amdMoves[i],
              xAxisCalloutData: `NVIDIA ${pct(x)}`,
              yAxisCalloutData: `AMD ${pct(amdMoves[i])}`,
            })),
          },
        ],
      }}
      tickFormat={(v: number | Date) => `${v}%`}
      yAxisTickFormat={(v: number) => `${v}%`}
    />
  );
}

const CUSTOM_CHARTS = [
  {
    letter: "1",
    name: "KPI",
    note: "The latest value, its change, and a sparkline.",
    lead: `${NAME[leader]} gained the most, up ${abs(changeOf(TREND[leader]))} to ${usd(TREND[leader].at(-1)!)}.`,
    source: "Daily close, Jun 29 – Sep 29",
    Chart: CustomKpi,
  },
  {
    letter: "2",
    name: "Gauge",
    note: "One value placed inside a known range.",
    lead: `Microsoft closed ${abs(((MS_LAST - MS_LOW) / (MS_HIGH - MS_LOW)) * 100)} of the way up its three-month range.`,
    source: "Microsoft daily close, Jun 29 – Sep 29",
    Chart: CustomGauge,
  },
  {
    letter: "3",
    name: "Heat map",
    note: "A grid where color carries the size and the sign.",
    lead: `The biggest week was ${NAME[bestWeek.t]}'s, starting ${WEEK_LABELS[bestWeek.w]}: up ${abs(bestWeek.v)}.`,
    source: "Weekly change, last close vs. the week before",
    Chart: CustomHeatMap,
  },
  {
    letter: "4",
    name: "Scatter",
    note: "Two measures per item, to show whether they move together.",
    lead: `NVIDIA and AMD moved the same way on ${sameWay} of ${nvdaMoves.length} days, a moderate correlation of ${R.toFixed(2)}.`,
    source: "Daily change, NVIDIA (x) vs. AMD (y)",
    Chart: CustomScatter,
  },
];

const FAMILIES = {
  comparison: { title: "Comparison", charts: null },
  trend: { title: "Trend", charts: TREND_CHARTS },
  composition: { title: "Composition", charts: COMPOSITION_CHARTS },
  specialized: { title: "Specialized", charts: SPECIALIZED_CHARTS },
  custom: { title: "Custom", charts: CUSTOM_CHARTS },
} as const;
type Family = keyof typeof FAMILIES;

export default function Lab() {
  const styles = useStyles();
  const [mode, setMode] = useState<Mode>("complete");
  const [scheme, setScheme] = useState<Scheme>("palette");
  const [family, setFamily] = useState<Family>(() =>
    ((f) => (f && f in FAMILIES ? (f as Family) : "comparison"))(
      new URLSearchParams(window.location.search).get("family"),
    ),
  );
  const charts =
    family === "comparison"
      ? CHARTS
      : FAMILIES[family].charts.map((c) => ({ ...c, semantic: false }));
  return (
    <main className={styles.page}>
      <header className={styles.intro}>
        <Title3 as="h1">Graph card · {FAMILIES[family].title}</Title3>
        <TabList
          className={styles.families}
          selectedValue={family}
          onTabSelect={(_, d) => setFamily(d.value as Family)}
          aria-label="Chart family"
        >
          <Tab value="comparison">Comparison</Tab>
          <Tab value="trend">Trend</Tab>
          <Tab value="composition">Composition</Tab>
          <Tab value="specialized">Specialized</Tab>
          <Tab value="custom">Custom</Tab>
        </TabList>
        <Body1 className={styles.introText}>
          {family === "custom"
            ? "Fluent 2 KPI tiles with sparklines, a gauge, a heat map, and a scatter chart. Maps and free-form vector graphics are not Fluent chart types."
            : family === "specialized"
              ? "Fluent 2 combo and Sankey charts. Sankey is the closest Fluent chart to a ribbon chart. Waterfall charts are not a Fluent chart type."
              : family === "composition"
                ? "Four Fluent 2 part-to-whole charts. Pie and donut are one Fluent chart with a different inner radius. Treemaps are not a Fluent chart type."
                : family === "trend"
                  ? "Four Fluent 2 trend charts from daily closes and volumes. Each stock keeps its comparison color. Zone graphs are not a Fluent chart type; the Zone card is a line chart with a shaded period (color fill bar)."
                  : "Four Fluent 2 comparison charts in the approved Answer card language: a lead sentence that states the finding, the chart, and the source. JEV picks the color scheme: Palette gives each stock one color in every chart; Semantic colors gains and losses. Semantic is offered only where a chart has one series."}
        </Body1>
        <TabList
          selectedValue={mode}
          onTabSelect={(_, d) => setMode(d.value as Mode)}
          aria-label="Card state"
        >
          <Tab value="complete">Complete</Tab>
          <Tab value="streaming">Streaming</Tab>
        </TabList>
        {family === "comparison" && (
          <TabList
            selectedValue={scheme}
            onTabSelect={(_, d) => setScheme(d.value as Scheme)}
            aria-label="Color scheme"
          >
            <Tab value="palette">Palette</Tab>
            <Tab value="semantic">Semantic</Tab>
          </TabList>
        )}
      </header>
      {charts.map(({ letter, name, note, lead, source, Chart, semantic }) => (
        <section key={letter} className={styles.variant} aria-label={name}>
          <div className={styles.variantLabel}>
            <Text size={500} className={styles.variantLetter}>
              {letter}
            </Text>
            <Text size={500} weight="semibold">
              {name}
            </Text>
            <Caption1 className={styles.variantNote}>{note}</Caption1>
          </div>
          <GraphCard lead={lead} note={source} streaming={mode === "streaming"}>
            <Chart scheme={semantic ? scheme : "palette"} />
          </GraphCard>
        </section>
      ))}
    </main>
  );
}
