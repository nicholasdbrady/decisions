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
import { PanelRight, X } from "lucide-react";

import { jevCatalog } from "@/a2ui/catalog";

const AGENT_ID = "commandCanvas";
const SURFACE_ACTIVITY = "a2ui-surface";
const DEBOUNCE_MS = 400;

const HINTS = [
  "100 c to f",
  "split a $120 dinner between 4 people",
  "remind me to call mom at 6",
  "remember to buy oat milk tomorrow",
  "20% of 85",
  "weather in seattle tomorrow",
];

const DOT_DELAYS = [
  [0, 0.18, 0.36, 0.54],
  [0.12, 0, 0.42, 0.24],
  [0.3, 0.45, 0.06, 0.18],
];

/** What the backend attaches to the `render_surface` tool call for the Inspector. */
type JevTrace = {
  schema?: string;
  confidence?: number;
  margin?: number;
  reason?: string;
  candidates?: { schema: string; probability: number }[];
  signals?: Record<string, number>;
  jevModel?: string;
  jevLatencyMs?: number;
  lanes?: string[];
  lane?: string;
  lunaModel?: string;
  lunaLatencyMs?: number;
  values?: Record<string, unknown>;
  code?: unknown;
  sources?: unknown;
};

type Committed = { id: string; label: string; activity: ActivityMessage };

export function A2uiOmnibar() {
  const { copilotkit } = useCopilotKit();
  const { agent, isReady } = useAgent({
    agentId: AGENT_ID,
    updates: [UseAgentUpdate.OnMessagesChanged, UseAgentUpdate.OnRunStatusChanged],
    throttleMs: 60,
  });

  const [command, setCommand] = useState("");
  const [working, setWorking] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [committed, setCommitted] = useState<Committed[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const renderer = useMemo(
    () => createA2UIMessageRenderer({ theme: a2uiDefaultTheme, catalog: jevCatalog }),
    [],
  );
  const RenderSurface = renderer.render;

  const surface = useMemo(() => latestSurface(agent.messages), [agent.messages]);
  const trace = useMemo(() => latestTrace(agent.messages), [agent.messages]);
  const notice = useMemo(() => latestNotice(agent.messages), [agent.messages]);

  const run = useCallback(
    async (text: string) => {
      if (!isReady) return;
      agent.abortRun();
      agent.setMessages(
        text ? [{ id: crypto.randomUUID(), role: "user", content: text }] : [],
      );
      if (!text) return;
      setWorking(true);
      try {
        await copilotkit.runAgent({
          agent,
          forwardedProps: {
            now: new Date().toISOString(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        });
      } finally {
        setWorking(false);
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
    const timer = window.setTimeout(() => void runRef.current(text), DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [command]);

  function clearAll() {
    setCommand("");
    agent.abortRun();
    agent.setMessages([]);
    inputRef.current?.focus();
  }

  function commit() {
    if (!surface) return;
    setCommitted((rows) => [
      { id: surface.id, label: command.trim() || trace?.schema || "Card", activity: surface },
      ...rows,
    ]);
    clearAll();
  }

  const dotPattern = Math.min(command.length, 2);

  return (
    <main className="omnibar-page" aria-label="JEV A2UI surface">
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
          <div className={`input-line ${working ? "working" : ""}`}>
            <span className={`lead-glyph ${surface ? "on" : ""}`} aria-hidden="true">
              <MatrixDots pattern={dotPattern} working={working} />
            </span>
            <input
              ref={inputRef}
              autoFocus
              aria-label="JEV command"
              aria-describedby="omnibar-hint"
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  clearAll();
                }
                if (event.key === "Enter") {
                  event.preventDefault();
                  commit();
                }
              }}
              spellCheck={false}
              autoComplete="off"
            />
            {command ? null : <HintRotator />}
          </div>

          {surface ? (
            <section className="live-card a2ui-card" aria-live="polite">
              <RenderSurface
                activityType={surface.activityType}
                content={surface.content}
                message={surface}
                agent={agent}
              />
              <footer className="card-footer">
                <span>
                  <kbd>Esc</kbd> to clear
                </span>
                <span />
                <button className="commit-button ready" type="button" onClick={commit}>
                  Keep <kbd>↵</kbd>
                </button>
              </footer>
            </section>
          ) : working ? (
            <WorkingStatus />
          ) : notice ? (
            <p className="omnibar-notice">{notice}</p>
          ) : null}
        </div>

        <div
          className={committed.length ? "committed-list has-items" : "committed-list"}
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
                onClick={() => setCommitted((rows) => rows.filter((item) => item.id !== row.id))}
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
        working={working}
        onClose={() => setInspectorOpen(false)}
      />
    </main>
  );
}

function MatrixDots({ pattern, working }: { pattern: number; working: boolean }) {
  const delays = DOT_DELAYS[pattern % DOT_DELAYS.length];
  return (
    <span className={`matrix-dots ${working ? "working" : ""}`} aria-hidden="true">
      {delays.map((delay, index) => (
        <i key={index} style={{ animationDelay: `${delay.toFixed(3)}s` }} />
      ))}
    </span>
  );
}

// Held back briefly so a fast run does not flash a status line before its card.
const STATUS_DELAY_MS = 400;

function WorkingStatus() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const started = performance.now();
    const timer = window.setInterval(() => setElapsed(performance.now() - started), 100);
    return () => window.clearInterval(timer);
  }, []);
  if (elapsed < STATUS_DELAY_MS) return null;
  return (
    <p className="omnibar-working" role="status">
      <span className="pulse-dot" aria-hidden="true" />
      Working on it
      <span className="omnibar-elapsed">{(elapsed / 1000).toFixed(1)}s</span>
    </p>
  );
}

function HintRotator() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % HINTS.length), 3600);
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
  onClose,
}: {
  open: boolean;
  trace: JevTrace | null;
  working: boolean;
  onClose: () => void;
}) {
  return (
    <aside
      id="jev-inspector"
      className={`inspector-panel ${open ? "open" : ""}`}
      aria-label="Inspector"
    >
      <header className="inspector-head">
        <strong>Inspector</strong>
        <button type="button" aria-label="Close inspector" onClick={onClose}>
          <X size={16} />
        </button>
      </header>

      {!trace ? (
        <p className="inspector-empty">{working ? "Classifying…" : "No classification yet."}</p>
      ) : (
        <div className="inspector-body">
          <section>
            <h3>JEV decision</h3>
            <dl>
              <Row label="Surface" value={trace.schema ?? "—"} />
              <Row label="Confidence" value={percent(trace.confidence)} />
              <Row label="Margin" value={percent(trace.margin)} />
              <Row label="Reason" value={trace.reason ?? "—"} />
              <Row
                label="Model"
                value={`${trace.jevModel ?? "—"} · ${trace.jevLatencyMs ?? "—"} ms`}
              />
            </dl>
          </section>

          {trace.candidates?.length ? (
            <section>
              <h3>Candidates</h3>
              <ul className="inspector-bars">
                {trace.candidates.slice(0, 6).map((candidate) => (
                  <li key={candidate.schema}>
                    <span>{candidate.schema}</span>
                    <i style={{ width: `${Math.round(candidate.probability * 100)}%` }} />
                    <small>{percent(candidate.probability)}</small>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {trace.signals && Object.keys(trace.signals).length ? (
            <section>
              <h3>Signals</h3>
              <ul className="inspector-bars">
                {Object.entries(trace.signals).map(([name, value]) => (
                  <li key={name}>
                    <span>{name}</span>
                    <i style={{ width: `${Math.round(value * 100)}%` }} />
                    <small>{percent(value)}</small>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section>
            <h3>Extraction</h3>
            <dl>
              <Row label="Lanes" value={trace.lanes?.join(", ") || "—"} />
              <Row label="Winner" value={trace.lane ?? "—"} />
              <Row
                label="Model"
                value={`${trace.lunaModel ?? "—"} · ${trace.lunaLatencyMs ?? "—"} ms`}
              />
            </dl>
            <pre className="inspector-json">{JSON.stringify(trace.values ?? {}, null, 2)}</pre>
          </section>
        </div>
      )}
    </aside>
  );
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

function latestSurface(messages: readonly unknown[]): ActivityMessage | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index] as ActivityMessage;
    if (message?.role === "activity" && message.activityType === SURFACE_ACTIVITY) {
      return message;
    }
  }
  return null;
}

function latestTrace(messages: readonly unknown[]): JevTrace | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index] as { role?: string; toolCalls?: ToolCallLike[] };
    if (message?.role !== "assistant" || !message.toolCalls?.length) continue;
    for (let call = message.toolCalls.length - 1; call >= 0; call -= 1) {
      const trace = parseTrace(message.toolCalls[call]);
      if (trace) return trace;
    }
  }
  return null;
}

/** The agent answers in prose when JEV or Luna cannot produce a surface. */
function latestNotice(messages: readonly unknown[]): string | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index] as { role?: string; content?: unknown };
    if (message?.role === "assistant" && typeof message.content === "string" && message.content) {
      return message.content;
    }
  }
  return null;
}

type ToolCallLike = { function?: { name?: string; arguments?: string } };

function parseTrace(call: ToolCallLike | undefined): JevTrace | null {
  if (call?.function?.name !== "render_surface" || !call.function.arguments) return null;
  try {
    const args = JSON.parse(call.function.arguments) as { jev?: JevTrace };
    return args.jev ?? null;
  } catch {
    return null;
  }
}
