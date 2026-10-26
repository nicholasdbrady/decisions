"""The countdown surface: a derived day count with calendar context."""

import json
from datetime import date
from typing import Any

from backend.surfaces.catalog import bind, card, chips, column, header, metric, panel
from backend.surfaces.spec import Surface

REQUIRED = ("name", "date", "days_remaining")


def build(values: dict[str, Any]) -> Surface:
    return Surface(
        components=[
            card("body"),
            column("body", ["head", "answer_panel"]),
            header("head", bind("title"), caption=bind("date_label")),
            panel("answer_panel", "answer", tone="time"),
            column("answer", ["metric", "chips"]),
            metric(
                "metric",
                "remaining",
                caption=bind("answer_caption"),
                tone="time",
                icon="calendar",
            ),
            chips("chips", bind("chips")),
        ],
        data=data(values),
    )


def data(values: dict[str, Any]) -> dict[str, Any]:
    name = str(values.get("name") or values.get("holiday_name") or "Countdown").strip()
    days = int(values["days_remaining"])
    target = date.fromisoformat(str(values["date"])[:10])
    weekday = str(values.get("weekday") or target.strftime("%A"))
    holiday = str(values.get("holiday_name") or "").strip()
    date_label = f"{target.strftime('%b')} {target.day}, {target.year}"
    remaining = "Today" if days == 0 else f"{days} {'day' if days == 1 else 'days'}"
    facts = [{"label": weekday, "icon": "clock"}]
    if holiday and holiday.lower() != name.lower():
        facts.append({"label": holiday, "icon": "calendar"})

    return {
        "title": name,
        "date_label": date_label,
        "remaining": remaining,
        "answer_caption": "remaining",
        "chips": json.dumps(facts),
    }
