"use client";

import { useEffect, useRef, useState } from "react";
import {
  Body1,
  Caption1,
  Card,
  makeStyles,
  mergeClasses,
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
 * Video card lab. Every video is real: titles and channels from YouTube oEmbed,
 * duration, date, views, and chapters from each watch page, fetched Sep 29, 2026.
 * The player is a facade (thumbnail + play) until clicked, so the card paints
 * instantly and loads no third-party script until the user asks for it.
 */

type Chapter = { title: string; at: number };
type Video = {
  id: string;
  title: string;
  channel: string;
  seconds: number;
  date: string;
  views: number;
  chapters: Chapter[];
};

const ch = (rows: [string, number][]): Chapter[] => rows.map(([title, at]) => ({ title, at }));

const VIDEOS: Video[] = [
  {
    id: "aYe12ryuB4s",
    title: "Blazor Community Standup: Generative UI with AG-UI & A2UI",
    channel: "dotnet",
    seconds: 3449,
    date: "2026-07-14",
    views: 3900,
    chapters: ch([
      ["Countdown (silent)", 0],
      ["Welcome and intros", 153],
      ["What is Generative UI (Agentic UI)", 278],
      ["Why do we need Generative UI", 495],
      ["Generative UI types", 650],
      ["Agentic UI in .NET Blazor applications: architecture", 1059],
      ["Microsoft Agent Framework", 1350],
      ["AG-UI protocol overview", 1520],
      ["Support for AG-UI in .NET", 1547],
      ["AG-UI: using an agent in the app (pseudocode)", 1845],
      ["A2UI: dynamically rendering UI from JSON sent from an agent", 1956],
      ["A2UI: sample component definition", 2095],
      ["Demo", 2172],
      ["Q&A", 2576],
      ["Resources & links", 2878],
      ["Key takeaways", 2910],
      ["Wrap", 3377],
    ]),
  },
  {
    id: "Z4aSGCs_O5A",
    title: "Generative UI: Specs, Patterns, and the Protocols Behind Them (MCP Apps, A2UI, AG-UI)",
    channel: "CopilotKit",
    seconds: 3258,
    date: "2026-01-30",
    views: 16882,
    chapters: ch([
      ["Introduction to CopilotKit", 0],
      ["State of agentic UI", 163],
      ["AG-UI protocol overview", 361],
      ["AG-UI demo and features", 590],
      ["Static generative UI", 881],
      ["Open-ended generative UI", 1201],
      ["Declarative generative UI", 1523],
      ["AG-UI protocol support", 2107],
      ["Agent state management", 2305],
      ["Future trends and Q&A", 2533],
    ]),
  },
  {
    id: "UsMDkEsR-ok",
    title: "Generative UI for any agent, anywhere: A2UI, AG-UI, MCP Apps, and more",
    channel: "Google Cloud Tech",
    seconds: 2456,
    date: "2026-06-25",
    views: 15341,
    chapters: [],
  },
  {
    id: "9nEcVoQCkYA",
    title: "Advanced AG-UI in Microsoft Agent Framework",
    channel: "AI in C# (Rasmus Wulff Jensen)",
    seconds: 2184,
    date: "2025-11-22",
    views: 1742,
    chapters: [],
  },
  {
    id: "soqJwduov1w",
    title: "AG-UI Explained: The Protocol Behind Agentic Browsers",
    channel: "Aman Panjwani",
    seconds: 948,
    date: "2025-12-23",
    views: 1597,
    chapters: [],
  },
];

const clock = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
};
const when = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const views = (n: number) =>
  `${new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n)} views`;
const thumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

/** The chapter JEV would pick for "how does A2UI render UI from JSON?". */
const FOCUS = { video: VIDEOS[0], chapter: 10 };

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
  variantLabel: { display: "flex", alignItems: "baseline", columnGap: "10px", flexWrap: "wrap" },
  variantLetter: { fontWeight: tokens.fontWeightSemibold, color: tokens.colorBrandForeground1 },
  variantNote: { color: tokens.colorNeutralForeground3 },
  card: { padding: "24px", rowGap: "16px" },
  lead: { margin: 0, textWrap: "pretty" },
  stack: { display: "grid", rowGap: "12px", minWidth: 0 },
  frame: {
    position: "relative",
    aspectRatio: "16 / 9",
    width: "100%",
    borderRadius: tokens.borderRadiusLarge,
    overflow: "hidden",
    backgroundColor: tokens.colorNeutralBackgroundInverted,
  },
  facade: {
    position: "absolute",
    inset: 0,
    padding: 0,
    ...shorthands.borderWidth("0"),
    cursor: "pointer",
    backgroundColor: "transparent",
    backgroundSize: "cover",
    backgroundPosition: "center",
    ":focus-visible": { outline: `2px solid ${tokens.colorStrokeFocus2}`, outlineOffset: "-4px" },
    ":hover > span:first-child": {
      backgroundColor: tokens.colorPaletteRedBackground3,
      transform: "translate(-50%, -50%) scale(1.06)",
    },
  },
  play: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: "68px",
    height: "48px",
    transform: "translate(-50%, -50%)",
    borderRadius: tokens.borderRadiusXLarge,
    backgroundColor: "rgba(0, 0, 0, 0.72)",
    display: "grid",
    placeItems: "center",
    transitionProperty: "background-color, transform",
    transitionDuration: tokens.durationFaster,
  },
  badge: {
    position: "absolute",
    right: "8px",
    bottom: "8px",
    padding: "2px 6px",
    borderRadius: tokens.borderRadiusSmall,
    backgroundColor: "rgba(0, 0, 0, 0.78)",
    color: "white",
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    fontVariantNumeric: "tabular-nums",
  },
  iframe: { position: "absolute", inset: 0, width: "100%", height: "100%", ...shorthands.borderWidth("0") },
  meta: { display: "grid", rowGap: "2px" },
  metaLine: {
    color: tokens.colorNeutralForeground3,
    display: "flex",
    columnGap: "6px",
    alignItems: "center",
    flexWrap: "wrap",
  },
  favicon: { width: "16px", height: "16px", borderRadius: tokens.borderRadiusSmall },
  split: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 260px",
    columnGap: "16px",
    alignItems: "start",
    "@media (max-width: 720px)": { gridTemplateColumns: "1fr", rowGap: "12px" },
  },
  rail: {
    display: "grid",
    alignContent: "start",
    rowGap: "2px",
    position: "relative",
    maxHeight: "360px",
    overflowY: "auto",
    overscrollBehavior: "contain",
    "@media (max-width: 720px)": { maxHeight: "280px" },
  },
  row: {
    display: "grid",
    gridTemplateColumns: "auto 1fr",
    columnGap: "10px",
    alignItems: "start",
    padding: "8px",
    ...shorthands.borderWidth("0"),
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: "transparent",
    textAlign: "start",
    cursor: "pointer",
    color: tokens.colorNeutralForeground1,
    ":hover": { backgroundColor: tokens.colorSubtleBackgroundHover },
    ":focus-visible": { outline: `2px solid ${tokens.colorStrokeFocus2}` },
  },
  rowActive: {
    backgroundColor: tokens.colorBrandBackground2,
    ":hover": { backgroundColor: tokens.colorBrandBackground2Hover },
  },
  stamp: {
    fontVariantNumeric: "tabular-nums",
    color: tokens.colorBrandForeground1,
    fontWeight: tokens.fontWeightSemibold,
    minWidth: "44px",
  },
  mini: {
    width: "104px",
    aspectRatio: "16 / 9",
    borderRadius: tokens.borderRadiusMedium,
    objectFit: "cover",
    display: "block",
  },
  miniText: { display: "grid", rowGap: "2px", minWidth: 0 },
  clamp: { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" },
  muted: { color: tokens.colorNeutralForeground3 },
  railHead: { color: tokens.colorNeutralForeground3, padding: "0 8px 4px" },
});

type PlayerState = ReturnType<typeof usePlayer>;

/** A thumbnail facade that swaps to a youtube-nocookie iframe on click, then seeks by postMessage. */
function Player({ p }: { p: PlayerState }) {
  const styles = useStyles();
  const { video, start, playing, setFrame, play } = p;
  return (
    <div className={styles.frame}>
      {playing ? (
        <iframe
          ref={setFrame}
          className={styles.iframe}
          src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&enablejsapi=1&rel=0&start=${start}`}
          title={video.title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          className={styles.facade}
          style={{ backgroundImage: `url(${thumb(video.id)})` }}
          onClick={play}
          aria-label={`Play ${video.title}${start ? ` from ${clock(start)}` : ""}`}
        >
          <span className={styles.play} aria-hidden>
            <svg width="20" height="22" viewBox="0 0 20 22">
              <path d="M0 0 L20 11 L0 22 Z" fill="white" />
            </svg>
          </span>
          <span className={styles.badge}>
            {start ? `${clock(start)} / ${clock(video.seconds)}` : clock(video.seconds)}
          </span>
        </button>
      )}
    </div>
  );
}

function Meta({ video }: { video: Video }) {
  const styles = useStyles();
  return (
    <div className={styles.meta}>
      <Text weight="semibold">{video.title}</Text>
      <Caption1 className={styles.metaLine}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.favicon} src="https://www.google.com/s2/favicons?domain=youtube.com&sz=64" alt="" />
        {video.channel} · {when(video.date)} · {views(video.views)}
      </Caption1>
    </div>
  );
}

/** Shared player state: which video, where it starts, and whether the iframe is live. */
function usePlayer(initial: Video, initialStart = 0) {
  const [video, setVideo] = useState(initial);
  const [start, setStart] = useState(initialStart);
  const [playing, setPlaying] = useState(false);
  const [frame, setFrame] = useState<HTMLIFrameElement | null>(null);
  const seek = (v: Video, at: number) => {
    const win = frame?.contentWindow;
    if (playing && v.id === video.id && win) {
      win.postMessage(JSON.stringify({ event: "command", func: "seekTo", args: [at, true] }), "*");
    } else {
      setVideo(v);
      setPlaying(true);
    }
    setStart(at);
  };
  return { video, start, playing, setFrame, play: () => setPlaying(true), seek };
}

function Loading() {
  return (
    <Skeleton aria-label="Loading video">
      <SkeletonItem shape="rectangle" style={{ aspectRatio: "16 / 9", height: "auto", borderRadius: 8 }} />
    </Skeleton>
  );
}

/** A · Single: one video answers the question. */
function Single({ streaming }: { streaming: boolean }) {
  const styles = useStyles();
  const p = usePlayer(VIDEOS[1]);
  return (
    <Card className={styles.card}>
      <Title3 as="p" className={styles.lead}>
        CopilotKit&apos;s talk sorts generative UI into static, open-ended, and declarative, and shows where AG-UI and
        A2UI fit.
      </Title3>
      {streaming ? <Loading /> : <Player p={p} />}
      <Meta video={p.video} />
    </Card>
  );
}

/** B · Chapters: the card opens on the chapter that answers the question. */
function Chapters({ streaming }: { streaming: boolean }) {
  const styles = useStyles();
  const { video, chapter } = FOCUS;
  const p = usePlayer(video, video.chapters[chapter].at);
  const active = video.chapters.findLastIndex((c) => c.at <= p.start);
  const rail = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = rail.current;
    const row = nav?.children[active] as HTMLElement | undefined;
    if (nav && row) nav.scrollTo({ top: row.offsetTop - nav.clientHeight / 3, behavior: "smooth" });
  }, [active]);
  return (
    <Card className={styles.card}>
      <Title3 as="p" className={styles.lead}>
        The .NET standup covers A2UI at {clock(video.chapters[chapter].at)}: the agent sends JSON, and the app renders
        it from a component catalog.
      </Title3>
      <div className={styles.split}>
        <div className={styles.stack}>
          {streaming ? <Loading /> : <Player p={p} />}
          <Meta video={video} />
        </div>
        <nav ref={rail} className={styles.rail} aria-label="Chapters">
          {video.chapters.map((c, i) => (
            <button
              key={c.at}
              type="button"
              className={mergeClasses(styles.row, i === active && styles.rowActive)}
              aria-current={i === active ? "true" : undefined}
              onClick={() => p.seek(video, c.at)}
            >
              <Caption1 className={styles.stamp}>{clock(c.at)}</Caption1>
              <Caption1>{c.title}</Caption1>
            </button>
          ))}
        </nav>
      </div>
    </Card>
  );
}

/** C · Playlist: several videos, one playing, the rest queued beside it. */
function Playlist({ streaming }: { streaming: boolean }) {
  const styles = useStyles();
  const p = usePlayer(VIDEOS[0]);
  const total = VIDEOS.reduce((s, v) => s + v.seconds, 0);
  return (
    <Card className={styles.card}>
      <Title3 as="p" className={styles.lead}>
        Five talks explain generative UI with AG-UI and A2UI, from a 16-minute primer to hour-long sessions from .NET,
        CopilotKit, and Google Cloud.
      </Title3>
      <div className={styles.split}>
        <div className={styles.stack}>
          {streaming ? <Loading /> : <Player p={p} />}
          <Meta video={p.video} />
        </div>
        <nav className={styles.rail} aria-label={`Playlist, ${VIDEOS.length} videos`}>
          <Caption1 className={styles.railHead}>
            {VIDEOS.length} videos · {(total / 3600).toFixed(1)} hours
          </Caption1>
          {VIDEOS.map((v) => (
            <button
              key={v.id}
              type="button"
              className={mergeClasses(styles.row, v.id === p.video.id && styles.rowActive)}
              aria-current={v.id === p.video.id ? "true" : undefined}
              onClick={() => p.seek(v, 0)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={styles.mini} src={thumb(v.id)} alt="" loading="lazy" />
              <span className={styles.miniText}>
                <Caption1 className={styles.clamp}>{v.title}</Caption1>
                <Caption1 className={styles.muted}>
                  {v.channel} · {clock(v.seconds)}
                </Caption1>
              </span>
            </button>
          ))}
        </nav>
      </div>
    </Card>
  );
}

type Mode = "complete" | "streaming";

const VARIANTS = [
  { letter: "A", name: "Single", note: "One video answers the question.", View: Single },
  { letter: "B", name: "Chapters", note: "Opens on the chapter JEV picked. Chapters seek the player.", View: Chapters },
  { letter: "C", name: "Playlist", note: "Several videos, one playing, the rest queued.", View: Playlist },
];

function Lab() {
  const styles = useStyles();
  const [mode, setMode] = useState<Mode>("complete");
  return (
    <main className={styles.page}>
      <header className={styles.intro}>
        <Title3 as="h1">Media card · Video</Title3>
        <Body1 className={styles.introText}>
          Three layouts in the Answer card language, with real YouTube videos. Each player is a thumbnail until you
          press play, so the card paints at once and loads nothing from YouTube until then.
        </Body1>
        <TabList selectedValue={mode} onTabSelect={(_, d) => setMode(d.value as Mode)} aria-label="Card state">
          <Tab value="complete">Complete</Tab>
          <Tab value="streaming">Streaming</Tab>
        </TabList>
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
            <Caption1 className={styles.variantNote}>{note}</Caption1>
          </div>
          <View streaming={mode === "streaming"} />
        </section>
      ))}
    </main>
  );
}

export default function VideoLabPage() {
  return (
    <FluentRoot>
      <Lab />
    </FluentRoot>
  );
}
