import pytest

from backend.contracts import SchemaId
from backend.switching import decide_schema_switch


def distribution(**overrides: float) -> dict[SchemaId, float]:
    values = {schema: 0.0 for schema in SchemaId}
    values.update({SchemaId(name): value for name, value in overrides.items()})
    return values


def test_initial_match_requires_confidence_and_margin() -> None:
    decision = decide_schema_switch(
        distribution(event=0.72, reminder=0.12, checklist=0.08, timer=0.08),
        current_schema=None,
        confidence_threshold=0.58,
        margin_threshold=0.12,
        hysteresis_margin=0.08,
    )

    assert decision.accepted is True
    assert decision.selected_schema is SchemaId.EVENT
    assert decision.reason == "initial_match"


def test_current_schema_is_held_when_new_winner_has_small_margin() -> None:
    decision = decide_schema_switch(
        distribution(event=0.43, reminder=0.50, checklist=0.07),
        current_schema=SchemaId.EVENT,
        confidence_threshold=0.40,
        margin_threshold=0.12,
        hysteresis_margin=0.08,
    )

    assert decision.accepted is False
    assert decision.selected_schema is SchemaId.EVENT
    assert decision.reason == "below_margin_threshold"


def test_clear_winner_switches_schema() -> None:
    decision = decide_schema_switch(
        distribution(event=0.10, reminder=0.78, checklist=0.12),
        current_schema=SchemaId.EVENT,
        confidence_threshold=0.58,
        margin_threshold=0.12,
        hysteresis_margin=0.08,
    )

    assert decision.accepted is True
    assert decision.selected_schema is SchemaId.REMINDER
    assert decision.reason == "clear_switch"


def test_empty_distribution_fails_closed() -> None:
    with pytest.raises(ValueError, match="At least one"):
        decide_schema_switch(
            {},
            current_schema=None,
            confidence_threshold=0.58,
            margin_threshold=0.12,
            hysteresis_margin=0.08,
        )
