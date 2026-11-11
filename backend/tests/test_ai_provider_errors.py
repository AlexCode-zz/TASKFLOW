"""Pruebas de clasificación de errores propagados por los adaptadores."""

import asyncio

import httpx
import pytest

from app.services.ai.base import ChatMessage
from app.services.ai.errors import AIProviderError
from app.services.ai.providers.openrouter import OpenRouterProvider


class _FakeResponse:
    def __init__(self, status_code: int, text: str = ""):
        self.status_code = status_code
        self.text = text


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
