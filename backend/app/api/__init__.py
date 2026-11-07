from fastapi import APIRouter

api_router = APIRouter()


@api_router.get("/events", tags=["Eventos"])
def list_events():
    """Devuelve los eventos de la semana (placeholder Fase 1)."""
    return []


@api_router.get("/health", tags=["Salud"])
def api_health():
    return {"status": "ok"}
