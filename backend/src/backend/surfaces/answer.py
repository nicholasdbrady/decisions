"""Sourced public-web answers rendered with the approved Answer component."""

import json
import re
from typing import Any
from urllib.parse import urlsplit, urlunsplit

from backend.surfaces.catalog import answer, bind, card, column
from backend.surfaces.spec import Surface

INLINE_URL = re.compile(r"\s*\(https?://[^)]+\)", re.IGNORECASE)


def build(values: dict[str, Any]) -> Surface:
    sources, aliases = _sources(values.get("sources"))
    return Surface(
        components=[
            card("body"),
            column("body", ["answer"]),
            answer(
                "answer",
                bind("lead"),
                bind("points"),
                bind("sources"),
                lead_sources=bind("lead_sources"),
                streaming=bind("streaming"),
            ),
        ],
        data={
            "lead": _text(values.get("lead")),
            "lead_sources": _json(_citations(values.get("lead_sources"), aliases)),
            "points": _json(_points(values.get("points"), aliases)),
            "sources": _json(sources),
            "streaming": bool(values.get("streaming")),
        },
    )


def _http_url(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    parts = urlsplit(value.strip())
    if parts.scheme.lower() not in {"http", "https"} or not parts.netloc:
        return None
    return urlunsplit(
        (parts.scheme.lower(), parts.netloc.lower(), parts.path or "/", parts.query, "")
    )


def _sources(value: Any) -> tuple[list[dict[str, Any]], dict[str, str]]:
    if not isinstance(value, list):
        return [], {}

    sources: list[dict[str, Any]] = []
    aliases: dict[str, str] = {}
    for item in value:
        if not isinstance(item, dict):
            continue
        url = _http_url(item.get("url"))
        if not url or url in aliases:
            continue
        hostname = urlsplit(url).hostname or url
        source: dict[str, Any] = {
            "url": url,
            "title": str(item.get("title") or hostname),
            "site": str(item.get("site") or hostname),
            "description": str(item["description"])
            if item.get("description")
            else None,
            "image": _http_url(item.get("image")),
        }
        aliases[url] = url
        sources.append(source)
    return sources[:5], {source["url"]: source["url"] for source in sources[:5]}


def _citations(value: Any, aliases: dict[str, str]) -> list[str]:
    if not isinstance(value, list):
        return []
    citations: list[str] = []
    for item in value:
        url = _http_url(item)
        if url in aliases and url not in citations:
            citations.append(aliases[url])
    return citations


def _points(value: Any, aliases: dict[str, str]) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []
    points: list[dict[str, Any]] = []
    for item in value:
        if not isinstance(item, dict):
            continue
        text = _text(item.get("text"))
        if text:
            points.append(
                {
                    "text": text,
                    "sources": _citations(item.get("sources"), aliases),
                }
            )
    return points


def _text(value: Any) -> str:
    return INLINE_URL.sub("", str(value or "")).strip()


def _json(value: Any) -> str:
    return json.dumps(value)
