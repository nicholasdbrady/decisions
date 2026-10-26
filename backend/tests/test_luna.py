import asyncio
import json
from types import SimpleNamespace

import httpx
import pytest

from backend.luna import LunaClient


class _Tokens:
    async def get(self) -> str:
        return "test-token"


class _SlowLuna(LunaClient):
    def __init__(self, settings: SimpleNamespace, response: dict[str, object]) -> None:
        super().__init__(settings, _Tokens())  # type: ignore[arg-type]
        self._response = response

    async def _post_once(
        self,
        payload: dict[str, object],
        timeout_seconds: float,
    ) -> dict[str, object]:
        del payload, timeout_seconds
        await asyncio.sleep(0.03)
        return self._response


@pytest.mark.asyncio
async def test_json_stream_forwards_cumulative_output_text() -> None:
    answer = '{"lead":"Streamed answer","lead_sources":[],"points":[],"sources":[]}'
    response = {
        "output": [
            {
                "type": "message",
                "content": [{"type": "output_text", "text": answer, "annotations": []}],
            }
        ],
        "usage": {},
    }
    events = [
        {"type": "response.output_text.delta", "delta": '{"lead":"Streamed'},
        {
            "type": "response.output_text.delta",
            "delta": ' answer","lead_sources":[],"points":[],"sources":[]}',
        },
        {"type": "response.completed", "response": response},
    ]
    body = (
        "".join(f"data: {json.dumps(event)}\n\n" for event in events)
        + "data: [DONE]\n\n"
    )

    def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200, headers={"content-type": "text/event-stream"}, content=body
        )

    settings = SimpleNamespace(
        foundry_model_deployment="gpt-test",
        foundry_reasoning_effort="low",
        foundry_timeout_seconds=5.0,
        foundry_openai_base_url="https://example.test/openai/v1",
    )
    updates: list[str] = []

    async def collect(text: str) -> None:
        updates.append(text)

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        luna = LunaClient(settings, _Tokens(), client=client)  # type: ignore[arg-type]
        values, sources = await luna.json(
            name="answer_fields",
            instructions="Answer.",
            input="Question",
            schema={
                "type": "object",
                "additionalProperties": True,
                "properties": {},
            },
            on_text=collect,
        )

    assert updates == [
        '{"lead":"Streamed',
        answer,
    ]
    assert values["lead"] == "Streamed answer"
    assert sources == []


@pytest.mark.asyncio
async def test_json_with_python_returns_executed_code_and_logs() -> None:
    answer = '{"expression":"0.20*85","answer":"17"}'
    response = {
        "output": [
            {
                "type": "code_interpreter_call",
                "code": "result = 0.20 * 85\nprint(result)",
                "outputs": [{"type": "logs", "logs": "17.0\n"}],
            },
            {
                "type": "message",
                "content": [{"type": "output_text", "text": answer, "annotations": []}],
            },
        ],
        "usage": {},
    }

    def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=response)

    settings = SimpleNamespace(
        foundry_model_deployment="gpt-test",
        foundry_reasoning_effort="low",
        foundry_timeout_seconds=5.0,
        foundry_openai_base_url="https://example.test/openai/v1",
    )

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        luna = LunaClient(settings, _Tokens(), client=client)  # type: ignore[arg-type]
        values, code, output = await luna.json_with_python(
            name="calc_python",
            instructions="Calculate.",
            input="20% of 85",
            schema={
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "expression": {"type": "string"},
                    "answer": {"type": "string"},
                },
                "required": ["expression", "answer"],
            },
        )

    assert values == {"expression": "0.20*85", "answer": "17"}
    assert code == ["result = 0.20 * 85\nprint(result)"]
    assert output == ["17.0\n"]


@pytest.mark.asyncio
async def test_json_with_python_accepts_null_interpreter_outputs() -> None:
    answer = '{"expression":"0.20*85","answer":"17"}'
    response = {
        "output": [
            {
                "type": "code_interpreter_call",
                "code": "result = 0.20 * 85",
                "outputs": None,
            },
            {
                "type": "message",
                "content": [{"type": "output_text", "text": answer, "annotations": []}],
            },
        ],
        "usage": {},
    }

    def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=response)

    settings = SimpleNamespace(
        foundry_model_deployment="gpt-test",
        foundry_reasoning_effort="low",
        foundry_timeout_seconds=5.0,
        foundry_openai_base_url="https://example.test/openai/v1",
    )

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        luna = LunaClient(settings, _Tokens(), client=client)  # type: ignore[arg-type]
        values, code, output = await luna.json_with_python(
            name="calc_python",
            instructions="Calculate.",
            input="20% of 85",
            schema={
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "expression": {"type": "string"},
                    "answer": {"type": "string"},
                },
                "required": ["expression", "answer"],
            },
        )

    assert values == {"expression": "0.20*85", "answer": "17"}
    assert code == ["result = 0.20 * 85"]
    assert output == []


@pytest.mark.asyncio
async def test_code_interpreter_uses_its_longer_timeout() -> None:
    answer = '{"expression":"120/2","answer":"60"}'
    response: dict[str, object] = {
        "output": [
            {
                "type": "message",
                "content": [{"type": "output_text", "text": answer, "annotations": []}],
            }
        ],
        "usage": {},
    }
    settings = SimpleNamespace(
        foundry_model_deployment="gpt-test",
        foundry_reasoning_effort="low",
        foundry_timeout_seconds=0.01,
        foundry_code_timeout_seconds=0.1,
        foundry_openai_base_url="https://example.test/openai/v1",
    )
    luna = _SlowLuna(settings, response)

    values, _, _ = await luna.json_with_python(
        name="split_python",
        instructions="Calculate.",
        input="Split 120 between two people.",
        schema={
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "expression": {"type": "string"},
                "answer": {"type": "string"},
            },
            "required": ["expression", "answer"],
        },
    )

    assert values["answer"] == "60"
