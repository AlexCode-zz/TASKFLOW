from pydantic import BaseModel, Field
from typing import Optional


class StudentPreferenceBase(BaseModel):
    usual_start_time: Optional[str] = Field(None, max_length=5)   # HH:MM
    usual_sleep_time: Optional[str] = Field(None, max_length=5)   # HH:MM
    preferred_study_session_minutes: Optional[int] = Field(None, ge=5, le=480)
    preferred_break_minutes: Optional[int] = Field(None, ge=1, le=120)
    exam_preparation_days: Optional[int] = Field(None, ge=1, le=30)
    planning_preference: Optional[str] = Field(None, max_length=20)  # daily or weekly


class StudentPreferenceCreate(StudentPreferenceBase):
    pass


class StudentPreferenceUpdate(BaseModel):
    usual_start_time: Optional[str] = Field(None, max_length=5)
    usual_sleep_time: Optional[str] = Field(None, max_length=5)
    preferred_study_session_minutes: Optional[int] = Field(None, ge=5, le=480)
    preferred_break_minutes: Optional[int] = Field(None, ge=1, le=120)
    exam_preparation_days: Optional[int] = Field(None, ge=1, le=30)
    planning_preference: Optional[str] = Field(None, max_length=20)


class StudentPreferenceResponse(StudentPreferenceBase):
    id: int
    student_id: int

    class Config:
        from_attributes = True
