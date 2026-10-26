"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ActivityMessage } from "@ag-ui/core";
import {
  a2uiDefaultTheme,
  createA2UIMessageRenderer,
  useAgent,
  useCopilotKit,
  UseAgentUpdate,
} from "@copilotkit/react-core/v2";
import { Tooltip } from "@fluentui/react-components";
import {
  ArrowDown,
  BrainCircuit,
  CircleHelp,
  PanelRight,
  X,
  Zap,
} from "lucide-react";

import { jevCatalog } from "@/a2ui/catalog";
import { CodeEvidenceProvider } from "@/a2ui/fluent/code-evidence";
import { HeroView } from "@/a2ui/fluent/hero";

const AGENT_ID = "commandCanvas";
const SURFACE_ACTIVITY = "a2ui-surface";
const DEBOUNCE_MS = 400;
const RUN_TIMEOUT_MS = 70_000;
const MAX_COMMAND_LINES = 3;

const HINTS = [
  "100 c to f",
  "split a $120 dinner between 4 people",
  "remind me to call mom at 6",
  "remember to buy oat milk tomorrow",
  "20% of 85",
  "weather in seattle tomorrow",
];

const MATRIX_DELAYS = [
  Array.from({ length: 16 }, (_, index) => (index % 4) * 90),
  [7, 2, 11, 5, 14, 9, 0, 12, 3, 15, 6, 10, 13, 1, 8, 4].map(
    (order) => order * 72,
  ),
  Array.from({ length: 16 }, (_, index) => {
    const ring = [1, 2, 7, 11, 14, 13, 8, 4];
    const position = ring.indexOf(index);
    return position < 0 ? null : position * 120;
  }),
];

function A2uiLoadingCard() {
  return (
    <div className="jev-card">
      <div className="jev-column">
        <HeroView value="" tone="neutral" />
      </div>
    </div>
  );
}

/** What the backend attaches to the `render_surface` tool call for the Inspector. */
type DecisionTrace = {
  schema?: string;
  confidence?: number;
  margin?: number;
  reason?: string;
  candidates?: { schema: string; probability: number }[];
  signals?: Record<string, number>;
  needsClarification?: number;
  hasEnoughEvidence?: number;
  decisionModel?: string;
  decisionLatencyMs?: number;
  lanes?: string[];
  lane?: string;
  lunaModel?: string;
  lunaLatencyMs?: number;
  verificationStatus?: string;
  verificationConfidence?: number;
  verificationModel?: string;
  verificationLatencyMs?: number;
  values?: Record<string, unknown>;
  code?: unknown;
  codeOutput?: unknown;
  sources?: unknown;
};

type Committed = { id: string; label: string; activity: ActivityMessage };
type RunIssue = { kind: "error" | "empty" | "timeout"; message: string };

const SIGNAL_HELP: Record<string, { label: string; description: string }> = {
  needs_expansion: {
    label: "Expand the request",
    description:
      "Whether the command names a meal or concept whose concrete items must be derived.",
  },
  lists_items: {
    label: "Contains multiple items",
    description:
      "Whether the command already lists separate items, tasks, or options.",
  },
  is_value: {
    label: "Is a concrete value",
    description:
      "Whether the command is itself a value or asks for one, such as a number, unit, link, or color.",
  },
  is_complete: {
    label: "Input is complete",
    description:
      "Whether the command already includes every field the selected mini-app would ideally save.",
  },
  needs_lookup: {
    label: "Needs current knowledge",
    description:
      "Whether named facts, places, products, or recent information require retrieval.",
  },
  needs_computation: {
    label: "Needs calculation",
    description:
      "Whether the request contains arithmetic, conversion, splitting, or date math. Exact math stays in code.",
  },
};

function activeRunCompletion(value: unknown): Promise<void> | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const completion = Reflect.get(value, "activeRunCompletionPromise");
  return completion instanceof Promise ? completion : undefined;
}

export function A2uiOmnibar() {
  const { copilotkit } = useCopilotKit();
  const { agent, isReady } = useAgent({
    agentId: AGENT_ID,
    updates: [
      UseAgentUpdate.OnMessagesChanged,
      UseAgentUpdate.OnRunStatusChanged,
    ],
    throttleMs: 60,
  });

  const [command, setCommand] = useState("");
  const [working, setWorking] = useState(false);
  const [runStartedAt, setRunStartedAt] = useState<number | null>(null);
  const [runIssue, setRunIssue] = useState<RunIssue | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [committed, setCommitted] = useState<Committed[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const runIdRef = useRef(0);
  const [activeRunId, setActiveRunId] = useState<number | null>(null);

  const renderer = useMemo(
    () =>
      createA2UIMessageRenderer({
        theme: a2uiDefaultTheme,
        catalog: jevCatalog,
        loadingComponent: A2uiLoadingCard,
      }),
    [],
  );
  const RenderSurface = renderer.render;

  const surface = useMemo(
    () => latestSurface(agent.messages),
    [agent.messages],
  );
  const trace = useMemo(() => latestTrace(agent.messages), [agent.messages]);
  const notice = useMemo(() => latestNotice(agent.messages), [agent.messages]);
  const code = useMemo(() => codeSnippets(trace?.code), [trace?.code]);
  const codeOutput = useMemo(
    () => codeSnippets(trace?.codeOutput),
    [trace?.codeOutput],
  );
  const activeWorking =
    activeRunId !== null && (working || agent.isRunning);
  const glyphWorking = activeWorking;

  const run = useCallback(
    async (text: string) => {
      if (!isReady) {
        setRunIssue({
          kind: "error",
          message: "The agent is still connecting. Try again in a moment.",
        });
        return;
      }
      const runId = ++runIdRef.current;
      const previousRunCompletion = activeRunCompletion(agent);
      agent.abortRun();
      setRunIssue(null);
      if (!text) {
        agent.setMessages([]);
        setWorking(false);
        setActiveRunId(null);
        setRunStartedAt(null);
        return;
      }
      if (previousRunCompletion) {
        try {
          await previousRunCompletion;
        } catch (error) {
          console.warn("The previous agent run did not settle cleanly.", error);
        }
      }
      if (runIdRef.current !== runId) return;
      agent.setMessages(
        [{ id: crypto.randomUUID(), role: "user", content: text }],
      );
      setActiveRunId(runId);
      setRunStartedAt(Date.now());
      setWorking(true);
      try {
        await copilotkit.runAgent({
          agent,
          forwardedProps: {
            now: new Date().toISOString(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        });
      } catch (error) {
        if (
          runIdRef.current === runId &&
          (error as Error).name !== "AbortError"
        ) {
          setRunIssue({
            kind: "error",
            message:
              error instanceof Error
                ? `The run stopped: ${error.message}`
                : "The run stopped before a card was returned.",
          });
        }
      } finally {
        if (runIdRef.current === runId) setWorking(false);
      }
    },
    [agent, copilotkit, isReady],
  );

  const runRef = useRef(run);
  useEffect(() => {
    runRef.current = run;
  }, [run]);

  // Depend on the text alone. `run` changes identity whenever `agent.messages`
  // updates, so including it here would let the surface's own arrival retrigger
  // the effect, and the next `run` would abort and clear the card that just painted.
  useEffect(() => {
    const text = command.trim();
    const timer = window.setTimeout(
      () => void runRef.current(text),
      DEBOUNCE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [command]);

  useEffect(() => {
    if (
      !activeWorking ||
      runStartedAt === null ||
      activeRunId === null
    )
      return;
    const remaining = Math.max(0, RUN_TIMEOUT_MS - (Date.now() - runStartedAt));
    const timer = window.setTimeout(() => {
      if (runIdRef.current !== activeRunId) return;
      runIdRef.current += 1;
      agent.abortRun();
      setWorking(false);
      setActiveRunId(null);
      setRunStartedAt(null);
      setRunIssue({
        kind: "timeout",
        message:
          "This run took longer than 70 seconds. It was stopped so you can retry or change the prompt.",
      });
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [activeRunId, activeWorking, agent, runStartedAt]);

  useEffect(() => {
    if (activeWorking || activeRunId === null || runStartedAt === null) return;
    const arrived = Boolean(surface || notice);
    const timer = window.setTimeout(() => {
      if (runIdRef.current !== activeRunId) return;
      if (!arrived && command.trim()) {
        setRunIssue({
          kind: "empty",
          message:
            "The card did not arrive. Try the request again.",
        });
      } else {
        setRunIssue(null);
      }
      setActiveRunId(null);
      setRunStartedAt(null);
    }, arrived ? 0 : 1_000);
    return () => window.clearTimeout(timer);
  }, [
    activeRunId,
    activeWorking,
    command,
    notice,
    runStartedAt,
    surface,
  ]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = "auto";
    const styles = window.getComputedStyle(input);
    const lineHeight = Number.parseFloat(styles.lineHeight);
    const verticalPadding =
      Number.parseFloat(styles.paddingTop) +
      Number.parseFloat(styles.paddingBottom);
    const maxHeight = lineHeight * MAX_COMMAND_LINES + verticalPadding;
    const nextHeight = Math.min(input.scrollHeight, maxHeight);
    input.style.height = `${nextHeight}px`;
    input.style.overflowY =
      input.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [command]);

  const clearAll = useCallback(() => {
    runIdRef.current += 1;
    setCommand("");
    agent.abortRun();
    agent.setMessages([]);
    setWorking(false);
    setActiveRunId(null);
    setRunStartedAt(null);
    setRunIssue(null);
    inputRef.current?.focus();
  }, [agent]);

  useEffect(() => {
    const clearOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      clearAll();
    };
    window.addEventListener("keydown", clearOnEscape);
    return () => window.removeEventListener("keydown", clearOnEscape);
  }, [clearAll]);

  function commit() {
    if (!surface) return;
    setCommitted((rows) => [
      {
        id: surface.id,
        label: command.trim() || trace?.schema || "Card",
        activity: surface,
      },
      ...rows,
    ]);
    clearAll();
  }

  const dotPattern = Math.min(command.length, 2);

  return (
    <main
      className={`omnibar-page ${inspectorOpen ? "inspector-open" : ""}`}
      aria-label="Decision-1 A2UI surface"
    >
      <button
        className="inspector-button"
        type="button"
        aria-expanded={inspectorOpen}
        aria-controls="jev-inspector"
        onClick={() => setInspectorOpen((open) => !open)}
      >
        <PanelRight size={16} aria-hidden="true" /> Inspector
      </button>

      <section className="omnibar-stage">
        <div className={`omnibar-shell ${surface ? "has-card" : ""}`}>
          <div className={`input-line ${activeWorking ? "working" : ""}`}>
            <span
              className={`lead-glyph ${glyphWorking || surface ? "on" : ""} ${
                glyphWorking ? "working" : ""
              }`}
              aria-hidden="true"
            >
              <MatrixDots pattern={dotPattern} working={glyphWorking} />
            </span>
            <textarea
              ref={inputRef}
              autoFocus
              aria-label="Decision-1 command"
              aria-describedby="omnibar-hint"
              value={command}
              rows={1}
              onChange={(event) => setCommand(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  (event.metaKey || event.ctrlKey) &&
                  surface
                ) {
                  event.preventDefault();
                  commit();
                }
              }}
              spellCheck={false}
              autoComplete="off"
            />
            {command ? null : <HintRotator />}
          </div>

          {activeWorking ? (
            <WorkingStatus trace={trace} startedAt={runStartedAt} />
          ) : runIssue && !surface ? (
            <RunNotice
              issue={runIssue}
              onRetry={() => void run(command.trim())}
            />
          ) : notice && !surface ? (
            <p className="omnibar-notice" role="status">
              {notice}
            </p>
          ) : null}

          {surface ? (
            <section className="live-card a2ui-card" aria-live="polite">
              <div
                className="live-card-scroll"
                role="region"
                aria-label="Generated card content"
                tabIndex={0}
              >
                <CodeEvidenceProvider
                  snippets={code}
                  interpreterOutput={codeOutput}
                  output={trace?.values ?? {}}
                >
                  <RenderSurface
                    activityType={surface.activityType}
                    content={surface.content}
                    message={surface}
                    agent={agent}
                  />
                </CodeEvidenceProvider>
              </div>
              <footer className="card-footer">
                <span>
                  <kbd>Esc</kbd> to clear
                </span>
                <span />
                <button
                  className="commit-button ready"
                  type="button"
                  onClick={commit}
                >
                  Keep <kbd>Ctrl ↵</kbd>
                </button>
              </footer>
            </section>
          ) : null}
        </div>

        <div
          className={
            committed.length ? "committed-list has-items" : "committed-list"
          }
          aria-label="Kept cards"
        >
          {committed.map((row) => (
            <article className="committed-row" key={row.id}>
              <span className="type-tile small" aria-hidden="true" />
              <strong>{row.label}</strong>
              <span className="row-meta" />
              <button
                type="button"
                aria-label={`Delete ${row.label}`}
                onClick={() =>
                  setCommitted((rows) =>
                    rows.filter((item) => item.id !== row.id),
                  )
                }
              >
                <X size={15} />
              </button>
            </article>
          ))}
        </div>
      </section>

      <InspectorPanel
        open={inspectorOpen}
        trace={trace}
        working={activeWorking}
        startedAt={runStartedAt}
        issue={runIssue}
        hasSurface={Boolean(surface)}
        onClose={() => setInspectorOpen(false)}
      />
    </main>
  );
}

function MatrixDots({
  pattern,
  working,
}: {
  pattern: number;
  working: boolean;
}) {
  const delays = MATRIX_DELAYS[pattern % MATRIX_DELAYS.length];
  return (
    <span
      className={`matrix-dots ${working ? "working" : ""}`}
      aria-hidden="true"
    >
      {delays.map((delay, index) => (
        <i
          key={index}
          className={delay === null ? "steady" : undefined}
          style={delay === null ? undefined : { animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}

// Held back briefly so a fast run does not flash a status line before its card.
const STATUS_DELAY_MS = 120;

function workingLabel(trace: DecisionTrace | null) {
  if (!trace) return "Classifying request";
  if (trace.schema === "graph") {
    const lead =
      typeof trace.values?.lead === "string" ? trace.values.lead.trim() : "";
    return lead ? "Building graph" : "Searching data";
  }
  if (trace.lanes?.includes("web")) {
    const lead =
      typeof trace.values?.lead === "string" ? trace.values.lead.trim() : "";
    const points = Array.isArray(trace.values?.points)
      ? trace.values.points.length
      : 0;
    return lead || points ? "Writing answer" : "Searching sources";
  }
  return "Resolving details";
}

function WorkingStatus({
  trace,
  startedAt,
}: {
  trace: DecisionTrace | null;
  startedAt: number | null;
}) {
  const elapsed = useElapsed(startedAt, true);
  if (elapsed < STATUS_DELAY_MS) return null;
  return (
    <p className="omnibar-working" role="status">
      <span className="omnibar-working-label">{workingLabel(trace)}</span>
      <span className="omnibar-elapsed">{(elapsed / 1000).toFixed(1)}s</span>
    </p>
  );
}

function RunNotice({
  issue,
  onRetry,
}: {
  issue: RunIssue;
  onRetry: () => void;
}) {
  return (
    <div className={`omnibar-notice issue-${issue.kind}`} role="alert">
      <span>{issue.message}</span>
      <button type="button" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

function HintRotator() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(
      () => setIndex((value) => (value + 1) % HINTS.length),
      3600,
    );
    return () => window.clearInterval(timer);
  }, []);
  return (
    <span className="hint-rotator" id="omnibar-hint" aria-hidden="true">
      <span className="hint-phrase" key={index}>
        {HINTS[index]}
      </span>
    </span>
  );
}

function InspectorPanel({
  open,
  trace,
  working,
  startedAt,
  issue,
  hasSurface,
  onClose,
}: {
  open: boolean;
  trace: DecisionTrace | null;
  working: boolean;
  startedAt: number | null;
  issue: RunIssue | null;
  hasSurface: boolean;
  onClose: () => void;
}) {
  const elapsed = useElapsed(startedAt, working);
  const extractionElapsed =
    trace?.lane === "streaming" && working
      ? Math.max(0, elapsed - (trace.decisionLatencyMs ?? 0))
      : trace?.lunaLatencyMs;
  const completedElapsed =
    trace?.decisionLatencyMs !== undefined ||
    trace?.lunaLatencyMs !== undefined
      ? (trace?.decisionLatencyMs ?? 0) + (trace?.lunaLatencyMs ?? 0)
      : undefined;
  const status = working
    ? "Running"
    : issue
      ? issue.kind === "timeout"
        ? "Timed out"
        : "Needs attention"
      : hasSurface
        ? "Complete"
        : "Idle";
  const routeSummary = trace?.schema
    ? `Selected ${humanize(trace.schema)} from ${trace.candidates?.length ?? 0} candidates.`
    : working
      ? "Classifying intent, completeness, and task needs."
      : "Routes each command into one bounded mini-app.";
  const resolutionSummary = !trace
    ? "Extracts structured details after routing; application code performs exact work."
    : trace.verificationStatus === "assessing"
      ? "Fast result is visible. Decision-1 is assessing confidence while code verification runs."
      : trace.verificationStatus === "confident"
        ? `Fast result is visible at ${percent(trace.verificationConfidence)} confidence. Code verification continues.`
        : trace.verificationStatus === "verified"
          ? "Code execution confirmed the fast result at 100% confidence."
          : trace.verificationStatus === "corrected"
            ? "Code execution found a difference and updated the visible result."
            : trace.verificationStatus === "unverified"
              ? "The fast result remains visible; code verification was unavailable."
    : trace.lane === "streaming"
      ? `Reading fields through ${formatLanes(trace.lanes)}.`
      : trace.schema === "split"
        ? "Luna read the bill details. Application code owns the arithmetic."
        : `Resolved through ${formatLanes(trace.lanes)}.`;
  return (
    <aside
      id="jev-inspector"
      className={`inspector-panel ${open ? "open" : ""}`}
      aria-label="Inspector"
    >
      <header className="inspector-head">
        <div>
          <strong>Under the hood</strong>
          <span>System 1 routes. System 2 resolves.</span>
        </div>
        <button type="button" aria-label="Close inspector" onClick={onClose}>
          <X size={16} />
        </button>
      </header>

      <section className="inspector-run">
        <div className="inspector-status">
          <span className={`status-dot status-${status.toLowerCase().replaceAll(" ", "-")}`} />
          <strong>{status}</strong>
          <span>{working ? workingLabel(trace) : hasSurface ? "Ready" : "Waiting for a command"}</span>
          <time>
            {startedAt
              ? formatElapsed(elapsed, working)
              : completedElapsed === undefined
                ? "—"
                : formatElapsed(completedElapsed, false)}
          </time>
        </div>
        {issue ? <p className="inspector-issue">{issue.message}</p> : null}
      </section>

      <section className="thinking-flow" aria-label="System thinking pipeline">
        <article className={trace ? "complete" : working ? "active" : ""}>
          <span className="system-icon system-one">
            <Zap size={15} aria-hidden="true" />
          </span>
          <div>
            <small>System 1 · typed decisions</small>
            <strong>Microsoft Decision-1</strong>
            <p>{routeSummary}</p>
          </div>
          <b>
            {trace?.decisionLatencyMs === undefined
              ? "—"
              : formatElapsed(trace.decisionLatencyMs, false)}
          </b>
        </article>
        <ArrowDown className="thinking-arrow" size={16} aria-hidden="true" />
        <article
          className={
            trace?.verificationStatus === "assessing" ||
            trace?.verificationStatus === "confident"
              ? "active"
              : trace?.lane && trace.lane !== "streaming"
              ? "complete"
              : trace
                ? "active"
                : ""
          }
        >
          <span className="system-icon system-two">
            <BrainCircuit size={15} aria-hidden="true" />
          </span>
          <div>
            <small>System 2 · resolution</small>
            <strong>GPT-6 Luna + application code</strong>
            <p>{resolutionSummary}</p>
          </div>
          <b>
            {extractionElapsed === undefined
              ? "—"
              : formatElapsed(extractionElapsed, trace?.lane === "streaming")}
          </b>
        </article>
      </section>

      {!trace ? (
        <section className="inspector-empty">
          <InspectorHeading
            title="What you will see"
            help="Decision-1 returns typed judgments rather than prose. This demo uses Choice to select a UI and independent Noul questions to assess task needs."
          />
          <p>
            {working
              ? "Waiting for the first typed Decision-1 response…"
              : "Type a command to watch a fast routing decision become a structured mini-app."}
          </p>
          <div className="decision-type-grid">
            <span><b>Choice</b>Select and rank one surface</span>
            <span><b>Noul</b>Judge independent task signals</span>
            <span><b>Score</b>Evaluate an ordered rubric</span>
            <span><b>Box</b>Locate one visual target</span>
          </div>
          <p className="inspector-footnote">
            This demo currently applies Choice and Noul. Score and Box are shown
            to explain the wider decision-model vocabulary.
          </p>
        </section>
      ) : (
        <div className="inspector-body">
          <section>
            <InspectorHeading
              title="Routing decision"
              type="Choice"
              help="Choice selects one application-owned UI schema from a closed candidate set. The model returns the selected option, a probability for every candidate, and confidence."
            />
            <dl>
              <Row label="Surface" value={trace.schema ?? "—"} />
              <Row label="Confidence" value={percent(trace.confidence)} />
              <Row label="Margin" value={percent(trace.margin)} />
              <Row label="Policy" value={humanize(trace.reason ?? "—")} />
            </dl>
          </section>

          {trace.candidates?.length ? (
            <section>
              <InspectorHeading
                title="Candidate ranking"
                help="The probability distribution shows why the selected surface won and how strongly nearby alternatives competed."
              />
              <ul className="inspector-bars">
                {trace.candidates.slice(0, 6).map((candidate) => (
                  <li key={candidate.schema}>
                    <span>{humanize(candidate.schema)}</span>
                    <i
                      style={{
                        width: `${Math.round(candidate.probability * 100)}%`,
                      }}
                    />
                    <small>{percent(candidate.probability)}</small>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {trace.signals && Object.keys(trace.signals).length ? (
            <section>
              <InspectorHeading
                title="Task judgments"
                type="Noul"
                help="Each Noul question independently estimates whether one proposition is true. These signals control clarification, retrieval, extraction, and computation policy."
              />
              <ul className="inspector-bars">
                <SignalBar
                  name="has_enough_evidence"
                  label="Enough evidence"
                  value={trace.hasEnoughEvidence}
                  description="Whether the command reveals a concrete intent or self-contained value."
                />
                <SignalBar
                  name="needs_clarification"
                  label="Needs clarification"
                  value={trace.needsClarification}
                  description="Whether the selected mini-app cannot be useful without a follow-up question."
                />
                {Object.entries(trace.signals).map(([name, value]) => (
                  <SignalBar
                    key={name}
                    name={name}
                    label={SIGNAL_HELP[name]?.label ?? humanize(name)}
                    value={value}
                    description={
                      SIGNAL_HELP[name]?.description ??
                      "An independent task judgment returned by Decision-1."
                    }
                  />
                ))}
              </ul>
            </section>
          ) : null}

          <section>
            <InspectorHeading
              title="Resolution policy"
              help="Decision-1 controls which slower capabilities are allowed. Luna extracts structured fields; retrieval handles current facts; deterministic application code performs exact arithmetic and actions."
            />
            <p className="workflow-note">{workflowNote(trace)}</p>
            <dl>
              <Row label="Selected lanes" value={formatLanes(trace.lanes)} />
              <Row label="Result source" value={humanize(trace.lane ?? "—")} />
              <Row label="Resolver" value={trace.lunaModel || "Application code"} />
              {trace.verificationStatus ? (
                <>
                  <Row
                    label="Verification"
                    value={verificationLabel(trace.verificationStatus)}
                  />
                  <Row
                    label="Fast confidence"
                    value={percent(trace.verificationConfidence)}
                  />
                  <Row
                    label="Confidence judge"
                    value={trace.verificationModel || "Decision-1 pending"}
                  />
                  <Row
                    label="Judgment elapsed"
                    value={
                      trace.verificationLatencyMs === undefined
                        ? "—"
                        : formatElapsed(trace.verificationLatencyMs, false)
                    }
                  />
                </>
              ) : null}
              <Row
                label="Elapsed"
                value={
                  extractionElapsed === undefined
                    ? "—"
                    : formatElapsed(extractionElapsed, trace.lane === "streaming")
                }
              />
            </dl>
            <details className="inspector-state">
              <summary>Structured state</summary>
              <pre className="inspector-json">
                {JSON.stringify(trace.values ?? {}, null, 2)}
              </pre>
            </details>
          </section>
        </div>
      )}
    </aside>
  );
}

function InspectorHeading({
  title,
  type,
  help,
}: {
  title: string;
  type?: "Choice" | "Noul";
  help: string;
}) {
  return (
    <div className="inspector-title">
      <h3>{title}</h3>
      {type ? <span className="decision-type">{type}</span> : null}
      <Tooltip content={help} relationship="description" withArrow>
        <button type="button" aria-label={`About ${title}`}>
          <CircleHelp size={14} aria-hidden="true" />
        </button>
      </Tooltip>
    </div>
  );
}

function SignalBar({
  name,
  label,
  value,
  description,
}: {
  name: string;
  label: string;
  value: number | undefined;
  description: string;
}) {
  if (value === undefined) return null;
  return (
    <li key={name}>
      <Tooltip content={description} relationship="description" withArrow>
        <span className="signal-label" tabIndex={0}>
          {label}
          <CircleHelp size={12} aria-hidden="true" />
        </span>
      </Tooltip>
      <i style={{ width: `${Math.round(value * 100)}%` }} />
      <small>{percent(value)}</small>
    </li>
  );
}

function workflowNote(trace: DecisionTrace) {
  if (trace.schema === "split") {
    if (
      trace.verificationStatus === "assessing" ||
      trace.verificationStatus === "confident"
    ) {
      return "The fast lane extracted the bill and trusted application code produced a provisional result. Decision-1 judges its plausibility while an independent code-execution lane verifies the same calculation.";
    }
    if (trace.verificationStatus === "verified") {
      return "The fast result stayed visible while an independent code-execution lane reproduced it. The result is now verified at 100% confidence.";
    }
    if (trace.verificationStatus === "corrected") {
      return "The fast result stayed visible while code execution checked it. The verifier found a difference, so the same mini-app was corrected in place.";
    }
    if (trace.verificationStatus === "unverified") {
      return "The fast result remains usable with its Decision-1 confidence. The independent code-execution lane did not complete, so the result is not marked as verified.";
    }
    return (trace.needsClarification ?? 0) >= 0.5
      ? "Decision-1 detected a missing detail. Workflow policy kept moving with an editable default of 2 people; Luna reads the bill fields and trusted application code performs the arithmetic."
      : "Calculation detected. Luna extracts the bill fields; trusted application code divides the total and applies the tip.";
  }
  if (trace.lanes?.includes("web")) {
    return "Current knowledge detected. The workflow enabled retrieval before presenting the result.";
  }
  if (trace.lanes?.includes("code")) {
    return "Exact computation detected. The workflow enabled Python verification before presenting the result.";
  }
  return "The fast structured-extraction lane was sufficient; no retrieval or code-interpreter lane was needed.";
}

function verificationLabel(status: string) {
  if (status === "assessing") return "Assessing confidence";
  if (status === "confident") return "Verification running";
  if (status === "verified") return "Verified · 100%";
  if (status === "corrected") return "Corrected and verified · 100%";
  if (status === "unverified") return "Fast result retained";
  return humanize(status);
}

function formatLanes(lanes: string[] | undefined) {
  if (!lanes?.length) return "—";
  return lanes.map(humanize).join(" + ");
}

function humanize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatElapsed(milliseconds: number, live: boolean) {
  if (live || milliseconds >= 1000) {
    return `${(milliseconds / 1000).toFixed(1)}s`;
  }
  return `${Math.round(milliseconds)} ms`;
}

function useElapsed(startedAt: number | null, active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active || startedAt === null) return;
    const timer = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, [active, startedAt]);
  return startedAt === null ? 0 : Math.max(0, now - startedAt);
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function percent(value: number | undefined) {
  return typeof value === "number" ? `${Math.round(value * 100)}%` : "—";
}

function codeSnippets(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter(
        (snippet): snippet is string =>
          typeof snippet === "string" && Boolean(snippet.trim()),
      )
    : [];
}

function latestSurface(messages: readonly unknown[]): ActivityMessage | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index] as ActivityMessage;
    if (
      message?.role === "activity" &&
      message.activityType === SURFACE_ACTIVITY
    ) {
      return message;
    }
  }
  return null;
}

function latestTrace(messages: readonly unknown[]): DecisionTrace | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index] as {
      role?: string;
      toolCalls?: ToolCallLike[];
    };
    if (message?.role !== "assistant" || !message.toolCalls?.length) continue;
    for (let call = message.toolCalls.length - 1; call >= 0; call -= 1) {
      const trace = parseTrace(message.toolCalls[call]);
      if (trace) return trace;
    }
  }
  return null;
}

/** The agent answers in prose when the decision or enrichment step cannot produce a surface. */
function latestNotice(messages: readonly unknown[]): string | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index] as { role?: string; content?: unknown };
    if (
      message?.role === "assistant" &&
      typeof message.content === "string" &&
      message.content
    ) {
      return message.content;
    }
  }
  return null;
}

type ToolCallLike = { function?: { name?: string; arguments?: string } };

function parseTrace(call: ToolCallLike | undefined): DecisionTrace | null {
  if (call?.function?.name !== "render_surface" || !call.function.arguments)
    return null;
  try {
    const args = JSON.parse(call.function.arguments) as {
      decision?: DecisionTrace;
      jev?: DecisionTrace;
    };
    return args.decision ?? args.jev ?? null;
  } catch {
    return null;
  }
}
