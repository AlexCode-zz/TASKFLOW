"""Modelos para configuración de proveedores de IA (sin secretos)."""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Index, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class AIProviderConfig(Base):
    """Configuración de un proveedor de IA (solo metadatos, nunca la API key)."""

    __tablename__ = "ai_provider_configs"

    id = Column(Integer, primary_key=True, index=True)
    provider_name = Column(String, nullable=False, index=True)  # openrouter, anthropic, gemini, openai
    model = Column(String, nullable=True)  # Identificador del modelo
    is_active = Column(Boolean, default=False, nullable=False, index=True)
    is_configured = Column(Boolean, default=False, nullable=False)
    connection_tested_at = Column(DateTime(timezone=True), nullable=True)
    connection_status = Column(String, nullable=True)  # ok, error, not_tested
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        Index("ix_ai_provider_configs_provider", "provider_name"),
        Index("ix_ai_provider_configs_active", "is_active"),
    )


class Conversation(Base):
    """Conversación del asistente IA."""

    __tablename__ = "ai_conversations"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, default="Nueva conversación")
    provider_name = Column(String, nullable=True)  # Proveedor usado al crear
    model = Column(String, nullable=True)  # Modelo usado al crear
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_ai_conversations_updated", "updated_at"),
    )


class Message(Base):
    """Mensaje dentro de una conversación."""

    __tablename__ = "ai_messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("ai_conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String, nullable=False)  # user, assistant, system
    content = Column(Text, nullable=False)
    tokens_used = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    conversation = relationship("Conversation", back_populates="messages")

    __table_args__ = (
        Index("ix_ai_messages_conversation", "conversation_id"),
        Index("ix_ai_messages_created", "created_at"),
    )
