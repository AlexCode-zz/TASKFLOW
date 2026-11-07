"""Clase base para adaptadores de proveedores con lógica HTTP común."""

import httpx
from typing import Optional, Dict, Any, List

from app.services.ai.base import AIProviderAdapter, ChatMessage, ChatResponse, ProviderCapabilities


class BaseHTTPProvider(AIProviderAdapter):
    """Clase base con utilidades HTTP para proveedores basados en REST."""

    def __init__(self, api_key: str, model: Optional[str] = None, base_url: Optional[str] = None):
        super().__init__(api_key, model)
        self.base_url = base_url
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Obtiene o crea el cliente HTTP."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=60.0)
        return self._client

    async def close(self):
        """Cierra el cliente HTTP."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    def _headers(self, extra: Optional[Dict[str, str]] = None) -> Dict[str, str]:
        """Construye los encabezados HTTP comunes."""
        headers = {
            "Content-Type": "application/json",
        }
        if extra:
            headers.update(extra)
        return headers
