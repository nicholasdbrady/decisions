"use client";

import { useEffect, useRef, useState } from "react";
import {
  Body1,
  Caption1,
  Card,
  Link,
  makeStyles,
  mergeClasses,
  shorthands,
  Skeleton,
  SkeletonItem,
  Tab,
  TabList,
  Text,
  Title3,
  ToggleButton,
  tokens,
} from "@fluentui/react-components";

import { FluentRoot } from "@/fluent/root";

import { type Track, TRACKS } from "./tracks";

const clock = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const when = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
/** Stretch the stored peaks so the recording's noise floor sits near the baseline. */
const shape = (peaks: number[]) => {
  const lo = Math.min(...peaks);
  const hi = Math.max(...peaks);
  return peaks.map((p) => 0.08 + (0.92 * (p - lo)) / (hi - lo || 1));
};
const SKIP = 5;

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
  // Player
  player: {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr)",
    columnGap: "16px",
    rowGap: "10px",
    alignItems: "center",
    padding: "16px",
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground3,
  },
  play: {
    width: "48px",
    height: "48px",
    padding: 0,
    display: "grid",
    placeItems: "center",
    borderRadius: tokens.borderRadiusCircular,
    ...shorthands.borderWidth("0"),
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    cursor: "pointer",
    transitionProperty: "background-color, transform",
    transitionDuration: tokens.durationFaster,
    ":hover": { backgroundColor: tokens.colorBrandBackgroundHover },
    ":active": { transform: "scale(0.96)" },
    ":focus-visible": {
      outline: `2px solid ${tokens.colorStrokeFocus2}`,
      outlineOffset: "2px",
    },
  },
  wave: {
    position: "relative",
    height: "56px",
    cursor: "pointer",
    touchAction: "none",
    borderRadius: tokens.borderRadiusMedium,
    ":focus-visible": {
      outline: `2px solid ${tokens.colorStrokeFocus2}`,
      outlineOffset: "4px",
    },
  },
  svg: { display: "block", width: "100%", height: "100%" },
  played: { fill: tokens.colorBrandForeground1 },
  rest: { fill: tokens.colorNeutralStroke1 },
  head: {
    position: "absolute",
    top: "-4px",
    bottom: "-4px",
    width: "2px",
    marginLeft: "-1px",
    borderRadius: tokens.borderRadiusSmall,
    backgroundColor: tokens.colorNeutralForeground1,
    pointerEvents: "none",
  },
  bar: {
    gridColumn: "1 / -1",
    display: "flex",
    alignItems: "center",
    columnGap: "12px",
    flexWrap: "wrap",
    rowGap: "8px",
  },
  time: {
    fontVariantNumeric: "tabular-nums",
    color: tokens.colorNeutralForeground2,
  },
  grow: { flexGrow: 1 },
  caption: { display: "grid", rowGap: "2px", minWidth: 0 },
  species: { fontStyle: "italic" },
  credit: {
    color: tokens.colorNeutralForeground3,
    display: "flex",
    flexWrap: "wrap",
    columnGap: "6px",
  },
  // Playlist
  list: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "grid",
    rowGap: "2px",
  },
  row: {
    width: "100%",
    display: "grid",
    gridTemplateColumns: "24px minmax(0, 1fr) 96px 40px",
    columnGap: "12px",
    alignItems: "center",
    padding: "8px",
    ...shorthands.borderWidth("0"),
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: "transparent",
    textAlign: "start",
    color: tokens.colorNeutralForeground1,
    cursor: "pointer",
    ":hover": { backgroundColor: tokens.colorSubtleBackgroundHover },
    ":focus-visible": { outline: `2px solid ${tokens.colorStrokeFocus2}` },
    "@media (max-width: 480px)": {
      gridTemplateColumns: "24px minmax(0, 1fr) 40px",
    },
  },
  rowOn: {
    backgroundColor: tokens.colorBrandBackground2,
    ":hover": { backgroundColor: tokens.colorBrandBackground2Hover },
  },
  index: {
    fontVariantNumeric: "tabular-nums",
    color: tokens.colorNeutralForeground3,
    textAlign: "center",
    display: "grid",
    placeItems: "center",
  },
  mini: { height: "24px", "@media (max-width: 480px)": { display: "none" } },
  dur: {
    fontVariantNumeric: "tabular-nums",
    color: tokens.colorNeutralForeground3,
    textAlign: "end",
  },
  eq: {
    display: "flex",
    alignItems: "flex-end",
    columnGap: "2px",
    height: "14px",
  },
  eqBar: {
    width: "3px",
    borderRadius: tokens.borderRadiusSmall,
    backgroundColor: tokens.colorBrandForeground1,
    animationName: {
      "0%": { height: "30%" },
      "50%": { height: "100%" },
      "100%": { height: "30%" },
    },
    animationDuration: "0.9s",
    animationIterationCount: "infinite",
    animationTimingFunction: "ease-in-out",
    "@media (prefers-reduced-motion: reduce)": {
      animationName: "none",
      height: "70%",
    },
  },
  eqPaused: { animationPlayState: "paused" },
});

function PlayIcon({ playing }: { playing: boolean }) {
  return playing ? (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <rect x="3" y="2" width="4" height="14" rx="1" fill="currentColor" />
      <rect x="11" y="2" width="4" height="14" rx="1" fill="currentColor" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        d="M5 2.5 L15.5 9 L5 15.5 Z"
        fill="currentColor"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Waveform bars. `progress` in 0..1 colors the played part. */
function Bars({
  peaks,
  progress,
  className,
}: {
  peaks: number[];
  progress: number;
  className?: string;
}) {
  const styles = useStyles();
  const bars = shape(peaks);
  const step = 4;
  return (
    <svg
      className={mergeClasses(styles.svg, className)}
      viewBox={`0 0 ${bars.length * step} 100`}
      preserveAspectRatio="none"
      aria-hidden
    >
      {bars.map((b, i) => (
        <rect
          key={i}
          x={i * step + 0.5}
          y={50 - b * 50}
          width={step - 1.5}
          height={b * 100}
          rx={1}
          className={
            (i + 0.5) / bars.length <= progress ? styles.played : styles.rest
          }
        />
      ))}
    </svg>
  );
}

function Credit({ track }: { track: Track }) {
  const styles = useStyles();
  return (
    <Caption1 className={styles.credit}>
      <span>{track.artist}</span>
      <span aria-hidden>·</span>
      <span>Recorded {when(track.recorded)}</span>
      <span aria-hidden>·</span>
      <span>{track.license}</span>
      <span aria-hidden>·</span>
      <Link href={track.page} target="_blank" rel="noreferrer">
        Wikimedia Commons
      </Link>
    </Caption1>
  );
}

/**
 * One track: play button, waveform scrubber, time, and half speed. The waveform is a
 * slider: click or drag to seek, arrow keys skip 5 s, Home and End jump to the ends.
 */
function Player({
  track,
  autoPlay = false,
  onEnded,
  onPlaying,
}: {
  track: Track;
  autoPlay?: boolean;
  onEnded?: () => void;
  onPlaying?: (playing: boolean) => void;
}) {
  const styles = useStyles();
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [slow, setSlow] = useState(false);
  const d = track.seconds;

  // Smooth progress while playing; timeupdate alone ticks about four times a second.
  useEffect(() => {
    if (!playing) return;
    let id = 0;
    const tick = () => {
      if (audio.current) setT(audio.current.currentTime);
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [playing]);

  useEffect(() => {
    if (autoPlay) audio.current?.play().catch(() => undefined);
  }, [autoPlay]);

  const toggle = () => {
    const a = audio.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => undefined);
    else a.pause();
  };
  const seek = (s: number) => {
    const a = audio.current;
    const at = Math.max(0, Math.min(d, s));
    if (a) a.currentTime = at;
    setT(at);
  };
  const fromPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    seek(((e.clientX - r.left) / r.width) * d);
  };

  return (
    <div className={styles.player}>
      <audio
        ref={audio}
        src={track.url}
        preload="metadata"
        onPlay={() => {
          setPlaying(true);
          onPlaying?.(true);
        }}
        onPause={() => {
          setPlaying(false);
          onPlaying?.(false);
        }}
        onEnded={() => {
          setT(d);
          onEnded?.();
        }}
        onRateChange={(e) => setSlow(e.currentTarget.playbackRate < 1)}
      />
      <button
        type="button"
        className={styles.play}
        onClick={toggle}
        aria-label={`${playing ? "Pause" : "Play"} ${track.name}`}
      >
        <PlayIcon playing={playing} />
      </button>
      <div
        className={styles.wave}
        role="slider"
        tabIndex={0}
        aria-label={`Seek in ${track.name}`}
        aria-valuemin={0}
        aria-valuemax={Math.round(d)}
        aria-valuenow={Math.round(t)}
        aria-valuetext={`${clock(t)} of ${clock(d)}`}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          fromPointer(e);
        }}
        onPointerMove={(e) => e.buttons === 1 && fromPointer(e)}
        onKeyDown={(e) => {
          const to = {
            ArrowRight: t + SKIP,
            ArrowLeft: t - SKIP,
            Home: 0,
            End: d,
          }[e.key];
          if (to === undefined) return;
          e.preventDefault();
          seek(to);
        }}
      >
        <Bars peaks={track.peaks} progress={t / d} />
        {t > 0 && (
          <span className={styles.head} style={{ left: `${(t / d) * 100}%` }} />
        )}
      </div>
      <div className={styles.bar}>
        <Caption1 className={styles.time}>
          {clock(t)} / {clock(d)}
        </Caption1>
        <span className={styles.grow} />
        <ToggleButton
          size="small"
          appearance="subtle"
          checked={slow}
          onClick={() => {
            if (audio.current) audio.current.playbackRate = slow ? 1 : 0.5;
          }}
        >
          Half speed
        </ToggleButton>
      </div>
    </div>
  );
}

function Loading() {
  return (
    <Skeleton aria-label="Loading audio">
      <SkeletonItem
        style={{ height: "124px", borderRadius: tokens.borderRadiusLarge }}
      />
    </Skeleton>
  );
}

/** A · Track: one recording answers the question. */
function Single({ streaming }: { streaming: boolean }) {
  const styles = useStyles();
  const track = TRACKS[1];
  return (
    <Card className={styles.card}>
      <Title3 as="p" className={styles.lead}>
        Swainson&apos;s thrush sings a spiral of flute-like notes that climb in
        pitch, most often at dawn and dusk.
      </Title3>
      {streaming ? <Loading /> : <Player track={track} />}
      <div className={styles.caption}>
        <Text weight="semibold">
          {track.name} · {track.kind.toLowerCase()}{" "}
          <span className={styles.species}>({track.species})</span>
        </Text>
        <Credit track={track} />
      </div>
    </Card>
  );
}

function Equalizer({ paused }: { paused: boolean }) {
  const styles = useStyles();
  return (
    <span className={styles.eq} aria-hidden>
      {[0, 0.3, 0.15].map((delay) => (
        <span
          key={delay}
          className={mergeClasses(styles.eqBar, paused && styles.eqPaused)}
          style={{ animationDelay: `-${delay}s` }}
        />
      ))}
    </span>
  );
}

/** B · Playlist: one player, a queue below. Picking a row plays it; each track leads into the next. */
function Playlist({ streaming }: { streaming: boolean }) {
  const styles = useStyles();
  const [at, setAt] = useState(0);
  const [auto, setAuto] = useState(false);
  const [playing, setPlaying] = useState(false);
  const track = TRACKS[at];
  const total = TRACKS.reduce((s, x) => s + x.seconds, 0);
  const pick = (i: number) => {
    setAt(i);
    setAuto(true);
  };
  return (
    <Card className={styles.card}>
      <Title3 as="p" className={styles.lead}>
        Six birds you can hear around Seattle: three songbirds, then the calls
        of a jay, a raven, and a bald eagle.
      </Title3>
      {streaming ? (
        <Loading />
      ) : (
        <Player
          key={track.url}
          track={track}
          autoPlay={auto}
          onPlaying={setPlaying}
          onEnded={() => at < TRACKS.length - 1 && pick(at + 1)}
        />
      )}
      <div className={styles.caption}>
        <Text weight="semibold">
          {track.name} · {track.kind.toLowerCase()}{" "}
          <span className={styles.species}>({track.species})</span>
        </Text>
        <Credit track={track} />
      </div>
      <Caption1 className={styles.credit}>
        {TRACKS.length} recordings · {clock(total)}
      </Caption1>
      <ol className={styles.list} aria-label="Playlist">
        {TRACKS.map((x, i) => (
          <li key={x.url}>
            <button
              type="button"
              className={mergeClasses(styles.row, i === at && styles.rowOn)}
              aria-current={i === at ? "true" : undefined}
              onClick={() => pick(i)}
            >
              <span className={styles.index}>
                {i === at && !streaming ? (
                  <Equalizer paused={!playing} />
                ) : (
                  <Caption1>{i + 1}</Caption1>
                )}
              </span>
              <span className={styles.caption}>
                <Body1>{x.name}</Body1>
                <Caption1 className={styles.credit}>{x.kind}</Caption1>
              </span>
              <span className={styles.mini}>
                <Bars peaks={x.peaks} progress={i === at ? 1 : 0} />
              </span>
              <Caption1 className={styles.dur}>{clock(x.seconds)}</Caption1>
            </button>
          </li>
        ))}
      </ol>
    </Card>
  );
}

type Mode = "complete" | "streaming";

const VARIANTS = [
  {
    letter: "A",
    name: "Track",
    note: "One recording answers the question.",
    View: Single,
  },
  {
    letter: "B",
    name: "Playlist",
    note: "A queue. Each track leads into the next.",
    View: Playlist,
  },
];

function Lab() {
  const styles = useStyles();
  const [mode, setMode] = useState<Mode>("complete");
  return (
    <main className={styles.page}>
      <header className={styles.intro}>
        <Title3 as="h1">Media card · Audio</Title3>
        <Body1 className={styles.introText}>
          Two layouts in the Answer card language, with real, openly licensed
          bird recordings. The waveform comes from each file and doubles as the
          seek bar.
        </Body1>
        <TabList
          selectedValue={mode}
          onTabSelect={(_, d) => setMode(d.value as Mode)}
          aria-label="Card state"
        >
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

export default function AudioLabPage() {
  return (
    <FluentRoot>
      <Lab />
    </FluentRoot>
  );
}
