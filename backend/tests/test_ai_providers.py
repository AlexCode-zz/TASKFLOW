"""Pruebas de configuración de proveedores de IA.

Cubre la activación de un proveedor ya guardado (cambio de proveedor
cuando otro agota su cuota) y el listado de modelos usando una API key
temporal antes de guardar la configuración.
"""

import pytest
from fastapi.testclient import TestClient

from app.services.ai.key_manager import key_manager
from app.services.ai.manager import ai_manager


@pytest.fixture
def student_client(client: TestClient) -> TestClient:
    client.post("/api/students/", json={
        "name": "Juan Pérez",
        "career": "Ingeniería de Sistemas",
        "semester": "3º",
    })
    client.post("/api/students/me/complete")
    return client


@pytest.fixture
def fake_keys(monkeypatch):
    """Evita escribir en el archivo real de claves del usuario."""
    store = {}

    monkeypatch.setattr(key_manager, "get_key", lambda name: store.get(name))
    monkeypatch.setattr(
        key_manager, "set_key", lambda name, key: store.__setitem__(name, key)
    )
    monkeypatch.setattr(
        key_manager, "delete_key", lambda name: bool(store.pop(name, None))
    )
    return store


def _setup_provider(client: TestClient, name: str, model: str, active: bool):
    return client.post(
        "/api/ai/providers/setup",
        json={
            "provider_name": name,
            "api_key": f"key-{name}",
            "model": model,
            "is_active": active,
        },
    )


def _providers_by_name(client: TestClient):
    response = client.get("/api/ai/providers")
    assert response.status_code == 200
    return {item["provider_name"]: item for item in response.json()}


def test_activate_provider_switches_active_without_new_key(
    student_client: TestClient, fake_keys
):
    assert _setup_provider(student_client, "openrouter", "model-a", True).status_code == 201
    assert _setup_provider(student_client, "openai", "model-b", False).status_code == 201

    providers = _providers_by_name(student_client)
    assert providers["openrouter"]["is_active"] is True
    assert providers["openai"]["is_active"] is False

    response = student_client.post("/api/ai/providers/openai/activate")
    assert response.status_code == 200
    assert response.json()["provider_name"] == "openai"
    assert response.json()["is_active"] is True

    providers = _providers_by_name(student_client)
    assert providers["openai"]["is_active"] is True
    assert providers["openrouter"]["is_active"] is False
    # Las claves siguen disponibles: no se pidió reingresar nada.
    assert fake_keys["openrouter"] == "key-openrouter"
    assert fake_keys["openai"] == "key-openai"


def test_activate_unknown_provider_returns_404(student_client: TestClient, fake_keys):
    response = student_client.post("/api/ai/providers/gemini/activate")
    assert response.status_code == 404


def test_activate_provider_without_key_returns_400(
    student_client: TestClient, fake_keys
):
    assert _setup_provider(student_client, "openrouter", "model-a", True).status_code == 201
    fake_keys.pop("openrouter")

    response = student_client.post("/api/ai/providers/openrouter/activate")
    assert response.status_code == 400
    assert "API key" in response.json()["detail"]


def test_list_models_accepts_temporary_api_key(
    student_client: TestClient, fake_keys, monkeypatch
):
    captured = {}

    async def fake_get_models(provider_name, api_key=None):
        captured["provider_name"] = provider_name
        captured["api_key"] = api_key
        return ["model-a", "model-b"]

    monkeypatch.setattr(ai_manager, "get_available_models", fake_get_models)

    response = student_client.get(
        "/api/ai/providers/openrouter/models",
        params={"api_key": "temporary-key"},
    )

    assert response.status_code == 200
    assert response.json() == ["model-a", "model-b"]
    assert captured == {"provider_name": "openrouter", "api_key": "temporary-key"}
