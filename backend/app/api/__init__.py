from fastapi import APIRouter

api_router = APIRouter()

from app.api import students, subjects, availability, preferences  # noqa: E402

api_router.include_router(students.router)
api_router.include_router(subjects.router)
api_router.include_router(availability.router)
api_router.include_router(preferences.router)


@api_router.get("/events", tags=["Eventos"])
def list_events():
    """Devuelve los eventos de la semana (placeholder Fase 1)."""
    return []


@api_router.get("/health", tags=["Salud"])
def api_health():
    return {"status": "ok"}
