from pydantic import BaseModel, Field
from datetime import date
from typing import Optional


class ProjectBase(BaseModel):
    subject_id: Optional[int] = Field(None, gt=0)
    name: str = Field(..., min_length=1, max_length=150)
    description: Optional[str] = None
    start_date: date
    due_date: date
    priority: str = Field(default="media", max_length=20)  # baja, media, alta, urgente
    status: str = Field(default="pendiente", max_length=20)  # pendiente, en_progreso, completada
    progress_percentage: int = Field(default=0, ge=0, le=100)


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    subject_id: Optional[int] = Field(None, gt=0)
    name: Optional[str] = Field(None, min_length=1, max_length=150)
    description: Optional[str] = None
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    priority: Optional[str] = Field(None, max_length=20)
    status: Optional[str] = Field(None, max_length=20)
    progress_percentage: Optional[int] = Field(None, ge=0, le=100)


class ProjectResponse(ProjectBase):
    id: int
    student_id: int

    class Config:
        from_attributes = True
