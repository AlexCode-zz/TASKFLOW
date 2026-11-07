from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import Optional, List


class PlanBase(BaseModel):
    week_start_date: date
    week_end_date: date


class PlanCreate(PlanBase):
    pass


class PlanResponse(PlanBase):
    id: int
    student_id: int
    generated_at: Optional[datetime] = None
    is_active: bool
    total_sessions: int
    scheduled_hours: int
    unscheduled_tasks: int

    class Config:
        from_attributes = True


class PlanningSessionBase(BaseModel):
    task_id: Optional[int] = None
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    subject_id: Optional[int] = None
    scheduled_date: date
    start_time: str = Field(..., max_length=5)   # HH:MM
    end_time: str = Field(..., max_length=5)     # HH:MM
    duration_minutes: int = Field(..., ge=1, le=480)
    session_type: str = Field(default="study", max_length=20)
    origin: str = Field(default="automatic", max_length=20)
    status: str = Field(default="pending", max_length=20)
    is_manually_modified: bool = False
    explanation: Optional[str] = None
    priority_score: int = Field(default=0, ge=0)


class PlanningSessionCreate(PlanningSessionBase):
    pass


class PlanningSessionUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    subject_id: Optional[int] = None
    scheduled_date: Optional[date] = None
    start_time: Optional[str] = Field(None, max_length=5)
    end_time: Optional[str] = Field(None, max_length=5)
    duration_minutes: Optional[int] = Field(None, ge=1, le=480)
    session_type: Optional[str] = Field(None, max_length=20)
    origin: Optional[str] = Field(None, max_length=20)
    status: Optional[str] = Field(None, max_length=20)
    is_manually_modified: Optional[bool] = None
    explanation: Optional[str] = None
    priority_score: Optional[int] = Field(None, ge=0)


class PlanningSessionResponse(PlanningSessionBase):
    id: int
    plan_id: int
    student_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PlanningGenerateRequest(BaseModel):
    week_start_date: Optional[date] = None


class PlanningGenerateResponse(BaseModel):
    success: bool
    week_start: Optional[str] = None
    week_end: Optional[str] = None
    error: Optional[str] = None
    sessions: List[PlanningSessionResponse] = []
    unscheduled_tasks: List[dict] = []
    warnings: List[str] = []
    explanations: List[str] = []
    stats: Optional[dict] = None


class PlanningSessionManualUpdate(BaseModel):
    """Para cambios manuales del estudiante sobre una sesión."""
    new_start_time: Optional[str] = None
    new_end_time: Optional[str] = None
    new_date: Optional[date] = None
    status: Optional[str] = None
    is_manually_modified: Optional[bool] = True
