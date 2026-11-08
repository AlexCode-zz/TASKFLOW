"""Pruebas de respaldo y restauración de datos."""

import json
from fastapi.testclient import TestClient


def test_export_backup(client: TestClient):
    """Prueba exportar datos a JSON."""
    # Crear estudiante
    resp = client.post("/api/students/", json={
        "name": "María García",
        "institution": "Universidad Nacional",
        "career": "Ingeniería en Sistemas",
        "semester": "3º",
    })
    print(f"Create student status: {resp.status_code}")
    assert resp.status_code == 201, f"Expected 201, got {resp.status_code}: {resp.text}"

    resp = client.post("/api/students/me/complete")
    print(f"Complete config status: {resp.status_code}")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"

    resp = client.post("/api/subjects/", json={
        "name": "Cálculo Diferencial",
        "code": "MAT-101",
        "teacher": "Dra. Elena",
        "color": "#3b82f6",
        "classroom": "Aula 101",
    })
    print(f"Create subject status: {resp.status_code}")
    assert resp.status_code == 201, f"Expected 201, got {resp.status_code}: {resp.text}"

    resp = client.post("/api/tasks/", json={
        "subject_id": 1,
        "title": "Tarea de límites",
        "due_date": "2026-11-12",
        "priority": "alta",
        "status": "pendiente",
        "estimated_minutes": 120,
    })
    print(f"Create task status: {resp.status_code}")
    assert resp.status_code == 201, f"Expected 201, got {resp.status_code}: {resp.text}"

    response = client.get("/api/backup/export")
    print(f"Export backup status: {response.status_code}")
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()
    assert "student" in data
    assert "subjects" in data
    assert "tasks" in data
    assert data["student"]["name"] == "María García"


def test_validate_backup_valid(client: TestClient):
    """Prueba validar un respaldo válido."""
    resp = client.post("/api/students/", json={
        "name": "María García",
        "career": "Ingeniería",
        "semester": "3º",
    })
    assert resp.status_code == 201
    client.post("/api/students/me/complete")

    export_response = client.get("/api/backup/export")
    assert export_response.status_code == 200
    backup_data = export_response.json()

    files = {"file": ("backup.json", json.dumps(backup_data), "application/json")}
    response = client.post("/api/backup/validate", files=files)
    assert response.status_code == 200
    assert response.json()["valid"] is True


def test_validate_backup_invalid_json(client: TestClient):
    """Prueba validar un JSON inválido."""
    files = {"file": ("backup.json", "not valid json", "application/json")}
    response = client.post("/api/backup/validate", files=files)
    assert response.status_code == 400
