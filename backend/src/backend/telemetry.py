"""OpenTelemetry wiring for the JEV backend.

Traces flow to the Application Insights resource connected to the Foundry
project, so Foundry's own server-side agent traces and this app's client-side
spans land in one place. Falls back to an OTLP endpoint, then to console.
"""

from __future__ import annotations

import json
import logging
import os
from collections.abc import Iterator, Mapping, Sequence
from contextlib import contextmanager
from typing import Any

from opentelemetry import trace
from opentelemetry.trace import Span, SpanKind, Status, StatusCode

from backend.config import Settings

logger = logging.getLogger(__name__)

TRACER_NAME = "jev.command-canvas"

_state: dict[str, Any] = {
    "enabled": False,
    "exporter": "off",
    "sensitive_data": False,
    "connection_source": None,
    "service_name": None,
}


def telemetry_state() -> dict[str, Any]:
    return dict(_state)


def tracer() -> trace.Tracer:
    return trace.get_tracer(TRACER_NAME)


def configure_telemetry(settings: Settings) -> dict[str, Any]:
    """Configure providers once, before the FastAPI app handles any traffic."""
    if _state["enabled"] or not settings.otel_enabled:
        return telemetry_state()

    # The Azure SDKs only emit GenAI spans when this opt-in is present.
    os.environ.setdefault("AZURE_EXPERIMENTAL_ENABLE_GENAI_TRACING", "true")
    os.environ.setdefault("OTEL_SERVICE_NAME", settings.otel_service_name)

    connection, source = _resolve_connection_string(settings)
    if connection:
        from azure.monitor.opentelemetry import configure_azure_monitor

        configure_azure_monitor(
            connection_string=connection,
            # FastAPI and httpx are instrumented explicitly below.
            instrumentation_options={"fastapi": {"enabled": False}},
            resource=_resource(settings),
        )
        _state["exporter"] = "azure-monitor"
    else:
        from agent_framework.observability import configure_otel_providers

        configure_otel_providers(
            service_name=settings.otel_service_name,
            service_version=settings.otel_service_version,
            otlp_endpoint=settings.otel_exporter_otlp_endpoint,
            enable_sensitive_data=settings.otel_sensitive_data,
            enable_console_exporters=(
                settings.otel_console_exporters or not settings.otel_exporter_otlp_endpoint
            ),
        )
        _state["exporter"] = (
            "otlp" if settings.otel_exporter_otlp_endpoint else "console"
        )

    _enable_agent_framework(settings)

    _state.update(
        enabled=True,
        sensitive_data=settings.otel_sensitive_data,
        connection_source=source,
        service_name=settings.otel_service_name,
    )
    logger.info("Telemetry enabled via %s (%s)", _state["exporter"], source or "n/a")
    return telemetry_state()


def instrument_app(app: Any, settings: Settings) -> None:
    """Attach HTTP server and client instrumentation to the running app."""
    if not _state["enabled"]:
        return
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
    from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor

    FastAPIInstrumentor.instrument_app(
        app, excluded_urls=settings.otel_excluded_urls or None
    )
    # Azure Monitor does not auto-instrument httpx, and every JEV and Luna call
    # goes out over httpx.
    HTTPXClientInstrumentor().instrument()


def _resource(settings: Settings) -> Any:
    from opentelemetry.sdk.resources import Resource

    return Resource.create(
        {
            "service.name": settings.otel_service_name,
            "service.version": settings.otel_service_version,
            "deployment.environment.name": settings.app_environment,
        }
    )


def _enable_agent_framework(settings: Settings) -> None:
    from agent_framework.observability import (
        enable_instrumentation,
        enable_sensitive_telemetry,
    )

    enable_instrumentation(
        enable_sensitive_data=settings.otel_sensitive_data, force=True
    )
    if settings.otel_sensitive_data:
        enable_sensitive_telemetry(force=True)


def _resolve_connection_string(settings: Settings) -> tuple[str | None, str | None]:
    if settings.applicationinsights_connection_string:
        return settings.applicationinsights_connection_string, "settings"
    env = os.environ.get("APPLICATIONINSIGHTS_CONNECTION_STRING")
    if env:
        return env, "environment"
    if not settings.otel_use_foundry_app_insights:
        return None, None
    try:
        from azure.ai.projects import AIProjectClient

        from backend.luna import build_credential

        with AIProjectClient(
            endpoint=str(settings.foundry_project_endpoint),
            credential=build_credential(settings),
        ) as project:
            return (
                project.telemetry.get_application_insights_connection_string(),
                "foundry-project",
            )
    except Exception as exc:  # noqa: BLE001 - telemetry must never block startup
        logger.warning("Foundry Application Insights lookup failed: %s", exc)
        return None, None


@contextmanager
def genai_span(
    operation: str,
    *,
    provider: str,
    model: str,
    kind: SpanKind = SpanKind.CLIENT,
    attributes: Mapping[str, Any] | None = None,
) -> Iterator[Span]:
    """A GenAI client span named per the OTel GenAI semantic conventions."""
    span_attributes: dict[str, Any] = {
        "gen_ai.operation.name": operation,
        "gen_ai.provider.name": provider,
        "gen_ai.request.model": model,
        **{key: value for key, value in (attributes or {}).items() if value is not None},
    }
    with tracer().start_as_current_span(
        f"{operation} {model}", kind=kind, attributes=span_attributes
    ) as span:
        try:
            yield span
        except Exception as exc:
            span.set_attribute("error.type", type(exc).__name__)
            span.set_status(Status(StatusCode.ERROR, str(exc)[:300]))
            span.record_exception(exc)
            raise


@contextmanager
def agent_span(
    *,
    agent_id: str,
    agent_name: str,
    agent_description: str | None = None,
    conversation_id: str | None = None,
    operation: str = "invoke_agent",
) -> Iterator[Span]:
    """An `invoke_agent` span matching what Agent Framework emits for its own agents."""
    attributes = {
        "gen_ai.operation.name": operation,
        "gen_ai.agent.id": agent_id,
        "gen_ai.agent.name": agent_name,
    }
    if agent_description:
        attributes["gen_ai.agent.description"] = agent_description
    if conversation_id:
        attributes["gen_ai.conversation.id"] = conversation_id
    with tracer().start_as_current_span(
        f"{operation} {agent_name}", kind=SpanKind.INTERNAL, attributes=attributes
    ) as span:
        try:
            yield span
        except Exception as exc:
            span.set_attribute("error.type", type(exc).__name__)
            span.set_status(Status(StatusCode.ERROR, str(exc)[:300]))
            span.record_exception(exc)
            raise


def set_attributes(span: Span, attributes: Mapping[str, Any]) -> None:
    for key, value in attributes.items():
        if value is None:
            continue
        span.set_attribute(key, value if isinstance(value, (str, bool, int, float)) else str(value))


def set_sensitive(span: Span, attributes: Mapping[str, Any]) -> None:
    """Record prompt and payload content only when sensitive capture is on."""
    if not _state["sensitive_data"]:
        return
    for key, value in attributes.items():
        if value is None:
            continue
        span.set_attribute(key, value if isinstance(value, str) else _dumps(value))


def record_response_usage(span: Span, data: Mapping[str, Any]) -> None:
    """Copy model, response id, and token usage off a Responses API payload."""
    set_attributes(
        span,
        {
            "gen_ai.response.model": data.get("model"),
            "gen_ai.response.id": data.get("id"),
            "gen_ai.response.finish_reasons": data.get("status"),
        },
    )
    usage = data.get("usage") or {}
    set_attributes(
        span,
        {
            "gen_ai.usage.input_tokens": usage.get("input_tokens"),
            "gen_ai.usage.output_tokens": usage.get("output_tokens"),
            "gen_ai.usage.reasoning_tokens": (usage.get("output_tokens_details") or {}).get(
                "reasoning_tokens"
            ),
        },
    )
    tools = [
        item.get("type")
        for item in data.get("output", [])
        if isinstance(item, Mapping) and item.get("type", "").endswith("_call")
    ]
    if tools:
        span.set_attribute("gen_ai.tool.name", ",".join(sorted(set(tools))))


def probabilities_attributes(prefix: str, probabilities: Mapping[str, float]) -> dict[str, Any]:
    """Flatten a JEV probability map so it is filterable in App Insights."""
    ranked = sorted(probabilities.items(), key=lambda pair: pair[1], reverse=True)
    attributes: dict[str, Any] = {f"{prefix}.distribution": _dumps(dict(ranked[:8]))}
    for index, (name, value) in enumerate(ranked[:3]):
        attributes[f"{prefix}.rank{index + 1}.name"] = name
        attributes[f"{prefix}.rank{index + 1}.confidence"] = round(float(value), 4)
    if len(ranked) > 1:
        attributes[f"{prefix}.margin"] = round(float(ranked[0][1] - ranked[1][1]), 4)
    return attributes


def _dumps(value: Any) -> str:
    try:
        return json.dumps(value, default=str)[:8000]
    except (TypeError, ValueError):
        return str(value)[:8000]


def truncate(value: str | None, limit: int = 2000) -> str | None:
    if value is None:
        return None
    return value[:limit]


def sequence_attribute(values: Sequence[str] | None) -> str | None:
    if not values:
        return None
    return _dumps(list(values))
