"""Pruebas del motor de planificación automática."""

from datetime import date, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.student import Student
from app.models.subject import Subject
from app.models.task import Task
from app.models.class_schedule import ClassSchedule
from app.models.weekly_availability import WeeklyAvailability
from app.models.student_preference import StudentPreference


def _setup_student_with_data(client: TestClient, db_session: Session):
    """Crea un estudiante completo con materias, disponibilidad y preferencias."""
    student = Student(
        name="Ana López",
        career="Ingeniería",
        semester="3º",
        is_configured=True,
    )
    db_session.add(student)
    db_session.commit()
    db_session.refresh(student)

    subject = Subject(
        student_id=student.id,
        name="Cálculo Diferencial",
        code="MAT-101",
        color="#3b82f6",
        classroom="Aula 101",
    )
    db_session.add(subject)
    db_session.commit()

    task = Task(
        student_id=student.id,
        subject_id=subject.id,
        title="Tarea de límites",
        due_date=date(2026, 11, 12),
        priority="alta",
        status="pendiente",
        estimated_minutes=120,
    )
    db_session.add(task)
    db_session.commit()

    class_schedule = ClassSchedule(
        student_id=student.id,
        subject_id=subject.id,
        day_of_week="lunes",
        start_time="08:00",
        end_time="10:00",
        room="Salón A-101",
    )
    db_session.add(class_schedule)
    db_session.commit()

    availability = WeeklyAvailability(
        student_id=student.id,
        day_of_week="lunes",
        is_available=True,
        start_time="10:00",
        end_time="14:00",
    )
    db_session.add(availability)
    db_session.commit()

    preferences = StudentPreference(
        student_id=student.id,
        usual_start_time="07:30",
        usual_sleep_time="23:00",
        preferred_study_session_minutes=60,
        preferred_break_minutes=15,
    )
    db_session.add(preferences)
    db_session.commit()


def test_planning_generates_sessions(client: TestClient, db_session: Session):
    """Prueba que el motor genere sesiones de planificación."""
    _setup_student_with_data(client, db_session)
    response = client.post("/api/planning/generate", json={})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["sessions"]) > 0
    assert data["stats"]["total_sessions"] > 0


def test_planning_respects_class_schedule(client: TestClient, db_session: Session):
    """Prueba que no se programen sesiones durante clases."""
    _setup_student_with_data(client, db_session)
    response = client.post("/api/planning/generate", json={})
    assert response.status_code == 200
    data = response.json()

    # Verificar que ninguna sesión solape con la clase lunes 08:00-10:00
    for s in data["sessions"]:
        s_start = s["start_time"]
        s_end = s["end_time"]
        # Clase: 08:00-10:00
        assert not (s_start < "10:00" and s_end > "08:00"), \
            f"Sesión {s['title']} solapa con la clase 08:00-10:00"


def test_planning_no_availability_returns_error(client: TestClient, db_session: Session):
    """Prueba que se retorne error cuando no hay disponibilidad configurada."""
    student = Student(name="Juan Pérez", career="Ingeniería", semester="3º", is_configured=True)
    db_session.add(student)
    db_session.commit()

    response = client.post("/api/planning/generate", json={})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False
    assert "disponibilidad" in data["error"].lower()


def test_planning_deterministic(client: TestClient, db_session: Session):
    """Prueba que el motor sea determinista (mismas entradas = mismas salidas)."""
    _setup_student_with_data(client, db_session)
    resp1 = client.post("/api/planning/generate", json={})
    resp2 = client.post("/api/planning/generate", json={})
    assert resp1.json()["stats"]["total_sessions"] == resp2.json()["stats"]["total_sessions"]
