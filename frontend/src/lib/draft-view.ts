import type { SchemaId } from "@/lib/contracts";
import { nearestName, parseColorInput } from "@/lib/color";

export type ChipKind = "text" | "date" | "time" | "place" | "people" | "number" | "url" | "color";

export type DraftChip = {
  id: string;
  label: string;
  value: string | null;
  kind?: ChipKind;
  icon?: "calendar" | "clock" | "pin" | "video" | "users" | "tag" | "hash" | "dollar" | "link" | "repeat";
};

export type CardDraft = {
  schema: SchemaId;
  title: string;
  chips: DraftChip[];
  data: Record<string, unknown>;
  summary: string;
  actionLabel: string;
};

export type CardTypeMeta = {
  id: SchemaId;
  label: string;
  example: string;
  family: "time" | "list" | "compute" | "record" | "plan";
};

export const CARD_TYPES: CardTypeMeta[] = [
  { id: "event", label: "Event", example: "coffee with Sam thursday 9am at Blue Bottle", family: "time" },
  { id: "reminder", label: "Reminder", example: "remind me to water the plants sunday", family: "time" },
  { id: "shopping", label: "Shopping", example: "oat milk, limes, basil, sourdough", family: "list" },
  { id: "checklist", label: "Checklist", example: "pack passport, charger, headphones", family: "list" },
  { id: "timer", label: "Timer", example: "steep tea for 4 minutes", family: "time" },
  { id: "countdown", label: "Countdown", example: "days until my birthday oct 2", family: "time" },
  { id: "habit", label: "Habit", example: "stretch every weekday at 7", family: "plan" },
  { id: "note", label: "Note", example: "idea: a lamp that dims with the sunset", family: "record" },
  { id: "calc", label: "Calc", example: "what's 23% of 1,280", family: "compute" },
  { id: "split", label: "Split", example: "split $186 dinner four ways", family: "compute" },
  { id: "expense", label: "Expense", example: "$42 team lunch at Tartine", family: "record" },
  { id: "convert", label: "Convert", example: "350°F in celsius", family: "compute" },
  { id: "random", label: "Random", example: "pick a number 1 to 100", family: "compute" },
  { id: "color", label: "Color", example: "the color of a ripe mango", family: "compute" },
  { id: "contact", label: "Contact", example: "Maya Chen maya@studio.co 206 555 0142", family: "record" },
  { id: "goal", label: "Goal", example: "run 100 miles this fall, 38 done", family: "plan" },
  { id: "bookmark", label: "Bookmark", example: "docs.ag-ui.com read on the train", family: "record" },
  { id: "poll", label: "Poll", example: "tacos or ramen tonight?", family: "list" },
  { id: "trip", label: "Trip", example: "weekend in Portland oct 10 to 12", family: "plan" },
  { id: "weather", label: "Weather", example: "will it rain in Seattle tomorrow", family: "compute" },
  { id: "password", label: "Password", example: "generate a 20 character password", family: "compute" },
];

// Rotating omnibar hints, interleaved across card families.
export const HINTS: string[] = ["event", "color", "checklist", "convert", "reminder", "weather", "poll", "calc", "shopping", "goal", "timer", "trip", "split", "note", "countdown", "random", "password", "expense", "habit", "contact", "bookmark"].map((id) => CARD_TYPES.find((card) => card.id === id)!.example);

const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const numberWords: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
const monthNames = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const monthIndex: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

export function createDraftCard(schema: SchemaId, input: string, overrides: Record<string, string | null> = {}, extracted: Record<string, unknown> = {}, now = new Date()): CardDraft {
  const text = normalize(input);
  const apply = (chips: DraftChip[]) => chips.map((chip) => ({ ...chip, value: overrides[chip.id] === undefined ? chip.value : overrides[chip.id] }));
  const chipValue = (chips: DraftChip[], id: string) => apply(chips).find((chip) => chip.id === id)?.value ?? null;
  const stringValue = (key: string): string | null => typeof extracted[key] === "string" && extracted[key].trim() ? clean(extracted[key]) : null;
  const rawString = (key: string): string | null => typeof extracted[key] === "string" && extracted[key].trim() ? extracted[key].trim() : null;
  const numberValue = (key: string): number | null => typeof extracted[key] === "number" && Number.isFinite(extracted[key]) ? extracted[key] : null;
  const intValue = (key: string): number | null => { const value = numberValue(key); return value === null ? null : Math.trunc(value); };
  const stringList = (key: string): string[] => Array.isArray(extracted[key]) ? extracted[key].filter((item): item is string => typeof item === "string" && item.trim().length > 0).map(clean) : [];
  const isoDate = (key: string): Date | null => rawString(key) ? dateFromIsoDate(rawString(key)!) : null;
  const isoDateLabel = (key: string, alwaysYear = false): string | null => {
    const date = isoDate(key);
    return date ? formatDateLabel(date, text || rawString(key) || "", now, alwaysYear) : null;
  };
  const timeLabel = (key: string): string | null => rawString(key) ? formatTimeFromHHMM(rawString(key)!) : null;
  switch (schema) {
    case "event": {
      const parsed = parseEvent(text, now);
      const lunaPeople = stringList("people");
      const lunaTitle = stringValue("title");
      const lunaPlace = stringValue("place");
      const lunaDate = isoDateLabel("date");
      const lunaTime = timeLabel("time");
      const isVideo = typeof extracted.is_video === "boolean" ? extracted.is_video : lunaPlace ? isVideoPlace(lunaPlace) : parsed.place ? isVideoPlace(parsed.place) : false;
      const chips = apply([
        { id: "date", label: "date", value: lunaDate ?? parsed.dateLabel, kind: "date", icon: "calendar" },
        { id: "time", label: "time", value: lunaTime ?? parsed.timeLabel, kind: "time", icon: "clock" },
        { id: "place", label: "place", value: lunaPlace ?? parsed.place, kind: "place", icon: isVideo ? "video" : "pin" },
        { id: "people", label: "people", value: (lunaPeople.length ? lunaPeople : parsed.people).join(", ") || null, kind: "people", icon: "users" },
      ]);
      const date = chipValue(chips, "date");
      const time = chipValue(chips, "time");
      const title = lunaTitle ?? parsed.title ?? titleFrom(text) ?? "Event";
      return draft(schema, title, chips, { ...parsed, ...extracted, chips }, compact([title, [date, time].filter(Boolean).join(", ")]).join(" · "));
    }
    case "reminder": {
      const when = formatExtractedDateTime(extracted, now) ?? stringValue("when") ?? whenLabel(text, now);
      const task = stringValue("task") ?? clean(text.replace(/^(?:remind me to|remember to|don't forget to|do not forget to|reminder(?:\s+to)?|add a reminder(?:\s+to)?)\s*/i, "").replace(/\s+(?:before bed|tonight|tomorrow morning|tomorrow|today|at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b.*$/i, ""));
      const chips = apply([{ id: "when", label: "when", value: when, icon: "clock" }, { id: "repeat", label: "repeat", value: recurrence(text), icon: "repeat" }]);
      return draft(schema, task || titleFrom(text) || "Reminder", chips, { task, when, ...extracted }, compact([task || "Reminder", chipValue(chips, "when")]).join(" · "));
    }
    case "shopping": {
      const items = stringList("items").length ? stringList("items") : shoppingItems(text);
      const store = /\bat\s+([^,]+)$/i.exec(text)?.[1] ?? /\bfrom\s+([^,]+)$/i.exec(text)?.[1] ?? null;
      const chips = apply([{ id: "store", label: "store", value: stringValue("store") ?? (store ? clean(store) : null), icon: "pin" }]);
      const storeValue = chipValue(chips, "store");
      const title = storeValue ? `${storeValue} run` : /\bgrocer(?:y|ies)\b/i.test(text) ? "Groceries" : "Shopping list";
      const preview = items.slice(0, 3).join(", ");
      return draft(schema, title, chips, { items, store: storeValue, ...extracted }, compact([`${items.length || 0} item${items.length === 1 ? "" : "s"}`, preview]).join(" · "));
    }
    case "checklist": {
      const items = stringList("items").length ? stringList("items") : checklistItems(text);
      const due = isoDateLabel("due") ?? (Object.keys(extracted).length ? null : whenLabel(text, now));
      const chips = apply([{ id: "due", label: "due", value: due, icon: "calendar" }]);
      const doneCount = stringList("done").filter((item) => items.includes(item)).length;
      return draft(schema, stringValue("title") ?? (titleFrom(text.replace(/:.+$/, "")) || "Checklist"), chips, { items, ...extracted }, doneCount ? `${doneCount} of ${items.length} done` : `${items.length || 0} task${items.length === 1 ? "" : "s"}`);
    }
    case "timer": {
      const seconds = numberValue("duration_seconds") ?? extractDurationSeconds(text);
      const label = stringValue("label") ?? extractTimerLabel(text);
      const chips = apply([{ id: "label", label: "label", value: label === "Timer" ? null : label, icon: "tag" }]);
      return draft(schema, text || "Timer", chips, { seconds, label, durationLabel: formatDurationWords(seconds), ...extracted }, compact([formatDurationWords(seconds), label]).join(" · "));
    }
    case "countdown": {
      const date = isoDate("date") ?? parseDateTime(text, now);
      const name = stringValue("name") ?? (countdownTitle(text) || "Countdown");
      const chips = apply([{ id: "date", label: "date", value: date ? formatDateLabel(date, rawString("date") ?? text, now, true) : null, icon: "calendar" }]);
      // The backend counts from a real calendar; only fall back while it is still resolving.
      const days = numberValue("days_remaining") ?? (date ? Math.max(0, Math.ceil((startOfDay(date).getTime() - startOfDay(now).getTime()) / 86400000)) : null);
      return draft(schema, name, chips, { date: date?.toISOString(), days, ...extracted }, days === null ? "Pick a date" : `${days} ${days === 1 ? "day" : "days"} left`);
    }
    case "habit": {
      const name = stringValue("name") ?? (clean(text.replace(/^(?:start|track|build|make)\s+(?:a\s+)?habit\s+(?:to|of)?\s*/i, "").replace(/\b(?:every|daily|\d+x).*$/i, "")) || titleFrom(text) || "Habit");
      const cadence = stringValue("cadence") ?? recurrence(text) ?? (/\b3x\s*(?:a\s*)?week\b/i.test(text) ? "3x week" : null);
      const tod = stringValue("time") ?? /\b(morning|afternoon|evening|night)\b/i.exec(text)?.[1] ?? null;
      const chips = apply([{ id: "cadence", label: "cadence", value: cadence, icon: "repeat" }, { id: "time", label: "time", value: tod ? clean(tod) : null, icon: "clock" }, { id: "streak", label: "streak", value: null }]);
      return draft(schema, name, chips, { name, ...extracted }, name);
    }
    case "note": {
      const tags = stringList("tags").length ? stringList("tags") : hashtags(text);
      const body = stringValue("body") ?? clean(text.replace(/^note:?\s*/i, "").replace(/#[\w-]+/g, ""));
      const chips = apply([{ id: "tags", label: "tags", value: tags.join(", ") || null, icon: "hash" }]);
      return draft(schema, stringValue("title") ?? (body.split(/[.!?]/)[0] || "Note"), chips, { body, tags, ...extracted }, body || "Note");
    }
    case "calc": {
      const expression = rawString("expression") ? { eval: rawString("expression")!, display: rawString("display") ?? rawString("expression")! } : extractExpression(text);
      const result = expression ? safeCalculate(expression.eval) : null;
      const chips = apply([{ id: "expression", label: "expression", value: expression?.display ?? (text || null) }]);
      return draft(schema, result === null ? (expression?.display ?? "Calculation") : String(result), chips, { expression: expression?.display ?? text, result, ...extracted }, result === null ? "—" : `${result}`);
    }
    case "split": {
      const amount = numberValue("total") ?? amountOf(text); const tip = numberValue("tip_percent") ?? percentTip(text); const namedPeople = stringList("names").length || namesAfterBetween(text).length; const people = numberValue("people") ?? peopleCount(text) ?? namedPeople; const total = amount * (1 + tip / 100); const share = people ? total / people : null;
      const chips = apply([{ id: "total", label: "total", value: amount ? money(amount) : null, icon: "dollar" }, { id: "people", label: "people", value: people ? String(people) : null, icon: "users" }, { id: "tip", label: "tip", value: tip ? `${tip}%` : null }]);
      return draft(schema, "Split bill", chips, { amount, tip, people, share, ...extracted }, share === null ? "Add people" : `${money(share)} each`);
    }
    case "expense": {
      const amount = numberValue("amount") ?? amountOf(text); const merchantName = stringValue("merchant") ?? merchant(text); const category = stringValue("category") ?? inferCategory(text); const date = isoDateLabel("date") ?? whenLabel(text, now);
      const chips = apply([{ id: "amount", label: "amount", value: amount ? money(amount) : null, icon: "dollar" }, { id: "merchant", label: "merchant", value: merchantName }, { id: "category", label: "category", value: category }, { id: "date", label: "date", value: date, icon: "calendar" }]);
      return draft(schema, merchantName || "Expense", chips, { amount, merchant: merchantName, category, ...extracted }, compact([merchantName || "Expense", amount ? money(amount) : null]).join(" · "));
    }
    case "convert": {
      const c = Object.keys(extracted).length ? null : conversion(text);
      const isCurrency = rawString("kind") === "currency";
      const value = numberValue("value") ?? c?.value;
      const from = rawString("from") ?? c?.from;
      const to = rawString("to") ?? c?.to;
      const fromLabel = rawString("from_label") ?? from ?? null;
      const toLabel = rawString("to_label") ?? to ?? null;
      const fromSymbol = rawString("from_symbol");
      const toSymbol = rawString("to_symbol");
      const rate = numberValue("rate");
      const result = numberValue("result") ?? numberValue("answer_value") ?? (!isCurrency && value !== undefined && from && to ? convert(value, from.toLowerCase(), to.toLowerCase()) : null);
      const assumed = extracted.from_assumed === true;
      // Money reads as money: symbol in front, two decimals, and the rate that produced it.
      const amount = (n: number, symbol: string | null, code: string | null) => isCurrency ? `${symbol ?? ""}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${code ?? ""}`.trim() : `${round(n)} ${code ?? ""}`.trim();
      const chips = apply([
        { id: "value", label: "value", value: value !== undefined && value !== null ? amount(value, fromSymbol, fromLabel) : null },
        { id: "from", label: "from", value: fromLabel ? (assumed ? `from ${fromLabel} (assumed)` : `from ${fromLabel}`) : null },
        { id: "to", label: "to", value: toLabel ? `to ${toLabel}` : null },
        { id: "rate", label: "rate", value: isCurrency && rate ? `1 ${fromLabel} = ${round(rate)} ${toLabel}` : null },
      ]);
      const answer = result === null ? null : amount(result, toSymbol, toLabel);
      return draft(schema, answer ?? "Convert", chips, { value, from, to, result, answer, ...extracted }, answer ?? "—");
    }
    case "random": {
      const named = stringList("options").length ? stringList("options") : choiceOptions(text);
      const kind = randomKind(rawString("kind"), text, named);
      // Only the kinds that choose between things keep an option list, and a list of
      // one is not a choice — it is the phrase itself echoed back as a chip.
      const parsed = NAMED_KINDS.includes(kind) ? named : [];
      const options = parsed.length > 1 ? parsed : [];
      const sides = intValue("dice_sides") ?? 6;
      const count = Math.min(5, Math.max(1, intValue("dice_count") ?? 2));
      const low = intValue("low") ?? 1;
      const high = intValue("high") ?? 100;
      const draws = Math.max(1, intValue("draws") ?? 1);
      const teams = Math.min(8, Math.max(2, intValue("teams") ?? 2));
      const label = stringValue("label");
      const chips = apply([
        ...(kind === "dice" ? [{ id: "dice", label: "dice", value: `${count}d${sides}` }] : []),
        ...(kind === "number" ? [{ id: "range", label: "range", value: `${low}–${high}` }] : []),
        ...(kind === "teams" ? [{ id: "teams", label: "teams", value: String(teams) }] : []),
        ...(draws > 1 && (kind === "number" || kind === "cards") ? [{ id: "draws", label: "draws", value: String(draws) }] : []),
        ...(options.length ? [{ id: "options", label: "options", value: options.join(", ") }] : []),
      ]);
      return draft(schema, label ?? RANDOM_TITLES[kind], chips, { kind, options, sides, count, low, high, draws, teams, modifier: intValue("modifier") ?? 0, ...extracted }, RANDOM_TITLES[kind]);
    }
    case "password": {
      const length = Math.min(64, Math.max(4, intValue("length") ?? 16));
      const flag = (id: string, fallback: boolean) => (typeof extracted[id] === "boolean" ? (extracted[id] as boolean) : fallback);
      const sets = { uppercase: flag("uppercase", true), lowercase: flag("lowercase", true), numbers: flag("numbers", true), symbols: flag("symbols", true) };
      const active = Object.entries(sets).filter(([, on]) => on).map(([id]) => id);
      const chips = apply([
        { id: "length", label: "length", value: `${length} chars` },
        { id: "sets", label: "character sets", value: active.length === 4 ? "All four" : active.join(", ") || null },
      ]);
      return draft(schema, "Password", chips, {
        length,
        ...sets,
        excludeSimilar: flag("exclude_similar", false),
        excludeAmbiguous: flag("exclude_ambiguous", false),
        ...extracted,
      }, `${length} characters`);
    }
    case "color": {
      const parsed = parseColorInput(text, rawString("hex"), stringList("stops"));
      const hex = parsed?.hex ?? "";
      const name = hex ? nearestName(hex) : null;
      const sentence = (value: string) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
      const typedName = parsed?.format === "name" ? sentence(text) : null;
      const gradientName = parsed?.format === "gradient" ? parsed.stops.map((stop) => sentence(nearestName(stop).name)).join(" → ") : null;
      const label = gradientName ?? stringValue("name") ?? typedName ?? (name ? (name.exact ? sentence(name.name) : `Near ${name.name}`) : null);
      return draft(schema, label ?? (hex || "Color"), [], { ...extracted, hex, format: parsed?.format ?? null, stops: parsed?.stops ?? [] }, compact([label, hex]).join(" · ") || "Pick a color");
    }
    case "contact": {
      const email = rawString("email") ?? text.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0] ?? null; const phone = rawString("phone") ?? text.match(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/)?.[0] ?? null; const name = stringValue("name") ?? (clean(text.replace(email ?? "", "").replace(phone ?? "", "").replace(/^(?:add|create|save)\s+(?:a\s+)?contact\s+(?:for)?\s*/i, "").replace(/\bat\s+.+$/i, "")) || "Contact"); const company = stringValue("company") ?? /\bat\s+([^,]+)$/i.exec(text)?.[1];
      const chips = apply([{ id: "phone", label: "phone", value: phone }, { id: "email", label: "email", value: email }, { id: "company", label: "company", value: company ? clean(company) : null }]);
      return draft(schema, name, chips, { name, email, phone, company, ...extracted }, compact([name, email || phone]).join(" · "));
    }
    case "goal": {
      const metric = rawString("metric") ?? /\b\d+(?:\.\d+)?\s*\w+/i.exec(text)?.[0] ?? null; const deadline = isoDateLabel("deadline") ?? whenLabel(text, now); const title = stringValue("title") ?? (clean(text.replace(/^(?:set|create|add)\s+(?:a\s+)?goal\s+(?:to|of)?\s*/i, "").replace(/\bby\b.*$/i, "")) || "Goal");
      const chips = apply([{ id: "metric", label: "metric", value: metric }, { id: "target", label: "target", value: rawString("target") }, { id: "deadline", label: "deadline", value: deadline, icon: "calendar" }]);
      return draft(schema, title, chips, { metric, deadline, ...extracted }, compact([title, metric]).join(" · "));
    }
    case "bookmark": {
      const url = rawString("url") ?? text.match(/https?:\/\/\S+/i)?.[0] ?? ""; const tags = stringList("tags").length ? stringList("tags") : hashtags(text); const host = url ? safeHost(url) : "";
      const chips = apply([{ id: "url", label: "url", value: url || null, kind: "url", icon: "link" }, { id: "tags", label: "tags", value: tags.join(", ") || null, icon: "hash" }]);
      return draft(schema, stringValue("title") ?? (host || "Bookmark"), chips, { url, host, tags, ...extracted }, host || url);
    }
    case "poll": {
      const options = stringList("options").length ? stringList("options") : choiceOptions(text); const question = stringValue("question") ?? (clean(text.replace(/^poll\s*/i, "").split(/\?|:/)[0]) || "Poll");
      const chips = apply([{ id: "options", label: "options", value: options.join(", ") || null }, { id: "multi", label: "multi-select", value: typeof extracted.multi === "boolean" && extracted.multi ? "On" : /\b(?:multiple|pick all|choose all)\b/i.test(text) ? "On" : null }]);
      return draft(schema, question, chips, { question, options, ...extracted }, `${options.length || 0} option${options.length === 1 ? "" : "s"}`);
    }
    case "trip": {
      const dest = stringValue("destination") ?? /\b(?:to|in|visit)\s+([^,]+?)(?=\s+(?:with|from|on|in|at|staying|hotel)\b|$)/i.exec(text)?.[1]; const start = isoDateLabel("start_date"); const end = isoDateLabel("end_date"); const date = start && end ? `${start} – ${end}` : start ?? whenLabel(text, now); const travelers = stringList("travelers").length ? stringList("travelers") : attendees(text); const lodging = stringValue("lodging") ?? /\b(?:staying at|hotel at|lodging at|hotel)\s+([^,]+)$/i.exec(text)?.[1];
      const chips = apply([{ id: "dates", label: "dates", value: date, icon: "calendar" }, { id: "travelers", label: "travelers", value: travelers.join(", ") || null, icon: "users" }, { id: "lodging", label: "lodging", value: lodging ? clean(lodging) : null, icon: "pin" }]);
      return draft(schema, dest ? clean(dest) : "Trip", chips, { destination: dest ? clean(dest) : null, travelers, lodging, ...extracted }, compact([dest ? clean(dest) : "Trip", date]).join(" · "));
    }
    case "weather": {
      const place = stringValue("place") ?? /\b(?:in|at|for)\s+([A-Za-z][\w'’.\- ]+?)(?=\s+(?:tomorrow|today|tonight|this|next|on|right now)\b|[?,.]|$)/i.exec(text)?.[1];
      const temp = numberValue("temp");
      const tempUnit = rawString("temp_unit") ?? "°";
      const feels = numberValue("feels_like");
      const description = stringValue("description") ?? stringValue("condition");
      const when = stringValue("when") ?? whenLabel(text, now);
      const wind = numberValue("wind_speed");
      const humidity = numberValue("humidity");
      const feelsApart = feels !== null && feels !== undefined && temp !== null && temp !== undefined && Math.abs(feels - temp) >= 2;
      const chips = apply([
        { id: "place", label: "place", value: stringValue("place") ?? (place ? clean(place) : null), icon: "pin" },
        { id: "when", label: "when", value: when, icon: "calendar" },
        ...(feelsApart ? [{ id: "feels", label: "feels like", value: `${round(feels)}${tempUnit}` }] : []),
        { id: "wind", label: "wind", value: wind === null || wind === undefined ? null : `${round(wind)} ${rawString("speed_unit") ?? ""}`.trim() },
        { id: "humidity", label: "humidity", value: humidity === null || humidity === undefined ? null : `${round(humidity)}%` },
      ]);
      const fullPlace = stringValue("place") ?? (place ? clean(place) : null);
      const shortPlace = stringValue("place_name") ?? (place ? clean(place) : null);
      const reading = temp === null || temp === undefined ? null : `${round(temp)}${tempUnit}`;
      return draft(schema, shortPlace ?? "Weather", chips, { place: fullPlace, when, ...extracted }, compact([reading, description]).join(" · ") || "—");
    }
  }
}

function draft(schema: SchemaId, title: string, chips: DraftChip[], data: Record<string, unknown>, summary: string): CardDraft { return { schema, title, chips, data, summary, actionLabel: `Add ${CARD_TYPES.find((card) => card.id === schema)?.label.toLowerCase() ?? schema}` }; }
function normalize(input: string): string { return input.replace(/\btomm?orrow\b/gi, "tomorrow").replace(/\s+/g, " ").trim(); }
function clean(value: string): string { const v = value.replace(/^[\s,;:.-]+|[\s,;:.-]+$/g, "").replace(/\s+/g, " ").trim(); return v ? v.charAt(0).toUpperCase() + v.slice(1) : ""; }
function titleFrom(text: string): string { return clean(removeDateAndTimeClauses(text).replace(/\b(?:with|at|in|on)\b.*$/i, "")); }
function compact<T>(items: Array<T | null | undefined | "">): T[] { return items.filter(Boolean) as T[]; }
function parseEvent(text: string, now: Date) { const dt = parseDateTime(text, now); const people = attendees(text); const place = location(text); const title = clean(removeDateAndTimeClauses(text.replace(/^(?:add|create|schedule|put)\s+(?:an?\s+)?(?:event\s+)?/i, "")).replace(/\s+with\b.*$/i, "").replace(/\s+(?:at|in|on)\b.*$/i, "")); return { title, date: dt?.toISOString() ?? null, dateLabel: dt ? formatDateLabel(dt, text, now) : null, timeLabel: dt && hasTime(text) ? formatTime(dt) : null, place, people }; }
function attendees(text: string): string[] {
  const match = /\bwith\s+(.+)$/i.exec(text);
  if (!match) return [];
  const peopleText = match[1]
    .replace(/\s+(?:(?:today|tonight|tomorrow)|next\s+\w+|(?:sunday|monday|tuesday|wednesday|thursday|friday|saturday)|(?:at|in|on)\s+.+|\d{1,2}(?::\d{2})?\s*(?:am|pm)?|\d+\s*(?:seconds?|secs?|minutes?|mins?|hours?|hrs?))\b.*$/i, "")
    .trim();
  return peopleText.split(/\s*(?:,|and)\s*/i).map(clean).filter(Boolean);
}
function location(text: string): string | null { const onVideo = /\bon\s+(zoom|teams|meet|google meet|webex|facetime)\b/i.exec(text); if (onVideo) return clean(onVideo[1]); const inMatch = /\bin\s+([^,]+?)(?=\s+(?:today|tomorrow|tonight|on|with|before|at)\b|$)/i.exec(text); if (inMatch) return clean(inMatch[1]); const at = /\bat\s+([^,]+?)(?=\s+(?:today|tomorrow|tonight|on|with|before|in)\b|$)/i.exec(text); if (!at || /^\d{1,2}(?::\d{2})?\s*(?:am|pm)?$/i.test(at[1])) return null; return clean(at[1]); }
export function isVideoPlace(place: string): boolean { return /\b(?:zoom|teams|meet|google meet|webex|facetime)\b/i.test(place); }
function parseDateTime(input: string, now: Date): Date | null {
  const text = normalize(input);
  const result = new Date(now);
  result.setSeconds(0, 0);
  let found = false;
  const explicit = parseExplicitDate(text, now) ?? parseHolidayDate(text, now);
  if (explicit) {
    result.setFullYear(explicit.getFullYear(), explicit.getMonth(), explicit.getDate());
    found = true;
  }
  if (/\btomorrow\b/i.test(text)) {
    result.setDate(result.getDate() + 1);
    found = true;
  } else if (/\btoday\b|\btonight\b|\bbefore bed\b/i.test(text)) found = true;
  else {
    const wi = weekdays.findIndex((d) => new RegExp(`\\b${d}\\b`, "i").test(text));
    if (wi >= 0) {
      result.setDate(result.getDate() + ((wi - result.getDay() + 7) % 7 || 7));
      found = true;
    }
  }
  const numeric = explicit ? null : /\b(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?\b/.exec(text);
  if (numeric) {
    result.setFullYear(numeric[3] ? Number(numeric[3].length === 2 ? `20${numeric[3]}` : numeric[3]) : result.getFullYear(), Number(numeric[1]) - 1, Number(numeric[2]));
    found = true;
  }
  const time = /\b(?:at\s*)?(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\b/i.exec(text);
  if (time) {
    let h = Number(time[1]);
    const p = time[3].toLowerCase().replaceAll(".", "");
    if (p === "pm" && h < 12) h += 12;
    if (p === "am" && h === 12) h = 0;
    result.setHours(h, Number(time[2] ?? 0), 0, 0);
    return result;
  }
  const bareAtTime = /\bat\s+(\d{1,2})(?=\s|$)/i.exec(text);
  if (bareAtTime) {
    let hour = Number(bareAtTime[1]);
    if (hour >= 1 && hour <= 11) hour += 12;
    result.setHours(hour, 0, 0, 0);
    return result;
  }
  const tf = /\b(?:at\s*)?([01]?\d|2[0-3]):([0-5]\d)\b/.exec(text);
  if (tf) {
    result.setHours(Number(tf[1]), Number(tf[2]), 0, 0);
    return result;
  }
  if (/\bbefore bed\b/i.test(text)) result.setHours(21, 0, 0, 0);
  else if (/\btonight\b/i.test(text)) result.setHours(19, 0, 0, 0);
  else if (/\bmorning\b/i.test(text)) result.setHours(9, 0, 0, 0);
  else if (found) result.setHours(9, 0, 0, 0);
  return found ? result : null;
}
function hasTime(text: string): boolean { return /\b(?:at\s*)?\d{1,2}(?::\d{2})?\s*(?:am|pm)\b|\bat\s+\d{1,2}\b|\b\d{1,2}:\d{2}\b|\bbefore bed\b|\btonight\b|\bmorning\b/i.test(text); }
function formatDateLabel(date: Date, source: string, now: Date, alwaysYear = false): string { const lower = source.toLowerCase(); if (hasExplicitDate(source) || parseHolidayDate(source, now)) return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: alwaysYear || date.getFullYear() !== now.getFullYear() ? "numeric" : undefined }); const weekday = weekdays.find((d) => new RegExp(`\\b${d}\\b`, "i").test(source)); if (weekday) return clean(weekday); if (/\btomorrow\b/i.test(source)) return "Tomorrow"; if (/\btoday\b|\btonight\b|\bbefore bed\b/i.test(source) && date.toDateString() === now.toDateString()) return /\bbefore bed\b/i.test(lower) ? "Tonight" : "Today"; return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: alwaysYear || date.getFullYear() !== now.getFullYear() ? "numeric" : undefined }); }
function formatTime(date: Date): string { return date.toLocaleTimeString(undefined, { hour: "numeric", minute: date.getMinutes() ? "2-digit" : undefined }).replace("AM", "AM").replace("PM", "PM"); }
function whenLabel(text: string, now: Date): string | null { if (/\bbefore bed\b/i.test(text)) return "Tonight / before bed"; const dt = parseDateTime(text, now); if (!dt) return null; const date = formatDateLabel(dt, text, now); return hasTime(text) ? `${date}, ${formatTime(dt)}` : date; }
function recurrence(text: string): string | null { const m = /\b(?:every|each)\s+(day|weekday|week|month|morning|evening|night)\b/i.exec(text); return m ? `Every ${m[1].toLowerCase()}` : /\bdaily\b/i.test(text) ? "Daily" : null; }
function shoppingItems(text: string): string[] { const cleaned = normalize(text).replace(/^(?:please\s+)?(?:buy|get|pick up|need|shopping list|grocery list|create grocery list for|make grocery list for|i need)\s*/i, "").replace(/\s+\b(?:at|from)\b.+$/i, "").replace(/[.!?]+$/, ""); return cleaned.split(/\s*,\s*|\s*;\s*|\s+and\s+/i).map((x) => clean(x.replace(/^(?:and|then)\s+/i, ""))).filter(Boolean); }
function checklistItems(text: string): string[] { const source = text.includes(":") ? text.split(":").slice(1).join(":") : text.replace(/^(?:make|create|add)?\s*(?:a\s*)?(?:checklist|todo|to do|packing list|list)\s*(?:of)?\s*/i, ""); return source.split(/\s*,\s*|\s*;\s*|\s+and\s+/i).map(clean).filter(Boolean); }
function extractDurationSeconds(input: string): number {
  if (/\bpomodoro\b/i.test(input)) return 25 * 60;
  const compactMatch = /\b(\d+(?:\.\d+)?)\s*h(?:ours?|rs?)?(?:\s*(\d+(?:\.\d+)?)\s*m(?:in(?:ute)?s?)?)?\b/i.exec(input);
  if (compactMatch) {
    return Math.round(Number(compactMatch[1] ?? 0) * 3600 + Number(compactMatch[2] ?? 0) * 60);
  }
  const matches = [...input.matchAll(/\b(\d+(?:\.\d+)?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s*(seconds?|secs?|sec|minutes?|mins?|min|hours?|hrs?|hr)\b/gi)];
  return matches.reduce((total, match) => {
    const amount = numberWords[match[1].toLowerCase()] ?? Number(match[1]);
    const unit = match[2].toLowerCase();
    if (unit.startsWith("hour") || unit.startsWith("hr")) return total + Math.round(amount * 3600);
    if (unit.startsWith("minute") || unit.startsWith("min")) return total + Math.round(amount * 60);
    return total + Math.round(amount);
  }, 0);
}
function extractTimerLabel(input: string): string {
  if (/\bpomodoro\b/i.test(input)) return "Focus";
  const stripped = input
    .replace(/\b(?:\d+(?:\.\d+)?)\s*h(?:ours?|rs?)?(?:\s*(?:\d+(?:\.\d+)?)\s*m(?:in(?:ute)?s?)?)?\b/ig, " ")
    .replace(/\b(?:\d+(?:\.\d+)?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s*(?:seconds?|secs?|sec|minutes?|mins?|min|hours?|hrs?|hr)\b/ig, " ")
    .replace(/\b(?:set|start|create|a|an|timer|for)\b/ig, " ");
  return clean(stripped) || "Timer";
}
function formatDurationWords(seconds: number): string {
  if (!seconds) return "—";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return compact([
    hours ? `${hours} hr` : null,
    minutes ? `${minutes} min` : null,
    !hours && !minutes && secs ? `${secs} sec` : null,
  ]).join(" ");
}
function amountOf(text: string): number { const m = /(?:[$€£]\s*)?(\d+(?:,\d{3})*(?:\.\d{1,2})?)/.exec(text); return m ? Number(m[1].replaceAll(",", "")) : 0; }
function percentTip(text: string): number { const m = /(\d+(?:\.\d+)?)\s*%\s*(?:tip)?/i.exec(text); return m ? Number(m[1]) : 0; }
function peopleCount(text: string): number | null { const m = /\b(?:between|among|for)\s+(\d+)\b|\b(\d+)\s+(?:people|persons|ways)\b/i.exec(text); return m ? Number(m[1] ?? m[2]) : null; }
function namesAfterBetween(text: string): string[] { const m = /\bbetween\s+(.+)$/i.exec(text); return m ? m[1].split(/\s*(?:,|and)\s*/i).map(clean).filter((x) => !/^\d+$/.test(x)) : []; }
function money(n: number): string { return `$${round(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`; }
function merchant(text: string): string | null { const m = /\b(?:at|from)\s+([^,]+?)(?=\s+(?:for|on|today|yesterday)\b|$)/i.exec(text); return m ? clean(m[1]) : null; }
function inferCategory(text: string): string | null { if (/\b(?:meal|lunch|dinner|restaurant|cafe|coffee)\b/i.test(text)) return "Meals"; if (/\b(?:taxi|uber|lyft|flight|train|hotel)\b/i.test(text)) return "Travel"; if (/\b(?:software|subscription|license)\b/i.test(text)) return "Software"; return null; }
function conversion(text: string): { value: number; from: string; to: string } | null { const m = /\b(?:convert\s+)?(\d+(?:\.\d+)?)\s*([a-z°]+)\s+(?:to|in)\s+([a-z°]+)\b/i.exec(text); return m ? { value: Number(m[1]), from: m[2].toLowerCase(), to: m[3].toLowerCase() } : null; }
function convert(value: number, from: string, to: string): number | null { const aliases: Record<string, string> = { miles: "mi", mile: "mi", kilometers: "km", kilometer: "km", meters: "m", meter: "m", feet: "ft", foot: "ft", pounds: "lb", pound: "lb", lbs: "lb", kilograms: "kg", celsius: "c", fahrenheit: "f", cups: "cup", liters: "l", litre: "l", ml: "ml" }; const f = aliases[from] ?? from; const t = aliases[to] ?? to; const table: Record<string, number> = { "km:mi": 0.621371, "mi:km": 1.60934, "m:ft": 3.28084, "ft:m": 0.3048, "kg:lb": 2.20462, "lb:kg": 0.453592, "l:ml": 1000, "ml:l": 0.001, "cup:ml": 236.588, "ml:cup": 1 / 236.588 }; if (f === "f" && t === "c") return (value - 32) * 5 / 9; if (f === "c" && t === "f") return value * 9 / 5 + 32; return table[`${f}:${t}`] ? value * table[`${f}:${t}`] : null; }
export const RANDOM_KINDS = ["dice", "number", "coin", "wheel", "bottle", "pick", "shuffle", "order", "teams", "sticks", "cards", "blackjack"] as const;
export type RandomKind = (typeof RANDOM_KINDS)[number];

export const RANDOM_TITLES: Record<RandomKind, string> = {
  dice: "Roll the dice",
  number: "Pick a number",
  coin: "Flip a coin",
  wheel: "Spin the wheel",
  bottle: "Spin the bottle",
  pick: "Pick one",
  shuffle: "Shuffle the order",
  order: "Deal the order",
  teams: "Make the teams",
  sticks: "Draw a stick",
  cards: "Draw a card",
  blackjack: "Blackjack",
};

/** Kinds that decide between named things, so an options chip earns its place. */
const NAMED_KINDS: readonly RandomKind[] = ["wheel", "bottle", "pick", "shuffle", "order", "teams"];

/** Luna and JEV name the kind; this only checks the name is one we can deal. */
export function randomKind(named: string | null, text: string, options: string[]): RandomKind {
  const lowered = named?.trim().toLowerCase() ?? "";
  if ((RANDOM_KINDS as readonly string[]).includes(lowered)) return lowered as RandomKind;
  return options.length >= 2 ? "pick" : "dice";
}

function choiceOptions(text: string): string[] { const source = text.split(/\b(?:between|options?|choices?)\b:?/i)[1] ?? text.replace(/^(?:randomly\s+)?(?:pick|choose|poll|vote)\s*/i, ""); return source.split(/\s*,\s*|\s*;\s*|\s+or\s+|\s+and\s+/i).map(clean).filter(Boolean); }
function hashtags(text: string): string[] { return [...text.matchAll(/#([\w-]+)/g)].map((m) => m[1]); }
function extractExpression(text: string): { eval: string; display: string } | null {
  let expression = normalize(text)
    .replace(/^(?:what\s+is|what[’']s|calculate|calc|compute|how\s+much\s+is|solve|eval)\s+/i, "")
    .replace(/\s*(?:[?=])+\s*$/g, "")
    .replace(/\bdivided\s+by\b/ig, "/")
    .replace(/\bover\b/ig, "/")
    .replace(/[÷]/g, "/")
    .replace(/[×]/g, "*")
    .replace(/\b(?:times|x)\b/ig, "*")
    .replace(/\bplus\b/ig, "+")
    .replace(/\bminus\b/ig, "-")
    .replace(/\bsquared\b/ig, "^2")
    .replace(/\b(\d+(?:,\d{3})*(?:\.\d+)?)\s*percent\s+of\s+(\d+(?:,\d{3})*(?:\.\d+)?)\b/ig, "$1% of $2")
    .replace(/\b(\d+(?:,\d{3})*(?:\.\d+)?)\s*%\s*of\s+(\d+(?:,\d{3})*(?:\.\d+)?)\b/ig, "$1% of $2")
    .trim();
  if (!expression || !/[\d)]/.test(expression) || !/(?:[+\-*/^]|%\s*of)/i.test(expression)) return null;
  if (!/^[\d\s,.()+\-*/^%of]+$/i.test(expression)) return null;
  expression = expression.replace(/\s+/g, " ");
  const display = expression
    .replace(/\s*\*\s*/g, " × ")
    .replace(/\s*\/\s*/g, " ÷ ")
    .replace(/\s*\+\s*/g, " + ")
    .replace(/\s+-\s*/g, " - ")
    .replace(/\s*\^\s*/g, "^")
    .replace(/\s+/g, " ")
    .trim();
  return { eval: expression, display };
}
function safeCalculate(expression: string): number | null { const pct = /^\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*%\s*of\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*$/i.exec(expression); if (pct) return round(Number(pct[1].replaceAll(",", "")) / 100 * Number(pct[2].replaceAll(",", ""))); if (!/^[\d\s.,+\-*/()^]+$/.test(expression)) return null; try { const tokens = expression.match(/\d+(?:,\d{3})*(?:\.\d+)?|[()+\-*/^]/g); if (!tokens) return null; let i = 0; const parseExpression = (): number => { let v = parseTerm(); while (tokens[i] === "+" || tokens[i] === "-") { const op = tokens[i++]; const r = parseTerm(); v = op === "+" ? v + r : v - r; } return v; }; const parseTerm = (): number => { let v = parsePower(); while (tokens[i] === "*" || tokens[i] === "/") { const op = tokens[i++]; const r = parsePower(); v = op === "*" ? v * r : v / r; } return v; }; const parsePower = (): number => { let v = parseFactor(); while (tokens[i] === "^") { i++; v = v ** parseFactor(); } return v; }; const parseFactor = (): number => { const token = tokens[i++]; if (token === "(") { const v = parseExpression(); if (tokens[i++] !== ")") throw new Error(); return v; } if (token === "-") return -parseFactor(); const n = Number(token.replaceAll(",", "")); if (!Number.isFinite(n)) throw new Error(); return n; }; const value = parseExpression(); return i === tokens.length && Number.isFinite(value) ? round(value) : null; } catch { return null; } }
function safeHost(url: string): string { try { return new URL(url).host.replace(/^www\./, ""); } catch { return url; } }
function startOfDay(date: Date): Date { return new Date(date.getFullYear(), date.getMonth(), date.getDate()); }
function round(value: number): number { return Math.round(value * 100) / 100; }
function dateFromIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
}
function formatTimeFromHHMM(value: string): string | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return null;
  const date = new Date();
  date.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return formatTime(date);
}
function formatExtractedDateTime(values: Record<string, unknown>, now: Date): string | null {
  const dateValue = typeof values.date === "string" ? values.date : null;
  const timeValue = typeof values.time === "string" ? values.time : null;
  const date = dateValue ? dateFromIsoDate(dateValue) : null;
  const dateLabel = date && dateValue ? formatDateLabel(date, dateValue, now) : null;
  const timeLabel = timeValue ? formatTimeFromHHMM(timeValue) : null;
  return compact([dateLabel, timeLabel]).join(", ") || null;
}

function parseExplicitDate(text: string, now: Date): Date | null {
  const iso = /\b(\d{4})-(\d{2})-(\d{2})\b/.exec(text);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const monthPattern = "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\.?";
  const monthFirst = new RegExp(`\\b${monthPattern}\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(\\d{4}))?\\b`, "i").exec(text);
  if (monthFirst) return dateFromParts(monthIndex[monthFirst[1].replace(".", "").toLowerCase()], Number(monthFirst[2]), monthFirst[3] ? Number(monthFirst[3]) : null, now);
  const dayFirst = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+${monthPattern}(?:,?\\s*(\\d{4}))?\\b`, "i").exec(text);
  if (dayFirst) return dateFromParts(monthIndex[dayFirst[2].replace(".", "").toLowerCase()], Number(dayFirst[1]), dayFirst[3] ? Number(dayFirst[3]) : null, now);
  return null;
}
function dateFromParts(month: number, day: number, explicitYear: number | null, now: Date): Date {
  let year = explicitYear ?? now.getFullYear();
  let date = new Date(year, month, day);
  if (!explicitYear && startOfDay(date).getTime() < startOfDay(now).getTime()) {
    year += 1;
    date = new Date(year, month, day);
  }
  return date;
}
function parseHolidayDate(text: string, now: Date): Date | null {
  const lower = text.toLowerCase();
  if (/\bchristmas\b/.test(lower)) return dateFromParts(11, 25, null, now);
  if (/\bnew years?\b|\bnew year's\b/.test(lower)) return dateFromParts(0, 1, null, now);
  if (/\bhalloween\b/.test(lower)) return dateFromParts(9, 31, null, now);
  if (/\bvalentine'?s\b/.test(lower)) return dateFromParts(1, 14, null, now);
  if (/\bjuly 4th\b|\bindependence day\b/.test(lower)) return dateFromParts(6, 4, null, now);
  if (/\bthanksgiving\b/.test(lower)) return thanksgiving(now);
  return null;
}
function thanksgiving(now: Date): Date {
  let date = fourthThursday(now.getFullYear());
  if (startOfDay(date).getTime() < startOfDay(now).getTime()) date = fourthThursday(now.getFullYear() + 1);
  return date;
}
function fourthThursday(year: number): Date {
  const date = new Date(year, 10, 1);
  const offset = (4 - date.getDay() + 7) % 7;
  date.setDate(1 + offset + 21);
  return date;
}
function hasExplicitDate(text: string): boolean {
  return Boolean(parseExplicitDate(text, new Date()) || new RegExp(`\\b(?:${monthNames.join("|").replace("september", "sept(?:ember)?")})\\b`, "i").test(text) || /\b\d{4}-\d{2}-\d{2}\b/.test(text));
}
function removeDateAndTimeClauses(text: string): string {
  const monthPattern = "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\.?";
  return text
    .replace(new RegExp(`\\s+(?:on\\s+)?${monthPattern}\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s*\\d{4})?.*$`, "i"), "")
    .replace(new RegExp(`\\s+(?:on\\s+)?\\d{1,2}(?:st|nd|rd|th)?\\s+${monthPattern}(?:,?\\s*\\d{4})?.*$`, "i"), "")
    .replace(/\s+\d{4}-\d{2}-\d{2}.*$/i, "")
    .replace(/\s+(?:today|tomorrow|tonight|before bed|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b.*$/i, "");
}
function countdownTitle(text: string): string {
  const monthPattern = "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\.?";
  return clean(text
    .replace(/\bcountdown\b/ig, "")
    .replace(/\bdays?\s+(?:until|to)\b/ig, "")
    .replace(/^\s*(?:to|until|till)\s+/i, "")
    .replace(new RegExp(`\\s+(?:on|by|at|in)\\s+${monthPattern}\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s*\\d{4})?.*$`, "i"), "")
    .replace(new RegExp(`\\s+(?:on|by|at|in)\\s+\\d{1,2}(?:st|nd|rd|th)?\\s+${monthPattern}(?:,?\\s*\\d{4})?.*$`, "i"), "")
    .replace(/\s+(?:on|by|at|in)\s+\d{4}-\d{2}-\d{2}.*$/i, "")
    .replace(/\s+(?:on|by|at|in)\s+(?:today|tomorrow|christmas|new years?|new year's|halloween|thanksgiving|valentine'?s|july 4th|independence day).*$/i, ""));
}
