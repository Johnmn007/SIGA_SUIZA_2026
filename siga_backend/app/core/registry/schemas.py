from pydantic import BaseModel, Field, validator
from typing import Dict, List, Optional, Any
from enum import Enum
import re

class ModuleStatus(str, Enum):
    DISCOVERED = "discovered"
    REGISTERED = "registered"
    HEALTHY = "healthy"
    UNHEALTHY = "unhealthy"
    OFFLINE = "offline"

class ModuleStandard(str, Enum):
    """Versiones del estándar soportadas"""
    V1_0 = "1.0"

class ModuleManifest(BaseModel):
    """Esquema de validación para manifiestos de módulos"""
    
    name: str = Field(
        ...,
        pattern=r"^mod-[a-z0-9-]+$",
        description="Nombre debe seguir: mod-[nombre]"
    )
    
    version: str = Field(
        ...,
        pattern=r"^\d+\.\d+\.\d+$",
        description="Versión semántica: X.Y.Z"
    )
    
    api_version: str = Field(
        default="v1",
        pattern=r"^v\d+$",
        description="Versión API: v1, v2, etc"
    )
    
    description: str = Field(
        default="",
        description="Descripción del módulo"
    )
    
    endpoints: Dict[str, str] = Field(
        ...,
        description="Endpoints del módulo. Requerido: http"
    )
    
    health_check: str = Field(
        default="/health",
        description="Endpoint de health check"
    )
    
    events: Dict[str, List[str]] = Field(
        default_factory=lambda: {"publishes": [], "subscribes": []},
        description="Eventos publicados y suscritos"
    )
    
    permissions: List[str] = Field(
        default_factory=list,
        description="Permisos requeridos"
    )
    
    config: Dict[str, Any] = Field(
        default_factory=dict,
        description="Configuración adicional"
    )
    
    @validator('endpoints')
    def validate_endpoints(cls, v):
        if "http" not in v:
            raise ValueError("Endpoint HTTP es requerido")
        if not v["http"].startswith(("http://", "https://")):
            raise ValueError("Endpoint HTTP debe ser URL completa")
        return v
    
    @validator('health_check')
    def validate_health_check(cls, v):
        if not v.startswith("/"):
            raise ValueError("Health check debe comenzar con /")
        return v
    
    class Config:
        extra = "allow"
        json_schema_extra = {
            "example": {
                "name": "mod-ejemplo",
                "version": "1.0.0",
                "api_version": "v1",
                "description": "Módulo de ejemplo",
                "endpoints": {"http": "http://localhost:8000"},
                "health_check": "/health",
                "events": {"publishes": [], "subscribes": []},
                "permissions": [],
                "config": {}
            }
        }