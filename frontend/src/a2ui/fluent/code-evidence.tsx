"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useId,
  useState,
} from "react";
import {
  Button,
  Caption1,
  makeStyles,
  mergeClasses,
  Text,
  tokens,
} from "@fluentui/react-components";
import { ChevronRight } from "lucide-react";

const useStyles = makeStyles({
  root: {
    display: "grid",
    rowGap: "10px",
    minWidth: 0,
  },
  rootInline: {
    display: "contents",
  },
  footer: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "2px 8px",
  },
  footerIndented: {
    marginInlineStart: "64px",
    "@media (max-width: 480px)": { marginInlineStart: "56px" },
  },
  footerInline: {
    gridColumn: "2",
    gridRow: "1",
    justifySelf: "end",
  },
  caption: {
    color: tokens.colorNeutralForeground2,
  },
  trigger: {
    minWidth: 0,
    minHeight: "24px",
    paddingInline: "4px 6px",
    color: tokens.colorNeutralForeground2,
    fontWeight: tokens.fontWeightSemibold,
    ":hover": {
      color: tokens.colorNeutralForeground1,
      backgroundColor: tokens.colorNeutralBackground1,
    },
  },
  chevron: {
    width: "14px",
    height: "14px",
    transitionProperty: "transform",
    transitionDuration: tokens.durationNormal,
    transitionTimingFunction: tokens.curveDecelerateMid,
    "@media (prefers-reduced-motion: reduce)": {
      transitionDuration: "0ms",
    },
  },
  chevronOpen: { transform: "rotate(90deg)" },
  reveal: {
    display: "grid",
    rowGap: "12px",
    padding: "8px 16px 4px",
    "@media (prefers-reduced-motion: no-preference)": {
      animationDuration: tokens.durationNormal,
      animationTimingFunction: tokens.curveDecelerateMid,
      animationFillMode: "both",
      animationName: {
        from: { opacity: 0, transform: "translateY(-3px)" },
        to: { opacity: 1, transform: "translateY(0)" },
      },
    },
  },
  revealInline: {
    gridColumn: "1 / -1",
    gridRow: "2",
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    padding: "14px 0 4px",
  },
  blocks: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))",
    gap: "12px",
    alignItems: "start",
  },
  tool: {
    display: "flex",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: "4px 8px",
    color: tokens.colorNeutralForeground3,
  },
  group: { display: "grid", rowGap: "6px", minWidth: 0 },
  label: {
    color: tokens.colorNeutralForeground2,
    fontWeight: tokens.fontWeightSemibold,
  },
  code: {
    boxSizing: "border-box",
    width: "100%",
    maxHeight: "192px",
    overflow: "auto",
    margin: 0,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground2,
    padding: "12px 14px",
    color: tokens.colorNeutralForeground1,
    fontFamily: "var(--font-mono)",
    fontSize: tokens.fontSizeBase200,
    lineHeight: tokens.lineHeightBase300,
    tabSize: 2,
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
    scrollbarColor: `${tokens.colorNeutralStroke1} transparent`,
  },
  output: {
    backgroundColor: tokens.colorNeutralBackground3,
  },
});

type CodeEvidenceValue = {
  snippets: string[];
  interpreterOutput: string[];
  output: Record<string, unknown>;
};

const CodeEvidenceContext = createContext<CodeEvidenceValue | null>(null);

export function useHasCodeEvidence() {
  const evidence = useContext(CodeEvidenceContext);
  return Boolean(evidence?.snippets.length);
}

export function useCodeEvidenceKey() {
  const evidence = useContext(CodeEvidenceContext);
  return evidence
    ? JSON.stringify([
        evidence.snippets,
        evidence.interpreterOutput,
        evidence.output,
      ])
    : "";
}

export function CodeEvidenceProvider({
  children,
  snippets,
  interpreterOutput,
  output,
}: CodeEvidenceValue & { children: ReactNode }) {
  return (
    <CodeEvidenceContext.Provider
      value={{ snippets, interpreterOutput, output }}
    >
      {children}
    </CodeEvidenceContext.Provider>
  );
}

export function CodeEvidence({
  caption,
  className,
  indentTrigger = false,
  inline = false,
}: {
  caption?: string;
  className?: string;
  indentTrigger?: boolean;
  inline?: boolean;
}) {
  const styles = useStyles();
  const evidence = useContext(CodeEvidenceContext);
  const [open, setOpen] = useState(false);
  const regionId = useId();

  if (!evidence || evidence.snippets.length === 0) {
    return caption ? <Text className={styles.caption}>{caption}</Text> : null;
  }

  const { snippets } = evidence;

  return (
    <section
      className={mergeClasses(
        styles.root,
        inline && styles.rootInline,
        className,
      )}
      aria-label="Code interpreter evidence"
    >
      <div
        className={mergeClasses(
          styles.footer,
          indentTrigger && styles.footerIndented,
          inline && styles.footerInline,
        )}
      >
        {caption ? <Text className={styles.caption}>{caption}</Text> : null}
        <Button
          appearance="transparent"
          size="small"
          className={styles.trigger}
          aria-expanded={open}
          aria-controls={regionId}
          icon={
            <ChevronRight
              className={mergeClasses(
                styles.chevron,
                open && styles.chevronOpen,
              )}
              aria-hidden="true"
            />
          }
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Hide your work" : "Show your work"}
        </Button>
      </div>

      {open ? (
        <div
          className={mergeClasses(
            styles.reveal,
            inline && styles.revealInline,
          )}
          id={regionId}
        >
          <div className={styles.tool}>
            <Caption1>Tool used</Caption1>
            <Text size={200} weight="semibold">
              code_interpreter
            </Text>
          </div>
          <div className={styles.blocks}>
            {snippets.map((snippet, index) => (
              <div className={styles.group} key={`${index}-${snippet}`}>
                <Text size={200} className={styles.label}>
                  {snippets.length === 1
                    ? "Executed Python"
                    : `Python step ${index + 1}`}
                </Text>
                <pre className={styles.code}>
                  <code>{snippet}</code>
                </pre>
              </div>
            ))}
            {evidence.interpreterOutput.length ? (
              <div className={styles.group}>
                <Text size={200} className={styles.label}>
                  Interpreter output
                </Text>
                <pre className={mergeClasses(styles.code, styles.output)}>
                  <code>{evidence.interpreterOutput.join("\n")}</code>
                </pre>
              </div>
            ) : null}
            <div className={styles.group}>
              <Text size={200} className={styles.label}>
                Returned values
              </Text>
              <pre className={mergeClasses(styles.code, styles.output)}>
                <code>{JSON.stringify(evidence.output, null, 2)}</code>
              </pre>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
