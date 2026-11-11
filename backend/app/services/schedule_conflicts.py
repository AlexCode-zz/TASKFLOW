"""Detección de conflictos y sobrecargas académicas.

Analiza los horarios de clase semanales, laboratorios con fecha y
evaluaciones para detectar:
- solapamientos entre horarios de clase del mismo día,
- solapamientos entre un laboratorio con fecha y los horarios de clase
  del día de la semana correspondiente,
- solapamientos entre laboratorios del mismo día,
- sobrecargas: demasiadas evaluaciones o entregas concentradas en un
  mismo día.

Es un análisis determinista sobre los datos reales de la base de datos.
"""

from datetime import date
from typing import Dict, Any, List, Optional

from sqlalchemy.orm import Session

from app.crud.class_schedule import get_class_schedules_by_student
from app.crud.evaluation import get_evaluations_by_student
from app.crud.laboratory import get_laboratories_by_student
from app.crud.task import get_tasks_by_student

# Días válidos (formato usado por TaskFlow: minúsculas con tilde)
DAY_KEYS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]

# Variantes sin tilde aceptadas al normalizar
DAY_ALIASES = {
    "lunes": "lunes",
    "martes": "martes",
    "miercoles": "miércoles",
    "miercol": "miércoles",
    "miércoles": "miércoles",
    "jueves": "jueves",
    "viernes": "viernes",
    "sabado": "sábado",
    "sábado": "sábado",
    "domingo": "domingo",
}

# Umbral de evaluaciones en un mismo día para considerar sobrecarga
EVALUATIONS_PER_DAY_OVERLOAD = 2

# Umbral de entregas de tareas en un mismo día para considerar sobrecarga
TASKS_PER_DAY_OVERLOAD = 3


def normalize_day(day: Optional[str]) -> Optional[str]:
    """Normaliza el nombre de un día al formato de TaskFlow."""
    if not day:
        return None
    key = day.strip().lower()
    if key in DAY_ALIASES:
        return DAY_ALIASES[key]
    for canonical in DAY_KEYS:
        if key.startswith(canonical[:4]):
            return canonical
    return None


def weekday_to_day(weekday: int) -> Optional[str]:
    """Convierte el índice de weekday de Python (0=lunes) a nombre de día."""
    if 0 <= weekday <= 6:
        return DAY_KEYS[weekday]
    return None


def time_to_minutes(time_str: Optional[str]) -> Optional[int]:
    """Convierte 'HH:MM' a minutos desde medianoche."""
    if not time_str or not isinstance(time_str, str):
        return None
    parts = time_str.strip().split(":")
    if len(parts) < 2:
        return None
    try:
        hours, minutes = int(parts[0]), int(parts[1])
    except ValueError:
        return None
    if not (0 <= hours <= 23 and 0 <= minutes <= 59):
        return None
    return hours * 60 + minutes


def times_overlap(start_a: Optional[str], end_a: Optional[str], start_b: Optional[str], end_b: Optional[str]) -> bool:
    """Comprueba si dos rangos horarios del mismo día se solapan."""
    a_start, a_end = time_to_minutes(start_a), time_to_minutes(end_a)
    b_start, b_end = time_to_minutes(start_b), time_to_minutes(end_b)
    if None in (a_start, a_end, b_start, b_end):
        return False
    return a_start < b_end and b_start < a_end


def _schedule_window_active(schedule, on_date: date) -> bool:
    """Indica si un horario de clase está vigente en la fecha dada."""
    if schedule.start_date and on_date < schedule.start_date:
        return False
    if schedule.end_date and on_date > schedule.end_date:
        return False
    return True


def detect_schedule_conflicts(db: Session, student_id: int) -> Dict[str, Any]:
    """Detecta conflictos de horario y sobrecargas del estudiante.

    Returns:
        dict con la lista de conflictos (clases, laboratorios) y
        sobrecargas (evaluaciones y tareas por día).
    """
    schedules = get_class_schedules_by_student(db, student_id)
    laboratories = [
        lab for lab in get_laboratories_by_student(db, student_id) if lab.date is not None
    ]
    evaluations = [
        ev for ev in get_evaluations_by_student(db, student_id) if ev.date is not None
    ]
    tasks = [t for t in get_tasks_by_student(db, student_id) if t.due_date is not None]

    conflicts: List[Dict[str, Any]] = []

    # 1. Clase vs clase (mismo día de la semana, horarios solapados)
    for i in range(len(schedules)):
        for j in range(i + 1, len(schedules)):
            a, b = schedules[i], schedules[j]
            day_a = normalize_day(a.day_of_week)
            day_b = normalize_day(b.day_of_week)
            if not day_a or day_a != day_b:
                continue
            if times_overlap(a.start_time, a.end_time, b.start_time, b.end_time):
                conflicts.append(
                    {
                        "type": "class_vs_class",
                        "day": day_a,
                        "items": [
                            {
                                "kind": "clase",
                                "id": a.id,
                                "subject_id": a.subject_id,
                                "time": f"{a.start_time}-{a.end_time}",
                                "room": a.room,
                            },
                            {
                                "kind": "clase",
                                "id": b.id,
                                "subject_id": b.subject_id,
                                "time": f"{b.start_time}-{b.end_time}",
                                "room": b.room,
                            },
                        ],
                        "message": (
                            f"Conflicto: dos clases se solapan el {day_a} "
                            f"({a.start_time}-{a.end_time} y {b.start_time}-{b.end_time})."
                        ),
                    }
                )

    # 2. Laboratorio vs clase (el día de la semana de la fecha del lab)
    for lab in laboratories:
        lab_day = weekday_to_day(lab.date.weekday())
        if not lab_day:
            continue
        for schedule in schedules:
            if normalize_day(schedule.day_of_week) != lab_day:
                continue
            if not _schedule_window_active(schedule, lab.date):
                continue
            if times_overlap(lab.start_time, lab.end_time, schedule.start_time, schedule.end_time):
                conflicts.append(
                    {
                        "type": "lab_vs_class",
                        "day": lab_day,
                        "date": lab.date.isoformat(),
                        "items": [
                            {
                                "kind": "laboratorio",
                                "id": lab.id,
                                "subject_id": lab.subject_id,
                                "title": lab.title,
                                "time": f"{lab.start_time}-{lab.end_time}",
                                "location": lab.location,
                            },
                            {
                                "kind": "clase",
                                "id": schedule.id,
                                "subject_id": schedule.subject_id,
                                "time": f"{schedule.start_time}-{schedule.end_time}",
                                "room": schedule.room,
                            },
                        ],
                        "message": (
                            f"Conflicto: el laboratorio '{lab.title or 'sin título'}' del "
                            f"{lab.date.isoformat()} ({lab.start_time}-{lab.end_time}) se "
                            f"solapa con una clase de {lab_day}."
                        ),
                    }
                )

    # 3. Laboratorio vs laboratorio (misma fecha, horarios solapados)
    for i in range(len(laboratories)):
        for j in range(i + 1, len(laboratories)):
            a, b = laboratories[i], laboratories[j]
            if a.date != b.date:
                continue
            if times_overlap(a.start_time, a.end_time, b.start_time, b.end_time):
                conflicts.append(
                    {
                        "type": "lab_vs_lab",
                        "day": weekday_to_day(a.date.weekday()),
                        "date": a.date.isoformat(),
                        "items": [
                            {
                                "kind": "laboratorio",
                                "id": a.id,
                                "subject_id": a.subject_id,
                                "title": a.title,
                                "time": f"{a.start_time}-{a.end_time}",
                            },
                            {
                                "kind": "laboratorio",
                                "id": b.id,
                                "subject_id": b.subject_id,
                                "title": b.title,
                                "time": f"{b.start_time}-{b.end_time}",
                            },
                        ],
                        "message": (
                            f"Conflicto: dos laboratorios se solapan el "
                            f"{a.date.isoformat()} ({a.start_time}-{a.end_time} y "
                            f"{b.start_time}-{b.end_time})."
                        ),
                    }
                )

    # 4. Sobrecargas: evaluaciones y entregas concentradas por día
    overloads: List[Dict[str, Any]] = []

    evals_by_date: Dict[str, List[Any]] = {}
    for ev in evaluations:
        evals_by_date.setdefault(ev.date.isoformat(), []).append(ev)
    for day, items in evals_by_date.items():
        if len(items) > EVALUATIONS_PER_DAY_OVERLOAD:
            overloads.append(
                {
                    "type": "evaluations",
                    "date": day,
                    "count": len(items),
                    "titles": [e.title or "(sin título)" for e in items],
                    "message": f"Sobrecarga: {len(items)} evaluaciones el {day}.",
                }
            )

    tasks_by_date: Dict[str, List[Any]] = {}
    for task in tasks:
        tasks_by_date.setdefault(task.due_date.isoformat(), []).append(task)
    for day, items in tasks_by_date.items():
        if len(items) >= TASKS_PER_DAY_OVERLOAD:
            overloads.append(
                {
                    "type": "tasks",
                    "date": day,
                    "count": len(items),
                    "titles": [t.title for t in items],
                    "message": f"Sobrecarga: {len(items)} tareas vencen el {day}.",
                }
            )

    return {
        "conflicts": conflicts,
        "overloads": overloads,
        "conflict_count": len(conflicts),
        "overload_count": len(overloads),
    }


def check_new_schedule_conflicts(
    db: Session,
    student_id: int,
    subject_id: int,
    day_of_week: str,
    start_time: str,
    end_time: str,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    exclude_schedule_id: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """Detecta con qué chocaría un horario de clase nuevo antes de crearlo.

    Returns:
        Lista de conflictos que produciría el nuevo horario.
    """
    day = normalize_day(day_of_week)
    if not day:
        return []

    conflicts: List[Dict[str, Any]] = []
    for schedule in get_class_schedules_by_student(db, student_id):
        if exclude_schedule_id and schedule.id == exclude_schedule_id:
            continue
        if normalize_day(schedule.day_of_week) != day:
            continue
        if not times_overlap(start_time, end_time, schedule.start_time, schedule.end_time):
            continue
        # Las ventanas de vigencia deben cruzarse para que haya conflicto
        if start_date and schedule.end_date and start_date > schedule.end_date:
            continue
        if end_date and schedule.start_date and end_date < schedule.start_date:
            continue
        conflicts.append(
            {
                "type": "class_vs_class",
                "day": day,
                "items": [
                    {
                        "kind": "clase nueva",
                        "subject_id": subject_id,
                        "time": f"{start_time}-{end_time}",
                    },
                    {
                        "kind": "clase",
                        "id": schedule.id,
                        "subject_id": schedule.subject_id,
                        "time": f"{schedule.start_time}-{schedule.end_time}",
                        "room": schedule.room,
                    },
                ],
                "message": (
                    f"El nuevo horario del {day} ({start_time}-{end_time}) se solapa "
                    f"con una clase existente ({schedule.start_time}-{schedule.end_time})."
                ),
            }
        )
    return conflicts
