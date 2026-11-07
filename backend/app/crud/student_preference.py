from sqlalchemy.orm import Session
from app.models.student_preference import StudentPreference
from app.schemas.student_preference import StudentPreferenceCreate, StudentPreferenceUpdate


def get_preference_by_student(db: Session, student_id: int):
    return (
        db.query(StudentPreference)
        .filter(StudentPreference.student_id == student_id)
        .first()
    )


def create_or_update_preference(db: Session, student_id: int, preference_in: StudentPreferenceCreate):
    existing = get_preference_by_student(db, student_id)
    if existing:
        for field, value in preference_in.model_dump(exclude_unset=True).items():
            setattr(existing, field, value)
        db.commit()
        db.refresh(existing)
        return existing
    db_preference = StudentPreference(**preference_in.model_dump(), student_id=student_id)
    db.add(db_preference)
    db.commit()
    db.refresh(db_preference)
    return db_preference
