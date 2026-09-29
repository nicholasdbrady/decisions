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

# JEV picks from a closed set, so an out-of-catalog question lands on a neighbour
# and the extraction comes back empty. A specialised builder renders those nulls
# as an empty card; the generic one still shows the answer the compute lane found.
REQUIRED: dict[SchemaId, tuple[str, ...]] = {
    SchemaId.CONVERT: convert.REQUIRED,
}

EMPTY = (None, "", [], {})


async def _convert_action(context: dict[str, Any], providers: Providers | None) -> dict[str, Any]:
    value = float(context.get("value"))
    return await convert_units(value, _first(context.get("from")), _first(context.get("to")), providers)


# An action name maps to the schema that owns it and the code that recomputes it.
ACTIONS: dict[str, tuple[SchemaId, ActionHandler]] = {
    convert.ACTION: (SchemaId.CONVERT, _convert_action),
}


def build(schema: SchemaId, values: dict[str, Any]) -> Surface:
    builder = BUILDERS.get(schema)
    if builder is None or not _populated(schema, values):
        return generic.build(schema, values)
    return builder(values)


def _populated(schema: SchemaId, values: dict[str, Any]) -> bool:
    return all(values.get(key) not in EMPTY for key in REQUIRED.get(schema, ()))


def operations(schema: SchemaId, values: dict[str, Any], surface_id: str) -> list[dict[str, Any]]:
    """The full surface, always. CopilotKit replaces an activity rather than patching it."""
    return paint(build(schema, values), surface_id)


def paint(surface: Surface, surface_id: str) -> list[dict[str, Any]]:
    """A built surface as standard A2UI operations, whatever produced it."""
    return [
        create_surface(surface_id, CATALOG_ID),
        update_components(surface_id, surface.components),
        update_data_model(surface_id, surface.data),
    ]


def _first(value: Any) -> str:
    if isinstance(value, list):
        return str(value[0]) if value else ""
    return str(value) if value else ""
