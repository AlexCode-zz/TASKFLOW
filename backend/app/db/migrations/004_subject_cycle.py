"""Migración 004: agrega el ciclo académico de la materia.

El campo `cycle` indica el ciclo o semestre al que pertenece la materia
(1, 2, 3, ...). Es opcional para no afectar registros existentes.
"""

from sqlalchemy import text


def _columns(db) -> set:
    rows = db.execute(text("PRAGMA table_info(subjects)")).fetchall()
    return {row[1] for row in rows}


def up(db) -> None:
    """Agrega la columna cycle si no existe."""
    if "cycle" not in _columns(db):
        db.execute(text("ALTER TABLE subjects ADD COLUMN cycle INTEGER"))


def down(db) -> None:
    """No se elimina la columna para conservar datos existentes."""
    pass
