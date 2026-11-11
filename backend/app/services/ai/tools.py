"""Herramientas controladas para el asistente IA.

Permiten al modelo consultar y modificar información académica de forma
estructurada y segura, sin acceso directo a la base de datos ni a SQL.

Reglas:
- Toda la validación ocurre en el backend con los schemas Pydantic.
- Las operaciones destructivas no se exponen (el agente no puede borrar).
- Las modificaciones de datos existentes (actualizar materias/tareas,
  completar tareas, registrar notas, horarios y regenerar el plan)
  requieren confirmación explícita del usuario.
- Las operaciones de planificación usan el motor determinista.
"""

from datetime import date
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.crud.class_schedule import (
    create_class_schedule,
    get_class_schedule,
    get_class_schedules_by_student,
    update_class_schedule,
)
from app.crud.evaluation import (
    create_evaluation,
    get_evaluations_by_student,
    update_evaluation,
)
from app.crud.laboratory import get_laboratories_by_student, update_laboratory
from app.crud.planning import get_active_plan_by_student, get_sessions_by_plan
from app.crud.project import create_project, get_projects_by_student
from app.crud.student import get_latest_student
from app.crud.subject import (
    create_subject,
    get_subject,
    get_subject_by_code,
    get_subjects_by_student,
    update_subject,
)
from app.crud.task import create_task, get_tasks_by_student, update_task
from app.schemas.class_schedule import ClassScheduleCreate, ClassScheduleUpdate
from app.schemas.evaluation import EvaluationCreate, EvaluationUpdate
from app.schemas.project import ProjectCreate
from app.schemas.subject import SubjectCreate, SubjectUpdate
from app.schemas.task import TaskCreate, TaskUpdate
from app.services.academic import ensure_subject_defaults, get_subject_academic_items
from app.services.schedule_conflicts import (
    check_new_schedule_conflicts,
    detect_schedule_conflicts,
    normalize_day,
)

# ── Catálogo de herramientas ────────────────────────────────────────
#
# read_only: no modifica datos.
# requires_confirmation: exige confirmación explícita del usuario antes
#   de ejecutarse (parámetro `confirmed: true`).

READ_TOOLS = {
    "get_student_profile",
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
    "get_academic_report",
    "detect_schedule_conflicts",
}

# Alias histórico conservado por compatibilidad
ALLOWED_READ_TOOLS = READ_TOOLS

# Herramientas que modifican datos existentes: requieren confirmación
CONFIRMATION_REQUIRED_TOOLS = {
    "update_subject",
    "update_task",
    "complete_task",
    "create_class_schedule",
    "update_class_schedule",
    "register_grade",
    "generate_weekly_plan",
    "regenerate_weekly_plan",
}

# Alias histórico (todas las herramientas que mutan datos)
MUTATING_TOOLS = CONFIRMATION_REQUIRED_TOOLS | {
    "create_subject",
    "create_task",
    "create_project",
    "create_evaluation",
}

VALID_PRIORITIES = {"baja", "media", "alta", "urgente"}
VALID_TASK_STATUSES = {"pendiente", "en_progreso", "completada"}
VALID_EVALUATION_TYPES = {
    "parcial",
    "final",
    "quiz",
    "practico",
    "exposicion",
    "proyecto",
    "laboratorio",
    "otro",
}
VALID_MODALITIES = {"presencial", "virtual", "hybrid"}


def _tool_meta(
    name: str,
    description: str,
    parameters: Optional[Dict[str, Any]] = None,
    *,
    read_only: bool = True,
    requires_confirmation: bool = False,
) -> Dict[str, Any]:
    return {
        "name": name,
        "description": description,
        "parameters": parameters or {},
        "read_only": read_only,
        "requires_confirmation": requires_confirmation,
    }


def get_available_tools() -> List[Dict[str, Any]]:
    """Retorna la lista de herramientas disponibles con sus schemas."""
    return [
        _tool_meta("get_student_profile", "Obtiene el perfil académico del estudiante."),
        _tool_meta("get_subjects", "Lista todas las materias registradas del estudiante."),
        _tool_meta(
            "get_tasks",
            "Lista todas las tareas del estudiante con su estado y fecha límite.",
        ),
        _tool_meta(
            "get_tasks_by_status",
            "Lista tareas filtradas por estado (pendiente, en_progreso, completada).",
            {"status": {"type": "string", "description": "Estado de las tareas"}},
        ),
        _tool_meta(
            "get_upcoming_tasks",
            "Lista tareas con fecha de entrega futura o hoy.",
        ),
        _tool_meta(
            "get_evaluations",
            "Lista todas las evaluaciones (parciales, exámenes, quizzes) con nota y estado.",
        ),
        _tool_meta(
            "get_upcoming_evaluations",
            "Lista evaluaciones próximas (hoy en adelante).",
        ),
        _tool_meta(
            "get_class_schedules",
            "Lista los horarios de clases semanales registrados.",
        ),
        _tool_meta("get_laboratories", "Lista los laboratorios registrados."),
        _tool_meta("get_projects", "Lista los proyectos académicos registrados."),
        _tool_meta(
            "get_current_plan",
            "Obtiene la planificación semanal activa actual generada por el planificador.",
        ),
        _tool_meta(
            "get_academic_report",
            (
                "Genera un informe académico completo con datos reales: materias, "
                "promedios ponderados, parciales aprobados, tareas completadas y "
                "atrasadas, conflictos y evolución del rendimiento. No inventa datos."
            ),
            {
                "passing_grade": {
                    "type": "number",
                    "description": "Umbral de aprobación (por defecto 51)",
                }
            },
        ),
        _tool_meta(
            "detect_schedule_conflicts",
            (
                "Detecta conflictos reales entre horarios de clase y laboratorios, "
                "y sobrecargas académicas (evaluaciones o entregas concentradas)."
            ),
        ),
        _tool_meta(
            "create_subject",
            "Crea una materia nueva (nace con 4 parciales y 4 laboratorios vacíos).",
            {
                "name": {"type": "string", "description": "Nombre de la materia (requerido)"},
                "code": {"type": "string", "description": "Código de la materia"},
                "teacher": {"type": "string", "description": "Nombre del docente"},
                "classroom": {"type": "string", "description": "Aula habitual"},
                "cycle": {"type": "integer", "description": "Ciclo (1-20)"},
                "color": {"type": "string", "description": "Color hexadecimal"},
                "description": {"type": "string", "description": "Descripción"},
            },
        ),
        _tool_meta(
            "update_subject",
            "Actualiza los datos de una materia existente. Requiere confirmación.",
            {
                "subject": {"type": "string", "description": "ID o nombre de la materia (requerido)"},
                "name": {"type": "string"},
                "code": {"type": "string"},
                "teacher": {"type": "string"},
                "classroom": {"type": "string"},
                "cycle": {"type": "integer"},
                "description": {"type": "string"},
                "color": {"type": "string"},
                "is_favorite": {"type": "boolean"},
            },
            read_only=False,
            requires_confirmation=True,
        ),
        _tool_meta(
            "create_task",
            "Crea una tarea nueva.",
            {
                "title": {"type": "string", "description": "Título de la tarea (requerido)"},
                "subject": {"type": "string", "description": "ID o nombre de la materia"},
                "due_date": {"type": "string", "description": "Fecha límite (YYYY-MM-DD)"},
                "due_time": {"type": "string", "description": "Hora límite (HH:MM)"},
                "priority": {"type": "string", "description": "baja, media, alta o urgente"},
                "estimated_minutes": {"type": "integer", "description": "Minutos estimados (1-480)"},
                "description": {"type": "string"},
                "assigned_date": {"type": "string", "description": "Fecha de asignación (YYYY-MM-DD)"},
            },
        ),
        _tool_meta(
            "update_task",
            "Actualiza una tarea existente. Requiere confirmación.",
            {
                "task": {"type": "string", "description": "ID o título de la tarea (requerido)"},
                "title": {"type": "string"},
                "subject": {"type": "string", "description": "ID o nombre de la materia"},
                "due_date": {"type": "string"},
                "due_time": {"type": "string"},
                "priority": {"type": "string"},
                "status": {"type": "string", "description": "pendiente, en_progreso o completada"},
                "estimated_minutes": {"type": "integer"},
                "description": {"type": "string"},
            },
            read_only=False,
            requires_confirmation=True,
        ),
        _tool_meta(
            "complete_task",
            "Marca una tarea como completada. Requiere confirmación.",
            {
                "task": {"type": "string", "description": "ID o título de la tarea (requerido)"},
                "observations": {"type": "string", "description": "Observaciones finales"},
            },
            read_only=False,
            requires_confirmation=True,
        ),
        _tool_meta(
            "create_project",
            "Crea un proyecto académico nuevo.",
            {
                "name": {"type": "string", "description": "Nombre del proyecto (requerido)"},
                "subject": {"type": "string", "description": "ID o nombre de la materia"},
                "start_date": {"type": "string", "description": "Fecha de inicio (YYYY-MM-DD, requerida)"},
                "due_date": {"type": "string", "description": "Fecha límite (YYYY-MM-DD, requerida)"},
                "priority": {"type": "string"},
                "description": {"type": "string"},
                "progress_percentage": {"type": "integer", "description": "Avance 0-100"},
            },
        ),
        _tool_meta(
            "create_evaluation",
            "Registra una evaluación nueva (parcial, examen, quiz, exposición...).",
            {
                "subject": {"type": "string", "description": "ID o nombre de la materia (requerido)"},
                "evaluation_type": {
                    "type": "string",
                    "description": "parcial, final, quiz, practico, exposicion, proyecto, laboratorio u otro (requerido)",
                },
                "title": {"type": "string", "description": "Título de la evaluación"},
                "date": {"type": "string", "description": "Fecha (YYYY-MM-DD)"},
                "start_time": {"type": "string", "description": "Hora de inicio (HH:MM)"},
                "end_time": {"type": "string", "description": "Hora de fin (HH:MM)"},
                "weight_percentage": {"type": "number", "description": "Ponderación 0-100"},
                "topics": {"type": "string", "description": "Temas a evaluar"},
                "description": {"type": "string"},
            },
        ),
        _tool_meta(
            "register_grade",
            (
                "Registra la nota de un parcial o laboratorio existente y, por "
                "defecto, lo marca como realizado con fecha. Requiere confirmación."
            ),
            {
                "subject": {"type": "string", "description": "ID o nombre de la materia (requerido)"},
                "item_type": {"type": "string", "description": "parcial o laboratorio (requerido)"},
                "item": {"type": "string", "description": "ID o título del ítem, p. ej. 'Parcial 1' (requerido)"},
                "grade": {"type": "number", "description": "Nota obtenida 0-100 (requerida)"},
                "weight_percentage": {"type": "number", "description": "Ponderación 0-100"},
                "completed": {"type": "boolean", "description": "Marcar como realizado (por defecto true)"},
                "date": {"type": "string", "description": "Fecha de realización (YYYY-MM-DD)"},
            },
            read_only=False,
            requires_confirmation=True,
        ),
        _tool_meta(
            "create_class_schedule",
            (
                "Registra un horario de clase semanal. Detecta conflictos con los "
                "horarios existentes antes de crear: si encuentra un conflicto no "
                "crea nada y lo reporta (salvo allow_conflict=true). "
                "Requiere confirmación."
            ),
            {
                "subject": {"type": "string", "description": "ID o nombre de la materia (requerido)"},
                "day_of_week": {"type": "string", "description": "Día de la semana (lunes..domingo, requerido)"},
                "start_time": {"type": "string", "description": "Hora de inicio HH:MM (requerido)"},
                "end_time": {"type": "string", "description": "Hora de fin HH:MM (requerido)"},
                "room": {"type": "string", "description": "Aula"},
                "modality": {"type": "string", "description": "presencial, virtual o hybrid"},
                "teacher": {"type": "string", "description": "Docente"},
                "observations": {"type": "string"},
                "allow_conflict": {"type": "boolean", "description": "Crear aun con conflicto"},
            },
            read_only=False,
            requires_confirmation=True,
        ),
        _tool_meta(
            "update_class_schedule",
            "Modifica un horario de clase existente. Requiere confirmación.",
            {
                "schedule_id": {"type": "integer", "description": "ID del horario (requerido)"},
                "day_of_week": {"type": "string"},
                "start_time": {"type": "string"},
                "end_time": {"type": "string"},
                "room": {"type": "string"},
                "modality": {"type": "string"},
                "observations": {"type": "string"},
                "allow_conflict": {"type": "boolean", "description": "Guardar aun con conflicto"},
            },
            read_only=False,
            requires_confirmation=True,
        ),
        _tool_meta(
            "generate_weekly_plan",
            (
                "Genera una nueva planificación semanal con el motor determinista "
                "(prioriza por fecha límite y prioridad, respeta disponibilidad y "
                "horarios). Requiere confirmación."
            ),
            {
                "week_start_date": {
                    "type": "string",
                    "description": "Fecha de inicio de la semana (YYYY-MM-DD), opcional",
                }
            },
            read_only=False,
            requires_confirmation=True,
        ),
        _tool_meta(
            "regenerate_weekly_plan",
            "Regenera la planificación semanal (sobrescribe la existente). Requiere confirmación.",
            {
                "week_start_date": {
                    "type": "string",
                    "description": "Fecha de inicio de la semana (YYYY-MM-DD), opcional",
                }
            },
            read_only=False,
            requires_confirmation=True,
        ),
    ]


class AITools:
    """Ejecuta herramientas controladas para el asistente IA."""

    def __init__(self, db: Session, student_id: int):
        self.db = db
        self.student_id = student_id
        self.student = get_latest_student(db)

    # ── Despacho ───────────────────────────────────────────────────

    def execute(self, tool_name: str, parameters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Ejecuta una herramienta controlada y retorna el resultado."""
        parameters = parameters or {}

        if tool_name not in READ_TOOLS and tool_name not in MUTATING_TOOLS:
            return {
                "tool": tool_name,
                "success": False,
                "error": f"Herramienta no permitida: {tool_name}",
            }

        if tool_name in CONFIRMATION_REQUIRED_TOOLS and not parameters.get("confirmed"):
            return {
                "tool": tool_name,
                "success": False,
                "requires_confirmation": True,
                "error": (
                    f"La herramienta '{tool_name}' modifica información existente y "
                    "requiere confirmación explícita del usuario."
                ),
            }

        handlers = {
            "get_student_profile": self._get_student_profile,
            "get_subjects": self._get_subjects,
            "get_tasks": self._get_tasks,
            "get_tasks_by_status": self._get_tasks_by_status,
            "get_upcoming_tasks": self._get_upcoming_tasks,
            "get_evaluations": self._get_evaluations,
            "get_upcoming_evaluations": self._get_upcoming_evaluations,
            "get_class_schedules": self._get_class_schedules,
            "get_laboratories": self._get_laboratories,
            "get_projects": self._get_projects,
            "get_current_plan": self._get_current_plan,
            "get_academic_report": self._get_academic_report,
            "detect_schedule_conflicts": self._detect_schedule_conflicts,
            "create_subject": self._create_subject,
            "update_subject": self._update_subject,
            "create_task": self._create_task,
            "update_task": self._update_task,
            "complete_task": self._complete_task,
            "create_project": self._create_project,
            "create_evaluation": self._create_evaluation,
            "register_grade": self._register_grade,
            "create_class_schedule": self._create_class_schedule,
            "update_class_schedule": self._update_class_schedule,
            "generate_weekly_plan": self._generate_weekly_plan,
            "regenerate_weekly_plan": self._regenerate_weekly_plan,
        }

        handler = handlers.get(tool_name)
        if not handler:
            return {
                "tool": tool_name,
                "success": False,
                "error": f"Herramienta no implementada: {tool_name}",
            }

        try:
            return handler(parameters)
        except ValueError as e:
            # Errores de validación controlados: el modelo puede corregir
            # los parámetros e reintentar.
            return {"tool": tool_name, "success": False, "validation_error": True, "error": str(e)}
        except Exception as e:  # noqa: BLE001
            return {"tool": tool_name, "success": False, "error": str(e)}

    # ── Resolución de entidades por ID o nombre ────────────────────

    def _resolve_subject(self, ref: Any) -> "object":
        """Resuelve una materia por ID o nombre (exacto o contenido)."""
        subjects = get_subjects_by_student(self.db, self.student_id)
        if not subjects:
            raise ValueError("No hay materias registradas todavía.")

        if isinstance(ref, int) or (isinstance(ref, str) and ref.strip().isdigit()):
            subject_id = int(ref)
            for s in subjects:
                if s.id == subject_id:
                    return s
            raise ValueError(f"No existe una materia con id {subject_id}.")

        name = str(ref).strip().lower()
        exact = [s for s in subjects if s.name.lower() == name]
        if len(exact) == 1:
            return exact[0]
        if len(exact) > 1:
            raise ValueError(
                "Varias materias coinciden: "
                + ", ".join(f"{s.id}={s.name}" for s in exact)
            )
        partial = [s for s in subjects if name in s.name.lower()]
        if len(partial) == 1:
            return partial[0]
        if len(partial) > 1:
            raise ValueError(
                "La materia es ambigua, sé más específico. Coincidencias: "
                + ", ".join(f"{s.id}={s.name}" for s in partial)
            )
        raise ValueError(
            f"No encontré la materia '{ref}'. Materias disponibles: "
            + ", ".join(f"{s.id}={s.name}" for s in subjects)
        )

    def _resolve_task(self, ref: Any):
        """Resuelve una tarea por ID o título (exacto o contenido)."""
        tasks = get_tasks_by_student(self.db, self.student_id)
        if not tasks:
            raise ValueError("No hay tareas registradas todavía.")

        if isinstance(ref, int) or (isinstance(ref, str) and ref.strip().isdigit()):
            task_id = int(ref)
            for t in tasks:
                if t.id == task_id:
                    return t
            raise ValueError(f"No existe una tarea con id {task_id}.")

        title = str(ref).strip().lower()
        exact = [t for t in tasks if t.title.lower() == title]
        if len(exact) == 1:
            return exact[0]
        partial = [t for t in tasks if title in t.title.lower()]
        if len(partial) == 1:
            return partial[0]
        if len(partial) > 1:
            raise ValueError(
                "La tarea es ambigua, sé más específico. Coincidencias: "
                + ", ".join(f"{t.id}={t.title}" for t in partial[:8])
            )
        raise ValueError(f"No encontré la tarea '{ref}'.")

    @staticmethod
    def _parse_date(value: Any, field: str = "fecha") -> Optional[date]:
        """Valida y convierte una fecha ISO (YYYY-MM-DD)."""
        if value is None or value == "":
            return None
        if not isinstance(value, str):
            raise ValueError(f"La {field} debe tener formato YYYY-MM-DD.")
        try:
            return date.fromisoformat(value.strip())
        except ValueError:
            raise ValueError(f"La {field} '{value}' no es válida; usa formato YYYY-MM-DD.")

    @staticmethod
    def _validate_choice(value: Any, valid: set, field: str, default: str = None):
        """Valida que un valor pertenezca a un conjunto cerrado."""
        if value is None or value == "":
            return default
        if not isinstance(value, str) or value.strip().lower() not in valid:
            raise ValueError(f"El campo {field} debe ser uno de: {', '.join(sorted(valid))}.")
        return value.strip().lower()

    # ── Implementaciones de lectura ───────────────────────────────
    #
    # Todos los handlers aceptan `parameters` (dict) para ser llamados
    # de forma uniforme desde execute(); los de lectura simplemente
    # ignoran los parámetros no aplicables.

    def _get_student_profile(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
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

    def _get_subjects(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
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

    def _get_tasks(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
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

    def _get_tasks_by_status(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        from app.crud.task import get_tasks_by_status

        status = parameters.get("status")
        if not status:
            return {"tool": "get_tasks_by_status", "success": False, "error": "Se requiere parámetro 'status'"}
        status = self._validate_choice(status, VALID_TASK_STATUSES, "status")
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

    def _get_upcoming_tasks(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
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

    def _get_evaluations(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
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

    def _get_upcoming_evaluations(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
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

    def _get_class_schedules(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
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

    def _get_laboratories(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
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
                    "grade": l.grade,
                }
                for l in laboratories
            ],
        }

    def _get_projects(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
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

    def _get_current_plan(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
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

    def _get_academic_report(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        from app.services.ai.reports import build_academic_report

        passing_grade = parameters.get("passing_grade")
        if passing_grade is not None:
            try:
                passing_grade = float(passing_grade)
            except (TypeError, ValueError):
                raise ValueError("passing_grade debe ser un número entre 0 y 100.")
            if not (0 <= passing_grade <= 100):
                raise ValueError("passing_grade debe estar entre 0 y 100.")

        report = build_academic_report(self.db, self.student_id, passing_grade)
        return {"tool": "get_academic_report", "success": True, "data": report}

    def _detect_schedule_conflicts(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        result = detect_schedule_conflicts(self.db, self.student_id)
        return {"tool": "detect_schedule_conflicts", "success": True, "data": result}

    # ── Implementaciones de creación ────────────────────────────────

    def _create_subject(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        name = parameters.get("name")
        if not name or not str(name).strip():
            raise ValueError("El nombre de la materia es obligatorio.")

        code = parameters.get("code") or None
        if code:
            existing = get_subject_by_code(self.db, self.student_id, str(code))
            if existing:
                raise ValueError(f"Ya existe la materia '{existing.name}' con el código '{code}'.")

        subject_in = SubjectCreate(
            name=str(name).strip(),
            code=code,
            teacher=parameters.get("teacher") or None,
            classroom=parameters.get("classroom") or None,
            cycle=parameters.get("cycle"),
            color=parameters.get("color") or "#6366f1",
            description=parameters.get("description") or None,
        )
        subject = create_subject(self.db, self.student_id, subject_in)
        # Cada materia nace con 4 parciales y 4 laboratorios vacíos.
        ensure_subject_defaults(self.db, self.student_id, subject.id)

        return {
            "tool": "create_subject",
            "success": True,
            "data": {
                "id": subject.id,
                "name": subject.name,
                "code": subject.code,
                "message": (
                    f"Materia '{subject.name}' creada con 4 parciales y "
                    "4 laboratorios vacíos listos para registrar."
                ),
            },
        }

    def _update_subject(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        subject = self._resolve_subject(parameters.get("subject"))

        fields = {}
        for key in ("name", "code", "teacher", "classroom", "description", "color"):
            if parameters.get(key) is not None:
                fields[key] = parameters[key]
        if parameters.get("cycle") is not None:
            fields["cycle"] = parameters["cycle"]
        if parameters.get("is_favorite") is not None:
            fields["is_favorite"] = bool(parameters["is_favorite"])

        if not fields:
            raise ValueError("Indica al menos un campo para actualizar.")

        subject_in = SubjectUpdate(**fields)
        updated = update_subject(self.db, subject.id, subject_in)
        if not updated:
            return {"tool": "update_subject", "success": False, "error": "No se pudo actualizar la materia."}
        return {
            "tool": "update_subject",
            "success": True,
            "data": {"id": updated.id, "name": updated.name, "updated_fields": list(fields.keys())},
        }

    def _create_task(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        title = parameters.get("title")
        if not title or not str(title).strip():
            raise ValueError("El título de la tarea es obligatorio.")

        subject_id = None
        if parameters.get("subject") is not None:
            subject = self._resolve_subject(parameters.get("subject"))
            subject_id = subject.id

        priority = self._validate_choice(parameters.get("priority"), VALID_PRIORITIES, "priority", "media")

        task_in = TaskCreate(
            title=str(title).strip(),
            subject_id=subject_id,
            description=parameters.get("description") or None,
            assigned_date=self._parse_date(parameters.get("assigned_date"), "fecha de asignación"),
            due_date=self._parse_date(parameters.get("due_date"), "fecha límite"),
            due_time=parameters.get("due_time") or None,
            priority=priority,
            estimated_minutes=parameters.get("estimated_minutes"),
            observations=parameters.get("observations") or None,
        )
        task = create_task(self.db, self.student_id, task_in)
        return {
            "tool": "create_task",
            "success": True,
            "data": {
                "id": task.id,
                "title": task.title,
                "subject_id": task.subject_id,
                "due_date": task.due_date.isoformat() if task.due_date else None,
                "priority": task.priority,
                "status": task.status,
            },
        }

    def _update_task(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        task = self._resolve_task(parameters.get("task"))

        fields = {}
        if parameters.get("title") is not None:
            fields["title"] = parameters["title"]
        if parameters.get("description") is not None:
            fields["description"] = parameters["description"]
        if parameters.get("priority") is not None:
            fields["priority"] = self._validate_choice(parameters.get("priority"), VALID_PRIORITIES, "priority")
        if parameters.get("status") is not None:
            fields["status"] = self._validate_choice(parameters.get("status"), VALID_TASK_STATUSES, "status")
        if parameters.get("subject") is not None:
            fields["subject_id"] = self._resolve_subject(parameters.get("subject")).id
        if parameters.get("due_date") is not None:
            fields["due_date"] = self._parse_date(parameters.get("due_date"), "fecha límite")
        if parameters.get("due_time") is not None:
            fields["due_time"] = parameters["due_time"]
        if parameters.get("estimated_minutes") is not None:
            fields["estimated_minutes"] = parameters["estimated_minutes"]
        if parameters.get("observations") is not None:
            fields["observations"] = parameters["observations"]

        if not fields:
            raise ValueError("Indica al menos un campo para actualizar.")

        task_in = TaskUpdate(**fields)
        updated = update_task(self.db, task.id, task_in)
        if not updated:
            return {"tool": "update_task", "success": False, "error": "No se pudo actualizar la tarea."}
        return {
            "tool": "update_task",
            "success": True,
            "data": {
                "id": updated.id,
                "title": updated.title,
                "updated_fields": list(fields.keys()),
                "status": updated.status,
            },
        }

    def _complete_task(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        task = self._resolve_task(parameters.get("task"))
        if task.status == "completada":
            return {
                "tool": "complete_task",
                "success": True,
                "data": {"id": task.id, "title": task.title, "message": "La tarea ya estaba completada."},
            }

        fields = {"status": "completada"}
        if parameters.get("observations") is not None:
            fields["observations"] = parameters["observations"]

        updated = update_task(self.db, task.id, TaskUpdate(**fields))
        if not updated:
            return {"tool": "complete_task", "success": False, "error": "No se pudo completar la tarea."}
        return {
            "tool": "complete_task",
            "success": True,
            "data": {
                "id": updated.id,
                "title": updated.title,
                "status": updated.status,
                "message": f"Tarea '{updated.title}' marcada como completada.",
            },
        }

    def _create_project(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        name = parameters.get("name")
        if not name or not str(name).strip():
            raise ValueError("El nombre del proyecto es obligatorio.")

        start_date = self._parse_date(parameters.get("start_date"), "fecha de inicio")
        due_date = self._parse_date(parameters.get("due_date"), "fecha límite")
        if start_date is None:
            raise ValueError("El proyecto requiere fecha de inicio (start_date, YYYY-MM-DD).")
        if due_date is None:
            raise ValueError("El proyecto requiere fecha límite (due_date, YYYY-MM-DD).")
        if due_date < start_date:
            raise ValueError("La fecha límite del proyecto debe ser posterior a la de inicio.")

        subject_id = None
        if parameters.get("subject") is not None:
            subject_id = self._resolve_subject(parameters.get("subject")).id

        priority = self._validate_choice(parameters.get("priority"), VALID_PRIORITIES, "priority", "media")
        progress = parameters.get("progress_percentage") or 0

        project_in = ProjectCreate(
            name=str(name).strip(),
            subject_id=subject_id,
            description=parameters.get("description") or None,
            start_date=start_date,
            due_date=due_date,
            priority=priority,
            progress_percentage=progress,
        )
        project = create_project(self.db, self.student_id, project_in)
        return {
            "tool": "create_project",
            "success": True,
            "data": {
                "id": project.id,
                "name": project.name,
                "subject_id": project.subject_id,
                "start_date": project.start_date.isoformat(),
                "due_date": project.due_date.isoformat(),
                "priority": project.priority,
            },
        }

    def _create_evaluation(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        subject = self._resolve_subject(parameters.get("subject"))
        evaluation_type = self._validate_choice(
            parameters.get("evaluation_type"), VALID_EVALUATION_TYPES, "evaluation_type"
        )
        if not evaluation_type:
            raise ValueError("El tipo de evaluación es obligatorio.")

        evaluation_in = EvaluationCreate(
            subject_id=subject.id,
            title=parameters.get("title") or None,
            evaluation_type=evaluation_type,
            date=self._parse_date(parameters.get("date"), "fecha"),
            start_time=parameters.get("start_time") or None,
            end_time=parameters.get("end_time") or None,
            weight_percentage=parameters.get("weight_percentage"),
            description=parameters.get("description") or None,
            topics=parameters.get("topics") or None,
        )
        evaluation = create_evaluation(self.db, self.student_id, evaluation_in)
        return {
            "tool": "create_evaluation",
            "success": True,
            "data": {
                "id": evaluation.id,
                "subject_id": subject.id,
                "subject_name": subject.name,
                "title": evaluation.title,
                "type": evaluation.evaluation_type,
                "date": evaluation.date.isoformat() if evaluation.date else None,
                "weight_percentage": evaluation.weight_percentage,
                "status": evaluation.status,
            },
        }

    def _register_grade(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        subject = self._resolve_subject(parameters.get("subject"))
        item_type = self._validate_choice(parameters.get("item_type"), {"parcial", "laboratorio"}, "item_type")
        if not item_type:
            raise ValueError("item_type debe ser 'parcial' o 'laboratorio'.")

        grade = parameters.get("grade")
        if grade is None:
            raise ValueError("La nota (grade) es obligatoria para registrar la calificación.")
        try:
            grade = float(grade)
        except (TypeError, ValueError):
            raise ValueError("La nota debe ser un número entre 0 y 100.")
        if not (0 <= grade <= 100):
            raise ValueError("La nota debe estar entre 0 y 100.")

        completed = parameters.get("completed")
        completed = True if completed is None else bool(completed)
        realized_date = self._parse_date(parameters.get("date"), "fecha de realización")

        if item_type == "parcial":
            items = [
                e
                for e in get_evaluations_by_student(self.db, self.student_id)
                if e.subject_id == subject.id
            ]
            default_titles = [e for e in items if (e.title or "").lower().startswith("parcial")]
            target = self._resolve_academic_item(
                parameters.get("item"), items, default_titles, "parcial"
            )
            fields = {"grade": grade}
            if parameters.get("weight_percentage") is not None:
                fields["weight_percentage"] = parameters["weight_percentage"]
            if completed:
                fields["status"] = "realizado"
                fields["date"] = realized_date or date.today()
            updated = update_evaluation(self.db, target.id, EvaluationUpdate(**fields))
            updated_grade = float(updated.grade)
        else:
            items = [
                l
                for l in get_laboratories_by_student(self.db, self.student_id)
                if l.subject_id == subject.id
            ]
            default_titles = [l for l in items if (l.title or "").lower().startswith("laboratorio")]
            target = self._resolve_academic_item(
                parameters.get("item"), items, default_titles, "laboratorio"
            )
            fields = {"grade": grade}
            if parameters.get("weight_percentage") is not None:
                fields["weight_percentage"] = parameters["weight_percentage"]
            if completed:
                fields["status"] = "realizado"
                fields["date"] = realized_date or date.today()
            from app.schemas.laboratory import LaboratoryUpdate

            updated = update_laboratory(self.db, target.id, LaboratoryUpdate(**fields))
            updated_grade = float(updated.grade)

        # Promedio ponderado verificado de la materia tras el cambio
        items_data = get_subject_academic_items(self.db, self.student_id, subject.id)
        summary = items_data["summary"]

        return {
            "tool": "register_grade",
            "success": True,
            "data": {
                "subject_id": subject.id,
                "subject_name": subject.name,
                "item_type": item_type,
                "item_id": updated.id,
                "item_title": updated.title,
                "grade": updated_grade,
                "status": updated.status,
                "subject_average": summary["average"],
                "message": (
                    f"Nota {updated_grade:g} registrada en {updated.title or item_type} "
                    f"de {subject.name}."
                ),
            },
        }

    def _resolve_academic_item(self, ref: Any, items: List, default_items: List, kind: str):
        """Resuelve un parcial/laboratorio por ID o título ('Parcial 2', '2')."""
        if not items:
            raise ValueError(f"La materia no tiene {kind}s registrados.")

        if isinstance(ref, int) or (isinstance(ref, str) and ref.strip().isdigit()):
            item_id = int(ref)
            for item in items:
                if item.id == item_id:
                    return item
            raise ValueError(f"No existe un {kind} con id {item_id} en esta materia.")

        if ref is None:
            if len(default_items) == 1:
                return default_items[0]
            raise ValueError(
                f"Indica qué {kind} registrar: "
                + ", ".join(f"{i.id}={i.title}" for i in default_items)
            )

        text = str(ref).strip().lower()
        # Referencias numéricas: 'Parcial 2' / '2' sobre los títulos por defecto
        number = None
        for token in text.replace("parcial", " ").replace("laboratorio", " ").split():
            if token.isdigit():
                number = int(token)
                break
        if number is not None:
            for item in default_items:
                title = (item.title or "").lower()
                if title.endswith(f" {number}"):
                    return item

        exact = [i for i in items if (i.title or "").lower() == text]
        if len(exact) == 1:
            return exact[0]
        partial = [i for i in items if text in (i.title or "").lower()]
        if len(partial) == 1:
            return partial[0]
        raise ValueError(
            f"No encontré el {kind} '{ref}'. Disponibles: "
            + ", ".join(f"{i.id}={i.title}" for i in default_items or items)
        )

    def _create_class_schedule(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        subject = self._resolve_subject(parameters.get("subject"))

        day = normalize_day(parameters.get("day_of_week"))
        if not day:
            raise ValueError(
                "day_of_week debe ser un día válido (lunes, martes, miércoles, "
                "jueves, viernes, sábado o domingo)."
            )

        start_time = parameters.get("start_time")
        end_time = parameters.get("end_time")
        if not start_time or not end_time:
            raise ValueError("start_time y end_time (HH:MM) son obligatorios.")

        modality = self._validate_choice(parameters.get("modality"), VALID_MODALITIES, "modality", "presencial")

        # Detección de conflictos ANTES de crear el horario
        conflicts = check_new_schedule_conflicts(
            self.db,
            self.student_id,
            subject.id,
            day,
            start_time,
            end_time,
        )
        if conflicts and not parameters.get("allow_conflict"):
            return {
                "tool": "create_class_schedule",
                "success": False,
                "conflict_detected": True,
                "data": {
                    "conflicts": conflicts,
                    "message": (
                        "El horario crearía un conflicto con clases existentes. "
                        "Puedes cambiar el horario o confirmar la creación con "
                        "allow_conflict=true si el estudiante así lo decide."
                    ),
                },
                "error": "Conflicto de horario detectado; no se creó el horario.",
            }

        schedule_in = ClassScheduleCreate(
            subject_id=subject.id,
            day_of_week=day,
            start_time=start_time,
            end_time=end_time,
            room=parameters.get("room") or None,
            teacher=parameters.get("teacher") or None,
            modality=modality,
            observations=parameters.get("observations") or None,
        )
        schedule = create_class_schedule(self.db, self.student_id, schedule_in)
        return {
            "tool": "create_class_schedule",
            "success": True,
            "data": {
                "id": schedule.id,
                "subject_id": subject.id,
                "subject_name": subject.name,
                "day_of_week": schedule.day_of_week,
                "start_time": schedule.start_time,
                "end_time": schedule.end_time,
                "room": schedule.room,
                "modality": schedule.modality,
                "conflicts": conflicts,
                "message": (
                    f"Horario registrado: {subject.name} los {day} de "
                    f"{start_time} a {end_time}."
                ),
            },
        }

    def _update_class_schedule(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        schedule_id = parameters.get("schedule_id")
        if schedule_id is None:
            raise ValueError("schedule_id es obligatorio.")
        schedule = get_class_schedule(self.db, int(schedule_id))
        if not schedule or schedule.student_id != self.student_id:
            raise ValueError(f"No existe un horario con id {schedule_id}.")

        fields = {}
        day = None
        if parameters.get("day_of_week") is not None:
            day = normalize_day(parameters.get("day_of_week"))
            if not day:
                raise ValueError("day_of_week no es un día válido.")
            fields["day_of_week"] = day
        if parameters.get("start_time") is not None:
            fields["start_time"] = parameters["start_time"]
        if parameters.get("end_time") is not None:
            fields["end_time"] = parameters["end_time"]
        if parameters.get("room") is not None:
            fields["room"] = parameters["room"]
        if parameters.get("modality") is not None:
            fields["modality"] = self._validate_choice(
                parameters.get("modality"), VALID_MODALITIES, "modality"
            )
        if parameters.get("observations") is not None:
            fields["observations"] = parameters["observations"]
        if parameters.get("teacher") is not None:
            fields["teacher"] = parameters["teacher"]

        if not fields:
            raise ValueError("Indica al menos un campo para actualizar.")

        # Detección de conflictos antes de guardar
        new_day = fields.get("day_of_week", schedule.day_of_week)
        new_start = fields.get("start_time", schedule.start_time)
        new_end = fields.get("end_time", schedule.end_time)
        conflicts = check_new_schedule_conflicts(
            self.db,
            self.student_id,
            schedule.subject_id,
            new_day,
            new_start,
            new_end,
            exclude_schedule_id=schedule.id,
        )
        if conflicts and not parameters.get("allow_conflict"):
            return {
                "tool": "update_class_schedule",
                "success": False,
                "conflict_detected": True,
                "data": {
                    "conflicts": conflicts,
                    "message": "El cambio crearía un conflicto; no se guardó nada.",
                },
                "error": "Conflicto de horario detectado; no se guardó el cambio.",
            }

        schedule_in = ClassScheduleUpdate(**fields)
        updated = update_class_schedule(self.db, schedule.id, schedule_in)
        if not updated:
            return {"tool": "update_class_schedule", "success": False, "error": "No se pudo actualizar el horario."}
        return {
            "tool": "update_class_schedule",
            "success": True,
            "data": {
                "id": updated.id,
                "day_of_week": updated.day_of_week,
                "start_time": updated.start_time,
                "end_time": updated.end_time,
                "conflicts": conflicts,
            },
        }

    # ── Planificación (motor determinista) ──────────────────────────

    def _build_student_data(self) -> Dict[str, Any]:
        """Construye el diccionario de datos para el motor de planificación."""
        from app.crud.class_schedule import get_class_schedules_by_student as get_schedules
        from app.crud.laboratory import get_laboratories_by_student as get_labs
        from app.crud.student_preference import get_preference_by_student
        from app.crud.weekly_availability import get_availability_by_student

        student = self.student
        if not student:
            raise ValueError("No hay estudiante configurado")

        student_data = {
            "student": {"id": student.id, "name": student.name, "career": student.career},
            "subjects": [
                {"id": s.id, "name": s.name, "code": s.code, "color": s.color}
                for s in get_subjects_by_student(self.db, student.id)
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
                for t in get_tasks_by_student(self.db, student.id)
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
                for e in get_evaluations_by_student(self.db, student.id)
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
                for c in get_schedules(self.db, student.id)
            ],
            "laboratories": [
                {
                    "id": l.id,
                    "title": l.title,
                    "date": l.date.isoformat() if l.date else None,
                    "start_time": l.start_time,
                    "end_time": l.end_time,
                }
                for l in get_labs(self.db, student.id)
            ],
            "weekly_availability": [
                {
                    "day_of_week": a.day_of_week,
                    "is_available": a.is_available,
                    "start_time": a.start_time,
                    "end_time": a.end_time,
                }
                for a in get_availability_by_student(self.db, student.id)
            ],
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
        return student_data

    def _generate_weekly_plan(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        from app.services.planning.engine import run_planning_engine

        student_data = self._build_student_data()

        week_start = None
        week_start_str = parameters.get("week_start_date")
        if week_start_str:
            week_start = self._parse_date(week_start_str, "fecha de inicio de semana")

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
        # Regenerar es lo mismo que generar (el endpoint maneja sobrescribir)
        result = self._generate_weekly_plan(parameters)
        result["tool"] = "regenerate_weekly_plan"
        return result
