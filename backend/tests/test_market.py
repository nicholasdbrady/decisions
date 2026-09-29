"""Yahoo rate limiting is hard to reproduce on demand, so pin the retry policy."""

from __future__ import annotations

import httpx
import pytest

from backend.capabilities import market


@pytest.fixture(autouse=True)
def _clear_cache():
    market._CACHE.clear()
    yield
    market._CACHE.clear()


def _client(*replies: tuple[int, dict[str, str]]) -> tuple[httpx.AsyncClient, list[httpx.Request]]:
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        status, headers = replies[len(seen)]
        seen.append(request)
        return httpx.Response(status, headers=headers, json={"chart": {"result": []}})

    return httpx.AsyncClient(transport=httpx.MockTransport(handler)), seen


@pytest.mark.asyncio
async def test_honours_retry_after():
    client, seen = _client((429, {"Retry-After": "0"}), (200, {}))
    async with client:
        assert (await market._fetch(client, "NVDA", "3mo")).status_code == 200
    assert len(seen) == 2


@pytest.mark.asyncio
async def test_backs_off_without_retry_after():
    client, seen = _client((429, {}), (429, {}), (200, {}))
    async with client:
        assert (await market._fetch(client, "NVDA", "3mo")).status_code == 200
    assert len(seen) == 3


@pytest.mark.asyncio
async def test_gives_up_when_the_wait_outlasts_the_card():
    client, seen = _client((429, {"Retry-After": "600"}))
    async with client:
        with pytest.raises(httpx.HTTPStatusError):
            await market._fetch(client, "NVDA", "3mo")
    # One look is enough: nothing is worth blocking the omnibar for ten minutes.
    assert len(seen) == 1


@pytest.mark.asyncio
async def test_serves_stale_prices_rather_than_failing():
    stale = (["2026-01-01", "2026-01-02"], [1.0, 2.0])
    market._CACHE[("NVDA", "3mo")] = (0.0, stale)
    client, _ = _client((429, {}), (429, {}), (429, {}))
    async with client:
        assert await market._history(client, "NVDA", "3mo") == stale


@pytest.mark.asyncio
async def test_fresh_cache_skips_the_network():
    fresh = (["2026-01-01", "2026-01-02"], [1.0, 2.0])
    market._CACHE[("NVDA", "3mo")] = (float("inf"), fresh)
    client, seen = _client()
    async with client:
        assert await market._history(client, "NVDA", "3mo") == fresh
    assert not seen

