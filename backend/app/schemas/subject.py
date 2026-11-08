from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import date


def _empty_to_none(value):
    """Convierte strings vacíos a None para campos opcionales."""
    if value == "" or value is None:
        return None
    return value


class SubjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    code: Optional[str] = Field(None, max_length=20)
    teacher: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    color: str = Field(default="#6366f1", max_length=20)
    classroom: Optional[str] = Field(None, max_length=50)
    cycle: Optional[int] = Field(None, ge=1, le=20)
    is_favorite: bool = False
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


class SubjectCreate(SubjectBase):
    pass


class SubjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    code: Optional[str] = Field(None, max_length=20)
    teacher: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    color: Optional[str] = Field(None, max_length=20)
    classroom: Optional[str] = Field(None, max_length=50)
    cycle: Optional[int] = Field(None, ge=1, le=20)
    is_favorite: Optional[bool] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class SubjectResponse(SubjectBase):
    id: int
    student_id: int

    class Config:
        from_attributes = True
