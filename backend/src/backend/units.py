"""Curated unit taxonomy that drives the convert card's dropdowns.

pint can convert almost anything, but it cannot tell you which units a person
would plausibly want side by side. That judgement is authored here, then served
to the UI so the frontend never has to duplicate it.
"""

from __future__ import annotations

from typing import Any

Unit = dict[str, str]
Category = dict[str, Any]


def _u(unit_id: str, label: str, symbol: str, *aliases: str) -> Unit:
    return {"id": unit_id, "label": label, "symbol": symbol, "aliases": " ".join(aliases)}


CURRENCIES: list[Unit] = [
    _u("USD", "US dollar", "$"),
    _u("EUR", "Euro", "€"),
    _u("GBP", "British pound", "£"),
    _u("JPY", "Japanese yen", "¥"),
    _u("INR", "Indian rupee", "₹"),
    _u("CAD", "Canadian dollar", "CA$"),
    _u("AUD", "Australian dollar", "A$"),
    _u("CHF", "Swiss franc", "CHF"),
    _u("CNY", "Chinese yuan", "CN¥"),
    _u("MXN", "Mexican peso", "MX$"),
    _u("BRL", "Brazilian real", "R$"),
    _u("SGD", "Singapore dollar", "S$"),
    _u("HKD", "Hong Kong dollar", "HK$"),
    _u("NZD", "New Zealand dollar", "NZ$"),
    _u("SEK", "Swedish krona", "kr"),
    _u("NOK", "Norwegian krone", "kr"),
    _u("DKK", "Danish krone", "kr"),
    _u("PLN", "Polish zloty", "zł"),
    _u("ZAR", "South African rand", "R"),
    _u("AED", "UAE dirham", "AED"),
    _u("KRW", "South Korean won", "₩"),
    _u("THB", "Thai baht", "฿"),
]

CATEGORIES: list[Category] = [
    {
        "id": "currency",
        "label": "Currency",
        "kind": "currency",
        "units": CURRENCIES,
    },
    {
        "id": "temperature",
        "label": "Temperature",
        "kind": "unit",
        "units": [
            _u("degC", "Celsius", "°C", "c", "celsius", "centigrade", "°c"),
            _u("degF", "Fahrenheit", "°F", "f", "fahrenheit", "°f"),
            _u("kelvin", "Kelvin", "K", "k"),
            _u("degR", "Rankine", "°R", "rankine"),
        ],
    },
    {
        "id": "length",
        "label": "Length",
        "kind": "unit",
        "units": [
            _u("millimeter", "Millimeter", "mm", "millimetre", "millimeters"),
            _u("centimeter", "Centimeter", "cm", "centimetre", "centimeters"),
            _u("meter", "Meter", "m", "metre", "meters"),
            _u("kilometer", "Kilometer", "km", "kilometre", "kilometers"),
            _u("inch", "Inch", "in", "inches", '"'),
            _u("foot", "Foot", "ft", "feet"),
            _u("yard", "Yard", "yd", "yards"),
            _u("mile", "Mile", "mi", "miles"),
            _u("nautical_mile", "Nautical mile", "nmi", "nautical miles"),
        ],
    },
    {
        "id": "mass",
        "label": "Mass",
        "kind": "unit",
        "units": [
            _u("milligram", "Milligram", "mg", "milligrams"),
            _u("gram", "Gram", "g", "grams"),
            _u("kilogram", "Kilogram", "kg", "kilos", "kilograms"),
            _u("metric_ton", "Metric ton", "t", "tonne", "tonnes"),
            _u("ounce", "Ounce", "oz", "ounces"),
            _u("pound", "Pound", "lb", "lbs", "pounds"),
            _u("stone", "Stone", "st", "stones"),
        ],
    },
    {
        "id": "volume",
        "label": "Volume",
        "kind": "unit",
        "units": [
            _u("milliliter", "Milliliter", "ml", "millilitre", "milliliters"),
            _u("liter", "Liter", "L", "l", "litre", "liters"),
            _u("teaspoon", "Teaspoon", "tsp", "teaspoons"),
            _u("tablespoon", "Tablespoon", "tbsp", "tablespoons"),
            _u("cup", "Cup", "cup", "cups"),
            _u("pint", "Pint", "pt", "pints"),
            _u("quart", "Quart", "qt", "quarts"),
            _u("gallon", "Gallon", "gal", "gallons"),
            _u("cubic_meter", "Cubic meter", "m³", "m3"),
        ],
    },
    {
        "id": "speed",
        "label": "Speed",
        "kind": "unit",
        "units": [
            _u("meter/second", "Meters per second", "m/s", "mps"),
            _u("kilometer/hour", "Kilometers per hour", "km/h", "kph", "kmh"),
            _u("mile/hour", "Miles per hour", "mph"),
            _u("foot/second", "Feet per second", "ft/s", "fps"),
            _u("knot", "Knot", "kn", "knots"),
        ],
    },
    {
        "id": "area",
        "label": "Area",
        "kind": "unit",
        "units": [
            _u("centimeter**2", "Square centimeter", "cm²", "cm2"),
            _u("meter**2", "Square meter", "m²", "m2", "sqm"),
            _u("kilometer**2", "Square kilometer", "km²", "km2"),
            _u("foot**2", "Square foot", "ft²", "ft2", "sqft"),
            _u("yard**2", "Square yard", "yd²", "yd2"),
            _u("acre", "Acre", "ac", "acres"),
            _u("hectare", "Hectare", "ha", "hectares"),
            _u("mile**2", "Square mile", "mi²", "mi2"),
        ],
    },
    {
        "id": "time",
        "label": "Time",
        "kind": "unit",
        "units": [
            _u("millisecond", "Millisecond", "ms", "milliseconds"),
            _u("second", "Second", "s", "sec", "secs", "seconds"),
            _u("minute", "Minute", "min", "mins", "minutes"),
            _u("hour", "Hour", "h", "hr", "hrs", "hours"),
            _u("day", "Day", "d", "days"),
            _u("week", "Week", "wk", "weeks"),
            _u("month", "Month", "mo", "months"),
            _u("year", "Year", "yr", "years"),
        ],
    },
    {
        "id": "data",
        "label": "Digital storage",
        "kind": "unit",
        "units": [
            _u("bit", "Bit", "b", "bits"),
            _u("byte", "Byte", "B", "bytes"),
            _u("kilobyte", "Kilobyte", "kB", "kb"),
            _u("megabyte", "Megabyte", "MB", "mb"),
            _u("gigabyte", "Gigabyte", "GB", "gb"),
            _u("terabyte", "Terabyte", "TB", "tb"),
            _u("kibibyte", "Kibibyte", "KiB"),
            _u("mebibyte", "Mebibyte", "MiB"),
            _u("gibibyte", "Gibibyte", "GiB"),
        ],
    },
    {
        "id": "energy",
        "label": "Energy",
        "kind": "unit",
        "units": [
            _u("joule", "Joule", "J", "joules"),
            _u("kilojoule", "Kilojoule", "kJ"),
            _u("calorie", "Calorie", "cal", "calories"),
            _u("kilocalorie", "Kilocalorie", "kcal", "Cal"),
            _u("watt_hour", "Watt hour", "Wh"),
            _u("kilowatt_hour", "Kilowatt hour", "kWh"),
            _u("British_thermal_unit", "BTU", "BTU", "btu"),
        ],
    },
    {
        "id": "power",
        "label": "Power",
        "kind": "unit",
        "units": [
            _u("watt", "Watt", "W", "watts"),
            _u("kilowatt", "Kilowatt", "kW"),
            _u("megawatt", "Megawatt", "MW"),
            _u("horsepower", "Horsepower", "hp"),
        ],
    },
    {
        "id": "pressure",
        "label": "Pressure",
        "kind": "unit",
        "units": [
            _u("pascal", "Pascal", "Pa"),
            _u("kilopascal", "Kilopascal", "kPa"),
            _u("bar", "Bar", "bar"),
            _u("atmosphere", "Atmosphere", "atm"),
            _u("psi", "Pound per square inch", "psi"),
            _u("mmHg", "Millimeter of mercury", "mmHg", "torr"),
        ],
    },
    {
        "id": "angle",
        "label": "Angle",
        "kind": "unit",
        "units": [
            _u("degree", "Degree", "°", "deg", "degrees"),
            _u("radian", "Radian", "rad", "radians"),
            _u("gradian", "Gradian", "grad"),
            _u("turn", "Turn", "turn", "revolution"),
            _u("arcminute", "Arcminute", "'"),
            _u("arcsecond", "Arcsecond", '"'),
        ],
    },
    {
        "id": "frequency",
        "label": "Frequency",
        "kind": "unit",
        "units": [
            _u("hertz", "Hertz", "Hz", "hz"),
            _u("kilohertz", "Kilohertz", "kHz"),
            _u("megahertz", "Megahertz", "MHz"),
            _u("gigahertz", "Gigahertz", "GHz"),
            _u("rpm", "Revolutions per minute", "rpm"),
        ],
    },
    {
        "id": "force",
        "label": "Force",
        "kind": "unit",
        "units": [
            _u("newton", "Newton", "N", "newtons"),
            _u("kilonewton", "Kilonewton", "kN"),
            _u("force_pound", "Pound-force", "lbf"),
            _u("force_kilogram", "Kilogram-force", "kgf"),
            _u("dyne", "Dyne", "dyn"),
        ],
    },
]


def _index() -> dict[str, tuple[str, str]]:
    """Map every spelling we accept onto (category id, canonical unit id)."""
    table: dict[str, tuple[str, str]] = {}
    for category in CATEGORIES:
        for unit in category["units"]:
            keys = [unit["id"], unit["label"], unit["symbol"], *unit["aliases"].split()]
            for key in keys:
                normalized = key.strip().lower()
                if normalized and normalized not in table:
                    table[normalized] = (category["id"], unit["id"])
    return table


_LOOKUP = _index()


def resolve(unit: str | None) -> tuple[str, str] | None:
    """Return (category id, canonical unit id) for a loosely written unit."""
    if not unit:
        return None
    probe = str(unit).strip().lower()
    for candidate in (probe, probe.rstrip("s"), probe.replace(" ", "_"), probe.lstrip("°")):
        hit = _LOOKUP.get(candidate)
        if hit:
            return hit
    return None


def catalog() -> list[Category]:
    """The taxonomy as the UI consumes it, without the alias noise."""
    return [
        {
            "id": category["id"],
            "label": category["label"],
            "kind": category["kind"],
            "units": [
                {"id": unit["id"], "label": unit["label"], "symbol": unit["symbol"]}
                for unit in category["units"]
            ],
        }
        for category in CATEGORIES
    ]
