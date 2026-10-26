"""The calculation surface: one focused answer with optional execution evidence."""

from typing import Any

from backend.surfaces.catalog import card, column, metric, panel
from backend.surfaces.spec import Surface

REQUIRED = ("expression", "answer")


def build(values: dict[str, Any]) -> Surface:
    return Surface(
        components=[
            card("body"),
            column("body", ["answer_panel"]),
            panel("answer_panel", "answer", tone="compute"),
            metric(
                "answer",
                "answer",
                tone="compute",
                icon="calculator",
            ),
        ],
        data=data(values),
    )


def data(values: dict[str, Any]) -> dict[str, Any]:
    answer = str(values.get("answer") or "").strip()
    return {"answer": answer}
