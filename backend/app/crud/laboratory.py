from sqlalchemy.orm import Session
from app.models.laboratory import Laboratory
from app.schemas.laboratory import LaboratoryCreate, LaboratoryUpdate

DEFAULT_LABORATORY_TITLE = "Laboratorio"


def get_laboratory(db: Session, laboratory_id: int):
    return db.query(Laboratory).filter(Laboratory.id == laboratory_id).first()


def get_laboratories_by_student(db: Session, student_id: int):
    return db.query(Laboratory).filter(Laboratory.student_id == student_id).all()


def get_laboratories_by_subject(db: Session, student_id: int, subject_id: int):
    return (
        db.query(Laboratory)
        .filter(Laboratory.student_id == student_id, Laboratory.subject_id == subject_id)
        .order_by(Laboratory.id)
        .all()
    )


def create_laboratory(db: Session, student_id: int, laboratory_in: LaboratoryCreate):
    data = laboratory_in.model_dump()
    if not data.get("title"):
        data["title"] = DEFAULT_LABORATORY_TITLE
    db_laboratory = Laboratory(**data, student_id=student_id)
    db.add(db_laboratory)
    db.commit()
    db.refresh(db_laboratory)
    return db_laboratory


def update_laboratory(db: Session, laboratory_id: int, laboratory_in: LaboratoryUpdate):
    db_laboratory = get_laboratory(db, laboratory_id)
    if not db_laboratory:
        return None
    update_data = laboratory_in.model_dump(exclude_unset=True)
    if "title" in update_data and not update_data["title"]:
        update_data["title"] = DEFAULT_LABORATORY_TITLE
    for field, value in update_data.items():
        setattr(db_laboratory, field, value)
    db.commit()
    db.refresh(db_laboratory)
    return db_laboratory


def delete_laboratory(db: Session, laboratory_id: int):
    db_laboratory = get_laboratory(db, laboratory_id)
    if not db_laboratory:
        return False
    db.delete(db_laboratory)
    db.commit()
    return True
