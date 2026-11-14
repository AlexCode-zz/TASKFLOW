"""Gestor de proveedores de IA.

Factory y gestor que crea adaptadores de proveedores bajo demanda,
manteniendo la caché de instancias activas.
"""

from typing import Optional, Dict, Any, List
from app.services.ai.providers import PROVIDER_CLASSES
from app.services.ai.base import AIProviderAdapter, ChatMessage, ChatResponse
from app.services.ai.key_manager import key_manager


class AIProviderManager:
    """Gestiona la creación y vida de adaptadores de proveedores."""

    def __init__(self):
        self._instances: Dict[str, AIProviderAdapter] = {}

    def get_provider_class(self, provider_name: str) -> Optional[type]:
        """Obtiene la clase de adaptador para un proveedor."""
        return PROVIDER_CLASSES.get(provider_name)

    def get_available_providers(self) -> List[str]:
        """Lista los nombres de proveedores disponibles."""
        return list(PROVIDER_CLASSES.keys())

    def get_configured_providers(self) -> List[str]:
        """Lista proveedores que tienen API key configurada."""
        return key_manager.list_providers()

    def create_adapter(
        self, provider_name: str, model: Optional[str] = None
    ) -> Optional[AIProviderAdapter]:
        """Crea un adaptador para el proveedor especificado."""
        provider_class = self.get_provider_class(provider_name)
        if not provider_class:
            return None

        api_key = key_manager.get_key(provider_name)
        if not api_key:
            return None

        adapter = provider_class(api_key=api_key, model=model)
        self._instances[provider_name] = adapter
        return adapter

    def get_adapter(
        self, provider_name: str, model: Optional[str] = None
    ) -> Optional[AIProviderAdapter]:
        """Obtiene o crea un adaptador para el proveedor."""
        if provider_name in self._instances:
            adapter = self._instances[provider_name]
            if model and adapter.model != model:
                adapter.model = model
            return adapter
        return self.create_adapter(provider_name, model)

    def invalidate(self, provider_name: Optional[str] = None) -> None:
        """Descarta adaptadores cacheados, por ejemplo al cambiar una clave.

        Sin esto, un adaptador creado con una clave anterior seguiría
        usándola hasta reiniciar el backend aunque la clave se hubiera
        reemplazado en Proveedores IA.
        """
        if provider_name is None:
            self._instances.clear()
        else:
            self._instances.pop(provider_name, None)

    async def test_provider_connection(
        self, provider_name: str, api_key: str, model: Optional[str] = None
    ) -> dict:
        """Prueba la conexión de un proveedor con una API key dada (sin guardar)."""
        provider_class = self.get_provider_class(provider_name)
        if not provider_class:
            return {
                "success": False,
                "provider_name": provider_name,
                "status": "error",
                "message": f"Proveedor no soportado: {provider_name}",
                "error_code": "unsupported_provider",
            }

        adapter = provider_class(api_key=api_key, model=model)
        try:
            result = await adapter.test_connection()
            return result
        finally:
            await adapter.close()

    async def chat(
        self,
        provider_name: str,
        messages: List[ChatMessage],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
    ) -> ChatResponse:
        """Envía un chat usando el adaptador del proveedor."""
        adapter = self.get_adapter(provider_name, model)
        if not adapter:
            raise ValueError(f"No se pudo crear adaptador para {provider_name} o no hay API key configurada")

        try:
            response = await adapter.chat(
                messages=messages,
                model=model,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            return response
        finally:
            await adapter.close()

    async def get_available_models(self, provider_name: str, api_key: Optional[str] = None) -> List[str]:
        """Obtiene modelos disponibles para un proveedor."""
        provider_class = self.get_provider_class(provider_name)
        if not provider_class:
            return []

        # Si se proporciona una API key temporal, crear instancia temporal
        if api_key:
            adapter = provider_class(api_key=api_key)
            try:
                return await adapter.get_available_models()
            finally:
                await adapter.close()

        # Usar adaptador existente o crear uno con la key almacenada
        adapter = self.get_adapter(provider_name)
        if not adapter:
            return []
        try:
            return await adapter.get_available_models()
        finally:
            await adapter.close()


# Instancia singleton
ai_manager = AIProviderManager()
