"""Importing this package registers every capability JEV can choose from."""

from backend.capabilities import clock, market  # noqa: F401 - import registers
from backend.capabilities.base import (
    FALLBACK,
    REGISTRY,
    Arg,
    Capability,
    questions,
    register,
)

__all__ = ["FALLBACK", "REGISTRY", "Arg", "Capability", "questions", "register"]
