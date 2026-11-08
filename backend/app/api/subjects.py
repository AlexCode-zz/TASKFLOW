from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.crud.student import get_latest_student
from app.crud.subject import (
    get_subjects_by_student,
    get_subject_by_code,
    create_subject,
    update_subject,
    delete_subject,
    get_subject,
)
from app.schemas.subject import SubjectCreate, SubjectUpdate, SubjectResponse
from app.schemas.academic import SubjectAcademicItemsResponse
from app.services.academic import ensure_subject_defaults, get_subject_academic_items

router = APIRouter(prefix="/subjects", tags=["Materias"])


def get_current_student(db: Session):
    student = get_latest_student(db)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró configuración de estudiante.",
        )
    return student


@router.get("/", response_model=List[SubjectResponse])
def list_subjects(db: Session = Depends(get_db)):
    """Lista todas las materias del estudiante."""
    student = get_current_student(db)
    return get_subjects_by_student(db, student.id)


@router.post("/", response_model=SubjectResponse, status_code=status.HTTP_201_CREATED)
def create_subject_endpoint(subject_in: SubjectCreate, db: Session = Depends(get_db)):
    """Crea una nueva materia."""
    student = get_current_student(db)

    # Validar código duplicado si se proporciona
    if subject_in.code:
        existing = get_subject_by_code(db, student.id, subject_in.code)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe una materia con el código '{subject_in.code}'.",
            )

    subject = create_subject(db, student.id, subject_in)
    # Cada materia nace con 4 parciales y 4 laboratorios vacíos.
    ensure_subject_defaults(db, student.id, subject.id)
    return subject


@router.get("/{subject_id}/academic-items", response_model=SubjectAcademicItemsResponse)
def get_subject_academic_items_endpoint(subject_id: int, db: Session = Depends(get_db)):
    """Devuelve parciales, laboratorios y promedio ponderado de una materia."""
    student = get_current_student(db)
    subject = get_subject(db, subject_id)
    if not subject or subject.student_id != student.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Materia no encontrada.",
        )
    return get_subject_academic_items(db, student.id, subject_id)


@router.get("/{subject_id}", response_model=SubjectResponse)
def get_subject_endpoint(subject_id: int, db: Session = Depends(get_db)):
    """Obtiene los detalles de una materia."""
    student = get_current_student(db)
    subject = get_subject(db, subject_id)
    if not subject or subject.student_id != student.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Materia no encontrada.",
        )
    return subject


@router.put("/{subject_id}", response_model=SubjectResponse)
def update_subject_endpoint(subject_id: int, subject_in: SubjectUpdate, db: Session = Depends(get_db)):
    """Actualiza una materia existente."""
    student = get_current_student(db)
    subject = get_subject(db, subject_id)
    if not subject or subject.student_id != student.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Materia no encontrada.",
        )

    # Validar código duplicado si se cambia
    if subject_in.code and subject_in.code != subject.code:
        existing = get_subject_by_code(db, student.id, subject_in.code)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe una materia con el código '{subject_in.code}'.",
            )

    return update_subject(db, subject_id, subject_in)


@router.delete("/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subject_endpoint(subject_id: int, db: Session = Depends(get_db)):
    """Elimina una materia."""
    student = get_current_student(db)
    subject = get_subject(db, subject_id)
    if not subject or subject.student_id != student.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Materia no encontrada.",
        )
    delete_subject(db, subject_id)
    return None
