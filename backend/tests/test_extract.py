import pytest

from backend.extract import _require_split_python


def test_split_python_verification_requires_computed_answer() -> None:
    with pytest.raises(ValueError, match="people, tip_percent, answer, answer_value"):
        _require_split_python(
            {
                "total": 60,
                "people": None,
                "tip_percent": None,
                "answer": None,
                "answer_value": None,
            },
            ["total = Decimal('60')"],
        )
