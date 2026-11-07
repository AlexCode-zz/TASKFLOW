from pydantic import BaseModel, Field
from datetime import date
from typing import Optional


class LaboratoryBase(BaseModel):
    subject_id: int = Field(..., gt=0)
    title: str = Field(..., min_length=1, max_length=150)
    date: date
    start_time: str = Field(..., max_length=5)  # HH:MM
    end_time: str = Field(..., max_length=5)    # HH:MM
    location: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    materials: Optional[str] = None
    status: str = Field(default="pendiente", max_length=20)  # pendiente, realizado, cancelado


class LaboratoryCreate(LaboratoryBase):
    pass


class LaboratoryUpdate(BaseModel):
    subject_id: Optional[int] = Field(None, gt=0)
    title: Optional[str] = Field(None, min_length=1, max_length=150)
    date: Optional[date] = None
    start_time: Optional[str] = Field(None, max_length=5)
    end_time: Optional[str] = Field(None, max_length=5)
    location: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    materials: Optional[str] = None
    status: Optional[str] = Field(None, max_length=20)


class LaboratoryResponse(LaboratoryBase):
    id: int
    student_id: int

    class Config:
        from_attributes = True
