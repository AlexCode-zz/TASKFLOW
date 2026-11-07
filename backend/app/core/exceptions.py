"""Excepciones personalizadas de TaskFlow."""

from typing import Any, Dict, Optional


class TaskFlowError(Exception):
    """Excepción base de TaskFlow."""

    def __init__(
        self,
        message: str,
        status_code: int = 500,
        error_code: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code or self.__class__.__name__
        self.details = details or {}
        super().__init__(self.message)


class ResourceNotFoundError(TaskFlowError):
    """Recurso no encontrado."""

    def __init__(self, resource: str, resource_id: Any = None):
        detail = f"{resource} no encontrado"
        if resource_id is not None:
            detail += f" (id: {resource_id})"
        super().__init__(
            message=detail,
            status_code=404,
            error_code="RESOURCE_NOT_FOUND",
            details={"resource": resource, "resource_id": str(resource_id) if resource_id else None},
        )


class ValidationError(TaskFlowError):
    """Error de validación de datos."""

    def __init__(self, message: str, field: Optional[str] = None):
        super().__init__(
            message=message,
            status_code=400,
            error_code="VALIDATION_ERROR",
            details={"field": field} if field else {},
        )


class DuplicateResourceError(TaskFlowError):
    """Recurso duplicado."""

    def __init__(self, resource: str, field: str, value: Any):
        super().__init__(
            message=f"Ya existe un {resource} con {field}='{value}'",
            status_code=409,
            error_code="DUPLICATE_RESOURCE",
            details={"resource": resource, "field": field, "value": str(value)},
        )


class ConflictError(TaskFlowError):
    """Conflicto de operación."""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=409,
            error_code="CONFLICT_ERROR",
            details=details or {},
        )


class DatabaseError(TaskFlowError):
    """Error de base de datos."""

    def __init__(self, message: str, original_error: Optional[Exception] = None):
        super().__init__(
            message=message,
            status_code=500,
            error_code="DATABASE_ERROR",
            details={"original": str(original_error)} if original_error else {},
        )
