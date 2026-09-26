from backend.contracts import EventView, SchemaId, UIView


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
