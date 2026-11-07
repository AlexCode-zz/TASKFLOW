from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.db.base import Base

# Importar todos los modelos para que SQLAlchemy registre las tablas en Base.metadata
from app.models import (  # noqa: F401
    Student,
    Subject,
    WeeklyAvailability,
    StudentPreference,
    ClassSchedule,
    Laboratory,
    Evaluation,
    Task,
    Project,
    Plan,
    PlanningSession,
)

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {},
)


# Activar claves foráneas en SQLite (requerido por cada conexión)
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if settings.DATABASE_URL.startswith("sqlite"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys = ON")
        cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
