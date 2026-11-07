from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.exception_handler import add_exception_handlers
from app.db.migrations.manager import run_pending_migrations
from app.db.session import engine, Base

# Crear tablas en la base de datos SQLite (no recrea tablas existentes)
Base.metadata.create_all(bind=engine)

# Ejecutar migraciones pendientes de forma segura
run_pending_migrations()

app = FastAPI(
    title=settings.APP_NAME,
    description="Aplicación local de organización académica universitaria",
    version="1.0.0",
)

# CORS para el frontend local
cors_origins = [
    origin.strip() for origin in settings.BACKEND_CORS_ORIGINS.split(",") if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Manejadores de excepciones globales
add_exception_handlers(app)


@app.get("/health", tags=["Salud"])
def health():
    """Endpoint de comprobación de estado del backend."""
    return {"status": "ok", "service": settings.APP_NAME}


@app.get("/", tags=["Salud"])
def root():
    return {"message": "TaskFlow API - Fase 1"}


from app.api import api_router  # noqa: E402

app.include_router(api_router, prefix="/api")
