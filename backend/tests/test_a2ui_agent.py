import json
from types import SimpleNamespace
from typing import Any

import pytest
from agent_framework import AgentSession, Message

from backend.a2ui_agent import A2uiCanvasAgent, Services
from backend.contracts import SchemaId


class _Classifier:
    def __init__(self, schema: SchemaId) -> None:
        self.schema = schema

    async def classify(self, _: Any) -> Any:
        return SimpleNamespace(decision=SimpleNamespace(selected_schema=self.schema, confidence=0.9))


class _Extraction:
    async def extract(self, _: Any) -> Any:
        return SimpleNamespace(
            ok=True,
            values={
                "value": 0,
                "from": "degree_Fahrenheit",
                "to": "kelvin",
                "from_label": "Fahrenheit",
                "to_label": "Kelvin",
                "category": "temperature",
                "result": 255.372222,
                "computed_by": "pint",
            },
        )


def _agent(schema: SchemaId = SchemaId.CONVERT) -> A2uiCanvasAgent:
    services = {"jev_classifier": _Classifier(schema), "extraction": _Extraction(), "providers": None}
    return A2uiCanvasAgent(Services(lambda: services))


def _operations(updates: list[Any]) -> list[dict[str, Any]]:
    for update in updates:
        for content in update.contents:
            if content.type == "function_result":
                return json.loads(content.result)["a2ui_operations"]
    raise AssertionError("no A2UI operations were emitted")


@pytest.mark.asyncio
async def test_text_that_jev_calls_convert_builds_a_basic_catalog_surface() -> None:
    stream = _agent().run([Message(role="user", contents=["0 F to K"])], stream=True)
    ops = _operations([update async for update in stream])

    assert [next(iter(k for k in op if k != "version")) for op in ops] == [
        "createSurface",
        "updateComponents",
        "updateDataModel",
    ]
    assert ops[0]["createSurface"]["catalogId"].endswith("v0_9/basic_catalog.json")
    components = {c["id"]: c for c in ops[1]["updateComponents"]["components"]}
    assert components["root"]["component"] == "Card"
    assert {"label": "Kelvin (K)", "value": "kelvin"} in components["to"]["options"]
    assert ops[2]["updateDataModel"]["value"]["result_text"] == "255.372 Kelvin"


@pytest.mark.asyncio
async def test_a_convert_action_repaints_the_same_surface_in_place() -> None:
    session = AgentSession()
    session.metadata = {  # type: ignore[attr-defined]
        "forwarded_props": {
            "a2uiAction": {
                "userAction": {
                    "name": "convert",
                    "surfaceId": "convert-1",
                    "context": {"value": "100", "from": ["degree_Celsius"], "to": ["degree_Fahrenheit"]},
                }
            }
        }
    }
    stream = _agent().run([], stream=True, session=session)
    updates = [update async for update in stream]
    ops = _operations(updates)

    assert ops[0]["createSurface"]["surfaceId"] == "convert-1"
    call = next(c for u in updates for c in u.contents if c.type == "function_call")
    assert call.call_id == "call_convert-1"
    update = ops[-1]["updateDataModel"]
    assert update["value"]["result_text"].startswith("212 ")


@pytest.mark.asyncio
async def test_other_surfaces_explain_they_are_not_built_yet() -> None:
    stream = _agent(SchemaId.NOTE).run([Message(role="user", contents=["remember milk"])], stream=True)
    texts = [u.text for u in [update async for update in stream]]
    assert "note" in texts[0]
