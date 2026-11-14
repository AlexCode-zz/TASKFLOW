"""Pruebas de la clasificación de errores de proveedores de IA."""

import pytest

from app.services.ai.errors import (
    AIProviderError,
    classify_connection_error,
    classify_http_error,
    friendly_message,
)


class TestClassifyHttpError:
    def test_402_es_cuota_agotada(self):
        err = classify_http_error("openrouter", 402, "Payment required")
        assert err.error_code == "quota_exhausted"
        assert err.provider == "openrouter"
        assert err.status_code == 402

    def test_429_con_quota_es_cuota_agotada(self):
        err = classify_http_error(
            "openai",
            429,
            "You exceeded your current quota, please check your plan and billing details",
        )
        assert err.error_code == "quota_exhausted"

    def test_429_con_creditos_es_cuota_agotada(self):
        err = classify_http_error("openrouter", 429, "Insufficient credits for requested model")
        assert err.error_code == "quota_exhausted"

    def test_429_gemini_resource_exhausted_es_cuota(self):
        err = classify_http_error("gemini", 429, "RESOURCE_EXHAUSTED: quota limit reached")
        assert err.error_code == "quota_exhausted"

    def test_429_rate_limit_es_limite_de_solicitudes(self):
        err = classify_http_error(
            "openai", 429, "Rate limit reached for requests. Please retry after 20 seconds"
        )
        assert err.error_code == "rate_limit"

    def test_429_rpm_es_limite_de_solicitudes(self):
        err = classify_http_error("anthropic", 429, "Number of requests per minute exceeded")
        assert err.error_code == "rate_limit"

    def test_429_sin_cuerpo_es_limite_de_solicitudes(self):
        err = classify_http_error("openrouter", 429, "")
        assert err.error_code == "rate_limit"

    def test_401_es_error_de_autenticacion(self):
        err = classify_http_error("gemini", 401, "API key not valid")
        assert err.error_code == "invalid_api_key"

    def test_403_es_error_de_autenticacion(self):
        err = classify_http_error("anthropic", 403, "Forbidden")
        assert err.error_code == "invalid_api_key"

    def test_400_de_gemini_con_api_key_es_autenticacion(self):
        err = classify_http_error(
            "gemini",
            400,
            '{"error": {"message": "API key not valid. Please pass a valid API key."}}',
        )
        assert err.error_code == "invalid_api_key"

    def test_500_es_error_del_proveedor(self):
        err = classify_http_error("openai", 500, "Internal server error")
        assert err.error_code == "provider_error"

    def test_408_es_error_de_conexion(self):
        err = classify_http_error("openrouter", 408, "Request timeout")
        assert err.error_code == "connection_error"

    def test_404_de_modelo_inexistente_es_modelo_invalido(self):
        err = classify_http_error(
            "gemini",
            404,
            "models/gemini-1.5-flash is not found for API version v1beta",
        )
        assert err.error_code == "invalid_model"
        assert "modelo" in err.message.lower()

    def test_404_sin_modelo_es_error_del_proveedor(self):
        err = classify_http_error("openai", 404, "Not found")
        assert err.error_code == "provider_error"

    def test_otros_codigos_son_error_del_proveedor(self):
        err = classify_http_error("openai", 400, "Bad request")
        assert err.error_code == "provider_error"

    def test_cuota_no_se_confunde_con_error_generico(self):
        """El 429 de cuota y el 429 de rate limit deben diferenciarse."""
        quota = classify_http_error("openai", 429, "billing hard limit has been reached")
        rate = classify_http_error("openai", 429, "rate limit reached for requests")
        assert quota.error_code != rate.error_code


class TestAIProviderError:
    def test_to_dict_contiene_codigo_y_proveedor(self):
        err = AIProviderError("fallo", error_code="quota_exhausted", provider="openrouter")
        data = err.to_dict()
        assert data["error_code"] == "quota_exhausted"
        assert data["provider"] == "openrouter"

    def test_codigo_por_defecto(self):
        err = AIProviderError("fallo")
        assert err.error_code == "unexpected_error"


class TestConnectionError:
    def test_error_de_red_se_clasifica_como_conexion(self):
        import httpx

        err = classify_connection_error("gemini", httpx.ConnectError("boom"))
        assert err.error_code == "connection_error"
        assert err.provider == "gemini"


class TestFriendlyMessages:
    @pytest.mark.parametrize(
        "code",
        [
            "quota_exhausted",
            "rate_limit",
            "invalid_api_key",
            "invalid_model",
            "connection_error",
            "provider_error",
            "unexpected_error",
        ],
    )
    def test_hay_mensaje_amigable_para_cada_codigo(self, code):
        message = friendly_message(code)
        assert len(message) > 20
        assert code.replace("_", " ") or True  # solo verifica que no explote

    def test_mensaje_de_modelo_invalido_indica_proveedores_ia(self):
        assert "Proveedores IA" in friendly_message("invalid_model")

    def test_codigo_desconocido_usa_mensaje_generico(self):
        assert friendly_message("desconocido") == friendly_message("unexpected_error")

    def test_mensaje_de_cuota_explica_que_la_app_sigue_funcionando(self):
        assert "TaskFlow" in friendly_message("quota_exhausted")
