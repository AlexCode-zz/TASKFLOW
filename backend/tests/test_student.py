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


def test_create_student_minimal_payload(client: TestClient):
    """Prueba crear estudiante solo con nombre (payload mínimo, sin 422)."""
    response = client.post("/api/students/", json={
        "name": "Ana Gómez",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Ana Gómez"
    assert data["career"] is None
    assert data["institution"] is None


def test_create_student_complete_payload(client: TestClient):
    """Prueba crear estudiante con todos los campos (payload completo, sin 422)."""
    response = client.post("/api/students/", json={
        "name": "Carlos Ruiz",
        "institution": "Universidad Nacional",
        "career": "Ingeniería",
        "faculty": "Ingeniería",
        "academic_year": 3,
        "semester": "3º",
        "cycle_start_date": "2026-08-01",
        "cycle_end_date": "2026-12-15",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Carlos Ruiz"
    assert data["career"] == "Ingeniería"
    assert data["semester"] == "3º"


def test_create_student_empty_strings_to_none(client: TestClient):
    """Prueba que strings vacíos se conviertan a null sin 422."""
    response = client.post("/api/students/", json={
        "name": "María López",
        "institution": "",
        "career": "",
        "faculty": "",
        "academic_year": "",
        "semester": "",
        "cycle_start_date": "",
        "cycle_end_date": "",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "María López"
    assert data["institution"] is None
    assert data["career"] is None
    assert data["academic_year"] is None
    assert data["semester"] is None
