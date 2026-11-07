from sqlalchemy.orm import Session
from app.models.student import Student
from app.schemas.student import StudentCreate, StudentUpdate


def get_student(db: Session, student_id: int):
    return db.query(Student).filter(Student.id == student_id).first()


def get_student_by_id(db: Session, student_id: int):
    return get_student(db, student_id)


def get_configured_student(db: Session):
    """Devuelve el estudiante configurado (único en esta versión local)."""
    return db.query(Student).filter(Student.is_configured == True).first()  # noqa: E712


def create_student(db: Session, student_in: StudentCreate):
    db_student = Student(**student_in.model_dump())
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    return db_student


def update_student(db: Session, student_id: int, student_in: StudentUpdate):
    db_student = get_student(db, student_id)
    if not db_student:
        return None
    update_data = student_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_student, field, value)
    db.commit()
    db.refresh(db_student)
    return db_student


def mark_configured(db: Session, student_id: int):
    db_student = get_student(db, student_id)
    if db_student:
        db_student.is_configured = True
        db.commit()
        db.refresh(db_student)
    return db_student
