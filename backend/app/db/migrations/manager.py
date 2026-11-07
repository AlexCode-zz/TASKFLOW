"""Gestor de migraciones de base de datos para SQLite.

Proporciona un sistema sencillo y seguro para actualizar el esquema
de SQLite sin perder los datos existentes. Cada migración es un archivo
Python con funciones `up()` y `down()` que se ejecutan dentro de una
transacción.
"""

import importlib
import logging
from pathlib import Path
from typing import List

from sqlalchemy import text

from app.db.session import engine

logger = logging.getLogger("taskflow.migrations")

MIGRATIONS_DIR = Path(__file__).parent


def _ensure_migrations_table(connection) -> None:
    """Crea la tabla de seguimiento de migraciones si no existe."""
    connection.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                migration_name TEXT NOT NULL UNIQUE,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
    )


def _get_applied_migrations(connection) -> List[str]:
    """Devuelve la lista de nombres de migraciones ya aplicadas."""
    result = connection.execute(text("SELECT migration_name FROM schema_migrations")).fetchall()
    return [row[0] for row in result]


def _record_migration(connection, migration_name: str) -> None:
    """Registra una migración como aplicada."""
    connection.execute(
        text("INSERT INTO schema_migrations (migration_name) VALUES (:name)"),
        {"name": migration_name},
    )


def _discover_migration_files() -> List[Path]:
    """Descubre archivos de migración ordenados por nombre."""
    files = sorted(MIGRATIONS_DIR.glob("*.py"))
    return [f for f in files if f.name not in ("__init__.py", "manager.py")]


def run_pending_migrations() -> None:
    """Ejecuta todas las migraciones pendientes dentro de transacciones."""
    with engine.begin() as connection:
        _ensure_migrations_table(connection)
        applied = _get_applied_migrations(connection)
        migration_files = _discover_migration_files()

        for migration_file in migration_files:
            migration_name = migration_file.stem
            if migration_name in applied:
                continue

            logger.info("Aplicando migración: %s", migration_name)

            module_name = f"app.db.migrations.{migration_name}"
            module = importlib.import_module(module_name)

            if not hasattr(module, "up") or not hasattr(module, "down"):
                logger.error(
                    "Migración %s no tiene funciones up()/down(). Saltando.",
                    migration_name,
                )
                continue

            try:
                module.up(connection)
                _record_migration(connection, migration_name)
                logger.info("Migración %s aplicada correctamente.", migration_name)
            except Exception as e:
                logger.error(
                    "Error aplicando migración %s: %s", migration_name, str(e)
                )
                raise


def get_migration_status() -> dict:
    """Devuelve el estado de las migraciones."""
    with engine.connect() as connection:
        _ensure_migrations_table(connection)
        applied = _get_applied_migrations(connection)
        migration_files = _discover_migration_files()

        return {
            "applied": applied,
            "pending": [f.stem for f in migration_files if f.stem not in applied],
            "total": len(migration_files),
        }
