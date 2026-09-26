import { z } from "zod";

export const schemaIdSchema = z.enum([
  "event",
  "reminder",
  "shopping",
  "checklist",
  "timer",
  "countdown",
  "habit",
  "note",
  "calc",
  "split",
  "expense",
  "convert",
  "random",
  "color",
  "contact",
  "goal",
  "bookmark",
  "poll",
  "trip",
  "weather",
  "password",
]);

export type SchemaId = z.infer<typeof schemaIdSchema>;

export const classificationRequestSchema = z
  .object({
    text: z.string().min(1).max(4000),
    generation: z.number().int().nonnegative().default(0),
    current_schema: schemaIdSchema.nullable().default(null),
  })
  .strict();

export type ClassificationRequest = z.infer<typeof classificationRequestSchema>;

export const classificationResultSchema = z
  .object({
    generation: z.number().int().nonnegative(),
    candidates: z.array(
      z
        .object({
          schema: schemaIdSchema,
          probability: z.number().min(0).max(1),
        })
        .strict(),
    ),
    decision: z
      .object({
        accepted: z.boolean(),
        selected_schema: schemaIdSchema.nullable(),
        reason: z.enum([
          "initial_match",
          "same_schema",
          "below_confidence_threshold",
          "below_margin_threshold",
          "hysteresis_hold",
          "clear_switch",
        ]),
        confidence: z.number().min(0).max(1),
        margin: z.number().min(0).max(1),
      })
      .strict(),
    diagnostics: z
      .object({
        request_id: z.string().nullable(),
        provider: z.string(),
        model: z.string(),
        latency_ms: z.number().int().nonnegative(),
        input_tokens: z.number().int().nonnegative().nullable(),
        output_tokens: z.number().int().nonnegative().nullable(),
        cost: z.number().nonnegative().nullable(),
        needs_clarification: z.number().min(0).max(1),
        has_enough_evidence: z.number().min(0).max(1),
        signals: z.record(z.string(), z.number()).default({}),
      })
      .strict(),
  })
  .strict();

export type ClassificationResult = z.infer<typeof classificationResultSchema>;

export const expansionProviderSchema = z.enum(["foundry", "foundry-web", "jev"]);
export type ExpansionProvider = z.infer<typeof expansionProviderSchema>;

export const dishModeSchema = z.enum(["homemade", "store-bought"]);
export type DishMode = z.infer<typeof dishModeSchema>;

export const expansionRequestSchema = z
  .object({
    text: z.string(),
    card: z.literal("shopping"),
    providers: z.array(expansionProviderSchema).optional(),
    dish_modes: z.record(z.string(), dishModeSchema).optional(),
  })
  .strict();

export const expansionResponseSchema = z
  .object({
    title: z.string().nullable().optional(),
    dishes_parsed: z.array(z.string()),
    results: z.array(
      z
        .object({
          provider: expansionProviderSchema,
          model: z.string(),
          latency_ms: z.number().nonnegative(),
          ok: z.boolean(),
          error: z.string().nullable(),
          title: z.string().nullable().optional(),
          sources: z.array(z.string()),
          dishes: z.array(
            z
              .object({
                name: z.string(),
                mode: dishModeSchema,
                items: z.array(z.string()),
              })
              .strict(),
          ),
        })
        .strict(),
    ),
  })
  .strict();

export type ExpansionResponse = z.infer<typeof expansionResponseSchema>;

export const extractRequestSchema = z
  .object({
    text: z.string(),
    card: schemaIdSchema,
    now: z.string(),
    timezone: z.string(),
    web_search: z.boolean().optional(),
    lane: z.enum(["fast", "web", "code"]).optional(),
  })
  .strict();

export type ExtractRequest = z.infer<typeof extractRequestSchema>;

export const extractResponseSchema = z
  .object({
    card: schemaIdSchema,
    model: z.string(),
    latency_ms: z.number().nonnegative(),
    ok: z.boolean(),
    error: z.string().nullable(),
    source: z.enum(["luna", "luna-web", "luna-python"]).default("luna"),
    sources: z.array(z.string()).default([]),
    code: z.array(z.string()).default([]),
    values: z.record(z.string(), z.unknown()).default({}),
  })
  .strict();

export type ExtractResponse = z.infer<typeof extractResponseSchema>;

export const judgeResponseSchema = z.object({
  model: z.string(),
  latency_ms: z.number().nonnegative(),
  choice: z.string(),
  confidence: z.number(),
  probabilities: z.record(z.string(), z.number()),
});

export type JudgeResponse = z.infer<typeof judgeResponseSchema>;
