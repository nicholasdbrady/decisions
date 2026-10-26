from __future__ import annotations

import asyncio
import json
import time
from collections.abc import Awaitable, Callable
from typing import Any

import httpx

from backend.config import Settings
from backend.telemetry import (
    genai_span,
    record_response_usage,
    sequence_attribute,
    set_attributes,
    set_sensitive,
)

TextUpdate = Callable[[str], Awaitable[None]]


def build_credential(settings: Settings) -> Any:
    """Entra credential for Foundry, preferring the configured CLI account."""
    from azure.identity import AzureCliCredential, DefaultAzureCredential

    try:
        cli_options: dict[str, Any] = {"process_timeout": 30}
        if settings.foundry_subscription_id:
            cli_options["subscription"] = settings.foundry_subscription_id
        credential = AzureCliCredential(**cli_options)
        credential.get_token(settings.foundry_token_scope)
        return credential
    except Exception:  # noqa: BLE001 - fall back to other Entra credential sources
        tenant = settings.foundry_tenant_id
        return DefaultAzureCredential(
            exclude_interactive_browser_credential=True,
            **({"additionally_allowed_tenants": [tenant]} if tenant else {}),
        )


class FoundryTokenProvider:
    def __init__(self, settings: Settings, *, scope: str | None = None) -> None:
        self._settings = settings
        self._scope = scope or settings.foundry_token_scope
        self._token: str | None = None
        self._expires_on = 0.0
        self._lock = asyncio.Lock()

    async def get(self) -> str:
        async with self._lock:
            if self._token and time.time() < self._expires_on - 300:
                return self._token
            token = await asyncio.to_thread(self._acquire)
            self._token, self._expires_on = token.token, float(token.expires_on)
            return self._token

    def _acquire(self) -> Any:
        from azure.identity import AzureCliCredential, DefaultAzureCredential

        tenant = self._settings.foundry_tenant_id
        scope = self._scope
        try:
            cli_options: dict[str, Any] = {"process_timeout": 30}
            if self._settings.foundry_subscription_id:
                cli_options["subscription"] = self._settings.foundry_subscription_id
            return AzureCliCredential(**cli_options).get_token(scope)
        except Exception:  # noqa: BLE001 - fall back to other Entra credential sources
            token_options = {"tenant_id": tenant} if tenant else {}
            return DefaultAzureCredential(
                exclude_interactive_browser_credential=True,
                **({"additionally_allowed_tenants": [tenant]} if tenant else {}),
            ).get_token(scope, **token_options)


class LunaClient:
    """Strict-JSON calls to GPT-6 Luna on the Foundry account Responses endpoint."""

    def __init__(
        self,
        settings: Settings,
        tokens: FoundryTokenProvider,
        *,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        self._settings = settings
        self._tokens = tokens
        self._client = client

    @property
    def model(self) -> str:
        return self._settings.foundry_model_deployment

    async def json(
        self,
        *,
        name: str,
        instructions: str,
        input: Any,
        schema: dict[str, Any],
        effort: str | None = None,
        web_search: bool = False,
        on_text: TextUpdate | None = None,
    ) -> tuple[dict[str, Any], list[str]]:
        payload: dict[str, Any] = {
            "model": self.model,
            "instructions": instructions,
            "input": input if isinstance(input, str) else json.dumps(input),
            "reasoning": {"effort": effort or self._settings.foundry_reasoning_effort},
            "text": {
                "format": {
                    "type": "json_schema",
                    "name": name,
                    "strict": True,
                    "schema": schema,
                }
            },
        }
        if web_search:
            payload["tools"] = [{"type": "web_search"}]
        with genai_span(
            "chat",
            provider="azure.ai.foundry",
            model=self.model,
            attributes={
                "jev.lane": "web" if web_search else "fast",
                "jev.schema_name": name,
                "gen_ai.request.reasoning_effort": payload["reasoning"]["effort"],
                "gen_ai.tool.definitions": "web_search" if web_search else None,
            },
        ) as span:
            set_sensitive(
                span,
                {
                    "gen_ai.system_instructions": instructions,
                    "gen_ai.input.messages": payload["input"],
                },
            )
            data = (
                await self._post_stream(payload, on_text)
                if on_text is not None
                else await self._post(payload)
            )
            record_response_usage(span, data)
            text, sources = response_text_and_sources(data)
            set_attributes(span, {"jev.sources.count": len(sources)})
            set_sensitive(
                span,
                {
                    "gen_ai.output.messages": text,
                    "jev.sources": sequence_attribute(sources),
                },
            )
            return json.loads(text), sources

    async def json_with_python(
        self,
        *,
        name: str,
        instructions: str,
        input: Any,
        schema: dict[str, Any],
        effort: str = "none",
    ) -> tuple[dict[str, Any], list[str], list[str]]:
        """Structured output where Luna must run Python in the code interpreter sandbox."""
        payload: dict[str, Any] = {
            "model": self.model,
            "instructions": instructions,
            "input": input if isinstance(input, str) else json.dumps(input),
            "reasoning": {"effort": effort},
            "tools": [{"type": "code_interpreter", "container": {"type": "auto"}}],
            "tool_choice": "required",
            "text": {
                "format": {
                    "type": "json_schema",
                    "name": name,
                    "strict": True,
                    "schema": schema,
                }
            },
        }
        with genai_span(
            "chat",
            provider="azure.ai.foundry",
            model=self.model,
            attributes={
                "jev.lane": "code",
                "jev.schema_name": name,
                "gen_ai.request.reasoning_effort": effort,
                "gen_ai.tool.definitions": "code_interpreter",
                "gen_ai.tool.type": "code_interpreter",
            },
        ) as span:
            set_sensitive(
                span,
                {
                    "gen_ai.system_instructions": instructions,
                    "gen_ai.input.messages": payload["input"],
                },
            )
            data = await self._post(
                payload,
                timeout_seconds=getattr(
                    self._settings,
                    "foundry_code_timeout_seconds",
                    self._settings.foundry_timeout_seconds,
                ),
            )
            record_response_usage(span, data)
            text, _ = response_text_and_sources(data)
            code = [
                output.get("code") or ""
                for output in data.get("output", [])
                if output.get("type") == "code_interpreter_call"
            ]
            code = [snippet for snippet in code if snippet.strip()]
            code_output = [
                logs
                for output in data.get("output", [])
                if output.get("type") == "code_interpreter_call"
                for result in (output.get("outputs") or [])
                if isinstance(result, dict)
                for logs in [result.get("logs")]
                if isinstance(logs, str) and logs.strip()
            ]
            set_attributes(
                span,
                {
                    "jev.code.blocks": len(code),
                    "jev.code.output_blocks": len(code_output),
                },
            )
            set_sensitive(
                span,
                {
                    "gen_ai.output.messages": text,
                    "jev.code": sequence_attribute(code),
                    "jev.code.output": sequence_attribute(code_output),
                },
            )
            return json.loads(text), code, code_output

    async def _post(
        self,
        payload: dict[str, Any],
        *,
        timeout_seconds: float | None = None,
    ) -> dict[str, Any]:
        # httpx timeouts bound each read, not the whole call, so a stalled stream or
        # token refresh could otherwise hold a card open forever.
        limit = timeout_seconds or self._settings.foundry_timeout_seconds
        try:
            return await asyncio.wait_for(self._post_once(payload, limit), limit)
        except TimeoutError as exc:
            raise RuntimeError(f"Foundry did not answer within {limit:g}s") from exc

    async def _post_stream(
        self, payload: dict[str, Any], on_text: TextUpdate
    ) -> dict[str, Any]:
        try:
            return await asyncio.wait_for(
                self._post_stream_once({**payload, "stream": True}, on_text),
                self._settings.foundry_timeout_seconds,
            )
        except TimeoutError as exc:
            limit = self._settings.foundry_timeout_seconds
            raise RuntimeError(f"Foundry did not answer within {limit:g}s") from exc

    async def _post_once(
        self,
        payload: dict[str, Any],
        timeout_seconds: float,
    ) -> dict[str, Any]:
        headers = {"Authorization": "Bearer " + await self._tokens.get()}
        url = f"{str(self._settings.foundry_openai_base_url).rstrip('/')}/responses"
        if self._client is not None:
            response = await self._client.post(url, headers=headers, json=payload)
        else:
            async with httpx.AsyncClient(timeout=timeout_seconds) as client:
                response = await client.post(url, headers=headers, json=payload)
        if response.status_code >= 400:
            try:
                message = response.json()["error"]["message"]
            except Exception:  # noqa: BLE001
                message = response.text[:200]
            raise RuntimeError(f"Foundry HTTP {response.status_code}: {message}")
        return response.json()

    async def _post_stream_once(
        self, payload: dict[str, Any], on_text: TextUpdate
    ) -> dict[str, Any]:
        headers = {
            "Authorization": "Bearer " + await self._tokens.get(),
            "Accept": "text/event-stream",
        }
        url = f"{str(self._settings.foundry_openai_base_url).rstrip('/')}/responses"
        if self._client is not None:
            async with self._client.stream(
                "POST", url, headers=headers, json=payload
            ) as response:
                return await _read_response_stream(response, on_text)
        async with (
            httpx.AsyncClient(timeout=self._settings.foundry_timeout_seconds) as client,
            client.stream("POST", url, headers=headers, json=payload) as response,
        ):
            return await _read_response_stream(response, on_text)


async def _read_response_stream(
    response: httpx.Response, on_text: TextUpdate
) -> dict[str, Any]:
    if response.status_code >= 400:
        body = await response.aread()
        try:
            message = json.loads(body)["error"]["message"]
        except Exception:  # noqa: BLE001
            message = body.decode(errors="replace")[:200]
        raise RuntimeError(f"Foundry HTTP {response.status_code}: {message}")

    text = ""
    completed: dict[str, Any] | None = None
    async for line in response.aiter_lines():
        if not line.startswith("data:"):
            continue
        payload = line[5:].strip()
        if not payload or payload == "[DONE]":
            continue
        event = json.loads(payload)
        event_type = event.get("type")
        if event_type == "response.output_text.delta":
            text += str(event.get("delta") or "")
            await on_text(text)
        elif event_type == "response.completed":
            value = event.get("response")
            if isinstance(value, dict):
                completed = value
        elif event_type in {"response.failed", "error"}:
            error = event.get("error") or event.get("response", {}).get("error") or {}
            raise RuntimeError(
                f"Foundry stream failed: {error.get('message') or 'unknown error'}"
            )
    if completed is None:
        raise RuntimeError("Foundry stream ended before response.completed")
    return completed


def response_text_and_sources(data: dict[str, Any]) -> tuple[str, list[str]]:
    texts: list[str] = []
    sources: list[str] = []
    for output in data.get("output", []):
        for content in output.get("content") or []:
            if content.get("type") == "output_text":
                texts.append(content.get("text", ""))
                for note in content.get("annotations") or []:
                    url = note.get("url")
                    if url and url not in sources:
                        sources.append(url)
    if not texts:
        raise RuntimeError("Foundry returned no output text")
    return "".join(texts), sources
