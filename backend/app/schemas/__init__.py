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
from app.schemas.class_schedule import (
    ClassScheduleBase,
    ClassScheduleCreate,
    ClassScheduleUpdate,
    ClassScheduleResponse,
)
from app.schemas.laboratory import (
    LaboratoryBase,
    LaboratoryCreate,
    LaboratoryUpdate,
    LaboratoryResponse,
)
from app.schemas.evaluation import (
    EvaluationBase,
    EvaluationCreate,
    EvaluationUpdate,
    EvaluationResponse,
)
from app.schemas.task import (
    TaskBase,
    TaskCreate,
    TaskUpdate,
    TaskResponse,
)
from app.schemas.project import (
    ProjectBase,
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
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
    "ClassScheduleBase",
    "ClassScheduleCreate",
    "ClassScheduleUpdate",
    "ClassScheduleResponse",
    "LaboratoryBase",
    "LaboratoryCreate",
    "LaboratoryUpdate",
    "LaboratoryResponse",
    "EvaluationBase",
    "EvaluationCreate",
    "EvaluationUpdate",
    "EvaluationResponse",
    "TaskBase",
    "TaskCreate",
    "TaskUpdate",
    "TaskResponse",
    "ProjectBase",
    "ProjectCreate",
    "ProjectUpdate",
    "ProjectResponse",
]
