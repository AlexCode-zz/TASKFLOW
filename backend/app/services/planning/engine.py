"""
Motor principal de planificación automática de TaskFlow.

Orquesta los componentes:
1. Cálculo de prioridades
2. Generación de espacios disponibles
3. Distribución de sesiones
4. Detección de conflictos y sobrecarga
5. Generación de explicaciones
"""

from datetime import date, timedelta
from typing import List, Dict, Optional

from .prioritization import sort_tasks_by_priority
from .slots import generate_available_slots
from .scheduler import schedule_tasks


class PlanningEngine:
    """Motor determinista de planificación académica."""

    def __init__(self, student_data: Dict):
        self.student = student_data.get("student", {})
        self.subjects = student_data.get("subjects", [])
        self.tasks = student_data.get("tasks", [])
        self.evaluations = student_data.get("evaluations", [])
        self.class_schedules = student_data.get("class_schedules", [])
        self.laboratories = student_data.get("laboratories", [])
        self.availability = student_data.get("weekly_availability", [])
        self.preferences = student_data.get("preferences", {})
        self.today = date.today()

    def generate_weekly_plan(
        self,
        week_start: Optional[date] = None,
    ) -> Dict:
        """Genera una planificación semanal completa."""
        if week_start is None:
            week_start = self.today - timedelta(days=self.today.weekday())
        week_end = week_start + timedelta(days=6)

        if not self.availability:
            return {
                "success": False,
                "error": "No hay disponibilidad semanal configurada. Configure sus horarios primero.",
                "sessions": [],
                "unscheduled_tasks": [],
                "warnings": [],
                "explanations": [],
            }

        pending_tasks = [t for t in self.tasks if t.get("status") != "completada"]
        prioritized_tasks = sort_tasks_by_priority(
            pending_tasks, self.evaluations, self.today
        )

        busy_blocks = self._build_busy_blocks(week_start, week_end)

        sleep_start = self.preferences.get("usual_sleep_time")
        sleep_end = self.preferences.get("usual_start_time")

        available_slots = generate_available_slots(
            week_start,
            week_end,
            self.availability,
            busy_blocks,
            sleep_start=sleep_start,
            sleep_end=sleep_end,
            slot_duration_minutes=30,
        )

        scheduled_sessions, unscheduled_tasks = schedule_tasks(
            prioritized_tasks,
            available_slots,
            self.preferences,
        )

        explanations = self._generate_explanations(
            scheduled_sessions, unscheduled_tasks
        )

        warnings = self._detect_overload(scheduled_sessions)

        total_sessions = len(scheduled_sessions)
        scheduled_minutes = sum(s.get("duration_minutes", 0) for s in scheduled_sessions)

        return {
            "success": True,
            "week_start": week_start.isoformat(),
            "week_end": week_end.isoformat(),
            "sessions": scheduled_sessions,
            "unscheduled_tasks": unscheduled_tasks,
            "warnings": warnings,
            "explanations": explanations,
            "stats": {
                "total_sessions": total_sessions,
                "scheduled_hours": scheduled_minutes // 60,
                "unscheduled_count": len(unscheduled_tasks),
            },
        }

    def generate_daily_plan(
        self,
        target_date: date,
    ) -> Dict:
        """Genera una planificación para un día específico."""
        week_start = target_date - timedelta(days=target_date.weekday())
        weekly_plan = self.generate_weekly_plan(week_start)

        target_str = target_date.isoformat()
        daily_sessions = [
            s for s in weekly_plan.get("sessions", [])
            if s.get("scheduled_date") == target_str
        ]

        return {
            "success": weekly_plan["success"],
            "date": target_str,
            "sessions": daily_sessions,
            "unscheduled_tasks": weekly_plan.get("unscheduled_tasks", []),
            "warnings": weekly_plan.get("warnings", []),
            "error": weekly_plan.get("error"),
        }

    def _build_busy_blocks(
        self,
        week_start: date,
        week_end: date,
    ) -> List[Dict]:
        """Construye la lista de bloques ocupados de la semana."""
        blocks = []

        for cs in self.class_schedules:
            blocks.append({
                "day_of_week": cs.get("day_of_week"),
                "start_time": cs.get("start_time"),
                "end_time": cs.get("end_time"),
                "title": cs.get("subject_name", "Clase"),
                "type": "class",
            })

        for lab in self.laboratories:
            blocks.append({
                "date": lab.get("date"),
                "start_time": lab.get("start_time"),
                "end_time": lab.get("end_time"),
                "title": lab.get("title", "Laboratorio"),
                "type": "laboratory",
            })

        for ev in self.evaluations:
            if ev.get("start_time") and ev.get("end_time"):
                blocks.append({
                    "date": ev.get("date"),
                    "start_time": ev.get("start_time"),
                    "end_time": ev.get("end_time"),
                    "title": ev.get("title", "Evaluación"),
                    "type": "evaluation",
                })

        return blocks

    def _generate_explanations(
        self,
        sessions: List[Dict],
        unscheduled_tasks: List[Dict],
    ) -> List[str]:
        """Genera explicaciones de las decisiones del motor."""
        explanations = []

        if sessions:
            explanations.append(
                f"Se generaron {len(sessions)} sesión(es) de estudio basadas en prioridad y disponibilidad."
            )
            if sessions:
                first = sessions[0]
                explanations.append(
                    f"'{first['title']}' se programó el {first['scheduled_date']} "
                    f"de {first['start_time']} a {first['end_time']} "
                    "por tener alta prioridad y disponibilidad en ese horario."
                )

        if unscheduled_tasks:
            for ut in unscheduled_tasks:
                explanations.append(
                    f"'{ut['title']}' no pudo programarse completamente: "
                    f"{ut.get('reason', 'Tiempo insuficiente')}"
                )

        if not sessions and not unscheduled_tasks:
            explanations.append("No hay tareas pendientes para programar.")

        return explanations

    def _detect_overload(
        self,
        sessions: List[Dict],
    ) -> List[str]:
        """Detecta situaciones de sobrecarga académica."""
        warnings = []

        hours_by_day: Dict[str, int] = {}
        for s in sessions:
            d = s.get("scheduled_date", "")
            hours_by_day[d] = hours_by_day.get(d, 0) + s.get("duration_minutes", 0)

        max_daily_hours = 8
        for d, mins in hours_by_day.items():
            hours = mins / 60
            if hours > max_daily_hours:
                warnings.append(
                    f"Sobrecarga el {d}: {hours:.1f} horas de estudio programadas "
                    f"(se recomiendan máximo {max_daily_hours} h/día)."
                )

        upcoming_evals = [e for e in self.evaluations if e.get("status") == "pendiente"]
        if len(upcoming_evals) > 5:
            warnings.append(
                f"Hay {len(upcoming_evals)} evaluación(es) pendiente(s). "
                "Considere distribuir el estudio con anticipación."
            )

        return warnings


def run_planning_engine(student_data: Dict, week_start: Optional[date] = None) -> Dict:
    """Punto de entrada principal para ejecutar el motor de planificación."""
    engine = PlanningEngine(student_data)
    return engine.generate_weekly_plan(week_start)
