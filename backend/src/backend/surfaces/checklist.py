"""The checklist surface: a compact, locally interactive task object."""

import json
from datetime import date
from typing import Any

from backend.surfaces.catalog import bind, card, checklist, chips, column, header
from backend.surfaces.spec import Surface

REQUIRED = ("items",)


def build(values: dict[str, Any]) -> Surface:
    children = ["head", "tasks"]
    components = [
        card("body"),
        column("body", children),
        header("head", bind("title")),
        checklist("tasks", bind("items"), bind("done")),
    ]

    due = _date(values.get("due"))
    if due:
        children.append("details")
        components.append(chips("details", bind("details")))

    return Surface(components=components, data=data(values, due))


def data(values: dict[str, Any], due: str | None = None) -> dict[str, Any]:
    items = [str(item).strip() for item in values.get("items", []) if str(item).strip()]
    done = {
        str(item).strip()
        for item in values.get("done", [])
        if str(item).strip()
    }
    title = str(values.get("title") or "").strip() or "Checklist"
    due = _date(values.get("due")) if due is None else due

    return {
        "title": title,
        "items": json.dumps(items),
        "done": json.dumps([item for item in items if item in done]),
        "details": json.dumps(
            [{"label": f"Due {due}", "icon": "calendar"}] if due else []
        ),
    }


def _date(value: Any) -> str:
    if not value:
        return ""
    try:
        parsed = date.fromisoformat(str(value)[:10])
    except ValueError:
        return str(value)
    return f"{parsed.strftime('%b')} {parsed.day}, {parsed.year}"
