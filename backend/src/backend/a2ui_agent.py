"""The JEV-assembled A2UI agent.

JEV picks the surface and says how hard Luna has to work. Luna reads the text on
one or more lanes. Deterministic code computes the answer and assembles standard
A2UI v0.9 operations. No model ever writes the UI.
"""

import asyncio
import json
from collections.abc import AsyncIterator, Callable, Coroutine, Sequence
from time import perf_counter
from typing import Any
from uuid import uuid4

from ag_ui_a2ui_toolkit import wrap_as_operations_envelope
from agent_framework import (
    AgentResponse,
    AgentResponseUpdate,
    AgentSession,
    Content,
    Message,
    ResponseStream,
    ServiceSessionId,
)

from backend import surfaces
from backend.contracts import ClassificationRequest, SchemaId
from backend.extract import ExtractionService, ExtractRequest, ExtractResponse, Lane
from backend.jev import JudgeCandidate, JudgeRequest, OpenRouterJevClassifier
from backend.lanes import lanes
from backend.providers import Providers
from backend.telemetry import agent_span, set_attributes, set_sensitive, tracer

RENDER_TOOL = "render_surface"


class Services:
    """What the agent needs, resolved per run so it can live outside the app lifespan."""

    def __init__(self, resolve: Callable[[], dict[str, Any]]) -> None:
        self._resolve = resolve

    @property
    def classifier(self) -> OpenRouterJevClassifier:
        return self._resolve()["jev_classifier"]

    @property
    def extraction(self) -> ExtractionService:
        return self._resolve()["extraction"]

    @property
    def providers(self) -> Providers | None:
        return self._resolve().get("providers")


def _latest_text(messages: Message | Sequence[Message] | str | None) -> str:
    if isinstance(messages, str):
        return messages.strip()
    if messages is None:
        return ""
    items = [messages] if isinstance(messages, Message) else list(messages)
    for message in reversed(items):
        if message.role != "user":
            continue
        for content in reversed(message.contents):
            if content.text:
                return content.text.strip()
    return ""


def _forwarded(session: AgentSession | None) -> dict[str, Any]:
    metadata = getattr(session, "metadata", None) or {}
    forwarded = metadata.get("forwarded_props") or {}
    if isinstance(forwarded, str):
        try:
            forwarded = json.loads(forwarded)
        except ValueError:
            return {}
    return forwarded if isinstance(forwarded, dict) else {}


def _user_action(forwarded: dict[str, Any]) -> dict[str, Any] | None:
    action = (forwarded.get("a2uiAction") or {}).get("userAction")
    return action if isinstance(action, dict) else None


def _conversation_id(session: AgentSession | None) -> str | None:
    if session is None:
        return None
    for value in (session.service_session_id, getattr(session, "session_id", None)):
        if isinstance(value, str) and value:
            return value
    return None


def _text_option(forwarded: dict[str, Any], key: str) -> str | None:
    value = forwarded.get(key)
    return value if isinstance(value, str) and value else None


class A2uiCanvasAgent:
    id = "jev-a2ui-canvas"
    name = "JEV A2UI Canvas"
    description = "JEV selects the surface; deterministic code assembles standard A2UI."

    def __init__(self, services: Services) -> None:
        self._services = services
        # One conversation has one live run. Typing again abandons the previous one.
        self._running: dict[str, asyncio.Task[list[Content]]] = {}

    def create_session(self, *, session_id: str | None = None) -> AgentSession:
        return AgentSession(session_id=session_id)

    def get_session(
        self, service_session_id: str | ServiceSessionId, *, session_id: str | None = None
    ) -> AgentSession:
        return AgentSession(service_session_id=service_session_id, session_id=session_id)

    def run(
        self,
        messages: Message | Sequence[Message] | str | None = None,
        *,
        stream: bool = False,
        session: AgentSession | None = None,
        **_: Any,
    ) -> AgentResponse | ResponseStream[AgentResponseUpdate, AgentResponse]:
        if not stream:
            raise NotImplementedError("The A2UI canvas agent only streams.")
        response_id = f"a2ui-{uuid4()}"
        collected: list[Content] = []

        async def updates() -> AsyncIterator[AgentResponseUpdate]:
            with agent_span(
                agent_id=self.id,
                agent_name=self.name,
                agent_description=self.description,
                conversation_id=_conversation_id(session),
            ) as span:
                started = perf_counter()
                forwarded = _forwarded(session)
                action = _user_action(forwarded)
                work = (
                    self._on_action(action, span)
                    if action is not None
                    else self._on_text(_latest_text(messages), forwarded, span)
                )
                contents = await self._exclusive(_conversation_id(session), work)
                set_attributes(
                    span, {"gen_ai.response.id": response_id, "jev.latency_ms": _ms(started)}
                )
                for content in contents:
                    collected.append(content)
                    yield AgentResponseUpdate(
                        contents=[content],
                        role="assistant",
                        agent_id=self.id,
                        response_id=response_id,
                    )

        async def finalize(_: Sequence[AgentResponseUpdate]) -> AgentResponse:
            return AgentResponse(
                messages=[Message(role="assistant", contents=collected)],
                response_id=response_id,
                agent_id=self.id,
            )

        return ResponseStream(updates(), finalizer=finalize)

    async def _exclusive(
        self, key: str | None, work: Coroutine[Any, Any, list[Content]]
    ) -> list[Content]:
        """Abandon the previous run on this conversation: newer input invalidates it."""
        if key is None:
            return await work
        previous = self._running.get(key)
        if previous is not None and not previous.done():
            previous.cancel()
        task = asyncio.ensure_future(work)
        self._running[key] = task
        try:
            return await task
        except asyncio.CancelledError:
            return []
        finally:
            if self._running.get(key) is task:
                self._running.pop(key, None)

    async def _on_text(self, text: str, forwarded: dict[str, Any], span: Any) -> list[Content]:
        if not text:
            return [Content.from_text("Type something to build a surface.")]
        set_sensitive(span, {"gen_ai.input.messages": text})

        with tracer().start_as_current_span("jev select surface") as select:
            result = await self._services.classifier.classify(ClassificationRequest(text=text))
            schema = result.decision.selected_schema
            set_attributes(
                select, {"jev.schema": schema, "jev.confidence": result.decision.confidence}
            )
        if schema is None:
            return [Content.from_text("JEV could not settle on a surface for that.")]

        chosen = lanes(schema, result, web_search=bool(forwarded.get("webSearch")))
        set_attributes(span, {"jev.schema": schema, "jev.lanes": ",".join(chosen)})
        extracted = await self._extract(text, schema, chosen, forwarded)
        if extracted is None or not extracted.ok:
            reason = extracted.error if extracted else "no lane returned a reading"
            return [Content.from_text(f"Luna could not read that: {reason}")]
        return self._render(schema, extracted.values)

    async def _extract(
        self,
        text: str,
        schema: SchemaId,
        chosen: list[Lane],
        forwarded: dict[str, Any],
    ) -> ExtractResponse | None:
        """Run the lanes together, then let JEV settle any disagreement."""
        now = _text_option(forwarded, "now")
        timezone = _text_option(forwarded, "timezone")
        results = await asyncio.gather(
            *(
                self._services.extraction.extract(
                    ExtractRequest(text=text, card=schema, lane=lane, now=now, timezone=timezone)
                )
                for lane in chosen
            )
        )
        by_lane: dict[Lane, ExtractResponse] = {
            lane: response
            for lane, response in zip(chosen, results, strict=True)
            if response.ok
        }

        # Python verified the arithmetic, so it wins outright.
        if "code" in by_lane:
            return by_lane["code"]
        fast, web = by_lane.get("fast"), by_lane.get("web")
        if fast is not None and web is not None and fast.values != web.values:
            return await self._judge(text, schema, fast, web)
        return fast or web or (results[0] if results else None)

    async def _judge(
        self, text: str, schema: SchemaId, fast: ExtractResponse, web: ExtractResponse
    ) -> ExtractResponse:
        """Two readings disagree. JEV picks the one that fits the text."""
        with tracer().start_as_current_span("jev judge lanes") as span:
            try:
                verdict = await self._services.classifier.judge(
                    JudgeRequest(
                        text=text,
                        card=schema,
                        candidates=[
                            JudgeCandidate(id="fast", summary=_summarize(fast)),
                            JudgeCandidate(id="web", summary=_summarize(web)),
                        ],
                    )
                )
            except Exception:  # noqa: BLE001 - a judge failure must not lose the card
                return fast
            set_attributes(
                span, {"jev.choice": verdict.choice, "jev.confidence": verdict.confidence}
            )
            return web if verdict.choice == "web" else fast

    async def _on_action(self, action: dict[str, Any], span: Any) -> list[Content]:
        name = action.get("name") or ""
        surface_id = action.get("surfaceId")
        context = action.get("context") or {}
        set_attributes(span, {"a2ui.action": name, "a2ui.surface_id": surface_id})
        entry = surfaces.ACTIONS.get(name)
        if entry is None:
            return [Content.from_text(f"Unknown action `{name}`.")]
        schema, handler = entry
        with tracer().start_as_current_span(f"compute {name}"):
            try:
                values = await handler(context, self._services.providers)
            except (TypeError, ValueError) as exc:
                return [Content.from_text(f"That action needs valid input: {exc}")]
        return self._render(schema, values, surface_id=surface_id)

    def _render(
        self, schema: SchemaId, values: dict[str, Any], *, surface_id: str | None = None
    ) -> list[Content]:
        # CopilotKit paints each a2ui-surface activity from its own operations and keys it by
        # tool-call id, so a stable id per surface makes an action replace the card in place.
        surface = surface_id or f"{schema.value}-{uuid4().hex[:8]}"
        call_id = f"call_{surface}"
        ops = surfaces.operations(schema, values, surface)
        return [
            Content.from_function_call(
                call_id=call_id, name=RENDER_TOOL, arguments={"surfaceId": surface}
            ),
            Content.from_function_result(call_id=call_id, result=wrap_as_operations_envelope(ops)),
        ]


def _summarize(response: ExtractResponse) -> str:
    return json.dumps(response.values, default=str)[:400]


def _ms(started: float) -> int:
    return int((perf_counter() - started) * 1000)
