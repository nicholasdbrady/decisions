"""The shape every surface builder returns."""

from typing import Any, NamedTuple

Component = dict[str, Any]


class Surface(NamedTuple):
    """Components describe the layout once; data carries the values they bind to."""

    components: list[Component]
    data: dict[str, Any]
