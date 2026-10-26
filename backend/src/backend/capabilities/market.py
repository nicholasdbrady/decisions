"""Compare listed companies over a window.

JEV names the tickers and the window from closed sets; the prices come from
Yahoo's public chart endpoint and code does every percentage. Nothing here asks
a model for a number.

`xfinance` was the first choice, but its client is rate-limited at the source and
its failover path raises over the real error, so this calls the same endpoint
directly with the `httpx` the backend already depends on.
"""

from __future__ import annotations

import asyncio
import random
from datetime import UTC, datetime
from time import monotonic

import httpx

from backend.capabilities.base import Arg, Capability, register
from backend.shapes import Series, Shape

CHART = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
# Yahoo publishes no rate limits for this endpoint, and 429s arrive when the
# request does not look like a browser. Full headers are the first defence.
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://finance.yahoo.com/",
}
TIMEOUT = 20.0

# The omnibar paints as the user types, so a retry budget matters more than
# persistence: honour `Retry-After` when it is short, otherwise back off with
# jitter, and never spend longer than a card is worth waiting for.
ATTEMPTS = 3
BACKOFF = 0.5
MAX_WAIT = 4.0
RETRY_ON = {429, 500, 502, 503, 504}

# Typing "compare nvda amd" then " and msft" would otherwise refetch everything.
# A short cache cuts most of the traffic that earns a 429 in the first place.
CACHE_TTL = 600.0
_CACHE: dict[tuple[str, str], tuple[float, tuple[list[str], list[float]]]] = {}

TICKERS: dict[str, str] = {
    "AAPL": "Apple",
    "MSFT": "Microsoft",
    "NVDA": "Nvidia or NVDA",
    "AMD": "AMD or Advanced Micro Devices",
    "INTC": "Intel",
    "GOOGL": "Google or Alphabet",
    "AMZN": "Amazon",
    "META": "Meta or Facebook",
    "TSLA": "Tesla",
    "NFLX": "Netflix",
    "AVGO": "Broadcom",
    "ORCL": "Oracle",
    "CRM": "Salesforce",
    "ADBE": "Adobe",
    "IBM": "IBM",
    "QCOM": "Qualcomm",
    "TSM": "TSMC or Taiwan Semiconductor",
    "PLTR": "Palantir",
    "COIN": "Coinbase",
    "UBER": "Uber",
    "DIS": "Disney",
    "JPM": "JP Morgan",
    "SPY": "the S&P 500 or the market as a whole",
    "QQQ": "the Nasdaq 100",
}

WINDOWS: dict[str, str] = {
    "5d": "the past few days, this week, or recently",
    "1mo": "the past month or the last few weeks",
    "3mo": "the past three months or the last quarter",
    "6mo": "the past six months or half a year",
    "1y": "the past year, twelve months, or year to date",
    "5y": "the past five years or the long run",
}

LABEL = {
    "5d": "5 days",
    "1mo": "1 month",
    "3mo": "3 months",
    "6mo": "6 months",
    "1y": "1 year",
    "5y": "5 years",
}


async def compare_stocks(symbols: list[str], window: str = "3mo") -> Shape:
    fetched: list[object]
    if all(_cached(symbol, window) is not None for symbol in symbols):
        # Opening a TLS client costs more than the lookup, so skip it entirely.
        fetched = [_cached(symbol, window) for symbol in symbols]
    else:
        async with httpx.AsyncClient(timeout=TIMEOUT, headers=HEADERS) as client:
            fetched = await asyncio.gather(
                *(_history(client, symbol, window) for symbol in symbols),
                return_exceptions=True,
            )

    runs: dict[str, tuple[list[str], list[float]]] = {}
    for symbol, result in zip(symbols, fetched, strict=True):
        if isinstance(result, tuple) and len(result[1]) > 1:
            runs[symbol] = result
    if not runs:
        raise ValueError("no price data came back for those tickers")

    # Symbols can miss different days, so chart against the longest run.
    labels = max((dates for dates, _ in runs.values()), key=len)
    series: dict[str, list[float]] = {}
    rows: list[tuple[str, str]] = []
    for symbol, (_, prices) in runs.items():
        first = prices[0]
        # Rebase to each run's own first close so different price levels compare.
        series[symbol] = [round((price / first - 1) * 100, 2) for price in prices]
        rows.append((symbol, f"{series[symbol][-1]:+.1f}% · ${prices[-1]:,.2f}"))

    rows.sort(key=lambda item: -float(item[1].split("%")[0]))
    caption = f"Percent change over {LABEL.get(window, window)}"
    return Series(
        title=f"{', '.join(runs)} over {LABEL.get(window, window)}",
        labels=labels,
        series=series,
        caption=f"{caption} · {rows[0][0]} leads" if rows else caption,
        rows=rows,
    )


async def _history(
    client: httpx.AsyncClient, symbol: str, window: str
) -> tuple[list[str], list[float]]:
    fresh = _cached(symbol, window)
    if fresh is not None:
        return fresh

    try:
        response = await _fetch(client, symbol, window)
    except Exception:
        # Stale prices beat an empty card, so a rate limit only degrades freshness.
        stale = _CACHE.get((symbol, window))
        if stale is not None:
            return stale[1]
        raise

    result = (response.json().get("chart") or {}).get("result") or []
    if not result:
        raise ValueError(f"no chart for {symbol}")
    stamps = result[0].get("timestamp") or []
    closes = ((result[0].get("indicators") or {}).get("quote") or [{}])[0].get("close") or []

    dates: list[str] = []
    prices: list[float] = []
    for stamp, close in zip(stamps, closes, strict=False):
        # The bar for a still-open trading day has no close yet.
        if close is None:
            continue
        dates.append(datetime.fromtimestamp(stamp, UTC).date().isoformat())
        prices.append(float(close))
    _CACHE[(symbol, window)] = (monotonic() + CACHE_TTL, (dates, prices))
    return dates, prices


def _cached(symbol: str, window: str) -> tuple[list[str], list[float]] | None:
    entry = _CACHE.get((symbol, window))
    return entry[1] if entry is not None and entry[0] > monotonic() else None


async def _fetch(client: httpx.AsyncClient, symbol: str, window: str) -> httpx.Response:
    """Standard 429 handling: honour `Retry-After`, else back off with jitter."""
    for attempt in range(ATTEMPTS):
        response = await client.get(
            CHART.format(symbol=symbol), params={"range": window, "interval": _interval(window)}
        )
        if response.status_code not in RETRY_ON:
            response.raise_for_status()
            return response
        if attempt == ATTEMPTS - 1:
            response.raise_for_status()
        wait = _retry_after(response)
        if wait is None:
            # Jitter keeps three concurrent tickers from retrying in lockstep.
            wait = min(BACKOFF * (2**attempt), MAX_WAIT) + random.uniform(0, 0.25)
        elif wait > MAX_WAIT:
            # Yahoo often asks for 60s. A card cannot wait that long; use the cache.
            response.raise_for_status()
        await asyncio.sleep(wait)
    raise ValueError(f"{symbol} stayed rate limited")


def _retry_after(response: httpx.Response) -> float | None:
    value = response.headers.get("Retry-After")
    if value is None:
        return None
    try:
        return max(0.0, float(value))
    except ValueError:
        return None


def _interval(window: str) -> str:
    if window == "5d":
        return "30m"
    return "1wk" if window == "5y" else "1d"


register(
    Capability(
        name="compare_stocks",
        label="Market comparison",
        criteria=(
            "The user names one or more listed companies, tickers, or indexes and "
            "wants their share price, performance, or a comparison between them."
        ),
        args={
            "symbols": Arg(
                question="Does the user want {} in the comparison?",
                options=TICKERS,
                label="Another ticker",
                many=True,
                required=True,
            ),
            "window": Arg(
                question="How far back does the user want to look?",
                options=WINDOWS,
                default="3mo",
            ),
        },
        run=compare_stocks,
    )
)
