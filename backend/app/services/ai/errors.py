"""Clasificación de errores de proveedores de IA.

Distingue con precisión la causa del fallo para que el asistente (y su
avatar) reaccione de forma correcta:

- ``quota_exhausted``: cuota, créditos o saldo agotado (402, o 429 con
  mensajes de quota/billing). Mel llora.
- ``rate_limit``: límite de solicitudes alcanzado (429 con mensajes de
  rate/rpm/tpm). Hay que esperar antes de reintentar.
- ``invalid_api_key``: error de autenticación (401/403).
- ``connection_error``: no se pudo conectar con el proveedor.
- ``provider_error``: error interno del proveedor (5xx, otros códigos).
- ``unexpected_error``: cualquier fallo no clasificable.
"""

from typing import Optional


class AIProviderError(Exception):
    """Error de un proveedor de IA con código de error clasificado."""

    def __init__(
        self,
        message: str,
        error_code: str = "unexpected_error",
        provider: Optional[str] = None,
        status_code: Optional[int] = None,
    ):
        super().__init__(message)
        self.message = message
        self.error_code = error_code
        self.provider = provider
        self.status_code = status_code

    def to_dict(self) -> dict:
        return {
            "error_code": self.error_code,
            "message": self.message,
            "provider": self.provider,
            "status_code": self.status_code,
        }


# Palabras que en un 429 indican cuota/saldo agotado y no rate limit
_QUOTA_KEYWORDS = (
    "quota",
    "credit",
    "credits",
    "billing",
    "payment",
    "balance",
    "insufficient",
    "exceeded your current quota",
    "usage limit",
    "resource_exhausted",
    "resource exhausted",
)

# Palabras que en un 429 indican límite de solicitudes
_RATE_KEYWORDS = (
    "rate limit",
    "rate_limit",
    "ratelimit",
    "too many requests",
    "requests per",
    "rpm",
    "tpm",
    "tokens per minute",
    "requests per minute",
)


def _contains_any(text: str, keywords) -> bool:
    return any(keyword in text for keyword in keywords)


def classify_http_error(
    provider: str,
    status_code: int,
    body_text: str = "",
) -> AIProviderError:
    """Clasifica una respuesta HTTP de error de un proveedor de IA.

    Args:
        provider: nombre del proveedor (openrouter, openai, ...).
        status_code: código HTTP de la respuesta.
        body_text: cuerpo de la respuesta (para afinar 429/402).

    Returns:
        AIProviderError con el error_code correspondiente.
    """
    body = (body_text or "").lower()

    if status_code == 402:
        return AIProviderError(
            f"Cuota o saldo agotado en {provider} (HTTP 402). Revisa tu plan o "
            f"recarga créditos para seguir usando la IA.",
            error_code="quota_exhausted",
            provider=provider,
            status_code=status_code,
        )

    if status_code == 429:
        if _contains_any(body, _QUOTA_KEYWORDS):
            return AIProviderError(
                f"Cuota de uso agotada en {provider} (HTTP 429). Revisa tu plan, "
                f"recarga créditos o cambia de modelo.",
                error_code="quota_exhausted",
                provider=provider,
                status_code=status_code,
            )
        return AIProviderError(
            f"Límite de solicitudes alcanzado en {provider} (HTTP 429). "
            f"Espera unos momentos e inténtalo de nuevo.",
            error_code="rate_limit",
            provider=provider,
            status_code=status_code,
        )

    if status_code in (401, 403):
        return AIProviderError(
            f"Error de autenticación con {provider} (HTTP {status_code}). "
            f"Revisa tu API key en la configuración.",
            error_code="invalid_api_key",
            provider=provider,
            status_code=status_code,
        )

    if status_code == 408:
        return AIProviderError(
            f"Tiempo de espera agotado con {provider} (HTTP 408).",
            error_code="connection_error",
            provider=provider,
            status_code=status_code,
        )

    if status_code >= 500:
        return AIProviderError(
            f"Error interno de {provider} (HTTP {status_code}).",
            error_code="provider_error",
            provider=provider,
            status_code=status_code,
        )

    return AIProviderError(
        f"Error de {provider} (HTTP {status_code}).",
        error_code="provider_error",
        provider=provider,
        status_code=status_code,
    )


def classify_connection_error(provider: str, exc: Exception) -> AIProviderError:
    """Clasifica un fallo de red al contactar al proveedor."""
    return AIProviderError(
        f"No se pudo conectar con {provider}: {exc}",
        error_code="connection_error",
        provider=provider,
    )


# Mensajes en español para cada código, orientados al estudiante
FRIENDLY_MESSAGES = {
    "quota_exhausted": (
        "La IA no está disponible ahora mismo: se agotó la cuota o el saldo del "
        "proveedor. Puedes esperar, recargar créditos, cambiar de modelo o revisar "
        "la configuración en Ajustes. El resto de TaskFlow sigue funcionando con "
        "tus datos reales."
    ),
    "rate_limit": (
        "Se alcanzó el límite de solicitudes del proveedor. Espera unos momentos "
        "antes de volver a consultar a la IA."
    ),
    "invalid_api_key": (
        "La API key del proveedor no es válida o expiró. Revísala en "
        "Ajustes > Asistente IA."
    ),
    "connection_error": (
        "No se pudo conectar con el proveedor de IA. Verifica tu conexión a "
        "internet e inténtalo de nuevo."
    ),
    "provider_error": (
        "El proveedor de IA tuvo un error interno. Puedes reintentar en unos "
        "momentos o cambiar de proveedor."
    ),
    "unexpected_error": (
        "Ocurrió un error inesperado al comunicarse con la IA. Inténtalo de nuevo."
    ),
}


def friendly_message(error_code: str) -> str:
    """Devuelve el mensaje en español para un código de error."""
    return FRIENDLY_MESSAGES.get(error_code, FRIENDLY_MESSAGES["unexpected_error"])
