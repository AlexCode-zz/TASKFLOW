"""Operaciones CRUD para configuración de proveedores de IA y conversaciones."""

from sqlalchemy.orm import Session
from typing import Optional, List

from app.models.ai_provider import AIProviderConfig, Conversation, Message
from app.schemas.ai_provider import (
    AIProviderConfigCreate,
    AIProviderConfigUpdate,
    ConversationCreate,
    ConversationUpdate,
    MessageCreate,
)


# ── Proveedores de IA ──────────────────────────────────────────────

def get_ai_provider_config(db: Session, provider_name: str) -> Optional[AIProviderConfig]:
    """Obtiene la configuración de un proveedor por nombre."""
    return db.query(AIProviderConfig).filter(AIProviderConfig.provider_name == provider_name).first()


def get_ai_provider_configs(db: Session) -> List[AIProviderConfig]:
    """Lista todas las configuraciones de proveedores."""
    return db.query(AIProviderConfig).order_by(AIProviderConfig.provider_name).all()


def get_active_ai_provider(db: Session) -> Optional[AIProviderConfig]:
    """Obtiene el proveedor activo actualmente."""
    return db.query(AIProviderConfig).filter(AIProviderConfig.is_active == True).first()  # noqa: E712


def create_ai_provider_config(db: Session, config_in: AIProviderConfigCreate) -> AIProviderConfig:
    """Crea una nueva configuración de proveedor."""
    db_config = AIProviderConfig(**config_in.model_dump())
    db.add(db_config)
    db.commit()
    db.refresh(db_config)
    return db_config


def update_ai_provider_config(
    db: Session, provider_name: str, config_in: AIProviderConfigUpdate
) -> Optional[AIProviderConfig]:
    """Actualiza la configuración de un proveedor existente."""
    db_config = get_ai_provider_config(db, provider_name)
    if not db_config:
        return None

    update_data = config_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_config, field, value)

    db.commit()
    db.refresh(db_config)
    return db_config


def set_active_provider(db: Session, provider_name: str) -> Optional[AIProviderConfig]:
    """Establece un proveedor como activo (desactiva los demás)."""
    # Desactivar todos
    db.query(AIProviderConfig).update({AIProviderConfig.is_active: False})

    # Activar el seleccionado
    db_config = get_ai_provider_config(db, provider_name)
    if db_config:
        db_config.is_active = True
        db.commit()
        db.refresh(db_config)
    return db_config


def delete_ai_provider_config(db: Session, provider_name: str) -> bool:
    """Elimina la configuración de un proveedor."""
    db_config = get_ai_provider_config(db, provider_name)
    if not db_config:
        return False

    # Si era el activo, desactivar
    if db_config.is_active:
        db_config.is_active = False

    db.delete(db_config)
    db.commit()
    return True


def update_connection_status(
    db: Session, provider_name: str, status: str, message: Optional[str] = None
) -> Optional[AIProviderConfig]:
    """Actualiza el estado de conexión de un proveedor."""
    from datetime import datetime, timezone

    db_config = get_ai_provider_config(db, provider_name)
    if not db_config:
        return None

    db_config.connection_status = status
    db_config.connection_tested_at = datetime.now(timezone.utc)
    if message:
        db_config.is_configured = status == "ok"

    db.commit()
    db.refresh(db_config)
    return db_config


# ── Conversaciones ─────────────────────────────────────────────────

def get_conversation(db: Session, conversation_id: int) -> Optional[Conversation]:
    """Obtiene una conversación por ID."""
    return db.query(Conversation).filter(Conversation.id == conversation_id).first()


def get_conversations(db: Session) -> List[Conversation]:
    """Lista todas las conversaciones ordenadas por actualización."""
    return db.query(Conversation).order_by(Conversation.updated_at.desc()).all()


def create_conversation(db: Session, conv_in: ConversationCreate) -> Conversation:
    """Crea una nueva conversación."""
    db_conv = Conversation(**conv_in.model_dump())
    db.add(db_conv)
    db.commit()
    db.refresh(db_conv)
    return db_conv


def update_conversation(
    db: Session, conversation_id: int, conv_in: ConversationUpdate
) -> Optional[Conversation]:
    """Actualiza una conversación existente."""
    db_conv = get_conversation(db, conversation_id)
    if not db_conv:
        return None

    update_data = conv_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_conv, field, value)

    db.commit()
    db.refresh(db_conv)
    return db_conv


def delete_conversation(db: Session, conversation_id: int) -> bool:
    """Elimina una conversación y sus mensajes."""
    db_conv = get_conversation(db, conversation_id)
    if not db_conv:
        return False
    db.delete(db_conv)
    db.commit()
    return True


# ── Mensajes ───────────────────────────────────────────────────────

def get_messages_by_conversation(
    db: Session, conversation_id: int, limit: int = 50
) -> List[Message]:
    """Obtiene los mensajes de una conversación."""
    return (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
        .limit(limit)
        .all()
    )


def create_message(db: Session, msg_in: MessageCreate) -> Message:
    """Crea un nuevo mensaje."""
    db_msg = Message(**msg_in.model_dump())
    db.add(db_msg)
    db.commit()
    db.refresh(db_msg)
    return db_msg
