"""The convert surface: a value, two unit pickers, and a deterministic result."""

from typing import Any

from backend import units
from backend.surfaces.catalog import (
    bind,
    button,
    card,
    column,
    field,
    picker,
    row,
    text,
)
from backend.surfaces.spec import Surface

ACTION = "convert"

# Without these the card paints empty pickers and no result, so the generic
# surface (which shows whatever the compute lane did return) is the better card.
REQUIRED = ("value", "from", "to")


def unit_options(category: str | None) -> list[dict[str, str]]:
    for entry in units.catalog():
        if entry["id"] == category:
            return [{"label": f"{u['label']} ({u['symbol']})", "value": u["id"]} for u in entry["units"]]
    return []


def build(values: dict[str, Any]) -> Surface:
    options = unit_options(values.get("category"))
    components = [
        card("body"),
        column("body", ["title", "from_row", "to_row", "recompute"]),
        text("title", bind("title"), variant="h3"),
        row("from_row", ["value", "from"], align="end"),
        field("value", "Value", "value", variant="number"),
        picker("from", "From", "from", options),
        row("to_row", ["result", "to"], align="end"),
        text("result", bind("result_text"), variant="h2"),
        picker("to", "To", "to", options),
        *button(
            "recompute",
            "Convert",
            ACTION,
            {"value": bind("value"), "from": bind("from"), "to": bind("to")},
        ),
    ]
    return Surface(components=components, data=data(values))


def data(computed: dict[str, Any]) -> dict[str, Any]:
    result = computed.get("result")
    to_label = computed.get("to_label") or computed.get("to") or ""
    return {
        "title": f"{computed.get('from_label') or computed.get('from')} to {to_label}",
        "value": str(computed.get("value", "")),
        "from": [computed.get("from")] if computed.get("from") else [],
        "to": [computed.get("to")] if computed.get("to") else [],
        "result_text": "—" if result is None else f"{result:g} {to_label}".strip(),
        "computed_by": computed.get("computed_by"),
    }
