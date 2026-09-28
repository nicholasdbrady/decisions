"""Surface registry: JEV names a schema, this maps it to A2UI operations.

Adding a card in Phase 2 means writing one builder and registering it here. No
other file changes.
"""

from collections.abc import Awaitable, Callable
from typing import Any

from ag_ui_a2ui_toolkit import (
    create_surface,
    update_components,
    update_data_model,
)

from backend.compute import convert_units
from backend.contracts import SchemaId
from backend.providers import Providers
from backend.surfaces import convert, generic
from backend.surfaces.spec import Surface

# The frontend declares the same id in `frontend/src/a2ui/definitions.ts`. It merges
# the A2UI basic catalog, so every basic component stays available.
CATALOG_ID = "https://jev.local/specification/v1/catalog.json"

Builder = Callable[[dict[str, Any]], Surface]
ActionHandler = Callable[[dict[str, Any], Providers | None], Awaitable[dict[str, Any]]]

BUILDERS: dict[SchemaId, Builder] = {
    SchemaId.CONVERT: convert.build,
}


async def _convert_action(context: dict[str, Any], providers: Providers | None) -> dict[str, Any]:
    value = float(context.get("value"))
    return await convert_units(value, _first(context.get("from")), _first(context.get("to")), providers)


# An action name maps to the schema that owns it and the code that recomputes it.
ACTIONS: dict[str, tuple[SchemaId, ActionHandler]] = {
    convert.ACTION: (SchemaId.CONVERT, _convert_action),
}


def build(schema: SchemaId, values: dict[str, Any]) -> Surface:
    builder = BUILDERS.get(schema)
    return builder(values) if builder else generic.build(schema, values)


def operations(schema: SchemaId, values: dict[str, Any], surface_id: str) -> list[dict[str, Any]]:
    """The full surface, always. CopilotKit replaces an activity rather than patching it."""
    surface = build(schema, values)
    return [
        create_surface(surface_id, CATALOG_ID),
        update_components(surface_id, surface.components),
        update_data_model(surface_id, surface.data),
    ]


def _first(value: Any) -> str:
    if isinstance(value, list):
        return str(value[0]) if value else ""
    return str(value) if value else ""
