from sqlalchemy.orm import Session
from app.models.subject import Subject
from app.schemas.subject import SubjectCreate, SubjectUpdate


def get_subject(db: Session, subject_id: int):
    return db.query(Subject).filter(Subject.id == subject_id).first()


def get_subjects_by_student(db: Session, student_id: int):
    return (
        db.query(Subject)
        .filter(Subject.student_id == student_id)
        .order_by(Subject.is_favorite.desc(), Subject.id)
        .all()
    )


def get_subject_by_code(db: Session, student_id: int, code: str):
    return (
        db.query(Subject)
        .filter(Subject.student_id == student_id, Subject.code == code)
        .first()
    )


def create_subject(db: Session, student_id: int, subject_in: SubjectCreate):
    db_subject = Subject(**subject_in.model_dump(), student_id=student_id)
    db.add(db_subject)
    db.commit()
    db.refresh(db_subject)
    return db_subject


def update_subject(db: Session, subject_id: int, subject_in: SubjectUpdate):
    db_subject = get_subject(db, subject_id)
    if not db_subject:
        return None
    update_data = subject_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_subject, field, value)
    db.commit()
    db.refresh(db_subject)
    return db_subject


def delete_subject(db: Session, subject_id: int):
    db_subject = get_subject(db, subject_id)
    if not db_subject:
        return False
    db.delete(db_subject)
    db.commit()
    return True
