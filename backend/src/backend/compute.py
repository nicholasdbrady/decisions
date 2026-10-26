"""Deterministic computation for card fields. Luna reads the text; this code does the math.

Units come from pint, currency from Open Exchange Rates, holiday dates from the
`holidays` package, and conditions from OpenWeather. A model never supplies a
number that code can derive.
"""

from __future__ import annotations

from datetime import UTC, date, datetime
from functools import lru_cache
from typing import Any

import pint

from backend import units
from backend.contracts import SchemaId
from backend.providers import Providers, currency_code, currency_symbol


@lru_cache(maxsize=1)
def _units() -> pint.UnitRegistry:
    registry = pint.UnitRegistry(autoconvert_offset_to_baseunit=True)
    registry.formatter.default_format = "~P"
    return registry


def unit_label(unit: str) -> str:
    try:
        return f"{_units().parse_units(unit):~P}" or unit
    except Exception:  # noqa: BLE001 - unknown unit, keep what Luna wrote
        return unit


def convert(value: float, source: str, target: str) -> float | None:
    try:
        return float(_units().Quantity(value, source).to(target).magnitude)
    except Exception:  # noqa: BLE001 - unknown or incompatible units
        return None


async def compute(
    card: SchemaId,
    values: dict[str, Any],
    providers: Providers | None = None,
    *,
    today: date | None = None,
) -> dict[str, Any]:
    """Return values with code-owned results filled in; never trust a model's arithmetic."""
    if card is SchemaId.CONVERT:
        return await _convert(values, providers)
    if card is SchemaId.COUNTDOWN:
        return _countdown(values, providers, today)
    if card is SchemaId.WEATHER:
        return await _weather(values, providers, today)
    if card in (SchemaId.EXPENSE, SchemaId.SPLIT):
        return _money(values)
    return values


async def _convert(values: dict[str, Any], providers: Providers | None) -> dict[str, Any]:
    value, source, target = values.get("value"), values.get("from"), values.get("to")
    if not isinstance(value, int | float) or not source or not target:
        return values

    # Currency is a live rate, not a fixed factor, so it is tried first.
    base, quote = currency_code(source), currency_code(target)
    if base and quote:
        if providers is not None:
            converted = await providers.currency.convert(float(value), base, quote)
            if converted is not None:
                return {**values, **converted, "kind": "currency", "category": "currency"}
        return {
            **values,
            "from": base,
            "to": quote,
            "from_label": base,
            "to_label": quote,
            "from_symbol": currency_symbol(base),
            "to_symbol": currency_symbol(quote),
            "kind": "currency",
            "category": "currency",
            "result": None,
            "computed_by": None,
        }

    # Canonical pint names let the UI's dropdowns agree with what we computed.
    source_hit, target_hit = units.resolve(source), units.resolve(target)
    source_id = source_hit[1] if source_hit else source
    target_id = target_hit[1] if target_hit else target
    result = convert(float(value), source_id, target_id)
    return {
        **values,
        "kind": "unit",
        "result": None if result is None else round(result, 6),
        "from": source_id,
        "to": target_id,
        "from_label": unit_label(source_id),
        "to_label": unit_label(target_id),
        "category": source_hit[0] if source_hit else None,
        "computed_by": "pint" if result is not None else None,
    }


async def convert_units(
    value: float, source: str, target: str, providers: Providers | None
) -> dict[str, Any]:
    """Public entry point for the convert card's interactive dropdowns."""
    return await _convert({"value": value, "from": source, "to": target}, providers)


def _countdown(
    values: dict[str, Any], providers: Providers | None, today: date | None
) -> dict[str, Any]:
    """Resolve a named holiday to a real date, then count the days to it."""
    reference = today or datetime.now(UTC).astimezone().date()
    name = values.get("name")
    resolved = values.get("date")

    if providers is not None and not resolved and isinstance(name, str) and name.strip():
        hit = providers.holidays.resolve(name, on_or_after=reference)
        if hit is not None:
            when, official = hit
            resolved = when.isoformat()
            values = {
                **values,
                "name": official,
                "date": resolved,
                "is_holiday": True,
                "computed_by": "holidays",
            }

    target = _as_date(resolved)
    if target is None:
        return values
    holiday_name = providers.holidays.on(target) if providers is not None else None
    return {
        **values,
        "date": target.isoformat(),
        "days_remaining": (target - reference).days,
        "weekday": target.strftime("%A"),
        "holiday_name": holiday_name,
        "computed_by": values.get("computed_by") or "datetime",
    }


async def _weather(
    values: dict[str, Any], providers: Providers | None, today: date | None = None
) -> dict[str, Any]:
    if providers is None:
        return values
    place = values.get("place")
    named = place.strip() if isinstance(place, str) else ""
    units = values.get("units")
    if units not in ("imperial", "metric"):
        units = "imperial"

    if named:
        observation = await providers.weather.observe(named, units=units)
    else:
        observation = await providers.weather.observe_at(
            providers.weather.default_place, units=units
        )

    if observation is None:
        return {**values, "computed_by": None}
    return _weather_window({**values, **observation}, today)


def _weather_window(values: dict[str, Any], today: date | None) -> dict[str, Any]:
    """Cut the forecast down to the span Luna resolved, then read comfort off it."""
    daily = values.get("daily") or []
    hourly = values.get("hourly") or []
    start = _as_date(values.get("start_date"))
    end = _as_date(values.get("end_date")) or start
    if start is not None and end is not None and end < start:
        start, end = end, start

    def inside(entry: dict[str, Any]) -> bool:
        when = _as_date(entry.get("date"))
        if when is None:
            return False
        if start is not None and when < start:
            return False
        return not (end is not None and when > end)

    days = [entry for entry in daily if inside(entry)] if start is not None else list(daily)
    if not days:
        days = list(daily)
    hours = [entry for entry in hourly if inside(entry)] if start is not None else list(hourly)
    if not hours:
        hours = list(hourly)

    reference = today or _as_date(values.get("start_date"))
    span = 0
    if start is not None and end is not None:
        span = (end - start).days + 1

    highs = [entry["high"] for entry in days if isinstance(entry.get("high"), int | float)]
    lows = [entry["low"] for entry in days if isinstance(entry.get("low"), int | float)]
    winds = [
        entry["wind_speed"] for entry in days if isinstance(entry.get("wind_speed"), int | float)
    ]
    chances = [entry["pop"] for entry in days if isinstance(entry.get("pop"), int | float)]
    wet = {"rain", "drizzle", "thunderstorm", "snow"}

    return {
        **values,
        "window_days": days,
        "window_hours": hours[:24],
        "window_span": span,
        "window_is_today": start is not None and reference is not None and start == reference,
        "high": max(highs) if highs else None,
        "low": min(lows) if lows else None,
        "max_wind": max(winds) if winds else values.get("wind_speed"),
        "max_pop": max(chances) if chances else None,
        "will_rain": any(entry.get("condition_group") in wet for entry in days),
    }


def _money(values: dict[str, Any]) -> dict[str, Any]:
    code = currency_code(values.get("currency")) or "USD"
    return {**values, "currency": code, "currency_symbol": currency_symbol(code)}


def _as_date(value: Any) -> date | None:
    if isinstance(value, date):
        return value
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        return datetime.fromisoformat(value.strip()[:10]).date()
    except ValueError:
        return None
