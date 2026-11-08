"""Herramientas controladas para el asistente IA.

Permiten al modelo consultar información académica de forma estructurada
y segura, sin acceso directo a la base de datos ni a SQL.
"""

from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from datetime import date

from app.crud.student import get_latest_student
from app.crud.subject import get_subjects_by_student
from app.crud.task import get_tasks_by_student, get_tasks_by_status, get_upcoming_tasks
from app.crud.evaluation import get_evaluations_by_student, get_upcoming_evaluations
from app.crud.class_schedule import get_class_schedules_by_student
from app.crud.laboratory import get_laboratories_by_student
from app.crud.project import get_projects_by_student
from app.crud.planning import get_sessions_by_plan, get_active_plan_by_student


# Lista permitida de herramientas (solo lectura por defecto)
ALLOWED_READ_TOOLS = {
    "get_subjects",
    "get_tasks",
    "get_tasks_by_status",
    "get_upcoming_tasks",
    "get_evaluations",
    "get_upcoming_evaluations",
    "get_class_schedules",
    "get_laboratories",
    "get_projects",
    "get_current_plan",
    "get_student_profile",
}

# Herramientas que requieren confirmación del usuario antes de ejecutar
MUTATING_TOOLS = {
    "generate_weekly_plan",
    "regenerate_weekly_plan",
}


def get_available_tools() -> List[Dict[str, Any]]:
    """Retorna la lista de herramientas disponibles con sus schemas."""
    return [
        {
            "name": "get_student_profile",
            "description": "Obtiene el perfil académico del estudiante.",
            "parameters": {},
            "read_only": True,
        },
        {
            "name": "get_subjects",
            "description": "Lista todas las materias registradas del estudiante.",
            "parameters": {},
            "read_only": True,
        },
        {
            "name": "get_tasks",
            "description": "Lista todas las tareas del estudiante.",
            "parameters": {},
            "read_only": True,
        },
        {
            "name": "get_tasks_by_status",
            "description": "Lista tareas filtradas por estado (pendiente, en_progreso, completada).",
            "parameters": {
                "status": {"type": "string", "description": "Estado de las tareas"}
            },
            "read_only": True,
        },
        {
            "name": "get_upcoming_tasks",
            "description": "Lista tareas con fecha de entrega futura o hoy.",
            "parameters": {},
            "read_only": True,
        },
        {
            "name": "get_evaluations",
            "description": "Lista todas las evaluaciones del estudiante.",
            "parameters": {},
            "read_only": True,
        },
        {
            "name": "get_upcoming_evaluations",
            "description": "Lista evaluaciones próximas (hoy en adelante).",
            "parameters": {},
            "read_only": True,
        },
        {
            "name": "get_class_schedules",
            "description": "Lista los horarios de clases registrados.",
            "parameters": {},
            "read_only": True,
        },
        {
            "name": "get_laboratories",
            "description": "Lista los laboratorios registrados.",
            "parameters": {},
            "read_only": True,
        },
        {
            "name": "get_projects",
            "description": "Lista los proyectos académicos registrados.",
            "parameters": {},
            "read_only": True,
        },
        {
            "name": "get_current_plan",
            "description": "Obtiene la planificación semanal activa actual.",
            "parameters": {},
            "read_only": True,
        },
        {
            "name": "generate_weekly_plan",
            "description": "Genera una nueva planificación semanal usando el motor determinista. Requiere confirmación.",
            "parameters": {
                "week_start_date": {"type": "string", "description": "Fecha de inicio de la semana (YYYY-MM-DD), opcional"}
            },
            "read_only": False,
        },
        {
            "name": "regenerate_weekly_plan",
            "description": "Regenera la planificación semanal (sobrescribe la existente). Requiere confirmación.",
            "parameters": {
                "week_start_date": {"type": "string", "description": "Fecha de inicio de la semana (YYYY-MM-DD), opcional"}
            },
            "read_only": False,
        },
    ]


class AITools:
    """Ejecuta herramientas controladas para el asistente IA."""

    def __init__(self, db: Session, student_id: int):
        self.db = db
        self.student_id = student_id
        self.student = get_latest_student(db)

    def execute(self, tool_name: str, parameters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Ejecuta una herramienta controlada y retorna el resultado."""
        parameters = parameters or {}

        if tool_name not in ALLOWED_READ_TOOLS and tool_name not in MUTATING_TOOLS:
            return {
                "tool": tool_name,
                "success": False,
                "error": f"Herramienta no permitida: {tool_name}",
            }

        try:
            if tool_name == "get_student_profile":
                return self._get_student_profile()
            elif tool_name == "get_subjects":
                return self._get_subjects()
            elif tool_name == "get_tasks":
                return self._get_tasks()
            elif tool_name == "get_tasks_by_status":
                return self._get_tasks_by_status(parameters.get("status"))
            elif tool_name == "get_upcoming_tasks":
                return self._get_upcoming_tasks()
            elif tool_name == "get_evaluations":
                return self._get_evaluations()
            elif tool_name == "get_upcoming_evaluations":
                return self._get_upcoming_evaluations()
            elif tool_name == "get_class_schedules":
                return self._get_class_schedules()
            elif tool_name == "get_laboratories":
                return self._get_laboratories()
            elif tool_name == "get_projects":
                return self._get_projects()
            elif tool_name == "get_current_plan":
                return self._get_current_plan()
            elif tool_name == "generate_weekly_plan":
                return self._generate_weekly_plan(parameters)
            elif tool_name == "regenerate_weekly_plan":
                return self._regenerate_weekly_plan(parameters)
            else:
                return {
                    "tool": tool_name,
                    "success": False,
                    "error": f"Herramienta no implementada: {tool_name}",
                }
        except Exception as e:
            return {
                "tool": tool_name,
                "success": False,
                "error": str(e),
            }

    # ── Implementaciones de herramientas ──────────────────────────

    def _get_student_profile(self) -> Dict[str, Any]:
        if not self.student:
            return {"tool": "get_student_profile", "success": False, "error": "No hay estudiante configurado"}
        return {
            "tool": "get_student_profile",
            "success": True,
            "data": {
                "name": self.student.name,
                "career": self.student.career,
                "semester": self.student.semester,
                "institution": self.student.institution,
                "academic_year": self.student.academic_year,
                "faculty": self.student.faculty,
            },
        }

    def _get_subjects(self) -> Dict[str, Any]:
        from app.crud.subject import get_subjects_by_student
        subjects = get_subjects_by_student(self.db, self.student_id)
        return {
            "tool": "get_subjects",
            "success": True,
            "data": [
                {
                    "id": s.id,
                    "name": s.name,
                    "code": s.code,
                    "teacher": s.teacher,
                    "classroom": s.classroom,
                    "cycle": s.cycle,
                    "is_favorite": s.is_favorite,
                    "color": s.color,
                }
                for s in subjects
            ],
        }

    def _get_tasks(self) -> Dict[str, Any]:
        from app.crud.task import get_tasks_by_student
        tasks = get_tasks_by_student(self.db, self.student_id)
        return {
            "tool": "get_tasks",
            "success": True,
            "data": [
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
        }

    def _get_tasks_by_status(self, status: Optional[str]) -> Dict[str, Any]:
        from app.crud.task import get_tasks_by_status
        if not status:
            return {"tool": "get_tasks_by_status", "success": False, "error": "Se requiere parámetro 'status'"}
        tasks = get_tasks_by_status(self.db, self.student_id, status)
        return {
            "tool": "get_tasks_by_status",
            "success": True,
            "data": [
                {
                    "id": t.id,
                    "title": t.title,
                    "subject_id": t.subject_id,
                    "due_date": t.due_date.isoformat() if t.due_date else None,
                    "priority": t.priority,
                    "status": t.status,
                }
                for t in tasks
            ],
        }

    def _get_upcoming_tasks(self) -> Dict[str, Any]:
        from app.crud.task import get_upcoming_tasks
        tasks = get_upcoming_tasks(self.db, self.student_id)
        return {
            "tool": "get_upcoming_tasks",
            "success": True,
            "data": [
                {
                    "id": t.id,
                    "title": t.title,
                    "subject_id": t.subject_id,
                    "due_date": t.due_date.isoformat() if t.due_date else None,
                    "priority": t.priority,
                    "status": t.status,
                }
                for t in tasks
            ],
        }

    def _get_evaluations(self) -> Dict[str, Any]:
        from app.crud.evaluation import get_evaluations_by_student
        evaluations = get_evaluations_by_student(self.db, self.student_id)
        return {
            "tool": "get_evaluations",
            "success": True,
            "data": [
                {
                    "id": e.id,
                    "title": e.title,
                    "subject_id": e.subject_id,
                    "type": e.evaluation_type,
                    "date": e.date.isoformat() if e.date else None,
                    "weight_percentage": e.weight_percentage,
                    "grade": e.grade,
                    "status": e.status,
                    "preparation_level": e.preparation_level,
                }
                for e in evaluations
            ],
        }

    def _get_upcoming_evaluations(self) -> Dict[str, Any]:
        from app.crud.evaluation import get_upcoming_evaluations
        evaluations = get_upcoming_evaluations(self.db, self.student_id)
        return {
            "tool": "get_upcoming_evaluations",
            "success": True,
            "data": [
                {
                    "id": e.id,
                    "title": e.title,
                    "subject_id": e.subject_id,
                    "type": e.evaluation_type,
                    "date": e.date.isoformat() if e.date else None,
                    "weight_percentage": e.weight_percentage,
                    "grade": e.grade,
                    "status": e.status,
                }
                for e in evaluations
            ],
        }

    def _get_class_schedules(self) -> Dict[str, Any]:
        schedules = get_class_schedules_by_student(self.db, self.student_id)
        return {
            "tool": "get_class_schedules",
            "success": True,
            "data": [
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
            ],
        }

    def _get_laboratories(self) -> Dict[str, Any]:
        laboratories = get_laboratories_by_student(self.db, self.student_id)
        return {
            "tool": "get_laboratories",
            "success": True,
            "data": [
                {
                    "id": l.id,
                    "title": l.title,
                    "subject_id": l.subject_id,
                    "date": l.date.isoformat() if l.date else None,
                    "start_time": l.start_time,
                    "end_time": l.end_time,
                    "location": l.location,
                    "status": l.status,
                }
                for l in laboratories
            ],
        }

    def _get_projects(self) -> Dict[str, Any]:
        projects = get_projects_by_student(self.db, self.student_id)
        return {
            "tool": "get_projects",
            "success": True,
            "data": [
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
                for p in projects
            ],
        }

    def _get_current_plan(self) -> Dict[str, Any]:
        from app.crud.planning import get_active_plan_by_student, get_sessions_by_plan
        plan = get_active_plan_by_student(self.db, self.student_id)
        if not plan:
            return {"tool": "get_current_plan", "success": True, "data": {"has_plan": False}}
        sessions = get_sessions_by_plan(self.db, plan.id)
        return {
            "tool": "get_current_plan",
            "success": True,
            "data": {
                "has_plan": True,
                "week_start": plan.week_start_date.isoformat() if plan.week_start_date else None,
                "week_end": plan.week_end_date.isoformat() if plan.week_end_date else None,
                "total_sessions": plan.total_sessions,
                "scheduled_hours": plan.scheduled_hours,
                "unscheduled_tasks": plan.unscheduled_tasks,
                "sessions": [
                    {
                        "id": s.id,
                        "title": s.title,
                        "scheduled_date": s.scheduled_date.isoformat() if s.scheduled_date else None,
                        "start_time": s.start_time,
                        "end_time": s.end_time,
                        "duration_minutes": s.duration_minutes,
                        "status": s.status,
                    }
                    for s in sessions
                ],
            },
        }

    def _generate_weekly_plan(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        from app.services.planning.engine import run_planning_engine
        from app.crud.student import get_latest_student
        from app.crud.subject import get_subjects_by_student
        from app.crud.task import get_tasks_by_student
        from app.crud.evaluation import get_evaluations_by_student
        from app.crud.class_schedule import get_class_schedules_by_student
        from app.crud.laboratory import get_laboratories_by_student
        from app.crud.weekly_availability import get_availability_by_student
        from app.crud.student_preference import get_preference_by_student

        student = get_latest_student(self.db)
        if not student:
            return {"tool": "generate_weekly_plan", "success": False, "error": "No hay estudiante configurado"}

        week_start_str = parameters.get("week_start_date")
        week_start = None
        if week_start_str:
            from datetime import date
            week_start = date.fromisoformat(week_start_str)

        # Construir datos para el motor
        student_data = {
            "student": {"id": student.id, "name": student.name, "career": student.career},
            "subjects": [{"id": s.id, "name": s.name, "code": s.code, "color": s.color} for s in get_subjects_by_student(self.db, student.id)],
            "tasks": [{"id": t.id, "title": t.title, "subject_id": t.subject_id, "due_date": t.due_date.isoformat() if t.due_date else None, "priority": t.priority, "status": t.status, "estimated_minutes": t.estimated_minutes} for t in get_tasks_by_student(self.db, student.id)],
            "evaluations": [{"id": e.id, "title": e.title, "subject_id": e.subject_id, "date": e.date.isoformat() if e.date else None, "start_time": e.start_time, "end_time": e.end_time, "status": e.status, "evaluation_type": e.evaluation_type} for e in get_evaluations_by_student(self.db, student.id)],
            "class_schedules": [{"id": c.id, "subject_id": c.subject_id, "day_of_week": c.day_of_week, "start_time": c.start_time, "end_time": c.end_time, "subject_name": None} for c in get_class_schedules_by_student(self.db, student.id)],
            "laboratories": [{"id": l.id, "title": l.title, "date": l.date.isoformat() if l.date else None, "start_time": l.start_time, "end_time": l.end_time} for l in get_laboratories_by_student(self.db, student.id)],
            "weekly_availability": [{"day_of_week": a.day_of_week, "is_available": a.is_available, "start_time": a.start_time, "end_time": a.end_time} for a in get_availability_by_student(self.db, student.id)],
            "preferences": {
                "usual_start_time": None,
                "usual_sleep_time": None,
                "preferred_study_session_minutes": 60,
                "preferred_break_minutes": 15,
                "planning_preference": "daily",
            },
        }

        pref = get_preference_by_student(self.db, student.id)
        if pref:
            student_data["preferences"] = {
                "usual_start_time": pref.usual_start_time,
                "usual_sleep_time": pref.usual_sleep_time,
                "preferred_study_session_minutes": pref.preferred_study_session_minutes,
                "preferred_break_minutes": pref.preferred_break_minutes,
                "planning_preference": pref.planning_preference,
            }

        result = run_planning_engine(student_data, week_start)

        if not result["success"]:
            return {"tool": "generate_weekly_plan", "success": False, "error": result.get("error")}

        return {
            "tool": "generate_weekly_plan",
            "success": True,
            "data": {
                "week_start": result["week_start"],
                "week_end": result["week_end"],
                "total_sessions": result["stats"]["total_sessions"],
                "scheduled_hours": result["stats"]["scheduled_hours"],
                "unscheduled_count": result["stats"]["unscheduled_count"],
                "warnings": result.get("warnings", []),
                "explanations": result.get("explanations", []),
                "sessions": result.get("sessions", []),
            },
        }

    def _regenerate_weekly_plan(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        # Regenerar es lo mismo que generar (el endpoint de regenerate ya maneja sobrescribir)
        return self._generate_weekly_plan(parameters)
