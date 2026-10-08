import json
from types import SimpleNamespace

import httpx
import pytest

from backend.luna import LunaClient


class _Tokens:
    async def get(self) -> str:
        return "test-token"


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
