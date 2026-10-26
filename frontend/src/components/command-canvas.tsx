"use client";

import {
  AlarmClock,
  ArrowLeftRight,
  Bell,
  Bookmark,
  Calculator,
  CalendarDays,
  Check,
  CheckSquare,
  CircleDollarSign,
  Clock3,
  CloudDrizzle,
  CloudFog,
  CloudRain,
  CloudSnow,
  CloudSun,
  Cloudy,
  ChevronRight,
  Contact,
  Copy,
  Dice5,
  Flag,
  Hash,
  HeartPulse,
  KeyRound,
  Link,
  Lock,
  MapPin,
  Minus,
  NotebookPen,
  Palette,
  PanelRight,
  Plane,
  Play,
  Plus,
  Pause,
  RefreshCw,
  Repeat,
  RotateCcw,
  ScanEye,
  ShoppingCart,
  Split,
  Users,
  Video,
  Vote,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useJevClassification } from "@/hooks/use-jev-classification";
import { useJevDecision, type JevDecision } from "@/hooks/use-jev-decision";
import type { DishMode, ExpansionProvider, ExpansionResponse, ExtractResponse, JudgeResponse, SchemaId } from "@/lib/contracts";
import { expansionResponseSchema, extractRequestSchema, extractResponseSchema, judgeResponseSchema } from "@/lib/contracts";
import { addHistoryItem, loadHistory, removeHistoryItem, saveHistory, type HistoryItem } from "@/lib/history";
import { CARD_TYPES, HINTS, createDraftCard, randomKind, type CardDraft, type DraftChip, type RandomKind } from "@/lib/draft-view";
import { RandomWidget } from "@/components/random-widget";
import { PasswordWidget } from "@/components/password-widget";
import { PollWidget } from "@/components/poll-widget";
import { formatHsl, formatRgb, gradientCss, harmony, hexToHsl, nearestName, readableInk, shadeScale, type ColorFormat } from "@/lib/color";

const iconMap: Record<SchemaId, LucideIcon> = {
  event: CalendarDays,
  reminder: Bell,
  shopping: ShoppingCart,
  checklist: CheckSquare,
  timer: ScanEye,
  countdown: AlarmClock,
  habit: HeartPulse,
  note: NotebookPen,
  calc: Calculator,
  split: Split,
  expense: CircleDollarSign,
  convert: RefreshCw,
  random: Dice5,
  color: Palette,
  contact: Contact,
  goal: Flag,
  bookmark: Bookmark,
  poll: Vote,
  trip: Plane,
  weather: CloudSun,
  password: KeyRound,
};

const chipIconMap: Record<string, LucideIcon> = {
  calendar: CalendarDays,
  clock: Clock3,
  pin: MapPin,
  video: Video,
  users: Users,
  tag: Hash,
  hash: Hash,
  dollar: CircleDollarSign,
  link: Link,
  repeat: Repeat,
};

type ExpansionState = {
  loading: boolean;
  error: string | null;
  response: ExpansionResponse | null;
  pending: Partial<Record<ExpansionProvider, boolean>>;
  errors: Partial<Record<ExpansionProvider, string>>;
};

type ActiveTimerRow = {
  endsAt: number;
  remainingSeconds: number;
};

type ExtractionState = {
  status: "idle" | "pending" | "ready" | "error";
  generation: number;
  response: ExtractResponse | null;
  error: string | null;
};

type ShoppingGroup = {
  name: string | null;
  mode: DishMode | null;
  items: string[];
};

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:8000";
const emptyExpansion: ExpansionState = { loading: false, error: null, response: null, pending: {}, errors: {} };

type UnitOption = { id: string; label: string; symbol: string };
type UnitCategory = { id: string; label: string; kind: "unit" | "currency"; units: UnitOption[] };

let unitCatalogRequest: Promise<UnitCategory[]> | null = null;

/** The taxonomy is authored on the server, so the UI fetches it once and keeps it. */
function loadUnitCatalog(): Promise<UnitCategory[]> {
  unitCatalogRequest ??= fetch(`${backendUrl}/api/units`)
    .then((response) => (response.ok ? response.json() : { categories: [] }))
    .then((payload: { categories?: UnitCategory[] }) => payload.categories ?? [])
    .catch(() => []);
  return unitCatalogRequest;
}

type Lane = "fast" | "web" | "code";
type LaneState = { status: "pending" | "ready" | "error"; response: ExtractResponse | null; error: string | null };
type FanoutEntry = {
  fast?: LaneState;
  web?: LaneState;
  code?: LaneState;
  judge?: { status: "pending" | "ready" | "error"; response: JudgeResponse | null };
};
type PickedLane = { lane: Lane; response: ExtractResponse; verdict: "solo" | "agree" | "judging" | "judged" | "verified" | "python"; confidence: number | null; other: LaneState | undefined };
type SetFanout = React.Dispatch<React.SetStateAction<Record<string, FanoutEntry>>>;

const LOOKUP_GATE = 0.35;
const COMPUTE_GATE = 0.5;
// Cards whose answer is a number or date: Luna must run Python to check it.
const PYTHON_CARDS = new Set<SchemaId>(["calc", "convert", "split", "countdown", "expense", "goal", "timer"]);

// A weather question can want a reading, an afternoon, a span of days, or an answer.
const WEATHER_SHAPES = [
  { id: "now", summary: "Wants conditions right now: current temperature and sky." },
  { id: "hourly", summary: "Wants how one day unfolds hour by hour: later today, this afternoon, tonight." },
  { id: "daily", summary: "Wants a span of whole days: a weekend, a work week, the next few days, a trip." },
  { id: "advice", summary: "Asks what to wear or carry, or whether to expect rain, cold, or wind. Wants a verdict first." },
];

const WEATHER_AXES: Record<string, string> = {
  wants_rain_layer: "The question is about staying dry: rain, snow, an umbrella, or a raincoat.",
  wants_warm_layer: "The question is about staying warm: cold, a jacket, a coat, or layers.",
  wants_wind_layer: "The question is about wind: gusts, breeze, or being blown around.",
};

// Every way a person can ask chance to decide something.
const RANDOM_GAMES = [
  { id: "dice", summary: "Roll dice of any size, including notation such as 2d6, or a named dice game such as Yahtzee." },
  { id: "number", summary: "Pick one or more numbers out of a range, such as 1 out of 100." },
  { id: "coin", summary: "Flip a coin for a two-way yes or no." },
  { id: "wheel", summary: "Spin a wheel to land on one of the named things." },
  { id: "bottle", summary: "Spin a bottle to point at someone." },
  { id: "pick", summary: "Choose one at random from named things, with no spinner." },
  { id: "shuffle", summary: "Put named things into a random order all at once." },
  { id: "order", summary: "Assign a turn order that is revealed one card at a time." },
  { id: "teams", summary: "Divide named people into two or more teams." },
  { id: "sticks", summary: "Draw straws or sticks, where one of them is short." },
  { id: "cards", summary: "Draw playing cards from a deck, with no game attached." },
  { id: "blackjack", summary: "Play a blackjack hand against a dealer, with hit and stand." },
];

function patchEntry(setFanout: SetFanout, key: string, patch: Partial<FanoutEntry>) {
  setFanout((previous) => ({ ...previous, [key]: { ...previous[key], ...patch } }));
}

function runLane(key: string, text: string, card: SchemaId, lane: Lane, setFanout: SetFanout) {
  patchEntry(setFanout, key, { [lane]: { status: "pending", response: null, error: null } });
  const payload = extractRequestSchema.parse({
    text,
    card,
    now: localIsoWithOffset(new Date()),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    lane,
  });
  void fetch(`${backendUrl}/api/extract`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
    .then(async (response) => {
      if (!response.ok) throw new Error(`Extraction failed (${response.status})`);
      return extractResponseSchema.parse(await response.json());
    })
    .then((response) => patchEntry(setFanout, key, { [lane]: { status: response.ok ? "ready" : "error", response, error: response.error } }))
    .catch((error: unknown) => patchEntry(setFanout, key, { [lane]: { status: "error", response: null, error: error instanceof Error ? error.message : "Extraction failed" } }));
}

function runJudge(key: string, text: string, card: SchemaId, fast: Record<string, unknown>, web: Record<string, unknown>, setFanout: SetFanout) {
  patchEntry(setFanout, key, { judge: { status: "pending", response: null } });
  const body = { text, card, candidates: [{ id: "fast", summary: summarizeValues(card, fast) }, { id: "web", summary: summarizeValues(card, web) }] };
  void fetch(`${backendUrl}/api/judge`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    .then(async (response) => {
      if (!response.ok) throw new Error(`Judge failed (${response.status})`);
      return judgeResponseSchema.parse(await response.json());
    })
    .then((response) => patchEntry(setFanout, key, { judge: { status: "ready", response } }))
    .catch(() => patchEntry(setFanout, key, { judge: { status: "error", response: null } }));
}

// JEV reads words better than codes, so hex values are judged by their nearest color name.
function summarizeValues(card: SchemaId, values: Record<string, unknown>): string {
  const parts = Object.entries(values).flatMap(([name, value]) => {
    if (value === null || value === undefined || value === "" || (Array.isArray(value) && !value.length)) return [];
    if (name === "hex" && typeof value === "string") return /^#?[0-9a-f]{6}$/i.test(value) ? [`looks ${nearestName(value.startsWith("#") ? value : `#${value}`).name}`] : [];
    if (Array.isArray(value)) return [`${name}: ${value.join(", ")}`];
    return [`${name}: ${String(value)}`];
  });
  return `${card} card · ${parts.join(" · ")}`.slice(0, 400);
}

function sameValues(a: Record<string, unknown>, b: Record<string, unknown>) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function answerOf(response: ExtractResponse | null | undefined): number | null {
  const values = response?.values ?? {};
  for (const key of ["result", "answer_value"]) {
    const value = values[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}

function pickLane(entry: FanoutEntry | undefined): PickedLane | null {
  const python = entry?.code?.response?.ok ? entry.code.response : null;
  const base = pickWordLane(entry);
  if (!python) return base;
  const mine = answerOf(python);
  const theirs = answerOf(base?.response);
  if (base && mine !== null && theirs !== null && Math.abs(mine - theirs) <= Math.max(1e-6, Math.abs(mine) * 0.005)) {
    return { ...base, verdict: "verified", confidence: null, other: entry?.code };
  }
  return { lane: "code", response: python, verdict: "python", confidence: null, other: base ? entry?.[base.lane] : undefined };
}

function pickWordLane(entry: FanoutEntry | undefined): PickedLane | null {
  const fast = entry?.fast?.response?.ok ? entry.fast.response : null;
  const web = entry?.web?.response?.ok ? entry.web.response : null;
  if (fast && web) {
    if (sameValues(fast.values, web.values)) return { lane: "fast", response: fast, verdict: "agree", confidence: null, other: entry?.web };
    const judged = entry?.judge?.response;
    if (!judged) return { lane: "fast", response: fast, verdict: "judging", confidence: null, other: entry?.web };
    const pFast = judged.probabilities.fast ?? 0;
    const pWeb = judged.probabilities.web ?? 0;
    return pWeb > pFast
      ? { lane: "web", response: web, verdict: "judged", confidence: pWeb, other: entry?.fast }
      : { lane: "fast", response: fast, verdict: "judged", confidence: pFast, other: entry?.web };
  }
  if (fast) return { lane: "fast", response: fast, verdict: "solo", confidence: null, other: entry?.web };
  if (web) return { lane: "web", response: web, verdict: "solo", confidence: null, other: entry?.fast };
  return null;
}

export function CommandCanvas() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [command, setCommand] = useState("");
  const [lockedSchema, setLockedSchema] = useState<SchemaId | null>(null);
  const [overrides, setOverrides] = useState<Record<string, string | null>>({});
  const [editingChip, setEditingChip] = useState<string | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>(() => {
    if (typeof window === "undefined") return [];
    const loaded = loadHistory();
    return loaded.ok ? loaded.items : [];
  });
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [menuIndex, setMenuIndex] = useState(0);
  const [expansion, setExpansion] = useState<ExpansionState>(emptyExpansion);
  const [fanout, setFanout] = useState<Record<string, FanoutEntry>>({});
  const [displayedSchema, setDisplayedSchema] = useState<SchemaId | null>(null);
  const [dishModes, setDishModes] = useState<Record<string, DishMode>>({});
  const [pendingDishNames, setPendingDishNames] = useState<Set<string>>(() => new Set());
  const [providerChoice, setProviderChoice] = useState<ExpansionProvider>("foundry");
  const [providerPinned, setProviderPinned] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerDone, setTimerDone] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [timerEndsAt, setTimerEndsAt] = useState<number | null>(null);
  const [activeTimerRows, setActiveTimerRows] = useState<Record<string, ActiveTimerRow>>({});
  const expansionCache = useRef(new Map<string, ExpansionResponse>());
  const requestedLanes = useRef(new Set<string>());
  const expansionTextRef = useRef("");

  const menuOpen = command === "/" || command.startsWith("/");
  const menuFilter = menuOpen ? command.slice(1).trim().toLowerCase() : "";
  const menuCards = CARD_TYPES.filter((card) => `${card.label} ${card.example}`.toLowerCase().includes(menuFilter));

  const classification = useJevClassification({ text: command.startsWith("/") ? "" : command, currentSchema: displayedSchema, lockedSchema });
  // Let JEV decide: its top pick always becomes a card; hysteresis in the decision keeps it steady.
  const jevPick = classification.result && command.trim()
    ? (classification.result.decision.accepted && classification.result.decision.selected_schema) || classification.result.candidates[0]?.schema || null
    : null;
  const remoteAccepted = Boolean(jevPick);
  const selectedSchema = lockedSchema ?? jevPick ?? displayedSchema;
  const runnerUp = !lockedSchema ? classification.result?.candidates.find((candidate) => candidate.schema !== selectedSchema && candidate.probability >= 0.12) ?? null : null;
  const fanText = command.startsWith("/") ? "" : command.trim();
  const fanCard = lockedSchema ?? displayedSchema;
  const fanKey = fanText && fanCard ? `${fanText}|${fanCard}` : null;
  const fanEntry = fanKey ? fanout[fanKey] : undefined;
  const picked = pickLane(fanEntry);
  const extraction: ExtractionState = {
    status: picked ? "ready" : fanEntry?.fast?.status === "pending" || fanEntry?.web?.status === "pending" || fanEntry?.code?.status === "pending" ? "pending" : fanEntry?.fast?.status === "error" ? "error" : "idle",
    generation: 0,
    response: picked?.response ?? null,
    error: fanEntry?.fast?.error ?? null,
  };
  const draft = useMemo(
    () => (selectedSchema ? createDraftCard(selectedSchema, command, overrides, extraction.response?.card === selectedSchema && extraction.response.ok ? extraction.response.values : {}) : null),
    [command, extraction.response, overrides, selectedSchema],
  );
  // A bare "/" is menu input, not card content, and a kept schema alone is not a card.
  const hasSubject = fanText.length > 0;
  const showCard = Boolean(draft && hasSubject && !menuOpen && (lockedSchema || remoteAccepted));
  const isResolvingFields = extraction.status === "pending";
  const isWorking = isResolvingFields || classification.status === "classifying" || classification.status === "debouncing";
  const [dotPattern, setDotPattern] = useState(0);
  useEffect(() => {
    if (classification.status === "classifying") setDotPattern(Math.floor(Math.random() * 4));
  }, [classification.generation, classification.status]);

  // JEV, not a phrase table, decides how a weather answer should be shaped.
  const weatherPlan = useJevDecision({
    text: fanText,
    topic: "weather answer shape",
    options: WEATHER_SHAPES,
    axes: WEATHER_AXES,
    active: selectedSchema === "weather",
  });

  // Same for chance: JEV names the game, Luna fills in its numbers.
  const randomPlan = useJevDecision({
    text: fanText,
    topic: "randomizer",
    options: RANDOM_GAMES,
    axes: {},
    active: selectedSchema === "random",
  });
  const randomKindChoice = randomKind(randomPlan?.choice ?? (draft?.data.kind as string | undefined) ?? null, fanText, (draft?.data.options as string[] | undefined) ?? []);
  const stateSignals = classification.result?.diagnostics.signals ?? {};
  const needsExpansion = draft?.schema === "shopping" && (stateSignals.needs_expansion ?? 0) >= 0.5;

  useEffect(() => {
    if (!command.trim()) {
      setDisplayedSchema(null);
      return;
    }
    if (lockedSchema) {
      setDisplayedSchema(lockedSchema);
      return;
    }
    if (jevPick) setDisplayedSchema(jevPick);
  }, [command, jevPick, lockedSchema]);

  // A kept card is a preference, not a cage: a near-certain JEV pick releases it.
  useEffect(() => {
    if (!lockedSchema || !classification.result) return;
    const top = classification.result.candidates[0];
    if (top && top.schema !== lockedSchema && top.probability >= 0.85) setLockedSchema(null);
  }, [classification.result, lockedSchema]);

  // Speculative fan-out: Luna answers fast; Luna + web runs in parallel when JEV says the text names
  // something worth looking up. Results land under their own text|card key, so stale answers never
  // overwrite newer input. When both disagree, JEV judges which reading fits the text best.
  const needsLookup = stateSignals.needs_lookup ?? 0;
  const needsComputation = stateSignals.needs_computation ?? 0;
  const wantsPython = Boolean(fanCard && (PYTHON_CARDS.has(fanCard) || needsComputation >= COMPUTE_GATE));
  useEffect(() => {
    if (!fanKey || !fanCard) return;
    const tag = `${fanKey}#fast`;
    if (requestedLanes.current.has(tag)) return;
    const timeout = window.setTimeout(() => {
      requestedLanes.current.add(tag);
      runLane(fanKey, fanText, fanCard, "fast", setFanout);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [fanCard, fanKey, fanText]);

  useEffect(() => {
    if (!fanKey || !fanCard || (needsLookup < LOOKUP_GATE && !webSearchEnabled)) return;
    const tag = `${fanKey}#web`;
    if (requestedLanes.current.has(tag)) return;
    const timeout = window.setTimeout(() => {
      requestedLanes.current.add(tag);
      runLane(fanKey, fanText, fanCard, "web", setFanout);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [fanCard, fanKey, fanText, needsLookup, webSearchEnabled]);

  useEffect(() => {
    if (!fanKey || !fanCard || !wantsPython) return;
    const tag = `${fanKey}#code`;
    if (requestedLanes.current.has(tag)) return;
    const timeout = window.setTimeout(() => {
      requestedLanes.current.add(tag);
      runLane(fanKey, fanText, fanCard, "code", setFanout);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [fanCard, fanKey, fanText, wantsPython]);

  const fastValues = fanEntry?.fast?.response?.ok ? fanEntry.fast.response.values : null;
  const webValues = fanEntry?.web?.response?.ok ? fanEntry.web.response.values : null;
  useEffect(() => {
    if (!fanKey || !fanCard || !fastValues || !webValues || sameValues(fastValues, webValues)) return;
    const tag = `${fanKey}#judge`;
    if (requestedLanes.current.has(tag)) return;
    const timeout = window.setTimeout(() => {
      requestedLanes.current.add(tag);
      runJudge(fanKey, fanText, fanCard, fastValues, webValues, setFanout);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [fanCard, fanKey, fanText, fastValues, webValues]);
  const activeExpansion = useMemo(() => {
    const results = expansion.response?.results ?? [];
    const picked = results.find((result) => result.provider === providerChoice && result.ok);
    if (providerPinned) return picked ?? null;
    return (
      results.find((result) => result.provider === "foundry" && result.ok) ??
      results.find((result) => result.provider === "decision" && result.ok) ??
      results.find((result) => result.provider === "foundry-web" && result.ok) ??
      picked ??
      null
    );
  }, [expansion.response, providerChoice, providerPinned]);

  const shoppingGroups = useMemo<ShoppingGroup[]>(() => {
    if (draft?.schema !== "shopping") return [];
    if (activeExpansion?.dishes.length) return activeExpansion.dishes.map((dish) => ({ name: dish.name, mode: dish.mode, items: dish.items }));
    if (needsExpansion) return [];
    const items = (draft.data.items as string[] | undefined) ?? [];
    return items.length ? [{ name: null, mode: null, items }] : [];
  }, [activeExpansion, draft, needsExpansion]);
  const liveTitle = draft?.schema === "shopping" && (expansion.response?.title || activeExpansion?.title || activeExpansion?.dishes.length)
    ? expansion.response?.title ?? activeExpansion?.title ?? dishTitle(expansion.response?.dishes_parsed.length ? expansion.response.dishes_parsed : activeExpansion?.dishes.map((dish) => dish.name) ?? [])
    : draft?.title;

  useEffect(() => {
    const id = window.setTimeout(() => {
      setOverrides({});
      setCheckedItems({});
      setTimerRunning(false);
      setTimerDone(false);
      setRemainingSeconds(null);
      setTimerEndsAt(null);
    }, 0);
    return () => window.clearTimeout(id);
  }, [selectedSchema]);

  useEffect(() => {
    if (!draft || draft.schema !== "shopping" || !needsExpansion) {
      const id = window.setTimeout(() => setExpansion(emptyExpansion), 0);
      return () => window.clearTimeout(id);
    }
    const providers: ExpansionProvider[] = webSearchEnabled ? ["decision", "foundry", "foundry-web"] : ["decision", "foundry"];
    const controller = new AbortController();
    const expansionText = command.trim();
    const preservePreviousResponse = expansionTextRef.current === expansionText;
    expansionTextRef.current = expansionText;
    const loadingId = window.setTimeout(() => {
      setExpansion((previous) => ({
        loading: true,
        error: null,
        response: preservePreviousResponse ? previous.response : null,
        pending: Object.fromEntries(providers.map((provider) => [provider, true])) as Partial<Record<ExpansionProvider, boolean>>,
        errors: {},
      }));
    }, 0);
    const timeout = window.setTimeout(() => {
      for (const provider of providers) {
        const cacheKey = JSON.stringify({ text: command.trim(), dishModes, provider });
        const cached = expansionCache.current.get(cacheKey);
        if (cached) {
          setExpansion((previous) => mergeExpansionPayload(previous, cached, provider));
          continue;
        }
        void fetch(`${backendUrl}/api/expand`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: command, card: "shopping", providers: [provider], dish_modes: dishModes }),
          signal: controller.signal,
        })
          .then(async (response) => {
            if (!response.ok) throw new Error(`Expansion failed (${response.status})`);
            return expansionResponseSchema.parse(await response.json());
          })
          .then((payload) => {
            expansionCache.current.set(cacheKey, payload);
            setExpansion((previous) => mergeExpansionPayload(previous, payload, provider));
          })
          .catch((error: unknown) => {
            if (controller.signal.aborted) return;
            const message = error instanceof Error ? error.message : "Expansion failed";
            setExpansion((previous) => markExpansionError(previous, provider, message));
          });
      }
    }, 600);
    return () => {
      window.clearTimeout(timeout);
      window.clearTimeout(loadingId);
      controller.abort();
    };
  }, [command, dishModes, draft, needsExpansion, webSearchEnabled]);

  useEffect(() => {
    if (!expansion.loading) setPendingDishNames(new Set());
  }, [expansion.loading]);

  useEffect(() => {
    if (!timerRunning || !timerEndsAt || draft?.schema !== "timer") return;
    const id = window.setInterval(() => {
      const next = Math.max(0, Math.ceil((timerEndsAt - Date.now()) / 1000));
      setRemainingSeconds(next);
      if (next === 0) {
        setTimerRunning(false);
        setTimerDone(true);
        setTimerEndsAt(null);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [draft, timerEndsAt, timerRunning]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now();
      setActiveTimerRows((rows) => {
        let changed = false;
        const next: Record<string, ActiveTimerRow> = {};
        for (const [id, timer] of Object.entries(rows)) {
          const remainingSeconds = Math.max(0, Math.ceil((timer.endsAt - now) / 1000));
          if (remainingSeconds !== timer.remainingSeconds) changed = true;
          if (remainingSeconds > 0) next[id] = { ...timer, remainingSeconds };
          else changed = true;
        }
        return changed ? next : rows;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  function updateCommand(value: string) {
    setCommand(value);
    setProviderPinned(false);
    if (!value.trim()) setLockedSchema(null);
    setPendingDishNames(new Set());
  }

  function clearAll() {
    setCommand("");
    setLockedSchema(null);
    setOverrides({});
    setEditingChip(null);
    setExpansion(emptyExpansion);
    setDisplayedSchema(null);
    setProviderPinned(false);
    setTimerRunning(false);
    setTimerDone(false);
    setTimerEndsAt(null);
    setRemainingSeconds(null);
  }

  function chooseSchema(schema: SchemaId) {
    setLockedSchema(schema);
    setCommand(command.startsWith("/") ? "" : command);
    setMenuIndex(0);
  }

  function commitDraft() {
    if (!draft || !showCard) return;
    const loaded = loadHistory();
    const existing = loaded.ok ? loaded.items : historyItems;
    const commitDraft = draft.schema === "shopping" && activeExpansion?.dishes.length
      ? {
          ...draft,
          title: liveTitle ?? draft.title,
          summary: `${activeExpansion.dishes.length} group${activeExpansion.dishes.length === 1 ? "" : "s"} · ${activeExpansion.dishes.reduce((sum, dish) => sum + dish.items.length, 0)} item${activeExpansion.dishes.reduce((sum, dish) => sum + dish.items.length, 0) === 1 ? "" : "s"}`,
        }
      : draft;
    const next = addHistoryItem(command || draft.title, commitDraft, existing);
    saveHistory(next);
    setHistoryItems(next);
    if (draft.schema === "timer" && timerRunning && timerEndsAt) {
      setActiveTimerRows((rows) => ({
        ...rows,
        [next[0].id]: {
          endsAt: timerEndsAt,
          remainingSeconds: remainingSeconds ?? Number(draft.data.seconds ?? 0),
        },
      }));
    }
    clearAll();
  }

  function deleteHistory(id: string) {
    const next = removeHistoryItem(id, historyItems);
    saveHistory(next);
    setHistoryItems(next);
    setActiveTimerRows((rows) => {
      const rest = { ...rows };
      delete rest[id];
      return rest;
    });
  }

  function startOrPauseTimer() {
    if (!draft || draft.schema !== "timer") return;
    const total = Number(draft.data.seconds ?? 0);
    if (!total) return;
    if (timerRunning) {
      setTimerRunning(false);
      setTimerEndsAt(null);
      return;
    }
    const seconds = remainingSeconds && remainingSeconds > 0 ? remainingSeconds : total;
    setTimerDone(false);
    setRemainingSeconds(seconds);
    setTimerEndsAt(Date.now() + seconds * 1000);
    setTimerRunning(true);
    inputRef.current?.focus();
  }

  function resetTimer() {
    if (!draft || draft.schema !== "timer") return;
    setTimerRunning(false);
    setTimerDone(false);
    setTimerEndsAt(null);
    setRemainingSeconds(Number(draft.data.seconds ?? 0));
    inputRef.current?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (menuOpen) {
      if (event.key === "ArrowDown") { event.preventDefault(); setMenuIndex((index) => Math.min(index + 1, menuCards.length - 1)); }
      if (event.key === "ArrowUp") { event.preventDefault(); setMenuIndex((index) => Math.max(index - 1, 0)); }
      if (event.key === "Enter" && menuCards[menuIndex]) { event.preventDefault(); chooseSchema(menuCards[menuIndex].id); }
      if (event.key === "Escape") { event.preventDefault(); clearAll(); }
      return;
    }
    if (event.key === "Tab" && draft && showCard) {
      event.preventDefault();
      setLockedSchema(draft.schema);
    }
    if (event.key === "Escape") {
      event.preventDefault();
      clearAll();
    }
    if (event.key === "Enter") {
      event.preventDefault();
      commitDraft();
    }
  }

  const Icon = draft ? iconMap[draft.schema] : CheckSquare;

  return (
    <main className="omnibar-page" aria-label="JEV omnibar card surface">
      <button className="inspector-button" type="button" aria-expanded={inspectorOpen} aria-controls="jev-inspector" onClick={() => setInspectorOpen((open) => !open)}>
        <PanelRight size={16} aria-hidden="true" /> Inspector
      </button>

      <section className="omnibar-stage">
        <div className={`omnibar-shell ${showCard ? "has-card" : ""}`}>
          <div className="input-line">
            <span className={`lead-glyph ${showCard && draft ? `on family-${familyFor(draft.schema)}` : ""}`} aria-hidden="true">
              <MatrixDots pattern={dotPattern} working={isWorking} />
            </span>
            <input
              ref={inputRef}
              autoFocus
              aria-label="JEV command"
              aria-describedby="omnibar-hint"
              value={command}
              onChange={(event) => updateCommand(event.target.value)}
              onKeyDown={onKeyDown}
              spellCheck={false}
              autoComplete="off"
            />
            {command ? null : lockedSchema ? (
              <span className="hint-rotator kept" id="omnibar-hint" aria-hidden="true">
                <span className="hint-phrase">{CARD_TYPES.find((card) => card.id === lockedSchema)?.example ?? ""}</span>
              </span>
            ) : <HintRotator />}
            {lockedSchema ? <span className="lock-pill"><Lock size={13} aria-hidden="true" /> {labelFor(lockedSchema)}</span> : null}
          </div>

          {showCard && draft ? (
            <section className="live-card" aria-live="polite" aria-label={`${labelFor(draft.schema)} card`}>
              {draft.schema === "timer" ? <h1>{liveTitle}</h1> : null}
              <div className="card-head">
                <span className={`type-tile family-${familyFor(draft.schema)}`}><Icon size={18} aria-hidden="true" /></span>
                <div><span className="type-label">{draft.schema === "timer" ? String(draft.data.label ?? "Timer") : labelFor(draft.schema)}</span></div>
                <div className="head-trail">
                  {runnerUp ? <button className="runner-up" type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => chooseSchema(runnerUp.schema)} title={`JEV gives ${labelFor(runnerUp.schema)} ${Math.round(runnerUp.probability * 100)}%`}>or {labelFor(runnerUp.schema)}? <small>{Math.round(runnerUp.probability * 100)}%</small></button> : null}
                  <Provenance picked={picked} entry={fanEntry} />
                </div>
              </div>
              {draft.schema === "timer" || draft.schema === "convert" ? null : <h1>{liveTitle}</h1>}
              {draft.schema === "timer" || draft.schema === "convert" || !draft.chips.length ? null : (
                <div className="chip-row">
                  {draft.chips.map((chip) => <EditableChip key={chip.id} chip={chip} resolving={isResolvingFields} editing={editingChip === chip.id} onEdit={() => setEditingChip(chip.id)} onCancel={() => setEditingChip(null)} onSave={(value) => { setOverrides((next) => ({ ...next, [chip.id]: value || null })); setEditingChip(null); }} />)}
                </div>
              )}
              <CardWidget
                draft={draft}
                resolving={isResolvingFields}
                shoppingGroups={shoppingGroups}
                checkedItems={checkedItems}
                setCheckedItems={setCheckedItems}
                expansion={expansion}
                dishModes={dishModes}
                pendingDishNames={pendingDishNames}
                setDishMode={(dish, mode) => {
                  setPendingDishNames((previous) => new Set([...previous, dish]));
                  setDishModes((next) => ({ ...next, [dish]: mode }));
                }}
                timerRunning={timerRunning}
                startOrPauseTimer={startOrPauseTimer}
                resetTimer={resetTimer}
                timerDone={timerDone}
                remainingSeconds={remainingSeconds}
                weatherPlan={weatherPlan}
                randomKind={randomKindChoice}
              />
              <CodeDisclosure snippets={fanEntry?.code?.response?.code ?? []} values={fanEntry?.code?.response?.values ?? {}} />
              <footer className="card-footer">
                <span><kbd>Esc</kbd> to clear</span>                {draft.schema === "timer" ? <span /> : <span className="tab-hint"><kbd>Tab</kbd> to keep as {labelFor(draft.schema).toLowerCase()}</span>}
                <button className={`commit-button ${(stateSignals.is_complete ?? 0) >= 0.7 ? "ready" : ""}`} type="button" onClick={commitDraft}>{draft.actionLabel} <kbd>↵</kbd></button>
              </footer>
            </section>
          ) : null}
        </div>

        {menuOpen ? <CommandMenu cards={menuCards} activeIndex={menuIndex} onPick={chooseSchema} /> : null}

        <div className={historyItems.length ? "committed-list has-items" : "committed-list"} aria-label="Committed cards">
          {historyItems.map((item) => {
            const RowIcon = iconMap[item.schema];
            const activeTimer = activeTimerRows[item.id];
            return (
              <article className="committed-row" key={item.id}>
                <span className={`type-tile small family-${familyFor(item.schema)}`}><RowIcon size={16} aria-hidden="true" /></span>
                <strong>{item.summary || item.title}</strong>
                <span className="row-meta">{activeTimer ? <><i>{formatClock(activeTimer.remainingSeconds)}</i><small>{labelFor(item.schema)}</small></> : labelFor(item.schema)}</span>
                <button type="button" aria-label={`Delete ${item.title}`} onClick={() => deleteHistory(item.id)}><X size={15} /></button>
              </article>
            );
          })}
        </div>
      </section>

      <Inspector
        open={inspectorOpen}
        classification={classification}
        draft={draft}
        extraction={extraction}
        fanEntry={fanEntry}
        expansion={expansion}
        providerChoice={providerChoice}
        setProviderChoice={(provider) => {
          setProviderChoice(provider);
          setProviderPinned(true);
        }}
        webSearchEnabled={webSearchEnabled}
        setWebSearchEnabled={setWebSearchEnabled}
        onClose={() => setInspectorOpen(false)}
      />
    </main>
  );
}

function EditableChip({ chip, resolving, editing, onEdit, onSave, onCancel }: { chip: DraftChip; resolving: boolean; editing: boolean; onEdit: () => void; onSave: (value: string) => void; onCancel: () => void }) {
  const Icon = chip.icon ? chipIconMap[chip.icon] : null;
  if (editing) {
    return <ChipEditor key={`${chip.id}-${chip.value ?? ""}`} chip={chip} onSave={onSave} onCancel={onCancel} />;
  }
  if (chip.value) {
    return <button className="chip filled" type="button" onClick={onEdit}>{chip.kind === "people" ? <span className="mini-avatar">{chip.value.charAt(0).toUpperCase()}</span> : Icon ? <Icon size={14} aria-hidden="true" /> : null}{chip.value}</button>;
  }
  // One plus, always: the dashed chip is an add affordance, not a field preview.
  return <button className={resolving ? "chip empty resolving" : "chip empty"} type="button" onClick={onEdit}><Plus size={14} aria-hidden="true" />Add {chip.label}</button>;
}

const DOT_ORDER = [0, 1, 2, 3, 7, 11, 15, 14, 13, 12, 8, 4, 5, 6, 10, 9];
// Four ways sixteen dots can travel: rows, diagonal, ripple, spiral. One is picked per query.
const DOT_DELAYS: number[][] = [
  Array.from({ length: 16 }, (_, i) => (i >> 2) * 0.12 + (i & 3) * 0.03),
  Array.from({ length: 16 }, (_, i) => ((i >> 2) + (i & 3)) * 0.07),
  Array.from({ length: 16 }, (_, i) => Math.hypot((i >> 2) - 1.5, (i & 3) - 1.5) * 0.1),
  Array.from({ length: 16 }, (_, i) => DOT_ORDER.indexOf(i) * 0.035),
];

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

function ChipEditor({ chip, onSave, onCancel }: { chip: DraftChip; onSave: (value: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState(chip.value ?? "");
  return <span className="chip chip-edit"><input aria-label={`Edit ${chip.label}`} value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") onSave(value); if (event.key === "Escape") onCancel(); }} autoFocus /></span>;
}

function CommandMenu({ cards, activeIndex, onPick }: { cards: typeof CARD_TYPES; activeIndex: number; onPick: (schema: SchemaId) => void }) {
  return <div className="command-menu" role="listbox" aria-label="Card types">{cards.map((card, index) => { const Icon = iconMap[card.id]; return <button role="option" aria-selected={index === activeIndex} className={index === activeIndex ? "active" : ""} type="button" key={card.id} onMouseDown={(event) => event.preventDefault()} onClick={() => onPick(card.id)}><span className={`type-tile small family-${card.family}`}><Icon size={16} /></span><span><strong>{card.label}</strong><small>{card.example}</small></span></button>; })}</div>;
}

function CardWidget(props: { draft: CardDraft; resolving: boolean; shoppingGroups: ShoppingGroup[]; checkedItems: Record<string, boolean>; setCheckedItems: React.Dispatch<React.SetStateAction<Record<string, boolean>>>; expansion: ExpansionState; dishModes: Record<string, DishMode>; pendingDishNames: Set<string>; setDishMode: (dish: string, mode: DishMode) => void; timerRunning: boolean; timerDone: boolean; startOrPauseTimer: () => void; resetTimer: () => void; remainingSeconds: number | null; weatherPlan: JevDecision | null; randomKind: RandomKind }) {
  const { draft } = props;
  if (draft.schema === "shopping") return <ShoppingWidget {...props} />;
  if (draft.schema === "timer") return <TimerWidget {...props} />;
  if (draft.schema === "calc") return null;
  if (draft.schema === "split") return <div className="result-widget"><small>Per person</small><strong>{draft.summary}</strong></div>;
  if (draft.schema === "convert") return <ConvertWidget key={`${String(draft.data.from ?? "")}>${String(draft.data.to ?? "")}#${String(draft.data.value ?? "")}`} draft={draft} />;
  if (draft.schema === "random") return <RandomWidget draft={draft} kind={props.randomKind} />;
  if (draft.schema === "color") return <ColorWidget key={String(draft.data.hex ?? "")} draft={draft} resolving={props.resolving} />;
  if (draft.schema === "bookmark") return <BookmarkWidget draft={draft} />;
  if (draft.schema === "poll") return <PollWidget options={(draft.data.options as string[] | undefined) ?? []} multi={draft.data.multi === true} />;
  if (draft.schema === "checklist") return <ChecklistWidget key={`${((draft.data.items as string[] | undefined) ?? []).join("|")}#${((draft.data.done as string[] | undefined) ?? []).join("|")}`} items={(draft.data.items as string[] | undefined) ?? []} done={(draft.data.done as string[] | undefined) ?? []} />;
  if (draft.schema === "countdown") return <div className="result-widget"><small>Countdown</small><strong>{draft.summary}</strong></div>;
  if (draft.schema === "weather") return <WeatherWidget draft={draft} resolving={props.resolving} plan={props.weatherPlan} />;
  if (draft.schema === "password") return <PasswordWidget draft={draft} />;
  return null;
}

type ConvertResult = {
  value?: number;
  result?: number | null;
  from?: string;
  to?: string;
  from_label?: string;
  to_label?: string;
  from_symbol?: string;
  to_symbol?: string;
  rate?: number | null;
  as_of?: string | null;
  kind?: string;
  category?: string | null;
  computed_by?: string | null;
};

function formatAmount(amount: number, currency: boolean): string {
  if (!Number.isFinite(amount)) return "—";
  if (currency) return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const magnitude = Math.abs(amount);
  const digits = magnitude === 0 ? 0 : magnitude < 0.001 ? 8 : magnitude < 1 ? 6 : magnitude < 1000 ? 4 : 2;
  return Number(amount.toFixed(digits)).toLocaleString(undefined, { maximumFractionDigits: digits });
}

/**
 * Conversion is a two-sided instrument, not a sentence you re-type. The typed
 * phrase seeds it; from there both units, the category, and the amount are all
 * live controls that recompute against the same deterministic backend.
 */
function ConvertWidget({ draft }: { draft: CardDraft }) {
  const seed = draft.data as ConvertResult;
  const [catalog, setCatalog] = useState<UnitCategory[]>([]);
  const [category, setCategory] = useState(seed.category ?? (seed.kind === "currency" ? "currency" : ""));
  const [source, setSource] = useState(String(seed.from ?? ""));
  const [target, setTarget] = useState(String(seed.to ?? ""));
  const [amount, setAmount] = useState(seed.value === undefined || seed.value === null ? "" : String(seed.value));
  const [live, setLive] = useState<ConvertResult>(seed);
  const [copied, setCopied] = useState(false);

  useEffect(() => { loadUnitCatalog().then(setCatalog); }, []);

  const activeCategory = catalog.find((entry) => entry.id === category) ?? null;
  const units = activeCategory?.units ?? [];
  const isCurrency = activeCategory ? activeCategory.kind === "currency" : live.kind === "currency";
  const parsedAmount = Number(amount);
  const ready = Boolean(source && target) && amount.trim() !== "" && Number.isFinite(parsedAmount);

  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    const id = window.setTimeout(() => {
      fetch(`${backendUrl}/api/convert`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ value: parsedAmount, source, target }),
        signal: controller.signal,
      })
        .then((response) => (response.ok ? response.json() : null))
        .then((payload: ConvertResult | null) => { if (payload) setLive(payload); })
        .catch(() => undefined);
    }, 160);
    return () => { window.clearTimeout(id); controller.abort(); };
  }, [parsedAmount, ready, source, target]);

  const resultValue = live.result;
  const targetLabel = live.to_label ?? units.find((unit) => unit.id === target)?.symbol ?? target;
  const targetSymbol = isCurrency ? live.to_symbol ?? "" : "";
  const resultText =
    resultValue === null || resultValue === undefined
      ? "—"
      : `${targetSymbol}${formatAmount(resultValue, isCurrency)}${isCurrency ? ` ${targetLabel}` : ` ${targetLabel}`}`;

  function pickCategory(next: string) {
    setCategory(next);
    const picked = catalog.find((entry) => entry.id === next);
    if (!picked || picked.units.length < 2) return;
    setSource(picked.units[0].id);
    setTarget(picked.units[1].id);
  }

  function swap() {
    setSource(target);
    setTarget(source);
    if (resultValue !== null && resultValue !== undefined) setAmount(String(Number(resultValue.toFixed(6))));
  }

  async function copyResult() {
    if (resultValue === null || resultValue === undefined) return;
    await navigator.clipboard.writeText(String(resultValue));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  const unitSelect = (which: "from" | "to") => {
    const value = which === "from" ? source : target;
    const set = which === "from" ? setSource : setTarget;
    const known = units.some((unit) => unit.id === value);
    return (
      <select className="unit-select" aria-label={which === "from" ? "Convert from" : "Convert to"} value={value} onChange={(event) => set(event.target.value)}>
        {known || !value ? null : <option value={value}>{which === "from" ? live.from_label ?? value : live.to_label ?? value}</option>}
        {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.label} ({unit.symbol})</option>)}
      </select>
    );
  };

  return (
    <div className="convert-widget">
      <select className="unit-select category" aria-label="Measurement category" value={category} onChange={(event) => pickCategory(event.target.value)}>
        {category ? null : <option value="">Pick a category</option>}
        {catalog.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
      </select>
      <div className="convert-row">
        <div className="convert-side">
          <input className="convert-amount" inputMode="decimal" aria-label="Amount to convert" value={amount} onChange={(event) => setAmount(event.target.value)} />
          {unitSelect("from")}
        </div>
        <button className="swap-button" type="button" aria-label="Swap units" onClick={swap}><ArrowLeftRight size={16} aria-hidden="true" /></button>
        <div className="convert-side result">
          <output className="convert-result">{resultText}</output>
          <button className="copy-button" type="button" aria-label="Copy result" onClick={copyResult}>{copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}</button>
          {unitSelect("to")}
        </div>
      </div>
      {live.rate ? (
        <p className="convert-note">1 {live.from_label} = {formatAmount(live.rate, false)} {live.to_label}{live.as_of ? ` · ${new Date(live.as_of).toLocaleDateString()}` : ""}</p>
      ) : null}
    </div>
  );
}

/**
 * When Luna reaches for the interpreter, the code it ran is the receipt. It
 * stays folded away until someone wants to audit the answer.
 */
function CodeDisclosure({ snippets, values }: { snippets: string[]; values: Record<string, unknown> }) {
  const [open, setOpen] = useState(false);
  if (!snippets.length) return null;
  return (
    <div className={open ? "code-disclosure open" : "code-disclosure"}>
      <button type="button" className="code-toggle" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <ChevronRight size={14} className="code-chevron" aria-hidden="true" />
        Ran Python
        <small>{snippets.length} {snippets.length === 1 ? "call" : "calls"}</small>
      </button>
      <div className="code-reveal">
        <div className="code-reveal-inner">
          {snippets.map((snippet, index) => (
            <div className="code-block-group" key={index}>
              <span className="code-caption">Arguments</span>
              <pre className="code-snippet">{snippet}</pre>
            </div>
          ))}
          <div className="code-block-group">
            <span className="code-caption">Returned</span>
            <pre className="code-snippet returned">{JSON.stringify(values, null, 2)}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}

const CONDITION_ICONS: Record<string, LucideIcon> = {
  thunderstorm: CloudRain,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  snow: CloudSnow,
  atmosphere: CloudFog,
  clear: CloudSun,
  clouds: Cloudy,
};

type DailyForecast = { date: string; high: number | null; low: number | null; wind_speed?: number | null; pop?: number | null; condition_group: string | null; description: string | null };
type HourlyForecast = { date: string; time: string; hour: number; temp: number | null; feels_like: number | null; wind_speed: number | null; pop: number; condition_group: string | null; description: string | null };

const WET_SKIES = new Set(["rain", "drizzle", "thunderstorm", "snow"]);

/** Turn the window's own numbers into the sentence the question asked for. Only a question earns one. */
function weatherVerdict(draft: CardDraft, plan: JevDecision | null): { verdict: string; because: string } | null {
  if (plan?.choice !== "advice") return null;
  const axes = plan?.axes ?? {};
  const imperial = (draft.data.units as string | undefined) !== "metric";
  const low = draft.data.low as number | null | undefined;
  const wind = draft.data.max_wind as number | null | undefined;
  const pop = draft.data.max_pop as number | null | undefined;
  const wet = Boolean(draft.data.will_rain) || (pop ?? 0) >= 0.3;
  const chilly = low !== null && low !== undefined && low <= (imperial ? 58 : 14);
  const blustery = wind !== null && wind !== undefined && wind >= (imperial ? 18 : 8);
  const reasons: string[] = [];
  if (wet) reasons.push(pop ? `${Math.round(pop * 100)}% chance of precipitation` : "wet skies");
  if (chilly && low !== null && low !== undefined) reasons.push(`lows near ${Math.round(low)}${(draft.data.temp_unit as string) ?? "°"}`);
  if (blustery && wind !== null && wind !== undefined) reasons.push(`wind to ${Math.round(wind)} ${(draft.data.speed_unit as string) ?? "mph"}`);

  if ((axes.wants_rain_layer ?? 0) >= 0.5) return { verdict: wet ? "Yes — take rain cover" : "No — it stays dry", because: reasons.join(", ") || "clear through the window" };
  if ((axes.wants_wind_layer ?? 0) >= 0.5) return { verdict: blustery ? "Yes — it gets gusty" : "No — the air stays calm", because: reasons.join(", ") || "light wind throughout" };
  return { verdict: chilly || wet || blustery ? "Yes — bring a layer" : "No — you'll be fine without one", because: reasons.join(", ") || "mild and settled" };
}

function WeatherWidget({ draft, resolving, plan }: { draft: CardDraft; resolving: boolean; plan: JevDecision | null }) {
  const temp = draft.data.temp as number | undefined;
  const unit = (draft.data.temp_unit as string | undefined) ?? "°";
  const group = (draft.data.condition_group as string | undefined) ?? "clear";
  const Glyph = CONDITION_ICONS[group] ?? CloudSun;
  const days = ((draft.data.window_days as DailyForecast[] | undefined) ?? (draft.data.daily as DailyForecast[] | undefined) ?? []).slice(0, 7);
  const hours = ((draft.data.window_hours as HourlyForecast[] | undefined) ?? []).slice(0, 8);
  const span = Number(draft.data.window_span ?? 0);
  const advice = weatherVerdict(draft, plan);
  // JEV names the shape; the window's own length is the fallback when it hasn't answered yet.
  const shape = plan?.choice === "advice" && advice ? "advice" : plan?.choice === "hourly" ? "hourly" : plan?.choice === "daily" || span > 1 ? "daily" : plan?.choice === "now" ? "now" : span > 1 ? "daily" : "now";

  if (temp === undefined || temp === null) {
    return <div className="weather-widget empty"><Glyph size={28} /><p className="empty-widget">{resolving ? "Reading the sky…" : "Weather is unavailable right now."}</p></div>;
  }

  const high = draft.data.high as number | null | undefined;
  const low = draft.data.low as number | null | undefined;

  return (
    <div className={`weather-widget sky-${group}`}>
      {advice ? (
        <div className="weather-verdict">
          <strong>{advice.verdict}</strong>
          <small>{advice.because}</small>
        </div>
      ) : null}

      {shape === "advice" ? null : (
        <div className="weather-now">
          <Glyph size={44} strokeWidth={1.4} />
          <div className="weather-reading">
            <strong>{Math.round(temp)}<span>{unit}</span></strong>
            <small>{(draft.data.description as string | undefined) ?? (draft.data.condition as string | undefined) ?? ""}</small>
          </div>
          {span > 1 && high !== null && high !== undefined && low !== null && low !== undefined ? (
            <div className="weather-range"><span>{Math.round(high)}{unit}</span><i>{Math.round(low)}{unit}</i></div>
          ) : null}
        </div>
      )}

      {shape === "hourly" && hours.length ? (
        <div className="weather-strip hours">
          {hours.map((hour) => {
            const HourGlyph = CONDITION_ICONS[hour.condition_group ?? "clear"] ?? CloudSun;
            return (
              <div className="weather-day" key={`${hour.date}T${hour.time}`}>
                <small>{formatHour(hour.hour)}</small>
                <HourGlyph size={16} strokeWidth={1.6} />
                <span>{hour.temp === null ? "—" : `${Math.round(hour.temp)}°`}{hour.pop >= 0.2 ? <i className="wet">{Math.round(hour.pop * 100)}%</i> : null}</span>
              </div>
            );
          })}
        </div>
      ) : shape !== "now" && days.length ? (
        <div className="weather-strip">
          {days.map((day) => {
            const DayGlyph = CONDITION_ICONS[day.condition_group ?? "clear"] ?? CloudSun;
            return (
              <div className="weather-day" key={day.date}>
                <small>{new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short" })}</small>
                <DayGlyph size={16} strokeWidth={1.6} />
                <span>{day.high === null ? "—" : `${Math.round(day.high)}°`}<i>{day.low === null ? "" : `${Math.round(day.low)}°`}</i></span>
                {WET_SKIES.has(day.condition_group ?? "") && day.pop ? <em className="wet">{Math.round(day.pop * 100)}%</em> : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function formatHour(hour: number): string {
  if (hour === 0) return "12a";
  if (hour === 12) return "12p";
  return hour < 12 ? `${hour}a` : `${hour - 12}p`;
}

function TimerWidget({ draft, timerRunning, timerDone, remainingSeconds, startOrPauseTimer, resetTimer }: Parameters<typeof CardWidget>[0]) {
  const total = Number(draft.data.seconds ?? 0);
  const remaining = remainingSeconds ?? total;
  const progress = total ? remaining / total : 1;
  const radius = 69;
  const circumference = 2 * Math.PI * radius;
  const actionLabel = timerRunning ? "Pause" : remainingSeconds !== null && remainingSeconds > 0 && remainingSeconds < total ? "Resume" : "Start";
  const ActionIcon = timerRunning ? Pause : Play;
  return (
    <div className={`timer-widget ${timerDone ? "done" : ""}`}>
      <div className="timer-ring" aria-label={`Timer remaining ${timerDone ? "Done" : formatClock(remaining)}`}>
        <svg viewBox="0 0 150 150" aria-hidden="true">
          <circle className="timer-track" cx="75" cy="75" r={radius} />
          <circle
            className="timer-progress"
            cx="75"
            cy="75"
            r={radius}
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
          />
        </svg>
        <strong>{timerDone ? "Done" : formatClock(remaining)}</strong>
      </div>
      <div className="timer-details">
        <strong>{String(draft.data.label ?? "Timer")}</strong>
        <span>{String(draft.data.durationLabel ?? draft.summary)}</span>
        <div className="timer-controls">
          <button
            className="timer-primary"
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={startOrPauseTimer}
          >
            <ActionIcon size={16} aria-hidden="true" /> {actionLabel}
          </button>
          <button
            className="timer-reset"
            type="button"
            aria-label="Reset timer"
            onMouseDown={(event) => event.preventDefault()}
            onClick={resetTimer}
          >
            <RotateCcw size={17} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ShoppingWidget({ shoppingGroups, checkedItems, setCheckedItems, expansion, dishModes, pendingDishNames, setDishMode }: Parameters<typeof CardWidget>[0]) {
  if (expansion.loading && !shoppingGroups.length) return <div className="shopping-widget">{Array.from({ length: 4 }, (_, index) => <div className="shopping-row shimmer" key={index} />)}</div>;
  if (!shoppingGroups.length) return <div className="shopping-widget"><p className="empty-widget">Add grocery items or name a dish.</p></div>;
  return (
    <div className="shopping-widget">
      {shoppingGroups.map((group, groupIndex) => {
        const selectedMode = group.name ? dishModes[group.name] ?? group.mode ?? "homemade" : null;
        const pending = group.name ? pendingDishNames.has(group.name) && expansion.loading : false;
        return (
          <section className={group.name ? "shopping-group" : "shopping-group plain"} key={group.name ?? "plain"}>
            {group.name ? (
              <div className="dish-toggle">
                <span>
                  <strong>{group.name}</strong>
                  <small>{group.items.length} item{group.items.length === 1 ? "" : "s"}</small>
                </span>
                <div>
                  <button className={selectedMode === "homemade" ? "selected" : ""} type="button" onClick={() => setDishMode(group.name!, "homemade")}>Homemade</button>
                  <button className={selectedMode === "store-bought" ? "selected" : ""} type="button" onClick={() => setDishMode(group.name!, "store-bought")}>Store-bought</button>
                </div>
              </div>
            ) : null}
            {pending ? <div className="shopping-row shimmer" /> : null}
            {group.items.map((item) => {
              const key = `${group.name ?? `plain-${groupIndex}`}-${item}`;
              return (
                <label className="shopping-row" key={key}>
                  <input type="checkbox" checked={Boolean(checkedItems[key] ?? checkedItems[item])} onChange={(event) => setCheckedItems((next) => ({ ...next, [key]: event.target.checked }))} />
                  <span>{item}</span>
                </label>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}

const HARMONY_LABELS: Record<number, string> = { 2: "Opposite", 3: "Triad", 4: "Square" };

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const area = document.createElement("textarea");
    area.value = value;
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }
}

function ColorWidget({ draft, resolving }: { draft: CardDraft; resolving: boolean }) {
  const base = String(draft.data.hex ?? "");
  const format = (draft.data.format as ColorFormat | null) ?? null;
  const stops = useMemo(() => (Array.isArray(draft.data.stops) ? (draft.data.stops as string[]) : []), [draft.data.stops]);
  const [anchor, setAnchor] = useState(base);
  const [active, setActive] = useState(base);
  const [steps, setSteps] = useState(2);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(null), 1200);
    return () => window.clearTimeout(id);
  }, [copied]);

  if (!base) return <p className="empty-widget">{resolving ? "Looking up that color…" : "Type a color name, a hex code, rgb(), hsl(), or two colors for a gradient."}</p>;

  const name = nearestName(active);
  const isGradient = format === "gradient" && stops.length >= 2;
  const rows = [
    ...(isGradient ? [{ id: "gradient", label: "CSS", value: gradientCss(stops) }] : []),
    { id: "hex", label: "HEX", value: active },
    { id: "rgb", label: "RGB", value: formatRgb(active) },
    { id: "hsl", label: "HSL", value: formatHsl(active) },
    { id: "name", label: name.exact ? "Name" : "Nearest", value: name.name },
  ];
  // Lead with the formats the user did not type; the typed one moves last.
  const typedId = active === base && format && format !== "described" && format !== "gradient" ? format : null;
  const ordered = [...rows.filter((row) => row.id !== typedId), ...rows.filter((row) => row.id === typedId)];
  const wheel = harmony(anchor, steps);
  const copy = (id: string, value: string) => {
    void copyText(value);
    setCopied(id);
  };

  return (
    <div className="color-widget">
      {isGradient ? (
        <div className="gradient-bar" style={{ background: gradientCss(stops) }}>
          {stops.map((stop, index) => (
            <button key={`${stop}-${index}`} type="button" aria-label={`Use stop ${stop}`} className={anchor === stop ? "active" : ""} onClick={() => { setAnchor(stop); setActive(stop); }} />
          ))}
        </div>
      ) : null}
      <div className="color-main">
        <div className="shade-strip" role="group" aria-label="Tints and shades">
          {shadeScale(anchor).map((hex) => (
            <button key={hex} type="button" aria-label={`Use ${hex}`} title={hex} className={hex === active ? "active" : ""} style={{ backgroundColor: hex }} onClick={() => setActive(hex)} />
          ))}
        </div>
        <div className="format-list">
          {ordered.map((row) => (
            <button key={row.id} type="button" className={`format-row ${row.id === typedId ? "typed" : ""}`} onClick={() => copy(row.id, row.value)} aria-label={`Copy ${row.label} ${row.value}`}>
              <span className="format-label">{row.label}</span>
              <code>{row.value}</code>
              {row.id === typedId ? <small>typed</small> : null}
              {copied === row.id ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
            </button>
          ))}
        </div>
      </div>
      <div className="harmony">
        <div className="harmony-head">
          <span className="type-label">{HARMONY_LABELS[steps] ?? `${steps}-step wheel`}</span>
          <div className="stepper" role="group" aria-label="Wheel steps">
            <button type="button" aria-label="Fewer steps" disabled={steps <= 2} onClick={() => setSteps((value) => Math.max(2, value - 1))}><Minus size={14} /></button>
            <output aria-live="polite">{steps}</output>
            <button type="button" aria-label="More steps" disabled={steps >= 12} onClick={() => setSteps((value) => Math.min(12, value + 1))}><Plus size={14} /></button>
          </div>
        </div>
        <div className="harmony-body">
          <div className="color-wheel" aria-hidden="true">
            {wheel.map((hex, index) => {
              const { h, s } = hexToHsl(hex);
              const radius = 12 + (s / 100) * 34;
              const angle = (h * Math.PI) / 180;
              return <span key={`${hex}-${index}`} className={index === 0 ? "base" : ""} style={{ backgroundColor: hex, left: `${50 + radius * Math.sin(angle)}%`, top: `${50 - radius * Math.cos(angle)}%` }} />;
            })}
          </div>
          <div className="harmony-swatches">
            {wheel.map((hex, index) => (
              <button key={`${hex}-${index}`} type="button" className={hex === active ? "active" : ""} style={{ backgroundColor: hex, color: readableInk(hex) }} onClick={() => setActive(hex)} aria-label={`Use ${hex}`}>
                <code>{hex}</code>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
function BookmarkWidget({ draft }: { draft: CardDraft }) { const url = String(draft.data.url ?? ""); const host = String(draft.data.host ?? ""); const favicon = host ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=32` : ""; return <div className="bookmark-widget"><span className="favicon" style={favicon ? { backgroundImage: `url(${favicon})` } : undefined} /><div><strong>{host || "Bookmark"}</strong><small>{url}</small></div></div>; }

function ChecklistWidget({ items, done }: { items: string[]; done: string[] }) {
  const [checked, setChecked] = useState<Set<string>>(() => new Set(done.filter((item) => items.includes(item))));
  if (!items.length) return <div className="checklist-widget"><p className="empty-widget">Add tasks, separated by commas.</p></div>;
  const progress = checked.size / items.length;
  return (
    <div className="checklist-widget">
      <div className="checklist-progress" aria-label={`${checked.size} of ${items.length} done`}>
        <span><strong>{checked.size}</strong> of {items.length} done</span>
        <i><b style={{ transform: `scaleX(${progress})` }} /></i>
      </div>
      <ul>
        {items.map((item) => {
          const isDone = checked.has(item);
          return (
            <li key={item} className={isDone ? "done" : ""}>
              <label>
                <input
                  type="checkbox"
                  checked={isDone}
                  onChange={(event) => setChecked((previous) => {
                    const next = new Set(previous);
                    if (event.target.checked) next.add(item); else next.delete(item);
                    return next;
                  })}
                />
                <span className="check-box" aria-hidden="true"><Check size={12} strokeWidth={3} /></span>
                <span className="check-text">{item}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function HintRotator() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setIndex((value) => (value + 1) % HINTS.length), 3200);
    return () => window.clearInterval(id);
  }, []);
  return (
    <span className="hint-rotator" id="omnibar-hint" aria-hidden="true">
      <span className="hint-phrase" key={index}>{HINTS[index]}</span>
      <span className="hint-slash"><kbd>/</kbd> all cards</span>
    </span>
  );
}

function Provenance({ picked, entry }: { picked: PickedLane | null; entry: FanoutEntry | undefined }) {
  const webPending = entry?.web?.status === "pending";
  const pythonPending = entry?.code?.status === "pending";
  const judging = entry?.judge?.status === "pending" || picked?.verdict === "judging";
  if (!picked && !webPending && !pythonPending) return null;
  let label = "Luna";
  let tone = "";
  if (picked?.verdict === "verified") { label = "Python verified"; tone = "upgraded"; }
  else if (picked?.verdict === "python") { label = "Python"; tone = "upgraded"; }
  else if (pythonPending && picked) { label = "Luna · running Python"; tone = "working"; }
  else if (pythonPending) { label = "Running Python"; tone = "working"; }
  else if (webPending && picked) { label = "Luna · checking web"; tone = "working"; }
  else if (webPending) { label = entry?.fast?.status === "pending" ? "Luna + web racing" : "Searching the web"; tone = "working"; }
  else if (judging) { label = "JEV comparing"; tone = "working"; }
  else if (picked?.verdict === "agree") label = "Luna + web agree";
  else if (picked?.verdict === "judged") { label = `${picked.lane === "web" ? "Web" : "Luna"} · JEV ${Math.round((picked.confidence ?? 0) * 100)}%`; tone = picked.lane === "web" ? "upgraded" : ""; }
  else if (picked?.lane === "web") label = "Web";
  const sources = picked?.response.sources ?? [];
  return (
    <span className={`provenance ${tone}`} key={`${picked?.lane ?? "none"}-${tone}`} title={sources.length ? sources.join("\n") : undefined}>
      {tone === "working" ? <i className="pulse-dot" aria-hidden="true" /> : null}
      {label}
    </span>
  );
}

function laneLabel(lane: LaneState | undefined) {
  if (!lane) return "—";
  if (lane.status !== "ready") return lane.status === "error" ? lane.error ?? "error" : "pending";
  return `ok · ${Math.round(lane.response?.latency_ms ?? 0)} ms${lane.response?.sources.length ? ` · ${lane.response.sources.length} sources` : ""}`;
}

function Inspector({
  open,
  classification,
  draft,
  extraction,
  fanEntry,
  expansion,
  providerChoice,
  setProviderChoice,
  webSearchEnabled,
  setWebSearchEnabled,
  onClose,
}: {
  open: boolean;
  classification: ReturnType<typeof useJevClassification>;
  draft: CardDraft | null;
  extraction: ExtractionState;
  fanEntry: FanoutEntry | undefined;
  expansion: ExpansionState;
  providerChoice: ExpansionProvider;
  setProviderChoice: (provider: ExpansionProvider) => void;
  webSearchEnabled: boolean;
  setWebSearchEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  onClose: () => void;
}) {
  const candidates = classification.result?.candidates.slice(0, 5) ?? [];
  const providers: ExpansionProvider[] = webSearchEnabled ? ["decision", "foundry", "foundry-web"] : ["decision", "foundry"];
  const results = expansion.response?.results ?? [];
  const signals = classification.result?.diagnostics.signals ?? {};
  return (
    <aside id="jev-inspector" className={`inspector-panel ${open ? "open" : ""}`} aria-label="Inspector">
      <button className="drawer-close" type="button" onClick={onClose}><X size={16} /> Close</button>
      <h2>Inspector</h2>
      <p>JEV decides · Luna understands</p>
      <div className="candidate-bars">
        {candidates.length ? candidates.map((candidate) => (
          <div key={candidate.schema}>
            <span><strong>{labelFor(candidate.schema)}</strong>{Math.round(candidate.probability * 100)}%</span>
            <i><b style={{ transform: `scaleX(${candidate.probability})` }} /></i>
          </div>
        )) : <small>No classification yet.</small>}
      </div>
      <dl>
        <div><dt>Evidence</dt><dd>{percent(classification.result?.diagnostics.has_enough_evidence)}</dd></div>
        <div><dt>Clarification</dt><dd>{percent(classification.result?.diagnostics.needs_clarification)}</dd></div>
        <div><dt>Latency</dt><dd>{classification.result?.diagnostics.latency_ms ?? "—"} ms</dd></div>
        <div><dt>Reason</dt><dd>{classification.result?.decision.reason ?? "—"}</dd></div>
        <div><dt>Selected</dt><dd>{draft ? labelFor(draft.schema) : "—"}</dd></div>
      </dl>
      <section className="state-block">
        <h3>State (JEV)</h3>
        <dl>
          <div><dt>Needs expansion</dt><dd>{percent(signals.needs_expansion)}</dd></div>
          <div><dt>Lists items</dt><dd>{percent(signals.lists_items)}</dd></div>
          <div><dt>Is a value</dt><dd>{percent(signals.is_value)}</dd></div>
          <div><dt>Needs lookup</dt><dd>{percent(signals.needs_lookup)}</dd></div>
          <div><dt>Needs computation</dt><dd>{percent(signals.needs_computation)}</dd></div>
          <div><dt>Complete</dt><dd>{percent(signals.is_complete)}</dd></div>
        </dl>
      </section>
      <section className="state-block">
        <h3>Fields (Luna)</h3>
        <dl>
          <div><dt>Luna</dt><dd>{laneLabel(fanEntry?.fast)}</dd></div>
          <div><dt>Luna + web</dt><dd>{fanEntry?.web ? laneLabel(fanEntry.web) : `skipped (lookup < ${Math.round(LOOKUP_GATE * 100)}%)`}</dd></div>
          <div><dt>Luna + Python</dt><dd>{fanEntry?.code ? laneLabel(fanEntry.code) : `skipped (compute < ${Math.round(COMPUTE_GATE * 100)}%)`}</dd></div>
          <div><dt>JEV judge</dt><dd>{fanEntry?.judge?.response ? Object.entries(fanEntry.judge.response.probabilities).map(([id, p]) => `${id} ${Math.round(p * 100)}%`).join(" · ") : fanEntry?.judge?.status ?? "—"}</dd></div>
        </dl>
        <pre>{JSON.stringify(extraction.response?.values ?? {}, null, 0)}</pre>
        {fanEntry?.code?.response?.code.length ? <><h3 className="code-heading">Python Luna ran</h3><pre className="code-block">{fanEntry.code.response.code.join("\n# ---\n")}</pre></> : null}
      </section>
      {draft?.schema === "shopping" ? (
        <section className="provider-compare">
          <div className="provider-heading">
            <h3>Expansion</h3>
            <label className="web-toggle">
              <input type="checkbox" checked={webSearchEnabled} onChange={(event) => setWebSearchEnabled(event.target.checked)} />
              Web search
            </label>
          </div>
          {expansion.response?.dishes_parsed.length ? <p className="parsed-dishes">Parsed: {expansion.response.dishes_parsed.join(", ")}</p> : null}
          {providers.map((provider) => {
            const result = results.find((item) => item.provider === provider);
            const pending = expansion.pending[provider];
            const error = expansion.errors[provider];
            return (
              <button className={providerChoice === provider ? "provider selected" : "provider"} type="button" key={provider} onClick={() => setProviderChoice(provider)}>
                <strong>{providerLabel(provider)}</strong>
                <span>
                  {pending ? "pending" : result ? (result.ok ? "ok" : result.error ?? "error") : error ?? "not requested"}
                  {result ? ` · ${Math.round(result.latency_ms)} ms · ${result.dishes.reduce((sum, dish) => sum + dish.items.length, 0)} items` : null}
                </span>
                {result?.sources.length ? (
                  <span className="provider-sources">
                    {result.sources.map((source) => <a href={source} key={source} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>{source}</a>)}
                  </span>
                ) : null}
              </button>
            );
          })}
        </section>
      ) : null}
    </aside>
  );
}

function labelFor(schema: SchemaId): string { return CARD_TYPES.find((card) => card.id === schema)?.label ?? schema; }
function familyFor(schema: SchemaId): string { return CARD_TYPES.find((card) => card.id === schema)?.family ?? "record"; }
function percent(value: number | undefined): string { return typeof value === "number" ? `${Math.round(value * 100)}%` : "—"; }
function providerLabel(provider: ExpansionProvider): string {
  if (provider === "foundry") return "Foundry GPT-6 Luna";
  if (provider === "foundry-web") return "Foundry GPT-6 Luna + web";
  return "JEV";
}
function mergeExpansionPayload(previous: ExpansionState, payload: ExpansionResponse, provider: ExpansionProvider): ExpansionState {
  const payloadResults = payload.results.filter((result) => result.provider === provider);
  const keptResults = previous.response?.results.filter((result) => result.provider !== provider) ?? [];
  const results = [...keptResults, ...payloadResults].sort((a, b) => providerSort(a.provider) - providerSort(b.provider));
  const dishesParsed = Array.from(new Set([...(previous.response?.dishes_parsed ?? []), ...payload.dishes_parsed]));
  const pending = { ...previous.pending, [provider]: false };
  const errors = { ...previous.errors };
  delete errors[provider];
  return {
    loading: Object.values(pending).some(Boolean),
    error: Object.values(errors)[0] ?? null,
    response: { title: previous.response?.title ?? payload.title ?? payloadResults.find((result) => result.title)?.title ?? null, dishes_parsed: dishesParsed, results },
    pending,
    errors,
  };
}
function markExpansionError(previous: ExpansionState, provider: ExpansionProvider, message: string): ExpansionState {
  const pending = { ...previous.pending, [provider]: false };
  const errors = { ...previous.errors, [provider]: message };
  return { ...previous, loading: Object.values(pending).some(Boolean), error: message, pending, errors };
}
function providerSort(provider: ExpansionProvider): number {
  if (provider === "decision") return 0;
  if (provider === "foundry") return 1;
  return 2;
}
function dishTitle(names: string[]): string {
  if (names.length === 0) return "Groceries";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${lowerFirst(names[1])}`;
  return `${names.slice(0, -1).join(", ")}, and ${lowerFirst(names[names.length - 1])}`;
}
function lowerFirst(value: string): string {
  return value ? value.charAt(0).toLowerCase() + value.slice(1) : value;
}
function localIsoWithOffset(date: Date): string {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absolute = Math.abs(offsetMinutes);
  const offset = `${sign}${String(Math.floor(absolute / 60)).padStart(2, "0")}:${String(absolute % 60).padStart(2, "0")}`;
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 19);
  return `${local}${offset}`;
}
function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}
