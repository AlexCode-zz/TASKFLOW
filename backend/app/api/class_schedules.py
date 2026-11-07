from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.crud.student import get_latest_student
from app.crud.class_schedule import (
    get_class_schedules_by_student,
    get_class_schedules_by_subject,
    get_class_schedule_by_day,
    create_class_schedule,
    update_class_schedule,
    delete_class_schedule,
    get_class_schedule,
)
from app.schemas.class_schedule import ClassScheduleCreate, ClassScheduleUpdate, ClassScheduleResponse

router = APIRouter(prefix="/class-schedules", tags=["Horarios de clases"])


def get_current_student(db: Session):
    student = get_latest_student(db)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró configuración de estudiante.",
        )
    return student


@router.get("/", response_model=List[ClassScheduleResponse])
def list_class_schedules(db: Session = Depends(get_db)):
    """Lista todos los horarios de clases del estudiante."""
    student = get_current_student(db)
    return get_class_schedules_by_student(db, student.id)


@router.get("/subject/{subject_id}", response_model=List[ClassScheduleResponse])
def list_class_schedules_by_subject(subject_id: int, db: Session = Depends(get_db)):
    """Lista los horarios de clases de una materia específica."""
    student = get_current_student(db)
    return get_class_schedules_by_subject(db, student.id, subject_id)


@router.get("/day/{day_of_week}", response_model=List[ClassScheduleResponse])
def list_class_schedules_by_day(day_of_week: str, db: Session = Depends(get_db)):
    """Lista los horarios de clases de un día específico."""
    student = get_current_student(db)
    return get_class_schedule_by_day(db, student.id, day_of_week)


@router.post("/", response_model=ClassScheduleResponse, status_code=status.HTTP_201_CREATED)
def create_class_schedule_endpoint(schedule_in: ClassScheduleCreate, db: Session = Depends(get_db)):
    """Registra un nuevo horario de clase."""
    student = get_current_student(db)

    # Validar que la hora de fin sea posterior a la de inicio
    if schedule_in.end_time <= schedule_in.start_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La hora de finalización debe ser posterior a la hora de inicio.",
        )

    return create_class_schedule(db, student.id, schedule_in)


@router.get("/{schedule_id}", response_model=ClassScheduleResponse)
def get_class_schedule_endpoint(schedule_id: int, db: Session = Depends(get_db)):
    """Obtiene los detalles de un horario de clase."""
    student = get_current_student(db)
    schedule = get_class_schedule(db, schedule_id)
    if not schedule or schedule.student_id != student.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Horario de clase no encontrado.",
        )
    return schedule


@router.put("/{schedule_id}", response_model=ClassScheduleResponse)
def update_class_schedule_endpoint(schedule_id: int, schedule_in: ClassScheduleUpdate, db: Session = Depends(get_db)):
    """Actualiza un horario de clase existente."""
    student = get_current_student(db)
    schedule = get_class_schedule(db, schedule_id)
    if not schedule or schedule.student_id != student.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Horario de clase no encontrado.",
        )

    start_time = schedule_in.start_time or schedule.start_time
    end_time = schedule_in.end_time or schedule.end_time
    if end_time <= start_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La hora de finalización debe ser posterior a la hora de inicio.",
        )

    return update_class_schedule(db, schedule_id, schedule_in)


@router.delete("/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_class_schedule_endpoint(schedule_id: int, db: Session = Depends(get_db)):
    """Elimina un horario de clase."""
    student = get_current_student(db)
    schedule = get_class_schedule(db, schedule_id)
    if not schedule or schedule.student_id != student.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Horario de clase no encontrado.",
        )
    delete_class_schedule(db, schedule_id)
    return None
