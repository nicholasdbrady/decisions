import asyncio
import json
from contextlib import suppress
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


class _BlockingExtraction(_Extraction):
    def __init__(self, values: dict[str, Any]) -> None:
        super().__init__(values)
        self.started = asyncio.Event()
        self.release = asyncio.Event()

    async def extract(self, request: Any, *, on_text: Any = None) -> Any:
        self.started.set()
        await self.release.wait()
        return await super().extract(request, on_text=on_text)


class _ProgressiveExtraction(_Extraction):
    def __init__(
        self,
        fast_values: dict[str, Any],
        code_values: dict[str, Any] | None = None,
    ) -> None:
        super().__init__()
        self.fast_values = fast_values
        self.code_values = code_values or fast_values
        self.code_started = asyncio.Event()
        self.release_code = asyncio.Event()

    async def extract(self, request: Any, *, on_text: Any = None) -> Any:
        self.lanes.append(request.lane)
        if request.lane == "code":
            self.code_started.set()
            await self.release_code.wait()
            values = self.code_values
        else:
            values = self.fast_values
        return SimpleNamespace(
            ok=True,
            source=request.lane,
            model="gpt-6-luna",
            latency_ms=34,
            code="print(result)" if request.lane == "code" else None,
            sources=None,
            values=values,
        )


class _ConcurrentRoutingClassifier(_Classifier):
    def __init__(self, schema: SchemaId) -> None:
        super().__init__(schema)
        self.dispatch_started = asyncio.Event()
        self.classification_started = asyncio.Event()

    async def ask(self, _: Any, __: Any) -> dict[str, Any]:
        self.dispatch_started.set()
        await self.classification_started.wait()
        return {
            "model": "jev-latest",
            "answers": {
                "__tool__": {
                    "choice": "other",
                    "confidence": 1.0,
                    "probabilities": {"other": 1.0},
                }
            },
        }

    async def classify(self, request: Any) -> Any:
        self.classification_started.set()
        await self.dispatch_started.wait()
        return await super().classify(request)


class _BatchedRoutingClassifier(_Classifier):
    def __init__(self, schema: SchemaId) -> None:
        super().__init__(schema)
        self.calls = 0

    async def classify_with_questions(
        self, request: Any, questions: dict[str, Any]
    ) -> tuple[Any, dict[str, Any]]:
        self.calls += 1
        assert "__tool__" in questions
        result = await super().classify(request)
        return (
            result,
            {
                "model": "jev-latest",
                "answers": {
                    "__tool__": {
                        "choice": "other",
                        "confidence": 1.0,
                        "probabilities": {"other": 1.0},
                    }
                },
            },
        )

    async def ask(self, _: Any, __: Any) -> dict[str, Any]:
        raise AssertionError("batched routing must not issue a second Decision call")

    async def classify(self, _: Any) -> Any:
        raise AssertionError("batched routing must not classify a second time")


def _agent(
    schema: SchemaId = SchemaId.CONVERT, values: dict[str, Any] | None = None
) -> tuple[A2uiCanvasAgent, _Extraction]:
    extraction = _Extraction(values)
    services = {
        "decision_classifier": _Classifier(schema),
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


async def _collect_updates(stream: Any) -> list[Any]:
    return [update async for update in stream]


@pytest.mark.asyncio
async def test_canceling_stream_cancels_in_flight_agent_work(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    agent, _ = _agent()
    started = asyncio.Event()
    canceled = asyncio.Event()

    async def blocking_text(
        _: str,
        __: dict[str, Any],
        ___: Any,
        *,
        progress: Any = None,
    ) -> list[Any]:
        del progress
        started.set()
        try:
            await asyncio.Event().wait()
        finally:
            canceled.set()

    monkeypatch.setattr(agent, "_on_text", blocking_text)
    session = AgentSession(session_id="cancel-test")
    stream = agent.run(
        [Message(role="user", contents=["keep working"])],
        stream=True,
        session=session,
    )

    async def consume() -> None:
        async for _ in stream:
            pass

    consumer = asyncio.create_task(consume())
    await asyncio.wait_for(started.wait(), timeout=1)
    consumer.cancel()
    with suppress(asyncio.CancelledError):
        await consumer

    await asyncio.wait_for(canceled.wait(), timeout=1)
    assert not agent._running


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
    assert components["convert"]["component"] == "Convert"
    data = ops[2]["updateDataModel"]["value"]
    assert {"label": "Kelvin (K)", "value": "kelvin"} in json.loads(data["options"])
    assert data["result_text"] == "255.372"


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
    assert update["value"]["result_text"] == "212"


@pytest.mark.asyncio
async def test_a_split_action_recomputes_the_interactive_surface() -> None:
    session = AgentSession()
    session.metadata = {  # type: ignore[attr-defined]
        "forwarded_props": {
            "a2uiAction": {
                "userAction": {
                    "name": "split",
                    "surfaceId": "split-1",
                    "context": {
                        "total": "230",
                        "people": "3",
                        "tip_percent": "22.5",
                        "currency_symbol": "$",
                    },
                }
            }
        }
    }
    stream = _agent()[0].run([], stream=True, session=session)
    updates = [update async for update in stream]
    ops = _operations(updates)

    assert ops[0]["createSurface"]["surfaceId"] == "split-1"
    components = {c["id"]: c for c in ops[1]["updateComponents"]["components"]}
    assert components["split"]["component"] == "Split"
    assert ops[2]["updateDataModel"]["value"] == {
        "total": "230",
        "people": "3",
        "tip": "22.5",
        "symbol": "$",
        "streaming": False,
        "verification": "verified",
        "confidence": "1.0000",
    }


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
async def test_split_uses_the_approved_visual_breakdown() -> None:
    agent, extraction = _agent(
        SchemaId.SPLIT,
        {
            "total": 286.78,
            "people": 3,
            "names": [],
            "tip_percent": 22,
            "tip_amount": 63.0916,
            "grand_total": 349.8716,
            "answer": "$116.62 per person, including 22% tip",
            "answer_value": 116.623867,
            "currency": "USD",
            "currency_symbol": "$",
        },
    )
    stream = agent.run(
        [Message(role="user", contents=["split a three person meal"])], stream=True
    )
    ops = _operations([update async for update in stream])

    assert set(extraction.lanes) == {"fast", "code"}
    components = {c["id"]: c for c in ops[1]["updateComponents"]["components"]}
    assert components["split"]["component"] == "Split"
    data = ops[2]["updateDataModel"]["value"]
    assert data == {
        "total": "286.78",
        "people": "3",
        "tip": "22",
        "symbol": "$",
        "streaming": False,
        "verification": "verified",
        "confidence": "1.0000",
    }


@pytest.mark.asyncio
async def test_calc_uses_the_approved_computation_surface() -> None:
    agent, extraction = _agent(
        SchemaId.CALC,
        {
            "expression": "85 * 0.2",
            "display": "20% of 85",
            "answer": "17",
            "answer_value": 17,
        },
    )
    stream = agent.run([Message(role="user", contents=["20% of 85"])], stream=True)
    ops = _operations([update async for update in stream])

    assert set(extraction.lanes) == {"fast", "code"}
    components = {c["id"]: c for c in ops[1]["updateComponents"]["components"]}
    assert "head" not in components
    assert components["answer_panel"]["component"] == "Panel"
    assert components["answer"]["component"] == "Metric"
    data = ops[2]["updateDataModel"]["value"]
    assert data == {"answer": "17"}


@pytest.mark.asyncio
async def test_weather_uses_provider_backed_reading_and_forecast() -> None:
    agent, _ = _agent(
        SchemaId.WEATHER,
        {
            "place": "Redmond, WA, US",
            "place_name": "Redmond",
            "when": "Today",
            "start_date": "2026-10-15",
            "end_date": "2026-10-15",
            "units": "imperial",
            "temp_unit": "°F",
            "speed_unit": "mph",
            "temp": 60,
            "feels_like": 58,
            "humidity": 82,
            "wind_speed": 8,
            "wind_deg": 220,
            "condition_group": "rain",
            "condition_label": "Rain",
            "description": "Light rain",
            "window_is_today": True,
            "window_span": 1,
            "high": 64,
            "low": 51,
            "max_wind": 8,
            "max_pop": 0.7,
            "window_hours": [
                {
                    "date": "2026-10-15",
                    "time": "14:00",
                    "temp": 61,
                    "pop": 0.55,
                }
            ],
            "window_days": [
                {
                    "date": "2026-10-15",
                    "high": 64,
                    "low": 51,
                    "pop": 0.7,
                    "condition_group": "rain",
                    "description": "Light rain",
                },
                {
                    "date": "2026-10-16",
                    "high": 66,
                    "low": 50,
                    "pop": 0.1,
                    "condition_group": "clouds",
                    "description": "Partly cloudy",
                },
            ],
            "computed_by": "openweather",
        },
    )
    stream = agent.run(
        [Message(role="user", contents=["weather in redmond today"])], stream=True
    )
    ops = _operations([update async for update in stream])

    components = {c["id"]: c for c in ops[1]["updateComponents"]["components"]}
    assert components["hero"]["component"] == "Hero"
    assert "range" not in components
    assert components["days"]["component"] == "Strip"
    data = ops[2]["updateDataModel"]["value"]
    assert data["title"] == "Light rain in Redmond"
    assert data["reading"] == "60"
    assert data["temp_unit"] == "°F"
    assert data["caption"] == "Feels like 58°"
    assert data["tone"] == "rain"
    assert data["low"] == 51
    assert data["high"] == 64
    assert json.loads(data["forecast"])["steps"] == [
        {"label": "2 PM", "value": 61.0, "rain": 55}
    ]
    assert json.loads(data["days"]) == []
    stats = json.loads(data["stats"])
    assert [stat["label"] for stat in stats] == ["Today", "Rain", "Wind", "Humidity"]
    assert stats[0]["shape"] == {"kind": "range", "lo": 51.0, "hi": 64.0, "at": 60.0}
    assert stats[1]["value"] == "70%"


@pytest.mark.asyncio
async def test_weather_streams_native_skeleton_before_extraction_finishes() -> None:
    values = {
        "place": "Redmond, WA, US",
        "place_name": "Redmond",
        "when": "Today",
        "window_is_today": True,
        "temp": 60,
        "high": 64,
        "low": 51,
        "condition_group": "rain",
        "description": "Light rain",
        "computed_by": "openweather",
    }
    extraction = _BlockingExtraction(values)
    services = {
        "decision_classifier": _Classifier(SchemaId.WEATHER),
        "extraction": extraction,
        "providers": None,
    }
    agent = A2uiCanvasAgent(Services(lambda: services))
    stream = agent.run(
        [Message(role="user", contents=["weather in redmond today"])],
        stream=True,
    )
    updates: list[Any] = []

    async def consume() -> None:
        async for update in stream:
            updates.append(update)

    consumer = asyncio.create_task(consume())
    await asyncio.wait_for(extraction.started.wait(), timeout=1)

    async def first_batch() -> list[dict[str, Any]]:
        while True:
            for update in updates:
                for content in update.contents:
                    if content.type == "function_result":
                        operations = json.loads(content.result)["a2ui_operations"]
                        model = operations[2]["updateDataModel"]["value"]
                        if "reading" in model:
                            return operations
            await asyncio.sleep(0)

    pending = await asyncio.wait_for(first_batch(), timeout=1)
    components = {
        component["id"]: component
        for component in pending[1]["updateComponents"]["components"]
    }
    assert components["hero"]["component"] == "Hero"
    assert pending[2]["updateDataModel"]["value"]["reading"] == ""
    assert not consumer.done()

    extraction.release.set()
    await asyncio.wait_for(consumer, timeout=1)
    batches = [
        json.loads(content.result)["a2ui_operations"]
        for update in updates
        for content in update.contents
        if content.type == "function_result"
    ]
    assert len(batches) == 3
    assert (
        batches[0][0]["createSurface"]["surfaceId"]
        == batches[2][0]["createSurface"]["surfaceId"]
    )
    assert batches[2][2]["updateDataModel"]["value"]["reading"] == "60"


@pytest.mark.asyncio
async def test_split_streams_native_skeleton_before_extraction_finishes() -> None:
    values = {
        "total": 120,
        "people": None,
        "names": [],
        "tip_percent": 0,
        "tip_amount": 0,
        "grand_total": 120,
        "answer": "$60.00 per person",
        "answer_value": 60,
        "currency": "USD",
        "currency_symbol": "$",
    }
    extraction = _BlockingExtraction(values)
    services = {
        "decision_classifier": _Classifier(SchemaId.SPLIT),
        "extraction": extraction,
        "providers": None,
    }
    agent = A2uiCanvasAgent(Services(lambda: services))
    stream = agent.run(
        [Message(role="user", contents=["split a $120 dinner"])],
        stream=True,
    )
    updates: list[Any] = []

    async def consume() -> None:
        async for update in stream:
            updates.append(update)

    consumer = asyncio.create_task(consume())
    await asyncio.wait_for(extraction.started.wait(), timeout=1)

    async def first_batch() -> list[dict[str, Any]]:
        while True:
            for update in updates:
                for content in update.contents:
                    if content.type == "function_result":
                        operations = json.loads(content.result)["a2ui_operations"]
                        model = operations[2]["updateDataModel"]["value"]
                        if model.get("streaming") is True:
                            return operations
            await asyncio.sleep(0)

    pending = await asyncio.wait_for(first_batch(), timeout=1)
    components = {
        component["id"]: component
        for component in pending[1]["updateComponents"]["components"]
    }
    assert components["split"]["component"] == "Split"
    assert pending[2]["updateDataModel"]["value"] == {
        "total": "",
        "people": "2",
        "tip": "0",
        "symbol": "$",
        "streaming": True,
        "verification": "waiting",
        "confidence": "",
    }
    assert not consumer.done()

    extraction.release.set()
    await asyncio.wait_for(consumer, timeout=1)
    batches = [
        json.loads(content.result)["a2ui_operations"]
        for update in updates
        for content in update.contents
        if content.type == "function_result"
    ]
    assert len(batches) >= 4
    assert (
        batches[0][0]["createSurface"]["surfaceId"]
        == batches[-1][0]["createSurface"]["surfaceId"]
    )
    assert batches[-1][2]["updateDataModel"]["value"]["total"] == "120"
    assert batches[-1][2]["updateDataModel"]["value"]["people"] == "2"


@pytest.mark.asyncio
async def test_split_paints_fast_result_before_code_verification_finishes() -> None:
    values = {
        "total": 120,
        "people": 2,
        "tip_percent": 0,
        "answer_value": 60,
        "currency": "USD",
        "currency_symbol": "$",
    }
    extraction = _ProgressiveExtraction(values)
    agent = A2uiCanvasAgent(
        Services(
            lambda: {
                "decision_classifier": _Classifier(SchemaId.SPLIT),
                "extraction": extraction,
                "providers": None,
            }
        )
    )
    stream = agent.run(
        [Message(role="user", contents=["split a $120 dinner"])],
        stream=True,
    )
    updates: list[Any] = []

    async def consume() -> None:
        async for update in stream:
            updates.append(update)

    consumer = asyncio.create_task(consume())
    await asyncio.wait_for(extraction.code_started.wait(), timeout=1)

    async def provisional_batches() -> list[list[dict[str, Any]]]:
        while True:
            batches = [
                json.loads(content.result)["a2ui_operations"]
                for update in updates
                for content in update.contents
                if content.type == "function_result"
            ]
            if any(
                batch[2]["updateDataModel"]["value"].get("verification")
                == "confident"
                for batch in batches
            ):
                return batches
            await asyncio.sleep(0)

    before_verification = await asyncio.wait_for(provisional_batches(), timeout=1)
    confident = next(
        batch
        for batch in before_verification
        if batch[2]["updateDataModel"]["value"].get("verification") == "confident"
    )
    confident_model = confident[2]["updateDataModel"]["value"]
    assert confident_model["total"] == "120"
    assert confident_model["people"] == "2"
    assert confident_model["confidence"] == "0.9000"
    assert not consumer.done()

    extraction.release_code.set()
    await asyncio.wait_for(consumer, timeout=1)
    batches = [
        json.loads(content.result)["a2ui_operations"]
        for update in updates
        for content in update.contents
        if content.type == "function_result"
    ]
    surface_ids = {batch[0]["createSurface"]["surfaceId"] for batch in batches}
    assert len(surface_ids) == 1
    final_model = batches[-1][2]["updateDataModel"]["value"]
    assert final_model["verification"] == "verified"
    assert final_model["confidence"] == "1.0000"
    assert final_model["total"] == "120"


@pytest.mark.asyncio
async def test_split_correction_updates_the_same_surface() -> None:
    fast_values = {
        "total": 120,
        "people": 2,
        "tip_percent": 0,
        "answer_value": 60,
        "currency_symbol": "$",
    }
    code_values = {
        **fast_values,
        "people": 3,
        "answer_value": 40,
    }
    extraction = _ProgressiveExtraction(fast_values, code_values)
    agent = A2uiCanvasAgent(
        Services(
            lambda: {
                "decision_classifier": _Classifier(SchemaId.SPLIT),
                "extraction": extraction,
                "providers": None,
            }
        )
    )
    updates_task = asyncio.create_task(
        _collect_updates(
            agent.run(
                [Message(role="user", contents=["split a $120 dinner"])],
                stream=True,
            )
        )
    )
    await asyncio.wait_for(extraction.code_started.wait(), timeout=1)
    extraction.release_code.set()
    updates = await asyncio.wait_for(updates_task, timeout=1)
    batches = [
        json.loads(content.result)["a2ui_operations"]
        for update in updates
        for content in update.contents
        if content.type == "function_result"
    ]

    assert len({batch[0]["createSurface"]["surfaceId"] for batch in batches}) == 1
    final_model = batches[-1][2]["updateDataModel"]["value"]
    assert final_model["verification"] == "corrected"
    assert final_model["confidence"] == "1.0000"
    assert final_model["people"] == "3"


@pytest.mark.asyncio
async def test_capability_and_schema_routing_start_concurrently() -> None:
    classifier = _ConcurrentRoutingClassifier(SchemaId.SPLIT)
    extraction = _Extraction(
        {
            "total": 120,
            "people": 2,
            "tip_percent": 0,
            "answer_value": 60,
            "currency_symbol": "$",
        }
    )
    agent = A2uiCanvasAgent(
        Services(
            lambda: {
                "decision_classifier": classifier,
                "extraction": extraction,
                "providers": None,
            }
        )
    )
    stream = agent.run(
        [Message(role="user", contents=["split a $120 dinner between two people"])],
        stream=True,
    )
    updates = await asyncio.wait_for(
        _collect_updates(stream),
        timeout=1,
    )

    assert classifier.dispatch_started.is_set()
    assert classifier.classification_started.is_set()
    assert _operations(updates)[2]["updateDataModel"]["value"]["total"] == "120"
    assert _operations(updates)[2]["updateDataModel"]["value"]["people"] == "2"


@pytest.mark.asyncio
async def test_batched_routing_uses_one_decision_call() -> None:
    classifier = _BatchedRoutingClassifier(SchemaId.SPLIT)
    extraction = _Extraction(
        {
            "total": 120,
            "people": 2,
            "tip_percent": 0,
            "answer_value": 60,
            "currency_symbol": "$",
        }
    )
    agent = A2uiCanvasAgent(
        Services(
            lambda: {
                "decision_classifier": classifier,
                "extraction": extraction,
                "providers": None,
            }
        )
    )
    stream = agent.run(
        [Message(role="user", contents=["split a $120 dinner between two people"])],
        stream=True,
    )
    updates = await asyncio.wait_for(_collect_updates(stream), timeout=1)

    assert classifier.calls == 1
    assert _operations(updates)[2]["updateDataModel"]["value"]["total"] == "120"
    assert _operations(updates)[2]["updateDataModel"]["value"]["people"] == "2"


def test_single_day_weather_uses_hourly_context_without_daily_strip() -> None:
    data = surfaces.weather.data(
        {
            "place": "Seattle, Washington, US",
            "place_name": "Seattle",
            "when": "Tomorrow",
            "start_date": "2026-10-16",
            "end_date": "2026-10-16",
            "temp_unit": "°F",
            "speed_unit": "mph",
            "temp": 52,
            "humidity": 92,
            "wind_deg": 339,
            "condition_group": "clear",
            "description": "Clear sky",
            "window_is_today": False,
            "window_span": 1,
            "high": 73,
            "low": 55,
            "max_wind": 10,
            "max_pop": 0,
            "window_days": [
                {
                    "date": "2026-10-16",
                    "high": 73,
                    "low": 55,
                    "pop": 0,
                    "condition_group": "clouds",
                    "description": "Broken clouds",
                }
            ],
            "window_hours": [
                {"date": "2026-10-16", "time": "02:00", "temp": 56, "pop": 0},
                {"date": "2026-10-16", "time": "05:00", "temp": 57, "pop": 0},
                {"date": "2026-10-16", "time": "08:00", "temp": 55, "pop": 0},
                {"date": "2026-10-16", "time": "11:00", "temp": 69, "pop": 0},
                {"date": "2026-10-16", "time": "14:00", "temp": 73, "pop": 0},
                {"date": "2026-10-16", "time": "17:00", "temp": 72, "pop": 0},
                {"date": "2026-10-16", "time": "20:00", "temp": 65, "pop": 0},
                {"date": "2026-10-16", "time": "23:00", "temp": 59, "pop": 0},
            ],
            "computed_by": "openweather",
        }
    )

    assert data["title"] == "Broken clouds in Seattle tomorrow"
    assert data["caption"] == "Low 55°"
    assert json.loads(data["forecast"])["steps"] == [
        {"label": "2 AM", "value": 56.0, "rain": 0},
        {"label": "8 AM", "value": 55.0, "rain": 0},
        {"label": "2 PM", "value": 73.0, "rain": 0},
        {"label": "5 PM", "value": 72.0, "rain": 0},
        {"label": "11 PM", "value": 59.0, "rain": 0},
    ]
    assert json.loads(data["days"]) == []
    assert [stat["label"] for stat in json.loads(data["stats"])] == [
        "Friday",
        "Rain",
        "Wind",
    ]


@pytest.mark.asyncio
async def test_expense_uses_an_amount_first_record_surface() -> None:
    agent, extraction = _agent(
        SchemaId.EXPENSE,
        {
            "amount": 450,
            "currency": "INR",
            "currency_symbol": "₹",
            "merchant": "Contoso Cafe",
            "category": "Food",
            "date": "2026-10-12",
        },
    )
    stream = agent.run(
        [Message(role="user", contents=["spent 450 rupees at Contoso Cafe"])],
        stream=True,
    )
    ops = _operations([update async for update in stream])

    assert set(extraction.lanes) == {"fast", "code"}
    components = {c["id"]: c for c in ops[1]["updateComponents"]["components"]}
    assert components["head"]["component"] == "Header"
    assert components["amount_panel"]["component"] == "Panel"
    assert components["amount"]["component"] == "Metric"
    assert components["amount"]["icon"] == "receipt"
    assert components["details"]["component"] == "Chips"
    data = ops[2]["updateDataModel"]["value"]
    assert data["title"] == "Contoso Cafe"
    assert data["amount"] == "₹450.00"
    assert json.loads(data["details"]) == [
        {"label": "Food", "icon": "food"},
        {"label": "INR", "icon": "dollar"},
        {"label": "Oct 12, 2026", "icon": "calendar"},
    ]


@pytest.mark.asyncio
async def test_checklist_uses_interactive_task_rows() -> None:
    agent, extraction = _agent(
        SchemaId.CHECKLIST,
        {
            "title": "Launch morning",
            "items": ["Review launch notes", "Send final update"],
            "done": ["Review launch notes"],
            "due": "2026-10-13",
        },
    )
    stream = agent.run(
        [Message(role="user", contents=["make my launch morning checklist"])],
        stream=True,
    )
    ops = _operations([update async for update in stream])

    assert extraction.lanes == ["fast"]
    components = {c["id"]: c for c in ops[1]["updateComponents"]["components"]}
    assert components["head"]["component"] == "Header"
    assert components["tasks"]["component"] == "Checklist"
    assert components["details"]["component"] == "Chips"
    data = ops[2]["updateDataModel"]["value"]
    assert data["title"] == "Launch morning"
    assert json.loads(data["items"]) == [
        "Review launch notes",
        "Send final update",
    ]
    assert json.loads(data["done"]) == ["Review launch notes"]
    assert json.loads(data["details"]) == [
        {"label": "Due Oct 13, 2026", "icon": "calendar"}
    ]


@pytest.mark.asyncio
async def test_countdown_uses_a_derived_time_panel() -> None:
    agent, extraction = _agent(
        SchemaId.COUNTDOWN,
        {
            "name": "New Year",
            "date": "2027-01-01",
            "days_remaining": 84,
            "weekday": "Friday",
            "holiday_name": "New Year's Day",
            "answer": "84 days",
            "answer_value": 84,
        },
    )
    stream = agent.run(
        [Message(role="user", contents=["days until new year"])], stream=True
    )
    ops = _operations([update async for update in stream])

    assert set(extraction.lanes) == {"fast", "code"}
    components = {c["id"]: c for c in ops[1]["updateComponents"]["components"]}
    assert components["answer_panel"]["component"] == "Panel"
    assert components["metric"]["component"] == "Metric"
    assert components["chips"]["component"] == "Chips"
    data = ops[2]["updateDataModel"]["value"]
    assert data["remaining"] == "84 days"
    assert data["date_label"] == "Jan 1, 2027"
    assert json.loads(data["chips"]) == [
        {"label": "Friday", "icon": "clock"},
        {"label": "New Year's Day", "icon": "calendar"},
    ]


@pytest.mark.asyncio
async def test_timer_uses_the_local_timer_component() -> None:
    agent, extraction = _agent(
        SchemaId.TIMER,
        {
            "label": "Tea",
            "duration_seconds": 240,
            "answer": "4 minutes",
            "answer_value": 240,
        },
    )
    stream = agent.run(
        [Message(role="user", contents=["tea for 4 minutes"])], stream=True
    )
    ops = _operations([update async for update in stream])

    assert set(extraction.lanes) == {"fast", "code"}
    components = {c["id"]: c for c in ops[1]["updateComponents"]["components"]}
    assert components["timer"]["component"] == "Timer"
    data = ops[2]["updateDataModel"]["value"]
    assert data == {"label": "Tea", "duration_seconds": 240}


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
    assert len(batches) >= 4
    partial = next(
        batch[-1]["updateDataModel"]["value"]
        for batch in batches
        if batch[-1]["updateDataModel"]["value"].get("lead") == "A direct"
    )
    assert partial["lead"] == "A direct"
    assert partial["streaming"] is True
    components = {c["id"]: c for c in ops[1]["updateComponents"]["components"]}
    assert components["answer"]["component"] == "Answer"
    data = ops[2]["updateDataModel"]["value"]
    assert data["lead"] == "A direct sourced answer."
    assert data["streaming"] is False
    assert json.loads(data["lead_sources"]) == [known]
    point = json.loads(data["points"])[0]
    assert point["text"] == "One supporting fact."
    assert point["sources"] == [known]


@pytest.mark.asyncio
async def test_graph_uses_web_lane_and_streams_one_stable_surface() -> None:
    agent, extraction = _agent(
        SchemaId.GRAPH,
        {
            "lead": "Revenue rose each quarter.",
            "caption": "Quarterly revenue",
            "kind": "line",
            "scheme": "palette",
            "unit": "M",
            "labels": ["Q1", "Q2", "Q3"],
            "series": [{"name": "Revenue", "values": [10, 12, 15]}],
            "points": [],
            "links": [],
            "range": None,
            "source_name": "Example filing",
            "source_url": "javascript:alert(1)",
        },
    )
    stream = agent.run([Message(role="user", contents=["graph revenue"])], stream=True)
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
    assert all(
        batch[0]["createSurface"]["surfaceId"]
        == batches[0][0]["createSurface"]["surfaceId"]
        for batch in batches
    )
    partial = batches[1][-1]["updateDataModel"]["value"]
    assert partial["streaming"] is True
    components = {c["id"]: c for c in ops[1]["updateComponents"]["components"]}
    assert components["graph"]["component"] == "Graph"
    graph = json.loads(ops[2]["updateDataModel"]["value"]["graph"])
    assert ops[2]["updateDataModel"]["value"]["streaming"] is False
    assert graph["kind"] == "line"
    assert graph["series"] == [{"name": "Revenue", "values": [10.0, 12.0, 15.0]}]
    assert graph["source_url"] == ""


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
