from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import date


def _empty_to_none(value):
    """Convierte strings vacíos a None para campos opcionales."""
    if value == "" or value is None:
        return None
    return value


class ClassScheduleBase(BaseModel):
    subject_id: int = Field(..., gt=0)
    day_of_week: str = Field(..., max_length=20)
    start_time: str = Field(..., max_length=5)  # HH:MM
    end_time: str = Field(..., max_length=5)    # HH:MM
    room: Optional[str] = Field(None, max_length=50)
    teacher: Optional[str] = Field(None, max_length=100)
    modality: str = Field(default="presencial", max_length=20)  # presencial, virtual, hybrid
    observations: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None

    @field_validator("start_date", "end_date", mode="before")
    @classmethod
    def empty_to_none_date(cls, v):
        return _empty_to_none(v)

    @field_validator("end_date")
    @classmethod
    def end_after_start(cls, v, info):
        if v is not None and info.data.get("start_date") is not None:
            if v < info.data["start_date"]:
                raise ValueError("La fecha de finalización debe ser posterior a la de inicio")
        return v


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
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class ClassScheduleResponse(ClassScheduleBase):
    id: int
    student_id: int

    class Config:
        from_attributes = True
