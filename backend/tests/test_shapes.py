import json

from backend.shapes import Clarify, Panel, render


def _components(surface):
    return {component["id"]: component for component in surface.components}


def test_panel_uses_header_tone_metric_chips_and_change_action() -> None:
    surface = render(
        Panel(
            title="Tokyo is 16 hours ahead.",
            headline="1:22 PM",
            caption="Time difference right now",
            tone="time",
            note="Wednesday in Tokyo · JST",
            chips=[{"label": "You picked Tokyo", "icon": "checkmark"}],
            change_text="what time is it over there",
        )
    )
    components = _components(surface)

    assert components["head"]["component"] == "Header"
    assert components["answer_panel"] == {
        "id": "answer_panel",
        "component": "Panel",
        "child": "answer",
        "tone": {"path": "/tone"},
    }
    assert components["headline"]["component"] == "Metric"
    assert components["chips"]["component"] == "Chips"
    assert json.loads(surface.data["chips"])[0]["label"] == "You picked Tokyo"
    assert components["change"]["action"]["event"] == {
        "name": "change_place",
        "context": {"text": "what time is it over there"},
    }


def test_clarify_preserves_order_probability_label_and_adds_previews() -> None:
    surface = render(
        Clarify(
            title="Time difference",
            prompt="Which place did you mean? Here’s the time in each.",
            argument="to_city",
            label="Another place",
            tone="time",
            text="what time is it over there",
            options=[
                {
                    "label": "New York",
                    "value": "new_york",
                    "probability": 0.58,
                    "preview": {"value": "12:22 AM", "context": "Wed · 3 hours ahead"},
                },
                {"label": "London", "value": "london", "probability": 0.25},
                {"label": "Tokyo", "value": "tokyo", "probability": 0.06},
                {"label": "Paris", "value": "paris", "probability": 0.05},
            ],
        )
    )
    components = _components(surface)

    assert components["head"]["component"] == "Header"
    assert components["choice_panel"]["component"] == "Panel"
    assert components["opt0_choice"] == {
        "id": "opt0_choice",
        "component": "Choice",
        "name": "New York",
        "share": 0.58,
        "value": "12:22 AM",
        "context": "Wed · 3 hours ahead",
        "top": True,
    }
    assert components["opt3"]["variant"] == "default"
    assert components["typed"]["label"] == "Somewhere else"
