"""Pruebas del loop del agente académico con un proveedor simulado.

Cubre: protocolo JSON de acciones, flujo de confirmación con consumo
único, deduplicación de acciones repetidas, límite de iteraciones,
clasificación de errores del proveedor (cuota agotada) e informes sin
datos inventados.
"""

import json

import pytest
from fastapi.testclient import TestClient

from app.services.ai.base import ChatResponse
from app.services.ai.errors import AIProviderError
from app.services.ai.manager import ai_manager
from app.services.ai.agent import pending_actions, PendingActionRegistry


class FakeProvider:
    """Proveedor simulado que devuelve respuestas encoladas."""

    def __init__(self, responses):
        self.responses = list(responses)
        self.calls = []

    async def chat(self, provider_name, messages, model=None, temperature=0.7, max_tokens=None):
        self.calls.append([(m.role, m.content) for m in messages])
        if not self.responses:
            raise AssertionError("El proveedor simulado agotó sus respuestas")
        content = self.responses.pop(0)
        if isinstance(content, Exception):
            raise content
        return ChatResponse(
            content=content,
            model="fake-model",
            provider=provider_name,
            tokens_used=17,
            finish_reason="stop",
        )


@pytest.fixture
def student_client(client: TestClient) -> TestClient:
    client.post("/api/students/", json={
        "name": "Juan Pérez",
        "career": "Ingeniería de Sistemas",
        "semester": "3º",
    })
    client.post("/api/students/me/complete")
    return client


def _patch_provider(monkeypatch, responses) -> FakeProvider:
    fake = FakeProvider(responses)
    monkeypatch.setattr(ai_manager, "chat", fake.chat)
    return fake


def _agent_chat(client: TestClient, message: str, conversation_id=None):
    payload = {"message": message, "provider_name": "openrouter"}
    if conversation_id:
        payload["conversation_id"] = conversation_id
    return client.post("/api/ai/agent/chat", json=payload)


def _create_subject(client: TestClient, name: str = "Álgebra Lineal"):
    response = client.post("/api/ai/tools/call", json={
        "tool": "create_subject",
        "parameters": {"name": name},
    })
    return response.json()["data"]["id"]


# ── Protocolo de acciones ──────────────────────────────────────────


def test_agent_executes_tool_then_answers(student_client, monkeypatch):
    """El modelo pide una herramienta en JSON y luego redacta el resultado."""
    fake = _patch_provider(monkeypatch, [
        '{"tool": "get_subjects", "parameters": {}}',
        "Tienes 1 materia registrada: Álgebra Lineal. ¿Quieres registrar otra?",
    ])
    _create_subject(student_client)

    response = _agent_chat(student_client, "¿qué materias tengo?")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["confirmation"] is None
    assert body["error_code"] is None
    assert "Álgebra Lineal" in body["message"]

    assert len(body["tools_executed"]) == 1
    assert body["tools_executed"][0]["tool"] == "get_subjects"
    assert body["tools_executed"][0]["data"][0]["name"] == "Álgebra Lineal"

    # Eventos para el avatar: consulta, herramienta, explicación
    event_types = [e["type"] for e in body["events"]]
    assert "query_received" in event_types
    assert "tool_started" in event_types
    assert "tool_result" in event_types
    assert "explanation" in event_types

    # El proveedor recibió el resultado real de la herramienta
    second_call_messages = fake.calls[1]
    tool_result_message = [c for r, c in second_call_messages if "<tool_result>" in c]
    assert tool_result_message
    assert "get_subjects" in tool_result_message[0]


def test_agent_plain_text_without_tools(student_client, monkeypatch):
    """Una respuesta sin JSON se entrega directamente al usuario."""
    _patch_provider(monkeypatch, ["Hola, soy Mel. ¿En qué te ayudo hoy?"])

    response = _agent_chat(student_client, "hola")
    body = response.json()
    assert body["success"] is True
    assert body["message"] == "Hola, soy Mel. ¿En qué te ayudo hoy?"
    assert body["tools_executed"] == []


def test_agent_rejects_disallowed_tool(student_client, monkeypatch):
    """Una herramienta fuera del catálogo falla de forma controlada."""
    _patch_provider(monkeypatch, [
        '{"tool": "drop_table", "parameters": {"table": "tasks"}}',
        "No puedo hacer eso: no tengo permitido borrar datos.",
    ])

    response = _agent_chat(student_client, "borra todas mis tareas")
    body = response.json()
    assert body["success"] is True
    assert body["tools_executed"] == []
    assert "no puedo" in body["message"].lower()
    event_types = [e["type"] for e in body["events"]]
    assert "tool_result" in event_types


def test_agent_dedup_repeated_action(student_client, monkeypatch):
    """Si el modelo repite la misma acción, no se ejecuta dos veces."""
    repeated = '{"tool": "create_task", "parameters": {"title": "Informe final"}}'
    _patch_provider(monkeypatch, [repeated, repeated])

    response = _agent_chat(student_client, "crea la tarea informe final dos veces")
    body = response.json()
    assert body["success"] is True

    tasks = client_response = student_client.get("/api/tasks/")
    tasks_list = tasks.json()
    assert len(tasks_list) == 1
    assert tasks_list[0]["title"] == "Informe final"


def test_agent_iteration_limit(student_client, monkeypatch):
    """El loop se corta tras el máximo de pasos con un resumen honesto."""

    class CountingFake:
        def __init__(self):
            self.calls = 0

        async def chat(self, provider_name, messages, model=None, temperature=0.7, max_tokens=None):
            self.calls += 1
            tools = ["get_subjects", "get_tasks", "get_evaluations", "get_projects", "get_laboratories"]
            tool = tools[min(self.calls - 1, len(tools) - 1)]
            return ChatResponse(
                content=json.dumps({"tool": tool, "parameters": {}}),
                model="fake-model",
                provider=provider_name,
                tokens_used=5,
                finish_reason="stop",
            )

    fake = CountingFake()
    monkeypatch.setattr(ai_manager, "chat", fake.chat)

    response = _agent_chat(student_client, "dame todo")
    body = response.json()
    assert body["success"] is True
    assert len(body["tools_executed"]) == 4
    assert "límite" in body["message"].lower()


# ── Confirmaciones ──────────────────────────────────────────────────


def test_agent_confirmation_flow_register_grade(student_client, monkeypatch):
    """Las modificaciones requieren confirmación del usuario real.

    Aunque el modelo envíe `confirmed: true`, el backend lo ignora y
    registra la acción pendiente; solo el endpoint de confirmación
    (decisión del usuario) la ejecuta, una única vez.
    """
    subject_id = _create_subject(student_client, "Álgebra Lineal")
    _patch_provider(monkeypatch, [
        json.dumps({
            "tool": "register_grade",
            "parameters": {
                "subject": "Álgebra Lineal",
                "item_type": "parcial",
                "item": "Parcial 1",
                "grade": 75,
                "confirmed": True,
            },
        }),
        "Registré tu nota 75 en Parcial 1 de Álgebra Lineal.",
    ])

    response = _agent_chat(student_client, "registré 75 en el parcial 1 de álgebra")
    body = response.json()
    assert body["success"] is True
    confirmation = body["confirmation"]
    assert confirmation is not None
    assert confirmation["tool"] == "register_grade"
    assert confirmation["parameters"]["grade"] == 75
    # El modelo intentó confirmar él mismo: se ignora
    assert "confirmed" not in confirmation["parameters"]
    assert confirmation["action_id"]

    event_types = [e["type"] for e in body["events"]]
    assert "confirmation_required" in event_types
    assert "action_completed" not in event_types

    # La nota NO se registró todavía
    academic = student_client.get(f"/api/subjects/{subject_id}/academic-items").json()
    parcial1 = next(p for p in academic["parciales"] if p["title"] == "Parcial 1")
    assert parcial1["grade"] is None

    # Confirmación del usuario: se ejecuta una sola vez
    accept = student_client.post("/api/ai/agent/confirm", json={
        "action_id": confirmation["action_id"],
        "decision": "accept",
    })
    assert accept.status_code == 200
    accepted = accept.json()
    assert accepted["success"] is True
    assert accepted["cancelled"] is False
    assert accepted["tool"] == "register_grade"
    assert "75" in accepted["message"]
    assert any(e["type"] == "action_completed" for e in accepted["events"])

    academic = student_client.get(f"/api/subjects/{subject_id}/academic-items").json()
    parcial1 = next(p for p in academic["parciales"] if p["title"] == "Parcial 1")
    assert float(parcial1["grade"]) == 75.0
    assert parcial1["status"] == "realizado"

    # Consumo único: reintentar la confirmación ya no funciona
    repeat = student_client.post("/api/ai/agent/confirm", json={
        "action_id": confirmation["action_id"],
        "decision": "accept",
    })
    assert repeat.status_code == 404


def test_agent_confirm_chains_next_pending_action(student_client, monkeypatch):
    """Tras aceptar una acción, el bucle continúa solo.

    Si la ejecución confirmada completa con éxito, el agente vuelve a
    consultar al modelo para proponer la siguiente acción pendiente sin
    que el usuario tenga que escribir otro mensaje. Así una petición tipo
    "cambia los nombres de las tareas" avanza paso a paso con aprobaciones
    sucesivas en las tarjetas, no con turnos de chat.
    """
    _create_subject(student_client, "Química")
    _patch_provider(monkeypatch, [
        json.dumps({
            "tool": "register_grade",
            "parameters": {
                "subject": "Química",
                "item_type": "parcial",
                "item": "Parcial 1",
                "grade": 75,
            },
        }),
        "Registré tu nota 75 en Parcial 1.",
        json.dumps({
            "tool": "register_grade",
            "parameters": {
                "subject": "Química",
                "item_type": "parcial",
                "item": "Parcial 2",
                "grade": 80,
            },
        }),
    ])

    response = _agent_chat(student_client, "registré 75 en el parcial 1 de química")
    confirmation = response.json()["confirmation"]
    assert confirmation is not None

    accept = student_client.post("/api/ai/agent/confirm", json={
        "action_id": confirmation["action_id"],
        "decision": "accept",
    })
    assert accept.status_code == 200
    body = accept.json()
    assert body["success"] is True
    # La continuación detectó la siguiente acción pendiente sin un nuevo
    # mensaje del usuario.
    assert body["confirmation"] is not None
    assert body["confirmation"]["tool"] == "register_grade"
    assert body["confirmation"]["parameters"]["grade"] == 80

    # La segunda nota no se aplicó: sigue pendiente de confirmación.
    cancel = student_client.post("/api/ai/agent/confirm", json={
        "action_id": body["confirmation"]["action_id"],
        "decision": "cancel",
    })
    assert cancel.status_code == 200


def test_agent_confirmation_cancel_keeps_data(student_client, monkeypatch):
    """Cancelar la acción pendiente no modifica ningún dato."""
    subject_id = _create_subject(student_client, "Física I")
    _patch_provider(monkeypatch, [
        json.dumps({
            "tool": "register_grade",
            "parameters": {
                "subject": "Física I",
                "item_type": "laboratorio",
                "item": "Laboratorio 2",
                "grade": 90,
            },
        }),
    ])

    response = _agent_chat(student_client, "ponme 90 en el laboratorio 2")
    confirmation = response.json()["confirmation"]
    assert confirmation is not None

    cancelled = student_client.post("/api/ai/agent/confirm", json={
        "action_id": confirmation["action_id"],
        "decision": "cancel",
    })
    assert cancelled.status_code == 200
    body = cancelled.json()
    assert body["cancelled"] is True
    assert "no se modificó" in body["message"].lower()

    academic = student_client.get(f"/api/subjects/{subject_id}/academic-items").json()
    lab2 = next(l for l in academic["laboratorios"] if l["title"] == "Laboratorio 2")
    assert lab2["grade"] is None
    assert lab2["status"] == "pendiente"


def test_agent_confirm_expired_action(student_client):
    """Una acción inexistente o expirada devuelve 404 sin efectos."""
    response = student_client.post("/api/ai/agent/confirm", json={
        "action_id": "inexistente",
        "decision": "accept",
    })
    assert response.status_code == 404


def test_agent_persists_conversation_history(student_client, monkeypatch):
    """La conversación persiste y el historial llega al proveedor."""
    fake = _patch_provider(monkeypatch, [
        "Hola, soy Mel. ¿En qué te ayudo?",
        '{"tool": "get_subjects", "parameters": {}}',
        "No tienes materias registradas todavía.",
    ])

    first = _agent_chat(student_client, "hola")
    conversation_id = first.json()["conversation_id"]

    second = _agent_chat(student_client, "¿qué materias tengo?", conversation_id)
    assert second.status_code == 200

    # La tercera llamada (segunda petición) incluyó el historial previo
    third_call = fake.calls[2]
    contents = [content for _role, content in third_call]
    assert any("Hola, soy Mel" in c for c in contents)

    # Los mensajes quedaron guardados en la conversación
    messages = student_client.get(f"/api/ai/conversations/{conversation_id}/messages").json()
    roles = [m["role"] for m in messages]
    assert roles == ["user", "assistant", "user", "assistant"]


# ── Errores del proveedor ──────────────────────────────────────────


def test_agent_quota_exhausted_friendly_error(student_client, monkeypatch):
    """La cuota agotada se reporta con mensaje amigable y código claro."""
    _patch_provider(monkeypatch, [
        AIProviderError(
            "Quota exceeded for this key",
            error_code="quota_exhausted",
            provider="openrouter",
            status_code=402,
        ),
    ])

    response = _agent_chat(student_client, "dame mi informe")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is False
    assert body["error_code"] == "quota_exhausted"
    assert "cuota" in body["message"].lower()
    assert any(e["type"] == "quota_exhausted" for e in body["events"])
    assert body["tools_executed"] == []


def test_agent_rate_limit_error(student_client, monkeypatch):
    """El rate limit se distingue de la cuota agotada."""
    _patch_provider(monkeypatch, [
        AIProviderError(
            "Too many requests",
            error_code="rate_limit",
            provider="openrouter",
            status_code=429,
        ),
    ])

    response = _agent_chat(student_client, "hola")
    body = response.json()
    assert body["success"] is False
    assert body["error_code"] == "rate_limit"
    assert "cuota" not in body["message"].lower()
    assert any(e["type"] == "provider_error" for e in body["events"])


def test_agent_requires_configured_provider(client: TestClient):
    """Sin proveedor configurado el endpoint responde 400, no 500."""
    client.post("/api/students/", json={"name": "Ana", "career": "Medicina"})
    client.post("/api/students/me/complete")

    response = client.post("/api/ai/agent/chat", json={"message": "hola"})
    assert response.status_code == 400


# ── Datos reales, nunca inventados ──────────────────────────────────


def test_agent_report_without_data(student_client, monkeypatch):
    """El informe sin datos indica la ausencia en lugar de inventar."""
    _patch_provider(monkeypatch, [
        '{"tool": "get_academic_report", "parameters": {}}',
        "Aún no hay datos académicos registrados. Empieza creando tus materias.",
    ])

    response = _agent_chat(student_client, "dame mi informe académico")
    body = response.json()
    assert body["success"] is True
    report = body["tools_executed"][0]["data"]
    assert report["has_data"] is False
    assert report["subjects"]["count"] == 0
    assert "no hay datos" in body["message"].lower()


def test_agent_conflict_event(student_client, monkeypatch):
    """Detectar conflictos reales emite el evento conflict_detected."""
    student_client.post("/api/subjects/", json={"name": "Matemáticas I", "code": "MAT-1"})
    student_client.post("/api/subjects/", json={"name": "Física I", "code": "FIS-1"})
    student_client.post("/api/class-schedules/", json={
        "subject_id": 1, "day_of_week": "lunes", "start_time": "08:00", "end_time": "10:00",
    })
    student_client.post("/api/class-schedules/", json={
        "subject_id": 2, "day_of_week": "lunes", "start_time": "09:00", "end_time": "11:00",
    })

    _patch_provider(monkeypatch, [
        '{"tool": "detect_schedule_conflicts", "parameters": {}}',
        "Tienes un conflicto: dos clases se solapan el lunes de 08:00 a 11:00.",
    ])

    response = _agent_chat(student_client, "tengo choques de horario?")
    body = response.json()
    assert body["success"] is True
    events = [e for e in body["events"] if e["type"] == "conflict_detected"]
    assert events
    assert events[0]["conflicts"][0]["type"] == "class_vs_class"


# ── Registro de acciones pendientes (unitario) ──────────────────────


def test_pending_registry_single_consume():
    """El registro consume cada acción una sola vez."""
    registry = PendingActionRegistry(ttl_seconds=60)
    action_id = registry.register("update_task", {"task": "1"}, context={"provider_name": "x"})

    action = registry.consume(action_id)
    assert action["tool"] == "update_task"
    assert action["parameters"] == {"task": "1"}

    assert registry.consume(action_id) is None
    assert registry.cancel(action_id) is False
    assert registry.count() == 0


def test_pending_registry_ttl_expiry(monkeypatch):
    """Las acciones expiran tras el TTL y se limpian solas."""
    current = {"now": 1000.0}
    monkeypatch.setattr("app.services.ai.agent.time.time", lambda: current["now"])

    registry = PendingActionRegistry(ttl_seconds=600)
    action_id = registry.register("complete_task", {"task": "2"})

    current["now"] = 1000.0 + 601
    assert registry.consume(action_id) is None
    assert registry.count() == 0


def test_pending_registry_context_update():
    """El contexto de una acción se puede anotar antes de confirmar."""
    registry = PendingActionRegistry(ttl_seconds=60)
    action_id = registry.register("register_grade", {"grade": 88})
    registry.set_context(action_id, conversation_id=7, student_id=1)

    action = registry.consume(action_id)
    assert action["context"]["conversation_id"] == 7
    assert action["context"]["student_id"] == 1


def test_global_registry_starts_empty():
    """El registro global no arrastra acciones entre pruebas."""
    assert pending_actions.count() == 0
