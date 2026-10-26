"use client";

/* eslint-disable @next/next/no-img-element -- remote Commons media with explicit width/height; next/image adds nothing here. */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Body1,
  Button,
  Caption1,
  Card,
  Dialog,
  DialogSurface,
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
  tokens,
} from "@fluentui/react-components";

import { FluentRoot } from "@/fluent/root";

/**
 * Image card lab. Every image is real and openly licensed on Wikimedia Commons;
 * titles, authors, licenses, sizes, and dates come from the Commons API (Sep 29, 2026).
 */

type Img = {
  file: string;
  path: string; // hash directory on upload.wikimedia.org, e.g. "1/16"
  w: number;
  h: number;
  alt: string;
  caption: string;
  artist: string;
  license: string;
};

const IMAGES: Record<string, Img> = {
  skyline: {
    file: "Seattle_4.jpg",
    path: "1/16",
    w: 4306,
    h: 2419,
    alt: "Seattle skyline from Queen Anne Hill, the Space Needle in front and Mount Rainier behind",
    caption: "Seattle from Queen Anne Hill",
    artist: "Daniel Schwen",
    license: "CC BY-SA 4.0",
  },
  needle: {
    file: "SpaceNeedleTopClose.jpg",
    path: "7/77",
    w: 2860,
    h: 2672,
    alt: "The saucer-shaped top of the Space Needle",
    caption: "Top of the Space Needle",
    artist: "Cacophony",
    license: "Public domain",
  },
  market: {
    file: "Pike_Place_Market_Seattle.jpg",
    path: "6/6a",
    w: 4113,
    h: 2833,
    alt: "Pike Place Market with its Public Market Center sign and clock",
    caption: "Pike Place Market",
    artist: "Daniel Schwen",
    license: "CC BY-SA 4.0",
  },
  sign: {
    file: "Public_Market_Center_sign_at_Pike_Place.jpg",
    path: "3/3a",
    w: 4145,
    h: 2586,
    alt: "Close view of the Public Market Center sign at Pike Place",
    caption: "Public Market Center sign",
    artist: "Kissmykumbaya",
    license: "CC0",
  },
  view: {
    file: "Seattle_from_Space_Needle_June_2018_003.jpg",
    path: "f/fd",
    w: 5760,
    h: 3840,
    alt: "Downtown Seattle seen from the Space Needle",
    caption: "Downtown from the Space Needle",
    artist: "King of Hearts",
    license: "CC BY-SA 4.0",
  },
  rainier: {
    file: "Mt_Rainier,_Washington_(5876).jpg",
    path: "7/7f",
    w: 662,
    h: 1000,
    alt: "Mount Rainier's snow-covered summit seen from the International Space Station",
    caption: "Mount Rainier from the ISS",
    artist: "NASA",
    license: "Public domain",
  },
  panorama: {
    file: "Seattle_7.jpg",
    path: "d/d6",
    w: 19383,
    h: 4016,
    alt: "Downtown Seattle at dusk from Queen Anne Hill, with Mount Rainier and the port cranes",
    caption: "Downtown and Mount Rainier from Queen Anne Hill",
    artist: "Daniel Schwen",
    license: "CC BY-SA 4.0",
  },
  rail: {
    file: "Link_light_rail_geographic_map_Seattle.svg",
    path: "e/e3",
    w: 352,
    h: 972,
    alt: "Map of Link light rail lines and stations in and near Seattle",
    caption: "Link light rail stations",
    artist: "Twotwofourtysix",
    license: "CC BY-SA 4.0",
  },
  cradle: {
    file: "Newtons_cradle_animation_book_2.gif",
    path: "d/d3",
    w: 480,
    h: 360,
    alt: "Newton's cradle: the end ball swings in, and the ball on the far side swings out",
    caption: "Newton's cradle",
    artist: "DemonDeLuxe",
    license: "CC BY-SA 3.0",
  },
};

const BASE = "https://upload.wikimedia.org/wikipedia/commons";
const enc = (f: string) => encodeURIComponent(f).replace(/%2C/g, ",");
const original = (i: Img) => `${BASE}/${i.path}/${enc(i.file)}`;
/** Commons serves standard thumbnail steps (500, 960, 1280). Small originals are served as they are. */
const src = (i: Img, w: 500 | 960 | 1280) =>
  i.w <= w
    ? original(i)
    : `${BASE}/thumb/${i.path}/${enc(i.file)}/${w}px-${enc(i.file)}`;
const page = (i: Img) =>
  `https://commons.wikimedia.org/wiki/File:${enc(i.file)}`;
const kind = (i: Img) =>
  i.file.endsWith(".svg") ? "SVG" : i.file.endsWith(".gif") ? "GIF" : "JPEG";

const GALLERY = [
  IMAGES.skyline,
  IMAGES.needle,
  IMAGES.market,
  IMAGES.view,
  IMAGES.rainier,
];
const TOUR = [
  IMAGES.panorama,
  IMAGES.needle,
  IMAGES.view,
  IMAGES.market,
  IMAGES.sign,
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
  figure: { margin: 0, display: "grid", rowGap: "8px", minWidth: 0 },
  shot: {
    position: "relative",
    display: "block",
    width: "100%",
    padding: 0,
    ...shorthands.borderWidth("0"),
    borderRadius: tokens.borderRadiusLarge,
    overflow: "hidden",
    backgroundColor: tokens.colorNeutralBackground3,
    cursor: "zoom-in",
    ":focus-visible": {
      outline: `2px solid ${tokens.colorStrokeFocus2}`,
      outlineOffset: "2px",
    },
    ":hover img": { transform: "scale(1.015)" },
  },
  img: {
    display: "block",
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transitionProperty: "transform",
    transitionDuration: tokens.durationNormal,
    transitionTimingFunction: tokens.curveEasyEase,
    "@media (prefers-reduced-motion: reduce)": { transitionDuration: "0.01ms" },
  },
  kind: {
    position: "absolute",
    left: "8px",
    top: "8px",
    padding: "2px 6px",
    borderRadius: tokens.borderRadiusSmall,
    backgroundColor: "rgba(0, 0, 0, 0.66)",
    color: "white",
    fontSize: tokens.fontSizeBase100,
    fontWeight: tokens.fontWeightSemibold,
    letterSpacing: "0.04em",
  },
  caption: { display: "grid", rowGap: "2px", minWidth: 0 },
  credit: {
    color: tokens.colorNeutralForeground3,
    display: "flex",
    flexWrap: "wrap",
    columnGap: "6px",
  },
  // B · Gallery: one hero tile and four supporting tiles.
  mosaic: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr",
    gridTemplateRows: "150px 150px",
    gap: "6px",
    "@media (max-width: 560px)": {
      gridTemplateColumns: "1fr 1fr",
      gridTemplateRows: "200px 120px 120px",
    },
  },
  hero: {
    gridRow: "span 2",
    "@media (max-width: 560px)": { gridRow: "auto", gridColumn: "span 2" },
  },
  tile: { height: "100%", borderRadius: tokens.borderRadiusMedium },
  // C · Carousel: native scroll-snap; buttons, dots, and arrow keys drive the same track.
  track: {
    display: "grid",
    gridAutoFlow: "column",
    gridAutoColumns: "100%",
    overflowX: "auto",
    scrollSnapType: "x mandatory",
    scrollBehavior: "smooth",
    scrollbarWidth: "none",
    borderRadius: tokens.borderRadiusLarge,
    "::-webkit-scrollbar": { display: "none" },
    ":focus-visible": {
      outline: `2px solid ${tokens.colorStrokeFocus2}`,
      outlineOffset: "2px",
    },
    "@media (prefers-reduced-motion: reduce)": { scrollBehavior: "auto" },
  },
  slide: {
    scrollSnapAlign: "start",
    aspectRatio: "16 / 9",
    backgroundColor: tokens.colorNeutralBackground3,
  },
  controls: { display: "flex", alignItems: "center", columnGap: "8px" },
  count: {
    fontVariantNumeric: "tabular-nums",
    color: tokens.colorNeutralForeground3,
    minWidth: "40px",
  },
  dots: {
    display: "flex",
    alignItems: "center",
    columnGap: "6px",
    flexGrow: 1,
    justifyContent: "center",
  },
  dot: {
    width: "8px",
    height: "8px",
    padding: 0,
    borderRadius: tokens.borderRadiusCircular,
    ...shorthands.borderWidth("0"),
    backgroundColor: tokens.colorNeutralStroke1,
    cursor: "pointer",
    transitionProperty: "width, background-color",
    transitionDuration: tokens.durationFaster,
    ":focus-visible": {
      outline: `2px solid ${tokens.colorStrokeFocus2}`,
      outlineOffset: "2px",
    },
  },
  dotOn: { width: "20px", backgroundColor: tokens.colorBrandBackground },
  // D · Vector: a tall diagram sits beside its explanation instead of being cropped.
  vector: {
    display: "grid",
    gridTemplateColumns: "200px minmax(0, 1fr)",
    columnGap: "24px",
    alignItems: "start",
    "@media (max-width: 560px)": { gridTemplateColumns: "1fr", rowGap: "16px" },
  },
  plate: {
    backgroundColor: "white",
    ...shorthands.border("1px", "solid", tokens.colorNeutralStroke2),
    "@media (max-width: 560px)": {
      width: "min(200px, 100%)",
      justifySelf: "center",
    },
  },
  contain: { objectFit: "contain" },
  facts: { display: "grid", rowGap: "14px", margin: 0 },
  fact: { display: "grid", rowGap: "2px" },
  factKey: { color: tokens.colorNeutralForeground3 },
  dd: { margin: 0 },
  // E · Animation: a still frame on a canvas when paused, the live GIF when playing.
  anim: {
    position: "relative",
    aspectRatio: "4 / 3",
    width: "min(420px, 100%)",
    cursor: "default",
  },
  canvas: { position: "absolute", inset: 0, width: "100%", height: "100%" },
  animBar: {
    display: "flex",
    alignItems: "center",
    columnGap: "12px",
    flexWrap: "wrap",
    rowGap: "8px",
  },
  // Viewer
  viewer: {
    maxWidth: "min(1100px, 96vw)",
    width: "auto",
    padding: "16px",
    display: "grid",
    rowGap: "12px",
  },
  viewerFrame: {
    display: "grid",
    placeItems: "center",
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusMedium,
    overflow: "hidden",
  },
  viewerImg: {
    display: "block",
    maxWidth: "100%",
    maxHeight: "72vh",
    width: "auto",
    height: "auto",
  },
  white: { backgroundColor: "white" },
  viewerBar: {
    display: "flex",
    alignItems: "center",
    columnGap: "8px",
    flexWrap: "wrap",
    rowGap: "8px",
  },
  grow: { flexGrow: 1 },
});

function Credit({ img }: { img: Img }) {
  const styles = useStyles();
  return (
    <Caption1 className={styles.credit}>
      <span>{img.artist}</span>
      <span aria-hidden>·</span>
      <span>{img.license}</span>
      <span aria-hidden>·</span>
      <Link href={page(img)} target="_blank" rel="noreferrer">
        Wikimedia Commons
      </Link>
    </Caption1>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <path
        d={dir === "left" ? "M10 3 L5 8 L10 13" : "M6 3 L11 8 L6 13"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Full-size viewer shared by every mode. Arrow keys step through the set. */
function Viewer({
  set,
  index,
  onIndex,
}: {
  set: Img[];
  index: number | null;
  onIndex: (i: number | null) => void;
}) {
  const styles = useStyles();
  const img = index === null ? null : set[index];
  const step = useCallback(
    (d: number) =>
      index !== null && onIndex((index + d + set.length) % set.length),
    [index, onIndex, set.length],
  );
  return (
    <Dialog
      open={img !== null}
      onOpenChange={(_, d) => !d.open && onIndex(null)}
    >
      <DialogSurface
        className={styles.viewer}
        aria-label={img?.caption}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") step(1);
          if (e.key === "ArrowLeft") step(-1);
        }}
      >
        {img && index !== null && (
          <>
            <div
              className={mergeClasses(
                styles.viewerFrame,
                kind(img) === "SVG" && styles.white,
              )}
            >
              <img
                className={styles.viewerImg}
                src={kind(img) === "JPEG" ? src(img, 1280) : original(img)}
                alt={img.alt}
                width={img.w}
                height={img.h}
              />
            </div>
            <div className={styles.viewerBar}>
              <div className={mergeClasses(styles.caption, styles.grow)}>
                <Text weight="semibold">{img.caption}</Text>
                <Credit img={img} />
              </div>
              {set.length > 1 && (
                <>
                  <Caption1 className={styles.count}>
                    {index + 1} / {set.length}
                  </Caption1>
                  <Button
                    appearance="subtle"
                    icon={<Chevron dir="left" />}
                    aria-label="Previous image"
                    onClick={() => step(-1)}
                  />
                  <Button
                    appearance="subtle"
                    icon={<Chevron dir="right" />}
                    aria-label="Next image"
                    onClick={() => step(1)}
                  />
                </>
              )}
              <Button appearance="secondary" onClick={() => onIndex(null)}>
                Close
              </Button>
            </div>
          </>
        )}
      </DialogSurface>
    </Dialog>
  );
}

function Loading({ ratio = "16 / 9" }: { ratio?: string }) {
  return (
    <Skeleton aria-label="Loading image">
      <SkeletonItem
        style={{
          aspectRatio: ratio,
          height: "auto",
          borderRadius: tokens.borderRadiusLarge,
        }}
      />
    </Skeleton>
  );
}

/** A · Single: one image answers the question. */
function Single({ streaming }: { streaming: boolean }) {
  const styles = useStyles();
  const [open, setOpen] = useState<number | null>(null);
  const img = IMAGES.skyline;
  return (
    <Card className={styles.card}>
      <Title3 as="p" className={styles.lead}>
        From Queen Anne Hill, the Space Needle stands in front of downtown, and
        Mount Rainier rises about 60 miles behind it.
      </Title3>
      <figure className={styles.figure}>
        {streaming ? (
          <Loading ratio={`${img.w} / ${img.h}`} />
        ) : (
          <button
            type="button"
            className={styles.shot}
            style={{ aspectRatio: `${img.w} / ${img.h}` }}
            onClick={() => setOpen(0)}
            aria-label={`Open ${img.caption} full size`}
          >
            <img
              className={styles.img}
              src={src(img, 1280)}
              alt={img.alt}
              width={img.w}
              height={img.h}
            />
          </button>
        )}
        <figcaption className={styles.caption}>
          <Text weight="semibold">{img.caption}</Text>
          <Credit img={img} />
        </figcaption>
      </figure>
      <Viewer set={[img]} index={open} onIndex={setOpen} />
    </Card>
  );
}

/** B · Gallery: a hero and supporting tiles; any tile opens the viewer at that image. */
function Gallery({ streaming }: { streaming: boolean }) {
  const styles = useStyles();
  const [open, setOpen] = useState<number | null>(null);
  return (
    <Card className={styles.card}>
      <Title3 as="p" className={styles.lead}>
        Five views of Seattle: the skyline, the Space Needle and its view, Pike
        Place Market, and Mount Rainier from orbit.
      </Title3>
      <ul
        className={styles.mosaic}
        aria-label={`${GALLERY.length} images`}
        style={{ listStyle: "none", margin: 0, padding: 0 }}
      >
        {GALLERY.map((g, i) => (
          <li key={g.file} className={i === 0 ? styles.hero : undefined}>
            {streaming ? (
              <Skeleton aria-label="Loading image" style={{ height: "100%" }}>
                <SkeletonItem
                  style={{
                    height: "100%",
                    borderRadius: tokens.borderRadiusMedium,
                  }}
                />
              </Skeleton>
            ) : (
              <button
                type="button"
                className={mergeClasses(styles.shot, styles.tile)}
                onClick={() => setOpen(i)}
                aria-label={`Open ${g.caption}`}
              >
                <img
                  className={styles.img}
                  src={src(g, i === 0 ? 960 : 500)}
                  alt={g.alt}
                  width={g.w}
                  height={g.h}
                  loading="lazy"
                />
              </button>
            )}
          </li>
        ))}
      </ul>
      <Caption1 className={styles.credit}>
        Photos from Wikimedia Commons. Open any photo to see its author and
        license.
      </Caption1>
      <Viewer set={GALLERY} index={open} onIndex={setOpen} />
    </Card>
  );
}

/** C · Carousel: an ordered sequence, one frame at a time. Swipe, click, or use the arrow keys. */
function Carousel({ streaming }: { streaming: boolean }) {
  const styles = useStyles();
  const track = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);
  const go = (i: number) => {
    const t = track.current;
    if (t) t.scrollTo({ left: i * t.clientWidth });
  };
  useEffect(() => {
    const t = track.current;
    if (!t) return;
    const onScroll = () => setAt(Math.round(t.scrollLeft / t.clientWidth));
    t.addEventListener("scroll", onScroll, { passive: true });
    return () => t.removeEventListener("scroll", onScroll);
  }, [streaming]);
  const img = TOUR[at];
  return (
    <Card className={styles.card}>
      <Title3 as="p" className={styles.lead}>
        A walk from Queen Anne Hill to the waterfront in five stops: the
        skyline, the Needle and its view, then the market.
      </Title3>
      {streaming ? (
        <Loading />
      ) : (
        <div
          ref={track}
          className={styles.track}
          tabIndex={0}
          role="region"
          aria-roledescription="carousel"
          aria-label={`${TOUR.length} photos. Use the arrow keys to move.`}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") go(Math.min(at + 1, TOUR.length - 1));
            if (e.key === "ArrowLeft") go(Math.max(at - 1, 0));
          }}
        >
          {TOUR.map((t, i) => (
            <div
              key={t.file}
              className={styles.slide}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${TOUR.length}: ${t.caption}`}
            >
              <img
                className={styles.img}
                src={src(t, 1280)}
                alt={t.alt}
                width={t.w}
                height={t.h}
                loading={i ? "lazy" : "eager"}
              />
            </div>
          ))}
        </div>
      )}
      <div className={styles.controls}>
        <Caption1 className={styles.count} aria-live="polite">
          {at + 1} / {TOUR.length}
        </Caption1>
        <div className={styles.dots}>
          {TOUR.map((t, i) => (
            <button
              key={t.file}
              type="button"
              className={mergeClasses(styles.dot, i === at && styles.dotOn)}
              aria-label={`Show ${t.caption}`}
              aria-current={i === at ? "true" : undefined}
              onClick={() => go(i)}
            />
          ))}
        </div>
        <Button
          appearance="subtle"
          icon={<Chevron dir="left" />}
          aria-label="Previous photo"
          disabled={at === 0}
          onClick={() => go(at - 1)}
        />
        <Button
          appearance="subtle"
          icon={<Chevron dir="right" />}
          aria-label="Next photo"
          disabled={at === TOUR.length - 1}
          onClick={() => go(at + 1)}
        />
      </div>
      <div className={styles.caption}>
        <Text weight="semibold">{img.caption}</Text>
        <Credit img={img} />
      </div>
    </Card>
  );
}

/** D · Vector: an SVG diagram, shown whole on a white plate, never cropped. */
function Vector({ streaming }: { streaming: boolean }) {
  const styles = useStyles();
  const [open, setOpen] = useState<number | null>(null);
  const img = IMAGES.rail;
  return (
    <Card className={styles.card}>
      <Title3 as="p" className={styles.lead}>
        Link light rail crosses Seattle north to south, from Shoreline through
        downtown to the airport and Angle Lake.
      </Title3>
      <div className={styles.vector}>
        {streaming ? (
          <Loading ratio={`${img.w} / ${img.h}`} />
        ) : (
          <button
            type="button"
            className={mergeClasses(styles.shot, styles.plate)}
            style={{ aspectRatio: `${img.w} / ${img.h}` }}
            onClick={() => setOpen(0)}
            aria-label={`Open ${img.caption} full size`}
          >
            <img
              className={mergeClasses(styles.img, styles.contain)}
              src={original(img)}
              alt={img.alt}
              width={img.w}
              height={img.h}
            />
            <span className={styles.kind}>{kind(img)}</span>
          </button>
        )}
        <dl className={styles.facts}>
          <div className={styles.fact}>
            <dt>
              <Caption1 className={styles.factKey}>Diagram</Caption1>
            </dt>
            <dd className={styles.dd}>
              <Text weight="semibold">{img.caption}</Text>
            </dd>
          </div>
          <div className={styles.fact}>
            <dt>
              <Caption1 className={styles.factKey}>Format</Caption1>
            </dt>
            <dd className={styles.dd}>
              <Body1>
                Vector, so it stays sharp at any size. The viewer opens the
                original file.
              </Body1>
            </dd>
          </div>
          <div className={styles.fact}>
            <dt>
              <Caption1 className={styles.factKey}>Source</Caption1>
            </dt>
            <dd className={styles.dd}>
              <Credit img={img} />
            </dd>
          </div>
        </dl>
      </div>
      <Viewer set={[img]} index={open} onIndex={setOpen} />
    </Card>
  );
}

/** E · Animation: a GIF the reader can pause on the current frame. Reduced motion starts it paused. */
function Animation({ streaming }: { streaming: boolean }) {
  const styles = useStyles();
  const img = IMAGES.cradle;
  const [playing, setPlaying] = useState(true);
  const gif = useRef<HTMLImageElement>(null);
  const frame = useRef<HTMLCanvasElement>(null);
  // Copy the frame on screen to the canvas, so pausing holds that exact frame.
  const freeze = () => {
    const i = gif.current;
    const c = frame.current;
    if (!i || !c || !i.complete || !i.naturalWidth) return;
    c.width = i.naturalWidth;
    c.height = i.naturalHeight;
    c.getContext("2d")?.drawImage(i, 0, 0);
  };
  const pause = () => {
    freeze();
    setPlaying(false);
  };
  useEffect(() => {
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const i = gif.current;
    if (i?.complete) pause();
    else i?.addEventListener("load", pause, { once: true });
    return () => i?.removeEventListener("load", pause);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per mount
  }, [streaming]);
  return (
    <Card className={styles.card}>
      <Title3 as="p" className={styles.lead}>
        In Newton&apos;s cradle, momentum passes through the balls at rest: one
        swings in, and one swings out on the far side.
      </Title3>
      {streaming ? (
        <div style={{ width: "min(420px, 100%)" }}>
          <Loading ratio="4 / 3" />
        </div>
      ) : (
        <figure className={styles.figure}>
          <div className={mergeClasses(styles.shot, styles.anim)}>
            <img
              ref={gif}
              className={styles.img}
              src={original(img)}
              alt={playing ? img.alt : ""}
              width={img.w}
              height={img.h}
              style={playing ? undefined : { visibility: "hidden" }}
            />
            <canvas
              ref={frame}
              className={styles.canvas}
              role="img"
              aria-label={`${img.alt}. Paused.`}
              hidden={playing}
            />
            <span className={styles.kind}>{kind(img)}</span>
          </div>
          <div className={styles.animBar}>
            <Button
              appearance="secondary"
              onClick={() => (playing ? pause() : setPlaying(true))}
            >
              {playing ? "Pause" : "Play"}
            </Button>
            <div className={styles.caption}>
              <Text weight="semibold">{img.caption}</Text>
              <Credit img={img} />
            </div>
          </div>
        </figure>
      )}
    </Card>
  );
}

type Mode = "complete" | "streaming";

const VARIANTS = [
  {
    letter: "A",
    name: "Single",
    note: "One image answers the question.",
    View: Single,
  },
  {
    letter: "B",
    name: "Gallery",
    note: "A set to browse. Any tile opens the viewer.",
    View: Gallery,
  },
  {
    letter: "C",
    name: "Carousel",
    note: "An ordered sequence, one frame at a time.",
    View: Carousel,
  },
  {
    letter: "D",
    name: "Vector",
    note: "SVG diagrams are shown whole, never cropped.",
    View: Vector,
  },
  {
    letter: "E",
    name: "Animation",
    note: "GIFs can pause. Reduced motion starts them paused.",
    View: Animation,
  },
];

function Lab() {
  const styles = useStyles();
  const [mode, setMode] = useState<Mode>("complete");
  return (
    <main className={styles.page}>
      <header className={styles.intro}>
        <Title3 as="h1">Media card · Image</Title3>
        <Body1 className={styles.introText}>
          Five layouts in the Answer card language, with real, openly licensed
          images from Wikimedia Commons. Every image keeps its author and
          license one click away.
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

export default function ImageLabPage() {
  return (
    <FluentRoot>
      <Lab />
    </FluentRoot>
  );
}
