"""Resolving free text against a closed set.

A closed set is how the decision model is asked a question, not a limit on what the user may
answer. When someone types a value the shortlist does not contain, the text is
resolved in two stages: Decision-1 first, because it is fast and already knows the set,
then Luna with web search, because it knows the world beyond it.
"""

from __future__ import annotations

from dataclasses import dataclass
from time import perf_counter
from typing import Any

from backend.capabilities.base import Arg
from backend.telemetry import set_attributes, tracer

# Typed text is far more direct than a whole sentence, so a miss here means the
# value is genuinely outside the set rather than merely unclear.
DECISION_FLOOR = 0.7
# Luna is asked to name a member of the set. Anything else is refused rather than
# guessed, so a nonsense value returns nothing instead of an arbitrary card.
SCHEMA = {
    "type": "object",
    "properties": {
        "value": {"type": ["string", "null"], "description": "The matching option key, or null."},
        "note": {"type": ["string", "null"], "description": "How it was matched, in a few words."},
    },
    "required": ["value", "note"],
    "additionalProperties": False,
}


@dataclass
class Resolved:
    value: str | None
    source: str
    note: str = ""
    latency_ms: int = 0


async def resolve(
    typed: str,
    arg: Arg,
    *,
    classifier: Any,
    luna: Any | None = None,
) -> Resolved:
    """Turn what the user typed into a member of the closed set, or nothing."""
    started = perf_counter()
    cleaned = typed.strip()
    if not cleaned or not arg.options:
        return Resolved(None, "empty")

    # An exact key or label match needs no model at all.
    direct = _direct(cleaned, arg.options)
    if direct is not None:
        return Resolved(direct, "direct", latency_ms=_ms(started))

    with tracer().start_as_current_span("resolve typed value") as span:
        answer = await _ask_decision(cleaned, arg, classifier)
        if answer is not None:
            set_attributes(span, {"resolve.source": "decision", "resolve.value": answer})
            return Resolved(answer, "decision", latency_ms=_ms(started))

        if luna is None:
            return Resolved(None, "unresolved", latency_ms=_ms(started))

        value, note = await _ask_luna(cleaned, arg, luna)
        set_attributes(
            span, {"resolve.source": "luna", "resolve.value": value or "", "resolve.note": note}
        )
        return Resolved(value, "luna" if value else "unresolved", note, _ms(started))


def _direct(typed: str, options: dict[str, str]) -> str | None:
    folded = typed.casefold()
    for key, label in options.items():
        if folded == key.casefold() or folded == key.replace("_", " ").casefold():
            return key
        if folded in {part.strip().casefold() for part in _aliases(label)}:
            return key
    return None


def _aliases(label: str) -> list[str]:
    """Option descriptions read as prose, so the names inside them are the aliases."""
    parts: list[str] = []
    for chunk in label.replace(" / ", ", ").replace(" or ", ", ").split(","):
        cleaned = chunk.strip()
        if cleaned and not cleaned.lower().startswith("anywhere"):
            parts.append(cleaned)
    return parts


async def _ask_decision(typed: str, arg: Arg, classifier: Any) -> str | None:
    """The same closed set, but asked about the typed value rather than the sentence."""
    try:
        response = await classifier.ask(
            {"typed": typed},
            {
                "match": {
                    "type": "choice",
                    "instructions": f"The user typed this when asked: {arg.question}",
                    "criteria": dict(arg.options),
                }
            },
        )
    except Exception:  # noqa: BLE001 - a failed match must fall through, not raise
        return None
    answer = (response.get("answers") or {}).get("match") or {}
    if float(answer.get("confidence") or 0.0) < DECISION_FLOOR:
        return None
    choice = answer.get("choice")
    return choice if choice in arg.options else None


async def _ask_luna(typed: str, arg: Arg, luna: Any) -> tuple[str | None, str]:
    """Beyond the set: Luna may look the value up before mapping it back in."""
    try:
        data, _ = await luna.json(
            name="resolve_option",
            instructions=(
                "Map what the user typed to exactly one option key from the list. "
                "Look it up if you need to: a place, company, or other real-world "
                "name may belong to an option that does not name it. "
                "Return null rather than guessing when nothing genuinely fits."
            ),
            input={"typed": typed, "question": arg.question, "options": arg.options},
            schema=SCHEMA,
            web_search=True,
        )
    except Exception:  # noqa: BLE001 - the card should say "not found", not error
        return None, ""
    value = data.get("value")
    note = str(data.get("note") or "")
    return (value if value in arg.options else None), note


def _ms(started: float) -> int:
    return int((perf_counter() - started) * 1000)
