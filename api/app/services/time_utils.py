"""Fechas hacia el cliente: siempre ISO 8601 en UTC con zona explícita ("...Z").

La base guarda datetimes *naive* en UTC (datetime.utcnow). Serializarlos con .isoformat()
produce "2026-10-05T06:10:35.575528" sin zona, y los navegadores/apps los interpretan como
hora local (en México salían 6 h corridos).
"""

from datetime import datetime, timezone


def utc_iso(dt: datetime | None) -> str | None:
    """datetime (naive = UTC) → "2026-10-05T06:10:35.575Z". None → None."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
