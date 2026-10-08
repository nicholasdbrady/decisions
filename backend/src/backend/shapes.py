"""Shape primitives: what a capability returns instead of a card.

A capability never names a layout. It returns one of these shapes, and `render`
composes A2UI operations from the shape at compute time. A capability written
tomorrow paints with no frontend work as long as it returns a known shape.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any

from backend.surfaces.catalog import (
    action_button,
    answer,
    bind,
    button,
    card,
    chips,
    choice,
    column,
    header,
    metric,
    panel,
    row,
)
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
    tone: str = "neutral"
    unit: str = ""
    note: str = ""
    chips: list[dict[str, str]] = field(default_factory=list)
    rows: list[Row] = field(default_factory=list)
    change_text: str = ""


@dataclass
class Series:
    """Several named runs of numbers over shared labels."""

    title: str
    labels: list[str]
    series: dict[str, list[float]]
    caption: str = ""
    rows: list[Row] = field(default_factory=list)


@dataclass
class Answer:
    """A sourced answer made of one lead, supporting points, and public pages."""

    lead: str
    points: list[dict[str, Any]] = field(default_factory=list)
    sources: list[dict[str, Any]] = field(default_factory=list)
    lead_sources: list[str] = field(default_factory=list)
    streaming: bool = False


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
    tone: str = "neutral"


Shape = Panel | Series | Answer | Alternatives | Clarify

PICK_ACTION = "pick"
CHANGE_ACTION = "change_place"


def render(shape: Shape) -> Surface:
    if isinstance(shape, Panel):
        return _panel(shape)
    if isinstance(shape, Series):
        return _series(shape)
    if isinstance(shape, Answer):
        return _answer(shape)
    if isinstance(shape, Alternatives):
        return _choices(shape, "capability", free_text=False)
    return _choices(shape, shape.argument, free_text=True)


def _panel(shape: Panel) -> Surface:
    children = ["head", "answer_panel"]
    answer_children = ["headline"]
    components = [
        card("body"),
        column("body", children),
        header("head", bind("title"), caption=bind("caption")),
        panel("answer_panel", "answer", tone=bind("tone")),
        column("answer", answer_children),
        metric(
            "headline",
            "headline",
            unit=bind("unit"),
            caption=bind("note"),
        ),
    ]
    data: dict[str, Any] = {
        "title": shape.title,
        "caption": shape.caption,
        "headline": shape.headline,
        "tone": shape.tone,
        "unit": shape.unit,
        "note": shape.note,
    }
    if shape.chips:
        answer_children.append("chips")
        components.append(chips("chips", bind("chips")))
        data["chips"] = json.dumps(shape.chips)
    _rows(shape.rows, answer_children, components, data)
    if shape.change_text:
        answer_children.append("change")
        components.extend(
            button(
                "change",
                "Change place",
                CHANGE_ACTION,
                {"text": shape.change_text},
                variant="borderless",
            )
        )
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


def _answer(shape: Answer) -> Surface:
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
            "lead": shape.lead,
            "lead_sources": json.dumps(shape.lead_sources),
            "points": json.dumps(shape.points),
            "sources": json.dumps(shape.sources),
            "streaming": shape.streaming,
        },
    )


def _choices(
    shape: Alternatives | Clarify, argument: str, *, free_text: bool
) -> Surface:
    """Ambiguity rendered as real A2UI actions, so a click replaces the retype.

    A closed set is how Jev is asked, not a limit on what the user may answer. The
    shortlist is Jev's own ranking; the field beside it accepts anything, and the
    answer is resolved after the fact.
    """
    if isinstance(shape, Alternatives):
        return _alternatives(shape, argument)

    children = ["head", "choice_panel"]
    choice_children: list[str] = []
    components: list[dict[str, Any]] = [
        card("body"),
        column("body", children),
        header("head", bind("prompt"), caption=bind("caption")),
        panel("choice_panel", "choices", tone=bind("tone")),
        column("choices", choice_children),
    ]
    rest_ids: list[str] = []
    for index, option in enumerate(shape.options):
        option_id = f"opt{index}"
        share = option.get("probability")
        label = str(option.get("label") or option.get("value"))
        context = {
            "argument": argument,
            "value": str(option.get("value")),
            "text": shape.text,
        }
        if index < 3:
            face_id = f"{option_id}_choice"
            preview = option.get("preview") or {}
            choice_children.append(option_id)
            components.append(
                action_button(
                    option_id,
                    face_id,
                    PICK_ACTION,
                    context,
                    variant="borderless",
                )
            )
            components.append(
                choice(
                    face_id,
                    label,
                    share=float(share) if isinstance(share, int | float) else None,
                    value=preview.get("value"),
                    context=preview.get("context"),
                    top=index == 0,
                )
            )
        else:
            rest_ids.append(option_id)
            components.extend(
                button(
                    option_id,
                    label,
                    PICK_ACTION,
                    context,
                    variant="default",
                )
            )
    if rest_ids:
        choice_children.extend(["rest_label", "rest"])
        components.append(
            text_node("rest_label", "Also in the list", variant="caption")
        )
        components.append(row("rest", rest_ids))

    data: dict[str, Any] = {
        "title": shape.title,
        "prompt": shape.prompt,
        "caption": (
            f"{shape.title} · the question didn’t name a place"
            if shape.tone == "time"
            else f"{shape.title} · the question needs one more detail"
        ),
        "tone": shape.tone,
        "typed": "",
    }
    if free_text:
        choice_children.extend(["typed_hint", "typed_row"])
        components.append(
            text_node(
                "typed_hint", "Not in the list. We’ll search for it.", variant="caption"
            )
        )
        components.append(row("typed_row", ["typed", "typed_go"], align="end"))
        components.append(
            text_field(
                "typed",
                "Somewhere else"
                if shape.tone == "time"
                else (shape.label or "Something else"),
                "typed",
            )
        )
        components.extend(
            button(
                "typed_go",
                "Use this",
                PICK_ACTION,
                {"argument": argument, "typed": bind("typed"), "text": shape.text},
                variant="primary",
            )
        )
    return Surface(components=components, data=data)


def _alternatives(shape: Alternatives, argument: str) -> Surface:
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
                {
                    "argument": argument,
                    "value": str(option.get("value")),
                    "text": shape.text,
                },
                variant="default" if index else "primary",
            )
        )
    data: dict[str, Any] = {"title": shape.title, "prompt": shape.prompt, "typed": ""}
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
