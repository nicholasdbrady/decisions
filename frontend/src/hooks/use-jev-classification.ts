"use client";

import { useEffect, useRef, useState } from "react";

import { classifyText } from "@/lib/classification-client";
import type { ClassificationResult, SchemaId } from "@/lib/contracts";

type ClassificationStatus = "idle" | "debouncing" | "classifying" | "ready" | "error";

type UseJevClassificationOptions = {
  text: string;
  currentSchema: SchemaId | null;
  lockedSchema?: SchemaId | null;
  debounceMs?: number;
  baseUrl?: string;
};

type JevClassificationState = {
  status: ClassificationStatus;
  generation: number;
  result: ClassificationResult | null;
  error: string | null;
};

export function useJevClassification({
  text,
  currentSchema,
  lockedSchema = null,
  debounceMs = 250,
  baseUrl,
}: UseJevClassificationOptions): JevClassificationState {
  const generationRef = useRef(0);
  const currentSchemaRef = useRef(currentSchema);
  const [state, setState] = useState<JevClassificationState>({ status: "idle", generation: 0, result: null, error: null });

  useEffect(() => {
    currentSchemaRef.current = lockedSchema ?? currentSchema;
  }, [currentSchema, lockedSchema]);

  useEffect(() => {
    const normalizedText = text.trim();
    generationRef.current += 1;
    const generation = generationRef.current;

    if (!normalizedText) {
      setState({ status: "idle", generation, result: null, error: null });
      return;
    }

    const controller = new AbortController();
    setState((previous) => ({ ...previous, status: "debouncing", generation, error: null }));

    const timeout = window.setTimeout(() => {
      setState((previous) => ({ ...previous, status: "classifying", generation }));
      void classifyText(
        { text: normalizedText, generation, current_schema: currentSchemaRef.current },
        { baseUrl, signal: controller.signal },
      )
        .then((result) => {
          if (generation !== generationRef.current) return;
          if (!lockedSchema && result.decision.selected_schema) currentSchemaRef.current = result.decision.selected_schema;
          setState({ status: "ready", generation, result, error: null });
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted || generation !== generationRef.current) return;
          setState({ status: "error", generation, result: null, error: error instanceof Error ? error.message : "Classification failed" });
        });
    }, debounceMs);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [baseUrl, debounceMs, lockedSchema, text]);

  return state;
}
