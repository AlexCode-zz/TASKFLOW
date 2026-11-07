from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.crud.student import get_latest_student
from app.crud.student_preference import (
    get_preference_by_student,
    create_or_update_preference,
)
from app.schemas.student_preference import (
    StudentPreferenceCreate,
    StudentPreferenceUpdate,
    StudentPreferenceResponse,
)

router = APIRouter(prefix="/preferences", tags=["Preferencias de planificación"])


def get_current_student(db: Session):
    student = get_latest_student(db)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró configururación de estudiante.",
        )
    return student


@router.get("/", response_model=StudentPreferenceResponse)
def get_preferences(db: Session = Depends(get_db)):
    """Obtiene las preferencias de planificación del estudiante."""
    student = get_current_student(db)
    preference = get_preference_by_student(db, student.id)
    if not preference:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontraron preferencias configuradas.",
        )
    return preference


@router.post("/", response_model=StudentPreferenceResponse, status_code=status.HTTP_201_CREATED)
def create_preferences(preference_in: StudentPreferenceCreate, db: Session = Depends(get_db)):
    """Crea o actualiza las preferencias de planificación."""
    student = get_current_student(db)
    return create_or_update_preference(db, student.id, preference_in)


@router.put("/", response_model=StudentPreferenceResponse)
def update_preferences(preference_in: StudentPreferenceUpdate, db: Session = Depends(get_db)):
    """Actualiza las preferencias existentes."""
    student = get_current_student(db)
    existing = get_preference_by_student(db, student.id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontraron preferencias configuradas.",
        )
    return create_or_update_preference(db, student.id, preference_in)
