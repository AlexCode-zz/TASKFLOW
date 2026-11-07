"""Adaptador para Google Gemini."""

import httpx
from typing import Optional, Dict, Any, List

from app.services.ai.providers.base import BaseHTTPProvider
from app.services.ai.base import ChatMessage, ChatResponse, ProviderCapabilities


class GeminiProvider(BaseHTTPProvider):
    """Adaptador para Google Gemini (https://ai.google.dev)."""

    provider_name = "gemini"
    base_url = "https://generativelanguage.googleapis.com/v1beta"

    def __init__(self, api_key: str, model: Optional[str] = None):
        super().__init__(api_key, model, self.base_url)
        self._capabilities = ProviderCapabilities(
            supports_streaming=True,
            supports_system_prompt=True,
            max_tokens=4096,
            default_model="gemini-1.5-flash",
            available_models=[],
        )

    def _headers(self) -> Dict[str, str]:
        return {
            "Content-Type": "application/json",
        }

    def _params(self) -> Dict[str, str]:
        return {"key": self.api_key}

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
                params=self._params(),
            )
            if response.status_code == 200:
                return {
                    "success": True,
                    "status": "ok",
                    "message": "Conexión exitosa con Google Gemini",
                    "provider": self.provider_name,
                }
            elif response.status_code in (400, 403):
                return {
                    "success": False,
                    "status": "error",
                    "message": "API key inválida para Google Gemini",
                    "provider": self.provider_name,
                    "error_code": "invalid_api_key",
                }
            else:
                return {
                    "success": False,
                    "status": "error",
                    "message": f"Error de Google Gemini: {response.status_code}",
                    "provider": self.provider_name,
                    "error_code": "provider_error",
                }
        except httpx.ConnectError:
            return {
                "success": False,
                "status": "error",
                "message": "No se pudo conectar con Google Gemini",
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
        client = await self._get_client()
        model_id = model or self.model or self.capabilities.default_model

        # Convertir mensajes al formato de Gemini
        gemini_messages = []
        system_instruction = None
        for m in messages:
            if m.role == "system":
                system_instruction = m.content
            elif m.role == "user":
                gemini_messages.append({"role": "user", "parts": [{"text": m.content}]})
            elif m.role == "assistant":
                gemini_messages.append({"role": "model", "parts": [{"text": m.content}]})

        payload = {
            "contents": gemini_messages,
            "generationConfig": {
                "temperature": temperature,
            },
        }
        if max_tokens:
            payload["generationConfig"]["maxOutputTokens"] = max_tokens
        if system_instruction:
            payload["systemInstruction"] = {"parts": [{"text": system_instruction}]}

        response = await client.post(
            f"{self.base_url}/models/{model_id}:generateContent",
            params=self._params(),
            headers=self._headers(),
            json=payload,
        )

        if response.status_code != 200:
            raise Exception(f"Gemini API error: {response.status_code} {response.text}")

        data = response.json()
        candidates = data.get("candidates", [])
        content = ""
        if candidates:
            parts = candidates[0].get("content", {}).get("parts", [])
            for part in parts:
                content += part.get("text", "")

        return ChatResponse(
            content=content,
            model=model_id,
            provider=self.provider_name,
            tokens_used=data.get("usageMetadata", {}).get("totalTokenCount"),
            finish_reason=candidates[0].get("finishReason") if candidates else None,
            raw_response=data,
        )

    async def get_available_models(self) -> List[str]:
        try:
            client = await self._get_client()
            response = await client.get(
                f"{self.base_url}/models",
                params=self._params(),
            )
            if response.status_code == 200:
                data = response.json()
                return [m.get("name", "").replace("models/", "") for m in data.get("models", []) if m.get("name")]
        except Exception:
            pass
        return [
            "gemini-1.5-flash",
            "gemini-1.5-pro",
            "gemini-1.0-pro",
        ]
