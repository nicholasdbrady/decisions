"""The JEV-assembled A2UI agent: JEV picks the surface, code builds standard A2UI v0.9."""

import json
from collections.abc import AsyncIterator, Callable, Sequence
from time import perf_counter
from typing import Any
from uuid import uuid4

from ag_ui_a2ui_toolkit import (
    BASIC_CATALOG_ID,
    create_surface,
    update_components,
    update_data_model,
    wrap_as_operations_envelope,
)
from agent_framework import (
    AgentResponse,
    AgentResponseUpdate,
    AgentSession,
    Content,
    Message,
    ResponseStream,
    ServiceSessionId,
)

from backend import units
from backend.compute import convert_units
from backend.contracts import ClassificationRequest, SchemaId
from backend.extract import ExtractionService, ExtractRequest
from backend.jev import OpenRouterJevClassifier
from backend.providers import Providers
from backend.telemetry import agent_span, set_attributes, set_sensitive, tracer

CONVERT_ACTION = "convert"
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


def _unit_options(category: str | None) -> list[dict[str, str]]:
    for entry in units.catalog():
        if entry["id"] == category:
            return [{"label": f"{u['label']} ({u['symbol']})", "value": u["id"]} for u in entry["units"]]
    return []


def convert_components(options: list[dict[str, str]]) -> list[dict[str, Any]]:
    """The convert surface, built only from the A2UI v0.9 basic catalog."""
    return [
        {"id": "root", "component": "Card", "child": "body"},
        {
            "id": "body",
            "component": "Column",
            "children": ["title", "from_row", "to_row", "recompute"],
            "align": "stretch",
        },
        {"id": "title", "component": "Text", "text": {"path": "/title"}, "variant": "h3"},
        {"id": "from_row", "component": "Row", "children": ["value", "from"], "align": "end"},
        {
            "id": "value",
            "component": "TextField",
            "label": "Value",
            "value": {"path": "/value"},
            "variant": "number",
        },
        {
            "id": "from",
            "component": "ChoicePicker",
            "label": "From",
            "value": {"path": "/from"},
            "options": options,
            "variant": "mutuallyExclusive",
            "displayStyle": "chips" if len(options) <= 4 else "checkbox",
        },
        {"id": "to_row", "component": "Row", "children": ["result", "to"], "align": "end"},
        {"id": "result", "component": "Text", "text": {"path": "/result_text"}, "variant": "h2"},
        {
            "id": "to",
            "component": "ChoicePicker",
            "label": "To",
            "value": {"path": "/to"},
            "options": options,
            "variant": "mutuallyExclusive",
            "displayStyle": "chips" if len(options) <= 4 else "checkbox",
        },
        {
            "id": "recompute",
            "component": "Button",
            "child": "recompute_label",
            "variant": "primary",
            "action": {
                "event": {
                    "name": CONVERT_ACTION,
                    "context": {
                        "value": {"path": "/value"},
                        "from": {"path": "/from"},
                        "to": {"path": "/to"},
                    },
                }
            },
        },
        {"id": "recompute_label", "component": "Text", "text": "Convert"},
    ]


def convert_data(computed: dict[str, Any]) -> dict[str, Any]:
    result = computed.get("result")
    to_label = computed.get("to_label") or computed.get("to") or ""
    return {
        "title": f"{computed.get('from_label') or computed.get('from')} to {to_label}",
        "value": str(computed.get("value", "")),
        "from": [computed.get("from")] if computed.get("from") else [],
        "to": [computed.get("to")] if computed.get("to") else [],
        "result_text": "—" if result is None else f"{result:g} {to_label}".strip(),
        "computed_by": computed.get("computed_by"),
    }


def _first(value: Any) -> str | None:
    if isinstance(value, list):
        return str(value[0]) if value else None
    return str(value) if value else None


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


def _user_action(session: AgentSession | None) -> dict[str, Any] | None:
    metadata = getattr(session, "metadata", None) or {}
    forwarded = metadata.get("forwarded_props") or {}
    if isinstance(forwarded, str):
        try:
            forwarded = json.loads(forwarded)
        except ValueError:
            return None
    action = (forwarded.get("a2uiAction") or {}).get("userAction")
    return action if isinstance(action, dict) else None


def _conversation_id(session: AgentSession | None) -> str | None:
    if session is None:
        return None
    for value in (session.service_session_id, getattr(session, "session_id", None)):
        if isinstance(value, str) and value:
            return value
    return None


class A2uiCanvasAgent:
    id = "jev-a2ui-canvas"
    name = "JEV A2UI Canvas"
    description = "JEV selects the surface; deterministic code assembles standard A2UI."

    def __init__(self, services: Services) -> None:
        self._services = services

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
                action = _user_action(session)
                if action is not None:
                    contents = await self._on_action(action, span)
                else:
                    contents = await self._on_text(_latest_text(messages), span)
                set_attributes(span, {"gen_ai.response.id": response_id, "jev.latency_ms": _ms(started)})
                for content in contents:
                    collected.append(content)
                    yield AgentResponseUpdate(
                        contents=[content], role="assistant", agent_id=self.id, response_id=response_id
                    )

        async def finalize(_: Sequence[AgentResponseUpdate]) -> AgentResponse:
            return AgentResponse(
                messages=[Message(role="assistant", contents=collected)],
                response_id=response_id,
                agent_id=self.id,
            )

        if not stream:
            raise NotImplementedError("The A2UI canvas agent only streams.")
        return ResponseStream(updates(), finalizer=finalize)

    async def _on_text(self, text: str, span: Any) -> list[Content]:
        if not text:
            return [Content.from_text("Type something to build a surface.")]
        set_sensitive(span, {"gen_ai.input.messages": text})
        with tracer().start_as_current_span("jev select surface") as select:
            result = await self._services.classifier.classify(ClassificationRequest(text=text))
            schema = result.decision.selected_schema
            set_attributes(select, {"jev.schema": schema, "jev.confidence": result.decision.confidence})
        set_attributes(span, {"jev.schema": schema})
        if schema is not SchemaId.CONVERT:
            return [Content.from_text(f"JEV chose `{schema}`. Only the convert surface exists on this branch.")]

        extracted = await self._services.extraction.extract(ExtractRequest(text=text, card=SchemaId.CONVERT))
        if not extracted.ok:
            return [Content.from_text(f"Luna could not read the conversion: {extracted.error}")]
        return self._render(extracted.values)

    async def _on_action(self, action: dict[str, Any], span: Any) -> list[Content]:
        name = action.get("name")
        context = action.get("context") or {}
        set_attributes(span, {"a2ui.action": name, "a2ui.surface_id": action.get("surfaceId")})
        if name != CONVERT_ACTION:
            return [Content.from_text(f"Unknown action `{name}`.")]
        source, target = _first(context.get("from")), _first(context.get("to"))
        try:
            value = float(context.get("value"))
        except (TypeError, ValueError):
            return [Content.from_text("Enter a number to convert.")]
        if not source or not target:
            return [Content.from_text("Pick both units.")]
        with tracer().start_as_current_span("compute convert"):
            computed = await convert_units(value, source, target, self._services.providers)
        return self._render(computed, surface_id=action.get("surfaceId"))

    def _render(self, computed: dict[str, Any], *, surface_id: str | None = None) -> list[Content]:
        # CopilotKit paints each a2ui-surface activity from its own operations and keys it by
        # tool-call id, so a stable id per surface makes an action replace the card in place.
        surface = surface_id or f"convert-{uuid4().hex[:8]}"
        ops = [
            create_surface(surface, BASIC_CATALOG_ID),
            update_components(surface, convert_components(_unit_options(computed.get("category")))),
            update_data_model(surface, convert_data(computed)),
        ]
        call_id = f"call_{surface}"
        return [
            Content.from_function_call(call_id=call_id, name=RENDER_TOOL, arguments={"surfaceId": surface}),
            Content.from_function_result(call_id=call_id, result=wrap_as_operations_envelope(ops)),
        ]


def _ms(started: float) -> int:
    return int((perf_counter() - started) * 1000)
