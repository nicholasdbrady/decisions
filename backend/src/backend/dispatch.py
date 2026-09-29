"""Capability dispatch: one batched Decisions call turns text into a typed call.

The Decisions endpoint answers every question in one request, so the choice of
capability and the values of all its closed-set arguments arrive together. Code
reads only the chosen capability's answers and ignores the rest.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from time import perf_counter
from typing import Any

from backend.capabilities import base
from backend.capabilities.base import FALLBACK, REGISTRY, Arg, Capability
from backend.shapes import Alternatives, Clarify, Shape

# Below this the winner is not meaningfully ahead of the runner-up, so the user
# chooses instead of us guessing.
MARGIN_GATE = 0.2
# Below this the text does not mention the argument at all.
STATED_GATE = 0.5
MANY_GATE = 0.5


@dataclass
class Dispatch:
    """What one batched call decided, and the trace behind it."""

    capability: Capability | None
    arguments: dict[str, Any] = field(default_factory=dict)
    probabilities: dict[str, float] = field(default_factory=dict)
    confidence: float = 0.0
    margin: float = 0.0
    missing: str | None = None
    latency_ms: int = 0
    model: str = ""
    forced: bool = False

    @property
    def deferred(self) -> bool:
        """The registry does not cover this; the schema pipeline should take it."""
        return self.capability is None

    def gate(self, text: str = "") -> Shape | None:
        """JEV judging the question *before* the user has to rewrite it."""
        if self.capability is None:
            return None
        if not self.forced and self.margin < MARGIN_GATE and len(self.probabilities) > 1:
            return Alternatives(
                title="Which did you mean?",
                prompt="Two readings scored close together. Pick one to keep going.",
                options=[
                    {"label": _label(name), "value": name, "probability": share}
                    for name, share in sorted(
                        self.probabilities.items(), key=lambda item: -item[1]
                    )[:3]
                ],
                text=text,
            )
        if self.missing is not None:
            arg = self.capability.args[self.missing]
            return Clarify(
                title=self.capability.label,
                prompt=arg.question,
                argument=self.missing,
                options=[
                    {"label": _title(value), "value": value} for value in list(arg.options)[:8]
                ],
                text=text,
            )
        return None


def _label(name: str) -> str:
    cap = REGISTRY.get(name)
    return cap.label if cap else _title(name)


def _title(value: str) -> str:
    return value.replace("_", " ").title()


async def dispatch(
    classifier: Any,
    text: str,
    *,
    force: str | None = None,
    overrides: dict[str, Any] | None = None,
) -> Dispatch:
    """Decide the capability and its closed-set arguments in one call.

    `force` and `overrides` carry a user's pick back in, so choosing from an
    Alternatives or Clarify card resolves the same text instead of re-asking.
    """
    started = perf_counter()
    response = await classifier.ask({"text": text}, base.questions())
    answers = response.get("answers") or {}
    elapsed = int((perf_counter() - started) * 1000)

    tool = answers.get("__tool__") or {}
    probabilities = {
        name: float(share)
        for name, share in (tool.get("probabilities") or {}).items()
        if name != FALLBACK
    }
    chosen = force or tool.get("choice")
    ranked = sorted(probabilities.values(), reverse=True)
    result = Dispatch(
        capability=REGISTRY.get(chosen) if chosen != FALLBACK else None,
        probabilities=probabilities,
        confidence=float(tool.get("confidence") or 0.0),
        margin=(ranked[0] - ranked[1]) if len(ranked) > 1 else (ranked[0] if ranked else 0.0),
        latency_ms=elapsed,
        model=str(response.get("model") or ""),
        forced=force is not None,
    )
    if result.capability is None:
        return result

    supplied = overrides or {}
    for name, arg in result.capability.args.items():
        value = supplied.get(name)
        if value is None:
            value = _read(answers, result.capability.name, name, arg)
        elif arg.many and not isinstance(value, list):
            value = [value]
        if value is None:
            if arg.required:
                result.missing = name
                return result
            value = arg.default
        if value is not None:
            result.arguments[name] = value
    return result


def _read(answers: dict[str, Any], capability: str, name: str, arg: Arg) -> Any:
    if arg.many:
        picked = [
            value
            for value in arg.options
            if float((answers.get(f"{capability}.{name}.{value}") or {}).get("noul") or 0.0)
            > MANY_GATE
        ]
        return picked or None
    if arg.stated:
        mentioned = (answers.get(f"{capability}.{name}?") or {}).get("noul")
        if mentioned is not None and float(mentioned) < STATED_GATE:
            return None
    answer = answers.get(f"{capability}.{name}") or {}
    return answer.get("choice")
