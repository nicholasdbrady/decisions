from backend.contracts import AnswerView, EventView, GraphView, SchemaId, UIView


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


def test_graph_view_validates_normalized_chart_data() -> None:
    view = UIView.model_validate(
        {
            "schema": "graph",
            "generation": 1,
            "title": "Graph",
            "data": {
                "lead": "Revenue rose each quarter.",
                "caption": "Quarterly revenue",
                "kind": "line",
                "unit": "M",
                "labels": ["Q1", "Q2", "Q3"],
                "series": [{"name": "Revenue", "values": [10, 12, 15]}],
                "source_name": "Example filing",
                "source_url": "https://example.com/filing",
            },
        }
    )

    assert isinstance(view.root, GraphView)
    assert view.root.kind is SchemaId.GRAPH
    assert view.root.data.series[0].values == [10, 12, 15]
