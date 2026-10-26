"""Luna-authored A2UI baseline: the model writes the whole surface itself.

This path exists only to measure against the JEV-assembled canvas. It uses MAF's
A2UI auto-injection, so the render sub-agent is the same Luna chat client.
"""

from agent_framework import Agent
from agent_framework.openai import OpenAIChatClient

from backend.config import Settings
from backend.luna import FoundryTokenProvider

INSTRUCTIONS = (
    "You answer every request by rendering one A2UI surface with the UI tool. "
    "For a unit conversion, render a card with the title, a number field for the value, "
    "a picker for the source unit, the converted result as text, a picker for the target "
    "unit, and a Convert button. Compute the result yourself. Keep any chat text to one line."
)


def build_authored_agent(settings: Settings) -> Agent:
    tokens = FoundryTokenProvider(settings)
    # OpenAIChatClient is the Responses client. The chat/completions path is not used.
    client = OpenAIChatClient(
        model=settings.foundry_model_deployment,
        api_key=tokens.get,
        base_url=str(settings.foundry_openai_base_url),
    )
    return Agent(client=client, name="Luna A2UI Author", instructions=INSTRUCTIONS)
