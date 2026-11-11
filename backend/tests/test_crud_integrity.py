"""Pruebas de integridad referencial y relaciones entre entidades."""

from fastapi.testclient import TestClient


def _setup_student_and_subject(client: TestClient):
    client.post("/api/students/", json={
        "name": "Juan Pérez",
        "career": "Ingeniería",
        "semester": "3º",
    })
    client.post("/api/students/me/complete")
    client.post("/api/subjects/", json={
        "name": "Cálculo",
        "code": "MAT-101",
        "color": "#3b82f6",
    })


def test_task_requires_existing_subject(client: TestClient):
    """Prueba que no se pueda crear tarea con materia inexistente."""
    client.post("/api/students/", json={
        "name": "Juan Pérez",
        "career": "Ingeniería",
        "semester": "3º",
    })
    client.post("/api/students/me/complete")
    response = client.post("/api/tasks/", json={
        "subject_id": 999,
        "title": "Tarea fantasma",
        "due_date": "2026-11-12",
    })
    assert response.status_code in (400, 404, 409, 422)


def test_task_checklist_without_subject_and_due_date(client: TestClient):
    """Una tarea de checklist puede existir sin materia ni fecha de entrega."""
    _setup_student_and_subject(client)
    response = client.post("/api/tasks/", json={
        "title": "Revisar apuntes",
        "status": "pendiente",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Revisar apuntes"
    assert data["subject_id"] is None
    assert data["due_date"] is None
    assert data["project_id"] is None


def test_task_can_belong_to_project_as_checklist(client: TestClient):
    """Una tarea puede asignarse a un proyecto y crecer como checklist."""
    _setup_student_and_subject(client)
    project_resp = client.post("/api/projects/", json={
        "subject_id": 1,
        "name": "Proyecto Compilador",
        "start_date": "2026-11-10",
        "due_date": "2026-12-01",
    })
    assert project_resp.status_code == 201
    project_id = project_resp.json()["id"]

    task_resp = client.post("/api/tasks/", json={
        "project_id": project_id,
        "title": "Implementar lexer",
        "status": "pendiente",
    })
    assert task_resp.status_code == 201
    assert task_resp.json()["project_id"] == project_id


def test_class_schedule_requires_existing_subject(client: TestClient):
    """Prueba que no se pueda crear clase con materia inexistente."""
    client.post("/api/students/", json={
        "name": "Juan Pérez",
        "career": "Ingeniería",
        "semester": "3º",
    })
    client.post("/api/students/me/complete")
    response = client.post("/api/class-schedules/", json={
        "subject_id": 999,
        "day_of_week": "lunes",
        "start_time": "08:00",
        "end_time": "10:00",
    })
    assert response.status_code in (400, 404, 409, 422)


def test_class_schedule_with_optional_dates(client: TestClient):
    """Prueba crear horario con fechas de inicio y fin opcionales."""
    _setup_student_and_subject(client)
    response = client.post("/api/class-schedules/", json={
        "subject_id": 1,
        "day_of_week": "lunes",
        "start_time": "08:00",
        "end_time": "10:00",
        "start_date": "2026-08-01",
        "end_date": "2026-12-15",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["start_date"] == "2026-08-01"
    assert data["end_date"] == "2026-12-15"


def test_evaluation_date_validation(client: TestClient):
    """Prueba validación de hora fin > hora inicio en evaluación."""
    _setup_student_and_subject(client)
    response = client.post("/api/evaluations/", json={
        "subject_id": 1,
        "title": "Parcial",
        "evaluation_type": "parcial",
        "date": "2026-11-15",
        "start_time": "11:00",
        "end_time": "09:00",
    })
    assert response.status_code == 400
