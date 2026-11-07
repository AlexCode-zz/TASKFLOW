from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.crud.student import (
    get_latest_student,
    get_configured_student,
    create_or_update_student,
    update_student,
    mark_configured,
)
from app.schemas.student import (
    StudentCreate,
    StudentUpdate,
    StudentResponse,
    ConfigurationStatus,
)

router = APIRouter(prefix="/students", tags=["Configuración del estudiante"])


@router.get("/configuration-status", response_model=ConfigurationStatus)
def configuration_status(db: Session = Depends(get_db)):
    """Verifica si el estudiante ya completó la configuración inicial."""
    student = get_configured_student(db)
    return {"is_configured": student is not None}


@router.post("/", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
def create_or_update_student_endpoint(student_in: StudentCreate, db: Session = Depends(get_db)):
    """Crea el perfil académico del estudiante, o lo actualiza si ya existe."""
    return create_or_update_student(db, student_in)


@router.get("/me", response_model=StudentResponse)
def get_my_profile(db: Session = Depends(get_db)):
    """Obtiene el perfil del estudiante (configurado o en proceso de configuración)."""
    student = get_latest_student(db)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró configuración de estudiante. Complete el asistente inicial.",
        )
    return student


@router.put("/me", response_model=StudentResponse)
def update_my_profile(student_in: StudentUpdate, db: Session = Depends(get_db)):
    """Actualiza el perfil del estudiante."""
    student = get_latest_student(db)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró configuración de estudiante.",
        )
    return update_student(db, student.id, student_in)


@router.post("/me/complete", response_model=StudentResponse)
def complete_configuration(db: Session = Depends(get_db)):
    """Marca la configuración inicial como completada."""
    student = get_latest_student(db)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró configuración de estudiante.",
        )
    return mark_configured(db, student.id)
