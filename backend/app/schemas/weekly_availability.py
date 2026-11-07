from pydantic import BaseModel, Field
from typing import Optional, List


class WeeklyAvailabilityBase(BaseModel):
    day_of_week: str = Field(..., max_length=20)
    is_available: bool = True
    start_time: Optional[str] = Field(None, max_length=5)  # HH:MM
    end_time: Optional[str] = Field(None, max_length=5)    # HH:MM


class WeeklyAvailabilityCreate(WeeklyAvailabilityBase):
    pass


class WeeklyAvailabilityUpdate(BaseModel):
    is_available: Optional[bool] = None
    start_time: Optional[str] = Field(None, max_length=5)
    end_time: Optional[str] = Field(None, max_length=5)


class WeeklyAvailabilityResponse(WeeklyAvailabilityBase):
    id: int
    student_id: int

    class Config:
        from_attributes = True


class WeeklyAvailabilitySet(BaseModel):
    """Conjunto de disponibilidad para todos los días de la semana."""
    availability: List[WeeklyAvailabilityCreate]
