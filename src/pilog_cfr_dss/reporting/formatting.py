"""Pure presentation of numbers and recorded instants; no business calculation."""
from datetime import datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation, ROUND_CEILING, ROUND_FLOOR, localcontext


def number_text(value, *, minimum=False) -> str:
    """Show two Indonesian decimals, rounding down except for a required minimum."""
    try:
        value = Decimal(str(value))
        if not value.is_finite():
            return "—"
        with localcontext() as context:
            context.prec = max(context.prec, len(value.as_tuple().digits), value.adjusted() + 4)
            value = value.quantize(Decimal("0.01"), rounding=ROUND_CEILING if minimum else ROUND_FLOOR)
        return format(value, ",.2f").translate(str.maketrans({",": ".", ".": ","}))
    except (InvalidOperation, ValueError, TypeError):
        return "—"


def percent_text(value) -> str:
    try:
        value = Decimal(str(value))
        if not value.is_finite():
            return "—"
        with localcontext() as context:
            context.prec = max(context.prec, len(value.as_tuple().digits), value.adjusted() + 6)
            value = value.quantize(Decimal("0.0001"), rounding=ROUND_FLOOR)
        return format(value, ".2%").replace(".", ",")
    except (InvalidOperation, ValueError, TypeError):
        return "—"


def price_time(value) -> str:
    if not value:
        return "Tidak tersedia"
    try:
        instant = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        if instant.tzinfo is None:
            return str(value)
        return instant.astimezone(timezone(timedelta(hours=7))).strftime("%d %b %Y %H:%M:%S WIB")
    except (ValueError, TypeError):
        return str(value)
