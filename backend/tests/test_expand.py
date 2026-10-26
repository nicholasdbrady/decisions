import json

import httpx
import pytest

from backend.config import Settings
from backend.contracts import SchemaId
from backend.expand import (
    IMPLIED_COMPONENTS,
    INGREDIENT_CATALOG,
    DecisionCatalogProvider,
    ExpandRequest,
    ExpansionService,
    FoundryLunaProvider,
    LunaDishExtractor,
    ParsedDish,
    resolve_modes,
)
from backend.extract import CARD_FIELDS, ExtractionService, ExtractRequest, card_schema
from backend.jev import MicrosoftDecisionClassifier
from backend.luna import LunaClient


class _StaticTokens:
    async def get(self) -> str:
        return "token"


def _luna_reply(body: object) -> httpx.Response:
    return httpx.Response(
        200,
        json={"output": [{"content": [{"type": "output_text", "text": json.dumps(body)}]}]},
    )


def _luna(client: httpx.AsyncClient) -> LunaClient:
    return LunaClient(Settings(), _StaticTokens(), client=client)  # type: ignore[arg-type]


def test_resolve_modes_prefers_overrides() -> None:
    dishes = resolve_modes([ParsedDish(name="Meatballs")], {"meatballs": "homemade"})
    assert dishes[0].mode == "homemade"


def test_card_schemas_are_strict_for_every_card() -> None:
    assert set(CARD_FIELDS) == set(SchemaId)
    for schema in SchemaId:
        spec = card_schema(schema)
        assert spec["additionalProperties"] is False
        assert spec["required"] == list(spec["properties"])


@pytest.mark.asyncio
async def test_foundry_provider_sends_raw_text_and_parses_output() -> None:
    captured: dict[str, object] = {}

    def respond(request: httpx.Request) -> httpx.Response:
        captured.update(json.loads(request.content))
        return _luna_reply(
            {
                "title": "Meatballs",
                "dishes": [{"name": "Meatballs", "mode": "homemade", "items": ["eggs"]}],
            }
        )

    async with httpx.AsyncClient(transport=httpx.MockTransport(respond)) as client:
        provider = FoundryLunaProvider(_luna(client), web_search=True)
        result = await provider.expand("meatballs", None, {"meatballs": "homemade"})

    assert result.ok and result.provider == "foundry-web"
    assert result.title == "Meatballs"
    assert result.dishes[0].items == ["eggs"]
    assert captured["tools"] == [{"type": "web_search"}]
    sent = json.loads(captured["input"])  # type: ignore[arg-type]
    assert sent == {"request": "meatballs", "mode_overrides": {"meatballs": "homemade"}}


@pytest.mark.asyncio
async def test_decision_provider_scores_dishes_named_by_luna() -> None:
    def respond(request: httpx.Request) -> httpx.Response:
        if "systemone" not in request.url.path:
            return _luna_reply(
                {"title": "Meatballs", "dishes": [{"name": "Meatballs", "mode": "unspecified"}]}
            )
        questions = json.loads(request.content)["questions"]
        answers = {}
        for key in questions:
            if key.startswith("m"):
                answers[key] = {"type": "noul", "noul": 0.1}
            elif key.startswith("c"):
                sauce = IMPLIED_COMPONENTS[int(key[1:])] == "Marinara sauce"
                answers[key] = {"type": "noul", "noul": 0.9 if sauce else 0.1}
            else:
                item = INGREDIENT_CATALOG[int(key.split("_i")[1])]
                answers[key] = {"type": "noul", "noul": 0.9 if item == "eggs" else 0.1}
        return httpx.Response(
            200,
            json={
                "model": "microsoft-decision-1",
                "answers": answers,
                "usage": {"input_tokens": 50, "output_tokens": 10},
            },
        )

    async with httpx.AsyncClient(transport=httpx.MockTransport(respond)) as client:
        settings = Settings()
        decision = MicrosoftDecisionClassifier(
            settings,
            _StaticTokens(),  # type: ignore[arg-type]
            client=client,
        )
        provider = DecisionCatalogProvider(settings, decision)
        service = ExpansionService([provider], LunaDishExtractor(_luna(client)))
        response = await service.expand(
            ExpandRequest(text="meatballs grocery list", providers=["decision"])
        )

    result = response.results[0]
    assert result.ok, result.error
    assert response.dishes_parsed == ["Meatballs"]
    assert response.title == "Meatballs"
    assert [d.name for d in result.dishes] == ["Meatballs", "Marinara sauce"]
    assert result.dishes[0].mode == "homemade"
    assert result.dishes[0].items == ["eggs"]


@pytest.mark.asyncio
async def test_extraction_uses_card_schema_and_no_reasoning() -> None:
    captured: dict[str, object] = {}

    def respond(request: httpx.Request) -> httpx.Response:
        captured.update(json.loads(request.content))
        return _luna_reply({"label": "Focus", "duration_seconds": 1500})

    async with httpx.AsyncClient(transport=httpx.MockTransport(respond)) as client:
        service = ExtractionService(_luna(client))
        response = await service.extract(ExtractRequest(text="25 min focus", card=SchemaId.TIMER))

    assert response.ok, response.error
    assert response.values == {"label": "Focus", "duration_seconds": 1500}
    assert captured["reasoning"] == {"effort": "none"}
    fmt = captured["text"]["format"]  # type: ignore[index]
    assert fmt["schema"] == card_schema(SchemaId.TIMER)
