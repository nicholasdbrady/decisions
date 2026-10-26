"""Confidence is the gate on a closed-set argument.

A Choice always returns some option, so the answer alone can never say "the text
did not mention this". Confidence can, and these tests pin that so the dispatcher
cannot quietly go back to acting on a guess.
"""

import pytest

from backend.capabilities.base import Arg, Capability
from backend.dispatch import dispatch
from backend.shapes import Clarify

PLACES = {
    "seattle": "Seattle",
    "new_york": "New York",
    "london": "London",
    "tokyo": "Tokyo",
}


def capability() -> Capability:
    return Capability(
        name="time_between",
        label="Time difference",
        criteria="The user wants a time difference.",
        args={
            "from_city": Arg(
                question="Starting side?",
                options=PLACES,
                default="seattle",
                floor=0.9,
            ),
            "to_city": Arg(
                question="Which place does the user want the time for?",
                ask="Which place did you mean?",
                options=PLACES,
                required=True,
                label="Another place",
            ),
        },
        run=lambda **_: {},
    )


class FakeClassifier:
    """Answers the batched question set with whatever the test wants."""

    def __init__(self, answers: dict[str, object]) -> None:
        self._answers = answers

    async def ask(self, _inputs: object, _questions: object) -> dict[str, object]:
        return {"answers": self._answers, "model": "fake"}


def answers(to_confidence: float, from_confidence: float = 0.99) -> dict[str, object]:
    return {
        "__tool__": {
            "choice": "time_between",
            "confidence": 0.98,
            "probabilities": {"time_between": 1.0},
        },
        "time_between.from_city": {"choice": "seattle", "confidence": from_confidence},
        "time_between.to_city": {
            "choice": "new_york",
            "confidence": to_confidence,
            "probabilities": {
                "new_york": 0.58,
                "london": 0.25,
                "tokyo": 0.06,
                "seattle": 0.01,
            },
        },
    }


@pytest.fixture(autouse=True)
def registered(monkeypatch: pytest.MonkeyPatch) -> None:
    from backend import dispatch as module

    monkeypatch.setattr(module, "REGISTRY", {"time_between": capability()})


@pytest.mark.asyncio
async def test_low_confidence_reports_the_argument_missing() -> None:
    result = await dispatch(
        FakeClassifier(answers(to_confidence=0.57)), "what time is it over there"
    )
    assert result.missing == "to_city"
    assert "to_city" not in result.arguments


@pytest.mark.asyncio
async def test_high_confidence_acts_on_the_answer() -> None:
    result = await dispatch(
        FakeClassifier(answers(to_confidence=0.96)), "what time is it in new york"
    )
    assert result.missing is None
    assert result.arguments["to_city"] == "new_york"


@pytest.mark.asyncio
async def test_an_optional_argument_below_its_floor_keeps_its_default() -> None:
    # from_city has a home default worth more than a confident-sounding guess.
    said = answers(to_confidence=0.96, from_confidence=0.6)
    said["time_between.from_city"]["choice"] = "new_york"  # type: ignore[index]
    result = await dispatch(FakeClassifier(said), "what time is it in new york")
    assert result.arguments["from_city"] == "seattle"
    assert result.missing is None


@pytest.mark.asyncio
async def test_clarify_leads_with_jevs_own_ranking() -> None:
    result = await dispatch(
        FakeClassifier(answers(to_confidence=0.57)), "what time is it over there"
    )
    shape = result.gate()
    assert isinstance(shape, Clarify)
    assert [option["value"] for option in shape.options][:3] == [
        "new_york",
        "london",
        "tokyo",
    ]
    assert shape.options[0]["probability"] == pytest.approx(0.58)
    assert shape.prompt == "Which place did you mean?"
    # The card has to offer a way out of the closed set, or an unlisted place
    # leaves the user stuck picking something wrong.
    assert shape.label == "Another place"


def test_arg_question_remains_the_classifier_instruction() -> None:
    from backend.capabilities import base

    questions = base.questions()
    assert (
        questions["time_between.to_city"]["instructions"]
        == "Which place does the user want the time for?"
    )


@pytest.mark.asyncio
async def test_an_override_suppresses_the_gate() -> None:
    result = await dispatch(
        FakeClassifier(answers(to_confidence=0.57)),
        "what time is it over there",
        overrides={"to_city": "tokyo"},
    )
    assert result.missing is None
    assert result.arguments["to_city"] == "tokyo"
    assert result.gate() is None
