"""The JEV-assembled A2UI agent.

JEV picks the surface and says how hard Luna has to work. Luna reads the text on
one or more lanes. Deterministic code computes the answer and assembles standard
A2UI v0.9 operations. No model ever writes the UI.
"""

import asyncio
import json
import logging
import re
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

from backend import shapes, surfaces
from backend.capabilities.base import REGISTRY, Arg
from backend.contracts import ClassificationRequest, SchemaId
from backend.dispatch import Dispatch, dispatch
from backend.extract import ExtractionService, ExtractRequest, ExtractResponse, Lane
from backend.jev import JudgeCandidate, JudgeRequest, OpenRouterJevClassifier
from backend.lanes import lanes
from backend.providers import Providers
from backend.resolve import resolve
from backend.surfaces.spec import Surface
from backend.telemetry import agent_span, set_attributes, set_sensitive, tracer

RENDER_TOOL = "render_surface"

logger = logging.getLogger(__name__)
Progress = Callable[[list[Content]], Coroutine[Any, Any, None]]


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

    @property
    def luna(self) -> Any | None:
        return self._resolve().get("luna")


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
        self,
        service_session_id: str | ServiceSessionId,
        *,
        session_id: str | None = None,
    ) -> AgentSession:
        return AgentSession(
            service_session_id=service_session_id, session_id=session_id
        )

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
                progress: asyncio.Queue[Content] = asyncio.Queue()

                async def emit(contents: list[Content]) -> None:
                    for content in contents:
                        await progress.put(content)

                work = (
                    self._on_action(action, span)
                    if action is not None
                    else self._on_text(
                        _latest_text(messages), forwarded, span, progress=emit
                    )
                )
                task = asyncio.create_task(
                    self._exclusive(_conversation_id(session), work)
                )
                while not task.done() or not progress.empty():
                    try:
                        content = await asyncio.wait_for(progress.get(), timeout=0.05)
                    except TimeoutError:
                        continue
                    collected.append(content)
                    yield AgentResponseUpdate(
                        contents=[content],
                        role="assistant",
                        agent_id=self.id,
                        response_id=response_id,
                    )
                contents = await task
                set_attributes(
                    span,
                    {"gen_ai.response.id": response_id, "jev.latency_ms": _ms(started)},
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

    async def _on_text(
        self,
        text: str,
        forwarded: dict[str, Any],
        span: Any,
        *,
        progress: Progress | None = None,
    ) -> list[Content]:
        if not text:
            return [Content.from_text("Type something to build a surface.")]
        set_sensitive(span, {"gen_ai.input.messages": text})

        capability = await self._on_capability(text, span)
        if capability is not None:
            return capability

        with tracer().start_as_current_span("jev select surface") as select:
            result = await self._services.classifier.classify(
                ClassificationRequest(text=text)
            )
            schema = result.decision.selected_schema
            set_attributes(
                select,
                {"jev.schema": schema, "jev.confidence": result.decision.confidence},
            )
        if schema is None:
            return [Content.from_text("JEV could not settle on a surface for that.")]

        chosen = lanes(schema, result, web_search=bool(forwarded.get("webSearch")))
        set_attributes(span, {"jev.schema": schema, "jev.lanes": ",".join(chosen)})
        surface_id = f"{schema.value}-{uuid4().hex[:8]}"
        pending_inspector = _pending_inspector(result, chosen)
        last_partial = ""
        last_update = 0.0

        async def on_answer_text(raw: str) -> None:
            nonlocal last_partial, last_update
            if progress is None:
                return
            partial = _partial_answer(raw)
            signature = json.dumps(partial, sort_keys=True)
            now = perf_counter()
            if signature == last_partial or now - last_update < 0.08:
                return
            last_partial, last_update = signature, now
            await progress(
                self._render(
                    schema,
                    partial,
                    surface_id=surface_id,
                    inspector={**pending_inspector, "values": partial},
                )
            )

        if schema is SchemaId.ANSWER and progress is not None:
            await progress(
                self._render(
                    schema,
                    _partial_answer(""),
                    surface_id=surface_id,
                    inspector=pending_inspector,
                )
            )
        extracted = await self._extract(
            text,
            schema,
            chosen,
            forwarded,
            on_text=on_answer_text if schema is SchemaId.ANSWER else None,
        )
        if extracted is None or not extracted.ok:
            reason = extracted.error if extracted else "no lane returned a reading"
            return [Content.from_text(f"Luna could not read that: {reason}")]
        return self._render(
            schema,
            extracted.values,
            surface_id=surface_id,
            inspector=_inspector(result, chosen, extracted),
        )

    async def _on_capability(
        self,
        text: str,
        span: Any,
        *,
        force: str | None = None,
        overrides: dict[str, Any] | None = None,
        surface_id: str | None = None,
        picked: tuple[str, str] | None = None,
    ) -> list[Content] | None:
        """One batched call picks a capability and fills its closed-set arguments.

        Returns `None` when the registry does not cover the text, so the existing
        schema pipeline takes it unchanged.
        """
        with tracer().start_as_current_span("jev dispatch capability") as select:
            try:
                decided = await dispatch(
                    self._services.classifier, text, force=force, overrides=overrides
                )
            except Exception as error:
                # Falling back to the schema pipeline is right, but doing it
                # silently hides real breakage. Record it on the span and the log.
                select.record_exception(error)
                logger.warning("capability dispatch failed, deferring", exc_info=True)
                return None
            set_attributes(
                select,
                {
                    "jev.capability": decided.capability.name
                    if decided.capability
                    else "other",
                    "jev.confidence": decided.confidence,
                    "jev.margin": decided.margin,
                    "jev.latency_ms": decided.latency_ms,
                },
            )
        if decided.deferred:
            return None

        assert decided.capability is not None
        trace = _capability_trace(decided, text)
        # JEV judging the question before the user has to rewrite it.
        gate = decided.gate(text)
        if gate is not None:
            if (
                isinstance(gate, shapes.Clarify)
                and decided.capability.preview is not None
            ):
                await self._add_previews(gate, decided)
            set_attributes(span, {"jev.gate": type(gate).__name__.lower()})
            return self._paint(
                shapes.render(gate), decided.capability.name, surface_id, trace
            )

        with tracer().start_as_current_span(f"compute {decided.capability.name}"):
            try:
                shape = await decided.capability.run(**decided.arguments)
            except Exception as exc:  # noqa: BLE001 - degrade to a readable card
                return [Content.from_text(f"{decided.capability.label} failed: {exc}")]
        if picked is not None and isinstance(shape, shapes.Panel):
            shape.chips.insert(
                0,
                {"label": f"You picked {_pick_name(*picked)}", "icon": "checkmark"},
            )
            shape.change_text = text
        trace["values"] = decided.arguments
        return self._paint(
            shapes.render(shape), decided.capability.name, surface_id, trace
        )

    async def _extract(
        self,
        text: str,
        schema: SchemaId,
        chosen: list[Lane],
        forwarded: dict[str, Any],
        *,
        on_text: Callable[[str], Coroutine[Any, Any, None]] | None = None,
    ) -> ExtractResponse | None:
        """Run the lanes together, then let JEV settle any disagreement."""
        now = _text_option(forwarded, "now")
        timezone = _text_option(forwarded, "timezone")
        results = await asyncio.gather(
            *(
                self._services.extraction.extract(
                    ExtractRequest(
                        text=text, card=schema, lane=lane, now=now, timezone=timezone
                    ),
                    on_text=on_text if lane == "web" else None,
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
                span,
                {"jev.choice": verdict.choice, "jev.confidence": verdict.confidence},
            )
            return web if verdict.choice == "web" else fast

    async def _on_action(self, action: dict[str, Any], span: Any) -> list[Content]:
        name = action.get("name") or ""
        surface_id = action.get("surfaceId")
        context = action.get("context") or {}
        set_attributes(span, {"a2ui.action": name, "a2ui.surface_id": surface_id})
        if name == shapes.PICK_ACTION:
            return await self._on_pick(context, span, surface_id)
        if name == shapes.CHANGE_ACTION:
            text = str(context.get("text") or "")
            if not text:
                return [
                    Content.from_text(
                        "That answer no longer has its original question."
                    )
                ]
            contents = await self._on_capability(text, span, surface_id=surface_id)
            return contents or [
                Content.from_text("That question no longer maps to a capability.")
            ]
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

    async def _on_pick(
        self, context: dict[str, Any], span: Any, surface_id: str | None
    ) -> list[Content]:
        """The user resolved an ambiguity. Re-run the same text with their answer."""
        text = str(context.get("text") or "")
        argument = str(context.get("argument") or "")
        value = context.get("value")
        typed = str(context.get("typed") or "").strip()
        if not text or (value is None and not typed):
            return [Content.from_text("That choice arrived without the original text.")]

        if value is None:
            value = await self._resolve_typed(typed, argument, span)
            if value is None:
                return [
                    Content.from_text(f"Could not work out what “{typed}” refers to.")
                ]

        contents = await self._on_capability(
            text,
            span,
            force=value if argument == "capability" else None,
            overrides=None if argument == "capability" else {argument: value},
            surface_id=surface_id,
            picked=None if argument == "capability" else (argument, str(value)),
        )
        return contents or [
            Content.from_text("That choice no longer maps to a capability.")
        ]

    async def _resolve_typed(self, typed: str, argument: str, span: Any) -> str | None:
        """Free text the shortlist never offered, mapped back into the closed set."""
        arg = _find_arg(argument)
        if arg is None:
            return typed or None
        outcome = await resolve(
            typed, arg, classifier=self._services.classifier, luna=self._services.luna
        )
        set_attributes(
            span,
            {
                "jev.typed": typed,
                "jev.typed_source": outcome.source,
                "jev.typed_latency_ms": outcome.latency_ms,
            },
        )
        return outcome.value

    async def _add_previews(self, shape: shapes.Clarify, decided: Dispatch) -> None:
        """Compute at most three cheap answers before the user picks."""
        preview = decided.capability.preview if decided.capability else None
        if preview is None:
            return
        candidates = shape.options[:3]

        async def compute(option: dict[str, Any]) -> tuple[str, str] | None:
            arguments = {
                **decided.arguments,
                shape.argument: str(option.get("value") or ""),
            }
            try:
                return await preview(**arguments)
            except Exception:
                logger.warning("capability preview failed", exc_info=True)
                return None

        results = await asyncio.gather(*(compute(option) for option in candidates))
        for option, result in zip(candidates, results, strict=True):
            if result is not None:
                option["preview"] = {"value": result[0], "context": result[1]}

    def _paint(
        self,
        surface: Surface,
        key: str,
        surface_id: str | None,
        inspector: dict[str, Any] | None = None,
    ) -> list[Content]:
        target = surface_id or f"{key}-{uuid4().hex[:8]}"
        return self._emit(surfaces.paint(surface, target), target, inspector)

    def _render(
        self,
        schema: SchemaId,
        values: dict[str, Any],
        *,
        surface_id: str | None = None,
        inspector: dict[str, Any] | None = None,
    ) -> list[Content]:
        # Keep the A2UI surface stable while each streamed activity gets its own tool call.
        # AG-UI requires every call to finish before another call with that ID can start.
        surface = surface_id or f"{schema.value}-{uuid4().hex[:8]}"
        return self._emit(
            surfaces.operations(schema, values, surface), surface, inspector
        )

    def _emit(
        self, ops: list[dict[str, Any]], surface: str, inspector: dict[str, Any] | None
    ) -> list[Content]:
        call_id = f"call_{surface}_{uuid4().hex[:8]}"
        arguments: dict[str, Any] = {"surfaceId": surface}
        if inspector is not None:
            # The Inspector reads this off the tool call; the browser no longer classifies.
            arguments["jev"] = inspector
        return [
            Content.from_function_call(
                call_id=call_id, name=RENDER_TOOL, arguments=arguments
            ),
            Content.from_function_result(
                call_id=call_id, result=wrap_as_operations_envelope(ops)
            ),
        ]


def _find_arg(argument: str) -> Arg | None:
    """Locate an argument by name. The pick carries the name, not the capability."""
    for capability in REGISTRY.values():
        arg = capability.args.get(argument)
        if arg is not None and arg.options:
            return arg
    return None


def _pick_name(argument: str, value: str) -> str:
    arg = _find_arg(argument)
    if arg is not None and value in arg.options:
        return value.replace("_", " ").title()
    return value


def _capability_trace(decided: Dispatch, text: str) -> dict[str, Any]:
    """The Inspector view of a capability dispatch, in the shape it already reads."""
    capability = decided.capability
    return {
        "schema": capability.name if capability else "other",
        "confidence": decided.confidence,
        "margin": decided.margin,
        "reason": "capability_dispatch",
        "candidates": [
            {"schema": name, "probability": share}
            for name, share in sorted(
                decided.probabilities.items(), key=lambda i: -i[1]
            )
        ],
        "signals": {},
        "jevModel": decided.model,
        "jevLatencyMs": decided.latency_ms,
        "lanes": ["dispatch"],
        "lane": "capability",
        "lunaModel": "",
        "lunaLatencyMs": 0,
        "values": decided.arguments,
        "code": None,
        "sources": None,
        "missing": decided.missing,
        "text": text,
    }


def _inspector(
    result: Any, chosen: Sequence[Lane], extracted: ExtractResponse
) -> dict[str, Any]:
    """What the Inspector panel shows: JEV's decision and the lane that won."""
    return {
        "schema": result.decision.selected_schema,
        "confidence": result.decision.confidence,
        "margin": result.decision.margin,
        "reason": result.decision.reason,
        "candidates": [
            {"schema": candidate.kind, "probability": candidate.probability}
            for candidate in result.candidates
        ],
        "signals": result.diagnostics.signals,
        "jevModel": result.diagnostics.model,
        "jevLatencyMs": result.diagnostics.latency_ms,
        "lanes": list(chosen),
        "lane": extracted.source,
        "lunaModel": extracted.model,
        "lunaLatencyMs": extracted.latency_ms,
        "values": extracted.values,
        "code": extracted.code,
        "sources": extracted.sources,
    }


def _pending_inspector(result: Any, chosen: Sequence[Lane]) -> dict[str, Any]:
    return {
        "schema": result.decision.selected_schema,
        "confidence": result.decision.confidence,
        "margin": result.decision.margin,
        "reason": result.decision.reason,
        "candidates": [
            {"schema": candidate.kind, "probability": candidate.probability}
            for candidate in result.candidates
        ],
        "signals": result.diagnostics.signals,
        "jevModel": result.diagnostics.model,
        "jevLatencyMs": result.diagnostics.latency_ms,
        "lanes": list(chosen),
        "lane": "streaming",
        "lunaModel": "",
        "lunaLatencyMs": 0,
        "values": {},
        "code": None,
        "sources": None,
    }


def _partial_answer(raw: str) -> dict[str, Any]:
    points_start = raw.find('"points"')
    sources_start = raw.find('"sources"', points_start + 1)
    points_text = (
        raw[points_start : sources_start if sources_start >= 0 else None]
        if points_start >= 0
        else ""
    )
    return {
        "lead": _partial_json_string(raw, "lead"),
        "lead_sources": [],
        "points": [
            {"text": text, "sources": []}
            for text in _partial_json_strings(points_text, "text")
            if text
        ],
        "sources": [],
        "streaming": True,
    }


def _partial_json_strings(raw: str, key: str) -> list[str]:
    pattern = re.compile(rf'"{re.escape(key)}"\s*:\s*"')
    return [_decode_json_string(raw, match.end()) for match in pattern.finditer(raw)]


def _partial_json_string(raw: str, key: str) -> str:
    values = _partial_json_strings(raw, key)
    return values[0] if values else ""


def _decode_json_string(raw: str, start: int) -> str:
    decoded: list[str] = []
    index = start
    escapes = {
        '"': '"',
        "\\": "\\",
        "/": "/",
        "b": "\b",
        "f": "\f",
        "n": "\n",
        "r": "\r",
        "t": "\t",
    }
    while index < len(raw):
        char = raw[index]
        if char == '"':
            break
        if char != "\\":
            decoded.append(char)
            index += 1
            continue
        if index + 1 >= len(raw):
            break
        escaped = raw[index + 1]
        if escaped == "u":
            digits = raw[index + 2 : index + 6]
            if len(digits) < 4:
                break
            try:
                decoded.append(chr(int(digits, 16)))
            except ValueError:
                pass
            index += 6
            continue
        decoded.append(escapes.get(escaped, escaped))
        index += 2
    return "".join(decoded)


def _summarize(response: ExtractResponse) -> str:
    return json.dumps(response.values, default=str)[:400]


def _ms(started: float) -> int:
    return int((perf_counter() - started) * 1000)
