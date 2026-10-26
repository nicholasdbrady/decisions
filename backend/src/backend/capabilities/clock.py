"""Time between two places.

JEV reads dates as text rather than as ordered quantities, so it is asked only
to name the cities from a closed set. Every offset, difference, and clock time is
worked out by `zoneinfo` in code.
"""

from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

from backend.capabilities.base import Arg, Capability, register
from backend.shapes import Panel, Shape

# A curated closed set beats free-text geocoding here: JEV matches on meaning, the
# values are already valid IANA zones, and no extra lookup service is needed.
CITIES: dict[str, tuple[str, str]] = {
    "seattle": ("Seattle / Redmond / Bellevue, Washington", "America/Los_Angeles"),
    "san_francisco": (
        "San Francisco or the Bay Area, California",
        "America/Los_Angeles",
    ),
    "los_angeles": ("Los Angeles or San Diego, California", "America/Los_Angeles"),
    "denver": ("Denver or Salt Lake City", "America/Denver"),
    "chicago": ("Chicago, Dallas, Austin, or Houston", "America/Chicago"),
    "new_york": ("New York, Boston, Atlanta, Miami, or Toronto", "America/New_York"),
    "mexico_city": ("Mexico City", "America/Mexico_City"),
    "sao_paulo": ("Sao Paulo or Rio de Janeiro", "America/Sao_Paulo"),
    "london": ("London, Dublin, Manchester, or Edinburgh", "Europe/London"),
    "paris": ("Paris, Madrid, Barcelona, Rome, or Amsterdam", "Europe/Paris"),
    "berlin": ("Berlin, Munich, Zurich, Vienna, or Stockholm", "Europe/Berlin"),
    "athens": ("Athens, Helsinki, or Kyiv", "Europe/Athens"),
    "moscow": ("Moscow or Saint Petersburg", "Europe/Moscow"),
    "dubai": ("Dubai or Abu Dhabi", "Asia/Dubai"),
    "mumbai": ("Mumbai, Delhi, Bangalore, or anywhere in India", "Asia/Kolkata"),
    "singapore": ("Singapore or Kuala Lumpur", "Asia/Singapore"),
    "hong_kong": ("Hong Kong, Shenzhen, Beijing, or Shanghai", "Asia/Hong_Kong"),
    "tokyo": ("Tokyo, Osaka, or anywhere in Japan", "Asia/Tokyo"),
    "seoul": ("Seoul", "Asia/Seoul"),
    "sydney": ("Sydney, Brisbane, or Canberra", "Australia/Sydney"),
    "melbourne": ("Melbourne", "Australia/Melbourne"),
    "perth": ("Perth", "Australia/Perth"),
    "auckland": ("Auckland or Wellington", "Pacific/Auckland"),
    "johannesburg": ("Johannesburg or Cape Town", "Africa/Johannesburg"),
    "lagos": ("Lagos", "Africa/Lagos"),
    "cairo": ("Cairo", "Africa/Cairo"),
}

HOME = "seattle"


async def time_between(from_city: str, to_city: str) -> Shape:
    origin_label, target_label, now, there, hours = _times(from_city, to_city)
    target = _name(target_label)
    origin = _name(origin_label)
    zone = there.tzname() or CITIES[to_city][1]
    day = _day(now, there)
    business = 0 <= there.weekday() < 5 and 9 <= there.hour < 17
    return Panel(
        title=f"{target} {_difference(hours)}.",
        headline=_clock(there),
        caption="Time difference right now",
        tone="time",
        note=f"{there.strftime('%A')} in {target} · {zone}",
        chips=[
            {"label": day, "icon": "calendar"},
            {"label": f"{origin} {_clock(now)}", "icon": "pin"},
            {
                "label": "Business hours" if business else "Outside business hours",
                "icon": "briefcase",
            },
            {
                "label": f"{zone} · {'DST' if there.dst() else 'no DST'}",
                "icon": "clock",
            },
        ],
    )


async def preview_time(from_city: str, to_city: str) -> tuple[str, str]:
    _, _, _, there, hours = _times(from_city, to_city)
    return _clock(there), f"{there.strftime('%a')} · {_offset(hours)}"


def _times(from_city: str, to_city: str) -> tuple[str, str, datetime, datetime, float]:
    origin_label, origin_zone = CITIES[from_city]
    target_label, target_zone = CITIES[to_city]
    now = datetime.now(ZoneInfo(origin_zone))
    there = now.astimezone(ZoneInfo(target_zone))
    hours = (there.utcoffset() - now.utcoffset()).total_seconds() / 3600
    return origin_label, target_label, now, there, hours


def _clock(value: datetime) -> str:
    hour = value.hour % 12 or 12
    return f"{hour}:{value.minute:02d} {'AM' if value.hour < 12 else 'PM'}"


def _day(here: datetime, there: datetime) -> str:
    delta = (there.date() - here.date()).days
    if delta == 1:
        return "Tomorrow there"
    if delta == -1:
        return "Yesterday there"
    return "Same day"


def _name(label: str) -> str:
    """The spec line leads with the city people mean; everything after is an alias."""
    return label.split(" / ")[0].split(",")[0].split(" or ")[0].strip()


def _difference(hours: float) -> str:
    return f"is {_offset(hours)}" if hours else "is on the same clock"


def _offset(hours: float) -> str:
    if hours == 0:
        return "same time"
    amount = f"{hours:g}".lstrip("-")
    unit = "hour" if abs(hours) == 1 else "hours"
    return f"{amount} {unit} {'ahead' if hours > 0 else 'behind'}"


_PLACES = {key: label for key, (label, _) in CITIES.items()}

register(
    Capability(
        name="time_between",
        label="Time difference",
        criteria=(
            "The user wants a clock time somewhere else, or the time difference, "
            "time gap, or hours ahead or behind between two places."
        ),
        args={
            "from_city": Arg(
                question=(
                    "Which place does the text name as the starting side of the "
                    "comparison, the place the user is already in?"
                ),
                options=_PLACES,
                label="Somewhere else",
                default=HOME,
                # Only leave home when the text really says so. A default this
                # good is worth more than a confident-sounding guess.
                floor=0.9,
            ),
            "to_city": Arg(
                question="Which place does the user want the time for?",
                ask="Which place did you mean? Here’s the time in each.",
                options=_PLACES,
                label="Another place",
                required=True,
            ),
        },
        run=time_between,
        preview=preview_time,
        tone="time",
    )
)
