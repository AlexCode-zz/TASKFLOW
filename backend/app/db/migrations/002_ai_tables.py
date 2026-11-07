"""Migración 002: Crea tablas para el asistente de IA multi-proveedor.

Crea las tablas:
- ai_provider_configs: Configuración de proveedores (sin API keys)
- ai_conversations: Conversaciones del asistente
- ai_messages: Mensajes dentro de conversaciones

Las API keys se almacenan en un archivo local seguro, no en SQLite.
"""

from sqlalchemy.orm import Session
from sqlalchemy import text, Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Index
from sqlalchemy.sql import func

from app.db.base import Base


def up(db: Session) -> None:
    """Crea las tablas de IA si no existen."""
    # Tabla ai_provider_configs
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS ai_provider_configs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            provider_name VARCHAR(50) NOT NULL,
            model VARCHAR(100),
            is_active BOOLEAN DEFAULT 0 NOT NULL,
            is_configured BOOLEAN DEFAULT 0 NOT NULL,
            connection_tested_at TIMESTAMP,
            connection_status VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """))
    db.execute(text("CREATE INDEX IF NOT EXISTS ix_ai_provider_configs_provider ON ai_provider_configs(provider_name)"))
    db.execute(text("CREATE INDEX IF NOT EXISTS ix_ai_provider_configs_active ON ai_provider_configs(is_active)"))

    # Tabla ai_conversations
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS ai_conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title VARCHAR(200) DEFAULT 'Nueva conversación',
            provider_name VARCHAR(50),
            model VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """))
    db.execute(text("CREATE INDEX IF NOT EXISTS ix_ai_conversations_updated ON ai_conversations(updated_at)"))

    # Tabla ai_messages
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS ai_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER NOT NULL,
            role VARCHAR(20) NOT NULL,
            content TEXT NOT NULL,
            tokens_used INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE
        )
    """))
    db.execute(text("CREATE INDEX IF NOT EXISTS ix_ai_messages_conversation ON ai_messages(conversation_id)"))
    db.execute(text("CREATE INDEX IF NOT EXISTS ix_ai_messages_created ON ai_messages(created_at)"))

    db.commit()


def down(db: Session) -> None:
    """Elimina las tablas de IA."""
    db.execute(text("DROP TABLE IF EXISTS ai_messages"))
    db.execute(text("DROP TABLE IF EXISTS ai_conversations"))
    db.execute(text("DROP TABLE IF EXISTS ai_provider_configs"))
    db.commit()
