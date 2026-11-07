"""Endpoints de respaldo y restauración de datos académicos."""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
import json
import tempfile
import os

from app.db.session import get_db
from app.crud.student import get_latest_student
from app.services.backup import (
    export_student_data,
    validate_backup_structure,
    import_student_data,
)

router = APIRouter(prefix="/backup", tags=["Respaldo y restauración"])


def get_current_student(db: Session):
    student = get_latest_student(db)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró configuración de estudiante.",
        )
    return student


@router.get("/export")
def export_backup(db: Session = Depends(get_db)):
    """Exporta todos los datos académicos a un archivo JSON descargable."""
    student = get_current_student(db)

    data = export_student_data(db, student.id)

    return JSONResponse(
        content=data,
        headers={
            "Content-Disposition": f'attachment; filename="taskflow_backup_{student.id}.json"',
        },
    )


@router.post("/import")
def import_backup(
    file: UploadFile = File(...),
    overwrite: bool = False,
    db: Session = Depends(get_db),
):
    """Importa datos académicos desde un archivo JSON de respaldo.

    Args:
        file: Archivo JSON con los datos de respaldo.
        overwrite: Si True, sobrescribe datos existentes.
    """
    student = get_current_student(db)

    # Validar tipo de archivo
    if not file.filename or not file.filename.endswith(".json"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo debe ser un JSON válido (.json).",
        )

    # Leer y parsear el archivo
    try:
        contents = file.file.read()
        data = json.loads(contents)
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Archivo JSON inválido: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al leer el archivo: {str(e)}",
        )

    # Validar estructura
    errors = validate_backup_structure(data)
    if errors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Estructura de respaldo inválida: {'; '.join(errors)}",
        )

    # Importar datos
    try:
        summary = import_student_data(db, data, overwrite=overwrite)
        return {
            "success": True,
            "message": "Respaldo importado correctamente.",
            "summary": summary,
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al importar respaldo: {str(e)}",
        )


@router.post("/validate")
def validate_backup(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Valida la estructura de un archivo de respaldo sin importarlo."""
    if not file.filename or not file.filename.endswith(".json"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo debe ser un JSON válido (.json).",
        )

    try:
        contents = file.file.read()
        data = json.loads(contents)
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Archivo JSON inválido: {str(e)}",
        )

    errors = validate_backup_structure(data)

    return {
        "valid": len(errors) == 0,
        "errors": errors,
    }
