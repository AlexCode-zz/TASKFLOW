from sqlalchemy.orm import Session
from app.models.class_schedule import ClassSchedule
from app.schemas.class_schedule import ClassScheduleCreate, ClassScheduleUpdate


def get_class_schedule(db: Session, schedule_id: int):
    return db.query(ClassSchedule).filter(ClassSchedule.id == schedule_id).first()


def get_class_schedules_by_student(db: Session, student_id: int):
    return db.query(ClassSchedule).filter(ClassSchedule.student_id == student_id).all()


def get_class_schedules_by_subject(db: Session, student_id: int, subject_id: int):
    return (
        db.query(ClassSchedule)
        .filter(ClassSchedule.student_id == student_id, ClassSchedule.subject_id == subject_id)
        .all()
    )


def get_class_schedule_by_day(db: Session, student_id: int, day_of_week: str):
    return (
        db.query(ClassSchedule)
        .filter(ClassSchedule.student_id == student_id, ClassSchedule.day_of_week == day_of_week)
        .all()
    )


def create_class_schedule(db: Session, student_id: int, schedule_in: ClassScheduleCreate):
    db_schedule = ClassSchedule(**schedule_in.model_dump(), student_id=student_id)
    db.add(db_schedule)
    db.commit()
    db.refresh(db_schedule)
    return db_schedule


def update_class_schedule(db: Session, schedule_id: int, schedule_in: ClassScheduleUpdate):
    db_schedule = get_class_schedule(db, schedule_id)
    if not db_schedule:
        return None
    update_data = schedule_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_schedule, field, value)
    db.commit()
    db.refresh(db_schedule)
    return db_schedule


def delete_class_schedule(db: Session, schedule_id: int):
    db_schedule = get_class_schedule(db, schedule_id)
    if not db_schedule:
        return False
    db.delete(db_schedule)
    db.commit()
    return True
