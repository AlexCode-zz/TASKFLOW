from pydantic import BaseModel, Field
from typing import Optional


class ClassScheduleBase(BaseModel):
    subject_id: int = Field(..., gt=0)
    day_of_week: str = Field(..., max_length=20)
    start_time: str = Field(..., max_length=5)  # HH:MM
    end_time: str = Field(..., max_length=5)    # HH:MM
    room: Optional[str] = Field(None, max_length=50)
    teacher: Optional[str] = Field(None, max_length=100)
    modality: str = Field(default="presencial", max_length=20)  # presencial, virtual, hybrid
    observations: Optional[str] = None


class ClassScheduleCreate(ClassScheduleBase):
    pass


class ClassScheduleUpdate(BaseModel):
    subject_id: Optional[int] = Field(None, gt=0)
    day_of_week: Optional[str] = Field(None, max_length=20)
    start_time: Optional[str] = Field(None, max_length=5)
    end_time: Optional[str] = Field(None, max_length=5)
    room: Optional[str] = Field(None, max_length=50)
    teacher: Optional[str] = Field(None, max_length=100)
    modality: Optional[str] = Field(None, max_length=20)
    observations: Optional[str] = None


class ClassScheduleResponse(ClassScheduleBase):
    id: int
    student_id: int

    class Config:
        from_attributes = True
