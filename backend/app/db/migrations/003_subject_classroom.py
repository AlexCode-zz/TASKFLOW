"""Migración 003: agrega el aula de la materia y retira créditos del modelo.

El campo `credits` deja de usarse en la aplicación y se reemplaza por
`classroom` (aula). La columna antigua se conserva en SQLite para no
perder información histórica, pero ya no forma parte del modelo.
"""

from sqlalchemy import text


def _columns(db) -> set:
    rows = db.execute(text("PRAGMA table_info(subjects)")).fetchall()
    return {row[1] for row in rows}


def up(db) -> None:
    """Agrega la columna classroom si no existe."""
    if "classroom" not in _columns(db):
        db.execute(text("ALTER TABLE subjects ADD COLUMN classroom VARCHAR(50)"))


def down(db) -> None:
    """No se elimina la columna para conservar datos existentes."""
    pass
