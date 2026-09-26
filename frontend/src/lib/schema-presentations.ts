import { CARD_TYPES, type CardDraft } from "@/lib/draft-view";

export type PresentationField = { label: string; value: string; meta: string };
export type SchemaPresentation = { name: string; objectLabel: string; actionLabel: string; fields: PresentationField[] };

export function createSchemaPresentation(view: CardDraft): SchemaPresentation {
  return {
    name: CARD_TYPES.find((card) => card.id === view.schema)?.label ?? view.schema,
    objectLabel: view.schema,
    actionLabel: view.actionLabel,
    fields: view.chips.map((chip) => ({ label: chip.label.toUpperCase(), value: chip.value ?? "NOT SET", meta: chip.value ? "from command" : "empty" })),
  };
}
