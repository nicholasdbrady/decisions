from collections.abc import AsyncIterator, Sequence
from uuid import uuid4

from agent_framework import (
    AgentResponse,
    AgentResponseUpdate,
    AgentSession,
    Content,
    Message,
    ResponseStream,
    ServiceSessionId,
)

from backend.telemetry import agent_span, set_attributes, set_sensitive


def _conversation_id(session: AgentSession | None) -> str | None:
    """AG-UI supplies the thread id as the session id; it is the conversation id."""
    if session is None:
        return None
    for value in (session.service_session_id, getattr(session, "session_id", None)):
        if isinstance(value, str) and value:
            return value
    return None


class CommandCanvasAgent:
    id = "jev-command-canvas"
    name = "JEV Command Canvas"
    description = "Coordinates bounded command-canvas enrichment over AG-UI."

    def create_session(self, *, session_id: str | None = None) -> AgentSession:
        return AgentSession(session_id=session_id)

    def get_session(
        self,
        service_session_id: str | ServiceSessionId,
        *,
        session_id: str | None = None,
    ) -> AgentSession:
        return AgentSession(
            service_session_id=service_session_id,
            session_id=session_id,
        )

    def run(
        self,
        messages: Message | Sequence[Message] | str | None = None,
        *,
        stream: bool = False,
        session: AgentSession | None = None,
        function_invocation_kwargs: object | None = None,
        client_kwargs: object | None = None,
    ) -> AgentResponse | ResponseStream[AgentResponseUpdate, AgentResponse]:
        del function_invocation_kwargs, client_kwargs
        response_id = f"canvas-{uuid4()}"
        with agent_span(
            agent_id=self.id,
            agent_name=self.name,
            agent_description=self.description,
            conversation_id=_conversation_id(session),
        ) as span:
            response_text = self._response_text(messages)
            set_attributes(
                span,
                {
                    "gen_ai.response.id": response_id,
                    "gen_ai.output.type": "text",
                    "jev.stream": stream,
                },
            )
            set_sensitive(
                span,
                {
                    "gen_ai.input.messages": self._latest_text(messages),
                    "gen_ai.output.messages": response_text,
                },
            )
        response_message = Message(role="assistant", contents=[response_text])

        if not stream:
            return AgentResponse(
                messages=[response_message],
                response_id=response_id,
                agent_id=self.id,
            )

        async def updates() -> AsyncIterator[AgentResponseUpdate]:
            yield AgentResponseUpdate(
                contents=[Content(type="text", text=response_text)],
                role="assistant",
                agent_id=self.id,
                response_id=response_id,
            )

        async def finalize(
            _: Sequence[AgentResponseUpdate],
        ) -> AgentResponse:
            return AgentResponse(
                messages=[response_message],
                response_id=response_id,
                agent_id=self.id,
            )

        return ResponseStream(updates(), finalizer=finalize)

    @staticmethod
    def _response_text(
        messages: Message | Sequence[Message] | str | None,
    ) -> str:
        text = CommandCanvasAgent._latest_text(messages)
        if not text:
            return "The command canvas is ready for a bounded enrichment request."
        return (
            "The AG-UI transport received the command. "
            f"Foundry enrichment is pending for: {text}"
        )

    @staticmethod
    def _latest_text(
        messages: Message | Sequence[Message] | str | None,
    ) -> str:
        if isinstance(messages, str):
            return messages.strip()
        if messages is None:
            return ""

        message_items = [messages] if isinstance(messages, Message) else list(messages)
        for message in reversed(message_items):
            for content in reversed(message.contents):
                if content.text:
                    return content.text.strip()
        return ""
