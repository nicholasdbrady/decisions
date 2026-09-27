"""Luna-authored A2UI baseline: the model writes the whole surface itself.

This path exists only to measure against the JEV-assembled canvas. It uses MAF's
A2UI auto-injection, so the render sub-agent is the same Luna chat client.
"""

from typing import Any

from agent_framework import Agent, ChatContext, chat_middleware
from agent_framework.openai import OpenAIChatCompletionClient

from backend.config import Settings
from backend.luna import FoundryTokenProvider

INSTRUCTIONS = (
    "You answer every request by rendering one A2UI surface with the UI tool. "
    "For a unit conversion, render a card with the title, a number field for the value, "
    "a picker for the source unit, the converted result as text, a picker for the target "
    "unit, and a Convert button. Compute the result yourself. Keep any chat text to one line."
)


@chat_middleware
async def _no_reasoning(context: ChatContext, call_next: Any) -> None:
    """gpt-6-luna rejects function tools on /chat/completions unless reasoning is off."""
    context.options = {**(dict(context.options) if context.options else {}), "reasoning_effort": "none"}
    await call_next()


def build_authored_agent(settings: Settings) -> Agent:
    tokens = FoundryTokenProvider(settings)
    client = OpenAIChatCompletionClient(
        model=settings.foundry_model_deployment,
        api_key=tokens.get,
        base_url=str(settings.foundry_openai_base_url),
        middleware=[_no_reasoning],
    )
    return Agent(client=client, name="Luna A2UI Author", instructions=INSTRUCTIONS)
