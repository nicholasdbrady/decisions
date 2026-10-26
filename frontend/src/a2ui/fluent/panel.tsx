"use client";

import type { ReactNode } from "react";
import {
  Caption1,
  makeStyles,
  mergeClasses,
  Skeleton,
  SkeletonItem,
  Tag,
  Text,
  Title3,
  tokens,
} from "@fluentui/react-components";

import {
  BLEED,
  Glyph,
  hasIcon,
  num,
  records,
  str,
  ToneContext,
  TONES,
  useTone,
  wash,
} from "./tone";
import {
  CodeEvidence,
  useCodeEvidenceKey,
  useHasCodeEvidence,
} from "./code-evidence";

/**
 * Header, Panel, Metric, Chips, and Choice: the split card from DESIGN.md
 * ("Panel (approved)", "Chips (approved)", "Clarify (approved)"). The lead sits
 * on white; the Panel band below it carries the tone and holds the answer.
 */

const rise = {
  animationDuration: "500ms",
  animationTimingFunction: tokens.curveDecelerateMid,
  animationFillMode: "both",
  animationName: {
    from: { opacity: 0, transform: "translateY(4px)" },
    to: { opacity: 1, transform: "translateY(0)" },
  },
} as const;

const useStyles = makeStyles({
  head: { display: "grid", rowGap: "4px", minWidth: 0 },
  lead: { margin: 0, textWrap: "pretty" },
  muted: { color: tokens.colorNeutralForeground3 },
  secondary: { color: tokens.colorNeutralForeground2 },

  band: {
    display: "grid",
    rowGap: "20px",
    padding: "var(--jev-pad-y) var(--jev-pad-x)",
    minWidth: 0,
  },

  answer: {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr)",
    columnGap: "16px",
    alignItems: "center",
  },
  answerEvidence: {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr)",
    columnGap: "16px",
    rowGap: "4px",
    alignItems: "center",
  },
  evidenceDisclosure: { gridColumn: "1 / -1" },
  answerPlain: { gridTemplateColumns: "minmax(0, 1fr)" },
  icon: {
    width: "48px",
    height: "48px",
    "@media (max-width: 480px)": { width: "40px", height: "40px" },
  },
  figure: { display: "grid", rowGap: "2px", minWidth: 0 },
  big: {
    display: "flex",
    alignItems: "baseline",
    flexWrap: "wrap",
    columnGap: "6px",
    fontSize: tokens.fontSizeHero800,
    lineHeight: tokens.lineHeightHero800,
    fontWeight: tokens.fontWeightSemibold,
    fontVariantNumeric: "tabular-nums",
    letterSpacing: "-0.02em",
    color: tokens.colorNeutralForeground1,
    overflowWrap: "anywhere",
    "@media (max-width: 480px)": {
      fontSize: tokens.fontSizeHero700,
      lineHeight: tokens.lineHeightHero700,
    },
  },
  unit: {
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightRegular,
    color: tokens.colorNeutralForeground3,
    letterSpacing: 0,
  },
  skelValue: { width: "40%", height: "44px" },
  skelLine: { width: "60%", height: "16px" },

  chips: {
    margin: 0,
    padding: 0,
    listStyle: "none",
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  chip: {
    maxWidth: "100%",
    "@media (prefers-reduced-motion: no-preference)": rise,
  },
  tag: {
    height: "28px",
    maxWidth: "100%",
    borderRadius: tokens.borderRadiusCircular,
    fontVariantNumeric: "tabular-nums",
  },
  chipIcon: { width: "16px", height: "16px" },

  // Clarify D: one-tap candidate rows that already show their answer.
  choice: {
    position: "relative",
    width: "100%",
    boxSizing: "border-box",
    minHeight: "64px",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    alignItems: "center",
    columnGap: "16px",
    padding: "10px 16px",
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    textAlign: "start",
    boxShadow: tokens.shadow2,
    transitionProperty: "box-shadow, transform",
    transitionDuration: tokens.durationFaster,
    transitionTimingFunction: tokens.curveEasyEase,
    "@media (prefers-reduced-motion: no-preference)": rise,
  },
  choiceTop: { minHeight: "88px", boxShadow: tokens.shadow4 },
  choiceBare: { gridTemplateColumns: "minmax(0, 1fr)" },
  who: { display: "grid", rowGap: "6px", minWidth: 0 },
  name: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  meter: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 8rem) auto",
    alignItems: "center",
    columnGap: "8px",
  },
  track: {
    height: "6px",
    borderRadius: tokens.borderRadiusCircular,
    overflow: "hidden",
  },
  fill: {
    display: "block",
    height: "100%",
    borderRadius: "inherit",
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
  hidden: {
    position: "absolute",
    width: "1px",
    height: "1px",
    overflow: "hidden",
    clipPath: "inset(50%)",
    whiteSpace: "nowrap",
  },
  pct: {
    fontVariantNumeric: "tabular-nums",
    color: tokens.colorNeutralForeground2,
  },
  when: { display: "grid", justifyItems: "end", rowGap: "2px", minWidth: 0 },
  value: {
    fontSize: tokens.fontSizeBase600,
    lineHeight: tokens.lineHeightBase600,
    fontWeight: tokens.fontWeightSemibold,
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
  },
  valueTop: {
    fontSize: tokens.fontSizeHero700,
    lineHeight: tokens.lineHeightHero700,
    letterSpacing: "-0.02em",
    "@media (max-width: 480px)": {
      fontSize: tokens.fontSizeBase600,
      lineHeight: tokens.lineHeightBase600,
    },
  },
});

export function HeaderView(props: { title?: unknown; caption?: unknown }) {
  const styles = useStyles();
  const title = str(props.title);
  const caption = str(props.caption);
  if (!title && !caption) return null;
  return (
    <header className={styles.head}>
      {title ? (
        <Title3 as="h2" className={styles.lead}>
          {title}
        </Title3>
      ) : null}
      {caption ? <Caption1 className={styles.muted}>{caption}</Caption1> : null}
    </header>
  );
}

export function PanelView({
  tone: own,
  children,
}: {
  tone?: unknown;
  children: ReactNode;
}) {
  const styles = useStyles();
  const tone = useTone(own);
  return (
    <ToneContext.Provider value={tone}>
      <section
        className={mergeClasses(BLEED, "jev-panel", styles.band)}
        style={{ backgroundColor: wash(tone) }}
      >
        {children}
      </section>
    </ToneContext.Provider>
  );
}

export function MetricView(props: {
  value?: unknown;
  unit?: unknown;
  caption?: unknown;
  tone?: unknown;
  icon?: unknown;
}) {
  const styles = useStyles();
  const hasCodeEvidence = useHasCodeEvidence();
  const codeEvidenceKey = useCodeEvidenceKey();
  const tone = useTone(props.tone);
  const value = str(props.value);
  const unit = str(props.unit);
  const caption = str(props.caption);
  const icon = hasIcon(props.icon) ? props.icon : TONES[tone].icon;
  if (!value) {
    return (
      <Skeleton aria-label="Working out the answer" className={styles.figure}>
        <SkeletonItem shape="rectangle" className={styles.skelValue} />
        <SkeletonItem shape="rectangle" className={styles.skelLine} />
      </Skeleton>
    );
  }
  if (hasCodeEvidence) {
    return (
      <div className={styles.answerEvidence}>
        <Glyph
          name={icon}
          size={48}
          color={TONES[tone].ink}
          className={styles.icon}
        />
        <span className={styles.big}>
          {value}
          {unit ? <span className={styles.unit}>{unit}</span> : null}
        </span>
        <CodeEvidence
          key={codeEvidenceKey}
          caption={caption || undefined}
          className={styles.evidenceDisclosure}
          indentTrigger
        />
      </div>
    );
  }
  return (
    <div className={styles.answer}>
      <Glyph
        name={icon}
        size={48}
        color={TONES[tone].ink}
        className={styles.icon}
      />
      <div className={styles.figure}>
        <span className={styles.big}>
          {value}
          {unit ? <span className={styles.unit}>{unit}</span> : null}
        </span>
        {caption ? <CodeEvidence caption={caption} /> : null}
      </div>
    </div>
  );
}

type Chip = { label?: string; icon?: string };

export function ChipsView(props: { items?: unknown }) {
  const styles = useStyles();
  const tone = useTone();
  const chips = records<Chip>(props.items).filter((chip) => str(chip?.label));
  if (chips.length === 0) return null;
  return (
    <ul className={styles.chips} aria-label="Details">
      {chips.map((chip, index) => (
        <li
          key={`${chip.label}-${index}`}
          className={styles.chip}
          style={{ animationDelay: `${index * 60}ms` }}
        >
          <Tag
            size="small"
            appearance="filled"
            className={styles.tag}
            style={{
              backgroundColor: tokens.colorNeutralBackground1,
              color: tokens.colorNeutralForeground1,
              borderColor: "transparent",
            }}
            icon={
              hasIcon(chip.icon) ? (
                <Glyph
                  name={chip.icon}
                  size={16}
                  color={TONES[tone].ink}
                  className={styles.chipIcon}
                />
              ) : undefined
            }
          >
            {str(chip.label)}
          </Tag>
        </li>
      ))}
    </ul>
  );
}

/**
 * The face of one clarify candidate. The enclosing Button owns the click and
 * the focus ring; this draws the row, and states all of it in one hidden label.
 */
export function ChoiceView(props: {
  name?: unknown;
  share?: unknown;
  value?: unknown;
  context?: unknown;
  top?: unknown;
}) {
  const styles = useStyles();
  const tone = useTone();
  const { tint, ink } = TONES[tone];
  const name = str(props.name);
  const share = num(props.share);
  const pct = share === null ? null : Math.round(share * 100);
  const value = str(props.value);
  const context = str(props.context);
  const top = props.top === true;
  const label = [
    name,
    pct === null ? "" : `${pct}% likely`,
    value,
    context.replace(" · ", ", "),
  ]
    .filter(Boolean)
    .join(", ");
  return (
    <span
      className={mergeClasses(
        "jev-choice",
        styles.choice,
        top && styles.choiceTop,
        !value && styles.choiceBare,
      )}
    >
      <span className={styles.hidden}>{label}</span>
      <span className={styles.who} aria-hidden>
        <Text weight="semibold" size={top ? 500 : 400} className={styles.name}>
          {name}
        </Text>
        {pct !== null ? (
          <span className={styles.meter}>
            <span className={styles.track} style={{ backgroundColor: tint }}>
              <span
                className={styles.fill}
                style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: ink }}
              />
            </span>
            <Caption1 className={styles.pct}>{pct}%</Caption1>
          </span>
        ) : null}
      </span>
      {value ? (
        <span className={styles.when} aria-hidden>
          <span className={mergeClasses(styles.value, top && styles.valueTop)}>
            {value}
          </span>
          {context ? (
            <Caption1 className={styles.secondary}>{context}</Caption1>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
