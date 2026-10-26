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
    # Jev's ranking for the argument it could not read, so the question we ask
    # leads with its best guesses instead of whatever the registry lists first.
    ranked: dict[str, float] = field(default_factory=dict)
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
        if (
            not self.forced
            and self.margin < MARGIN_GATE
            and len(self.probabilities) > 1
        ):
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
            # Lead with what Jev thought most likely. It was not confident enough to
            # act on, but it is a far better ordering than the registry's own.
            order = [value for value in self.ranked if value in arg.options]
            order += [value for value in arg.options if value not in self.ranked]
            return Clarify(
                title=self.capability.label,
                prompt=arg.ask or arg.question,
                argument=self.missing,
                label=arg.label or _title(self.missing),
                options=[
                    {
                        "label": _title(value),
                        "value": value,
                        "probability": self.ranked.get(value),
                    }
                    for value in order[:6]
                ],
                text=text,
                tone=self.capability.tone,
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
    elapsed = int((perf_counter() - started) * 1000)
    return parse_dispatch(
        response,
        latency_ms=elapsed,
        force=force,
        overrides=overrides,
    )


def parse_dispatch(
    response: dict[str, Any],
    *,
    latency_ms: int,
    force: str | None = None,
    overrides: dict[str, Any] | None = None,
) -> Dispatch:
    """Read capability routing answers from a shared Decisions response."""
    answers = response.get("answers") or {}

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
        margin=(ranked[0] - ranked[1])
        if len(ranked) > 1
        else (ranked[0] if ranked else 0.0),
        latency_ms=latency_ms,
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
                result.ranked = _ranked(answers, result.capability.name, name, arg)
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
            if float(
                (answers.get(f"{capability}.{name}.{value}") or {}).get("noul") or 0.0
            )
            > MANY_GATE
        ]
        return picked or None
    answer = answers.get(f"{capability}.{name}") or {}
    # A Choice always returns *some* option. Confidence is what separates reading
    # the text from guessing at it, so it is the gate rather than the answer.
    if float(answer.get("confidence") or 0.0) < arg.floor:
        return None
    return answer.get("choice")


def _ranked(
    answers: dict[str, Any], capability: str, name: str, arg: Arg
) -> dict[str, float]:
    """Jev's own ordering for an argument, so a question offers its best guesses first."""
    if arg.many:
        # A `many` argument is scored one value at a time, so its ranking is the
        # per-value yes probability rather than a single distribution.
        scored = {
            value: float(
                (answers.get(f"{capability}.{name}.{value}") or {}).get("noul") or 0.0
            )
            for value in arg.options
        }
        return dict(sorted(scored.items(), key=lambda kv: -kv[1]))
    answer = answers.get(f"{capability}.{name}") or {}
    return {
        value: float(share)
        for value, share in sorted(
            (answer.get("probabilities") or {}).items(), key=lambda kv: -kv[1]
        )
    }
