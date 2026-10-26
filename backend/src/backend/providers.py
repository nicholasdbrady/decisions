"""External data providers: holidays, currency rates, and weather.

Each provider is deterministic or authoritative, so the model never guesses a
date, a rate, or a temperature. Every provider degrades to ``None`` rather than
raising, because a card must still render when a key is missing or an API is
down.
"""

from __future__ import annotations

import asyncio
import logging
import re
import time
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta, timezone
from functools import lru_cache
from typing import Any

import httpx

from backend.config import Settings
from backend.telemetry import set_attributes, tracer

logger = logging.getLogger(__name__)

GEOCODE_URL = "https://api.openweathermap.org/geo/1.0/direct"
WEATHER_URL = "https://api.openweathermap.org/data/2.5/weather"
FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast"
RATES_URL = "https://openexchangerates.org/api/latest.json"
CURRENCIES_URL = "https://openexchangerates.org/api/currencies.json"

# Common ways people write a currency, mapped to its ISO 4217 code.
CURRENCY_ALIASES: dict[str, str] = {
    "$": "USD", "usd": "USD", "dollar": "USD", "dollars": "USD", "us dollar": "USD", "buck": "USD", "bucks": "USD",
    "€": "EUR", "eur": "EUR", "euro": "EUR", "euros": "EUR",
    "£": "GBP", "gbp": "GBP", "pound": "GBP", "pounds": "GBP", "quid": "GBP", "sterling": "GBP",
    "¥": "JPY", "jpy": "JPY", "yen": "JPY",
    "₹": "INR", "inr": "INR", "rupee": "INR", "rupees": "INR",
    "c$": "CAD", "cad": "CAD", "canadian dollar": "CAD",
    "a$": "AUD", "aud": "AUD", "australian dollar": "AUD",
    "chf": "CHF", "franc": "CHF", "swiss franc": "CHF",
    "cny": "CNY", "rmb": "CNY", "yuan": "CNY", "renminbi": "CNY",
    "krw": "KRW", "won": "KRW",
    "mxn": "MXN", "peso": "MXN", "pesos": "MXN",
    "brl": "BRL", "real": "BRL", "reais": "BRL",
    "sek": "SEK", "krona": "SEK", "nok": "NOK", "dkk": "DKK",
    "sgd": "SGD", "hkd": "HKD", "nzd": "NZD", "zar": "ZAR", "aed": "AED",
    "pln": "PLN", "zloty": "PLN", "try": "TRY", "lira": "TRY",
    "thb": "THB", "baht": "THB", "php": "PHP", "idr": "IDR", "vnd": "VND",
    "ils": "ILS", "shekel": "ILS", "btc": "BTC", "bitcoin": "BTC",
}

CURRENCY_SYMBOLS: dict[str, str] = {
    "USD": "$", "EUR": "€", "GBP": "£", "JPY": "¥", "INR": "₹", "CAD": "C$",
    "AUD": "A$", "CNY": "¥", "KRW": "₩", "BRL": "R$", "MXN": "$", "CHF": "CHF",
    "SEK": "kr", "NOK": "kr", "DKK": "kr", "PLN": "zł", "TRY": "₺", "THB": "฿",
    "ILS": "₪", "ZAR": "R", "SGD": "S$", "HKD": "HK$", "NZD": "NZ$", "BTC": "₿",
}

# OpenWeather condition code groups, for an icon the UI can draw without assets.
CONDITION_GLYPHS: list[tuple[int, int, str, str]] = [
    (200, 232, "thunderstorm", "Thunderstorm"),
    (300, 321, "drizzle", "Drizzle"),
    (500, 531, "rain", "Rain"),
    (600, 622, "snow", "Snow"),
    (701, 781, "atmosphere", "Haze"),
    (800, 800, "clear", "Clear"),
    (801, 804, "clouds", "Clouds"),
]


def currency_code(value: str | None) -> str | None:
    """Normalize anything a model wrote into an ISO 4217 code, or None."""
    if not value:
        return None
    cleaned = value.strip().lower().rstrip(".")
    if cleaned in CURRENCY_ALIASES:
        return CURRENCY_ALIASES[cleaned]
    stripped = re.sub(r"[^a-z$€£¥₹]", "", cleaned)
    if stripped in CURRENCY_ALIASES:
        return CURRENCY_ALIASES[stripped]
    if re.fullmatch(r"[A-Z]{3}", value.strip().upper()):
        return value.strip().upper()
    return None


def currency_symbol(code: str | None) -> str:
    return CURRENCY_SYMBOLS.get((code or "").upper(), (code or "").upper())


def condition_group(code: int | None) -> tuple[str, str]:
    for low, high, slug, label in CONDITION_GLYPHS:
        if code is not None and low <= code <= high:
            return slug, label
    return "clear", "Clear"


class _Cache:
    """A tiny TTL cache; rates change hourly and a place never moves."""

    def __init__(self, ttl_seconds: float) -> None:
        self._ttl = ttl_seconds
        self._entries: dict[str, tuple[float, Any]] = {}
        self._lock = asyncio.Lock()

    async def get_or_set(self, key: str, factory: Any) -> Any:
        async with self._lock:
            hit = self._entries.get(key)
            if hit and time.time() - hit[0] < self._ttl:
                return hit[1]
        value = await factory()
        async with self._lock:
            self._entries[key] = (time.time(), value)
        return value


@dataclass(frozen=True)
class Place:
    name: str
    country: str
    state: str | None
    lat: float
    lon: float

    @property
    def label(self) -> str:
        parts = [self.name]
        if self.state and self.state != self.name:
            parts.append(self.state)
        if self.country:
            parts.append(self.country)
        return ", ".join(parts)


class HolidayResolver:
    """Resolves a named holiday to a real date, so no model has to remember it."""

    def __init__(self, settings: Settings) -> None:
        self._country = settings.default_country
        self._subdivision = settings.default_subdivision

    def resolve(
        self, name: str, *, on_or_after: date | None = None, country: str | None = None
    ) -> tuple[date, str] | None:
        """Find the next occurrence of a named holiday. Returns (date, official name)."""
        query = _holiday_query(name)
        if not query:
            return None
        start = on_or_after or datetime.now(UTC).astimezone().date()
        code = (country or self._country).upper()
        for year in (start.year, start.year + 1):
            for when, official in _named_holidays(code, self._subdivision, year, query):
                if when >= start:
                    return when, official
        return None

    def on(self, when: date, *, country: str | None = None) -> str | None:
        code = (country or self._country).upper()
        return _holidays_for(code, self._subdivision, when.year).get(when)

    def upcoming(self, *, limit: int = 5, country: str | None = None) -> list[tuple[date, str]]:
        today = datetime.now(UTC).astimezone().date()
        code = (country or self._country).upper()
        found: list[tuple[date, str]] = []
        for year in (today.year, today.year + 1):
            found.extend(
                (when, label)
                for when, label in sorted(_holidays_for(code, self._subdivision, year).items())
                if when >= today
            )
        return found[:limit]


def _holiday_query(name: str) -> str:
    """Strip countdown phrasing so 'days until thanksgiving' searches 'thanksgiving'."""
    cleaned = re.sub(
        r"\b(how many |days? |weeks? |months? |until|till|til|to|the|next|upcoming|countdown)\b",
        " ",
        name.lower(),
    )
    return re.sub(r"[^a-z' ]", " ", cleaned).strip()


@lru_cache(maxsize=64)
def _holidays_for(country: str, subdivision: str | None, year: int) -> dict[date, str]:
    import holidays as holidays_package

    try:
        calendar = holidays_package.country_holidays(
            country, subdiv=subdivision, years=year, observed=True
        )
    except Exception:  # noqa: BLE001 - unknown country or subdivision
        try:
            calendar = holidays_package.country_holidays(country, years=year, observed=True)
        except Exception:  # noqa: BLE001
            return {}
    return {key: str(value) for key, value in calendar.items()}


@lru_cache(maxsize=128)
def _named_holidays(
    country: str, subdivision: str | None, year: int, query: str
) -> tuple[tuple[date, str], ...]:
    calendar = _holidays_for(country, subdivision, year)
    matches = [
        (when, label) for when, label in calendar.items() if query in label.lower()
    ]
    if not matches:
        # Fall back to full word coverage, so 'christmas day 2026' still finds 'Christmas Day'
        # while a loose word like 'birthday' cannot claim Washington's Birthday.
        words = {word for word in query.split() if len(word) > 3}
        matches = [
            (when, label)
            for when, label in calendar.items()
            if words and words <= {word.lower().strip(",'s") for word in label.split()}
        ]
    return tuple(sorted(matches))


class CurrencyProvider:
    """Open Exchange Rates. The free plan is USD-based, so cross-rates are derived."""

    def __init__(self, settings: Settings, *, client: httpx.AsyncClient | None = None) -> None:
        self._settings = settings
        self._client = client
        self._rates = _Cache(settings.currency_cache_seconds)
        self._names = _Cache(86_400)

    @property
    def configured(self) -> bool:
        return bool(self._settings.openxchangerates_app_id)

    async def convert(self, amount: float, source: str, target: str) -> dict[str, Any] | None:
        base, quote = currency_code(source), currency_code(target)
        if not base or not quote or not self.configured:
            return None
        table = await self._latest()
        if not table:
            return None
        rates, as_of = table
        # Every rate is USD-relative, so a cross-rate is quote/base.
        base_rate = 1.0 if base == "USD" else rates.get(base)
        quote_rate = 1.0 if quote == "USD" else rates.get(quote)
        if not base_rate or not quote_rate:
            return None
        rate = float(quote_rate) / float(base_rate)
        names = await self._currency_names()
        return {
            "result": round(amount * rate, 4),
            "rate": round(rate, 8),
            "from": base,
            "to": quote,
            "from_label": base,
            "to_label": quote,
            "from_symbol": currency_symbol(base),
            "to_symbol": currency_symbol(quote),
            "from_name": names.get(base),
            "to_name": names.get(quote),
            "as_of": as_of,
            "computed_by": "openexchangerates",
        }

    async def _latest(self) -> tuple[dict[str, float], str | None] | None:
        async def fetch() -> tuple[dict[str, float], str | None] | None:
            data = await self._get(
                RATES_URL, {"app_id": self._settings.openxchangerates_app_id}
            )
            if not data or "rates" not in data:
                return None
            stamp = data.get("timestamp")
            as_of = (
                datetime.fromtimestamp(int(stamp), UTC).isoformat(timespec="minutes")
                if isinstance(stamp, int | float)
                else None
            )
            return {code: float(rate) for code, rate in data["rates"].items()}, as_of

        return await self._rates.get_or_set("latest", fetch)

    async def _currency_names(self) -> dict[str, str]:
        async def fetch() -> dict[str, str]:
            data = await self._get(CURRENCIES_URL, {})
            return data if isinstance(data, dict) else {}

        return await self._names.get_or_set("names", fetch)

    async def _get(self, url: str, params: dict[str, Any]) -> Any:
        with tracer().start_as_current_span("fetch openexchangerates") as span:
            data = await _request(self._client, url, params, self._settings.provider_timeout_seconds)
            set_attributes(
                span, {"jev.provider.ok": data is not None, "jev.provider.url": url}
            )
            if isinstance(data, dict) and data.get("error"):
                logger.warning("Open Exchange Rates error: %s", data.get("message"))
                set_attributes(span, {"error.type": str(data.get("message"))})
                return None
            return data


class WeatherProvider:
    """OpenWeather geocoding plus current conditions and a short forecast."""

    def __init__(self, settings: Settings, *, client: httpx.AsyncClient | None = None) -> None:
        self._settings = settings
        self._client = client
        self._places = _Cache(86_400)
        self._observations = _Cache(settings.weather_cache_seconds)

    @property
    def configured(self) -> bool:
        return bool(self._settings.openweather_api_key)

    async def geocode(self, query: str) -> Place | None:
        if not query or not self.configured:
            return None

        async def fetch() -> Place | None:
            data = await self._get(
                GEOCODE_URL,
                {"q": query, "limit": 1, "appid": self._settings.openweather_api_key},
                operation="geocode",
            )
            if not isinstance(data, list) or not data:
                return None
            hit = data[0]
            return Place(
                name=str(hit.get("name") or query),
                country=str(hit.get("country") or ""),
                state=hit.get("state"),
                lat=float(hit["lat"]),
                lon=float(hit["lon"]),
            )

        return await self._places.get_or_set(query.strip().lower(), fetch)

    @property
    def default_place(self) -> Place:
        """Where an unnamed weather question is asked about."""
        return Place(
            name=self._settings.default_place_name,
            country=self._settings.default_place_country,
            state=self._settings.default_place_state,
            lat=self._settings.default_place_lat,
            lon=self._settings.default_place_lon,
        )

    async def observe(self, query: str, *, units: str = "imperial") -> dict[str, Any] | None:
        place = await self.geocode(query)
        if place is None:
            return None
        return await self.observe_at(place, units=units)

    async def observe_at(self, place: Place, *, units: str = "imperial") -> dict[str, Any] | None:
        """Read conditions for a place already fixed to a coordinate."""
        if not self.configured:
            return None

        async def fetch() -> dict[str, Any] | None:
            params = {
                "lat": place.lat,
                "lon": place.lon,
                "units": units,
                "appid": self._settings.openweather_api_key,
            }
            current, forecast = await asyncio.gather(
                self._get(WEATHER_URL, params, operation="current_weather"),
                self._get(FORECAST_URL, {**params, "cnt": 40}, operation="forecast"),
                return_exceptions=True,
            )
            if not isinstance(current, dict) or "main" not in current:
                return None
            return _shape_observation(
                place,
                current,
                forecast if isinstance(forecast, dict) else None,
                units,
            )

        return await self._observations.get_or_set(f"{place.lat},{place.lon},{units}", fetch)

    async def _get(self, url: str, params: dict[str, Any], *, operation: str) -> Any:
        with tracer().start_as_current_span(f"fetch openweather {operation}") as span:
            data = await _request(
                self._client, url, params, self._settings.provider_timeout_seconds
            )
            set_attributes(
                span, {"jev.provider.ok": data is not None, "jev.provider.url": url}
            )
            return data


def _shape_observation(
    place: Place, current: dict[str, Any], forecast: dict[str, Any] | None, units: str
) -> dict[str, Any]:
    condition = (current.get("weather") or [{}])[0]
    code = condition.get("id")
    slug, label = condition_group(code if isinstance(code, int) else None)
    main = current.get("main") or {}
    wind = current.get("wind") or {}
    system = current.get("sys") or {}
    return {
        "place": place.label,
        "place_name": place.name,
        "country": place.country,
        "lat": place.lat,
        "lon": place.lon,
        "units": units,
        "temp_unit": "°F" if units == "imperial" else "°C",
        "speed_unit": "mph" if units == "imperial" else "m/s",
        "temp": _round(main.get("temp")),
        "feels_like": _round(main.get("feels_like")),
        "temp_min": _round(main.get("temp_min")),
        "temp_max": _round(main.get("temp_max")),
        "humidity": main.get("humidity"),
        "pressure": main.get("pressure"),
        "wind_speed": _round(wind.get("speed")),
        "wind_deg": wind.get("deg"),
        "condition": condition.get("main"),
        "description": _sentence(condition.get("description")),
        "condition_code": code,
        "condition_group": slug,
        "condition_label": label,
        "icon": condition.get("icon"),
        "sunrise": system.get("sunrise"),
        "sunset": system.get("sunset"),
        "timezone_offset": current.get("timezone"),
        "observed_at": current.get("dt"),
        "daily": _daily_forecast(forecast),
        "hourly": _hourly_forecast(forecast),
        "computed_by": "openweather",
    }


def _place_offset(forecast: dict[str, Any] | None, fallback: int) -> int:
    """Seconds east of UTC at the place itself, not on the server."""
    city = (forecast or {}).get("city") or {}
    offset = city.get("timezone")
    return int(offset) if isinstance(offset, int | float) else fallback


def _slots(forecast: dict[str, Any] | None) -> list[dict[str, Any]]:
    if not forecast or not isinstance(forecast.get("list"), list):
        return []
    return [slot for slot in forecast["list"] if isinstance(slot.get("dt"), int | float)]


def _hourly_forecast(forecast: dict[str, Any] | None) -> list[dict[str, Any]]:
    """Every 3-hour step, stamped in the place's own local time."""
    offset = _place_offset(forecast, 0)
    zone = timezone(timedelta(seconds=offset))
    hours: list[dict[str, Any]] = []
    for slot in _slots(forecast):
        moment = datetime.fromtimestamp(int(slot["dt"]), zone)
        main = slot.get("main") or {}
        wind = slot.get("wind") or {}
        condition = (slot.get("weather") or [{}])[0]
        code = condition.get("id")
        slug, _ = condition_group(code if isinstance(code, int) else None)
        hours.append(
            {
                "date": moment.date().isoformat(),
                "time": moment.strftime("%H:%M"),
                "hour": moment.hour,
                "temp": _round(main.get("temp")),
                "feels_like": _round(main.get("feels_like")),
                "wind_speed": _round(wind.get("speed")),
                "pop": round(float(slot.get("pop") or 0.0), 2),
                "condition_group": slug,
                "description": _sentence(condition.get("description")),
            }
        )
    return hours


def _daily_forecast(forecast: dict[str, Any] | None) -> list[dict[str, Any]]:
    """Fold 3-hour steps into per-day highs, lows, and the midday condition."""
    offset = _place_offset(forecast, 0)
    zone = timezone(timedelta(seconds=offset))
    days: dict[str, dict[str, Any]] = {}
    for slot in _slots(forecast):
        moment = datetime.fromtimestamp(int(slot["dt"]), zone)
        key = moment.date().isoformat()
        main = slot.get("main") or {}
        wind = slot.get("wind") or {}
        condition = (slot.get("weather") or [{}])[0]
        entry = days.setdefault(
            key,
            {
                "date": key,
                "high": None,
                "low": None,
                "wind_speed": None,
                "pop": 0.0,
                "condition_group": None,
                "description": None,
            },
        )
        high, low = main.get("temp_max"), main.get("temp_min")
        if isinstance(high, int | float):
            entry["high"] = high if entry["high"] is None else max(entry["high"], high)
        if isinstance(low, int | float):
            entry["low"] = low if entry["low"] is None else min(entry["low"], low)
        gust = wind.get("speed")
        if isinstance(gust, int | float):
            entry["wind_speed"] = (
                gust if entry["wind_speed"] is None else max(entry["wind_speed"], gust)
            )
        chance = slot.get("pop")
        if isinstance(chance, int | float):
            entry["pop"] = max(entry["pop"], float(chance))
        # Midday local time is the closest thing to a representative daytime reading.
        if entry["condition_group"] is None or 11 <= moment.hour <= 14:
            code = condition.get("id")
            slug, _ = condition_group(code if isinstance(code, int) else None)
            entry["condition_group"] = slug
            entry["description"] = _sentence(condition.get("description"))
    ordered = sorted(days.values(), key=lambda entry: entry["date"])
    for entry in ordered:
        entry["high"] = _round(entry["high"])
        entry["low"] = _round(entry["low"])
        entry["wind_speed"] = _round(entry["wind_speed"])
        entry["pop"] = round(entry["pop"], 2)
    return ordered


async def _request(
    client: httpx.AsyncClient | None, url: str, params: dict[str, Any], timeout: float
) -> Any:
    async def get() -> httpx.Response:
        if client is not None:
            return await client.get(url, params=params)
        async with httpx.AsyncClient(timeout=timeout) as fresh:
            return await fresh.get(url, params=params)

    try:
        # A wall-clock bound: httpx's own timeout resets on every byte received.
        response = await asyncio.wait_for(get(), timeout)
        if response.status_code >= 400:
            logger.warning("%s returned HTTP %s", url, response.status_code)
            try:
                return response.json()
            except ValueError:
                return None
        return response.json()
    except Exception as exc:  # noqa: BLE001 - a provider outage must not break a card
        logger.warning("%s failed: %s", url, exc)
        return None


def _round(value: Any) -> float | None:
    return round(float(value)) if isinstance(value, int | float) else None


def _sentence(value: Any) -> str | None:
    text = str(value).strip() if value else ""
    return text[:1].upper() + text[1:] if text else None


@dataclass
class Providers:
    holidays: HolidayResolver
    currency: CurrencyProvider
    weather: WeatherProvider

    @classmethod
    def build(cls, settings: Settings) -> Providers:
        return cls(
            holidays=HolidayResolver(settings),
            currency=CurrencyProvider(settings),
            weather=WeatherProvider(settings),
        )

    def status(self) -> dict[str, bool]:
        return {
            "holidays": True,
            "currency": self.currency.configured,
            "weather": self.weather.configured,
        }
