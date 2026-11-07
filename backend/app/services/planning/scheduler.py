"""
Programador de sesiones de estudio.

Distribuye las tareas en los espacios disponibles respetando:
- Prioridad de la tarea
- Duración estimada y preferida de sesión
- Fecha límite de entrega
"""

from datetime import date, timedelta
from typing import List, Dict, Optional, Tuple

from .slots import parse_time, time_to_minutes, minutes_to_time


def split_task_into_sessions(
    task: Dict,
    available_slots: List[Dict],
    preferred_session_minutes: int,
    max_session_minutes: int = 180,
    min_session_minutes: int = 30,
) -> List[Dict]:
    """
    Divide una tarea en sesiones distribuidas en espacios disponibles.
    """
    estimated = task.get("estimated_minutes") or 60
    due_date_str = task.get("due_date")
    due_date = None
    if due_date_str:
        due_date = date.fromisoformat(due_date_str) if isinstance(due_date_str, str) else due_date_str

    remaining_minutes = estimated
    sessions = []

    sorted_slots = sorted(available_slots, key=lambda s: (s["date"], s["start_time"]))

    for slot in sorted_slots:
        if remaining_minutes <= 0:
            break

        slot_date_str = slot["date"]
        if due_date and slot_date_str > due_date.isoformat():
            continue

        slot_start = parse_time(slot["start_time"])
        slot_end = parse_time(slot["end_time"])
        if not slot_start or not slot_end:
            continue

        session_duration = min(
            preferred_session_minutes,
            max_session_minutes,
            remaining_minutes,
            slot["duration_minutes"],
        )

        if session_duration < min_session_minutes:
            continue

        sessions.append({
            "task_id": task.get("id"),
            "title": task.get("title", "Tarea"),
            "subject_id": task.get("subject_id"),
            "scheduled_date": slot_date_str,
            "day_of_week": slot["day_of_week"],
            "start_time": slot["start_time"],
            "end_time": minutes_to_time(time_to_minutes(slot_start) + session_duration),
            "duration_minutes": session_duration,
            "session_type": "study",
            "priority_score": task.get("priority_score", 0),
        })

        remaining_minutes -= session_duration

    return sessions


def schedule_tasks(
    prioritized_tasks: List[Dict],
    available_slots: List[Dict],
    preferences: Dict,
) -> Tuple[List[Dict], List[Dict]]:
    """
    Programa todas las tareas priorizadas en los espacios disponibles.

    Returns:
        Tupla de (sesiones_programadas, tareas_no_programadas)
    """
    preferred_session = preferences.get("preferred_study_session_minutes") or 60
    max_session = 180
    min_session = 30

    scheduled_sessions = []
    unscheduled_tasks = []
    used_slots: List[Dict] = []

    for task in prioritized_tasks:
        if task.get("status") == "completada":
            continue

        remaining_slots = [
            s for s in available_slots
            if not any(
                u["date"] == s["date"] and u["start_time"] == s["start_time"]
                for u in used_slots
            )
        ]

        sessions = split_task_into_sessions(
            task, remaining_slots, preferred_session, max_session, min_session
        )

        total_scheduled = sum(s["duration_minutes"] for s in sessions)
        estimated = task.get("estimated_minutes") or 0

        if total_scheduled >= estimated or estimated == 0:
            scheduled_sessions.extend(sessions)
            for s in sessions:
                used_slots.append({
                    "date": s["scheduled_date"],
                    "start_time": s["start_time"],
                })
        else:
            if sessions:
                scheduled_sessions.extend(sessions)
                for s in sessions:
                    used_slots.append({
                        "date": s["scheduled_date"],
                        "start_time": s["start_time"],
                    })
            unscheduled_tasks.append({
                **task,
                "scheduled_minutes": total_scheduled,
                "remaining_minutes": max(0, estimated - total_scheduled),
                "reason": "No hay suficiente tiempo disponible antes de la fecha de entrega.",
            })

    return scheduled_sessions, unscheduled_tasks
