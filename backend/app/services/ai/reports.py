"""Generación de informes académicos con datos reales de TaskFlow.

Compila estadísticas verificables: materias, promedios ponderados,
parciales aprobados, tareas completadas y atrasadas, y la evolución
del rendimiento. Nunca inventa datos: si falta información, el informe
lo indica explícitamente.
"""

from datetime import date
from typing import Dict, Any, List, Optional

from sqlalchemy.orm import Session

from app.crud.evaluation import get_evaluations_by_student
from app.crud.laboratory import get_laboratories_by_student
from app.crud.planning import get_active_plan_by_student
from app.crud.project import get_projects_by_student
from app.crud.subject import get_subjects_by_student
from app.crud.task import get_tasks_by_student
from app.services.academic import get_subject_academic_items, weighted_average
from app.services.schedule_conflicts import detect_schedule_conflicts

# Umbral de aprobación por defecto (estándar universitario boliviano:
# 51 sobre 100). Se informa siempre junto al resultado para que el
# estudiante sepa con qué criterio se clasificó cada parcial.
DEFAULT_PASSING_GRADE = 51.0

# Cantidad de ítems recientes para calcular la tendencia de rendimiento
TREND_WINDOW = 4


def _graded_item_summary(item) -> Dict[str, Any]:
    return {
        "id": item.id,
        "title": item.title,
        "date": item.date.isoformat() if item.date else None,
        "grade": float(item.grade) if item.grade is not None else None,
        "weight_percentage": (
            float(item.weight_percentage) if item.weight_percentage is not None else None
        ),
        "status": item.status,
    }


def _subject_report(db: Session, student_id: int, subject, passing_grade: float) -> Dict[str, Any]:
    """Resumen académico verificado de una materia."""
    items = get_subject_academic_items(db, student_id, subject.id)

    parciales = items["parciales"]
    laboratorios = items["laboratorios"]
    summary = items["summary"]

    graded_parciales = [p for p in parciales if p.grade is not None]
    passed_parciales = [
        p for p in graded_parciales if float(p.grade) >= passing_grade
    ]
    failed_parciales = [
        p for p in graded_parciales if float(p.grade) < passing_grade
    ]

    return {
        "id": subject.id,
        "name": subject.name,
        "code": subject.code,
        "teacher": subject.teacher,
        "is_favorite": subject.is_favorite,
        "average": summary["average"],
        "weight_total": summary["weight_total"],
        "graded_count": summary["graded_count"],
        "parciales": {
            "total": len(parciales),
            "completed": sum(1 for p in parciales if p.status == "realizado"),
            "pending": sum(1 for p in parciales if p.status == "pendiente"),
            "passed": len(passed_parciales),
            "failed": len(failed_parciales),
            "ungraded": sum(1 for p in parciales if p.grade is None),
        },
        "laboratorios": {
            "total": len(laboratorios),
            "completed": sum(1 for l in laboratorios if l.status == "realizado"),
            "pending": sum(1 for l in laboratorios if l.status == "pendiente"),
            "graded": sum(1 for l in laboratorios if l.grade is not None),
        },
    }


def _performance_evolution(subjects_evaluations: List, subjects_laboratories: List) -> Dict[str, Any]:
    """Analiza la evolución del rendimiento con los ítems calificados.

    Agrupa por materia las notas en orden cronológico y compara el
    promedio de los ítems más recientes con los anteriores.
    """
    by_subject: Dict[int, List[Dict[str, Any]]] = {}

    for item in subjects_evaluations:
        if item.grade is None or item.subject_id is None:
            continue
        by_subject.setdefault(item.subject_id, []).append(
            {
                "kind": "parcial",
                "title": item.title,
                "date": item.date,
                "grade": float(item.grade),
            }
        )
    for item in subjects_laboratories:
        if item.grade is None or item.subject_id is None:
            continue
        by_subject.setdefault(item.subject_id, []).append(
            {
                "kind": "laboratorio",
                "title": item.title,
                "date": item.date,
                "grade": float(item.grade),
            }
        )

    evolution: List[Dict[str, Any]] = []
    for subject_id, graded in by_subject.items():
        graded.sort(key=lambda g: (g["date"] or date.min, g["title"] or ""))
        grades = [g["grade"] for g in graded]
        trend = None
        if len(grades) >= 2:
            window = min(TREND_WINDOW, max(1, len(grades) - 1))
            recent = grades[-window:]
            previous = grades[:-window] or grades[:1]
            recent_avg = sum(recent) / len(recent)
            previous_avg = sum(previous) / len(previous)
            if recent_avg > previous_avg + 0.5:
                trend = "mejorando"
            elif recent_avg < previous_avg - 0.5:
                trend = "empeorando"
            else:
                trend = "estable"
        evolution.append(
            {
                "subject_id": subject_id,
                "graded_count": len(grades),
                "grades": [
                    {
                        "kind": g["kind"],
                        "title": g["title"],
                        "date": g["date"].isoformat() if g["date"] else None,
                        "grade": g["grade"],
                    }
                    for g in graded
                ],
                "trend": trend,
            }
        )
    return {"subjects": evolution}


def build_academic_report(
    db: Session,
    student_id: int,
    passing_grade: Optional[float] = None,
) -> Dict[str, Any]:
    """Construye el informe académico completo con datos reales.

    Args:
        db: sesión de base de datos.
        student_id: identificador del estudiante.
        passing_grade: umbral de aprobación (por defecto 51).

    Returns:
        Informe con estadísticas verificables por materia, tareas,
        evaluaciones, proyectos, plan activo, conflictos y evolución.
    """
    threshold = passing_grade if passing_grade is not None else DEFAULT_PASSING_GRADE

    subjects = get_subjects_by_student(db, student_id)
    tasks = get_tasks_by_student(db, student_id)
    evaluations = get_evaluations_by_student(db, student_id)
    laboratories = get_laboratories_by_student(db, student_id)
    projects = get_projects_by_student(db, student_id)
    plan = get_active_plan_by_student(db, student_id)
    today = date.today()

    subject_reports = [
        _subject_report(db, student_id, s, threshold) for s in subjects
    ]

    # Tareas
    completed_tasks = [t for t in tasks if t.status == "completada"]
    pending_tasks = [t for t in tasks if t.status == "pendiente"]
    in_progress_tasks = [t for t in tasks if t.status == "en_progreso"]
    overdue_tasks = [
        t
        for t in tasks
        if t.status != "completada" and t.due_date is not None and t.due_date < today
    ]
    upcoming_tasks = [
        t
        for t in tasks
        if t.status != "completada" and t.due_date is not None and t.due_date >= today
    ]

    # Evaluaciones
    completed_evaluations = [e for e in evaluations if e.status == "realizado"]
    pending_evaluations = [e for e in evaluations if e.status == "pendiente"]
    upcoming_evaluations = [
        e for e in evaluations if e.status != "realizado" and e.date is not None and e.date >= today
    ]

    # Laboratorios
    completed_laboratories = [l for l in laboratories if l.status == "realizado"]

    # Materias que necesitan atención: promedio más bajo o más ítems
    # pendientes con nota pendiente de registro
    attention = []
    for report in subject_reports:
        reasons = []
        if report["average"] is not None and report["average"] < threshold:
            reasons.append(f"promedio {report['average']} por debajo de {threshold:g}")
        pending_parciales = report["parciales"]["pending"]
        if pending_parciales > 0:
            reasons.append(f"{pending_parciales} parciales sin realizar")
        if reasons:
            attention.append({"subject_id": report["id"], "name": report["name"], "reasons": reasons})

    # Promedio global solo con materias que tienen promedio calculable
    averages = [r["average"] for r in subject_reports if r["average"] is not None]
    global_average = round(sum(averages) / len(averages), 2) if averages else None

    conflicts = detect_schedule_conflicts(db, student_id)

    graded_evaluations = [e for e in evaluations if e.grade is not None]
    graded_laboratories = [l for l in laboratories if l.grade is not None]

    report = {
        "generated_at": today.isoformat(),
        "passing_grade": threshold,
        "student_id": student_id,
        "subjects": {
            "count": len(subjects),
            "detail": subject_reports,
        },
        "global_average": global_average,
        "tasks": {
            "total": len(tasks),
            "completed": len(completed_tasks),
            "pending": len(pending_tasks),
            "in_progress": len(in_progress_tasks),
            "overdue": len(overdue_tasks),
            "upcoming": len(upcoming_tasks),
            "overdue_detail": [
                {"id": t.id, "title": t.title, "due_date": t.due_date.isoformat()}
                for t in overdue_tasks
            ],
        },
        "evaluations": {
            "total": len(evaluations),
            "completed": len(completed_evaluations),
            "pending": len(pending_evaluations),
            "upcoming": len(upcoming_evaluations),
            "graded": len(graded_evaluations),
        },
        "laboratories": {
            "total": len(laboratories),
            "completed": len(completed_laboratories),
            "graded": len(graded_laboratories),
        },
        "projects": {
            "total": len(projects),
            "active": sum(1 for p in projects if p.status != "completada"),
            "completed": sum(1 for p in projects if p.status == "completada"),
        },
        "active_plan": {
            "exists": plan is not None,
            "week_start": plan.week_start_date.isoformat() if plan and plan.week_start_date else None,
            "total_sessions": plan.total_sessions if plan else 0,
            "scheduled_hours": plan.scheduled_hours if plan else 0,
        },
        "conflicts": {
            "count": conflicts["conflict_count"],
            "detail": conflicts["conflicts"],
        },
        "overloads": {
            "count": conflicts["overload_count"],
            "detail": conflicts["overloads"],
        },
        "needs_attention": attention,
        "performance_evolution": _performance_evolution(
            graded_evaluations, graded_laboratories
        ),
        "has_data": bool(subjects or tasks or evaluations or laboratories or projects),
    }
    return report
