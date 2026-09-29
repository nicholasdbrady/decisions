"""Shape primitives: what a capability returns instead of a card.

A capability never names a layout. It returns one of these shapes, and `render`
composes A2UI operations from the shape at compute time. A capability written
tomorrow paints with no frontend work as long as it returns a known shape.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any

from backend.surfaces.catalog import bind, button, card, column, metric, row
from backend.surfaces.catalog import field as text_field
from backend.surfaces.catalog import text as text_node
from backend.surfaces.spec import Surface

Row = tuple[str, str]


@dataclass
class Panel:
    """One computed answer, optionally with supporting rows."""

    title: str
    headline: str = ""
    caption: str = ""
    rows: list[Row] = field(default_factory=list)


@dataclass
class Series:
    """Several named runs of numbers over shared labels."""

    title: str
    labels: list[str]
    series: dict[str, list[float]]
    caption: str = ""
    rows: list[Row] = field(default_factory=list)


@dataclass
class Alternatives:
    """JEV could not separate the candidates. The user picks instead of retyping."""

    title: str
    prompt: str
    options: list[dict[str, Any]]
    text: str = ""
    label: str = ""


@dataclass
class Clarify:
    """One required argument was never stated. Name it and offer its closed set."""

    title: str
    prompt: str
    argument: str
    options: list[dict[str, Any]]
    text: str = ""
    label: str = ""


Shape = Panel | Series | Alternatives | Clarify

PICK_ACTION = "pick"


def render(shape: Shape) -> Surface:
    if isinstance(shape, Panel):
        return _panel(shape)
    if isinstance(shape, Series):
        return _series(shape)
    if isinstance(shape, Alternatives):
        return _choices(shape, "capability", free_text=False)
    return _choices(shape, shape.argument, free_text=True)


def _panel(shape: Panel) -> Surface:
    children = ["title"]
    components = [
        card("body"),
        column("body", children),
        text_node("title", bind("title"), variant="h3"),
    ]
    data: dict[str, Any] = {"title": shape.title, "headline": shape.headline}
    if shape.headline:
        children.append("headline")
        components.append(metric("headline", "headline", caption=shape.caption or None))
    _rows(shape.rows, children, components, data)
    return Surface(components=components, data=data)


def _series(shape: Series) -> Surface:
    children = ["title", "chart"]
    components = [
        card("body"),
        column("body", children),
        text_node("title", bind("title"), variant="h3"),
        {
            "id": "chart",
            "component": "Chart",
            "series": bind("series"),
            "caption": shape.caption,
        },
    ]
    data: dict[str, Any] = {
        "title": shape.title,
        # The renderer parses this; a JSON string keeps the binding a plain Dynamic string.
        "series": json.dumps({"labels": shape.labels, "series": shape.series}),
    }
    _rows(shape.rows, children, components, data)
    return Surface(components=components, data=data)


def _choices(shape: Alternatives | Clarify, argument: str, *, free_text: bool) -> Surface:
    """Ambiguity rendered as real A2UI actions, so a click replaces the retype.

    A closed set is how Jev is asked, not a limit on what the user may answer. The
    shortlist is Jev's own ranking; the field beside it accepts anything, and the
    answer is resolved after the fact.
    """
    children = ["title", "prompt"]
    components: list[dict[str, Any]] = [
        card("body"),
        column("body", children),
        text_node("title", bind("title"), variant="h3"),
        text_node("prompt", bind("prompt"), variant="caption"),
    ]
    for index, option in enumerate(shape.options):
        option_id = f"opt{index}"
        children.append(option_id)
        share = option.get("probability")
        label = str(option.get("label") or option.get("value"))
        if isinstance(share, int | float) and share > 0:
            label = f"{label} · {round(float(share) * 100)}%"
        components.extend(
            button(
                option_id,
                label,
                PICK_ACTION,
                # The original text rides along so the pick re-dispatches it.
                {"argument": argument, "value": str(option.get("value")), "text": shape.text},
                variant="secondary" if index else "primary",
            )
        )

    data: dict[str, Any] = {"title": shape.title, "prompt": shape.prompt, "typed": ""}
    if free_text:
        children.extend(["typed_row", "typed_hint"])
        components.append(row("typed_row", ["typed", "typed_go"], align="end"))
        components.append(text_field("typed", shape.label or "Something else", "typed"))
        components.extend(
            button(
                "typed_go",
                "Use this",
                PICK_ACTION,
                # Bindings resolve when the button is pressed, so whatever is in the
                # field at that moment is what gets sent.
                {"argument": argument, "typed": bind("typed"), "text": shape.text},
                variant="secondary",
            )
        )
        components.append(
            text_node("typed_hint", "Not listed? Type it and we'll work it out.", variant="caption")
        )
    return Surface(components=components, data=data)


def _rows(
    rows: list[Row],
    children: list[str],
    components: list[dict[str, Any]],
    data: dict[str, Any],
) -> None:
    for index, (label, value) in enumerate(rows):
        if not value:
            continue
        row_id, value_id = f"r{index}", f"v{index}"
        children.append(row_id)
        components.append(row(row_id, [f"l{index}", value_id], justify="spaceBetween"))
        components.append(text_node(f"l{index}", label, variant="caption"))
        components.append(text_node(value_id, bind(value_id)))
        data[value_id] = value
