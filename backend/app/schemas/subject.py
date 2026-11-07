from pydantic import BaseModel, Field
from typing import Optional


class SubjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    code: Optional[str] = Field(None, max_length=20)
    teacher: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    color: str = Field(default="#6366f1", max_length=20)
    credits: Optional[int] = Field(None, ge=1, le=20)


class SubjectCreate(SubjectBase):
    pass


class SubjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    code: Optional[str] = Field(None, max_length=20)
    teacher: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    color: Optional[str] = Field(None, max_length=20)
    credits: Optional[int] = Field(None, ge=1, le=20)


class SubjectResponse(SubjectBase):
    id: int
    student_id: int

    class Config:
        from_attributes = True
