"""Migración 007: fechas de inicio y fin de materias y horarios.

- Agrega `start_date` y `end_date` opcionales a `subjects` (inicio/fin de la materia).
- Agrega `start_date` y `end_date` opcionales a `class_schedules` (rango de vigencia del horario).
"""

from sqlalchemy import text


def _columns(db, table: str) -> set:
    rows = db.execute(text(f"PRAGMA table_info({table})")).fetchall()
    return {row[1] for row in rows}


def up(db) -> None:
    """Agrega las columnas de fechas si no existen."""
    for table, columns in (
        ("subjects", ("start_date", "end_date")),
        ("class_schedules", ("start_date", "end_date")),
    ):
        existing = _columns(db, table)
        for column in columns:
            if column not in existing:
                db.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} DATE"))


def down(db) -> None:
    """No se revierte para conservar los datos registrados."""
    pass
