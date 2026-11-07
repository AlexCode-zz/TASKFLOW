from sqlalchemy.orm import Session
from app.models.evaluation import Evaluation
from app.schemas.evaluation import EvaluationCreate, EvaluationUpdate


def get_evaluation(db: Session, evaluation_id: int):
    return db.query(Evaluation).filter(Evaluation.id == evaluation_id).first()


def get_evaluations_by_student(db: Session, student_id: int):
    return db.query(Evaluation).filter(Evaluation.student_id == student_id).all()


def get_evaluations_by_subject(db: Session, student_id: int, subject_id: int):
    return (
        db.query(Evaluation)
        .filter(Evaluation.student_id == student_id, Evaluation.subject_id == subject_id)
        .all()
    )


def get_upcoming_evaluations(db: Session, student_id: int):
    from datetime import date
    today = date.today()
    return (
        db.query(Evaluation)
        .filter(Evaluation.student_id == student_id, Evaluation.date >= today)
        .order_by(Evaluation.date.asc())
        .all()
    )


def create_evaluation(db: Session, student_id: int, evaluation_in: EvaluationCreate):
    db_evaluation = Evaluation(**evaluation_in.model_dump(), student_id=student_id)
    db.add(db_evaluation)
    db.commit()
    db.refresh(db_evaluation)
    return db_evaluation


def update_evaluation(db: Session, evaluation_id: int, evaluation_in: EvaluationUpdate):
    db_evaluation = get_evaluation(db, evaluation_id)
    if not db_evaluation:
        return None
    update_data = evaluation_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_evaluation, field, value)
    db.commit()
    db.refresh(db_evaluation)
    return db_evaluation


def delete_evaluation(db: Session, evaluation_id: int):
    db_evaluation = get_evaluation(db, evaluation_id)
    if not db_evaluation:
        return False
    db.delete(db_evaluation)
    db.commit()
    return True
