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


def row(id: str, children: list[str], *, align: str = "center", justify: str | None = None) -> Component:
    node: Component = {"id": id, "component": "Row", "children": children, "align": align}
    if justify:
        node["justify"] = justify
    return node


def text(id: str, value: str | dict[str, str], *, variant: str = "body") -> Component:
    return {"id": id, "component": "Text", "text": value, "variant": variant}


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


def metric(id: str, path: str, *, caption: str | dict[str, str] | None = None) -> Component:
    """A JEV-catalog component: one computed answer, shown large."""
    node: Component = {"id": id, "component": "Metric", "value": bind(path)}
    if caption is not None:
        node["caption"] = caption
    return node


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
        {
            "id": id,
            "component": "Button",
            "child": label_id,
            "variant": variant,
            "action": {"event": {"name": action, "context": context or {}}},
        },
        text(label_id, label),
    ]
