import pytest
from agent_framework import Message

from backend.canvas_agent import CommandCanvasAgent


@pytest.mark.asyncio
async def test_canvas_agent_streams_transport_acknowledgement() -> None:
    agent = CommandCanvasAgent()
    stream = agent.run(
        [Message(role="user", contents=["Dinner with Priya Friday at 8"])],
        stream=True,
    )

    updates = [update async for update in stream]
    final = await stream.get_final_response()

    assert updates[0].text == (
        "The AG-UI transport received the command. "
        "Foundry enrichment is pending for: Dinner with Priya Friday at 8"
    )
    assert final.agent_id == agent.id
