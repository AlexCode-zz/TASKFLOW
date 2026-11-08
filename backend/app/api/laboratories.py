from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.crud.student import get_latest_student
from app.crud.laboratory import (
    get_laboratories_by_student,
    get_laboratories_by_subject,
    create_laboratory,
    update_laboratory,
    delete_laboratory,
    get_laboratory,
)
from app.schemas.laboratory import LaboratoryCreate, LaboratoryUpdate, LaboratoryResponse

router = APIRouter(prefix="/laboratories", tags=["Laboratorios"])


def get_current_student(db: Session):
    student = get_latest_student(db)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró configuración de estudiante.",
        )
    return student


@router.get("/", response_model=List[LaboratoryResponse])
def list_laboratories(db: Session = Depends(get_db)):
    """Lista todos los laboratorios del estudiante."""
    student = get_current_student(db)
    return get_laboratories_by_student(db, student.id)


@router.get("/subject/{subject_id}", response_model=List[LaboratoryResponse])
def list_laboratories_by_subject(subject_id: int, db: Session = Depends(get_db)):
    """Lista los laboratorios de una materia específica."""
    student = get_current_student(db)
    return get_laboratories_by_subject(db, student.id, subject_id)


@router.post("/", response_model=LaboratoryResponse, status_code=status.HTTP_201_CREATED)
def create_laboratory_endpoint(laboratory_in: LaboratoryCreate, db: Session = Depends(get_db)):
    """Registra un nuevo laboratorio."""
    student = get_current_student(db)

    if (
        laboratory_in.start_time
        and laboratory_in.end_time
        and laboratory_in.end_time <= laboratory_in.start_time
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La hora de finalización debe ser posterior a la hora de inicio.",
        )

    return create_laboratory(db, student.id, laboratory_in)


@router.get("/{laboratory_id}", response_model=LaboratoryResponse)
def get_laboratory_endpoint(laboratory_id: int, db: Session = Depends(get_db)):
    """Obtiene los detalles de un laboratorio."""
    student = get_current_student(db)
    laboratory = get_laboratory(db, laboratory_id)
    if not laboratory or laboratory.student_id != student.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Laboratorio no encontrado.",
        )
    return laboratory


@router.put("/{laboratory_id}", response_model=LaboratoryResponse)
def update_laboratory_endpoint(laboratory_id: int, laboratory_in: LaboratoryUpdate, db: Session = Depends(get_db)):
    """Actualiza un laboratorio existente."""
    student = get_current_student(db)
    laboratory = get_laboratory(db, laboratory_id)
    if not laboratory or laboratory.student_id != student.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Laboratorio no encontrado.",
        )

    start_time = laboratory_in.start_time or laboratory.start_time
    end_time = laboratory_in.end_time or laboratory.end_time
    if start_time and end_time and end_time <= start_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La hora de finalización debe ser posterior a la hora de inicio.",
        )

    return update_laboratory(db, laboratory_id, laboratory_in)


@router.delete("/{laboratory_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_laboratory_endpoint(laboratory_id: int, db: Session = Depends(get_db)):
    """Elimina un laboratorio."""
    student = get_current_student(db)
    laboratory = get_laboratory(db, laboratory_id)
    if not laboratory or laboratory.student_id != student.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Laboratorio no encontrado.",
        )
    delete_laboratory(db, laboratory_id)
    return None
