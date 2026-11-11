"""Adaptador para OpenAI."""

import httpx
from typing import Optional, Dict, Any, List

from app.services.ai.providers.base import BaseHTTPProvider
from app.services.ai.base import ChatMessage, ChatResponse, ProviderCapabilities
from app.services.ai.errors import classify_http_error


class OpenAIProvider(BaseHTTPProvider):
    """Adaptador para OpenAI (https://platform.openai.com)."""

    provider_name = "openai"
    base_url = "https://api.openai.com/v1"

    def __init__(self, api_key: str, model: Optional[str] = None):
        super().__init__(api_key, model, self.base_url)
        self._capabilities = ProviderCapabilities(
            supports_streaming=True,
            supports_system_prompt=True,
            max_tokens=4096,
            default_model="gpt-3.5-turbo",
            available_models=[],
        )

    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
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
            response = await client.get(
                f"{self.base_url}/models",
                headers=self._headers(),
            )
            if response.status_code == 200:
                return {
                    "success": True,
                    "status": "ok",
                    "message": "Conexión exitosa con OpenAI",
                    "provider": self.provider_name,
                }
            elif response.status_code == 401:
                return {
                    "success": False,
                    "status": "error",
                    "message": "API key inválida para OpenAI",
                    "provider": self.provider_name,
                    "error_code": "invalid_api_key",
                }
            else:
                return {
                    "success": False,
                    "status": "error",
                    "message": f"Error de OpenAI: {response.status_code}",
                    "provider": self.provider_name,
                    "error_code": "provider_error",
                }
        except httpx.ConnectError:
            return {
                "success": False,
                "status": "error",
                "message": "No se pudo conectar con OpenAI",
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

        payload = {
            "model": model_id,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "temperature": temperature,
        }
        if max_tokens:
            payload["max_tokens"] = max_tokens

        response = await self._post_json(
            f"{self.base_url}/chat/completions",
            json=payload,
        )

        if response.status_code != 200:
            raise classify_http_error(self.provider_name, response.status_code, response.text)

        data = response.json()
        choice = data["choices"][0]
        content = choice.get("message", {}).get("content", "")

        return ChatResponse(
            content=content,
            model=data.get("model", model_id),
            provider=self.provider_name,
            tokens_used=data.get("usage", {}).get("total_tokens"),
            finish_reason=choice.get("finish_reason"),
            raw_response=data,
        )

    async def get_available_models(self) -> List[str]:
        try:
            client = await self._get_client()
            response = await client.get(
                f"{self.base_url}/models",
                headers=self._headers(),
            )
            if response.status_code == 200:
                data = response.json()
                return [m.get("id", "") for m in data.get("data", []) if m.get("id")]
        except Exception:
            pass
        return [
            "gpt-4o",
            "gpt-4o-mini",
            "gpt-4-turbo",
            "gpt-3.5-turbo",
        ]
