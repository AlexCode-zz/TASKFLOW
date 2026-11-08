"""Migración 005: agrega la marca de materia fijada/favorita.

`is_favorite` permite que una materia aparezca primero en la lista.
Las materias existentes quedan como no favoritas.
"""

from sqlalchemy import text


def _columns(db) -> set:
    rows = db.execute(text("PRAGMA table_info(subjects)")).fetchall()
    return {row[1] for row in rows}


def up(db) -> None:
    """Agrega la columna is_favorite si no existe."""
    if "is_favorite" not in _columns(db):
        db.execute(
            text("ALTER TABLE subjects ADD COLUMN is_favorite BOOLEAN NOT NULL DEFAULT 0")
        )


def down(db) -> None:
    """No se elimina la columna para conservar datos existentes."""
    pass
