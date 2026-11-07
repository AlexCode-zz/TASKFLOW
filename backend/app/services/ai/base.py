"""Interfaz base para adaptadores de proveedores de IA.

Cada proveedor debe implementar esta interfaz para garantizar
compatibilidad con el sistema multi-proveedor de TaskFlow.
"""

from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, List
from dataclasses import dataclass


@dataclass
class ProviderCapabilities:
    """Capacidades de un proveedor de IA."""
    supports_streaming: bool = False
    supports_system_prompt: bool = True
    max_tokens: Optional[int] = None
    default_model: Optional[str] = None
    available_models: List[str] = None  # type: ignore


@dataclass
class ChatMessage:
    """Mensaje normalizado para chat."""
    role: str  # user, assistant, system
    content: str


@dataclass
class ChatResponse:
    """Respuesta normalizada de chat."""
    content: str
    model: str
    provider: str
    tokens_used: Optional[int] = None
    finish_reason: Optional[str] = None
    raw_response: Optional[Dict[str, Any]] = None


class AIProviderAdapter(ABC):
    """Clase base abstracta para adaptadores de proveedores de IA."""

    def __init__(self, api_key: str, model: Optional[str] = None):
        self.api_key = api_key
        self.model = model
        self._capabilities: Optional[ProviderCapabilities] = None

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Nombre del proveedor (ej: openrouter, anthropic, gemini, openai)."""

    @property
    def capabilities(self) -> ProviderCapabilities:
        """Capacidades del proveedor."""
        if self._capabilities is None:
            self._capabilities = ProviderCapabilities()
        return self._capabilities

    @abstractmethod
    async def validate_config(self) -> bool:
        """Valida que la configuración sea correcta."""

    @abstractmethod
    async def test_connection(self) -> dict:
        """Prueba la conexión con el proveedor. Retorna dict con success, status, message."""

    @abstractmethod
    async def chat(
        self,
        messages: List[ChatMessage],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
    ) -> ChatResponse:
        """Envía mensajes al proveedor y retorna una respuesta normalizada."""

    @abstractmethod
    async def get_available_models(self) -> List[str]:
        """Obtiene la lista de modelos disponibles del proveedor."""

    def mask_api_key(self) -> str:
        """Retorna la API key enmascarada para mostrar en UI."""
        if not self.api_key:
            return ""
        if len(self.api_key) <= 8:
            return "*" * len(self.api_key)
        return self.api_key[:4] + "*" * (len(self.api_key) - 8) + self.api_key[-4:]
