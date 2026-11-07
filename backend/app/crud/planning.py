from sqlalchemy.orm import Session
from app.models.planning import Plan, PlanningSession
from app.schemas.planning import PlanCreate, PlanningSessionCreate, PlanningSessionUpdate


def get_plan(db: Session, plan_id: int):
    return db.query(Plan).filter(Plan.id == plan_id).first()


def get_active_plan_by_student(db: Session, student_id: int):
    return db.query(Plan).filter(
        Plan.student_id == student_id,
        Plan.is_active == True,  # noqa: E712
    ).order_by(Plan.id.desc()).first()


def get_plans_by_student(db: Session, student_id: int):
    return db.query(Plan).filter(Plan.student_id == student_id).all()


def create_plan(db: Session, student_id: int, plan_in: PlanCreate):
    # Desactivar planes anteriores
    db.query(Plan).filter(Plan.student_id == student_id).update({Plan.is_active: False})

    db_plan = Plan(
        student_id=student_id,
        week_start_date=plan_in.week_start_date,
        week_end_date=plan_in.week_end_date,
        is_active=True,
        total_sessions=0,
        scheduled_hours=0,
        unscheduled_tasks=0,
    )
    db.add(db_plan)
    db.commit()
    db.refresh(db_plan)
    return db_plan


def update_plan_stats(db: Session, plan_id: int, total_sessions: int, scheduled_hours: int, unscheduled_tasks: int):
    db_plan = get_plan(db, plan_id)
    if db_plan:
        db_plan.total_sessions = total_sessions
        db_plan.scheduled_hours = scheduled_hours
        db_plan.unscheduled_tasks = unscheduled_tasks
        db.commit()
        db.refresh(db_plan)
    return db_plan


def get_sessions_by_plan(db: Session, plan_id: int):
    return db.query(PlanningSession).filter(PlanningSession.plan_id == plan_id).all()


def get_session(db: Session, session_id: int):
    return db.query(PlanningSession).filter(PlanningSession.id == session_id).first()


def get_sessions_by_student(db: Session, student_id: int):
    return db.query(PlanningSession).filter(PlanningSession.student_id == student_id).all()


def create_session(db: Session, plan_id: int, student_id: int, session_in: PlanningSessionCreate):
    db_session = PlanningSession(
        plan_id=plan_id,
        student_id=student_id,
        **session_in.model_dump(),
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session


def update_session(db: Session, session_id: int, session_in: PlanningSessionUpdate):
    db_session = get_session(db, session_id)
    if not db_session:
        return None
    update_data = session_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_session, field, value)
    db.commit()
    db.refresh(db_session)
    return db_session


def delete_session(db: Session, session_id: int):
    db_session = get_session(db, session_id)
    if not db_session:
        return False
    db.delete(db_session)
    db.commit()
    return True


def delete_sessions_by_plan(db: Session, plan_id: int):
    db.query(PlanningSession).filter(PlanningSession.plan_id == plan_id).delete()
    db.commit()
