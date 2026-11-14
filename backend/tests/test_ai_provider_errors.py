"""Pruebas de clasificación de errores propagados por los adaptadores."""

import asyncio
import json

import httpx
import pytest

from app.services.ai.base import ChatMessage, ChatResponse
from app.services.ai.errors import AIProviderError
from app.services.ai.providers.gemini import GeminiProvider
from app.services.ai.providers.openrouter import OpenRouterProvider


class _FakeResponse:
    def __init__(self, status_code: int, text: str = ""):
        self.status_code = status_code
        self.text = text


class _FakeJsonResponse(_FakeResponse):
    def __init__(self, status_code: int, data: dict):
        super().__init__(status_code, json.dumps(data))
        self._data = data

    def json(self):
        return self._data


def _gemini_success(text: str = "hola") -> _FakeJsonResponse:
    return _FakeJsonResponse(
        200,
        {
            "candidates": [
                {
                    "content": {"parts": [{"text": text}]},
                    "finishReason": "STOP",
                }
            ],
            "usageMetadata": {"totalTokenCount": 3},
        },
    )


def _model_from_url(url: str) -> str:
    return url.split("/models/")[1].split(":")[0]


@pytest.fixture
def provider():
    return OpenRouterProvider(api_key="sk-test")


def test_chat_cuota_agotada_lanza_ai_provider_error(provider, monkeypatch):
    async def fake_post(self, url, **kwargs):
        return _FakeResponse(402, "Payment required")

    monkeypatch.setattr(OpenRouterProvider, "_post_json", fake_post)

    with pytest.raises(AIProviderError) as exc_info:
        asyncio.run(
            provider.chat([ChatMessage(role="user", content="hola")], model="openrouter/auto")
        )

    assert exc_info.value.error_code == "quota_exhausted"


def test_chat_rate_limit_lanza_ai_provider_error(provider, monkeypatch):
    async def fake_post(self, url, **kwargs):
        return _FakeResponse(429, "Rate limit reached for requests")

    monkeypatch.setattr(OpenRouterProvider, "_post_json", fake_post)

    with pytest.raises(AIProviderError) as exc_info:
        asyncio.run(
            provider.chat([ChatMessage(role="user", content="hola")], model="openrouter/auto")
        )

    assert exc_info.value.error_code == "rate_limit"


def test_chat_error_conexion_lanza_ai_provider_error(provider, monkeypatch):
    async def fake_client_post(self, url, **kwargs):
        raise httpx.ConnectError("no route to host")

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_client_post)

    with pytest.raises(AIProviderError) as exc_info:
        asyncio.run(
            provider.chat([ChatMessage(role="user", content="hola")], model="openrouter/auto")
        )

    assert exc_info.value.error_code == "connection_error"


def test_gemini_usa_respaldo_si_el_modelo_configurado_fue_retirado(monkeypatch):
    """Un modelo retirado no debe dejar a Mel sin respuesta."""
    provider = GeminiProvider(api_key="k")
    calls = []

    async def fake_post(self, url, **kwargs):
        model = _model_from_url(url)
        calls.append(model)
        if model == "gemini-2.5-flash":
            return _FakeJsonResponse(
                404,
                {
                    "error": {
                        "code": 404,
                        "message": (
                            "models/gemini-2.5-flash is no longer available "
                            "to new users."
                        ),
                        "status": "NOT_FOUND",
                    }
                },
            )
        return _gemini_success()

    monkeypatch.setattr(GeminiProvider, "_post_json", fake_post)

    response = asyncio.run(
        provider.chat(
            [ChatMessage(role="user", content="hola")],
            model="gemini-2.5-flash",
        )
    )

    assert response.content == "hola"
    assert response.model == "gemini-3.6-flash"
    assert calls == ["gemini-2.5-flash", "gemini-3.6-flash"]


def test_gemini_usa_respaldo_si_el_modelo_principal_esta_saturado(monkeypatch):
    """Un 503 temporal de Google no debe tumbar la conversación."""
    provider = GeminiProvider(api_key="k")
    calls = []

    async def fake_post(self, url, **kwargs):
        model = _model_from_url(url)
        calls.append(model)
        if model == "gemini-3.6-flash":
            return _FakeJsonResponse(
                503,
                {
                    "error": {
                        "code": 503,
                        "message": "This model is currently experiencing high demand.",
                        "status": "UNAVAILABLE",
                    }
                },
            )
        return _gemini_success()

    monkeypatch.setattr(GeminiProvider, "_post_json", fake_post)

    response = asyncio.run(
        provider.chat(
            [ChatMessage(role="user", content="hola")],
            model="gemini-3.6-flash",
        )
    )

    assert response.model == "gemini-3.5-flash"
    assert calls == ["gemini-3.6-flash", "gemini-3.5-flash"]


def test_gemini_no_reintenta_si_la_clave_es_invalida(monkeypatch):
    """Los errores de clave no deben enmascararse probando otros modelos."""
    provider = GeminiProvider(api_key="k")
    calls = []

    async def fake_post(self, url, **kwargs):
        calls.append(_model_from_url(url))
        return _FakeJsonResponse(
            400,
            {
                "error": {
                    "code": 400,
                    "message": "API key not valid. Please pass a valid API key.",
                    "status": "INVALID_ARGUMENT",
                }
            },
        )

    monkeypatch.setattr(GeminiProvider, "_post_json", fake_post)

    with pytest.raises(AIProviderError) as exc_info:
        asyncio.run(
            provider.chat(
                [ChatMessage(role="user", content="hola")],
                model="gemini-3.6-flash",
            )
        )

    assert exc_info.value.error_code == "invalid_api_key"
    assert calls == ["gemini-3.6-flash"]


def test_gemini_test_connection_valida_el_modelo(monkeypatch):
    """La prueba de conexión debe confirmar que el modelo responde."""
    provider = GeminiProvider(api_key="k")

    async def fake_chat(self, messages, **kwargs):
        return ChatResponse(
            content="pong",
            model="gemini-3.6-flash",
            provider="gemini",
        )

    monkeypatch.setattr(GeminiProvider, "chat", fake_chat)

    result = asyncio.run(provider.test_connection())

    assert result["success"] is True
    assert "gemini-3.6-flash" in result["message"]


def test_gemini_test_connection_reporta_clave_invalida(monkeypatch):
    """La prueba de conexión debe devolver el código clasificado."""
    provider = GeminiProvider(api_key="k")

    async def fake_chat(self, messages, **kwargs):
        raise AIProviderError(
            "API key not valid",
            error_code="invalid_api_key",
            provider="gemini",
            status_code=400,
        )

    monkeypatch.setattr(GeminiProvider, "chat", fake_chat)

    result = asyncio.run(provider.test_connection())

    assert result["success"] is False
    assert result["error_code"] == "invalid_api_key"
