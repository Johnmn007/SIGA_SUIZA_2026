from pydantic_settings import BaseSettings
from typing import List, Optional
from pydantic import Field

class CoreSettings(BaseSettings):
    """Configuración centralizada del Core con resiliencia"""
    
    # Core Identity
    app_name: str = "SIGA Core"
    environment: str = "development"
    secret_key: str = "change-me-in-production"
    debug: bool = True
    
    # Database (Solo para Identity del Core)
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_USER: str = "postgres"
    DB_PASSWORD: str = "postgres"
    DB_NAME: str = "siga_core"
    
    # Module Registry
    modules_auto_discover: bool = True
    modules_validate_on_start: bool = True
    modules_discovery_sources: List[str] = ["local", "database", "kubernetes"]
    
    # Communication
    http_proxy_timeout: int = 30
    
    # Security
    token_expire_minutes: int = 30
    module_token_expire_hours: int = 24
    
    # NATS Event Bus
    enable_nats: bool = Field(default=True, description="Habilitar NATS Event Bus")
    nats_url: str = Field(default="nats://localhost:4222", description="URL de NATS")
    
    # 🔄 RESILIENCIA - Configuraciones nuevas
    # Cache distribuido
    cache_enabled: bool = Field(default=True, description="Habilitar cache distribuido")
    redis_host: str = Field(default="localhost", description="Host de Redis")
    redis_port: int = Field(default=6379, description="Puerto de Redis")
    redis_password: Optional[str] = Field(default=None, description="Password de Redis")
    cache_default_ttl: int = Field(default=300, description="TTL por defecto en segundos")
    
    # Health Monitoring
    health_check_enabled: bool = Field(default=True, description="Habilitar monitoreo de salud")
    health_check_interval: int = Field(default=30, description="Intervalo de health checks en segundos")
    
    # Fallback System
    fallback_enabled: bool = Field(default=True, description="Habilitar sistema de fallback")
    
    # Circuit Breaker
    circuit_breaker_enabled: bool = Field(default=True, description="Habilitar circuit breaker")
    circuit_breaker_failure_threshold: int = Field(default=5, description="Umbral de fallos para abrir circuito")
    circuit_breaker_recovery_timeout: int = Field(default=60, description="Tiempo de recuperación en segundos")
    
    @property
    def database_url(self) -> str:
        return f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
    
    @property
    def database_sync_url(self) -> str:
        return f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    class Config:
        env_file = ".env"
        case_sensitive = False

# Instancia global
settings = CoreSettings()