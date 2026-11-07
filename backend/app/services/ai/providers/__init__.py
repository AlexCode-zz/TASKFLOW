# Adaptadores de proveedores de IA
from app.services.ai.providers.openrouter import OpenRouterProvider
from app.services.ai.providers.anthropic import AnthropicProvider
from app.services.ai.providers.gemini import GeminiProvider
from app.services.ai.providers.openai import OpenAIProvider

PROVIDER_CLASSES = {
    "openrouter": OpenRouterProvider,
    "anthropic": AnthropicProvider,
    "gemini": GeminiProvider,
    "openai": OpenAIProvider,
}

__all__ = [
    "OpenRouterProvider",
    "AnthropicProvider",
    "GeminiProvider",
    "OpenAIProvider",
    "PROVIDER_CLASSES",
]
