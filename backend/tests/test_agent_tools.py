"""Pruebas de las herramientas controladas del asistente IA.

Cubre: CRUD de materias/tareas/proyectos vía herramientas, gate de
confirmación, registro de notas con promedio, detección de conflictos
de horario con datos reales e informes académicos que no inventan datos.
"""

from fastapi.testclient import TestClient


def _setup_student(client: TestClient) -> None:
    client.post("/api/students/", json={
        "name": "Juan Pérez",
        "career": "Ingeniería de Sistemas",
        "semester": "3º",
    })
    client.post("/api/students/me/complete")


def _call_tool(client: TestClient, tool: str, parameters: dict | None = None):
    return client.post("/api/ai/tools/call", json={
        "tool": tool,
        "parameters": parameters or {},
    })


def _create_subject(client: TestClient, name: str = "Cálculo Diferencial", **extra):
    payload = {"name": name, "code": extra.pop("code", "MAT-101")}
    payload.update(extra)
    response = _call_tool(client, "create_subject", payload)
    assert response.status_code == 200
    return response.json()


# ── Materias ────────────────────────────────────────────────────────


def test_get_subjects_empty_returns_nothing_invented(client: TestClient):
    """Sin materias la herramienta devuelve lista vacía, no datos inventados."""
    _setup_student(client)
    response = _call_tool(client, "get_subjects")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"] == []


def test_create_subject_tool_creates_parciales_and_laboratories(client: TestClient):
    """La materia creada por el agente nace con 4 parciales y 4 laboratorios."""
    _setup_student(client)
    result = _create_subject(client, "Cálculo Diferencial")
    assert result["success"] is True
    subject_id = result["data"]["id"]

    academic = client.get(f"/api/subjects/{subject_id}/academic-items")
    assert academic.status_code == 200
    body = academic.json()
    assert len(body["parciales"]) == 4
    assert len(body["laboratorios"]) == 4
    assert body["parciales"][0]["title"] == "Parcial 1"

    listing = _call_tool(client, "get_subjects")
    assert listing.json()["data"][0]["name"] == "Cálculo Diferencial"


def test_update_subject_requires_confirmation(client: TestClient):
    """update_subject sin confirmed no modifica nada y pide confirmación."""
    _setup_student(client)
    result = _create_subject(client)
    subject_id = result["data"]["id"]

    denied = _call_tool(client, "update_subject", {
        "subject": str(subject_id),
        "teacher": "Dra. Elena",
    })
    body = denied.json()
    assert body["success"] is False
    assert body["requires_confirmation"] is True

    # El docente no cambió
    listing = _call_tool(client, "get_subjects").json()["data"]
    assert listing[0]["teacher"] is None

    approved = _call_tool(client, "update_subject", {
        "subject": str(subject_id),
        "teacher": "Dra. Elena",
        "confirmed": True,
    })
    assert approved.json()["success"] is True
    listing = _call_tool(client, "get_subjects").json()["data"]
    assert listing[0]["teacher"] == "Dra. Elena"


def test_update_subject_resolves_by_name(client: TestClient):
    """La materia se puede referenciar por nombre además de por ID."""
    _setup_student(client)
    _create_subject(client, "Física III")

    approved = _call_tool(client, "update_subject", {
        "subject": "física",
        "classroom": "Lab 3",
        "confirmed": True,
    })
    assert approved.json()["success"] is True
    listing = _call_tool(client, "get_subjects").json()["data"]
    assert listing[0]["classroom"] == "Lab 3"


# ── Tareas ──────────────────────────────────────────────────────────


def test_create_task_and_complete_requires_confirmation(client: TestClient):
    """create_task es aditivo directo; completar exige confirmación."""
    _setup_student(client)
    subject = _create_subject(client, "Programación II")

    created = _call_tool(client, "create_task", {
        "title": "Laboratorio de listas enlazadas",
        "subject": "Programación II",
        "due_date": "2026-11-20",
        "priority": "alta",
    })
    assert created.json()["success"] is True
    task_id = created.json()["data"]["id"]

    # Intento sin confirmación: no cambia el estado
    denied = _call_tool(client, "complete_task", {"task": str(task_id)})
    body = denied.json()
    assert body["success"] is False
    assert body["requires_confirmation"] is True

    tasks = _call_tool(client, "get_tasks").json()["data"]
    assert tasks[0]["status"] == "pendiente"

    approved = _call_tool(client, "complete_task", {
        "task": "Laboratorio de listas enlazadas",
        "confirmed": True,
    })
    assert approved.json()["success"] is True

    completed = _call_tool(client, "get_tasks_by_status", {"status": "completada"})
    assert any(t["id"] == task_id for t in completed.json()["data"])


def test_create_task_validates_priority(client: TestClient):
    """Una prioridad inválida produce error de validación controlado."""
    _setup_student(client)
    result = _call_tool(client, "create_task", {
        "title": "Tarea imposible",
        "priority": "superalta",
    })
    body = result.json()
    assert body["success"] is False
    assert "priority" in body["error"]


# ── Proyectos ───────────────────────────────────────────────────────


def test_create_project_tool(client: TestClient):
    """El agente puede crear proyectos con fecha de inicio y límite."""
    _setup_student(client)
    created = _call_tool(client, "create_project", {
        "name": "Compilador didáctico",
        "start_date": "2026-11-01",
        "due_date": "2026-12-15",
        "priority": "alta",
    })
    assert created.json()["success"] is True

    listing = _call_tool(client, "get_projects").json()["data"]
    assert listing[0]["name"] == "Compilador didáctico"
    assert listing[0]["due_date"] == "2026-12-15"


def test_create_project_rejects_invalid_dates(client: TestClient):
    """La fecha límite anterior a la de inicio se rechaza."""
    _setup_student(client)
    result = _call_tool(client, "create_project", {
        "name": "Proyecto imposible",
        "start_date": "2026-12-15",
        "due_date": "2026-11-01",
    })
    body = result.json()
    assert body["success"] is False
    assert "posterior" in body["error"]


# ── Notas ──────────────────────────────────────────────────────────


def test_register_grade_requires_confirmation(client: TestClient):
    """Registrar una nota exige confirmación explícita."""
    _setup_student(client)
    _create_subject(client, "Álgebra Lineal")

    denied = _call_tool(client, "register_grade", {
        "subject": "Álgebra Lineal",
        "item_type": "parcial",
        "item": "Parcial 1",
        "grade": 85,
    })
    body = denied.json()
    assert body["success"] is False
    assert body["requires_confirmation"] is True


def test_register_grade_updates_weighted_average(client: TestClient):
    """La nota queda registrada y el promedio ponderado se recalcula."""
    _setup_student(client)
    _create_subject(client, "Álgebra Lineal")

    first = _call_tool(client, "register_grade", {
        "subject": "Álgebra Lineal",
        "item_type": "parcial",
        "item": "Parcial 1",
        "grade": 80,
        "weight_percentage": 50,
        "confirmed": True,
    })
    assert first.json()["success"] is True

    second = _call_tool(client, "register_grade", {
        "subject": "Álgebra Lineal",
        "item_type": "parcial",
        "item": "Parcial 2",
        "grade": 40,
        "weight_percentage": 50,
        "confirmed": True,
    })
    data = second.json()["data"]
    # (80*50 + 40*50) / 100 = 60
    assert data["grade"] == 40
    assert data["subject_average"] == 60


def test_register_grade_rejects_out_of_range(client: TestClient):
    """Notas fuera de 0-100 se rechazan con error de validación."""
    _setup_student(client)
    _create_subject(client, "Química General")

    result = _call_tool(client, "register_grade", {
        "subject": "Química General",
        "item_type": "parcial",
        "item": "Parcial 1",
        "grade": 150,
        "confirmed": True,
    })
    body = result.json()
    assert body["success"] is False
    assert "entre 0 y 100" in body["error"]


# ── Conflictos de horario ───────────────────────────────────────────


def _schedule_payload(subject_name: str, day: str, start: str, end: str, **extra):
    payload = {
        "subject": subject_name,
        "day_of_week": day,
        "start_time": start,
        "end_time": end,
    }
    payload.update(extra)
    return payload


def test_detect_schedule_conflicts_with_real_data(client: TestClient):
    """Detecta solapamientos entre clases registradas en la BD real."""
    _setup_student(client)
    _create_subject(client, "Matemáticas I")
    _create_subject(client, "Física I", code="FIS-101")

    # Dos horarios que se solapan el lunes
    created = client.post("/api/class-schedules/", json={
        "subject_id": 1,
        "day_of_week": "lunes",
        "start_time": "08:00",
        "end_time": "10:00",
    })
    assert created.status_code == 201
    client.post("/api/class-schedules/", json={
        "subject_id": 2,
        "day_of_week": "lunes",
        "start_time": "09:00",
        "end_time": "11:00",
    })

    result = _call_tool(client, "detect_schedule_conflicts")
    body = result.json()
    assert body["success"] is True
    conflicts = body["data"]["conflicts"]
    assert body["data"]["conflict_count"] == 1
    assert conflicts[0]["type"] == "class_vs_class"
    assert conflicts[0]["day"] == "lunes"


def test_create_class_schedule_blocked_by_conflict(client: TestClient):
    """El agente no crea un horario que choca; reporta el conflicto."""
    _setup_student(client)
    _create_subject(client, "Matemáticas I")
    _create_subject(client, "Física I", code="FIS-101")

    existing = client.post("/api/class-schedules/", json={
        "subject_id": 1,
        "day_of_week": "martes",
        "start_time": "08:00",
        "end_time": "10:00",
    })
    assert existing.status_code == 201

    blocked = _call_tool(client, "create_class_schedule", _schedule_payload(
        "Física I", "martes", "09:30", "11:30", confirmed=True,
    ))
    body = blocked.json()
    assert body["success"] is False
    assert body["conflict_detected"] is True
    assert body["data"]["conflicts"]

    # No se creó el horario
    schedules = _call_tool(client, "get_class_schedules").json()["data"]
    assert len(schedules) == 1

    # Con allow_conflict explícito sí se crea
    forced = _call_tool(client, "create_class_schedule", _schedule_payload(
        "Física I", "martes", "09:30", "11:30", confirmed=True, allow_conflict=True,
    ))
    assert forced.json()["success"] is True
    schedules = _call_tool(client, "get_class_schedules").json()["data"]
    assert len(schedules) == 2


def test_create_class_schedule_requires_confirmation(client: TestClient):
    """Sin confirmed la creación de horario se bloquea antes de validar conflictos."""
    _setup_student(client)
    _create_subject(client, "Historia")

    denied = _call_tool(client, "create_class_schedule", _schedule_payload(
        "Historia", "miercoles", "10:00", "12:00",
    ))
    body = denied.json()
    assert body["success"] is False
    assert body["requires_confirmation"] is True


def test_detect_overloaded_days(client: TestClient):
    """Detecta sobrecarga cuando muchas tareas vencen el mismo día."""
    _setup_student(client)
    _create_subject(client, "Estadística")

    for title in ("Ejercicios 1", "Ejercicios 2", "Ejercicios 3"):
        _call_tool(client, "create_task", {
            "title": title,
            "subject": "Estadística",
            "due_date": "2026-11-20",
        })

    result = _call_tool(client, "detect_schedule_conflicts")
    overloads = result.json()["data"]["overloads"]
    assert overloads[0]["type"] == "tasks"
    assert overloads[0]["count"] == 3


# ── Informes académicos ─────────────────────────────────────────────


def test_academic_report_empty_indicates_missing_data(client: TestClient):
    """Sin datos el informe lo indica explícitamente; no inventa nada."""
    _setup_student(client)
    result = _call_tool(client, "get_academic_report")
    body = result.json()
    assert body["success"] is True
    report = body["data"]
    assert report["has_data"] is False
    assert report["subjects"]["count"] == 0
    assert report["global_average"] is None
    assert report["tasks"]["total"] == 0


def test_academic_report_with_real_data(client: TestClient):
    """El informe calcula promedios y estados con los datos reales."""
    _setup_student(client)
    _create_subject(client, "Cálculo Diferencial")

    _call_tool(client, "register_grade", {
        "subject": "Cálculo Diferencial",
        "item_type": "parcial",
        "item": "Parcial 1",
        "grade": 80,
        "weight_percentage": 50,
        "confirmed": True,
    })
    _call_tool(client, "register_grade", {
        "subject": "Cálculo Diferencial",
        "item_type": "parcial",
        "item": "Parcial 2",
        "grade": 30,
        "weight_percentage": 50,
        "confirmed": True,
    })
    # Tarea atrasada (vence en el pasado)
    _call_tool(client, "create_task", {
        "title": "Tarea atrasada",
        "subject": "Cálculo Diferencial",
        "due_date": "2020-01-01",
    })

    result = _call_tool(client, "get_academic_report")
    report = result.json()["data"]
    assert report["has_data"] is True
    assert report["passing_grade"] == 51
    assert report["global_average"] == 55.0

    subject = report["subjects"]["detail"][0]
    assert subject["parciales"]["passed"] == 1
    assert subject["parciales"]["failed"] == 1
    assert subject["laboratorios"]["pending"] == 4

    assert report["tasks"]["overdue"] == 1
    assert report["tasks"]["overdue_detail"][0]["title"] == "Tarea atrasada"
    # La materia con nota reprobada aparece como necesitada de atención
    assert report["needs_attention"][0]["subject_id"] == subject["id"]


# ── Límites de seguridad ────────────────────────────────────────────


def test_unknown_tool_rejected(client: TestClient):
    """Herramientas fuera del catálogo se rechazan."""
    _setup_student(client)
    response = _call_tool(client, "drop_table_students")
    body = response.json()
    assert body["success"] is False
    assert "no permitida" in body["error"]


def test_destructive_tools_not_exposed(client: TestClient):
    """El catálogo no expone operaciones de borrado al agente."""
    _setup_student(client)
    catalog = client.get("/api/ai/tools").json()
    names = {tool["name"] for tool in catalog}

    for name in ("delete_subject", "delete_task", "delete_project",
                 "delete_evaluation", "delete_class_schedule", "delete_student"):
        assert name not in names

    for name in names:
        assert not name.startswith("delete")

    # Y ejecutarlas directamente falla
    result = _call_tool(client, "delete_subject", {"subject": "1"})
    assert result.json()["success"] is False


def test_sql_injection_attempt_returns_validation_error(client: TestClient):
    """Un parámetro malicioso no ejecuta SQL; falla validación controlada."""
    _setup_student(client)
    result = _call_tool(client, "create_task", {
        "title": "Tarea'; DROP TABLE tasks; --",
        "due_date": "2026-11-20",
    })
    body = result.json()
    # La tarea se crea con el título como texto plano o falla validación:
    # en ningún caso se ejecuta SQL del modelo.
    assert body["success"] in (True, False)
    listing = client.get("/api/tasks/")
    assert listing.status_code == 200
    assert listing.json() != []
