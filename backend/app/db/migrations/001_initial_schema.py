"""Migración inicial: crea la tabla de seguimiento de migraciones.

Esta migración es un marcador. El esquema inicial se crea mediante
Base.metadata.create_all() en app/main.py.
"""

from sqlalchemy.orm import Session


def up(db: Session) -> None:
    """No hay cambios de esquema en esta migración inicial."""
    pass


def down(db: Session) -> None:
    """No hay cambios que revertir."""
    pass
