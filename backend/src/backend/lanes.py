"""Lane selection: JEV's own signals decide how hard Luna has to work.

The signals arrive with the classification, so choosing a lane costs no extra
round trip.
"""

from backend.contracts import ClassificationResult, SchemaId
from backend.extract import Lane

LOOKUP_GATE = 0.35
COMPUTE_GATE = 0.5

# Cards whose answer is a number or a date. Luna must run Python to check it.
PYTHON_CARDS = frozenset(
    {
        SchemaId.CALC,
        SchemaId.CONVERT,
        SchemaId.SPLIT,
        SchemaId.COUNTDOWN,
        SchemaId.EXPENSE,
        SchemaId.GOAL,
        SchemaId.TIMER,
    }
)


def lanes(schema: SchemaId, result: ClassificationResult, *, web_search: bool = False) -> list[Lane]:
    """Which Luna lanes to run, cheapest first. `fast` always runs."""
    signals = result.diagnostics.signals
    chosen: list[Lane] = ["fast"]
    if web_search or signals.get("needs_lookup", 0.0) >= LOOKUP_GATE:
        chosen.append("web")
    if schema in PYTHON_CARDS or signals.get("needs_computation", 0.0) >= COMPUTE_GATE:
        chosen.append("code")
    return chosen
