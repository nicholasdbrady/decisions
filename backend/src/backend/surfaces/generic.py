"""The fallback surface: any card JEV picks renders as a readable summary.

Phase 2 replaces these one at a time with purpose-built surfaces. Until then a
card is always paintable, so JEV is never blocked on missing UI.
"""

from datetime import date, datetime
from typing import Any

from backend.contracts import SchemaId
from backend.extract import CARD_FIELDS
from backend.surfaces.catalog import bind, card, column, metric, row, text
from backend.surfaces.spec import Surface

# Values that are plumbing, not content.
HIDDEN = {"computed_by", "category", "kind", "answer_value", "window_days", "window_hours"}


def build(schema: SchemaId, values: dict[str, Any]) -> Surface:
    rows = [(key, _render(value)) for key, value in _ordered(schema, values)]
    rows = [(key, shown) for key, shown in rows if shown]

    children = ["title"]
    components = [
        card("body"),
        column("body", children),
        text("title", bind("title"), variant="h3"),
    ]

    headline = values.get("answer") or values.get("result")
    if headline is not None:
        children.append("headline")
        components.append(metric("headline", "headline", caption=bind("headline_caption")))

    data: dict[str, Any] = {
        "title": _title(schema, values),
        "headline": "" if headline is None else _render(headline),
        "headline_caption": "",
    }
    # A caption that repeats the title is noise.
    caption = _label(schema.value)
    if caption.lower() != data["title"].lower():
        data["headline_caption"] = caption
    for index, (key, shown) in enumerate(rows):
        label_id, value_id, row_id = f"l{index}", f"v{index}", f"r{index}"
        children.append(row_id)
        components.append(row(row_id, [label_id, value_id], justify="spaceBetween"))
        components.append(text(label_id, _label(key), variant="caption"))
        components.append(text(value_id, bind(value_id)))
        data[value_id] = shown
    return Surface(components=components, data=data)


def _ordered(schema: SchemaId, values: dict[str, Any]) -> list[tuple[str, Any]]:
    """Declared fields first, in their declared order, then anything computed added."""
    declared = list(CARD_FIELDS.get(schema, {}))
    rest = [key for key in values if key not in declared]
    return [
        (key, values[key])
        for key in [*declared, *rest]
        if key in values and key not in HIDDEN and key not in ("title", "answer", "result")
    ]


def _title(schema: SchemaId, values: dict[str, Any]) -> str:
    for key in ("title", "name", "task", "label", "question", "destination", "place", "expression"):
        value = values.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return schema.value.replace("_", " ").capitalize()


def _label(key: str) -> str:
    return key.replace("_", " ").capitalize()


def _render(value: Any) -> str:
    if value is None or value == "" or value == [] or value == {}:
        return ""
    if isinstance(value, bool):
        return "Yes" if value else "No"
    if isinstance(value, list):
        return ", ".join(_render(item) for item in value if _render(item))
    if isinstance(value, dict):
        return ""
    if isinstance(value, datetime | date):
        return value.isoformat()
    if isinstance(value, float):
        return f"{value:g}"
    return str(value)
