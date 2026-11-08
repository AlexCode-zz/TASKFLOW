"""Reglas académicas de parciales, laboratorios y promedio ponderado.

Cada materia tiene por defecto 4 parciales y 4 laboratorios. Los ítems se
crean vacíos (sin fecha) y el estudiante los completa cuando los realiza.

El promedio global de la materia se calcula solo con los ítems que tienen
nota y porcentaje. Si no hay porcentajes registrados, no se promedia nada.
"""

import re
from typing import Iterable, Optional, Tuple

from sqlalchemy.orm import Session

from app.models.evaluation import Evaluation
from app.models.laboratory import Laboratory

DEFAULT_ITEMS = 4


def _used_numbers(items: Iterable, prefix: str) -> set:
    """Devuelve los números ya usados en títulos como 'Parcial 3'."""
    used = set()
    for item in items:
        match = re.match(rf"^{prefix} (\d+)$", item.title or "")
        if match:
            used.add(int(match.group(1)))
    return used


def ensure_subject_defaults(db: Session, student_id: int, subject_id: int) -> None:
    """Garantiza que la materia tenga sus 4 parciales y 4 laboratorios."""
    parciales = (
        db.query(Evaluation)
        .filter(
            Evaluation.student_id == student_id,
            Evaluation.subject_id == subject_id,
            Evaluation.evaluation_type == "parcial",
        )
        .order_by(Evaluation.id)
        .all()
    )
    used_parciales = _used_numbers(parciales, "Parcial")
    for number in range(1, DEFAULT_ITEMS + 1):
        if len(parciales) >= DEFAULT_ITEMS:
            break
        if number in used_parciales:
            continue
        parcial = Evaluation(
            student_id=student_id,
            subject_id=subject_id,
            title=f"Parcial {number}",
            evaluation_type="parcial",
            date=None,
            status="pendiente",
            preparation_level="no_iniciado",
        )
        db.add(parcial)
        parciales.append(parcial)

    laboratorios = (
        db.query(Laboratory)
        .filter(
            Laboratory.student_id == student_id,
            Laboratory.subject_id == subject_id,
        )
        .order_by(Laboratory.id)
        .all()
    )
    used_laboratorios = _used_numbers(laboratorios, "Laboratorio")
    for number in range(1, DEFAULT_ITEMS + 1):
        if len(laboratorios) >= DEFAULT_ITEMS:
            break
        if number in used_laboratorios:
            continue
        laboratorio = Laboratory(
            student_id=student_id,
            subject_id=subject_id,
            title=f"Laboratorio {number}",
            date=None,
            start_time=None,
            end_time=None,
            status="pendiente",
        )
        db.add(laboratorio)
        laboratorios.append(laboratorio)

    db.commit()


def weighted_average(items: Iterable) -> Tuple[Optional[float], float, int]:
    """Calcula el promedio ponderado de los ítems con nota y porcentaje.

    Returns:
        (promedio, peso_total, cantidad_con_nota)
    """
    graded = [item for item in items if item.grade is not None]
    weighted = [
        item
        for item in graded
        if item.weight_percentage is not None and float(item.weight_percentage) > 0
    ]
    weight_total = round(sum(float(item.weight_percentage) for item in weighted), 2)
    if weight_total <= 0:
        return None, weight_total, len(graded)

    total = sum(float(item.grade) * float(item.weight_percentage) for item in weighted)
    return round(total / weight_total, 2), weight_total, len(graded)


def get_subject_academic_items(db: Session, student_id: int, subject_id: int) -> dict:
    """Devuelve parciales, laboratorios y el resumen ponderado de una materia."""
    ensure_subject_defaults(db, student_id, subject_id)

    parciales = (
        db.query(Evaluation)
        .filter(
            Evaluation.student_id == student_id,
            Evaluation.subject_id == subject_id,
            Evaluation.evaluation_type == "parcial",
        )
        .order_by(Evaluation.id)
        .all()
    )
    laboratorios = (
        db.query(Laboratory)
        .filter(
            Laboratory.student_id == student_id,
            Laboratory.subject_id == subject_id,
        )
        .order_by(Laboratory.id)
        .all()
    )

    items = [*parciales, *laboratorios]
    average, weight_total, graded_count = weighted_average(items)

    return {
        "subject_id": subject_id,
        "parciales": parciales,
        "laboratorios": laboratorios,
        "summary": {
            "average": average,
            "weight_total": weight_total,
            "graded_count": graded_count,
            "completed_parciales": sum(1 for item in parciales if item.status == "realizado"),
            "completed_laboratorios": sum(
                1 for item in laboratorios if item.status == "realizado"
            ),
        },
    }
