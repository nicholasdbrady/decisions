"""The weather surface: one provider-backed reading with forecast context."""

import json
from datetime import date
from typing import Any

from backend.surfaces.catalog import (
    bind,
    card,
    column,
    hero,
    strip,
)
from backend.surfaces.spec import Surface

REQUIRED = ("place", "computed_by")

_TONE = {
    "clear": "clear",
    "clouds": "clouds",
    "drizzle": "rain",
    "rain": "rain",
    "thunderstorm": "storm",
    "snow": "snow",
    "atmosphere": "fog",
}

_ICON = {
    "clear": "sun",
    "clouds": "cloud-sun",
    "drizzle": "drizzle",
    "rain": "rain",
    "thunderstorm": "storm",
    "snow": "snow",
    "atmosphere": "fog",
}

_ART = {
    "clear": "clear",
    "clouds": "clouds",
    "drizzle": "rain",
    "rain": "rain",
}


def build(values: dict[str, Any]) -> Surface:
    return _surface(data(values))


def pending() -> Surface:
    return _surface(
        {
            "title": "Weather",
            "reading": "",
            "temp_unit": "",
            "caption": "",
            "tone": "clouds",
            "art": "clouds",
            "forecast": "",
            "forecast_caption": "",
            "stats": "[]",
            "days": "[]",
            "day_scale": "[0, 1]",
        }
    )


def _surface(model: dict[str, Any]) -> Surface:
    return Surface(
        components=[
            card("body"),
            column("body", ["hero", "days"]),
            hero(
                "hero",
                bind("reading"),
                title=bind("title"),
                unit=bind("temp_unit"),
                caption=bind("caption"),
                tone=bind("tone"),
                art=bind("art"),
                context=bind("forecast"),
                contextCaption=bind("forecast_caption"),
                stats=bind("stats"),
            ),
            strip(
                "days",
                bind("days"),
                scale=bind("day_scale"),
                tone=bind("tone"),
            ),
        ],
        data=model,
    )


def data(values: dict[str, Any]) -> dict[str, Any]:
    days = _records(values.get("window_days"))
    hours = _records(values.get("window_hours"))
    first_day = days[0] if days else {}
    is_today = bool(values.get("window_is_today"))
    span = _integer(values.get("window_span")) or len(days) or 1
    group = str(
        values.get("condition_group")
        if is_today
        else first_day.get("condition_group") or values.get("condition_group") or "clear"
    )
    tone = _TONE.get(group, "clear")
    art = _ART.get(group, _ICON.get(group, "sun"))
    place = str(values.get("place_name") or values.get("place") or "Weather").strip()
    description = str(
        values.get("description")
        if is_today
        else first_day.get("description") or values.get("description") or ""
    ).strip()
    condition = str(values.get("condition_label") or description or "Forecast").strip()
    reading = _number(values.get("temp")) if is_today else None
    if reading is None:
        reading = _number(first_day.get("high"))
    if reading is None:
        reading = _number(values.get("high")) or _number(values.get("temp"))

    low = (
        _number(values.get("low"))
        or _number(first_day.get("low"))
        or _number(values.get("temp_min"))
        or reading
        or 0
    )
    high = (
        _number(values.get("high"))
        or _number(first_day.get("high"))
        or _number(values.get("temp_max"))
        or reading
        or low
    )
    if high < low:
        low, high = high, low

    when = str(values.get("when") or "").strip()
    window = _window_label(values, span)
    title = f"{description or condition} in {place}"
    if not is_today and (when or window):
        title = f"{title} {(when or window).lower()}"
    caption = _caption(values, first_day, is_today)
    hourly_context = bool(hours) and (is_today or span == 1)
    forecast, forecast_caption = _forecast_context(
        hours if hourly_context else days,
        hourly=hourly_context,
        window=window,
    )
    stats = _stats(
        values,
        is_today=is_today,
        low=low,
        high=high,
        reading=reading,
        window=window,
    )
    day_items, day_scale = _days(days if span > 1 else [], values, is_today)

    return {
        "title": title,
        "reading": _compact(reading),
        "temp_unit": str(values.get("temp_unit") or "°"),
        "caption": caption,
        "tone": tone,
        "art": art,
        "forecast": json.dumps(
            {
                "kind": "forecast",
                "steps": forecast,
                "valueLabel": "Temperature",
                "suffix": "°",
            }
        ),
        "forecast_caption": f"{forecast_caption} · OpenWeather",
        "stats": json.dumps(stats),
        "low": low,
        "high": high,
        "days": json.dumps(day_items),
        "day_scale": json.dumps(day_scale),
    }


def _caption(
    values: dict[str, Any], first_day: dict[str, Any], is_today: bool
) -> str:
    if is_today:
        feels = _number(values.get("feels_like"))
        return f"Feels like {_temperature(feels)}" if feels is not None else ""
    low = _number(first_day.get("low")) or _number(values.get("low"))
    return f"Low {_temperature(low)}" if low is not None else ""


def _forecast_context(
    entries: list[dict[str, Any]], *, hourly: bool, window: str
) -> tuple[list[dict[str, Any]], str]:
    steps: list[dict[str, Any]] = []
    selected = entries[:5]
    if hourly:
        selected = entries[:5] if window == "Today" else _hourly_sample(entries, 5)
    for entry in selected:
        value = _number(entry.get("temp") if hourly else entry.get("high"))
        if value is None:
            continue
        label = (
            _clock(str(entry.get("time") or ""))
            if hourly
            else _weekday(entry.get("date"))
        )
        step: dict[str, Any] = {"label": label, "value": value}
        rain = _chance(entry.get("pop"))
        if rain is not None:
            step["rain"] = rain
        steps.append(step)
    return steps, "Next 15 hours" if window == "Today" else (
        f"{window} by hour" if hourly else window
    )


def _hourly_sample(
    entries: list[dict[str, Any]], count: int
) -> list[dict[str, Any]]:
    if len(entries) <= count:
        return entries
    last = len(entries) - 1
    indices = [round(index * last / (count - 1)) for index in range(count)]
    def temperature(index: int) -> float:
        value = _number(entries[index].get("temp"))
        return value if value is not None else float("-inf")

    peak = max(range(len(entries)), key=temperature)
    if peak not in indices and len(indices) > 2:
        replace = min(
            range(1, len(indices) - 1),
            key=lambda index: abs(indices[index] - peak),
        )
        indices[replace] = peak
        indices.sort()
    return [entries[index] for index in indices]


def _stats(
    values: dict[str, Any],
    *,
    is_today: bool,
    low: float,
    high: float,
    reading: float | None,
    window: str,
) -> list[dict[str, Any]]:
    range_stat: dict[str, Any] = {
        "label": "Today" if is_today else window,
        "value": f"{_temperature(low)} – {_temperature(high)}",
        "shape": {
            "kind": "range",
            "lo": low,
            "hi": high,
            "at": reading if reading is not None else high,
        },
    }
    if is_today and reading is not None and high > low:
        position = (reading - low) / (high - low)
        if position >= 0.7:
            range_stat["note"] = "Near the high now"
        elif position <= 0.3:
            range_stat["note"] = "Near the low now"
    stats: list[dict[str, Any]] = [range_stat]
    rain = _chance(values.get("max_pop"))
    if rain is not None:
        stats.append(
            {
                "label": "Rain",
                "value": f"{rain:g}%",
                "tone": "rain" if rain > 0 else None,
                "shape": {"kind": "meter", "pct": rain},
            }
        )
    wind = _number(values.get("max_wind")) or _number(values.get("wind_speed"))
    if wind is not None:
        stat: dict[str, Any] = {
            "label": "Wind",
            "value": f"{wind:g} {values.get('speed_unit') or ''}".strip(),
        }
        bearing = _number(values.get("wind_deg")) if is_today else None
        if bearing is not None:
            stat["shape"] = {"kind": "bearing", "deg": bearing}
        stats.append(stat)
    humidity = _number(values.get("humidity"))
    if is_today and humidity is not None:
        humidity_stat: dict[str, Any] = {
            "label": "Humidity",
            "value": f"{humidity:g}%",
            "shape": {"kind": "meter", "pct": humidity},
        }
        pressure = _number(values.get("pressure"))
        if pressure is not None:
            humidity_stat["note"] = f"Pressure {pressure:g} hPa"
        stats.append(humidity_stat)
    return stats


def _days(
    days: list[dict[str, Any]], values: dict[str, Any], is_today: bool
) -> tuple[list[dict[str, Any]], list[float]]:
    items: list[dict[str, Any]] = []
    lows: list[float] = []
    highs: list[float] = []
    current_temp = _number(values.get("temp"))
    for index, entry in enumerate(days[:5]):
        low = _number(entry.get("low"))
        high = _number(entry.get("high"))
        if low is None or high is None:
            continue
        lows.append(low)
        highs.append(high)
        group = str(entry.get("condition_group") or "clear")
        chance = _chance(entry.get("pop"))
        item: dict[str, Any] = {
            "label": _weekday(entry.get("date")),
            "value": _temperature(high),
            "sub": _temperature(low),
            "icon": _ICON.get(group, "sun"),
            "lo": low,
            "hi": high,
            "current": is_today and index == 0,
        }
        if is_today and index == 0 and current_temp is not None:
            item["at"] = current_temp
        if chance is not None and chance > 0:
            item["flag"] = {
                "text": f"{chance:g}%",
                "tone": "rain",
                "icon": "drop",
            }
        items.append(item)
    scale = [min(lows), max(highs)] if lows and highs else [0, 1]
    return items, scale


def _window_label(values: dict[str, Any], span: int) -> str:
    start = _date(values.get("start_date"))
    end = _date(values.get("end_date"))
    if start is None:
        return "Forecast"
    if end is None or end == start:
        return start.strftime("%A")
    if start.month == end.month:
        return f"{start.strftime('%b')} {start.day}–{end.day}"
    return f"{start.strftime('%b')} {start.day}–{end.strftime('%b')} {end.day}"


def _clock(value: str) -> str:
    try:
        hour = int(value.split(":", 1)[0])
    except (ValueError, TypeError, IndexError):
        return value
    suffix = "AM" if hour < 12 else "PM"
    shown = hour % 12 or 12
    return f"{shown} {suffix}"


def _weekday(value: Any) -> str:
    when = _date(value)
    return when.strftime("%a") if when is not None else ""


def _date(value: Any) -> date | None:
    if not isinstance(value, str):
        return None
    try:
        return date.fromisoformat(value[:10])
    except ValueError:
        return None


def _records(value: Any) -> list[dict[str, Any]]:
    return [entry for entry in value or [] if isinstance(entry, dict)]


def _number(value: Any) -> float | None:
    return float(value) if isinstance(value, int | float) else None


def _integer(value: Any) -> int | None:
    return int(value) if isinstance(value, int | float) else None


def _chance(value: Any) -> float | None:
    chance = _number(value)
    if chance is None:
        return None
    return round(chance * 100 if chance <= 1 else chance)


def _temperature(value: float | None) -> str:
    return "" if value is None else f"{round(value):g}°"


def _compact(value: float | None) -> str:
    return "" if value is None else f"{value:g}"
