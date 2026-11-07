"""Pruebas de gestión de estudiantes y configuración inicial."""

from datetime import date

from fastapi.testclient import TestClient


def test_create_student(client: TestClient):
    """Prueba crear un estudiante con datos académicos."""
    response = client.post("/api/students/", json={
        "name": "Juan Pérez",
        "institution": "Universidad Nacional",
        "career": "Ingeniería en Sistemas",
        "faculty": "Ingeniería",
        "academic_year": 3,
        "semester": "3º",
        "cycle_start_date": "2026-08-01",
        "cycle_end_date": "2026-12-15",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Juan Pérez"
    assert data["career"] == "Ingeniería en Sistemas"
    assert data["id"] == 1


def test_get_student_profile(client: TestClient):
    """Prueba obtener el perfil del estudiante."""
    client.post("/api/students/", json={
        "name": "Juan Pérez",
        "career": "Ingeniería",
        "semester": "3º",
    })
    response = client.get("/api/students/me")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Juan Pérez"


def test_configuration_status_false_when_not_configured(client: TestClient):
    """Prueba que configuration-status sea false cuando no hay estudiante."""
    response = client.get("/api/students/configuration-status")
    assert response.status_code == 200
    assert response.json()["is_configured"] is False


def test_complete_configuration(client: TestClient):
    """Prueba completar la configuración inicial."""
    client.post("/api/students/", json={
        "name": "Juan Pérez",
        "career": "Ingeniería",
        "semester": "3º",
    })
    response = client.post("/api/students/me/complete")
    assert response.status_code == 200
    assert response.json()["is_configured"] is True

    status_response = client.get("/api/students/configuration-status")
    assert status_response.json()["is_configured"] is True


def test_update_student_profile(client: TestClient):
    """Prueba actualizar el perfil del estudiante."""
    client.post("/api/students/", json={
        "name": "Juan Pérez",
        "career": "Ingeniería",
        "semester": "3º",
    })
    response = client.put("/api/students/me", json={
        "name": "Juan Pérez García",
        "career": "Ingeniería en Sistemas",
    })
    assert response.status_code == 200
    assert response.json()["name"] == "Juan Pérez García"
    assert response.json()["career"] == "Ingeniería en Sistemas"


def test_cycle_end_date_before_start_validation(client: TestClient):
    """Prueba que se rechace fecha de fin antes que inicio."""
    response = client.post("/api/students/", json={
        "name": "Juan Pérez",
        "career": "Ingeniería",
        "cycle_start_date": "2026-12-01",
        "cycle_end_date": "2026-08-01",
    })
    assert response.status_code in (400, 422)
