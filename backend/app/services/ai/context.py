"""Servicio de recuperación de contexto académico para el asistente IA.

Consulta únicamente la información relevante de la base de datos
para incluirla como contexto en las respuestas del asistente, sin
enviar toda la base de datos.
"""

from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from datetime import date, datetime

from app.crud.student import get_latest_student
from app.crud.subject import get_subjects_by_student
from app.crud.task import get_tasks_by_student, get_tasks_by_status, get_upcoming_tasks
from app.crud.evaluation import get_evaluations_by_student, get_upcoming_evaluations
from app.crud.class_schedule import get_class_schedules_by_student, get_class_schedule_by_day
from app.crud.laboratory import get_laboratories_by_student
from app.crud.project import get_projects_by_student
from app.crud.planning import get_sessions_by_plan, get_active_plan_by_student
from app.crud.weekly_availability import get_availability_by_student
from app.crud.student_preference import get_preference_by_student


class AcademicContext:
    """Recupera y formatea el contexto académico para el asistente IA."""

    def __init__(self, db: Session, student_id: int):
        self.db = db
        self.student_id = student_id
        self.student = None
        self._load_student()

    def _load_student(self):
        self.student = get_latest_student(self.db)

    def get_full_context(self) -> Dict[str, Any]:
        """Obtiene el contexto académico completo (resumido)."""
        if not self.student:
            return {"error": "No hay estudiante configurado"}

        return {
            "student": self._student_summary(),
            "subjects": self._subjects_summary(),
            "upcoming_tasks": self._tasks_summary(),
            "upcoming_evaluations": self._evaluations_summary(),
            "weekly_schedule": self._weekly_schedule_summary(),
            "projects": self._projects_summary(),
            "current_plan": self._current_plan_summary(),
            "availability": self._availability_summary(),
        }

    def get_context_for_query(self, query: str) -> Dict[str, Any]:
        """
        Obtiene contexto filtrado según la consulta del usuario.
        Detecta palabras clave para incluir solo lo relevante.
        """
        query_lower = query.lower()
        context = {"student": self._student_summary() if self.student else {}}

        # Palabras clave para detectar qué información incluir
        keywords = {
            "materia": "subjects",
            "materias": "subjects",
            "clase": "weekly_schedule",
            "clases": "weekly_schedule",
            "horario": "weekly_schedule",
            "horarios": "weekly_schedule",
            "tarea": "upcoming_tasks",
            "tareas": "upcoming_tasks",
            "entrega": "upcoming_tasks",
            "examen": "upcoming_evaluations",
            "exámenes": "upcoming_evaluations",
            "evaluación": "upcoming_evaluations",
            "evaluaciones": "upcoming_evaluations",
            "parcial": "upcoming_evaluations",
            "proyecto": "projects",
            "proyectos": "projects",
            "disponibilidad": "availability",
            "semana": "current_plan",
            "plan": "current_plan",
            "planificación": "current_plan",
        }

        for keyword, section in keywords.items():
            if keyword in query_lower:
                if section == "subjects":
                    context["subjects"] = self._subjects_summary()
                elif section == "upcoming_tasks":
                    context["upcoming_tasks"] = self._tasks_summary()
                elif section == "upcoming_evaluations":
                    context["upcoming_evaluations"] = self._evaluations_summary()
                elif section == "weekly_schedule":
                    context["weekly_schedule"] = self._weekly_schedule_summary()
                elif section == "projects":
                    context["projects"] = self._projects_summary()
                elif section == "current_plan":
                    context["current_plan"] = self._current_plan_summary()
                elif section == "availability":
                    context["availability"] = self._availability_summary()

        return context

    def _student_summary(self) -> Dict[str, Any]:
        if not self.student:
            return {}
        return {
            "name": self.student.name,
            "career": self.student.career,
            "semester": self.student.semester,
            "institution": self.student.institution,
        }

    def _subjects_summary(self) -> List[Dict[str, Any]]:
        subjects = get_subjects_by_student(self.db, self.student_id)
        return [
            {
                "id": s.id,
                "name": s.name,
                "code": s.code,
                "teacher": s.teacher,
                "classroom": s.classroom,
                "color": s.color,
            }
            for s in subjects
        ]

    def _tasks_summary(self) -> List[Dict[str, Any]]:
        tasks = get_upcoming_tasks(self.db, self.student_id)
        return [
            {
                "id": t.id,
                "title": t.title,
                "subject_id": t.subject_id,
                "due_date": t.due_date.isoformat() if t.due_date else None,
                "priority": t.priority,
                "status": t.status,
                "estimated_minutes": t.estimated_minutes,
            }
            for t in tasks[:10]  # Limitar para no saturar
        ]

    def _evaluations_summary(self) -> List[Dict[str, Any]]:
        evaluations = get_upcoming_evaluations(self.db, self.student_id)
        return [
            {
                "id": e.id,
                "title": e.title,
                "subject_id": e.subject_id,
                "type": e.evaluation_type,
                "date": e.date.isoformat() if e.date else None,
                "weight_percentage": e.weight_percentage,
                "status": e.status,
                "preparation_level": e.preparation_level,
            }
            for e in evaluations[:10]
        ]

    def _weekly_schedule_summary(self) -> List[Dict[str, Any]]:
        schedules = get_class_schedules_by_student(self.db, self.student_id)
        return [
            {
                "id": c.id,
                "subject_id": c.subject_id,
                "day_of_week": c.day_of_week,
                "start_time": c.start_time,
                "end_time": c.end_time,
                "room": c.room,
                "modality": c.modality,
            }
            for c in schedules
        ]

    def _projects_summary(self) -> List[Dict[str, Any]]:
        projects = get_projects_by_student(self.db, self.student_id)
        return [
            {
                "id": p.id,
                "name": p.name,
                "subject_id": p.subject_id,
                "start_date": p.start_date.isoformat() if p.start_date else None,
                "due_date": p.due_date.isoformat() if p.due_date else None,
                "priority": p.priority,
                "status": p.status,
                "progress_percentage": p.progress_percentage,
            }
            for p in projects[:10]
        ]

    def _current_plan_summary(self) -> Dict[str, Any]:
        plan = get_active_plan_by_student(self.db, self.student_id)
        if not plan:
            return {"has_plan": False}
        sessions = get_sessions_by_plan(self.db, plan.id)
        return {
            "has_plan": True,
            "week_start": plan.week_start_date.isoformat() if plan.week_start_date else None,
            "week_end": plan.week_end_date.isoformat() if plan.week_end_date else None,
            "total_sessions": plan.total_sessions,
            "scheduled_hours": plan.scheduled_hours,
            "unscheduled_tasks": plan.unscheduled_tasks,
            "sessions_count": len(sessions),
        }

    def _availability_summary(self) -> List[Dict[str, Any]]:
        availability = get_availability_by_student(self.db, self.student_id)
        return [
            {
                "day_of_week": a.day_of_week,
                "is_available": a.is_available,
                "start_time": a.start_time,
                "end_time": a.end_time,
            }
            for a in availability
        ]

    def format_context_for_prompt(self, context: Dict[str, Any]) -> str:
        """Formatea el contexto como texto para incluir en el prompt del sistema."""
        lines = ["Contexto académico del estudiante:"]

        if context.get("student"):
            s = context["student"]
            lines.append(f"- Estudiante: {s.get('name', 'N/A')}")
            lines.append(f"- Carrera: {s.get('career', 'N/A')}")
            lines.append(f"- Semestre: {s.get('semester', 'N/A')}")

        if context.get("subjects"):
            lines.append("\nMaterias registradas:")
            for subj in context["subjects"][:10]:
                lines.append(f"  - {subj['name']} ({subj.get('code', 'N/A')}) - {subj.get('teacher', 'N/A')}")

        if context.get("upcoming_tasks"):
            lines.append("\nTareas pendientes próximas:")
            for task in context["upcoming_tasks"][:10]:
                lines.append(f"  - {task['title']} (vence: {task.get('due_date', 'N/A')}, prioridad: {task.get('priority', 'N/A')})")

        if context.get("upcoming_evaluations"):
            lines.append("\nEvaluaciones próximas:")
            for eval_item in context["upcoming_evaluations"][:10]:
                lines.append(f"  - {eval_item['title']} ({eval_item.get('type', 'N/A')}) - {eval_item.get('date', 'N/A')}")

        if context.get("current_plan", {}).get("has_plan"):
            cp = context["current_plan"]
            lines.append(f"\nPlanificación semanal activa: {cp['total_sessions']} sesiones, {cp['scheduled_hours']} horas programadas")

        return "\n".join(lines)


def get_academic_context(db: Session, student_id: int) -> AcademicContext:
    """Factory para crear una instancia de AcademicContext."""
    return AcademicContext(db, student_id)
