"""Pruebas del módulo académico: parciales, laboratorios y promedio ponderado."""

from fastapi.testclient import TestClient


def _create_student(client: TestClient):
    client.post("/api/students/", json={
        "name": "Juan Pérez",
        "career": "Ingeniería",
        "semester": "3º",
    })
    client.post("/api/students/me/complete")


def _create_subject(client: TestClient, name: str = "Cálculo Diferencial", code: str = "MAT-101"):
    response = client.post("/api/subjects/", json={
        "name": name,
        "code": code,
        "color": "#3b82f6",
    })
    assert response.status_code == 201
    return response.json()


def test_created_subject_has_default_four_parciales_and_laboratorios(client: TestClient):
    """Cada materia nueva nace con 4 parciales y 4 laboratorios vacíos."""
    _create_student(client)
    subject = _create_subject(client)

    items = client.get(f"/api/subjects/{subject['id']}/academic-items").json()
    assert len(items["parciales"]) == 4
    assert len(items["laboratorios"]) == 4
    assert items["summary"]["average"] is None
    assert items["summary"]["graded_count"] == 0


def test_default_items_are_empty_without_date(client: TestClient):
    """Los ítems sembrados deben tener fecha nula y estado pendiente."""
    _create_student(client)
    subject = _create_subject(client)

    items = client.get(f"/api/subjects/{subject['id']}/academic-items").json()
    for parcial in items["parciales"]:
        assert parcial["date"] is None
        assert parcial["status"] == "pendiente"
        assert parcial["grade"] is None
    for laboratorio in items["laboratorios"]:
        assert laboratorio["date"] is None
        assert laboratorio["start_time"] is None
        assert laboratorio["status"] == "pendiente"
        assert laboratorio["grade"] is None


def test_academic_items_requires_existing_subject(client: TestClient):
    """No se deben listar los ítems académicos de una materia inexistente."""
    _create_student(client)
    response = client.get("/api/subjects/999/academic-items")
    assert response.status_code == 404


def test_parcial_with_grade_and_weight_computes_weighted_average(client: TestClient):
    """Sin porcentajes no se promedia; con porcentajes calcula el promedio ponderado."""
    _create_student(client)
    subject = _create_subject(client)

    items = client.get(f"/api/subjects/{subject['id']}/academic-items").json()
    parcial1_id = items["parciales"][0]["id"]
    parcial2_id = items["parciales"][1]["id"]

    update_resp = client.put(f"/api/evaluations/{parcial1_id}", json={
        "status": "realizado",
        "date": "2026-11-15",
        "start_time": "09:00",
        "end_time": "11:00",
        "grade": 80,
        "weight_percentage": 30,
    })
    assert update_resp.status_code == 200

    items_after = client.get(f"/api/subjects/{subject['id']}/academic-items").json()
    assert items_after["summary"]["average"] == 80, "Con un solo ítem ponderado el promedio es su nota"
    assert items_after["summary"]["weight_total"] == 30
    assert items_after["summary"]["graded_count"] == 1
    assert items_after["summary"]["completed_parciales"] == 1

    update_resp2 = client.put(f"/api/evaluations/{parcial2_id}", json={
        "status": "realizado",
        "date": "2026-11-22",
        "start_time": "09:00",
        "end_time": "11:00",
        "grade": 90,
        "weight_percentage": 70,
    })
    assert update_resp2.status_code == 200

    items_after = client.get(f"/api/subjects/{subject['id']}/academic-items").json()
    assert items_after["summary"]["average"] == 87, "Promedio ponderado esperado: (80*30 + 90*70) / 100"
    assert items_after["summary"]["weight_total"] == 100
    assert items_after["summary"]["graded_count"] == 2
    assert items_after["summary"]["completed_parciales"] == 2


def test_no_average_without_weights(client: TestClient):
    """Sin porcentajes registrados el promedio global no se calcula."""
    _create_student(client)
    subject = _create_subject(client)

    items = client.get(f"/api/subjects/{subject['id']}/academic-items").json()
    for parcial in items["parciales"]:
        client.put(f"/api/evaluations/{parcial['id']}", json={"grade": 85})

    items_after = client.get(f"/api/subjects/{subject['id']}/academic-items").json()
    assert items_after["summary"]["average"] is None
    assert items_after["summary"]["weight_total"] == 0
    assert items_after["summary"]["graded_count"] == 4


def test_laboratorio_realizado_updates_summary(client: TestClient):
    """Marcar un laboratorio como realizado incrementa el conteo de completados."""
    _create_student(client)
    subject = _create_subject(client)

    items = client.get(f"/api/subjects/{subject['id']}/academic-items").json()
    laboratorio_id = items["laboratorios"][0]["id"]

    update_resp = client.put(f"/api/laboratories/{laboratorio_id}", json={
        "status": "realizado",
        "date": "2026-11-12",
        "start_time": "08:00",
        "end_time": "10:00",
        "grade": 90,
        "weight_percentage": 20,
    })
    assert update_resp.status_code == 200

    items_after = client.get(f"/api/subjects/{subject['id']}/academic-items").json()
    assert items_after["summary"]["completed_laboratorios"] == 1
    assert items_after["summary"]["completed_parciales"] == 0


def test_laboratory_title_is_optional(client: TestClient):
    """El título de un laboratorio es opcional: se usa 'Laboratorio' por defecto."""
    _create_student(client)
    subject = _create_subject(client)

    response = client.post("/api/laboratories/", json={
        "subject_id": subject["id"],
        "title": None,
        "status": "pendiente",
    })
    assert response.status_code == 201
    assert response.json()["title"] == "Laboratorio"

    lab_id = response.json()["id"]
    update_resp = client.put(f"/api/laboratories/{lab_id}", json={"title": None})
    assert update_resp.status_code == 200
    assert update_resp.json()["title"] == "Laboratorio"


def test_evaluation_title_is_optional(client: TestClient):
    """El título de una evaluación es opcional: se usa 'Parcial' por defecto."""
    _create_student(client)
    subject = _create_subject(client)

    response = client.post("/api/evaluations/", json={
        "subject_id": subject["id"],
        "evaluation_type": "parcial",
        "status": "pendiente",
    })
    assert response.status_code == 201
    assert response.json()["title"] == "Parcial"

    evaluation_id = response.json()["id"]
    update_resp = client.put(f"/api/evaluations/{evaluation_id}", json={"title": ""})
    assert update_resp.status_code == 200
    assert update_resp.json()["title"] == "Parcial"
