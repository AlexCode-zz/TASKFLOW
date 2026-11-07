from sqlalchemy.orm import declarative_base

# Importar todos los modelos para que SQLAlchemy registre las tablas
from app.models import Student, Subject, WeeklyAvailability, StudentPreference  # noqa: F401

Base = declarative_base()
