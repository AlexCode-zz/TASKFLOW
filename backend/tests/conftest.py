"""Configuración de pruebas para TaskFlow.

Utiliza una base de datos SQLite en archivo temporal para las pruebas,
sin afectar la base de datos real del estudiante.
"""

import os
from typing import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

# Importar session para que se registren todos los modelos en Base.metadata
from app.db.session import Base  # noqa: F401

# Base de datos de pruebas independiente
SQLALCHEMY_DATABASE_URL = "sqlite:///./tests/test_taskflow.db"


@pytest.fixture(scope="function")
def db_session() -> Generator:
    """Crea una sesión de base de datos limpia para cada prueba."""
    db_path = "./tests/test_taskflow.db"
    if os.path.exists(db_path):
        os.remove(db_path)

    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False},
    )

    # Activar claves foráneas
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys = ON")
        cursor.close()

    Base.metadata.create_all(bind=engine)
    session = sessionmaker(autocommit=False, autoflush=False, bind=engine)()

    yield session

    session.close()
    engine.dispose()
    if os.path.exists(db_path):
        os.remove(db_path)


@pytest.fixture(scope="function")
def client(db_session) -> Generator:
    """Crea un cliente de prueba de FastAPI con sobrescritura de dependencia."""
    from app.main import app
    from app.db.session import get_db

    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()
