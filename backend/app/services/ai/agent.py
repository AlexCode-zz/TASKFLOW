"""Agente académico interactivo de TaskFlow.

Orquesta el loop de conversación entre el modelo de IA y las
herramientas controladas:

1. El modelo recibe el system prompt con el protocolo de acciones y el
   catálogo de herramientas.
2. Cuando quiere ejecutar algo responde con un JSON
   ``{"tool": ..., "parameters": {...}}``.
3. El backend valida y ejecuta la herramienta con ``AITools`` (nunca
   SQL del modelo) y devuelve el resultado en un bloque
   ``<tool_result>`` para que el modelo continúe.
4. Las herramientas que modifican datos existentes NO se ejecutan en
   el loop: se registran como acciones pendientes y el usuario decide
   mediante el endpoint de confirmación (consumo único, con TTL).

Seguridad:
- El parámetro ``confirmed`` enviado por el modelo se ignora siempre;
  solo la decisión real del usuario vía ``/ai/agent/confirm`` lo activa.
- Deduplicación por hash (tool + parámetros) dentro de una misma
  ejecución para evitar doble ejecución por respuestas repetidas.
- Límite de iteraciones por ejecución.
- Los errores del proveedor se clasifican con ``AIProviderError`` y se
  traducen a mensajes amigables en español.
"""

import hashlib
import json
import re
import time
import uuid
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.services.ai.base import ChatMessage, ChatResponse
from app.services.ai.errors import AIProviderError, friendly_message
from app.services.ai.manager import ai_manager
from app.services.ai.tools import (
    AITools,
    CONFIRMATION_REQUIRED_TOOLS,
    get_available_tools,
)

# Máximo de llamadas al proveedor por ejecución del agente
MAX_ITERATIONS = 4

# Tiempo de vida de una acción pendiente de confirmación (10 minutos)
CONFIRMATION_TTL_SECONDS = 600

# Máximo de caracteres del contexto académico inyectado en el prompt
MAX_CONTEXT_CHARS = 4000


# ── Registro de acciones pendientes ────────────────────────────────


class PendingActionRegistry:
    """Registro en memoria de acciones que esperan confirmación.

    - Consumo único: confirmar o cancelar elimina la acción, por lo
      que una misma acción no puede ejecutarse dos veces.
    - TTL: las acciones no confirmadas expiran solas y se limpian.
    """

    def __init__(self, ttl_seconds: int = CONFIRMATION_TTL_SECONDS):
        self._ttl = ttl_seconds
        self._actions: Dict[str, Dict[str, Any]] = {}

    def _cleanup(self) -> None:
        now = time.time()
        expired = [
            action_id
            for action_id, action in self._actions.items()
            if now - action["created_at"] > self._ttl
        ]
        for action_id in expired:
            self._actions.pop(action_id, None)

    def register(
        self,
        tool: str,
        parameters: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Registra una acción pendiente y retorna su identificador."""
        self._cleanup()
        action_id = uuid.uuid4().hex[:16]
        self._actions[action_id] = {
            "tool": tool,
            "parameters": dict(parameters or {}),
            "context": dict(context or {}),
            "created_at": time.time(),
        }
        return action_id

    def consume(self, action_id: str) -> Optional[Dict[str, Any]]:
        """Retorna y elimina la acción (consumo único)."""
        self._cleanup()
        return self._actions.pop(action_id, None)

    def cancel(self, action_id: str) -> bool:
        """Cancela una acción pendiente."""
        return self._actions.pop(action_id, None) is not None

    def get(self, action_id: str) -> Optional[Dict[str, Any]]:
        """Consulta una acción sin consumirla."""
        self._cleanup()
        return self._actions.get(action_id)

    def set_context(self, action_id: str, **context) -> None:
        """Anota datos adicionales en el contexto de una acción pendiente."""
        action = self._actions.get(action_id)
        if action:
            action["context"].update(context)

    def count(self) -> int:
        self._cleanup()
        return len(self._actions)


# Registro global en memoria (la app corre en un solo proceso local)
pending_actions = PendingActionRegistry()


# ── Parseo del protocolo JSON ──────────────────────────────────────

_JSON_BLOCK_RE = re.compile(r"```(?:json)?\s*(\{.*?\})\s*```", re.DOTALL)


def _find_balanced_objects(text: str) -> List[str]:
    """Extrae los objetos JSON balanceados de un texto."""
    objects: List[str] = []
    depth = 0
    start = -1
    in_string = False
    escape = False
    for index, char in enumerate(text):
        if in_string:
            if escape:
                escape = False
            elif char == "\\":
                escape = True
            elif char == '"':
                in_string = False
            continue
        if char == '"':
            in_string = True
        elif char == "{":
            if depth == 0:
                start = index
            depth += 1
        elif char == "}":
            if depth > 0:
                depth -= 1
                if depth == 0 and start >= 0:
                    objects.append(text[start : index + 1])
    return objects


def extract_json_action(content: str) -> Optional[Dict[str, Any]]:
    """Busca una acción ``{"tool": ..., "parameters": {...}`` en la respuesta.

    Acepta el JSON en bloque de código, suelto o rodeado de texto.
    Retorna ``None`` si la respuesta no contiene una acción válida.
    """
    if not content:
        return None
    candidates: List[str] = [m.group(1) for m in _JSON_BLOCK_RE.finditer(content)]
    candidates.extend(_find_balanced_objects(content))
    for candidate in candidates:
        try:
            data = json.loads(candidate)
        except (json.JSONDecodeError, ValueError):
            continue
        if (
            isinstance(data, dict)
            and isinstance(data.get("tool"), str)
            and data["tool"].strip()
        ):
            return data
    return None


def strip_action_json(content: str, action: Dict[str, Any]) -> str:
    """Remueve el JSON de la acción del texto para obtener la redacción."""
    try:
        canonical = json.dumps(action, ensure_ascii=False)
    except (TypeError, ValueError):
        return content.strip()
    if canonical in content:
        return content.replace(canonical, "").strip()
    # Buscar el bloque de código que la contiene
    for match in _JSON_BLOCK_RE.finditer(content):
        try:
            if json.loads(match.group(1)) == action:
                return content.replace(match.group(0), "").strip()
        except (json.JSONDecodeError, ValueError):
            continue
    return content.strip()


def action_hash(tool: str, parameters: Dict[str, Any]) -> str:
    """Hash estable de una acción para detectar duplicados."""
    payload = json.dumps([tool, parameters or {}], sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


# ── Prompt del sistema ─────────────────────────────────────────────


def _format_tool_catalog() -> str:
    """Redacta el catálogo de herramientas para el system prompt."""
    lines = []
    for tool in get_available_tools():
        params = tool.get("parameters") or {}
        if params:
            signature = ", ".join(params.keys())
            header = f'- {tool["name"]}({signature})'
        else:
            header = f'- {tool["name"]}'
        if tool.get("requires_confirmation"):
            header += " [requiere confirmación del usuario]"
        lines.append(f'{header}: {tool["description"]}')
    return "\n".join(lines)


SYSTEM_PROMPT_TEMPLATE = """Eres Mel, la asistente académica de TaskFlow, una app de organización universitaria local.
Tu personalidad: cercana, clara y práctica. Hablas en español, con cercanía pero sin excesos.

TU MISIÓN: ayudar con materias, horarios, tareas, proyectos, parciales, laboratorios, notas y planificación de estudio.

REGLAS DE SEGURIDAD (innegociables):
- Nunca inventes datos académicos (notas, fechas, materias, promedios): consulta SIEMPRE con las herramientas antes de afirmar algo.
- Si falta información, dilo con claridad y sugiere cómo registrarla.
- No puedes borrar nada, ni ejecutar SQL, ni acceder directamente a la base de datos: solo las herramientas listadas.
- Las herramientas marcadas [requiere confirmación] modifican datos existentes: el usuario las aprobará o rechazará explícitamente; nunca digas que algo quedó hecho sin su confirmación.
- La planificación de horarios la valida el motor determinista de TaskFlow; tú solo propones y ejecutas `generate_weekly_plan`.

PROTOCOLO DE ACCIONES:
- Para ejecutar una herramienta responde ÚNICAMENTE con un objeto JSON válido en una sola línea, sin texto adicional:
  {"tool": "nombre_de_la_herramienta", "parameters": {"parametro": "valor"}}
- El sistema ejecutará la herramienta y te devolverá el resultado dentro de <tool_result> ... </tool_result>.
- Con ese resultado puedes: pedir otra herramienta (otro JSON) o responder al usuario en texto plano.
- El parámetro "confirmed" lo maneja el sistema, no tú: no lo incluyas en tus parámetros.
- Cuando tengas la información necesaria, responde al usuario directamente en texto plano (sin JSON).
- Antes de responder con datos, verifica que provengan de un <tool_result>.

HERRAMIENTAS DISPONIBLES:
{tool_catalog}
{context_block}"""


NARRATOR_SYSTEM_PROMPT = """Eres Mel, la asistente académica de TaskFlow.
Recibirás el resultado de una acción que el estudiante acaba de confirmar explícitamente.
Redáctale el resultado en español: breve (2-4 frases), claro y cercano, mencionando los datos del resultado.
No inventes datos: usa únicamente los del <tool_result>. No propongas nuevas acciones JSON."""


def build_system_prompt(academic_context: str = "") -> str:
    context_block = ""
    if academic_context:
        trimmed = academic_context[:MAX_CONTEXT_CHARS]
        context_block = (
            "\nCONTEXTO ACADÉMICO ACTUAL (puede estar incompleto; verifícalo con "
            "herramientas antes de afirmar):\n" + trimmed + "\n"
        )
    return SYSTEM_PROMPT_TEMPLATE.replace(
        "{tool_catalog}", _format_tool_catalog()
    ).replace("{context_block}", context_block)


# ── Agente ─────────────────────────────────────────────────────────


class AcademicAgent:
    """Loop de conversación con ejecución controlada de herramientas."""

    def __init__(
        self,
        db: Session,
        student_id: int,
        provider_name: str,
        model: Optional[str] = None,
        chat_fn=None,
    ):
        self.tools = AITools(db, student_id)
        self.provider_name = provider_name
        self.model = model
        self.chat_fn = chat_fn or ai_manager.chat
        self.events: List[Dict[str, Any]] = []
        self.tools_executed: List[Dict[str, Any]] = []
        self.tokens_used = 0
        self.provider_calls = 0

    # ── Eventos ───────────────────────────────────────────────────

    def _add_event(self, event_type: str, **payload) -> None:
        self.events.append({"type": event_type, **payload})

    # ── Ejecución ─────────────────────────────────────────────────

    async def _call_provider(self, messages: List[ChatMessage]) -> ChatResponse:
        self.provider_calls += 1
        response = await self.chat_fn(
            provider_name=self.provider_name,
            messages=messages,
            model=self.model,
            temperature=0.4,
        )
        self.tokens_used += response.tokens_used or 0
        return response

    def _tool_summary(self, result: Dict[str, Any]) -> str:
        """Resumen corto del resultado de una herramienta para los eventos."""
        data = result.get("data")
        if isinstance(data, dict):
            message = data.get("message")
            if message:
                return str(message)
            if "conflicts" in data and data.get("conflicts"):
                return f"{len(data['conflicts'])} conflicto(s) detectado(s)"
            if data.get("has_plan") is False:
                return "No hay plan activo"
        if isinstance(data, list):
            return f"{len(data)} elemento(s)"
        return "ok" if result.get("success") else (result.get("error") or "error")

    async def run(
        self,
        user_message: str,
        history: Optional[List[ChatMessage]] = None,
        academic_context: str = "",
    ) -> Dict[str, Any]:
        """Ejecuta el loop del agente para un mensaje del usuario.

        Returns:
            dict con success, message, events, tools_executed,
            confirmation (si hay acción pendiente), error_code y tokens.
        """
        self._add_event("query_received", message=(user_message or "")[:120])

        messages: List[ChatMessage] = [ChatMessage(role="system", content=build_system_prompt(academic_context))]
        messages.extend(history or [])
        messages.append(ChatMessage(role="user", content=user_message))

        executed_hashes: set = set()
        final_text = ""

        for _iteration in range(MAX_ITERATIONS):
            try:
                response = await self._call_provider(messages)
            except AIProviderError as exc:
                return self._provider_error_result(exc)
            except ValueError as exc:
                return {
                    "success": False,
                    "message": str(exc),
                    "events": self.events,
                    "tools_executed": self.tools_executed,
                    "confirmation": None,
                    "error_code": "provider_unavailable",
                    "tokens_used": self.tokens_used,
                }

            content = response.content or ""
            action = extract_json_action(content)

            if action is None:
                final_text = content.strip()
                self._add_event("explanation", message=final_text[:160])
                return {
                    "success": True,
                    "message": final_text or "No tengo nada que añadir por ahora.",
                    "events": self.events,
                    "tools_executed": self.tools_executed,
                    "confirmation": None,
                    "error_code": None,
                    "tokens_used": self.tokens_used,
                }

            tool_name = action["tool"].strip()
            parameters = action.get("parameters")
            if not isinstance(parameters, dict):
                parameters = {}

            # Seguridad: el modelo jamás confirma por sí mismo
            parameters.pop("confirmed", None)

            fingerprint = action_hash(tool_name, parameters)
            if fingerprint in executed_hashes:
                # El modelo repite la misma acción: cortamos el loop para
                # evitar una doble ejecución.
                final_text = strip_action_json(content, action) or (
                    "Detecté que repetías la misma acción, así que la ejecuté una "
                    "sola vez."
                )
                self._add_event("explanation", message=final_text[:160])
                return {
                    "success": True,
                    "message": final_text,
                    "events": self.events,
                    "tools_executed": self.tools_executed,
                    "confirmation": None,
                    "error_code": None,
                    "tokens_used": self.tokens_used,
                }
            executed_hashes.add(fingerprint)

            self._add_event("tool_started", tool=tool_name)
            result = self.tools.execute(tool_name, parameters)

            if result.get("requires_confirmation"):
                return self._register_pending_action(tool_name, parameters, content, action)

            if result.get("conflict_detected"):
                self._add_event(
                    "conflict_detected",
                    tool=tool_name,
                    conflicts=result.get("data", {}).get("conflicts", []),
                )

            if result.get("success"):
                self.tools_executed.append(result)
                self._add_event(
                    "tool_result",
                    tool=tool_name,
                    success=True,
                    summary=self._tool_summary(result),
                )
                detected = self._detected_conflicts(result)
                if detected:
                    self._add_event("conflict_detected", tool=tool_name, conflicts=detected)
                overloads = self._detect_overloads(result)
                if overloads:
                    self._add_event("overload_detected", count=overloads)
                tool_result_message = (
                    f"<tool_result>{json.dumps(result, ensure_ascii=False, default=str)}</tool_result>\n"
                    "Resultado real de la herramienta. Redacta la respuesta al "
                    "estudiante con estos datos (texto plano) o pide otra "
                    "herramienta si falta información."
                )
            else:
                self._add_event(
                    "tool_result",
                    tool=tool_name,
                    success=False,
                    error=result.get("error"),
                )
                tool_result_message = (
                    f"<tool_result>{json.dumps(result, ensure_ascii=False, default=str)}</tool_result>\n"
                    "La herramienta falló. Corrige los parámetros con otro JSON o "
                    "responde al estudiante explicando el problema."
                )

            messages.append(ChatMessage(role="user", content=tool_result_message))

        # Se agotaron las iteraciones sin respuesta final del modelo
        final_text = (
            "Ejecuté varias consultas pero alcancé mi límite de pasos para esta "
            "petición. Esto es lo que encontré:\n"
            + "\n".join(f"- {self._tool_summary(r)}" for r in self.tools_executed)
        )
        self._add_event("explanation", message=final_text[:160])
        return {
            "success": True,
            "message": final_text,
            "events": self.events,
            "tools_executed": self.tools_executed,
            "confirmation": None,
            "error_code": None,
            "tokens_used": self.tokens_used,
        }

    # ── Confirmaciones ─────────────────────────────────────────────

    def _register_pending_action(
        self,
        tool_name: str,
        parameters: Dict[str, Any],
        model_content: str,
        action: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Registra la acción pendiente y retorna el resultado con confirmation."""
        action_id = pending_actions.register(
            tool_name,
            parameters,
            context={
                "provider_name": self.provider_name,
                "model": self.model,
            },
        )
        description = self._confirmation_description(tool_name, parameters)
        narrated = strip_action_json(model_content, action)

        confirmation = {
            "action_id": action_id,
            "tool": tool_name,
            "parameters": parameters,
            "description": description,
        }
        self._add_event(
            "confirmation_required",
            action_id=action_id,
            tool=tool_name,
            parameters=parameters,
            description=description,
        )

        message = narrated or (
            f"Necesito tu confirmación para continuar: {description}"
        )

        return {
            "success": True,
            "message": message,
            "events": self.events,
            "tools_executed": self.tools_executed,
            "confirmation": confirmation,
            "error_code": None,
            "tokens_used": self.tokens_used,
        }

    def _confirmation_description(self, tool_name: str, parameters: Dict[str, Any]) -> str:
        """Descripción legible de la acción que se ejecutará al confirmar."""
        try:
            catalog = {t["name"]: t for t in get_available_tools()}
            base = catalog.get(tool_name, {}).get(
                "description", f"ejecutar {tool_name}"
            )
        except Exception:  # noqa: BLE001
            base = f"ejecutar {tool_name}"

        details = []
        for key in ("subject", "task", "item", "item_type", "name", "title", "grade", "day_of_week"):
            value = parameters.get(key)
            if value is not None:
                details.append(f"{key}={value}")
        for key in ("start_time", "end_time", "due_date", "date", "status"):
            value = parameters.get(key)
            if value is not None:
                details.append(f"{key}={value}")

        suffix = f" ({', '.join(details)})" if details else ""
        return f"{tool_name}: {base}{suffix}"

    # ── Errores ───────────────────────────────────────────────────

    def _provider_error_result(self, exc: AIProviderError) -> Dict[str, Any]:
        """Resultado controlado ante un error del proveedor de IA."""
        event_type = "quota_exhausted" if exc.error_code == "quota_exhausted" else "provider_error"
        self._add_event(event_type, error_code=exc.error_code)
        return {
            "success": False,
            "message": friendly_message(exc.error_code),
            "events": self.events,
            "tools_executed": self.tools_executed,
            "confirmation": None,
            "error_code": exc.error_code,
            "tokens_used": self.tokens_used,
        }

    # ── Utilidades ─────────────────────────────────────────────────

    @staticmethod
    def _detect_overloads(result: Dict[str, Any]) -> int:
        """Cuenta sobrecargas en el resultado de detección de conflictos."""
        data = result.get("data")
        if isinstance(data, dict):
            overloads = data.get("overloads")
            if isinstance(overloads, list):
                return len(overloads)
        return 0

    @staticmethod
    def _detected_conflicts(result: Dict[str, Any]) -> List[Any]:
        """Extrae conflictos detectados de un resultado exitoso."""
        data = result.get("data")
        if isinstance(data, dict):
            conflicts = data.get("conflicts")
            if isinstance(conflicts, list) and conflicts:
                return conflicts
        return []


# ── Narración tras confirmación ────────────────────────────────────


async def narrate_tool_result(
    provider_name: str,
    model: Optional[str],
    history: List[ChatMessage],
    tool_result: Dict[str, Any],
) -> str:
    """Pide al modelo que redacte el resultado de una acción confirmada.

    Si el proveedor falla, el llamador debe usar el mensaje del propio
    resultado de la herramienta como respaldo (la app sigue funcionando).
    """
    messages = [ChatMessage(role="system", content=NARRATOR_SYSTEM_PROMPT)]
    messages.extend(history[-6:])
    messages.append(
        ChatMessage(
            role="user",
            content=(
                f"<tool_result>{json.dumps(tool_result, ensure_ascii=False, default=str)}</tool_result>\n"
                "Redacta el resultado para el estudiante."
            ),
        )
    )
    response = await ai_manager.chat(
        provider_name=provider_name,
        messages=messages,
        model=model,
        temperature=0.5,
    )
    return (response.content or "").strip()
