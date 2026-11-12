"""Endpoints para el asistente de IA multi-proveedor."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import date
import json

from app.db.session import get_db
from app.crud.student import get_latest_student
from app.crud import ai_provider as ai_crud
from app.schemas.ai_provider import (
    AIProviderConfigCreate,
    AIProviderConfigUpdate,
    AIProviderConfigResponse,
    AIProviderListItem,
    AIProviderSetupRequest,
    AIProviderTestRequest,
    AIProviderTestResponse,
    ConversationCreate,
    ConversationUpdate,
    ConversationResponse,
    MessageCreate,
    MessageResponse,
    ChatRequest,
    ChatResponse,
    ToolCallRequest,
    ToolCallResponse,
    AIModelSuggestion,
    AgentChatRequest,
    AgentChatResponse,
    AgentConfirmRequest,
    AgentConfirmResponse,
    AgentCancelRequest,
)

from app.services.ai.manager import ai_manager
from app.services.ai.context import get_academic_context
from app.services.ai.tools import AITools, get_available_tools, ALLOWED_READ_TOOLS, MUTATING_TOOLS, CONFIRMATION_REQUIRED_TOOLS
from app.services.ai.agent import (
    AcademicAgent,
    pending_actions,
    narrate_tool_result,
    action_hash,
    build_system_prompt,
)
from app.services.ai.base import ChatMessage

router = APIRouter(prefix="/ai", tags=["Asistente IA"])


def get_current_student(db: Session):
    student = get_latest_student(db)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró configuración de estudiante. Complete el asistente inicial.",
        )
    return student


# ── Configuración de proveedores ──────────────────────────────────

@router.get("/providers", response_model=List[AIProviderListItem])
def list_providers(db: Session = Depends(get_db)):
    """Lista todos los proveedores configurados y disponibles."""
    configs = ai_crud.get_ai_provider_configs(db)
    configured_keys = set(ai_manager.get_configured_providers())

    result = []
    for config in configs:
        result.append(AIProviderListItem(
            id=config.id,
            provider_name=config.provider_name,
            model=config.model,
            is_active=config.is_active,
            is_configured=config.provider_name in configured_keys,
            connection_status=config.connection_status,
            connection_tested_at=config.connection_tested_at.isoformat() if config.connection_tested_at else None,
            created_at=config.created_at.isoformat() if config.created_at else None,
            updated_at=config.updated_at.isoformat() if config.updated_at else None,
        ))
    return result


@router.post("/providers/setup", response_model=AIProviderConfigResponse, status_code=status.HTTP_201_CREATED)
def setup_provider(
    setup: AIProviderSetupRequest,
    db: Session = Depends(get_db),
):
    """Configura un proveedor de IA con su API key y modelo."""
    student = get_current_student(db)

    # Guardar la API key de forma segura (fuera de SQLite)
    key_manager = ai_manager  # usa el key_manager interno
    from app.services.ai.key_manager import key_manager as km
    km.set_key(setup.provider_name, setup.api_key)

    # Crear o actualizar configuración en SQLite (sin la API key)
    existing = ai_crud.get_ai_provider_config(db, setup.provider_name)
    if existing:
        update_data = AIProviderConfigUpdate(
            model=setup.model,
            is_active=setup.is_active,
            is_configured=True,
            connection_status=None,
        )
        config = ai_crud.update_ai_provider_config(db, setup.provider_name, update_data)
    else:
        config_data = AIProviderConfigCreate(
            provider_name=setup.provider_name,
            model=setup.model,
            is_active=setup.is_active,
            is_configured=True,
        )
        config = ai_crud.create_ai_provider_config(db, config_data)

    # Si se marca como activo, activar este proveedor
    if setup.is_active:
        ai_crud.set_active_provider(db, setup.provider_name)

    return config


@router.post("/providers/test", response_model=AIProviderTestResponse)
def test_provider_connection(
    test_req: AIProviderTestRequest,
):
    """Prueba la conexión con un proveedor sin guardar la API key."""
    import asyncio

    try:
        result = asyncio.run(
            ai_manager.test_provider_connection(
                provider_name=test_req.provider_name,
                api_key=test_req.api_key,
                model=test_req.model,
            )
        )
        return AIProviderTestResponse(
            success=result.get("success", False),
            provider_name=test_req.provider_name,
            model=test_req.model,
            status=result.get("status", "error"),
            message=result.get("message", ""),
            error_code=result.get("error_code"),
        )
    except Exception as e:
        return AIProviderTestResponse(
            success=False,
            provider_name=test_req.provider_name,
            model=test_req.model,
            status="error",
            message=str(e),
            error_code="unexpected_error",
        )


@router.post("/providers/{provider_name}/test", response_model=AIProviderTestResponse)
def test_configured_provider(
    provider_name: str,
    db: Session = Depends(get_db),
):
    """Prueba la conexión de un proveedor ya configurado."""
    import asyncio

    from app.services.ai.key_manager import key_manager as km
    api_key = km.get_key(provider_name)
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No hay API key configurada para {provider_name}",
        )

    try:
        result = asyncio.run(
            ai_manager.test_provider_connection(
                provider_name=provider_name,
                api_key=api_key,
            )
        )
        # Actualizar estado en SQLite
        ai_crud.update_connection_status(
            db, provider_name, result.get("status", "error"), result.get("message")
        )

        return AIProviderTestResponse(
            success=result.get("success", False),
            provider_name=provider_name,
            status=result.get("status", "error"),
            message=result.get("message", ""),
            error_code=result.get("error_code"),
        )
    except Exception as e:
        return AIProviderTestResponse(
            success=False,
            provider_name=provider_name,
            status="error",
            message=str(e),
            error_code="unexpected_error",
        )


@router.post(
    "/providers/{provider_name}/activate",
    response_model=AIProviderConfigResponse,
)
def activate_provider(
    provider_name: str,
    db: Session = Depends(get_db),
):
    """Activa un proveedor ya configurado sin volver a pedir la API key.

    Permite cambiar de proveedor cuando el activo agota su cuota o
    alcanza su límite de solicitudes.
    """
    from app.services.ai.key_manager import key_manager as km

    config = ai_crud.get_ai_provider_config(db, provider_name)
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Proveedor {provider_name} no configurado",
        )

    if not km.get_key(provider_name):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No hay API key configurada para {provider_name}",
        )

    activated = ai_crud.set_active_provider(db, provider_name)
    return activated


@router.delete("/providers/{provider_name}", status_code=status.HTTP_204_NO_CONTENT)
def delete_provider(
    provider_name: str,
    db: Session = Depends(get_db),
):
    """Elimina la configuración y API key de un proveedor."""
    from app.services.ai.key_manager import key_manager as km

    # Eliminar API key del almacenamiento seguro
    km.delete_key(provider_name)

    # Eliminar configuración de SQLite
    success = ai_crud.delete_ai_provider_config(db, provider_name)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Proveedor {provider_name} no encontrado",
        )
    return None


@router.get("/providers/{provider_name}/models", response_model=List[str])
def get_provider_models(
    provider_name: str,
    api_key: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Obtiene los modelos disponibles para un proveedor.

    Acepta una API key temporal para poder listar modelos antes de
    guardar el proveedor; si no se envía, usa la clave almacenada.
    """
    import asyncio

    from app.services.ai.key_manager import key_manager as km
    resolved_key = api_key or km.get_key(provider_name)
    if not resolved_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No hay API key configurada para {provider_name}",
        )

    try:
        models = asyncio.run(
            ai_manager.get_available_models(provider_name, api_key=resolved_key)
        )
        return models
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get("/providers/available", response_model=List[str])
def list_available_providers():
    """Lista los nombres de proveedores soportados por TaskFlow."""
    return ai_manager.get_available_providers()


@router.get("/providers/configured", response_model=List[str])
def list_configured_providers():
    """Lista los proveedores que tienen API key configurada."""
    return ai_manager.get_configured_providers()


# ── Conversaciones ─────────────────────────────────────────────────

@router.get("/conversations", response_model=List[ConversationResponse])
def list_conversations(db: Session = Depends(get_db)):
    """Lista todas las conversaciones del asistente."""
    conversations = ai_crud.get_conversations(db)
    result = []
    for conv in conversations:
        msg_count = len(conv.messages) if conv.messages else 0
        result.append(ConversationResponse(
            id=conv.id,
            title=conv.title,
            provider_name=conv.provider_name,
            model=conv.model,
            created_at=conv.created_at,
            updated_at=conv.updated_at,
            message_count=msg_count,
        ))
    return result


@router.post("/conversations", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
def create_conversation(
    conv_in: ConversationCreate,
    db: Session = Depends(get_db),
):
    """Crea una nueva conversación."""
    conversation = ai_crud.create_conversation(db, conv_in)
    return ConversationResponse(
        id=conversation.id,
        title=conversation.title,
        provider_name=conversation.provider_name,
        model=conversation.model,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        message_count=0,
    )


@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
def get_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
):
    """Obtiene una conversación con sus mensajes."""
    conv = ai_crud.get_conversation(db, conversation_id)
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversación no encontrada",
        )
    messages = ai_crud.get_messages_by_conversation(db, conversation_id)
    return ConversationResponse(
        id=conv.id,
        title=conv.title,
        provider_name=conv.provider_name,
        model=conv.model,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        message_count=len(messages),
    )


@router.put("/conversations/{conversation_id}", response_model=ConversationResponse)
def update_conversation(
    conversation_id: int,
    conv_in: ConversationUpdate,
    db: Session = Depends(get_db),
):
    """Actualiza el título de una conversación."""
    conv = ai_crud.update_conversation(db, conversation_id, conv_in)
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversación no encontrada",
        )
    return ConversationResponse(
        id=conv.id,
        title=conv.title,
        provider_name=conv.provider_name,
        model=conv.model,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        message_count=len(conv.messages) if conv.messages else 0,
    )


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
):
    """Elimina una conversación."""
    success = ai_crud.delete_conversation(db, conversation_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversación no encontrada",
        )
    return None


@router.get("/conversations/{conversation_id}/messages", response_model=List[MessageResponse])
def get_conversation_messages(
    conversation_id: int,
    db: Session = Depends(get_db),
):
    """Obtiene los mensajes de una conversación."""
    conv = ai_crud.get_conversation(db, conversation_id)
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversación no encontrada",
        )
    messages = ai_crud.get_messages_by_conversation(db, conversation_id)
    return messages


# ── Chat ───────────────────────────────────────────────────────────

@router.post("/chat", response_model=ChatResponse)
def chat_with_assistant(
    chat_req: ChatRequest,
    db: Session = Depends(get_db),
):
    """Envía un mensaje al asistente IA y obtiene una respuesta."""
    import asyncio

    student = get_current_student(db)

    # Obtener o crear conversación
    conversation_id = chat_req.conversation_id
    if conversation_id:
        conv = ai_crud.get_conversation(db, conversation_id)
        if not conv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversación no encontrada",
            )
    else:
        # Crear nueva conversación
        provider_name = chat_req.provider_name or "openrouter"
        model = chat_req.model or None
        new_conv = ai_crud.create_conversation(db, ConversationCreate(
            title="Nueva conversación",
            provider_name=provider_name,
            model=model,
        ))
        conversation_id = new_conv.id

    # Guardar mensaje del usuario
    user_msg = ai_crud.create_message(db, MessageCreate(
        conversation_id=conversation_id,
        role="user",
        content=chat_req.message,
    ))

    # Construir mensajes para el proveedor
    provider_name = chat_req.provider_name
    model = chat_req.model

    # Si no se especifica proveedor, usar el activo
    if not provider_name:
        active = ai_crud.get_active_ai_provider(db)
        if active:
            provider_name = active.provider_name
            model = model or active.model

    if not provider_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay proveedor de IA configurado. Configure uno en Ajustes > Asistente IA.",
        )

    # Recuperar contexto académico si se solicita
    context_text = ""
    if chat_req.use_academic_context:
        ctx = get_academic_context(db, student.id)
        full_context = ctx.get_full_context()
        context_text = ctx.format_context_for_prompt(full_context)

    # Construir mensajes para el chat
    system_prompt = f"""Eres el asistente académico de TaskFlow, una aplicación de organización universitaria.
Tu objetivo es ayudar al estudiante a organizar sus materias, horarios, tareas, proyectos y tiempo de estudio.

{context_text}

Responde siempre en español, de forma clara, útil y orientada a la organización académica.
No inventes horarios ni modifiques directamente la base de datos. Si necesitas realizar cambios,
utiliza las herramientas disponibles y solicita confirmación al usuario cuando sea necesario.
"""

    messages = [ChatMessage(role="system", content=system_prompt)]

    # Agregar historial reciente de la conversación (últimos 10 mensajes)
    history = ai_crud.get_messages_by_conversation(db, conversation_id, limit=10)
    for msg in history:
        messages.append(ChatMessage(role=msg.role, content=msg.content))

    # Agregar el mensaje actual (ya está en el historial si se guardó arriba, pero lo agregamos para el proveedor)
    # El mensaje del usuario ya está en history si se guardó antes, pero aquí lo agregamos explícitamente
    # para asegurar que se envíe al proveedor

    try:
        response = asyncio.run(
            ai_manager.chat(
                provider_name=provider_name,
                messages=messages,
                model=model,
                temperature=0.7,
            )
        )

        # Guardar respuesta del asistente
        assistant_msg = ai_crud.create_message(db, MessageCreate(
            conversation_id=conversation_id,
            role="assistant",
            content=response.content,
            tokens_used=response.tokens_used,
        ))

        return ChatResponse(
            message=response.content,
            conversation_id=conversation_id,
            message_id=assistant_msg.id,
            provider_name=response.provider,
            model=response.model,
            tokens_used=response.tokens_used,
            finish_reason=response.finish_reason,
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al comunicarse con el asistente: {str(e)}",
        )


# ── Herramientas controladas ──────────────────────────────────────

@router.get("/tools", response_model=List[Dict[str, Any]])
def list_tools():
    """Lista las herramientas controladas disponibles para el asistente."""
    return get_available_tools()


@router.post("/tools/call", response_model=ToolCallResponse)
def call_tool(
    tool_req: ToolCallRequest,
    db: Session = Depends(get_db),
):
    """Ejecuta una herramienta controlada."""
    student = get_current_student(db)

    # La verificación de confirmación la realiza AITools.execute():
    # las herramientas que modifican datos existentes exigen el
    # parámetro `confirmed: true` del usuario.
    tools = AITools(db, student.id)
    result = tools.execute(tool_req.tool, tool_req.parameters)

    return ToolCallResponse(
        tool=result.get("tool", tool_req.tool),
        success=result.get("success", False),
        data=result.get("data", {}),
        error=result.get("error"),
        requires_confirmation=result.get("requires_confirmation"),
        conflict_detected=result.get("conflict_detected"),
    )


# ── Agente interactivo ─────────────────────────────────────────────


def _resolve_agent_provider(db: Session, provider_name: Optional[str], model: Optional[str]):
    """Resuelve el proveedor activo si no se especificó uno."""
    if not provider_name:
        active = ai_crud.get_active_ai_provider(db)
        if active:
            provider_name = active.provider_name
            model = model or active.model
    if not provider_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay proveedor de IA configurado. Configure uno en Ajustes > Asistente IA.",
        )
    return provider_name, model


@router.post("/agent/chat", response_model=AgentChatResponse)
def agent_chat(
    req: AgentChatRequest,
    db: Session = Depends(get_db),
):
    """Conversa con el agente ejecutando herramientas controladas.

    El modelo responde con acciones JSON que el backend valida y
    ejecuta; las modificaciones de datos existentes quedan como
    acciones pendientes que el usuario confirma explícitamente.
    """
    import asyncio

    student = get_current_student(db)
    provider_name, model = _resolve_agent_provider(db, req.provider_name, req.model)

    # Obtener o crear la conversación
    if req.conversation_id:
        conv = ai_crud.get_conversation(db, req.conversation_id)
        if not conv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversación no encontrada",
            )
        conversation_id = conv.id
    else:
        title = (req.message or "Conversación").strip()[:60]
        new_conv = ai_crud.create_conversation(db, ConversationCreate(
            title=title,
            provider_name=provider_name,
            model=model,
        ))
        conversation_id = new_conv.id

    # Historial previo (sin el mensaje nuevo, que el agente agrega al final)
    history = [
        ChatMessage(role=m.role, content=m.content)
        for m in ai_crud.get_messages_by_conversation(db, conversation_id, limit=10)
    ]

    ai_crud.create_message(db, MessageCreate(
        conversation_id=conversation_id,
        role="user",
        content=req.message,
    ))

    context_text = ""
    if req.use_academic_context:
        ctx = get_academic_context(db, student.id)
        context_text = ctx.format_context_for_prompt(ctx.get_full_context())

    agent = AcademicAgent(db, student.id, provider_name, model)
    result = asyncio.run(agent.run(req.message, history, context_text))

    # Anotar la conversación en la acción pendiente para que la
    # confirmación pueda persistir y narrar con el historial correcto.
    confirmation = result.get("confirmation")
    if confirmation and confirmation.get("action_id"):
        pending_actions.set_context(
            confirmation["action_id"],
            conversation_id=conversation_id,
            student_id=student.id,
        )

    assistant_msg = None
    if result.get("message"):
        assistant_msg = ai_crud.create_message(db, MessageCreate(
            conversation_id=conversation_id,
            role="assistant",
            content=result["message"],
        ))

    return AgentChatResponse(
        success=result.get("success", False),
        message=result.get("message", ""),
        conversation_id=conversation_id,
        message_id=assistant_msg.id if assistant_msg else None,
        provider_name=provider_name,
        model=model,
        events=result.get("events", []),
        tools_executed=result.get("tools_executed", []),
        confirmation=confirmation,
        error_code=result.get("error_code"),
        tokens_used=result.get("tokens_used"),
    )


@router.post("/agent/confirm", response_model=AgentConfirmResponse)
def agent_confirm(
    req: AgentConfirmRequest,
    db: Session = Depends(get_db),
):
    """Aplica la decisión del usuario sobre una acción pendiente.

    El consumo de la acción es único: no puede ejecutarse dos veces.
    """
    import asyncio

    get_current_student(db)
    action = pending_actions.consume(req.action_id)
    if not action:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "La acción ya no está disponible: fue confirmada, cancelada "
                "o expiró. Vuelve a pedírselo al asistente."
            ),
        )

    context = action.get("context") or {}
    conversation_id = req.conversation_id or context.get("conversation_id")

    if req.decision == "cancel":
        message = "Acción cancelada: no se modificó ningún dato."
        if conversation_id:
            ai_crud.create_message(db, MessageCreate(
                conversation_id=conversation_id,
                role="assistant",
                content=message,
            ))
        return AgentConfirmResponse(
            success=True,
            cancelled=True,
            message=message,
            events=[{"type": "action_cancelled", "tool": action["tool"]}],
            conversation_id=conversation_id,
        )

    tool_name = action["tool"]
    parameters = dict(action.get("parameters") or {})
    # Solo aquí, con la decisión real del usuario, se activa confirmed.
    parameters["confirmed"] = True

    events: List[Dict[str, Any]] = [{"type": "tool_started", "tool": tool_name}]
    student = get_current_student(db)
    tools = AITools(db, student.id)
    result = tools.execute(tool_name, parameters)

    if result.get("conflict_detected"):
        events.append({
            "type": "conflict_detected",
            "tool": tool_name,
            "conflicts": result.get("data", {}).get("conflicts", []),
        })

    fallback = None
    data = result.get("data")
    if isinstance(data, dict):
        fallback = data.get("message")

    if result.get("success"):
        events.append({
            "type": "tool_result",
            "tool": tool_name,
            "success": True,
        })
        if tool_name in CONFIRMATION_REQUIRED_TOOLS:
            events.append({"type": "action_completed", "tool": tool_name})
    else:
        events.append({
            "type": "tool_result",
            "tool": tool_name,
            "success": False,
            "error": result.get("error"),
        })

    # Redacción: se intenta con el modelo narrador y si falla se usa el
    # mensaje verificado del propio resultado de la herramienta.
    message = None
    provider_name = context.get("provider_name")
    if result.get("success") and provider_name:
        history = []
        if conversation_id:
            history = [
                ChatMessage(role=m.role, content=m.content)
                for m in ai_crud.get_messages_by_conversation(db, conversation_id, limit=6)
            ]
        try:
            message = asyncio.run(
                narrate_tool_result(
                    provider_name,
                    context.get("model"),
                    history,
                    result,
                )
            )
        except Exception:  # noqa: BLE001
            message = None
    if not message:
        if result.get("success"):
            message = fallback or "Acción ejecutada correctamente."
        else:
            message = fallback or result.get("error") or "No se pudo ejecutar la acción."

    response_message = message
    response_success = bool(result.get("success"))
    response_events = events
    response_confirmation = None
    response_error_code = None

    if req.decision == "accept" and result.get("success"):
        # Tras una acción confirmada con éxito, el bucle continúa solo: el
        # modelo puede proponer la siguiente acción (p. ej. el siguiente
        # cambio de tarea) sin que el usuario tenga que escribir otro
        # mensaje. Si la continuación devuelve otra acción pendiente, esa
        # se entrega como la nueva confirmación a resolver.
        try:
            tool_result_text = (
                f"<tool_result>{json.dumps(result, ensure_ascii=False, default=str)}</tool_result>\n"
                "Resultado real de la herramienta. Redacta la respuesta al "
                "estudiante con estos datos (texto plano) o pide otra "
                "herramienta si falta información."
            )
            cont_agent = AcademicAgent(
                db,
                student.id,
                context.get("provider_name") or "openrouter",
                context.get("model"),
            )
            cont_messages = [ChatMessage(role="system", content=build_system_prompt(""))]
            if conversation_id:
                cont_messages.extend(
                    ChatMessage(role=m.role, content=m.content)
                    for m in ai_crud.get_messages_by_conversation(db, conversation_id, limit=6)
                )
            cont_messages.append(ChatMessage(role="user", content=tool_result_text))
            continuation = asyncio.run(
                cont_agent.run_turn(
                    cont_messages,
                    {action_hash(action["tool"], action.get("parameters") or {})},
                )
            )
            response_message = continuation.get("message") or message
            response_events = continuation.get("events") or events
            response_success = bool(continuation.get("success", True))
            response_confirmation = continuation.get("confirmation")
            response_error_code = continuation.get("error_code")
        except Exception:  # noqa: BLE001
            response_message = message
            response_events = events
            response_success = bool(result.get("success"))

    if conversation_id:
        ai_crud.create_message(db, MessageCreate(
            conversation_id=conversation_id,
            role="assistant",
            content=response_message,
        ))

    return AgentConfirmResponse(
        success=response_success,
        cancelled=False,
        tool=tool_name,
        message=response_message,
        data=result.get("data", {}),
        events=response_events,
        error_code=response_error_code,
        conversation_id=conversation_id,
        confirmation=response_confirmation,
    )


@router.post("/agent/cancel", response_model=AgentConfirmResponse)
def agent_cancel(
    req: AgentCancelRequest,
    db: Session = Depends(get_db),
):
    """Cancela una acción pendiente sin ejecutar nada."""
    get_current_student(db)
    action = pending_actions.consume(req.action_id)
    if not action:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La acción ya no está disponible.",
        )

    conversation_id = req.conversation_id or (action.get("context") or {}).get("conversation_id")
    message = "Acción cancelada: no se modificó ningún dato."
    if conversation_id:
        ai_crud.create_message(db, MessageCreate(
            conversation_id=conversation_id,
            role="assistant",
            content=message,
        ))

    return AgentConfirmResponse(
        success=True,
        cancelled=True,
        tool=action["tool"],
        message=message,
        events=[{"type": "action_cancelled", "tool": action["tool"]}],
        conversation_id=conversation_id,
    )
