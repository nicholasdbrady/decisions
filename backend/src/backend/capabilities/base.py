"""The capability registry: what JEV chooses from, instead of a closed card enum.

A capability is an ordinary typed function plus a plain-language spec. Arguments
whose values come from a fixed list are closed sets, so each gets a Choice over
exactly those values and whatever reaches the function is a value it accepts.
This follows the TypeSafe function-calling cookbook.

Adding a capability means writing one function and one `Capability` entry. There
is no card to write: the shape it returns decides the UI at compute time.
"""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from typing import Any

from backend.shapes import Shape

# The escape hatch from the cookbook: anything the registry does not cover falls
# back to the existing JEV schema pipeline rather than being forced into a
# capability it does not fit.
FALLBACK = "other"


@dataclass(frozen=True)
class Arg:
    """One argument of a capability, described the way a person would ask about it."""

    question: str
    options: dict[str, str] = field(default_factory=dict)
    # `list[Literal[...]]`: one yes/no question per member rather than one choice.
    many: bool = False
    default: Any = None
    required: bool = False
    # Below this the Choice is not a read of the text, it is a guess. Jev reports
    # confidence as a second axis: the answer says what, confidence says whether to
    # act on it. A dedicated "did they mention it?" question would cost an extra
    # decision per argument to recover a signal the Choice already carries.
    floor: float = 0.75
    # What to call the argument when asking the user for it.
    label: str = ""


@dataclass(frozen=True)
class Capability:
    """A function JEV can call, and the words that let it decide when to."""

    name: str
    label: str
    criteria: str
    args: dict[str, Arg]
    run: Callable[..., Awaitable[Shape]]


REGISTRY: dict[str, Capability] = {}


def register(capability: Capability) -> Capability:
    REGISTRY[capability.name] = capability
    return capability


def questions() -> dict[str, dict[str, Any]]:
    """Every decision for every capability, as one batch.

    The Decisions endpoint answers these in a single call, so adding a capability
    costs questions rather than round trips.
    """
    batch: dict[str, dict[str, Any]] = {
        "__tool__": {
            "type": "choice",
            "instructions": "What is the user asking for?",
            "criteria": {
                **{name: cap.criteria for name, cap in REGISTRY.items()},
                FALLBACK: (
                    "Anything else: a note, a list, a reminder, an event, a timer, "
                    "a password, a colour, a random pick, or a plain calculation."
                ),
            },
        }
    }
    for cap in REGISTRY.values():
        for name, arg in cap.args.items():
            if arg.many:
                for value, description in arg.options.items():
                    batch[f"{cap.name}.{name}.{value}"] = {
                        "type": "noul",
                        "instructions": arg.question.format(value),
                        "criteria": {"true": description, "false": f"Not {description}"},
                    }
                continue
            if arg.options:
                batch[f"{cap.name}.{name}"] = {
                    "type": "choice",
                    "instructions": arg.question,
                    "criteria": dict(arg.options),
                }
    return batch
