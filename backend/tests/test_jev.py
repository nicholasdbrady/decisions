import httpx
import pytest

from backend.config import Settings
from backend.contracts import ClassificationRequest, SchemaId
from backend.jev import JevProtocolError, OpenRouterJevClassifier


def response_payload() -> dict[str, object]:
    others = 0.14 / (len(SchemaId) - 1)
    probabilities = {schema.value: others for schema in SchemaId}
    probabilities[SchemaId.EVENT.value] = 0.86
    return {
        "id": "dec_test",
        "provider": "typesafe",
        "model": "typesafe/jev-1.13",
        "answers": {
            "schema": {
                "type": "choice",
                "choice": "event",
                "confidence": 0.86,
                "probabilities": probabilities,
            },
            "needs_clarification": {"type": "noul", "noul": 0.04},
            "has_enough_evidence": {"type": "noul", "noul": 0.97},
            "needs_expansion": {"type": "noul", "noul": 0.02},
            "lists_items": {"type": "noul", "noul": 0.1},
            "is_complete": {"type": "noul", "noul": 0.9},
        },
        "usage": {"input_tokens": 30, "output_tokens": 4, "cost": 0.00001},
    }


@pytest.mark.asyncio
async def test_classifier_parses_valid_decisions_response() -> None:
    captured_request: httpx.Request | None = None

    def respond(request: httpx.Request) -> httpx.Response:
        nonlocal captured_request
        captured_request = request
        return httpx.Response(200, json=response_payload())

    transport = httpx.MockTransport(respond)
    async with httpx.AsyncClient(transport=transport) as client:
        classifier = OpenRouterJevClassifier(
            Settings(openrouter_api_key="test-key"),
            client=client,
        )
        result = await classifier.classify(
            ClassificationRequest(
                text="Lunch with Alex tomorrow at noon",
                generation=7,
            )
        )

    assert result.generation == 7
    assert result.decision.selected_schema is SchemaId.EVENT
    assert result.candidates[0].kind is SchemaId.EVENT
    assert result.diagnostics.request_id == "dec_test"
    assert result.diagnostics.signals == {
        "needs_expansion": 0.02,
        "lists_items": 0.1,
        "is_complete": 0.9,
    }
    assert captured_request is not None
    assert captured_request.headers["Authorization"] == "Bearer test-key"
    assert captured_request.headers["HTTP-Referer"] == "http://localhost:3000"
    assert captured_request.headers["X-OpenRouter-Title"] == "JEV Command Canvas"
    assert '"model":"~typesafe/jev-latest"' in captured_request.content.decode()


@pytest.mark.asyncio
async def test_classifier_rejects_missing_schema_probability() -> None:
    payload = response_payload()
    payload["answers"]["schema"]["probabilities"].pop("trip")  # type: ignore[index]
    transport = httpx.MockTransport(lambda request: httpx.Response(200, json=payload))

    async with httpx.AsyncClient(transport=transport) as client:
        classifier = OpenRouterJevClassifier(
            Settings(openrouter_api_key="test-key"),
            client=client,
        )
        with pytest.raises(JevProtocolError, match="incomplete"):
            await classifier.classify(ClassificationRequest(text="Plan a trip"))


@pytest.mark.asyncio
async def test_classifier_requires_api_key() -> None:
    classifier = OpenRouterJevClassifier(Settings(openrouter_api_key=None))

    with pytest.raises(RuntimeError, match="OPENROUTER_API_KEY"):
        await classifier.classify(ClassificationRequest(text="Set a timer"))
