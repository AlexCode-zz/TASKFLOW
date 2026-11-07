from sqlalchemy.orm import Session
from app.models.weekly_availability import WeeklyAvailability
from app.schemas.weekly_availability import WeeklyAvailabilityCreate, WeeklyAvailabilityUpdate


def get_availability_by_student(db: Session, student_id: int):
    return db.query(WeeklyAvailability).filter(WeeklyAvailability.student_id == student_id).all()


def get_availability_by_day(db: Session, student_id: int, day_of_week: str):
    return (
        db.query(WeeklyAvailability)
        .filter(WeeklyAvailability.student_id == student_id, WeeklyAvailability.day_of_week == day_of_week)
        .first()
    )


def create_or_update_availability(db: Session, student_id: int, availability_in: WeeklyAvailabilityCreate):
    existing = get_availability_by_day(db, student_id, availability_in.day_of_week)
    if existing:
        for field, value in availability_in.model_dump(exclude_unset=True).items():
            setattr(existing, field, value)
        db.commit()
        db.refresh(existing)
        return existing
    db_availability = WeeklyAvailability(**availability_in.model_dump(), student_id=student_id)
    db.add(db_availability)
    db.commit()
    db.refresh(db_availability)
    return db_availability


def delete_availability_by_student(db: Session, student_id: int):
    db.query(WeeklyAvailability).filter(WeeklyAvailability.student_id == student_id).delete()
    db.commit()
