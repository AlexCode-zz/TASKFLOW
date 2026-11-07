from pydantic import BaseModel, Field, field_validator
from datetime import date
from typing import Optional, List


def _empty_to_none(value):
    """Convierte strings vacíos a None para campos opcionales."""
    if value == "" or value is None:
        return None
    return value


class StudentBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    institution: Optional[str] = Field(None, max_length=100)
    career: Optional[str] = Field(None, max_length=100)
    faculty: Optional[str] = Field(None, max_length=100)
    academic_year: Optional[int] = Field(None, ge=1, le=10)
    semester: Optional[str] = Field(None, max_length=20)
    cycle_start_date: Optional[date] = None
    cycle_end_date: Optional[date] = None

    @field_validator("institution", "career", "faculty", "semester", mode="before")
    @classmethod
    def empty_to_none_str(cls, v):
        return _empty_to_none(v)

    @field_validator("academic_year", mode="before")
    @classmethod
    def empty_to_none_int(cls, v):
        if v == "" or v is None:
            return None
        if isinstance(v, str) and v.strip() == "":
            return None
        try:
            return int(v)
        except (ValueError, TypeError):
            return None

    @field_validator("cycle_start_date", "cycle_end_date", mode="before")
    @classmethod
    def empty_to_none_date(cls, v):
        if v == "" or v is None:
            return None
        return v

    @field_validator("cycle_end_date")
    @classmethod
    def end_after_start(cls, v, info):
        if v is not None and info.data.get("cycle_start_date") is not None:
            if v < info.data["cycle_start_date"]:
                raise ValueError("La fecha de finalización debe ser posterior a la de inicio")
        return v


class StudentCreate(StudentBase):
    pass


class StudentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    institution: Optional[str] = Field(None, max_length=100)
    career: Optional[str] = Field(None, max_length=100)
    faculty: Optional[str] = Field(None, max_length=100)
    academic_year: Optional[int] = Field(None, ge=1, le=10)
    semester: Optional[str] = Field(None, max_length=20)
    cycle_start_date: Optional[date] = None
    cycle_end_date: Optional[date] = None


class StudentResponse(StudentBase):
    id: int
    is_configured: bool

    class Config:
        from_attributes = True


class ConfigurationStatus(BaseModel):
    is_configured: bool