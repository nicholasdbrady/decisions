import { z } from "zod";

import { schemaIdSchema } from "@/lib/contracts";
import type { CardDraft } from "@/lib/draft-view";

const HISTORY_STORAGE_KEY = "jev-omnibar-card-history-v2";
const MAX_HISTORY_ITEMS = 50;

const historyItemSchema = z
  .object({
    id: z.string(),
    created_at: z.string(),
    input: z.string(),
    schema: schemaIdSchema,
    title: z.string(),
    summary: z.string(),
  })
  .strict();

const historySchema = z.array(historyItemSchema).max(MAX_HISTORY_ITEMS);

export type HistoryItem = z.infer<typeof historyItemSchema>;

export type HistoryLoadResult =
  | { ok: true; items: HistoryItem[] }
  | { ok: false; items: []; error: string };

export function loadHistory(storage: Storage = window.localStorage): HistoryLoadResult {
  const serialized = storage.getItem(HISTORY_STORAGE_KEY);
  if (serialized === null) return { ok: true, items: [] };
  try {
    return { ok: true, items: historySchema.parse(JSON.parse(serialized)) };
  } catch (error: unknown) {
    return { ok: false, items: [], error: error instanceof Error ? error.message : "History is invalid" };
  }
}

export function saveHistory(items: HistoryItem[], storage: Storage = window.localStorage): void {
  storage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(historySchema.parse(items.slice(0, MAX_HISTORY_ITEMS))));
}

export function addHistoryItem(input: string, draft: CardDraft, existing: HistoryItem[]): HistoryItem[] {
  const item = historyItemSchema.parse({
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    input,
    schema: draft.schema,
    title: draft.title,
    summary: draft.summary,
  });
  return [item, ...existing].slice(0, MAX_HISTORY_ITEMS);
}

export function removeHistoryItem(id: string, existing: HistoryItem[]): HistoryItem[] {
  return existing.filter((item) => item.id !== id);
}

export function clearHistory(storage: Storage = window.localStorage): void {
  storage.removeItem(HISTORY_STORAGE_KEY);
}
