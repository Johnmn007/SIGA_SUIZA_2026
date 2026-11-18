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
    
    # Database - DATABASE_URL is mandatory, no default credentials or localhost
    DATABASE_URL: str = Field(..., description="URL de base de datos PostgreSQL (ej. postgresql+asyncpg://user:pass@host:port/db)")
    DB_HOST: str = Field(default="", description="Host de base de datos (usado si DATABASE_URL no está set)")
    DB_PORT: int = Field(default=5432, description="Puerto de base de datos")
    DB_USER: str = Field(default="", description="Usuario de base de datos")
    DB_PASSWORD: str = Field(default="", description="Contraseña de base de datos")
    DB_NAME: str = Field(default="", nombre de base de datos")
    
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
    redis_url: Optional[str] = Field(default=None, description="URL completa de Redis (sobreescribe host/port)")
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
        if self.DATABASE_URL:
            url = self.DATABASE_URL
            if url.startswith("postgresql://"):
                url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
            return url
        raise ValueError("DATABASE_URL is required for database_url property")
    
    @property
    def database_sync_url(self) -> str:
        if self.DATABASE_URL:
            url = self.DATABASE_URL
            if url.startswith("postgresql+asyncpg://"):
                url = url.replace("postgresql+asyncpg://", "postgresql+psycopg2://", 1)
            elif url.startswith("postgresql://"):
                url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
            return url
        raise ValueError("DATABASE_URL is required for database_sync_url property")
    
    @property
    def redis_url_effective(self) -> str:
        """Retorna la URL efectiva de Redis: redis_url si está definida, o construida desde host/port"""
        if self.redis_url:
            return self.redis_url
        auth = f":{self.redis_password}@" if self.redis_password else ""
        return f"redis://{auth}{self.redis_host}:{self.redis_port}"
    
    class Config:
        env_file = ".env"
        case_sensitive = False

# Instancia global
settings = CoreSettings()