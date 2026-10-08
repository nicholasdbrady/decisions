"""Small builders for the A2UI v0.9 basic catalog.

Prop names come from `@a2ui/web_core` `catalog.json`, not from the middleware
prompt text, which still describes an older shape.
"""

from typing import Any

Component = dict[str, Any]


def bind(path: str) -> dict[str, str]:
    """A data-model binding. The renderer resolves it against updateDataModel."""
    return {"path": f"/{path.lstrip('/')}"}


def card(child: str, *, id: str = "root") -> Component:
    return {"id": id, "component": "Card", "child": child}


def column(id: str, children: list[str], *, align: str = "stretch") -> Component:
    return {"id": id, "component": "Column", "children": children, "align": align}


def row(
    id: str, children: list[str], *, align: str = "center", justify: str | None = None
) -> Component:
    node: Component = {
        "id": id,
        "component": "Row",
        "children": children,
        "align": align,
    }
    if justify:
        node["justify"] = justify
    return node


def text(id: str, value: str | dict[str, str], *, variant: str = "body") -> Component:
    return {"id": id, "component": "Text", "text": value, "variant": variant}


def header(
    id: str,
    title: str | dict[str, str],
    *,
    caption: str | dict[str, str] | None = None,
) -> Component:
    node: Component = {"id": id, "component": "Header", "title": title}
    if caption is not None:
        node["caption"] = caption
    return node


def panel(
    id: str, child: str, *, tone: str | dict[str, str] | None = None
) -> Component:
    node: Component = {"id": id, "component": "Panel", "child": child}
    if tone is not None:
        node["tone"] = tone
    return node


def field(id: str, label: str, path: str, *, variant: str = "shortText") -> Component:
    return {
        "id": id,
        "component": "TextField",
        "label": label,
        "value": bind(path),
        "variant": variant,
    }


def picker(id: str, label: str, path: str, options: list[dict[str, str]]) -> Component:
    return {
        "id": id,
        "component": "ChoicePicker",
        "label": label,
        "value": bind(path),
        "options": options,
        "variant": "mutuallyExclusive",
        "displayStyle": "chips" if len(options) <= 4 else "checkbox",
    }


def metric(
    id: str,
    path: str,
    *,
    unit: str | dict[str, str] | None = None,
    caption: str | dict[str, str] | None = None,
    tone: str | dict[str, str] | None = None,
    icon: str | dict[str, str] | None = None,
) -> Component:
    """A JEV-catalog component: one computed answer, shown large."""
    node: Component = {"id": id, "component": "Metric", "value": bind(path)}
    if unit is not None:
        node["unit"] = unit
    if caption is not None:
        node["caption"] = caption
    if tone is not None:
        node["tone"] = tone
    if icon is not None:
        node["icon"] = icon
    return node


def chips(id: str, items: str | dict[str, str]) -> Component:
    return {"id": id, "component": "Chips", "items": items}


def hero(id: str, value: str | dict[str, str], **props: Any) -> Component:
    return {"id": id, "component": "Hero", "value": value, **_present(props)}


def strip(id: str, items: str | dict[str, str], **props: Any) -> Component:
    return {"id": id, "component": "Strip", "items": items, **_present(props)}


def range(
    id: str,
    low: float | dict[str, str],
    high: float | dict[str, str],
    **props: Any,
) -> Component:
    return {"id": id, "component": "Range", "low": low, "high": high, **_present(props)}


def ranked(id: str, items: str | dict[str, str], **props: Any) -> Component:
    return {"id": id, "component": "Ranked", "items": items, **_present(props)}


def facts(id: str, items: str | dict[str, str], **props: Any) -> Component:
    return {"id": id, "component": "Facts", "items": items, **_present(props)}


def answer(
    id: str,
    lead: str | dict[str, str],
    points: str | dict[str, str],
    sources: str | dict[str, str],
    *,
    lead_sources: str | dict[str, str] | None = None,
    streaming: bool | dict[str, str] | None = None,
) -> Component:
    return {
        "id": id,
        "component": "Answer",
        "lead": lead,
        "points": points,
        "sources": sources,
        **_present({"leadSources": lead_sources, "streaming": streaming}),
    }


def choice(
    id: str,
    name: str | dict[str, str],
    *,
    share: float | dict[str, str] | None = None,
    value: str | dict[str, str] | None = None,
    context: str | dict[str, str] | None = None,
    top: bool | dict[str, str] | None = None,
) -> Component:
    return {
        "id": id,
        "component": "Choice",
        "name": name,
        **_present({"share": share, "value": value, "context": context, "top": top}),
    }


def action_button(
    id: str,
    child: str,
    action: str,
    context: dict[str, Any] | None = None,
    *,
    variant: str = "primary",
) -> Component:
    return {
        "id": id,
        "component": "Button",
        "child": child,
        "variant": variant,
        "action": {"event": {"name": action, "context": context or {}}},
    }


def button(
    id: str,
    label: str,
    action: str,
    context: dict[str, Any] | None = None,
    *,
    variant: str = "primary",
) -> list[Component]:
    """A button plus its label child, which the basic catalog requires."""
    label_id = f"{id}_label"
    return [
        action_button(id, label_id, action, context, variant=variant),
        text(label_id, label),
    ]


def _present(values: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in values.items() if value is not None}
