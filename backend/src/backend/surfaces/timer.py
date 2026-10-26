"""The timer surface: extracted duration rendered as a trusted local instrument."""

from typing import Any

from backend.surfaces.catalog import bind, card, column, timer
from backend.surfaces.spec import Surface

REQUIRED = ("duration_seconds",)


def build(values: dict[str, Any]) -> Surface:
    return Surface(
        components=[
            card("body"),
            column("body", ["timer"]),
            timer("timer", bind("label"), bind("duration_seconds")),
        ],
        data=data(values),
    )


def data(values: dict[str, Any]) -> dict[str, Any]:
    return {
        "label": str(values.get("label") or "Timer").strip(),
        "duration_seconds": max(0, int(values["duration_seconds"])),
    }
