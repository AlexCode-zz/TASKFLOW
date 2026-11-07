from pydantic import BaseModel, Field
from datetime import date
from typing import Optional


class TaskBase(BaseModel):
    subject_id: int = Field(..., gt=0)
    title: str = Field(..., min_length=1, max_length=150)
    description: Optional[str] = None
    assigned_date: Optional[date] = None
    due_date: date
    due_time: Optional[str] = Field(None, max_length=5)  # HH:MM
    priority: str = Field(default="media", max_length=20)  # baja, media, alta, urgente
    status: str = Field(default="pendiente", max_length=20)  # pendiente, en_progreso, completada
    estimated_minutes: Optional[int] = Field(None, ge=1, le=480)
    observations: Optional[str] = None


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    subject_id: Optional[int] = Field(None, gt=0)
    title: Optional[str] = Field(None, min_length=1, max_length=150)
    description: Optional[str] = None
    assigned_date: Optional[date] = None
    due_date: Optional[date] = None
    due_time: Optional[str] = Field(None, max_length=5)
    priority: Optional[str] = Field(None, max_length=20)
    status: Optional[str] = Field(None, max_length=20)
    estimated_minutes: Optional[int] = Field(None, ge=1, le=480)
    observations: Optional[str] = None


class TaskResponse(TaskBase):
    id: int
    student_id: int

    class Config:
        from_attributes = True
