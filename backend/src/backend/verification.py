"""Progressive result verification: answer fast, verify without blocking first paint."""

import asyncio
import math
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Any, Literal, Protocol

from backend.contracts import SchemaId
from backend.extract import ExtractionService, ExtractRequest, ExtractResponse
from backend.jev import DecideRequest
from backend.surfaces import split

VerificationStatus = Literal[
    "assessing",
    "confident",
    "verified",
    "corrected",
    "unverified",
]


class DecisionVerifier(Protocol):
    async def decide(self, request: DecideRequest) -> Any: ...


@dataclass(frozen=True)
class VerificationStage:
    response: ExtractResponse
    status: VerificationStatus
    confidence: float | None
    decision_model: str | None = None
    decision_latency_ms: int | None = None
    final: bool = False


class ProgressiveVerifier:
    """Hide parallel extraction, confidence judgment, and code verification."""

    def __init__(
        self,
        extraction: ExtractionService,
        classifier: DecisionVerifier,
    ) -> None:
        self._extraction = extraction
        self._classifier = classifier

    async def run(
        self,
        request: ExtractRequest,
        *,
        fallback_confidence: float,
    ) -> AsyncIterator[VerificationStage]:
        fast_task = asyncio.create_task(
            self._extract(request, "fast"), name="progressive-fast"
        )
        code_task = asyncio.create_task(
            self._extract(request, "code"), name="progressive-code"
        )
        decision_task: asyncio.Task[tuple[float, str | None, int | None]] | None = None
        try:
            fast = await fast_task
            if not fast.ok:
                code = await code_task
                yield VerificationStage(
                    response=code if code.ok else fast,
                    status="verified" if code.ok else "unverified",
                    confidence=1.0 if code.ok else None,
                    final=True,
                )
                return

            yield VerificationStage(
                response=fast,
                status="assessing",
                confidence=None,
            )
            decision_task = asyncio.create_task(
                self._assess(request.text, request.card, fast, fallback_confidence),
                name="progressive-decision",
            )

            done, _ = await asyncio.wait(
                {decision_task, code_task}, return_when=asyncio.FIRST_COMPLETED
            )
            confidence = fallback_confidence
            decision_model: str | None = None
            decision_latency_ms: int | None = None
            if decision_task in done:
                confidence, decision_model, decision_latency_ms = decision_task.result()
                if not code_task.done():
                    yield VerificationStage(
                        response=fast,
                        status="confident",
                        confidence=confidence,
                        decision_model=decision_model,
                        decision_latency_ms=decision_latency_ms,
                    )

            code = await code_task
            if code.ok:
                yield VerificationStage(
                    response=code,
                    status=(
                        "verified"
                        if _equivalent(request.card, fast.values, code.values)
                        else "corrected"
                    ),
                    confidence=1.0,
                    decision_model=decision_model,
                    decision_latency_ms=decision_latency_ms,
                    final=True,
                )
                return

            if decision_task not in done:
                confidence, decision_model, decision_latency_ms = await decision_task
            yield VerificationStage(
                response=fast,
                status="unverified",
                confidence=confidence,
                decision_model=decision_model,
                decision_latency_ms=decision_latency_ms,
                final=True,
            )
        finally:
            for task in (fast_task, code_task, decision_task):
                if task is not None and not task.done():
                    task.cancel()
                    try:
                        await task
                    except asyncio.CancelledError:
                        pass

    async def _extract(
        self, request: ExtractRequest, lane: Literal["fast", "code"]
    ) -> ExtractResponse:
        return await self._extraction.extract(request.model_copy(update={"lane": lane}))

    async def _assess(
        self,
        text: str,
        schema: SchemaId,
        response: ExtractResponse,
        fallback: float,
    ) -> tuple[float, str | None, int | None]:
        decide = getattr(self._classifier, "decide", None)
        if decide is None:
            return fallback, None, None
        try:
            result = await decide(
                DecideRequest(
                    text=text,
                    topic="provisional result confidence",
                    state={"candidate": _normalized(schema, response.values)},
                    axes={
                        "candidate_is_correct": (
                            "`state.candidate` is a plausible and correct answer to "
                            "`state.text`, including the interpreted inputs and the "
                            "result. This is a fast semantic confidence judgment; "
                            "exact arithmetic will be verified separately in code."
                        )
                    },
                )
            )
            return (
                float(result.axes.get("candidate_is_correct", fallback)),
                str(result.model),
                int(result.latency_ms),
            )
        except Exception:  # noqa: BLE001 - confidence must not block a usable result
            return fallback, None, None


def stage_values(stage: VerificationStage) -> dict[str, Any]:
    return {
        **stage.response.values,
        "_verification_status": stage.status,
        "_verification_confidence": stage.confidence,
    }


def _normalized(schema: SchemaId, values: dict[str, Any]) -> dict[str, Any]:
    if schema is SchemaId.SPLIT:
        return split.compute(values)
    return values


def _equivalent(
    schema: SchemaId,
    provisional: dict[str, Any],
    verified: dict[str, Any],
) -> bool:
    left = _normalized(schema, provisional)
    right = _normalized(schema, verified)
    left_answer = left.get("answer_value")
    right_answer = right.get("answer_value")
    if isinstance(left_answer, int | float) and isinstance(right_answer, int | float):
        return math.isclose(
            float(left_answer), float(right_answer), rel_tol=1e-9, abs_tol=1e-9
        )
    return left == right
