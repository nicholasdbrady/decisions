from backend.contracts import SchemaId, SwitchDecision


def decide_schema_switch(
    probabilities: dict[SchemaId, float],
    *,
    current_schema: SchemaId | None,
    confidence_threshold: float,
    margin_threshold: float,
    hysteresis_margin: float,
) -> SwitchDecision:
    if not probabilities:
        raise ValueError("At least one schema probability is required")

    ordered = sorted(probabilities.items(), key=lambda item: item[1], reverse=True)
    winner, confidence = ordered[0]
    runner_up = ordered[1][1] if len(ordered) > 1 else 0.0
    margin = max(0.0, confidence - runner_up)

    if current_schema is None:
        accepted = confidence >= confidence_threshold and margin >= margin_threshold
        return SwitchDecision(
            accepted=accepted,
            selected_schema=winner if accepted else None,
            reason="initial_match" if accepted else (
                "below_confidence_threshold"
                if confidence < confidence_threshold
                else "below_margin_threshold"
            ),
            confidence=confidence,
            margin=margin,
        )

    if winner == current_schema:
        return SwitchDecision(
            accepted=True,
            selected_schema=current_schema,
            reason="same_schema",
            confidence=confidence,
            margin=margin,
        )

    if confidence < confidence_threshold:
        return SwitchDecision(
            accepted=False,
            selected_schema=current_schema,
            reason="below_confidence_threshold",
            confidence=confidence,
            margin=margin,
        )

    if margin < margin_threshold:
        return SwitchDecision(
            accepted=False,
            selected_schema=current_schema,
            reason="below_margin_threshold",
            confidence=confidence,
            margin=margin,
        )

    current_probability = probabilities.get(current_schema, 0.0)
    if confidence - current_probability < hysteresis_margin:
        return SwitchDecision(
            accepted=False,
            selected_schema=current_schema,
            reason="hysteresis_hold",
            confidence=confidence,
            margin=margin,
        )

    return SwitchDecision(
        accepted=True,
        selected_schema=winner,
        reason="clear_switch",
        confidence=confidence,
        margin=margin,
    )
