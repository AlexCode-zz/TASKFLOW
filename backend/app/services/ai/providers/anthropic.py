"""Adaptador para Anthropic Claude."""

import httpx
from typing import Optional, Dict, Any, List

from app.services.ai.providers.base import BaseHTTPProvider
from app.services.ai.base import ChatMessage, ChatResponse, ProviderCapabilities
from app.services.ai.errors import classify_http_error


class AnthropicProvider(BaseHTTPProvider):
    """Adaptador para Anthropic (https://www.anthropic.com)."""

    provider_name = "anthropic"
    base_url = "https://api.anthropic.com/v1"

    def __init__(self, api_key: str, model: Optional[str] = None):
        super().__init__(api_key, model, self.base_url)
        self._capabilities = ProviderCapabilities(
            supports_streaming=True,
            supports_system_prompt=True,
            max_tokens=4096,
            default_model="claude-3-5-haiku-latest",
            available_models=[],
        )

    def _headers(self) -> Dict[str, str]:
        return {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
        }

    async def validate_config(self) -> bool:
        try:
            result = await self.test_connection()
            return result.get("success", False)
        except Exception:
            return False

    async def test_connection(self) -> dict:
        try:
            client = await self._get_client()
            # Anthropic no tiene endpoint de modelos público simple, usamos un mensaje mínimo
            response = await client.post(
                f"{self.base_url}/messages",
                headers=self._headers(),
                json={
                    "model": self.model or self.capabilities.default_model,
                    "max_tokens": 1,
                    "messages": [{"role": "user", "content": "hi"}],
                },
            )
            if response.status_code == 200:
                return {
                    "success": True,
                    "status": "ok",
                    "message": "Conexión exitosa con Anthropic",
                    "provider": self.provider_name,
                }
            elif response.status_code == 401:
                return {
                    "success": False,
                    "status": "error",
                    "message": "API key inválida para Anthropic",
                    "provider": self.provider_name,
                    "error_code": "invalid_api_key",
                }
            else:
                return {
                    "success": False,
                    "status": "error",
                    "message": f"Error de Anthropic: {response.status_code}",
                    "provider": self.provider_name,
                    "error_code": "provider_error",
                }
        except httpx.ConnectError:
            return {
                "success": False,
                "status": "error",
                "message": "No se pudo conectar con Anthropic",
                "provider": self.provider_name,
                "error_code": "connection_error",
            }
        except Exception as e:
            return {
                "success": False,
                "status": "error",
                "message": f"Error inesperado: {str(e)}",
                "provider": self.provider_name,
                "error_code": "unexpected_error",
            }

    async def chat(
        self,
        messages: List[ChatMessage],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
    ) -> ChatResponse:
        model_id = model or self.model or self.capabilities.default_model

        # Separar system prompt del resto
        system_messages = [m for m in messages if m.role == "system"]
        other_messages = [m for m in messages if m.role != "system"]

        payload = {
            "model": model_id,
            "max_tokens": max_tokens or 1024,
            "temperature": temperature,
            "messages": [{"role": m.role, "content": m.content} for m in other_messages],
        }
        if system_messages:
            payload["system"] = system_messages[0].content

        response = await self._post_json(
            f"{self.base_url}/messages",
            json=payload,
        )

        if response.status_code != 200:
            raise classify_http_error(self.provider_name, response.status_code, response.text)

        data = response.json()
        content = ""
        for block in data.get("content", []):
            if block.get("type") == "text":
                content += block.get("text", "")

        return ChatResponse(
            content=content,
            model=data.get("model", model_id),
            provider=self.provider_name,
            tokens_used=data.get("usage", {}).get("output_tokens"),
            finish_reason=data.get("stop_reason"),
            raw_response=data,
        )

    async def get_available_models(self) -> List[str]:
        # Anthropic no expone lista pública de modelos sin autenticación completa
        # Devolvemos modelos conocidos
        return [
            "claude-3-7-sonnet-latest",
            "claude-3-5-sonnet-latest",
            "claude-3-5-haiku-latest",
        ]
