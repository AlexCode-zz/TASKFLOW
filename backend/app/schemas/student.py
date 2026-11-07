from pydantic import BaseModel, Field, validator
from datetime import date
from typing import Optional, List


class StudentBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    institution: Optional[str] = Field(None, max_length=100)
    career: str = Field(..., min_length=1, max_length=100)
    faculty: Optional[str] = Field(None, max_length=100)
    academic_year: Optional[int] = Field(None, ge=1, le=10)
    semester: Optional[str] = Field(None, max_length=20)
    cycle_start_date: Optional[date] = None
    cycle_end_date: Optional[date] = None

    @validator("cycle_end_date")
    def end_after_start(cls, v, values):
        if v is not None and values.get("cycle_start_date") is not None:
            if v < values["cycle_start_date"]:
                raise ValueError("La fecha de finalización debe ser posterior a la de inicio")
        return v


class StudentCreate(StudentBase):
    pass


class StudentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    institution: Optional[str] = Field(None, max_length=100)
    career: Optional[str] = Field(None, min_length=1, max_length=100)
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
