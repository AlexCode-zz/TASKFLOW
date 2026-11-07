from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.crud.student import get_latest_student
from app.crud.evaluation import (
    get_evaluations_by_student,
    get_evaluations_by_subject,
    get_upcoming_evaluations,
    create_evaluation,
    update_evaluation,
    delete_evaluation,
    get_evaluation,
)
from app.schemas.evaluation import EvaluationCreate, EvaluationUpdate, EvaluationResponse

router = APIRouter(prefix="/evaluations", tags=["Evaluaciones"])


def get_current_student(db: Session):
    student = get_latest_student(db)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró configuración de estudiante.",
        )
    return student


@router.get("/", response_model=List[EvaluationResponse])
def list_evaluations(db: Session = Depends(get_db)):
    """Lista todas las evaluaciones del estudiante."""
    student = get_current_student(db)
    return get_evaluations_by_student(db, student.id)


@router.get("/upcoming", response_model=List[EvaluationResponse])
def list_upcoming_evaluations(db: Session = Depends(get_db)):
    """Lista las evaluaciones próximas (hoy en adelante)."""
    student = get_current_student(db)
    return get_upcoming_evaluations(db, student.id)


@router.get("/subject/{subject_id}", response_model=List[EvaluationResponse])
def list_evaluations_by_subject(subject_id: int, db: Session = Depends(get_db)):
    """Lista las evaluaciones de una materia específica."""
    student = get_current_student(db)
    return get_evaluations_by_subject(db, student.id, subject_id)


@router.post("/", response_model=EvaluationResponse, status_code=status.HTTP_201_CREATED)
def create_evaluation_endpoint(evaluation_in: EvaluationCreate, db: Session = Depends(get_db)):
    """Registra una nueva evaluación."""
    student = get_current_student(db)

    if evaluation_in.end_time and evaluation_in.start_time:
        if evaluation_in.end_time <= evaluation_in.start_time:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La hora de finalización debe ser posterior a la hora de inicio.",
            )

    return create_evaluation(db, student.id, evaluation_in)


@router.get("/{evaluation_id}", response_model=EvaluationResponse)
def get_evaluation_endpoint(evaluation_id: int, db: Session = Depends(get_db)):
    """Obtiene los detalles de una evaluación."""
    student = get_current_student(db)
    evaluation = get_evaluation(db, evaluation_id)
    if not evaluation or evaluation.student_id != student.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evaluación no encontrada.",
        )
    return evaluation


@router.put("/{evaluation_id}", response_model=EvaluationResponse)
def update_evaluation_endpoint(evaluation_id: int, evaluation_in: EvaluationUpdate, db: Session = Depends(get_db)):
    """Actualiza una evaluación existente."""
    student = get_current_student(db)
    evaluation = get_evaluation(db, evaluation_id)
    if not evaluation or evaluation.student_id != student.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evaluación no encontrada.",
        )

    start_time = evaluation_in.start_time or evaluation.start_time
    end_time = evaluation_in.end_time or evaluation.end_time
    if start_time and end_time and end_time <= start_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La hora de finalización debe ser posterior a la hora de inicio.",
        )

    return update_evaluation(db, evaluation_id, evaluation_in)


@router.delete("/{evaluation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_evaluation_endpoint(evaluation_id: int, db: Session = Depends(get_db)):
    """Elimina una evaluación."""
    student = get_current_student(db)
    evaluation = get_evaluation(db, evaluation_id)
    if not evaluation or evaluation.student_id != student.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evaluación no encontrada.",
        )
    delete_evaluation(db, evaluation_id)
    return None
