# Lógica de acceso a datos
from app.crud.student import (
    get_student_by_id,
    get_configured_student,
    create_student,
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
