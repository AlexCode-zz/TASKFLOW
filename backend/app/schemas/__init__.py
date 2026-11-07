# Esquemas Pydantic
from app.schemas.student import StudentBase, StudentCreate, StudentUpdate, StudentResponse, ConfigurationStatus
from app.schemas.subject import SubjectBase, SubjectCreate, SubjectUpdate, SubjectResponse
from app.schemas.weekly_availability import (
    WeeklyAvailabilityBase,
    WeeklyAvailabilityCreate,
    WeeklyAvailabilityUpdate,
    WeeklyAvailabilityResponse,
    WeeklyAvailabilitySet,
)
from app.schemas.student_preference import (
    StudentPreferenceBase,
    StudentPreferenceCreate,
    StudentPreferenceUpdate,
    StudentPreferenceResponse,
)

__all__ = [
    "StudentBase",
    "StudentCreate",
    "StudentUpdate",
    "StudentResponse",
    "ConfigurationStatus",
    "SubjectBase",
    "SubjectCreate",
    "SubjectUpdate",
    "SubjectResponse",
    "WeeklyAvailabilityBase",
    "WeeklyAvailabilityCreate",
    "WeeklyAvailabilityUpdate",
    "WeeklyAvailabilityResponse",
    "WeeklyAvailabilitySet",
    "StudentPreferenceBase",
    "StudentPreferenceCreate",
    "StudentPreferenceUpdate",
    "StudentPreferenceResponse",
]
