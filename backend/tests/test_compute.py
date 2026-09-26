from datetime import date

import pytest

from backend.compute import compute
from backend.config import Settings
from backend.contracts import SchemaId
from backend.providers import (
    Providers,
    currency_code,
    currency_symbol,
)


@pytest.fixture
def providers() -> Providers:
    return Providers.build(Settings(default_country="US"))


@pytest.mark.asyncio
async def test_convert_temperature_uses_offsets() -> None:
    values = await compute(SchemaId.CONVERT, {"value": 300, "from": "degC", "to": "degF"})
    assert values["result"] == 572
    assert values["computed_by"] == "pint"
    assert values["to_label"] == "°F"


@pytest.mark.asyncio
async def test_convert_lengths() -> None:
    values = await compute(SchemaId.CONVERT, {"value": 5, "from": "mile", "to": "km"})
    assert round(values["result"], 3) == 8.047


@pytest.mark.asyncio
async def test_convert_incompatible_units_leaves_result_empty() -> None:
    values = await compute(SchemaId.CONVERT, {"value": 5, "from": "kg", "to": "km"})
    assert values["result"] is None
    assert values["computed_by"] is None


@pytest.mark.asyncio
async def test_convert_currency_without_a_key_still_labels_the_card() -> None:
    values = await compute(SchemaId.CONVERT, {"value": 100, "from": "usd", "to": "euros"})
    assert values["kind"] == "currency"
    assert values["from"] == "USD"
    assert values["to"] == "EUR"
    assert values["to_symbol"] == "€"
    assert values["result"] is None


@pytest.mark.asyncio
async def test_other_cards_pass_through() -> None:
    values = {"expression": "2*17"}
    assert await compute(SchemaId.CALC, values) is values


@pytest.mark.asyncio
async def test_countdown_resolves_a_named_holiday(providers: Providers) -> None:
    values = await compute(
        SchemaId.COUNTDOWN,
        {"name": "days until thanksgiving"},
        providers,
        today=date(2026, 9, 24),
    )
    assert values["date"] == "2026-11-26"
    assert values["days_remaining"] == 63
    assert values["weekday"] == "Thursday"
    assert values["computed_by"] == "holidays"


@pytest.mark.asyncio
async def test_countdown_counts_an_explicit_date(providers: Providers) -> None:
    values = await compute(
        SchemaId.COUNTDOWN,
        {"name": "My birthday", "date": "2026-10-02"},
        providers,
        today=date(2026, 9, 24),
    )
    assert values["days_remaining"] == 8
    assert values["holiday_name"] is None


@pytest.mark.asyncio
async def test_expense_normalizes_currency() -> None:
    values = await compute(SchemaId.EXPENSE, {"amount": 450, "currency": "rupees"})
    assert values["currency"] == "INR"
    assert values["currency_symbol"] == "₹"


def test_currency_code_reads_symbols_words_and_iso() -> None:
    assert currency_code("$") == "USD"
    assert currency_code("Pounds") == "GBP"
    assert currency_code("jpy") == "JPY"
    assert currency_code("sek") == "SEK"
    assert currency_code("banana") is None
    assert currency_symbol("KRW") == "₩"


def test_an_unnamed_weather_question_is_asked_about_redmond(providers: Providers) -> None:
    assert providers.weather.default_place.label == "Redmond, WA, US"
