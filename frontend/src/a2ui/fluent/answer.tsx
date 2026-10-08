"use client";

import {
  Body1,
  Caption1,
  makeStyles,
  Popover,
  PopoverSurface,
  PopoverTrigger,
  shorthands,
  Skeleton,
  SkeletonItem,
  Text,
  Title3,
  tokens,
} from "@fluentui/react-components";

import { records, str } from "./tone";

type SourceInput = {
  url?: unknown;
  title?: unknown;
  site?: unknown;
  description?: unknown;
  image?: unknown;
};

type PointInput = { text?: unknown; sources?: unknown };

type Source = {
  url: string;
  title: string;
  site: string;
  description: string;
  image: string;
  domain: string;
};

type Segment = { text: string; sources: string[] };

const useStyles = makeStyles({
  root: {
    display: "grid",
    rowGap: "20px",
    minWidth: 0,
    padding: "var(--jev-pad-y) var(--jev-pad-x)",
  },
  lead: { margin: 0, textWrap: "pretty" },
  points: {
    display: "grid",
    rowGap: "14px",
    margin: 0,
    padding: 0,
    listStyleType: "none",
  },
  point: {
    display: "grid",
    gridTemplateColumns: "6px minmax(0, 1fr)",
    columnGap: "14px",
    alignItems: "baseline",
  },
  dot: {
    width: "6px",
    height: "6px",
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorBrandForeground1,
    transform: "translateY(-2px)",
  },
  body: {
    lineHeight: tokens.lineHeightBase400,
    fontSize: tokens.fontSizeBase400,
  },
  keep: { whiteSpace: "nowrap" },
  chip: {
    display: "inline-flex",
    alignItems: "center",
    columnGap: "5px",
    maxWidth: "180px",
    height: "22px",
    padding: "0 8px 0 4px",
    marginLeft: "6px",
    borderRadius: tokens.borderRadiusCircular,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase200,
    textDecorationLine: "none",
    verticalAlign: "1px",
    transitionProperty: "border-color, background-color",
    transitionDuration: tokens.durationFaster,
    ":hover": {
      ...shorthands.borderColor(tokens.colorBrandStroke1),
      backgroundColor: tokens.colorBrandBackground2,
    },
    ":focus-visible": { outline: `2px solid ${tokens.colorStrokeFocus2}` },
  },
  favicon: {
    width: "16px",
    height: "16px",
    borderRadius: tokens.borderRadiusSmall,
    flexShrink: 0,
  },
  ellipsis: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  preview: { width: "300px", padding: 0, overflow: "hidden" },
  previewImage: {
    display: "block",
    width: "100%",
    aspectRatio: "1.91 / 1",
    objectFit: "cover",
  },
  previewBody: { padding: "12px 14px 14px", display: "grid", rowGap: "6px" },
  site: {
    display: "flex",
    alignItems: "center",
    columnGap: "6px",
    minWidth: 0,
    color: tokens.colorNeutralForeground3,
  },
  clamp2: {
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  feature: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 200px) minmax(0, 1fr)",
    overflow: "hidden",
    borderRadius: tokens.borderRadiusXLarge,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    color: tokens.colorNeutralForeground1,
    textDecorationLine: "none",
    transitionProperty: "border-color",
    transitionDuration: tokens.durationFaster,
    ":hover": { ...shorthands.borderColor(tokens.colorNeutralStroke1Hover) },
    ":focus-visible": { outline: `2px solid ${tokens.colorStrokeFocus2}` },
    "@media (max-width: 640px)": { gridTemplateColumns: "1fr" },
  },
  featureImage: {
    width: "100%",
    aspectRatio: "1.91 / 1",
    alignSelf: "center",
    objectFit: "cover",
    display: "block",
  },
  featureBody: {
    padding: "14px 16px",
    display: "grid",
    alignContent: "center",
    rowGap: "6px",
  },
  caret: {
    display: "inline-block",
    width: "2px",
    height: "1em",
    marginLeft: "3px",
    verticalAlign: "text-bottom",
    backgroundColor: tokens.colorBrandForeground1,
    animationName: { "0%, 100%": { opacity: 1 }, "50%": { opacity: 0 } },
    animationDuration: "1s",
    animationIterationCount: "infinite",
    "@media (prefers-reduced-motion: reduce)": { animationName: "none" },
  },
  skeleton: { display: "grid", rowGap: "12px" },
});

const bool = (value: unknown) =>
  value === true ||
  (typeof value === "string" && value.toLowerCase() === "true");

function httpUrl(value: unknown): string {
  const candidate = str(value).trim();
  if (!candidate) return "";
  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : "";
  } catch {
    return "";
  }
}

function parseSources(value: unknown): Source[] {
  const seen = new Set<string>();
  return records<SourceInput>(value)
    .map((item) => {
      const url = httpUrl(item.url);
      if (!url || seen.has(url)) return null;
      const domain = new URL(url).hostname;
      const title = str(item.title).trim() || domain;
      seen.add(url);
      return {
        url,
        domain,
        title,
        site: str(item.site).trim() || domain,
        description: str(item.description).trim(),
        image: httpUrl(item.image),
      };
    })
    .filter((source): source is Source => source !== null);
}

function parseUrls(value: unknown, known: Set<string>): string[] {
  return records<unknown>(value)
    .map(httpUrl)
    .filter(
      (url, index, urls) => known.has(url) && urls.indexOf(url) === index,
    );
}

function parsePoints(value: unknown, known: Set<string>): Segment[] {
  return records<PointInput>(value)
    .map((item) => ({
      text: str(item.text).trim(),
      sources: Array.isArray(item.sources)
        ? item.sources
            .map(httpUrl)
            .filter(
              (url, index, urls) =>
                known.has(url) && urls.indexOf(url) === index,
            )
        : [],
    }))
    .filter((point) => point.text);
}

const favicon = (domain: string) =>
  `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;

function Favicon({ source }: { source: Source }) {
  const styles = useStyles();
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={styles.favicon}
      src={favicon(source.domain)}
      alt=""
      width={16}
      height={16}
    />
  );
}

function SourcePreview({ source }: { source: Source }) {
  const styles = useStyles();
  return (
    <>
      {source.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={styles.previewImage} src={source.image} alt="" />
      ) : null}
      <div className={styles.previewBody}>
        <span className={styles.site}>
          <Favicon source={source} />
          <Caption1 className={styles.ellipsis}>{source.site}</Caption1>
        </span>
        <Text weight="semibold" className={styles.clamp2}>
          {source.title}
        </Text>
        {source.description ? (
          <Caption1 className={styles.clamp2}>{source.description}</Caption1>
        ) : null}
      </div>
    </>
  );
}

function SourceChip({ source }: { source: Source }) {
  const styles = useStyles();
  return (
    <Popover openOnHover withArrow mouseLeaveDelay={120} positioning="above">
      <PopoverTrigger disableButtonEnhancement>
        <a
          className={styles.chip}
          href={source.url}
          target="_blank"
          rel="noreferrer"
          aria-label={`Source: ${source.title}`}
        >
          <Favicon source={source} />
          <span className={styles.ellipsis}>
            {source.domain.replace(/^(www|docs|developers)\./, "")}
          </span>
        </a>
      </PopoverTrigger>
      <PopoverSurface className={styles.preview}>
        <SourcePreview source={source} />
      </PopoverSurface>
    </Popover>
  );
}

function Cited({
  segment,
  sources,
}: {
  segment: Segment;
  sources: Map<string, Source>;
}) {
  const styles = useStyles();
  const cited = segment.sources
    .map((url) => sources.get(url))
    .filter((source): source is Source => source !== undefined);
  const split = segment.text.lastIndexOf(" ");
  const head = split < 0 ? "" : segment.text.slice(0, split + 1);
  const tail = split < 0 ? segment.text : segment.text.slice(split + 1);
  const [first, ...rest] = cited;

  return (
    <>
      {head}
      <span className={styles.keep}>
        {tail}
        {first ? <SourceChip source={first} /> : null}
      </span>
      {rest.map((source) => (
        <SourceChip key={source.url} source={source} />
      ))}
    </>
  );
}

function pickFeatured(
  sources: Source[],
  leadSources: string[],
  points: Segment[],
): Source | undefined {
  const counts = new Map<string, number>();
  for (const url of [
    ...leadSources,
    ...points.flatMap((point) => point.sources),
  ]) {
    counts.set(url, (counts.get(url) ?? 0) + 1);
  }
  return [...sources].sort(
    (a, b) =>
      (counts.get(b.url) ?? 0) * 4 +
      (b.image ? 2 : 0) +
      (b.description ? 1 : 0) -
      ((counts.get(a.url) ?? 0) * 4 +
        (a.image ? 2 : 0) +
        (a.description ? 1 : 0)),
  )[0];
}

export function AnswerView(props: {
  lead?: unknown;
  leadSources?: unknown;
  points?: unknown;
  sources?: unknown;
  streaming?: unknown;
}) {
  const styles = useStyles();
  const lead = str(props.lead).trim();
  const sources = parseSources(props.sources);
  const byUrl = new Map(sources.map((source) => [source.url, source]));
  const known = new Set(byUrl.keys());
  const leadSources = parseUrls(props.leadSources, known);
  const points = parsePoints(props.points, known);
  const featured = pickFeatured(sources, leadSources, points);
  const streaming = bool(props.streaming);

  if (!lead && points.length === 0) {
    return streaming ? (
      <article className={styles.root} aria-busy="true">
        <Skeleton className={styles.skeleton} aria-label="Building answer">
          <SkeletonItem style={{ width: "88%", height: "24px" }} />
          <SkeletonItem style={{ width: "72%", height: "24px" }} />
          <SkeletonItem style={{ width: "94%", height: "16px" }} />
        </Skeleton>
      </article>
    ) : null;
  }

  return (
    <article className={styles.root} aria-busy={streaming}>
      {lead ? (
        <Title3 as="p" className={styles.lead}>
          <Cited
            segment={{ text: lead, sources: leadSources }}
            sources={byUrl}
          />
          {streaming && points.length === 0 ? (
            <span className={styles.caret} aria-hidden />
          ) : null}
        </Title3>
      ) : null}
      {points.length > 0 ? (
        <ul className={styles.points}>
          {points.map((point, index) => (
            <li key={`${point.text}-${index}`} className={styles.point}>
              <span className={styles.dot} aria-hidden />
              <Body1 className={styles.body}>
                <Cited segment={point} sources={byUrl} />
                {streaming && index === points.length - 1 ? (
                  <span className={styles.caret} aria-hidden />
                ) : null}
              </Body1>
            </li>
          ))}
        </ul>
      ) : null}
      {featured ? (
        <a
          href={featured.url}
          target="_blank"
          rel="noreferrer"
          className={styles.feature}
          style={featured.image ? undefined : { gridTemplateColumns: "1fr" }}
        >
          {featured.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className={styles.featureImage} src={featured.image} alt="" />
          ) : streaming ? (
            <Skeleton aria-label="Finding sources">
              <SkeletonItem
                shape="rectangle"
                style={{
                  height: "92px",
                  borderRadius: tokens.borderRadiusXLarge,
                }}
              />
            </Skeleton>
          ) : null}
          <span className={styles.featureBody}>
            <span className={styles.site}>
              <Favicon source={featured} />
              <Caption1>{featured.site}</Caption1>
            </span>
            <Text weight="semibold" className={styles.clamp2}>
              {featured.title}
            </Text>
            {featured.description ? (
              <Caption1 className={styles.clamp2}>
                {featured.description}
              </Caption1>
            ) : null}
          </span>
        </a>
      ) : null}
    </article>
  );
}
