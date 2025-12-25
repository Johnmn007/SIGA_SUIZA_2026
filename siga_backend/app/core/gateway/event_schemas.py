from pydantic import BaseModel, Field
from typing import Any, Dict, Optional
from datetime import datetime
from enum import Enum
import uuid

class EventType(str, Enum):
    """Tipos de eventos del sistema"""
    USER_CREATED = "user.created"
    USER_UPDATED = "user.updated"
    MODULE_REGISTERED = "module.registered"
    MODULE_HEALTH_CHANGED = "module.health.changed"
    CORE_STARTED = "core.started"

class BaseEvent(BaseModel):
    """Evento base para todos los eventos del sistema"""
    event_id: str = Field(..., description="ID único del evento")
    event_type: EventType = Field(..., description="Tipo de evento")
    source: str = Field(..., description="Origen del evento")
    timestamp: datetime = Field(default_factory=datetime.now)
    version: str = Field(default="1.0.0")
    
    # Datos específicos del evento
    data: Dict[str, Any] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)

class UserCreatedEvent(BaseEvent):
    """Evento emitido cuando se crea un usuario"""
    event_type: EventType = Field(default=EventType.USER_CREATED)
    data: Dict[str, Any] = Field(..., description="Datos del usuario creado")

class ModuleRegisteredEvent(BaseEvent):
    """Evento emitido cuando se registra un módulo"""
    event_type: EventType = Field(default=EventType.MODULE_REGISTERED)
    data: Dict[str, Any] = Field(..., description="Datos del módulo registrado")

class ModuleHealthChangedEvent(BaseEvent):
    """Evento emitido cuando cambia el estado de salud de un módulo"""
    event_type: EventType = Field(default=EventType.MODULE_HEALTH_CHANGED)
    data: Dict[str, Any] = Field(..., description="Estado de salud del módulo")

# Factory para crear eventos
class EventFactory:
    """Factory para crear eventos estandarizados"""
    
    @staticmethod
    def create_event(event_type: EventType, source: str, data: Dict[str, Any], 
                    metadata: Optional[Dict[str, Any]] = None) -> BaseEvent:
        """Crea un evento estandarizado"""
        import uuid
        
        return BaseEvent(
            event_id=str(uuid.uuid4()),
            event_type=event_type,
            source=source,
            data=data,
            metadata=metadata or {}
        )
    
    @staticmethod
    def user_created(user_data: Dict[str, Any]) -> UserCreatedEvent:
        """Crea evento de usuario creado"""
        return UserCreatedEvent(
            event_id=str(uuid.uuid4()),
            event_type=EventType.USER_CREATED,
            source="core-identity",
            data=user_data
        )
    
    @staticmethod
    def module_registered(module_data: Dict[str, Any]) -> ModuleRegisteredEvent:
        """Crea evento de módulo registrado"""
        return ModuleRegisteredEvent(
            event_id=str(uuid.uuid4()),
            event_type=EventType.MODULE_REGISTERED,
            source="core-registry",
            data=module_data
        )