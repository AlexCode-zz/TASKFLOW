"""
Algoritmo de priorización de tareas para TaskFlow.

El motor calcula una puntuación de prioridad para cada tarea pendiente
utilizando reglas deterministas y transparentes. Cuanto mayor sea la
puntuación, antes se programará la tarea.

Factores considerados (cada uno con un peso configurable):
1. Prioridad asignada por el estudiante (baja, media, alta, urgente)
2. Fecha de entrega (más próxima = mayor puntuación)
3. Tiempo estimado de realización
4. Tiempo disponible antes de la entrega
5. Proximidad de evaluaciones relacionadas
6. Estado de la tarea

Documentación del cálculo:
  puntuacion = (prioridad_peso * 25) + (urgencia_fecha * 30) + (proximidad_evaluacion * 20) + (factor_tiempo * 15) + (estado_factor * 10)

Donde:
  - prioridad_peso: urgente=4, alta=3, media=2, baja=1
  - urgencia_fecha: inversa de días hasta la entrega (máximo 30 puntos si es hoy)
  - proximidad_evaluacion: si hay una evaluación en los próximos 7 días, +20
  - factor_tiempo: tareas cortas tienen ligera ventaja para encajar en huecos
  - estado_factor: pendiente=10, en_progreso=5, completada=0
"""

from datetime import date, timedelta
from typing import Optional

# Pesos configurables del algoritmo
WEIGHT_PRIORITY = 25
WEIGHT_DEADLINE_URGENCY = 30
WEIGHT_EVALUATION_PROXIMITY = 20
WEIGHT_TIME_FACTOR = 15
WEIGHT_STATUS = 10

PRIORITY_SCORES = {
    "baja": 1,
    "media": 2,
    "alta": 3,
    "urgente": 4,
}

STATUS_SCORES = {
    "pendiente": 10,
    "en_progreso": 5,
    "completada": 0,
}

MAX_DAYS_FOR_DEADLINE_SCORE = 14  # Después de 14 días, la urgencia por fecha es mínima


def calculate_priority_score(
    task: dict,
    evaluations: list,
    today: Optional[date] = None,
) -> int:
    """
    Calcula la puntuación de prioridad de una tarea.

    Args:
        task: Diccionario con los datos de la tarea (priority, due_date, status, estimated_minutes)
        evaluations: Lista de evaluaciones de la misma materia para verificar proximidad
        today: Fecha de referencia (por defecto fecha actual)

    Returns:
        Puntuación entera (0-100 aprox). Mayor = mayor prioridad.
    """
    if today is None:
        today = date.today()

    score = 0

    # 1. Prioridad asignada por el estudiante (0-25 puntos)
    priority_level = str(task.get("priority", "media")).lower()
    priority_weight = PRIORITY_SCORES.get(priority_level, 2)
    score += priority_weight * (WEIGHT_PRIORITY / 4)  # 25 puntos máximos

    # 2. Urgencia por fecha de entrega (0-30 puntos)
    due_date_str = task.get("due_date")
    if due_date_str:
        if isinstance(due_date_str, str):
            due_date = date.fromisoformat(due_date_str)
        else:
            due_date = due_date_str

        days_until_due = (due_date - today).days

        if days_until_due <= 0:
            # Entrega vencida o hoy: puntuación máxima
            score += WEIGHT_DEADLINE_URGENCY
        elif days_until_due <= MAX_DAYS_FOR_DEADLINE_SCORE:
            # Escala inversa: menos días = más puntos
            urgency_ratio = 1 - (days_until_due / MAX_DAYS_FOR_DEADLINE_SCORE)
            score += int(WEIGHT_DEADLINE_URGENCY * urgency_ratio)
        # Después de 14 días no se añaden puntos por urgencia de fecha

    # 3. Proximidad de evaluaciones relacionadas (0-20 puntos)
    subject_id = task.get("subject_id")
    if subject_id and evaluations:
        for eval_item in evaluations:
            if eval_item.get("subject_id") == subject_id:
                eval_date_str = eval_item.get("date")
                if eval_date_str:
                    if isinstance(eval_date_str, str):
                        eval_date = date.fromisoformat(eval_date_str)
                    else:
                        eval_date = eval_date_str
                    days_until_eval = (eval_date - today).days
                    if 0 <= days_until_eval <= 7:
                        # Evaluación próxima: añadir puntos proporcionales
                        proximity_ratio = 1 - (days_until_eval / 7)
                        score += int(WEIGHT_EVALUATION_PROXIMITY * proximity_ratio)
                        break  # Solo contamos la evaluación más cercana

    # 4. Factor de tiempo (0-15 puntos)
    # Tareas más cortas tienen ligera ventaja para encajar en huecos disponibles
    estimated = task.get("estimated_minutes")
    if estimated:
        if estimated <= 60:
            score += WEIGHT_TIME_FACTOR  # 15 puntos para tareas cortas
        elif estimated <= 120:
            score += int(WEIGHT_TIME_FACTOR * 0.7)  # ~10 puntos
        elif estimated <= 240:
            score += int(WEIGHT_TIME_FACTOR * 0.4)  # ~6 puntos
        # Tareas largas: 0 puntos extra por este factor

    # 5. Factor de estado (0-10 puntos)
    status = str(task.get("status", "pendiente")).lower()
    status_score = STATUS_SCORES.get(status, 10)
    score += int(WEIGHT_STATUS * (status_score / 10))  # escalar a 10 puntos máximos

    return int(score)


def sort_tasks_by_priority(
    tasks: list,
    evaluations: list,
    today: Optional[date] = None,
) -> list:
    """
    Ordena una lista de tareas por puntuación de prioridad descendente.

    Añade el campo 'priority_score' a cada tarea.
    """
    if today is None:
        today = date.today()

    scored_tasks = []
    for task in tasks:
        task_copy = dict(task)
        task_copy["priority_score"] = calculate_priority_score(
            task, evaluations, today
        )
        scored_tasks.append(task_copy)

    # Ordenar por puntuación descendente, luego por fecha de entrega ascendente
    scored_tasks.sort(
        key=lambda t: (-t.get("priority_score", 0), t.get("due_date", "9999-12-31"))
    )

    return scored_tasks
