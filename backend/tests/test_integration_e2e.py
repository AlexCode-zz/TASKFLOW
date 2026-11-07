"""Pruebas de integración end-to-end para flujos críticos de TaskFlow.

Verifica que los módulos funcionen correctamente entre sí:
- Estudiante → Materias → Tareas → Planificación → Calendario
- Configuración de disponibilidad afecta al planificador
- Completar tarea actualiza su estado
- Replanificación conserva compromisos protegidos
- Asistente IA funciona sin proveedor configurado (error controlado)
"""

from datetime import date
from fastapi.testclient import TestClient


def _setup_complete_student(client: TestClient):
    """Crea un estudiante completo con disponibilidad y preferencias."""
    client.post("/api/students/", json={
        "name": "Ana López",
        "institution": "Universidad Nacional",
        "career": "Ingeniería en Sistemas",
        "semester": "3º",
        "cycle_start_date": "2026-08-01",
        "cycle_end_date": "2026-12-15",
    })
    client.post("/api/students/me/complete")

    client.post("/api/subjects/", json={
        "name": "Cálculo Diferencial",
        "code": "MAT-101",
        "teacher": "Dra. Elena",
        "color": "#3b82f6",
        "credits": 4,
    })

    client.post("/api/availability/", json={
        "day_of_week": "lunes",
        "is_available": True,
        "start_time": "10:00",
        "end_time": "14:00",
    })

    client.post("/api/preferences/", json={
        "usual_start_time": "07:30",
        "usual_sleep_time": "23:00",
        "preferred_study_session_minutes": 60,
        "preferred_break_minutes": 15,
        "planning_preference": "daily",
    })


def test_complete_academic_flow(client: TestClient):
    """Prueba flujo completo: estudiante → materias → tarea → planificación."""
    _setup_complete_student(client)

    # Crear tarea
    task_resp = client.post("/api/tasks/", json={
        "subject_id": 1,
        "title": "Problemas de límites",
        "due_date": "2026-11-12",
        "priority": "alta",
        "status": "pendiente",
        "estimated_minutes": 120,
    })
    assert task_resp.status_code == 201
    task_id = task_resp.json()["id"]

    # Generar planificación
    plan_resp = client.post("/api/planning/generate", json={})
    assert plan_resp.status_code == 200
    plan_data = plan_resp.json()
    assert plan_data["success"] is True
    assert plan_data["stats"]["total_sessions"] > 0

    # Verificar que la tarea tenga sesiones programadas
    sessions = plan_data["sessions"]
    task_sessions = [s for s in sessions if s.get("task_id") == task_id]
    assert len(task_sessions) > 0, "La tarea debe tener al menos una sesión programada"

    # Verificar que no hay sesiones durante la clase (lunes 08:00-10:00)
    for s in sessions:
        assert not (s["start_time"] < "10:00" and s["end_time"] > "08:00"), \
            f"Sesión {s['title']} solapa con clase 08:00-10:00"

    # Obtener sesiones y verificar persistencia
    sessions_resp = client.get("/api/planning/sessions/")
    assert sessions_resp.status_code == 200
    assert len(sessions_resp.json()) > 0


def test_task_completion_flow(client: TestClient):
    """Prueba que completar una tarea actualice su estado."""
    _setup_complete_student(client)

    client.post("/api/tasks/", json={
        "subject_id": 1,
        "title": "Tarea de prueba",
        "due_date": "2026-11-12",
        "priority": "media",
        "status": "pendiente",
        "estimated_minutes": 60,
    })

    tasks_resp = client.get("/api/tasks/")
    task_id = tasks_resp.json()[0]["id"]

    # Marcar como completada
    update_resp = client.put(f"/api/tasks/{task_id}", json={
        "status": "completada"
    })
    assert update_resp.status_code == 200
    assert update_resp.json()["status"] == "completada"

    # Verificar que ya no aparece como pendiente
    pending_resp = client.get("/api/tasks/status/pendiente")
    assert pending_resp.status_code == 200
    pending_ids = [t["id"] for t in pending_resp.json()]
    assert task_id not in pending_ids


def test_availability_affects_planning(client: TestClient):
    """Prueba que modificar disponibilidad afecte al planificador."""
    _setup_complete_student(client)

    client.post("/api/tasks/", json={
        "subject_id": 1,
        "title": "Tarea larga",
        "due_date": "2026-11-12",
        "priority": "alta",
        "status": "pendiente",
        "estimated_minutes": 240,
    })

    # Planificar con disponibilidad lunes 10:00-14:00 (4 horas)
    plan1_resp = client.post("/api/planning/generate", json={})
    assert plan1_resp.status_code == 200
    plan1_sessions = plan1_resp.json()["sessions"]
    plan1_hours = plan1_resp.json()["stats"]["scheduled_hours"]

    # Cambiar disponibilidad a solo 1 hora el lunes
    client.put("/api/availability/lunes", json={
        "is_available": True,
        "start_time": "10:00",
        "end_time": "11:00",
    })

    plan2_resp = client.post("/api/planning/generate", json={})
    assert plan2_resp.status_code == 200
    plan2_hours = plan2_resp.json()["stats"]["scheduled_hours"]

    # Menos disponibilidad debería resultar en menos horas programadas
    assert plan2_hours <= plan1_hours, \
        f"Menos disponibilidad ({plan2_hours}h) no debería programar más horas que antes ({plan1_hours}h)"


def test_assistant_without_ai_provider(client: TestClient):
    """Prueba que el asistente dé error controlado sin proveedor configurado."""
    _setup_complete_student(client)

    # Intentar enviar mensaje sin proveedor configurado
    chat_resp = client.post("/ai/chat/", json={
        "message": "Hola, ¿cómo organizo mis tareas?",
        "use_academic_context": True,
    })
    # Debe fallar porque no hay proveedor de IA configurado
    assert chat_resp.status_code != 200
    assert chat_resp.status_code in (400, 404, 500)


def test_backup_and_restore_flow(client: TestClient):
    """Prueba flujo de respaldo y restauración."""
    _setup_complete_student(client)

    client.post("/api/tasks/", json={
        "subject_id": 1,
        "title": "Tarea para respaldo",
        "due_date": "2026-11-12",
        "priority": "media",
        "status": "pendiente",
    })

    # Exportar respaldo
    export_resp = client.get("/api/backup/export")
    assert export_resp.status_code == 200
    backup_data = export_resp.json()
    assert backup_data["student"]["name"] == "Ana López"
    assert len(backup_data["subjects"]) >= 1
    assert len(backup_data["tasks"]) >= 1

    # Validar estructura del respaldo tiene las claves requeridas
    required_keys = [
        "exported_at", "version", "student", "subjects", "weekly_availability",
        "preferences", "class_schedules", "laboratories", "evaluations",
        "tasks", "projects", "plans", "planning_sessions",
    ]
    for key in required_keys:
        assert key in backup_data, f"Falta sección obligatoria: {key}"

    # Validar estructura del estudiante
    assert backup_data["student"]["name"] == "Ana López"
    assert backup_data["student"]["career"] == "Ingeniería en Sistemas"


def test_subject_appears_in_calendar(client: TestClient):
    """Prueba que una materia creada aparezca disponible para clases."""
    _setup_complete_student(client)

    client.post("/api/class-schedules/", json={
        "subject_id": 1,
        "day_of_week": "miércoles",
        "start_time": "14:00",
        "end_time": "16:00",
        "room": "Salón A-101",
        "modality": "presencial",
    })

    schedules_resp = client.get("/api/class-schedules/")
    assert schedules_resp.status_code == 200
    schedules = schedules_resp.json()
    assert len(schedules) == 1
    assert schedules[0]["subject_id"] == 1
    assert schedules[0]["day_of_week"] == "miércoles"


def test_evaluation_appears_in_upcoming(client: TestClient):
    """Prueba que un examen aparezca como evaluación próxima."""
    _setup_complete_student(client)

    client.post("/api/evaluations/", json={
        "subject_id": 1,
        "title": "Parcial 1",
        "evaluation_type": "parcial",
        "date": "2026-11-15",
        "start_time": "09:00",
        "end_time": "11:00",
        "weight_percentage": 30,
        "status": "pendiente",
    })

    upcoming_resp = client.get("/api/evaluations/upcoming")
    assert upcoming_resp.status_code == 200
    upcoming = upcoming_resp.json()
    assert len(upcoming) == 1
    assert upcoming[0]["title"] == "Parcial 1"


def test_delete_subject_cascades(client: TestClient):
    """Prueba que eliminar una materia elimine sus clases y tareas asociadas."""
    _setup_complete_student(client)

    client.post("/api/class-schedules/", json={
        "subject_id": 1,
        "day_of_week": "lunes",
        "start_time": "08:00",
        "end_time": "10:00",
    })

    client.post("/api/tasks/", json={
        "subject_id": 1,
        "title": "Tarea para eliminar",
        "due_date": "2026-11-12",
        "priority": "baja",
        "status": "pendiente",
    })

    # Eliminar materia
    delete_resp = client.delete("/api/subjects/1")
    assert delete_resp.status_code == 204

    # Verificar que las clases de esa materia se eliminaron
    schedules_resp = client.get("/api/class-schedules/")
    assert len(schedules_resp.json()) == 0

    # Verificar que las tareas de esa materia se eliminaron
    tasks_resp = client.get("/api/tasks/")
    assert len(tasks_resp.json()) == 0


def test_replanification_preserves_completed(client: TestClient):
    """Prueba que la replanificación conserve tareas completadas."""
    _setup_complete_student(client)

    # Crear y completar una tarea
    client.post("/api/tasks/", json={
        "subject_id": 1,
        "title": "Tarea ya completada",
        "due_date": "2026-11-12",
        "priority": "alta",
        "status": "completada",
        "estimated_minutes": 60,
    })

    # Crear tarea pendiente
    client.post("/api/tasks/", json={
        "subject_id": 1,
        "title": "Tarea pendiente",
        "due_date": "2026-11-13",
        "priority": "media",
        "status": "pendiente",
        "estimated_minutes": 60,
    })

    # Generar planificación inicial
    plan1_resp = client.post("/api/planning/generate", json={})
    assert plan1_resp.status_code == 200

    # Regenerar planificación
    plan2_resp = client.post("/api/planning/regenerate", json={})
    assert plan2_resp.status_code == 200
    assert plan2_resp.json()["success"] is True

    # La tarea completada no debería tener sesiones (ya está hecha)
    sessions = plan2_resp.json()["sessions"]
    completed_task_sessions = [s for s in sessions if s.get("title") == "Tarea ya completada"]
    assert len(completed_task_sessions) == 0, \
        "Las tareas completadas no deberían tener sesiones programadas"