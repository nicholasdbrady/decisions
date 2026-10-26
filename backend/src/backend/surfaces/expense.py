"""The expense surface: an amount-first record with normalized currency facts."""

import json
from datetime import date
from typing import Any

from backend.surfaces.catalog import bind, card, chips, column, header, metric, panel
from backend.surfaces.spec import Surface

REQUIRED = ("amount", "currency", "currency_symbol")


def build(values: dict[str, Any]) -> Surface:
    return Surface(
        components=[
            card("body"),
            column("body", ["head", "amount_panel"]),
            header("head", bind("title"), caption=bind("caption")),
            panel("amount_panel", "amount_content", tone="record"),
            column("amount_content", ["amount", "details"]),
            metric(
                "amount",
                "amount",
                tone="record",
                icon="receipt",
            ),
            chips("details", bind("details")),
        ],
        data=data(values),
    )


def data(values: dict[str, Any]) -> dict[str, Any]:
    amount = float(values["amount"])
    currency = str(values["currency"]).upper()
    symbol = str(values["currency_symbol"])
    merchant = str(values.get("merchant") or "").strip()
    category = str(values.get("category") or "").strip()
    spent_on = _date(values.get("date"))

    details = [{"label": currency, "icon": "dollar"}]
    if category:
        details.insert(0, {"label": category, "icon": "food"})
    if spent_on:
        details.append({"label": spent_on, "icon": "calendar"})

    return {
        "title": merchant or "Expense",
        "caption": "Expense",
        "amount": f"{symbol}{amount:,.2f}",
        "details": json.dumps(details),
    }


def _date(value: Any) -> str:
    if not value:
        return ""
    try:
        parsed = date.fromisoformat(str(value)[:10])
    except ValueError:
        return str(value)
    return f"{parsed.strftime('%b')} {parsed.day}, {parsed.year}"
