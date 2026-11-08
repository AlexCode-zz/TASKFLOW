"""Esquemas para el resumen académico de una materia."""

from typing import List, Optional

from pydantic import BaseModel

from app.schemas.evaluation import EvaluationResponse
from app.schemas.laboratory import LaboratoryResponse


class AcademicSummary(BaseModel):
    """Promedio ponderado y avance de parciales/laboratorios."""

    average: Optional[float] = None
    weight_total: float = 0
    graded_count: int = 0
    completed_parciales: int = 0
    completed_laboratorios: int = 0


class SubjectAcademicItemsResponse(BaseModel):
    """Parciales y laboratorios de una materia con su resumen."""

    subject_id: int
    parciales: List[EvaluationResponse]
    laboratorios: List[LaboratoryResponse]
    summary: AcademicSummary
