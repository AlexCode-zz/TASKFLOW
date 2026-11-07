from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.crud.student import get_configured_student
from app.crud.weekly_availability import (
    get_availability_by_student,
    create_or_update_availability,
    delete_availability_by_student,
)
from app.schemas.weekly_availability import (
    WeeklyAvailabilityCreate,
    WeeklyAvailabilityUpdate,
    WeeklyAvailabilityResponse,
    WeeklyAvailabilitySet,
)

router = APIRouter(prefix="/availability", tags=["Disponibilidad semanal"])


def get_current_student(db: Session):
    student = get_configured_student(db)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró configuración de estudiante.",
        )
    return student


@router.get("/", response_model=List[WeeklyAvailabilityResponse])
def list_availability(db: Session = Depends(get_db)):
    """Lista la disponibilidad semanal del estudiante."""
    student = get_current_student(db)
    return get_availability_by_student(db, student.id)


@router.post("/", response_model=WeeklyAvailabilityResponse)
def set_availability_day(availability_in: WeeklyAvailabilityCreate, db: Session = Depends(get_db)):
    """Configura o actualiza la disponibilidad de un día específico."""
    student = get_current_student(db)

    # Validar que si hay hora de fin, sea posterior a la de inicio
    if availability_in.start_time and availability_in.end_time:
        if availability_in.end_time <= availability_in.start_time:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La hora de finalización debe ser posterior a la hora de inicio.",
            )

    return create_or_update_availability(db, student.id, availability_in)


@router.put("/{day_of_week}", response_model=WeeklyAvailabilityResponse)
def update_availability_day(
    day_of_week: str, availability_in: WeeklyAvailabilityUpdate, db: Session = Depends(get_db)
):
    """Actualiza la disponibilidad de un día."""
    student = get_current_student(db)
    from app.crud.weekly_availability import get_availability_by_day
    existing = get_availability_by_day(db, student.id, day_of_week)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No hay disponibilidad registrada para {day_of_week}.",
        )

    update_data = availability_in.model_dump(exclude_unset=True)
    start_time = update_data.get("start_time", existing.start_time)
    end_time = update_data.get("end_time", existing.end_time)

    if start_time and end_time and end_time <= start_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La hora de finalización debe ser posterior a la hora de inicio.",
        )

    for field, value in update_data.items():
        setattr(existing, field, value)
    db.commit()
    db.refresh(existing)
    return existing


@router.post("/set-all", response_model=List[WeeklyAvailabilityResponse])
def set_all_availability(
    availability_set: WeeklyAvailabilitySet, db: Session = Depends(get_db)
):
    """Configura la disponibilidad de todos los días de la semana."""
    student = get_current_student(db)
    delete_availability_by_student(db, student.id)

    results = []
    for availability_in in availability_set.availability:
        if availability_in.start_time and availability_in.end_time:
            if availability_in.end_time <= availability_in.start_time:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Hora de finalización inválida para {availability_in.day_of_week}.",
                )
        result = create_or_update_availability(db, student.id, availability_in)
        results.append(result)
    return results
