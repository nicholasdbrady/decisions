"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import {
  Body1,
  Caption1,
  makeStyles,
  Skeleton,
  SkeletonItem,
  Text,
  Title2,
  Title3,
  tokens,
} from "@fluentui/react-components";
import {
  AreaChart,
  type CustomizedCalloutData,
  DataVizPalette,
  DonutChart,
  FunnelChart,
  GaugeChart,
  getColorFromToken,
  GroupedVerticalBarChart,
  HeatMapChart,
  HorizontalBarChartWithAxis,
  LineChart,
  SankeyChart,
  ScatterChart,
  VerticalBarChart,
  VerticalStackedBarChart,
} from "@fluentui/react-charts";

import { str } from "./tone";

type Series = { name: string; values: number[] };
type Point = { x: number; y: number; label: string; series: string };
type Link = { source: string; target: string; value: number };
type Range = { minimum: number; maximum: number; value: number };
type Graph = {
  lead: string;
  caption: string;
  kind: string;
  scheme: "palette" | "semantic";
  unit: string;
  labels: string[];
  series: Series[];
  points: Point[];
  links: Link[];
  range: Range | null;
  source_name: string;
  source_url: string;
};

const COLORS = [
  DataVizPalette.color1,
  DataVizPalette.color2,
  DataVizPalette.color3,
  DataVizPalette.color4,
  DataVizPalette.color5,
  DataVizPalette.color6,
  DataVizPalette.color7,
  DataVizPalette.color8,
].map((token) => getColorFromToken(token));

const success = getColorFromToken(DataVizPalette.success);
const error = getColorFromToken(DataVizPalette.error);
const disabled = getColorFromToken(DataVizPalette.disabled);
const CATEGORY_START = Date.UTC(2000, 0, 1);
const DAY_MS = 86_400_000;

const useStyles = makeStyles({
  root: {
    display: "grid",
    rowGap: "18px",
    minWidth: 0,
    padding: "var(--jev-pad-y) var(--jev-pad-x)",
  },
  lead: { margin: 0, textWrap: "pretty" },
  plot: {
    width: "100%",
    minWidth: 0,
    overflow: "hidden",
    "& line[id^='lineID_'], & path[id^='lineID_']": {
      cursor: "pointer",
    },
  },
  source: {
    display: "inline-flex",
    alignItems: "center",
    columnGap: "7px",
    width: "fit-content",
    maxWidth: "100%",
    color: tokens.colorNeutralForeground3,
    textDecorationLine: "none",
    ":hover": { color: tokens.colorBrandForeground1 },
    ":focus-visible": { outline: `2px solid ${tokens.colorStrokeFocus2}` },
  },
  favicon: {
    width: "16px",
    height: "16px",
    borderRadius: tokens.borderRadiusSmall,
  },
  kpis: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "12px",
  },
  kpi: {
    display: "grid",
    rowGap: "4px",
    padding: "14px",
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  up: { color: tokens.colorPaletteGreenForeground1 },
  down: { color: tokens.colorPaletteRedForeground1 },
  empty: {
    display: "grid",
    placeItems: "center",
    minHeight: "220px",
    color: tokens.colorNeutralForeground3,
  },
  xLabels: {
    display: "grid",
    marginTop: "-18px",
    paddingInline: "44px 16px",
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase100,
  },
  xLabel: {
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    textAlign: "center",
  },
  legend: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px 16px",
    marginTop: "14px",
    paddingInline: "44px 16px",
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase200,
  },
  legendItem: {
    display: "inline-flex",
    alignItems: "center",
    columnGap: "6px",
    minHeight: "28px",
    border: 0,
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: "transparent",
    paddingInline: "8px",
    color: "inherit",
    font: "inherit",
    cursor: "pointer",
    transitionProperty: "background-color, color, opacity",
    transitionDuration: tokens.durationFaster,
    ":hover": {
      backgroundColor: tokens.colorNeutralBackground2,
      color: tokens.colorNeutralForeground1,
    },
    ":focus-visible": {
      outline: `2px solid ${tokens.colorStrokeFocus2}`,
      outlineOffset: "2px",
    },
  },
  legendLabel: {
    display: "inline-flex",
    alignItems: "center",
    columnGap: "6px",
    minHeight: "28px",
    paddingInline: "8px",
  },
  legendHidden: { opacity: 0.42 },
  legendIsolated: {
    backgroundColor: tokens.colorNeutralBackground2,
    color: tokens.colorNeutralForeground1,
  },
  swatch: { width: "10px", height: "10px", borderRadius: "2px" },
  showAll: {
    minHeight: "28px",
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorNeutralBackground1,
    paddingInline: "10px",
    color: tokens.colorBrandForeground1,
    font: "inherit",
    fontWeight: tokens.fontWeightSemibold,
    cursor: "pointer",
    ":hover": { backgroundColor: tokens.colorNeutralBackground2 },
    ":focus-visible": {
      outline: `2px solid ${tokens.colorStrokeFocus2}`,
      outlineOffset: "2px",
    },
  },
  callout: {
    display: "grid",
    rowGap: "8px",
    minWidth: "180px",
    padding: "4px",
  },
  calloutDate: {
    color: tokens.colorNeutralForeground3,
    fontVariantNumeric: "tabular-nums",
  },
  calloutRows: {
    display: "grid",
    rowGap: "6px",
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  calloutRow: {
    display: "grid",
    gridTemplateColumns: "10px minmax(0, 1fr) auto",
    alignItems: "center",
    columnGap: "8px",
  },
  calloutValue: {
    fontWeight: tokens.fontWeightSemibold,
    fontVariantNumeric: "tabular-nums",
  },
});

const bool = (value: unknown) =>
  value === true ||
  (typeof value === "string" && value.toLowerCase() === "true");

function parseGraph(value: unknown): Graph | null {
  try {
    const parsed = JSON.parse(str(value)) as Partial<Graph>;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      lead: str(parsed.lead).trim(),
      caption: str(parsed.caption).trim(),
      kind: str(parsed.kind).trim() || "line",
      scheme: parsed.scheme === "semantic" ? "semantic" : "palette",
      unit: str(parsed.unit).trim(),
      labels: Array.isArray(parsed.labels)
        ? parsed.labels.map(str).filter(Boolean)
        : [],
      series: Array.isArray(parsed.series)
        ? parsed.series
            .filter(
              (item): item is Series =>
                !!item &&
                typeof item === "object" &&
                typeof item.name === "string" &&
                Array.isArray(item.values),
            )
            .map((item) => ({
              name: item.name,
              values: item.values.filter(
                (number): number is number => typeof number === "number",
              ),
            }))
        : [],
      points: Array.isArray(parsed.points)
        ? parsed.points.filter(
            (item): item is Point =>
              !!item &&
              typeof item.x === "number" &&
              typeof item.y === "number",
          )
        : [],
      links: Array.isArray(parsed.links)
        ? parsed.links.filter(
            (item): item is Link =>
              !!item &&
              typeof item.source === "string" &&
              typeof item.target === "string" &&
              typeof item.value === "number",
          )
        : [],
      range:
        parsed.range &&
        typeof parsed.range.minimum === "number" &&
        typeof parsed.range.maximum === "number" &&
        typeof parsed.range.value === "number"
          ? parsed.range
          : null,
      source_name: str(parsed.source_name).trim(),
      source_url: httpUrl(parsed.source_url),
    };
  } catch {
    return null;
  }
}

function httpUrl(value: unknown): string {
  const candidate = str(value).trim();
  if (!candidate) return "";
  try {
    const url = new URL(candidate);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.round(entry.contentRect.width)),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

const color = (index: number, value?: number, semantic = false) =>
  semantic && value !== undefined
    ? value < 0
      ? error
      : success
    : COLORS[index % COLORS.length];

const format = (value: number, unit: string) =>
  `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}${unit}`;

const categoryDate = (index: number) =>
  new Date(CATEGORY_START + index * DAY_MS);

function categories(graph: Graph) {
  const first = graph.series[0];
  if (first && graph.labels.length === first.values.length) {
    return graph.labels.map((label, index) => ({
      label,
      value: first.values[index],
    }));
  }
  return graph.series.map((series) => ({
    label: series.name,
    value: series.values.at(-1) ?? 0,
  }));
}

function plotHeight(graph: Graph): number | undefined {
  switch (graph.kind) {
    case "kpi":
      return undefined;
    case "gauge":
      return 230;
    case "bar":
      return Math.max(300, Math.min(400, categories(graph).length * 34 + 44));
    case "line":
    case "zone":
    case "area":
    case "stacked-area":
    case "funnel":
    case "stacked-funnel":
      return 350;
    case "sankey":
    case "combo":
      return 320;
    case "clustered-column":
    case "stacked-column":
    case "scatter":
      return 300;
    case "heatmap":
      return Math.max(300, graph.labels.length * 34 + 70);
    default:
      return 300;
  }
}

function isFlexibleTrend(graph: Graph): boolean {
  return ["line", "zone", "area", "stacked-area"].includes(graph.kind);
}

function GraphPlot({ graph }: { graph: Graph }) {
  const semantic = graph.scheme === "semantic";
  const cats = categories(graph);
  const height = Math.max(260, Math.min(380, cats.length * 34));

  switch (graph.kind) {
    case "column":
      return (
        <ChartHost height={280}>
          <VerticalBarChart
            height={280}
            hideLegend
            barWidth="auto"
            maxBarWidth={48}
            data={cats.map((item, index) => ({
              x: item.label,
              y: item.value,
              legend: item.label,
              color: color(index, item.value, semantic),
              yAxisCalloutData: format(item.value, graph.unit),
            }))}
          />
        </ChartHost>
      );
    case "bar":
      return (
        <HorizontalBarChartWithAxis
          height={height}
          hideLegend
          hideLabels
          showYAxisLables
          data={[...cats]
            .sort((a, b) => a.value - b.value)
            .map((item, index) => ({
              x: item.value,
              y: item.label,
              legend: item.label,
              color: color(index, item.value, semantic),
              xAxisCalloutData: format(item.value, graph.unit),
            }))}
        />
      );
    case "clustered-column":
      return (
        <div>
          <ChartHost height={220}>
            <GroupedVerticalBarChart
              height={220}
              hideLabels
              hideLegend
              barWidth="auto"
              maxBarWidth={28}
              data={graph.labels.map((label, labelIndex) => ({
                name: label,
                series: graph.series.map((series, seriesIndex) => ({
                  key: `${label}-${series.name}`,
                  legend: series.name,
                  data: series.values[labelIndex] ?? 0,
                  color: color(seriesIndex),
                  yAxisCalloutData: format(
                    series.values[labelIndex] ?? 0,
                    graph.unit,
                  ),
                })),
              }))}
            />
          </ChartHost>
          <GraphLegend series={graph.series} />
        </div>
      );
    case "stacked-column":
      return (
        <div>
          <ChartHost height={220}>
            <VerticalStackedBarChart
              height={220}
              hideLegend
              barWidth="auto"
              maxBarWidth={64}
              data={graph.labels.map((label, labelIndex) => ({
                xAxisPoint: label,
                chartData: graph.series.map((series, seriesIndex) => ({
                  legend: series.name,
                  data: series.values[labelIndex] ?? 0,
                  color: color(seriesIndex),
                  yAxisCalloutData: format(
                    series.values[labelIndex] ?? 0,
                    graph.unit,
                  ),
                })),
              }))}
            />
          </ChartHost>
          <GraphLegend series={graph.series} />
        </div>
      );
    case "line":
    case "zone":
      return <Trend graph={graph} />;
    case "area":
    case "stacked-area":
      return <Trend graph={graph} />;
    case "pie":
    case "donut":
      return (
        <DonutChart
          height={280}
          innerRadius={graph.kind === "donut" ? 70 : 0}
          hideLabels={false}
          showLabelsInPercent
          valueInsideDonut={
            graph.kind === "donut"
              ? format(
                  cats.reduce((sum, item) => sum + item.value, 0),
                  graph.unit,
                )
              : undefined
          }
          data={{
            chartData: cats.map((item, index) => ({
              legend: item.label,
              data: item.value,
              color: color(index, item.value, semantic),
              yAxisCalloutData: format(item.value, graph.unit),
            })),
          }}
        />
      );
    case "funnel":
    case "stacked-funnel":
      return <Funnel graph={graph} stacked={graph.kind === "stacked-funnel"} />;
    case "combo":
      return (
        <VerticalBarChart
          height={300}
          barWidth="auto"
          maxBarWidth={32}
          hideLabels
          data={graph.labels.map((label, index) => ({
            x: label,
            y: graph.series[0]?.values[index] ?? 0,
            legend: graph.series[0]?.name ?? "Value",
            color: color(0),
            yAxisCalloutData: format(
              graph.series[0]?.values[index] ?? 0,
              graph.unit,
            ),
            lineData: graph.series[1]
              ? {
                  y: graph.series[1].values[index] ?? 0,
                  yAxisCalloutData: format(
                    graph.series[1].values[index] ?? 0,
                    graph.unit,
                  ),
                  useSecondaryYScale: true,
                }
              : undefined,
          }))}
          lineLegendText={graph.series[1]?.name}
          lineLegendColor={color(1)}
        />
      );
    case "sankey":
      return <Sankey graph={graph} />;
    case "kpi":
      return <Kpis graph={graph} />;
    case "gauge":
      return <Gauge graph={graph} />;
    case "heatmap":
      return <Heatmap graph={graph} />;
    case "scatter":
      return (
        <div>
          <ChartHost height={240}>
            <ScatterChart
              height={240}
              hideLegend
              data={{
                scatterChartData: pointGroups(graph.points).map(
                  ([name, points], index) => ({
                    legend: name,
                    color: color(index),
                    data: points.map((point) => ({
                      x: point.x,
                      y: point.y,
                      xAxisCalloutData:
                        point.label || format(point.x, graph.unit),
                      yAxisCalloutData: format(point.y, graph.unit),
                    })),
                  }),
                ),
              }}
            />
          </ChartHost>
          <GraphLegend
            series={pointGroups(graph.points).map(([name]) => ({
              name,
              values: [],
            }))}
          />
        </div>
      );
    default:
      return <Empty />;
  }
}

function Trend({ graph }: { graph: Graph }) {
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(() => new Set());
  const [isolatedSeries, setIsolatedSeries] = useState<string | null>(null);

  const indexedSeries = graph.series.map((series, index) => ({ series, index }));
  const visibleSeries = indexedSeries.filter(({ series }) =>
    isolatedSeries ? series.name === isolatedSeries : !hiddenSeries.has(series.name),
  );
  const hasSelection = hiddenSeries.size > 0 || isolatedSeries !== null;

  const toggleSeries = (name: string) => {
    if (isolatedSeries) {
      setIsolatedSeries((current) => (current === name ? null : name));
      return;
    }

    setHiddenSeries((current) => {
      const next = new Set(current);
      if (next.has(name)) {
        next.delete(name);
      } else if (graph.series.length - next.size > 1) {
        next.add(name);
      }
      return next;
    });
  };

  const isolateSeries = (name: string) => {
    setIsolatedSeries((current) => (current === name ? null : name));
  };

  const showAll = () => {
    setHiddenSeries(new Set());
    setIsolatedSeries(null);
  };

  const chartData = {
    lineChartData: visibleSeries.map(({ series, index }) => ({
      legend: series.name,
      color: color(index),
      hideNonActiveDots: true,
      onLineClick: () => isolateSeries(series.name),
      lineOptions: {
        strokeWidth: isolatedSeries === series.name ? 3 : 2,
      },
      data: series.values.map((value, valueIndex) => ({
        x: categoryDate(valueIndex),
        y: value,
        xAxisCalloutData: graph.labels[valueIndex] ?? `${valueIndex + 1}`,
        yAxisCalloutData: format(value, graph.unit),
      })),
    })),
  };

  const sharedProps = {
    height: 280,
    hideLegend: true,
    data: chartData,
    xAxisTickCount: Math.min(graph.labels.length, 6),
    customDateTimeFormatter: () => "",
    isCalloutForStack: true,
    onRenderCalloutPerStack: (data?: CustomizedCalloutData) =>
      data ? <GraphCallout data={data} unit={graph.unit} /> : null,
  };

  return (
    <div>
      {graph.kind === "line" || graph.kind === "zone" ? (
        <LineChart
          {...sharedProps}
          colorFillBars={
            graph.kind === "zone" && graph.labels.length > 1
              ? [
                  {
                    legend: "Recent period",
                    color: tokens.colorPaletteGreenBackground2,
                    data: [
                      {
                        startX: categoryDate(
                          Math.max(0, Math.floor(graph.labels.length * 0.66)),
                        ),
                        endX: categoryDate(graph.labels.length - 1),
                      },
                    ],
                  },
                ]
              : undefined
          }
        />
      ) : (
        <AreaChart
          {...sharedProps}
          mode={graph.kind === "area" ? "tozeroy" : undefined}
          enableGradient
        />
      )}
      <AxisLabels labels={graph.labels} />
      <GraphLegend
        series={graph.series}
        hiddenSeries={hiddenSeries}
        isolatedSeries={isolatedSeries}
        hasSelection={hasSelection}
        onToggle={toggleSeries}
        onShowAll={showAll}
      />
    </div>
  );
}

function GraphCallout({
  data,
  unit,
}: {
  data: CustomizedCalloutData;
  unit: string;
}) {
  const styles = useStyles();
  const date = data.values[0]?.xAxisCalloutData ?? String(data.x);

  return (
    <div className={styles.callout} data-jev-graph-callout>
      <Caption1 className={styles.calloutDate}>{date}</Caption1>
      <ul className={styles.calloutRows}>
        {data.values.map((value) => (
          <li className={styles.calloutRow} key={value.legend}>
            <span
              className={styles.swatch}
              style={{ backgroundColor: value.color }}
              aria-hidden="true"
            />
            <Body1>{value.legend}</Body1>
            <Body1 className={styles.calloutValue}>
              {typeof value.yAxisCalloutData === "string"
                ? value.yAxisCalloutData
                : format(value.y, unit)}
            </Body1>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChartHost({
  height,
  children,
}: {
  height: number;
  children: ReactNode;
}) {
  return <div style={{ height, minHeight: height }}>{children}</div>;
}

function AxisLabels({ labels }: { labels: string[] }) {
  const styles = useStyles();
  const step = Math.max(1, Math.ceil((labels.length - 1) / 5));
  return (
    <div
      className={styles.xLabels}
      style={{ gridTemplateColumns: `repeat(${labels.length}, minmax(0, 1fr))` }}
      aria-hidden="true"
    >
      {labels.map((label, index) => (
        <span
          key={`${label}-${index}`}
          className={styles.xLabel}
          style={{
            visibility:
              index === 0 || index === labels.length - 1 || index % step === 0
                ? "visible"
                : "hidden",
          }}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

function GraphLegend({
  series,
  hiddenSeries = new Set(),
  isolatedSeries = null,
  hasSelection = false,
  onToggle,
  onShowAll,
}: {
  series: Series[];
  hiddenSeries?: Set<string>;
  isolatedSeries?: string | null;
  hasSelection?: boolean;
  onToggle?: (name: string) => void;
  onShowAll?: () => void;
}) {
  const styles = useStyles();
  if (series.length < 2) return null;
  return (
    <div
      className={styles.legend}
      data-jev-graph-legend
      aria-label={onToggle ? "Chart series" : undefined}
    >
      {series.map((item, index) => {
        const hidden = hiddenSeries.has(item.name);
        const isolated = isolatedSeries === item.name;
        const active = isolatedSeries ? isolated : !hidden;

        if (!onToggle) {
          return (
            <span key={item.name} className={styles.legendLabel}>
              <i
                className={styles.swatch}
                style={{ backgroundColor: color(index) }}
                aria-hidden="true"
              />
              {item.name}
            </span>
          );
        }

        return (
          <button
            key={item.name}
            type="button"
            className={[
              styles.legendItem,
              hidden || (isolatedSeries !== null && !isolated) ? styles.legendHidden : "",
              isolated ? styles.legendIsolated : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-pressed={active}
            title={
              isolatedSeries
                ? isolated
                  ? `Restore all ${item.name} comparisons`
                  : `Compare only ${item.name}`
                : hidden
                  ? `Show ${item.name}`
                  : `Hide ${item.name}`
            }
            onClick={() => onToggle(item.name)}
          >
            <i
              className={styles.swatch}
              style={{ backgroundColor: color(index) }}
              aria-hidden="true"
            />
            {item.name}
          </button>
        );
      })}
      {hasSelection && onShowAll ? (
        <button type="button" className={styles.showAll} onClick={onShowAll}>
          Show all
        </button>
      ) : null}
    </div>
  );
}

function Funnel({ graph, stacked }: { graph: Graph; stacked: boolean }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  return (
    <div ref={ref} style={{ paddingBottom: 44 }}>
      {width > 0 ? (
        <FunnelChart
          width={width}
          height={300}
          data={graph.labels.map((label, index) =>
            stacked
              ? {
                  stage: label,
                  subValues: graph.series.map((series, seriesIndex) => ({
                    category: series.name,
                    value: series.values[index] ?? 0,
                    color: color(seriesIndex),
                  })),
                }
              : {
                  stage: label,
                  value: graph.series[0]?.values[index] ?? 0,
                  color: color(index),
                },
          )}
        />
      ) : null}
    </div>
  );
}

function Sankey({ graph }: { graph: Graph }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const names = [...new Set(graph.links.flatMap((link) => [link.source, link.target]))];
  return (
    <div ref={ref}>
      {width > 0 ? (
        <SankeyChart
          width={width}
          height={300}
          pathColor={disabled}
          reflowProps={{ mode: "min-width" }}
          data={{
            SankeyChartData: {
              nodes: names.map((name, index) => ({
                nodeId: index,
                name,
                color: color(index),
                borderColor: color(index),
              })),
              links: graph.links.map((link) => ({
                source: names.indexOf(link.source),
                target: names.indexOf(link.target),
                value: link.value,
              })),
            },
          }}
        />
      ) : null}
    </div>
  );
}

function Kpis({ graph }: { graph: Graph }) {
  const styles = useStyles();
  return (
    <div className={styles.kpis}>
      {graph.series.map((series, index) => {
        const first = series.values[0] ?? 0;
        const latest = series.values.at(-1) ?? 0;
        const change = first === 0 ? 0 : ((latest - first) / Math.abs(first)) * 100;
        return (
          <div key={series.name} className={styles.kpi}>
            <Caption1>{series.name}</Caption1>
            <Title2 as="p" style={{ margin: 0 }}>
              {format(latest, graph.unit)}
            </Title2>
            <Caption1 className={change < 0 ? styles.down : styles.up}>
              {change > 0 ? "+" : ""}
              {change.toFixed(1)}%
            </Caption1>
            <Spark values={series.values} color={color(index)} label={series.name} />
          </div>
        );
      })}
    </div>
  );
}

function Spark({
  values,
  color: stroke,
  label,
}: {
  values: number[];
  color: string;
  label: string;
}) {
  const low = Math.min(...values);
  const span = Math.max(...values) - low || 1;
  const points = values.map(
    (value, index) =>
      `${((index / Math.max(1, values.length - 1)) * 160).toFixed(1)},${(
        34 -
        ((value - low) / span) * 30
      ).toFixed(1)}`,
  );
  return (
    <svg
      width="100%"
      height={36}
      viewBox="0 0 160 36"
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
    >
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Gauge({ graph }: { graph: Graph }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const range = graph.range;
  if (!range) return <Empty />;
  return (
    <div ref={ref}>
      {width > 0 ? (
        <GaugeChart
          width={Math.min(width, 360)}
          height={210}
          variant="single-segment"
          minValue={range.minimum}
          maxValue={range.maximum}
          chartValue={range.value}
          chartValueFormat={() => format(range.value, graph.unit)}
          sublabel={`${format(range.minimum, graph.unit)} – ${format(range.maximum, graph.unit)}`}
          hideMinMax
          hideLegend
          segments={[
            {
              legend: graph.caption || "Range",
              size: range.maximum - range.minimum,
              color: color(0),
            },
          ]}
        />
      ) : null}
    </div>
  );
}

function Heatmap({ graph }: { graph: Graph }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const rotate = width > 0 && width < 560;
  const height = rotate ? graph.labels.length * 34 + 70 : 240;
  const values = graph.series.flatMap((series) => series.values);
  const extent = Math.max(1, ...values.map(Math.abs));
  return (
    <div ref={ref} style={{ height, minHeight: height }}>
      {width > 0 ? (
        <HeatMapChart
          key={rotate ? "tall" : "wide"}
          height={height}
          data={graph.series.map((series, seriesIndex) => ({
            legend: series.name,
            value: seriesIndex,
            data: series.values.map((value, labelIndex) => ({
              x: rotate ? series.name : graph.labels[labelIndex] ?? labelIndex,
              y: rotate ? graph.labels[labelIndex] ?? labelIndex : series.name,
              value,
              rectText: value.toLocaleString(undefined, {
                maximumFractionDigits: 1,
              }),
            })),
          }))}
          domainValuesForColorScale={[-extent, 0, extent]}
          rangeValuesForColorScale={[error, "#f5f5f5", success]}
        />
      ) : null}
    </div>
  );
}

function pointGroups(points: Point[]): [string, Point[]][] {
  const groups = new Map<string, Point[]>();
  for (const point of points) {
    const name = point.series || "Values";
    groups.set(name, [...(groups.get(name) ?? []), point]);
  }
  return [...groups.entries()];
}

function Empty() {
  const styles = useStyles();
  return <div className={styles.empty}>No chart data available.</div>;
}

export function GraphView({
  data,
  streaming,
}: {
  data?: unknown;
  streaming?: unknown;
}) {
  const styles = useStyles();
  const graph = parseGraph(data);
  const loading = bool(streaming);
  const height = graph ? plotHeight(graph) : loading ? 300 : undefined;
  const flexiblePlot = graph ? isFlexibleTrend(graph) : false;
  const sourceDomain = graph?.source_url
    ? new URL(graph.source_url).hostname
    : "";

  return (
    <section className={styles.root} aria-busy={loading}>
      {graph?.lead ? (
        <Title3 as="p" className={styles.lead}>
          {graph.lead}
        </Title3>
      ) : loading ? (
        <Skeleton aria-label="Loading graph summary">
          <SkeletonItem style={{ width: "78%", height: 22 }} />
        </Skeleton>
      ) : null}
      <div
        className={styles.plot}
        data-jev-graph-plot
        style={
          height === undefined
            ? undefined
            : flexiblePlot
              ? { minHeight: height }
              : { height, minHeight: height, flex: "0 0 auto" }
        }
      >
        {loading ? (
          <Skeleton aria-label="Loading graph">
            <SkeletonItem
              shape="rectangle"
              style={{ height: 280, borderRadius: 8 }}
            />
          </Skeleton>
        ) : graph ? (
          <GraphPlot graph={graph} />
        ) : (
          <Empty />
        )}
      </div>
      {graph?.caption ? (
        <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
          {graph.caption}
        </Text>
      ) : null}
      {graph?.source_name ? (
        graph.source_url ? (
          <a
            className={styles.source}
            href={graph.source_url}
            target="_blank"
            rel="noreferrer"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={styles.favicon}
              src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(sourceDomain)}&sz=64`}
              alt=""
            />
            <Caption1>{graph.source_name}</Caption1>
          </a>
        ) : (
          <Caption1 className={styles.source}>{graph.source_name}</Caption1>
        )
      ) : null}
    </section>
  );
}
