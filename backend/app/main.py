from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.session import engine, Base

# Crear tablas en la base de datos SQLite
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.APP_NAME,
    description="Aplicación local de organización académica universitaria",
    version="1.0.0",
)

# CORS para el frontend local
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.BACKEND_CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["Salud"])
def health():
    """Endpoint de comprobación de estado del backend."""
    return {"status": "ok", "service": settings.APP_NAME}


@app.get("/", tags=["Salud"])
def root():
    return {"message": "TaskFlow API - Fase 1"}


from app.api import api_router  # noqa: E402

app.include_router(api_router, prefix="/api")
