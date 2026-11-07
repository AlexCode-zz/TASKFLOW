from fastapi import APIRouter

api_router = APIRouter()

from app.api import (  # noqa: E402
    students,
    subjects,
    availability,
    preferences,
    class_schedules,
    laboratories,
    evaluations,
    tasks,
    projects,
    planning,
    backup,
    ai,
)

api_router.include_router(students.router)
api_router.include_router(subjects.router)
api_router.include_router(availability.router)
api_router.include_router(preferences.router)
api_router.include_router(class_schedules.router)
api_router.include_router(laboratories.router)
api_router.include_router(evaluations.router)
api_router.include_router(tasks.router)
api_router.include_router(projects.router)
api_router.include_router(planning.router)
api_router.include_router(backup.router)
api_router.include_router(ai.router)


@api_router.get("/events", tags=["Eventos"])
def list_events():
    """Devuelve los eventos de la semana (placeholder Fase 1)."""
    return []


@api_router.get("/health", tags=["Salud"])
def api_health():
    return {"status": "ok"}
