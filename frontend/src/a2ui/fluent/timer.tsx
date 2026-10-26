"use client";

import {
  ArrowReset20Regular,
  Pause20Regular,
  Play20Regular,
} from "@fluentui/react-icons";
import {
  Button,
  Caption1,
  makeStyles,
  mergeClasses,
  Text,
  Title3,
  tokens,
} from "@fluentui/react-components";
import { useEffect, useRef, useState } from "react";

import { BLEED, num, str, TONES, wash } from "./tone";

const SIZE = 150;
const RADIUS = 69;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const useStyles = makeStyles({
  surface: {
    display: "grid",
    gridTemplateColumns: `${SIZE}px minmax(0, 1fr)`,
    alignItems: "center",
    gap: "28px",
    padding: "var(--jev-pad-y) var(--jev-pad-x)",
    backgroundColor: wash("time"),
    "@media (max-width: 520px)": {
      gridTemplateColumns: "1fr",
      justifyItems: "center",
      gap: "20px",
    },
  },
  ring: {
    position: "relative",
    width: `${SIZE}px`,
    height: `${SIZE}px`,
    display: "grid",
    placeItems: "center",
  },
  svg: {
    position: "absolute",
    inset: 0,
    width: `${SIZE}px`,
    height: `${SIZE}px`,
    transform: "rotate(-90deg)",
  },
  track: {
    fill: "none",
    stroke: tokens.colorNeutralStroke2,
    strokeWidth: 4,
  },
  progress: {
    fill: "none",
    stroke: TONES.time.ink,
    strokeWidth: 4,
    strokeLinecap: "round",
    transitionProperty: "stroke-dashoffset",
    transitionDuration: "250ms",
    transitionTimingFunction: "linear",
    "@media (prefers-reduced-motion: reduce)": {
      transitionDuration: "0ms",
    },
  },
  clock: {
    position: "relative",
    fontSize: tokens.fontSizeHero800,
    lineHeight: tokens.lineHeightHero800,
    fontWeight: tokens.fontWeightSemibold,
    fontVariantNumeric: "tabular-nums",
    letterSpacing: "-0.03em",
  },
  details: {
    minWidth: 0,
    display: "grid",
    justifyItems: "start",
    gap: "6px",
    "@media (max-width: 520px)": {
      justifyItems: "center",
      textAlign: "center",
    },
  },
  title: {
    margin: 0,
    overflowWrap: "anywhere",
    textWrap: "pretty",
  },
  muted: { color: tokens.colorNeutralForeground3 },
  controls: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginTop: "12px",
  },
  primary: { minWidth: "98px" },
  done: {
    "@media (prefers-reduced-motion: no-preference)": {
      animationName: {
        from: { transform: "scale(0.98)", opacity: 0.75 },
        to: { transform: "scale(1)", opacity: 1 },
      },
      animationDuration: "360ms",
      animationTimingFunction: tokens.curveDecelerateMax,
    },
  },
});

function clock(seconds: number): string {
  const safe = Math.max(0, Math.ceil(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const remainder = safe % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
    : `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function durationLabel(seconds: number): string {
  if (seconds % 3600 === 0) {
    const hours = seconds / 3600;
    return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  }
  if (seconds % 60 === 0) {
    const minutes = seconds / 60;
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
  }
  return `${seconds} ${seconds === 1 ? "second" : "seconds"}`;
}

export function TimerView({
  label,
  duration,
}: {
  label?: unknown;
  duration?: unknown;
}) {
  const styles = useStyles();
  const total = Math.max(0, Math.round(num(duration) ?? 0));
  const [remaining, setRemaining] = useState(total);
  const [running, setRunning] = useState(false);
  const endsAt = useRef<number | null>(null);
  const complete = total > 0 && remaining === 0;
  const progress = total > 0 ? remaining / total : 0;

  useEffect(() => {
    if (!running || endsAt.current === null) return;
    const update = () => {
      const next = Math.max(
        0,
        Math.ceil(((endsAt.current ?? Date.now()) - Date.now()) / 1000),
      );
      setRemaining(next);
      if (next === 0) {
        endsAt.current = null;
        setRunning(false);
      }
    };
    update();
    const interval = window.setInterval(update, 250);
    return () => window.clearInterval(interval);
  }, [running]);

  const toggle = () => {
    if (running) {
      if (endsAt.current !== null) {
        setRemaining(
          Math.max(0, Math.ceil((endsAt.current - Date.now()) / 1000)),
        );
      }
      endsAt.current = null;
      setRunning(false);
      return;
    }
    const next = remaining > 0 ? remaining : total;
    setRemaining(next);
    endsAt.current = Date.now() + next * 1000;
    setRunning(next > 0);
  };

  const reset = () => {
    endsAt.current = null;
    setRunning(false);
    setRemaining(total);
  };

  const action = running
    ? "Pause"
    : remaining > 0 && remaining < total
      ? "Resume"
      : "Start";
  const title = str(label).trim() || "Timer";

  return (
    <section
      className={mergeClasses(BLEED, styles.surface, complete && styles.done)}
      aria-label={`${title} timer`}
    >
      <div
        className={styles.ring}
        role="timer"
        aria-label={
          complete ? `${title} timer complete` : `${clock(remaining)} remaining`
        }
      >
        <svg className={styles.svg} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden>
          <circle
            className={styles.track}
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
          />
          <circle
            className={styles.progress}
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
          />
        </svg>
        <Text className={styles.clock}>
          {complete ? "Done" : clock(remaining)}
        </Text>
      </div>

      <div className={styles.details}>
        <Title3 as="h2" className={styles.title}>
          {title}
        </Title3>
        <Caption1 className={styles.muted}>{durationLabel(total)}</Caption1>
        <div className={styles.controls}>
          <Button
            className={styles.primary}
            appearance="primary"
            icon={running ? <Pause20Regular /> : <Play20Regular />}
            onClick={toggle}
            disabled={total === 0}
          >
            {action}
          </Button>
          <Button
            appearance="subtle"
            icon={<ArrowReset20Regular />}
            aria-label="Reset timer"
            onClick={reset}
            disabled={total === 0 || (!running && remaining === total)}
          />
        </div>
      </div>
    </section>
  );
}
