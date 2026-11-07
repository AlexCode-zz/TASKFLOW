"""
Cálculo de espacios de tiempo disponibles para planificación.

Genera bloques de tiempo libre respetando:
- Disponibilidad semanal configurada por el estudiante
- Horarios ocupados (clases, laboratorios, evaluaciones, tareas ya planificadas)
- Horarios de sueño (preferencias del estudiante)
"""

from datetime import date, datetime, timedelta
from typing import List, Dict, Optional, Tuple

DAY_NAMES = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]

DAY_NAMES_MAP = {
    "lunes": 0,
    "martes": 1,
    "miércoles": 2,
    "jueves": 3,
    "viernes": 4,
    "sábado": 5,
    "domingo": 6,
}


def parse_time(time_str: str) -> Optional[datetime]:
    """Convierte una cadena HH:MM a un objeto datetime."""
    if not time_str:
        return None
    try:
        return datetime.strptime(time_str, "%H:%M")
    except (ValueError, TypeError):
        return None


def time_to_minutes(t: datetime) -> int:
    """Convierte un datetime a minutos desde medianoche."""
    return t.hour * 60 + t.minute


def minutes_to_time(minutes: int) -> str:
    """Convierte minutos desde medianoche a cadena HH:MM."""
    h = minutes // 60
    m = minutes % 60
    return f"{h:02d}:{m:02d}"


def generate_available_slots(
    week_start: date,
    week_end: date,
    availability: List[Dict],
    busy_blocks: List[Dict],
    sleep_start: Optional[str] = None,
    sleep_end: Optional[str] = None,
    slot_duration_minutes: int = 30,
) -> List[Dict]:
    """
    Genera espacios de tiempo disponibles para estudiar en una semana.

    Args:
        week_start: Fecha de inicio de la semana (lunes)
        week_end: Fecha de fin de la semana (domingo)
        availability: Disponibilidad por día con start_time, end_time, is_available
        busy_blocks: Bloques ocupados (clases, labs, evaluaciones, sesiones existentes)
        sleep_start: Hora de inicio de sueño (ej. "23:00")
        sleep_end: Hora de fin de sueño (ej. "07:30")
        slot_duration_minutes: Duración mínima de cada slot (en minutos)

    Returns:
        Lista de slots disponibles con fecha, inicio, fin y duración.
    """
    slots = []

    availability_by_day: Dict[str, Dict] = {}
    for a in availability:
        day = a.get("day_of_week", "").lower()
        availability_by_day[day] = a

    busy_by_date: Dict[str, List[Tuple[int, int]]] = {}
    for block in busy_blocks:
        block_date = block.get("date") or block.get("day_of_week")
        start = parse_time(block.get("start_time", ""))
        end = parse_time(block.get("end_time", ""))
        if not start or not end:
            continue
        start_min = time_to_minutes(start)
        end_min = time_to_minutes(end)

        if "date" in block:
            date_str = block["date"] if isinstance(block["date"], str) else block["date"].isoformat()
            busy_by_date.setdefault(date_str, []).append((start_min, end_min))
        else:
            day_name = str(block_date).lower()
            current = week_start
            while current <= week_end:
                if DAY_NAMES[current.weekday()] == day_name:
                    date_str = current.isoformat()
                    busy_by_date.setdefault(date_str, []).append((start_min, end_min))
                current += timedelta(days=1)

    sleep_start_min = time_to_minutes(parse_time(sleep_start)) if sleep_start else None
    sleep_end_min = time_to_minutes(parse_time(sleep_end)) if sleep_end else None

    current_date = week_start
    while current_date <= week_end:
        day_name = DAY_NAMES[current_date.weekday()]
        date_str = current_date.isoformat()

        day_availability = availability_by_day.get(day_name)
        if not day_availability or not day_availability.get("is_available", True):
            current_date += timedelta(days=1)
            continue

        day_start_str = day_availability.get("start_time")
        day_end_str = day_availability.get("end_time")
        if not day_start_str or not day_end_str:
            current_date += timedelta(days=1)
            continue

        day_start = parse_time(day_start_str)
        day_end = parse_time(day_end_str)
        if not day_start or not day_end:
            current_date += timedelta(days=1)
            continue

        day_start_min = time_to_minutes(day_start)
        day_end_min = time_to_minutes(day_end)

        day_busy: List[Tuple[int, int]] = busy_by_date.get(date_str, [])

        if sleep_start_min is not None and sleep_end_min is not None:
            if sleep_end_min <= sleep_start_min:
                day_busy.append((sleep_start_min, 24 * 60))
                day_busy.append((0, sleep_end_min))
            else:
                day_busy.append((sleep_start_min, sleep_end_min))

        day_busy.sort(key=lambda x: x[0])

        current_min = day_start_min

        for busy_start, busy_end in day_busy:
            free_start = current_min
            free_end = busy_start

            if free_end > free_start:
                slot_start = free_start
                while slot_start + slot_duration_minutes <= free_end:
                    slots.append({
                        "date": date_str,
                        "day_of_week": day_name,
                        "start_time": minutes_to_time(slot_start),
                        "end_time": minutes_to_time(slot_start + slot_duration_minutes),
                        "duration_minutes": slot_duration_minutes,
                    })
                    slot_start += slot_duration_minutes

            current_min = max(current_min, busy_end)

        if current_min < day_end_min:
            slot_start = current_min
            while slot_start + slot_duration_minutes <= day_end_min:
                slots.append({
                    "date": date_str,
                    "day_of_week": day_name,
                    "start_time": minutes_to_time(slot_start),
                    "end_time": minutes_to_time(slot_start + slot_duration_minutes),
                    "duration_minutes": slot_duration_minutes,
                })
                slot_start += slot_duration_minutes

        current_date += timedelta(days=1)

    return slots


def is_slot_conflicting(
    slot_start: str,
    slot_end: str,
    busy_blocks: List[Dict],
    target_date: Optional[str] = None,
) -> bool:
    """Verifica si un slot entra en conflicto con bloques ocupados."""
    slot_start_dt = parse_time(slot_start)
    slot_end_dt = parse_time(slot_end)
    if not slot_start_dt or not slot_end_dt:
        return True

    slot_start_min = time_to_minutes(slot_start_dt)
    slot_end_min = time_to_minutes(slot_end_dt)

    for block in busy_blocks:
        block_date = block.get("date") or block.get("day_of_week")
        if target_date and "date" in block and block["date"] != target_date:
            continue

        b_start = parse_time(block.get("start_time", ""))
        b_end = parse_time(block.get("end_time", ""))
        if not b_start or not b_end:
            continue

        b_start_min = time_to_minutes(b_start)
        b_end_min = time_to_minutes(b_end)

        if slot_start_min < b_end_min and slot_end_min > b_start_min:
            return True

    return False
