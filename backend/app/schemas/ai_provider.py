"""Esquemas Pydantic para configuración de proveedores de IA."""

from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime


class AIProviderConfigBase(BaseModel):
    provider_name: str = Field(..., max_length=50)
    model: Optional[str] = Field(None, max_length=100)
    is_active: bool = False
    is_configured: bool = False
    connection_status: Optional[str] = None


class AIProviderConfigCreate(AIProviderConfigBase):
    pass


class AIProviderConfigUpdate(BaseModel):
    model: Optional[str] = Field(None, max_length=100)
    is_active: Optional[bool] = None
    is_configured: Optional[bool] = None
    connection_status: Optional[str] = None


class AIProviderConfigResponse(AIProviderConfigBase):
    id: int
    connection_tested_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AIProviderSetupRequest(BaseModel):
    """Solicitud para configurar un proveedor (incluye API key temporal)."""
    provider_name: str = Field(..., max_length=50)
    api_key: str = Field(..., min_length=1)
    model: Optional[str] = Field(None, max_length=100)
    is_active: bool = False


class AIProviderTestRequest(BaseModel):
    """Solicitud para probar conexión de un proveedor."""
    provider_name: str = Field(..., max_length=50)
    api_key: str = Field(..., min_length=1)
    model: Optional[str] = Field(None, max_length=100)


class AIProviderTestResponse(BaseModel):
    success: bool
    provider_name: str
    model: Optional[str] = None
    status: str  # ok, error
    message: str
    error_code: Optional[str] = None


class AIProviderListItem(BaseModel):
    """Elemento de lista para UI (sin API key)."""
    id: int
    provider_name: str
    model: Optional[str] = None
    is_active: bool
    is_configured: bool
    connection_status: Optional[str] = None
    connection_tested_at: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True


class AIModelSuggestion(BaseModel):
    """Sugerencia de modelo para un proveedor."""
    model_config = {"protected_namespaces": ()}

    provider_name: str
    model_id: str
    model_name: str


class ConversationBase(BaseModel):
    title: str = Field(default="Nueva conversación", max_length=200)
    provider_name: Optional[str] = None
    model: Optional[str] = None


class ConversationCreate(ConversationBase):
    pass


class ConversationUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=200)


class ConversationResponse(ConversationBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    message_count: int = 0

    class Config:
        from_attributes = True


class MessageBase(BaseModel):
    role: str = Field(..., max_length=20)  # user, assistant, system
    content: str


class MessageCreate(MessageBase):
    conversation_id: int


class MessageResponse(MessageBase):
    id: int
    conversation_id: int
    tokens_used: Optional[int] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ChatRequest(BaseModel):
    """Solicitud de chat al asistente IA."""
    message: str = Field(..., min_length=1, max_length=4000)
    conversation_id: Optional[int] = None
    provider_name: Optional[str] = None
    model: Optional[str] = None
    use_academic_context: bool = True


class ChatResponse(BaseModel):
    """Respuesta del asistente IA."""
    message: str
    conversation_id: int
    message_id: int
    provider_name: str
    model: str
    tokens_used: Optional[int] = None
    finish_reason: Optional[str] = None


class ToolCallRequest(BaseModel):
    """Solicitud de herramienta controlada."""
    tool: str  # get_subjects, get_tasks, get_evaluations, get_availability, get_plan, etc.
    parameters: dict = {}


class ToolCallResponse(BaseModel):
    """Respuesta de herramienta controlada."""
    tool: str
    success: bool
    data: dict = {}
    error: Optional[str] = None
