"use client";

import { useEffect, useRef, useState } from "react";

export type JevDecision = {
  choice: string | null;
  confidence: number;
  probabilities: Record<string, number>;
  axes: Record<string, number>;
};

type DecideOption = { id: string; summary: string };

type UseJevDecisionOptions = {
  text: string;
  topic: string;
  options: DecideOption[];
  axes: Record<string, string>;
  active: boolean;
  debounceMs?: number;
  baseUrl?: string;
};

/**
 * Ask JEV a closed-set question about the text instead of writing rules for it.
 * Runs beside extraction, so the answer arrives while the fields are still landing.
 */
export function useJevDecision({
  text,
  topic,
  options,
  axes,
  active,
  debounceMs = 250,
  baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:8000",
}: UseJevDecisionOptions): JevDecision | null {
  const generationRef = useRef(0);
  const [entry, setEntry] = useState<{ text: string; value: JevDecision } | null>(null);
  const optionsKey = JSON.stringify(options);
  const axesKey = JSON.stringify(axes);
  const normalized = text.trim();

  useEffect(() => {
    const query = text.trim();
    generationRef.current += 1;
    const generation = generationRef.current;
    if (!active || !query) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      void fetch(`${baseUrl}/api/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: query,
          topic,
          options: JSON.parse(optionsKey) as DecideOption[],
          axes: JSON.parse(axesKey) as Record<string, string>,
        }),
        signal: controller.signal,
      })
        .then((response) => {
          if (!response.ok) {
            console.warn(`JEV decide(${topic}) failed: ${response.status}`);
            return null;
          }
          return response.json() as Promise<JevDecision>;
        })
        .then((result) => {
          if (generation !== generationRef.current || !result) return;
          setEntry({ text: query, value: result });
        })
        .catch(() => undefined);
    }, debounceMs);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [active, axesKey, baseUrl, debounceMs, optionsKey, text, topic]);

  // An answer belongs to the text that asked for it; anything else is stale.
  return active && entry?.text === normalized ? entry.value : null;
}
