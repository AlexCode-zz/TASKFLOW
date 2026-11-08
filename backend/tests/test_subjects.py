"""Pruebas de gestión de materias."""

from fastapi.testclient import TestClient


def _create_student(client: TestClient):
    client.post("/api/students/", json={
        "name": "Juan Pérez",
        "career": "Ingeniería",
        "semester": "3º",
    })
    client.post("/api/students/me/complete")


def test_create_subject(client: TestClient):
    """Prueba crear una materia."""
    _create_student(client)
    response = client.post("/api/subjects/", json={
        "name": "Cálculo Diferencial",
        "code": "MAT-101",
        "teacher": "Dra. Elena",
        "color": "#3b82f6",
        "classroom": "Aula 101",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Cálculo Diferencial"
    assert data["code"] == "MAT-101"


def test_duplicate_subject_code_rejected(client: TestClient):
    """Prueba que se rechace código de materia duplicado."""
    _create_student(client)
    client.post("/api/subjects/", json={
        "name": "Cálculo Diferencial",
        "code": "MAT-101",
        "color": "#3b82f6",
    })
    response = client.post("/api/subjects/", json={
        "name": "Otra materia",
        "code": "MAT-101",
        "color": "#ef4444",
    })
    assert response.status_code == 400


def test_list_subjects(client: TestClient):
    """Prueba listar materias."""
    _create_student(client)
    client.post("/api/subjects/", json={
        "name": "Cálculo Diferencial",
        "code": "MAT-101",
        "color": "#3b82f6",
    })
    client.post("/api/subjects/", json={
        "name": "Programación II",
        "code": "INF-203",
        "color": "#10b981",
    })
    response = client.get("/api/subjects/")
    assert response.status_code == 200
    assert len(response.json()) == 2


def test_delete_subject(client: TestClient):
    """Prueba eliminar una materia."""
    _create_student(client)
    client.post("/api/subjects/", json={
        "name": "Cálculo Diferencial",
        "code": "MAT-101",
        "color": "#3b82f6",
    })
    response = client.get("/api/subjects/")
    subject_id = response.json()[0]["id"]

    delete_response = client.delete(f"/api/subjects/{subject_id}")
    assert delete_response.status_code == 204

    list_response = client.get("/api/subjects/")
    assert len(list_response.json()) == 0
