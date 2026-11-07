# Lógica de acceso a datos
from app.crud.student import (
    get_latest_student,
    get_configured_student,
    create_or_update_student,
    update_student,
    mark_configured,
)
from app.crud.subject import (
    get_subject,
    get_subjects_by_student,
    get_subject_by_code,
    create_subject,
    update_subject,
    delete_subject,
)
from app.crud.weekly_availability import (
    get_availability_by_student,
    create_or_update_availability,
    delete_availability_by_student,
)
from app.crud.student_preference import (
    get_preference_by_student,
    create_or_update_preference,
)
from app.crud.class_schedule import (
    get_class_schedule,
    get_class_schedules_by_student,
    get_class_schedules_by_subject,
    get_class_schedule_by_day,
    create_class_schedule,
    update_class_schedule,
    delete_class_schedule,
)
from app.crud.laboratory import (
    get_laboratory,
    get_laboratories_by_student,
    get_laboratories_by_subject,
    create_laboratory,
    update_laboratory,
    delete_laboratory,
)
from app.crud.evaluation import (
    get_evaluation,
    get_evaluations_by_student,
    get_evaluations_by_subject,
    get_upcoming_evaluations,
    create_evaluation,
    update_evaluation,
    delete_evaluation,
)
from app.crud.task import (
    get_task,
    get_tasks_by_student,
    get_tasks_by_subject,
    get_tasks_by_status,
    get_upcoming_tasks,
    create_task,
    update_task,
    delete_task,
)
from app.crud.project import (
    get_project,
    get_projects_by_student,
    get_projects_by_subject,
    create_project,
    update_project,
    delete_project,
)
