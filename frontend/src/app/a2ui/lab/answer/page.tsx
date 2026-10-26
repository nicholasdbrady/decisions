"use client";

import { useState } from "react";
import {
  Body1,
  Caption1,
  Card,
  makeStyles,
  Popover,
  PopoverSurface,
  PopoverTrigger,
  shorthands,
  Skeleton,
  SkeletonItem,
  Tab,
  TabList,
  Text,
  Title3,
  tokens,
} from "@fluentui/react-components";

import { FluentRoot } from "@/fluent/root";

/**
 * Answer card lab: the approved Lead layout, with two treatments for the extra sources.
 * Source metadata is real Open Graph data fetched from each URL, including the gaps
 * (missing image, missing description) that the card must survive.
 */

type Source = {
  id: number;
  url: string;
  domain: string;
  site: string;
  title: string;
  description?: string;
  image?: string;
};

type Segment = { text: string; cite: number[] };
type Mode = "complete" | "streaming" | "noImages";

const SOURCES: Source[] = [
  {
    id: 1,
    url: "https://a2ui.org/",
    domain: "a2ui.org",
    site: "A2UI",
    title: "A2UI",
    description: "A2UI, a streaming protocol for Agent-Driven User Interfaces",
  },
  {
    id: 2,
    url: "https://github.com/a2ui-project/a2ui",
    domain: "github.com",
    site: "GitHub",
    title: "a2ui-project/a2ui",
    description: "Contribute to a2ui-project/a2ui development by creating an account on GitHub.",
    image:
      "https://opengraph.githubassets.com/485303f4d69c8d2ccef46298972fa92a07abe3e03f888fa55b8c61f4f61e0437/a2ui-project/a2ui",
  },
  {
    id: 3,
    url: "https://docs.ag-ui.com/introduction",
    domain: "docs.ag-ui.com",
    site: "Agent User Interaction Protocol",
    title: "AG-UI Overview",
    image:
      "https://tawkitai.mintlify.app/mintlify-assets/_next/image?url=%2F_mintlify%2Fapi%2Fog%3Fdivision%3DGet%2BStarted%26title%3DAG-UI%2BOverview%26theme%3D1972d63655603250d6f8c373&w=1200&q=100",
  },
  {
    id: 4,
    url: "https://developers.googleblog.com/introducing-a2ui-an-open-project-for-agent-driven-interfaces/",
    domain: "developers.googleblog.com",
    site: "Google Developers Blog",
    title: "Introducing A2UI: An open project for agent-driven interfaces",
    description:
      "A2UI is an open-source project for agent-driven, cross-platform generative UI. It uses a secure, declarative format for agents to safely render UIs.",
    image:
      "https://storage.googleapis.com/gweb-developer-goog-blog-assets/images/train-gpt2-model-with-jax-on-tpu-.2e16d0ba.fill-1200x600.png",
  },
  {
    id: 5,
    url: "https://www.copilotkit.ai/blog/build-with-googles-new-a2ui-spec-agent-user-interfaces-with-a2ui-ag-ui",
    domain: "copilotkit.ai",
    site: "CopilotKit",
    title: "Build with Google's new A2UI Spec: Agent User Interfaces with A2UI + AG-UI",
    description:
      "Learn how to build full-stack A2UI agents using the A2A protocol, the AG-UI protocol, and CopilotKit.",
    image:
      "https://cdn.sanity.io/images/y3fjfzcd/production/83c7c539c8a139a0f459d532fc1ebbc91a265209-384x216.heif?w=1200&h=630&fit=crop&auto=format",
  },
];



const LEAD: Segment = {
  text: "A2UI is an open, declarative format that lets an agent describe a user interface as data. The app renders that description with its own trusted components.",
  cite: [1, 4],
};

const POINTS: Segment[] = [
  {
    text: "The agent streams JSON messages: create a surface, send the component tree, then fill the data model. No code is sent to the client.",
    cite: [1, 2],
  },
  {
    text: "The client owns the look of every component, so one message can render natively on web, mobile, or desktop.",
    cite: [4],
  },
  {
    text: "AG-UI is the transport between agent and app. It carries A2UI messages next to chat, tool calls, and state events.",
    cite: [3, 5],
  },
  {
    text: "CopilotKit ships a React renderer, so an AG-UI agent can return A2UI surfaces straight into a Next.js app.",
    cite: [5],
  },
];

const favicon = (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

function view(mode: Mode) {
  const sources: Source[] = mode === "noImages" ? SOURCES.map((source) => ({ ...source, image: undefined })) : SOURCES;
  const points = mode === "streaming" ? POINTS.slice(0, 2) : POINTS;
  return { sources, points, streaming: mode === "streaming" };
}

const byId = (sources: Source[], id: number) => sources.find((source) => source.id === id)!;

/** Split off the last word so it wraps together with its citations. */
const tail = (text: string) => {
  const at = text.lastIndexOf(" ");
  return [text.slice(0, at + 1), text.slice(at + 1)] as const;
};

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
  variantLabel: { display: "flex", alignItems: "baseline", columnGap: "10px" },
  variantLetter: { fontWeight: tokens.fontWeightSemibold, color: tokens.colorBrandForeground1 },
  variantNote: { color: tokens.colorNeutralForeground3 },
  card: { padding: "24px", rowGap: "20px" },

  body: { lineHeight: tokens.lineHeightBase400, fontSize: tokens.fontSizeBase400 },
  caret: {
    display: "inline-block",
    width: "2px",
    height: "1em",
    marginLeft: "2px",
    verticalAlign: "text-bottom",
    backgroundColor: tokens.colorBrandForeground1,
    animationName: { "0%, 100%": { opacity: 1 }, "50%": { opacity: 0 } },
    animationDuration: "1s",
    animationIterationCount: "infinite",
  },

  // Hover preview
  preview: { width: "300px", padding: 0, overflow: "hidden" },
  previewImage: { display: "block", width: "100%", aspectRatio: "1.91 / 1", objectFit: "cover" },
  previewBody: { padding: "12px 14px 14px", display: "grid", rowGap: "6px" },

  site: { display: "flex", alignItems: "center", columnGap: "6px", minWidth: 0, color: tokens.colorNeutralForeground3 },
  favicon: { width: "16px", height: "16px", borderRadius: tokens.borderRadiusSmall, flexShrink: 0 },
  clamp2: {
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  ellipsis: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  keep: { whiteSpace: "nowrap" },
  sectionHead: { color: tokens.colorNeutralForeground3, fontWeight: tokens.fontWeightSemibold },
  thumb: {
    width: "48px",
    height: "48px",
    borderRadius: tokens.borderRadiusMedium,
    objectFit: "cover",
    backgroundColor: tokens.colorNeutralBackground3,
    display: "grid",
    placeItems: "center",
    overflow: "hidden",
  },

  // C: lead + chips
  lead: { textWrap: "pretty" },
  points: { display: "grid", rowGap: "14px", margin: 0, padding: 0, listStyleType: "none" },
  point: {
    display: "grid",
    gridTemplateColumns: "6px minmax(0, 1fr)",
    columnGap: "14px",
    alignItems: "baseline",
  },
  dot: { width: "6px", height: "6px", borderRadius: "50%", backgroundColor: tokens.colorBrandForeground1, transform: "translateY(-2px)" },
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
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
    cursor: "pointer",
    verticalAlign: "1px",
    transitionProperty: "border-color, background-color",
    transitionDuration: tokens.durationFaster,
    ":hover": { ...shorthands.borderColor(tokens.colorBrandStroke1), backgroundColor: tokens.colorBrandBackground2 },
    ":focus-visible": { outline: `2px solid ${tokens.colorStrokeFocus2}` },
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
  featureImage: { width: "100%", aspectRatio: "1.91 / 1", alignSelf: "center", objectFit: "cover", display: "block" },
  featureBody: { padding: "14px 16px", display: "grid", alignContent: "center", rowGap: "6px" },
  more: { display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: "14px", rowGap: "8px" },
  moreLink: { display: "inline-flex", alignItems: "center", columnGap: "6px" },
});

function Favicon({ domain }: { domain: string }) {
  const styles = useStyles();
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={styles.favicon} src={favicon(domain)} alt="" width={16} height={16} />;
}

function SourcePreview({ source }: { source: Source }) {
  const styles = useStyles();
  return (
    <>
      {source.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={styles.previewImage} src={source.image} alt="" />
      )}
      <div className={styles.previewBody}>
        <span className={styles.site}>
          <Favicon domain={source.domain} />
          <Caption1 className={styles.ellipsis}>{source.site}</Caption1>
        </span>
        <Text weight="semibold" className={styles.clamp2}>
          {source.title}
        </Text>
        {source.description && (
          <Caption1 className={styles.clamp2} style={{ color: tokens.colorNeutralForeground2 }}>
            {source.description}
          </Caption1>
        )}
      </div>
    </>
  );
}

function Chip({ source }: { source: Source }) {
  const styles = useStyles();
  return (
    <Popover openOnHover withArrow mouseLeaveDelay={120} positioning="above">
      <PopoverTrigger disableButtonEnhancement>
        <button
          type="button"
          className={styles.chip}
          aria-label={`Source: ${source.title}`}
          onClick={() => window.open(source.url, "_blank", "noopener")}
        >
          <Favicon domain={source.domain} />
          <span className={styles.ellipsis}>{source.domain.replace(/^(www|docs|developers)\./, "")}</span>
        </button>
      </PopoverTrigger>
      <PopoverSurface className={styles.preview}>
        <SourcePreview source={source} />
      </PopoverSurface>
    </Popover>
  );
}

/** Most-cited page leads; ties go to a page with a preview image, then a description. */
function pickFeatured(sources: Source[], points: Segment[]) {
  const cites = (id: number) => [LEAD, ...points].filter((seg) => seg.cite.includes(id)).length;
  const score = (s: Source) => cites(s.id) * 4 + (s.image ? 2 : 0) + (s.description ? 1 : 0);
  return [...sources].sort((a, b) => score(b) - score(a) || a.id - b.id)[0];
}

/** Text whose last word stays on the line with its first source chip. */
function Cited({ segment, sources }: { segment: Segment; sources: Source[] }) {
  const styles = useStyles();
  const [head, last] = tail(segment.text);
  const [first, ...more] = segment.cite;
  return (
    <>
      {head}
      <span className={styles.keep}>
        {last}
        {first !== undefined && <Chip source={byId(sources, first)} />}
      </span>
      {more.map((id) => (
        <Chip key={id} source={byId(sources, id)} />
      ))}
    </>
  );
}

/** Lead: a large answer sentence, points with source chips, and the most-cited page. */
function AnswerCard(props: ReturnType<typeof view>) {
  const styles = useStyles();
  const featured = pickFeatured(props.sources, props.points);
  return (
    <Card className={styles.card}>
      <Title3 as="p" className={styles.lead} style={{ margin: 0 }}>
        <Cited segment={LEAD} sources={props.sources} />
      </Title3>
      <ul className={styles.points}>
        {props.points.map((point, i) => (
          <li key={i} className={styles.point}>
            <span className={styles.dot} aria-hidden />
            <Body1 className={styles.body}>
              <Cited segment={point} sources={props.sources} />
              {props.streaming && i === props.points.length - 1 && <span className={styles.caret} aria-hidden />}
            </Body1>
          </li>
        ))}
      </ul>
      {props.streaming ? (
        <Skeleton aria-label="Loading sources">
          <SkeletonItem shape="rectangle" style={{ height: 112, borderRadius: 12 }} />
        </Skeleton>
      ) : (
        <a
          href={featured.url}
          target="_blank"
          rel="noreferrer"
          className={styles.feature}
          style={featured.image ? undefined : { gridTemplateColumns: "1fr" }}
        >
          {featured.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className={styles.featureImage} src={featured.image} alt="" />
          )}
          <span className={styles.featureBody}>
            <span className={styles.site}>
              <Favicon domain={featured.domain} />
              <Caption1>{featured.site}</Caption1>
            </span>
            <Text weight="semibold" className={styles.clamp2}>
              {featured.title}
            </Text>
            {featured.description && (
              <Caption1 className={styles.clamp2} style={{ color: tokens.colorNeutralForeground2 }}>
                {featured.description}
              </Caption1>
            )}
          </span>
        </a>
      )}
    </Card>
  );
}

function Lab() {
  const styles = useStyles();
  const [mode, setMode] = useState<Mode>("complete");
  return (
    <main className={styles.page}>
      <header className={styles.intro}>
        <Title3 as="h1">Answer card</Title3>
        <Body1 className={styles.introText}>
          The omnibar keeps the question in view, so the card opens on the answer. Every source is a chip next to
          the words it supports; hover one to preview the page. The featured page is the most-cited source.
        </Body1>
        <TabList selectedValue={mode} onTabSelect={(_, d) => setMode(d.value as Mode)} aria-label="Card state">
          <Tab value="complete">Complete</Tab>
          <Tab value="streaming">Streaming</Tab>
          <Tab value="noImages">No preview images</Tab>
        </TabList>
      </header>
      <section className={styles.variant} aria-label="Answer card">
        <AnswerCard {...view(mode)} />
      </section>
    </main>
  );
}

export default function AnswerLabPage() {
  return (
    <FluentRoot>
      <Lab />
    </FluentRoot>
  );
}
