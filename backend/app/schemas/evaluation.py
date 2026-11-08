from pydantic import BaseModel, Field
from datetime import date as date_type
from typing import Optional


class EvaluationBase(BaseModel):
    subject_id: int = Field(..., gt=0)
    title: str = Field(..., min_length=1, max_length=150)
    evaluation_type: str = Field(..., max_length=30)  # parcial, final, quiz, practico, exposicion, proyecto, laboratorio, otro
    date: Optional[date_type] = None
    start_time: Optional[str] = Field(None, max_length=5)   # HH:MM
    end_time: Optional[str] = Field(None, max_length=5)     # HH:MM
    weight_percentage: Optional[float] = Field(None, ge=0, le=100)
    grade: Optional[float] = Field(None, ge=0, le=100)
    description: Optional[str] = None
    topics: Optional[str] = None
    preparation_level: str = Field(default="no_iniciado", max_length=20)  # no_iniciado, estudiando, preparado
    status: str = Field(default="pendiente", max_length=20)  # pendiente, realizado, cancelado


class EvaluationCreate(EvaluationBase):
    pass


class EvaluationUpdate(BaseModel):
    subject_id: Optional[int] = Field(None, gt=0)
    title: Optional[str] = Field(None, min_length=1, max_length=150)
    evaluation_type: Optional[str] = Field(None, max_length=30)
    date: Optional[date_type] = None
    start_time: Optional[str] = Field(None, max_length=5)
    end_time: Optional[str] = Field(None, max_length=5)
    weight_percentage: Optional[float] = Field(None, ge=0, le=100)
    grade: Optional[float] = Field(None, ge=0, le=100)
    description: Optional[str] = None
    topics: Optional[str] = None
    preparation_level: Optional[str] = Field(None, max_length=20)
    status: Optional[str] = Field(None, max_length=20)


class EvaluationResponse(EvaluationBase):
    id: int
    student_id: int

    class Config:
        from_attributes = True
