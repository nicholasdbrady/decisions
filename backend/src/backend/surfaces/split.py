"""The split surface: an editable bill instrument with a deterministic result."""

from typing import Any

from backend.surfaces.catalog import bind, card, column
from backend.surfaces.catalog import split as split_component
from backend.surfaces.spec import Surface

ACTION = "split"


def build(values: dict[str, Any]) -> Surface:
    return _surface(data(values, streaming=False))


def pending() -> Surface:
    return _surface(
        data(
            {
                "people": 2,
                "_verification_status": "waiting",
                "_verification_confidence": None,
            },
            streaming=True,
        )
    )


def _surface(model: dict[str, Any]) -> Surface:
    return Surface(
        components=[
            card("body"),
            column("body", ["split"]),
            split_component(
                "split",
                bind("total"),
                bind("people"),
                bind("tip"),
                bind("symbol"),
                streaming=bind("streaming"),
                verification=bind("verification"),
                confidence=bind("confidence"),
            ),
        ],
        data=model,
    )


def compute(values: dict[str, Any]) -> dict[str, Any]:
    total = _number(values.get("total"))
    people = _integer(values.get("people")) or 2
    tip_percent = _number(values.get("tip_percent"))
    if tip_percent is None:
        tip_percent = 0.0
    symbol = str(values.get("currency_symbol") or "$")
    currency = str(values.get("currency") or "USD")
    if total is None or people is None:
        return {
            "total": total,
            "people": people,
            "tip_percent": tip_percent,
            "currency": currency,
            "currency_symbol": symbol,
            "computed_by": "decimal",
        }

    tip_amount = total * tip_percent / 100
    grand_total = total + tip_amount
    each = grand_total / people
    return {
        "total": total,
        "people": people,
        "tip_percent": tip_percent,
        "tip_amount": tip_amount,
        "grand_total": grand_total,
        "answer_value": each,
        "answer": f"{_money(symbol, each)} per person",
        "currency": currency,
        "currency_symbol": symbol,
        "computed_by": "decimal",
    }


def data(values: dict[str, Any], *, streaming: bool) -> dict[str, Any]:
    computed = compute(values)
    symbol = str(computed.get("currency_symbol") or "$")
    return {
        "total": "" if computed.get("total") is None else f"{computed['total']:g}",
        "people": "" if computed.get("people") is None else str(computed["people"]),
        "tip": f"{float(computed.get('tip_percent') or 0):g}",
        "symbol": symbol,
        "streaming": streaming,
        "verification": str(values.get("_verification_status") or ""),
        "confidence": (
            ""
            if values.get("_verification_confidence") is None
            else f"{float(values['_verification_confidence']):.4f}"
        ),
    }


def _money(symbol: str, value: float) -> str:
    return f"{symbol}{value:,.2f}"


def _number(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if number >= 0 else None


def _integer(value: Any) -> int | None:
    try:
        number = int(value)
    except (TypeError, ValueError):
        return None
    return number if number > 0 else None
