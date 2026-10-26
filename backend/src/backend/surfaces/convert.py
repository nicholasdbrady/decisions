"""The convert surface: a value, two unit pickers, and a deterministic result."""

import json
from typing import Any

from backend import units
from backend.surfaces.catalog import bind, card, column, conversion
from backend.surfaces.spec import Surface

ACTION = "convert"

# Without these the card paints empty pickers and no result, so the generic
# surface (which shows whatever the compute lane did return) is the better card.
REQUIRED = ("value", "from", "to")


def unit_options(category: str | None) -> list[dict[str, str]]:
    for entry in units.catalog():
        if entry["id"] == category:
            return [
                {"label": f"{u['label']} ({u['symbol']})", "value": u["id"]}
                for u in entry["units"]
            ]
    return []


def build(values: dict[str, Any]) -> Surface:
    components = [
        card("body"),
        column("body", ["convert"]),
        conversion(
            "convert",
            bind("value"),
            bind("result_text"),
            bind("from"),
            bind("to"),
            bind("options"),
        ),
    ]
    return Surface(components=components, data=data(values))


def data(computed: dict[str, Any]) -> dict[str, Any]:
    result = computed.get("result")
    options = unit_options(computed.get("category"))
    return {
        "value": str(computed.get("value", "")),
        "from": str(computed.get("from") or ""),
        "to": str(computed.get("to") or ""),
        "result_text": "—" if result is None else f"{result:g}",
        "options": json.dumps(options),
        "computed_by": computed.get("computed_by"),
    }
