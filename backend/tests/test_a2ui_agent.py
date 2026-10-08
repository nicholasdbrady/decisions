import json
from types import SimpleNamespace
from typing import Any

import pytest
from agent_framework import AgentSession, Message

from backend import surfaces
from backend.a2ui_agent import A2uiCanvasAgent, Services
from backend.capabilities.base import Arg, Capability
from backend.contracts import SchemaId
from backend.dispatch import Dispatch
from backend.shapes import Clarify, render


class _Classifier:
    def __init__(self, schema: SchemaId) -> None:
        self.schema = schema

    async def classify(self, _: Any) -> Any:
        return SimpleNamespace(
            decision=SimpleNamespace(
                selected_schema=self.schema,
                confidence=0.9,
                margin=0.4,
                reason="accepted",
            ),
            candidates=[SimpleNamespace(kind=self.schema, probability=0.9)],
            diagnostics=SimpleNamespace(signals={}, model="jev-latest", latency_ms=12),
        )


class _Extraction:
    def __init__(self, values: dict[str, Any] | None = None) -> None:
        self.values = values
        self.lanes: list[str] = []

    async def extract(self, request: Any, *, on_text: Any = None) -> Any:
        self.lanes.append(request.lane)
        if on_text is not None:
            await on_text('{"lead":"A direct')
            await on_text('{"lead":"A direct sourced answer."')
        return SimpleNamespace(
            ok=True,
            source=request.lane,
            model="gpt-6-luna",
            latency_ms=34,
            code=None,
            sources=None,
            values=self.values
            if self.values is not None
            else {
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


def _agent(
    schema: SchemaId = SchemaId.CONVERT, values: dict[str, Any] | None = None
) -> tuple[A2uiCanvasAgent, _Extraction]:
    extraction = _Extraction(values)
    services = {
        "jev_classifier": _Classifier(schema),
        "extraction": extraction,
        "providers": None,
    }
    return A2uiCanvasAgent(Services(lambda: services)), extraction


def _operations(updates: list[Any]) -> list[dict[str, Any]]:
    found: list[dict[str, Any]] | None = None
    for update in updates:
        for content in update.contents:
            if content.type == "function_result":
                found = json.loads(content.result)["a2ui_operations"]
    if found is not None:
        return found
    raise AssertionError("no A2UI operations were emitted")


@pytest.mark.asyncio
async def test_text_that_jev_calls_convert_builds_a_basic_catalog_surface() -> None:
    agent, extraction = _agent()
    stream = agent.run([Message(role="user", contents=["0 F to K"])], stream=True)
    ops = _operations([update async for update in stream])

    # Convert is arithmetic, so the Python lane runs alongside the fast one.
    assert set(extraction.lanes) == {"fast", "code"}
    assert [next(iter(k for k in op if k != "version")) for op in ops] == [
        "createSurface",
        "updateComponents",
        "updateDataModel",
    ]
    assert ops[0]["createSurface"]["catalogId"] == surfaces.CATALOG_ID
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
                    "context": {
                        "value": "100",
                        "from": ["degree_Celsius"],
                        "to": ["degree_Fahrenheit"],
                    },
                }
            }
        }
    }
    stream = _agent()[0].run([], stream=True, session=session)
    updates = [update async for update in stream]
    ops = _operations(updates)

    assert ops[0]["createSurface"]["surfaceId"] == "convert-1"
    call = next(c for u in updates for c in u.contents if c.type == "function_call")
    assert call.call_id is not None
    assert call.call_id.startswith("call_convert-1_")
    update = ops[-1]["updateDataModel"]
    assert update["value"]["result_text"].startswith("212 ")


@pytest.mark.asyncio
async def test_a_schema_without_its_own_builder_still_paints_a_surface() -> None:
    agent, _ = _agent(
        SchemaId.NOTE, {"title": "Milk", "body": "two percent", "tags": ["home"]}
    )
    stream = agent.run([Message(role="user", contents=["remember milk"])], stream=True)
    ops = _operations([update async for update in stream])

    components = {c["id"]: c for c in ops[1]["updateComponents"]["components"]}
    assert components["root"]["component"] == "Card"
    data = ops[2]["updateDataModel"]["value"]
    assert data["title"] == "Milk"
    assert "two percent" in data.values()
    assert "home" in data.values()


@pytest.mark.asyncio
async def test_answer_uses_web_lane_and_drops_unknown_citations() -> None:
    known = "https://example.com/source"
    agent, extraction = _agent(
        SchemaId.ANSWER,
        {
            "lead": f"A direct sourced answer. ({known})",
            "lead_sources": [known, "https://unknown.example/nope"],
            "points": [
                {
                    "text": f"One supporting fact. ({known})",
                    "sources": [known, "javascript:alert(1)"],
                }
            ],
            "sources": [
                {
                    "url": known,
                    "title": "Example",
                    "site": "Example",
                    "description": None,
                    "image": None,
                }
            ],
        },
    )
    stream = agent.run([Message(role="user", contents=["research this"])], stream=True)
    updates = [update async for update in stream]
    ops = _operations(updates)

    assert extraction.lanes == ["web"]
    batches = [
        json.loads(content.result)["a2ui_operations"]
        for update in updates
        for content in update.contents
        if content.type == "function_result"
    ]
    assert len(batches) >= 3
    partial = batches[1][-1]["updateDataModel"]["value"]
    assert partial["lead"] == "A direct"
    assert partial["streaming"] is True
    components = {c["id"]: c for c in ops[1]["updateComponents"]["components"]}
    assert components["answer"]["component"] == "Answer"
    data = ops[2]["updateDataModel"]["value"]
    assert data["lead"] == "A direct sourced answer."
    assert json.loads(data["lead_sources"]) == [known]
    point = json.loads(data["points"])[0]
    assert point["text"] == "One supporting fact."
    assert point["sources"] == [known]


@pytest.mark.asyncio
async def test_cheap_capability_previews_only_the_top_three_options() -> None:
    calls: list[str] = []

    async def preview(from_city: str, to_city: str) -> tuple[str, str]:
        calls.append(to_city)
        return f"time in {to_city}", f"from {from_city}"

    capability = Capability(
        name="time_between",
        label="Time difference",
        criteria="Time somewhere else",
        args={
            "from_city": Arg(question="From?", default="seattle"),
            "to_city": Arg(question="To?", required=True),
        },
        run=lambda **_: {},
        preview=preview,
    )
    shape = Clarify(
        title="Time difference",
        prompt="Which place?",
        argument="to_city",
        options=[
            {"label": name.title(), "value": name, "probability": share}
            for name, share in (
                ("new_york", 0.58),
                ("london", 0.25),
                ("tokyo", 0.06),
                ("paris", 0.05),
            )
        ],
    )
    decided = Dispatch(capability=capability, arguments={"from_city": "seattle"})

    await _agent()[0]._add_previews(shape, decided)

    assert calls == ["new_york", "london", "tokyo"]
    assert [option.get("preview") for option in shape.options] == [
        {"value": "time in new_york", "context": "from seattle"},
        {"value": "time in london", "context": "from seattle"},
        {"value": "time in tokyo", "context": "from seattle"},
        None,
    ]
    # Rendering must keep each preview Choice as the button child. A duplicate
    # fallback Button with the same id would replace this link in updateComponents.
    components = {component["id"]: component for component in render(shape).components}
    assert components["opt0"]["child"] == "opt0_choice"
    assert components["opt0_choice"]["value"] == "time in new_york"
    assert components["opt0_choice"]["context"] == "from seattle"
    assert "opt0_label" not in components
