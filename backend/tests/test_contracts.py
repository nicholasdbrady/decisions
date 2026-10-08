from backend.contracts import AnswerView, EventView, SchemaId, UIView


def test_ui_view_uses_schema_as_wire_discriminator() -> None:
    view = UIView.model_validate(
        {
            "schema": "event",
            "generation": 3,
            "title": "Lunch",
            "data": {
                "title": "Lunch with Alex",
                "starts_at": "2026-09-25T12:00:00Z",
            },
        }
    )

    assert isinstance(view.root, EventView)
    assert view.root.kind is SchemaId.EVENT
    assert view.model_dump(mode="json", by_alias=True)["schema"] == "event"


def test_answer_view_validates_structured_sources() -> None:
    view = UIView.model_validate(
        {
            "schema": "answer",
            "generation": 1,
            "title": "Answer",
            "data": {
                "lead": "A sourced answer.",
                "lead_sources": ["https://example.com/source"],
                "points": [
                    {
                        "text": "A supporting fact.",
                        "sources": ["https://example.com/source"],
                    }
                ],
                "sources": [
                    {
                        "url": "https://example.com/source",
                        "title": "Example source",
                        "site": "Example",
                    }
                ],
            },
        }
    )

    assert isinstance(view.root, AnswerView)
    assert view.root.kind is SchemaId.ANSWER
