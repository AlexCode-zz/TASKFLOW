from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import date, timedelta

from app.db.session import get_db
from app.crud.student import get_latest_student
from app.crud import planning as planning_crud
from app.schemas.planning import (
    PlanCreate,
    PlanResponse,
    PlanningSessionCreate,
    PlanningSessionUpdate,
    PlanningSessionResponse,
    PlanningGenerateRequest,
    PlanningGenerateResponse,
    PlanningSessionManualUpdate,
)

from app.services.planning.engine import run_planning_engine

router = APIRouter(prefix="/planning", tags=["Planificación automática"])


def get_current_student(db: Session):
    student = get_latest_student(db)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró configuración de estudiante.",
        )
    return student


def _build_student_data(db: Session, student) -> Dict[str, Any]:
    """Construye el diccionario de datos para el motor de planificación."""
    from app.crud.subject import get_subjects_by_student
    from app.crud.task import get_tasks_by_student
    from app.crud.evaluation import get_evaluations_by_student
    from app.crud.class_schedule import get_class_schedules_by_student
    from app.crud.laboratory import get_laboratories_by_student
    from app.crud.weekly_availability import get_availability_by_student
    from app.crud.student_preference import get_preference_by_student

    subjects = get_subjects_by_student(db, student.id)
    tasks = get_tasks_by_student(db, student.id)
    evaluations = get_evaluations_by_student(db, student.id)
    class_schedules = get_class_schedules_by_student(db, student.id)
    laboratories = get_laboratories_by_student(db, student.id)
    availability = get_availability_by_student(db, student.id)
    preference = get_preference_by_student(db, student.id)

    return {
        "student": {
            "id": student.id,
            "name": student.name,
            "career": student.career,
        },
        "subjects": [
            {
                "id": s.id,
                "name": s.name,
                "code": s.code,
                "color": s.color,
            }
            for s in subjects
        ],
        "tasks": [
            {
                "id": t.id,
                "title": t.title,
                "subject_id": t.subject_id,
                "due_date": t.due_date.isoformat() if t.due_date else None,
                "priority": t.priority,
                "status": t.status,
                "estimated_minutes": t.estimated_minutes,
            }
            for t in tasks
        ],
        "evaluations": [
            {
                "id": e.id,
                "title": e.title,
                "subject_id": e.subject_id,
                "date": e.date.isoformat() if e.date else None,
                "start_time": e.start_time,
                "end_time": e.end_time,
                "status": e.status,
                "evaluation_type": e.evaluation_type,
            }
            for e in evaluations
        ],
        "class_schedules": [
            {
                "id": c.id,
                "subject_id": c.subject_id,
                "day_of_week": c.day_of_week,
                "start_time": c.start_time,
                "end_time": c.end_time,
                "subject_name": None,
            }
            for c in class_schedules
        ],
        "laboratories": [
            {
                "id": l.id,
                "title": l.title,
                "date": l.date.isoformat() if l.date else None,
                "start_time": l.start_time,
                "end_time": l.end_time,
            }
            for l in laboratories
        ],
        "weekly_availability": [
            {
                "day_of_week": a.day_of_week,
                "is_available": a.is_available,
                "start_time": a.start_time,
                "end_time": a.end_time,
            }
            for a in availability
        ],
        "preferences": {
            "usual_start_time": preference.usual_start_time if preference else None,
            "usual_sleep_time": preference.usual_sleep_time if preference else None,
            "preferred_study_session_minutes": preference.preferred_study_session_minutes if preference else 60,
            "preferred_break_minutes": preference.preferred_break_minutes if preference else 15,
            "planning_preference": preference.planning_preference if preference else "daily",
        },
    }


@router.post("/generate", response_model=PlanningGenerateResponse)
def generate_planning(
    request: PlanningGenerateRequest,
    db: Session = Depends(get_db),
):
    """Genera una planificación semanal automática."""
    student = get_current_student(db)

    week_start = request.week_start_date
    if week_start is None:
        today = date.today()
        week_start = today - timedelta(days=today.weekday())

    student_data = _build_student_data(db, student)

    result = run_planning_engine(student_data, week_start)

    if not result["success"]:
        return PlanningGenerateResponse(
            success=False,
            error=result.get("error"),
        )

    # Guardar el plan en la base de datos
    plan_in = PlanCreate(
        week_start_date=week_start,
        week_end_date=date.fromisoformat(result["week_end"]),
    )
    db_plan = planning_crud.create_plan(db, student.id, plan_in)

    # Guardar las sesiones
    saved_sessions = []
    for session_data in result["sessions"]:
        session_in = PlanningSessionCreate(
            task_id=session_data.get("task_id"),
            title=session_data.get("title"),
            description=None,
            subject_id=session_data.get("subject_id"),
            scheduled_date=date.fromisoformat(session_data["scheduled_date"]),
            start_time=session_data["start_time"],
            end_time=session_data["end_time"],
            duration_minutes=session_data["duration_minutes"],
            session_type=session_data.get("session_type", "study"),
            origin="automatic",
            status="pending",
            is_manually_modified=False,
            explanation=None,
            priority_score=session_data.get("priority_score", 0),
        )
        saved = planning_crud.create_session(db, db_plan.id, student.id, session_in)
        saved_sessions.append(saved)

    # Actualizar estadísticas del plan
    planning_crud.update_plan_stats(
        db,
        db_plan.id,
        result["stats"]["total_sessions"],
        result["stats"]["scheduled_hours"],
        result["stats"]["unscheduled_count"],
    )

    return PlanningGenerateResponse(
        success=True,
        week_start=result["week_start"],
        week_end=result["week_end"],
        sessions=saved_sessions,
        unscheduled_tasks=result["unscheduled_tasks"],
        warnings=result["warnings"],
        explanations=result["explanations"],
        stats=result["stats"],
    )


@router.get("/plan", response_model=PlanResponse)
def get_active_plan(db: Session = Depends(get_db)):
    """Obtiene el plan activo del estudiante."""
    student = get_current_student(db)
    plan = planning_crud.get_active_plan_by_student(db, student.id)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No hay un plan de planificación activo.",
        )
    return plan


@router.get("/sessions", response_model=List[PlanningSessionResponse])
def get_planning_sessions(
    plan_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """Obtiene las sesiones de planificación."""
    student = get_current_student(db)

    if plan_id:
        plan = planning_crud.get_plan(db, plan_id)
        if not plan or plan.student_id != student.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Plan no encontrado.",
            )
        return planning_crud.get_sessions_by_plan(db, plan_id)

    plan = planning_crud.get_active_plan_by_student(db, student.id)
    if not plan:
        return []
    return planning_crud.get_sessions_by_plan(db, plan.id)


@router.get("/sessions/{session_id}", response_model=PlanningSessionResponse)
def get_planning_session(session_id: int, db: Session = Depends(get_db)):
    """Obtiene una sesión de planificación específica."""
    student = get_current_student(db)
    session = planning_crud.get_session(db, session_id)
    if not session or session.student_id != student.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sesión de planificación no encontrada.",
        )
    return session


@router.put("/sessions/{session_id}", response_model=PlanningSessionResponse)
def update_planning_session(
    session_id: int,
    session_in: PlanningSessionUpdate,
    db: Session = Depends(get_db),
):
    """Actualiza una sesión de planificación (cambios manuales)."""
    student = get_current_student(db)
    session = planning_crud.get_session(db, session_id)
    if not session or session.student_id != student.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sesión de planificación no encontrada.",
        )

    # Validar hora fin > hora inicio si se cambian
    start_time = session_in.start_time or session.start_time
    end_time = session_in.end_time or session.end_time
    if start_time and end_time and end_time <= start_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La hora de finalización debe ser posterior a la hora de inicio.",
        )

    updated = planning_crud.update_session(db, session_id, session_in)
    return updated


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_planning_session(session_id: int, db: Session = Depends(get_db)):
    """Elimina una sesión de planificación."""
    student = get_current_student(db)
    session = planning_crud.get_session(db, session_id)
    if not session or session.student_id != student.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sesión de planificación no encontrada.",
        )
    planning_crud.delete_session(db, session_id)
    return None


@router.post("/sessions/{session_id}/manual", response_model=PlanningSessionResponse)
def manual_adjust_session(
    session_id: int,
    adjustment: PlanningSessionManualUpdate,
    db: Session = Depends(get_db),
):
    """Aplica un cambio manual a una sesión (mover, cambiar duración, estado)."""
    student = get_current_student(db)
    session = planning_crud.get_session(db, session_id)
    if not session or session.student_id != student.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sesión de planificación no encontrada.",
        )

    update_data = {}
    if adjustment.new_start_time:
        update_data["start_time"] = adjustment.new_start_time
    if adjustment.new_end_time:
        update_data["end_time"] = adjustment.new_end_time
    if adjustment.new_date:
        update_data["scheduled_date"] = adjustment.new_date
    if adjustment.status:
        update_data["status"] = adjustment.status
    if adjustment.is_manually_modified is not None:
        update_data["is_manually_modified"] = adjustment.is_manually_modified

    if update_data:
        update_data["is_manually_modified"] = True

    schema_update = PlanningSessionUpdate(**update_data)
    return planning_crud.update_session(db, session_id, schema_update)


@router.post("/regenerate", response_model=PlanningGenerateResponse)
def regenerate_planning(
    request: PlanningGenerateRequest,
    db: Session = Depends(get_db),
):
    """Regenera la planificación (sobrescribe el plan activo existente)."""
    student = get_current_student(db)

    # Verificar si ya hay un plan activo
    existing_plan = planning_crud.get_active_plan_by_student(db, student.id)
    if existing_plan:
        # Eliminar sesiones del plan anterior
        planning_crud.delete_sessions_by_plan(db, existing_plan.id)
        # Desactivar plan anterior
        existing_plan.is_active = False
        db.commit()

    return generate_planning(request, db)
