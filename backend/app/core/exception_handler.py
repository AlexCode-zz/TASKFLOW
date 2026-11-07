"""Manejador global de excepciones para TaskFlow.

Centraliza el tratamiento de errores del backend para devolver
respuestas HTTP coherentes y no exponer trazas internas al usuario.
"""

import logging
from typing import Any, Dict

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError, IntegrityError

from app.core.exceptions import TaskFlowError

logger = logging.getLogger("taskflow")


def _error_response(
    status_code: int,
    message: str,
    error_code: str,
    details: Dict[str, Any] = None,
) -> JSONResponse:
    """Construye una respuesta de error JSON estandarizada."""
    content = {
        "error": True,
        "message": message,
        "error_code": error_code,
    }
    if details:
        content["details"] = details
    return JSONResponse(status_code=status_code, content=content)


def add_exception_handlers(app: FastAPI) -> None:
    """Registra los manejadores de excepción en la aplicación FastAPI."""

    @app.exception_handler(TaskFlowError)
    async def taskflow_error_handler(request: Request, exc: TaskFlowError):
        logger.warning(
            "TaskFlowError: %s (code=%s, status=%d)",
            exc.message,
            exc.error_code,
            exc.status_code,
        )
        return _error_response(
            status_code=exc.status_code,
            message=exc.message,
            error_code=exc.error_code,
            details=exc.details,
        )

    @app.exception_handler(SQLAlchemyError)
    async def sqlalchemy_error_handler(request: Request, exc: SQLAlchemyError):
        logger.error(
            "SQLAlchemyError: %s", str(exc), exc_info=True
        )
        return _error_response(
            status_code=500,
            message="Error interno de base de datos.",
            error_code="DATABASE_ERROR",
        )

    @app.exception_handler(IntegrityError)
    async def integrity_error_handler(request: Request, exc: IntegrityError):
        logger.warning(
            "IntegrityError: %s", str(exc), exc_info=True
        )
        return _error_response(
            status_code=409,
            message="Violación de integridad de datos.",
            error_code="INTEGRITY_ERROR",
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.error(
            "Unhandled exception: %s", str(exc), exc_info=True
        )
        return _error_response(
            status_code=500,
            message="Error interno del servidor.",
            error_code="INTERNAL_SERVER_ERROR",
        )
