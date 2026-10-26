from __future__ import annotations

import json
from typing import Any
from urllib.parse import urlparse

from backend.surfaces.catalog import bind, card, column, graph
from backend.surfaces.spec import Surface


def build(values: dict[str, Any]) -> Surface:
    normalized = {
        "lead": _text(values.get("lead")),
        "caption": _text(values.get("caption")),
        "kind": _kind(values.get("kind")),
        "scheme": "semantic" if values.get("scheme") == "semantic" else "palette",
        "unit": _text(values.get("unit")),
        "labels": _strings(values.get("labels"), 48),
        "series": _series(values.get("series")),
        "points": _points(values.get("points")),
        "links": _links(values.get("links")),
        "range": _range(values.get("range")),
        "source_name": _text(values.get("source_name")),
        "source_url": _url(values.get("source_url")),
    }
    return Surface(
        components=[
            card("body"),
            column("body", ["graph"]),
            graph("graph", bind("graph"), streaming=bind("streaming")),
        ],
        data={
            "graph": json.dumps(normalized),
            "streaming": bool(values.get("streaming")),
        },
    )


def _text(value: Any) -> str:
    return str(value).strip() if value is not None else ""


def _kind(value: Any) -> str:
    allowed = {
        "column",
        "bar",
        "clustered-column",
        "stacked-column",
        "line",
        "area",
        "stacked-area",
        "zone",
        "pie",
        "donut",
        "funnel",
        "stacked-funnel",
        "combo",
        "sankey",
        "kpi",
        "gauge",
        "heatmap",
        "scatter",
    }
    candidate = _text(value)
    return candidate if candidate in allowed else "line"


def _strings(value: Any, limit: int) -> list[str]:
    if not isinstance(value, list):
        return []
    return [_text(item) for item in value[:limit] if _text(item)]


def _numbers(value: Any, limit: int = 120) -> list[float]:
    if not isinstance(value, list):
        return []
    result: list[float] = []
    for item in value[:limit]:
        if isinstance(item, int | float) and not isinstance(item, bool):
            result.append(float(item))
    return result


def _series(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []
    result: list[dict[str, Any]] = []
    for item in value[:8]:
        if not isinstance(item, dict):
            continue
        name = _text(item.get("name"))
        values = _numbers(item.get("values"))
        if name and values:
            result.append({"name": name, "values": values})
    return result


def _points(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []
    result: list[dict[str, Any]] = []
    for item in value[:120]:
        if not isinstance(item, dict):
            continue
        x, y = item.get("x"), item.get("y")
        if not isinstance(x, int | float) or not isinstance(y, int | float):
            continue
        result.append(
            {
                "x": float(x),
                "y": float(y),
                "label": _text(item.get("label")),
                "series": _text(item.get("series")),
            }
        )
    return result


def _links(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []
    result: list[dict[str, Any]] = []
    for item in value[:40]:
        if not isinstance(item, dict):
            continue
        source, target, amount = (
            _text(item.get("source")),
            _text(item.get("target")),
            item.get("value"),
        )
        if source and target and isinstance(amount, int | float) and amount >= 0:
            result.append({"source": source, "target": target, "value": float(amount)})
    return result


def _range(value: Any) -> dict[str, float] | None:
    if not isinstance(value, dict):
        return None
    minimum, maximum, current = (
        value.get("minimum"),
        value.get("maximum"),
        value.get("value"),
    )
    if not all(
        isinstance(item, int | float) and not isinstance(item, bool)
        for item in (minimum, maximum, current)
    ):
        return None
    return {
        "minimum": float(minimum),
        "maximum": float(maximum),
        "value": float(current),
    }


def _url(value: Any) -> str:
    candidate = _text(value)
    try:
        parsed = urlparse(candidate)
    except ValueError:
        return ""
    return candidate if parsed.scheme in {"http", "https"} and parsed.netloc else ""
