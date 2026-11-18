from pydantic_settings import BaseSettings
from typing import List, Optional
from pydantic import Field, validator

class CoreSettings(BaseSettings):
    """Configuración centralizada del Core con resiliencia."""
    
    # Core Identity
    app_name: str = "SIGA Core"
    environment: str = "development"
    secret_key: str = "change-me-in-production"
    debug: bool = True
    
    # Database - Single source of truth via DATABASE_URL
    DATABASE_URL: Optional[str] = None
    
    # Database fallback components (solo usadas si DATABASE_URL no está definido)
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_USER: str = "postgres"
    DB_PASSWORD: str = ""
    DB_NAME: str = "siga_suiza_2026"
    
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
    enable_nats: bool = Field(default=False, description="Habilitar NATS Event Bus")
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
    
    # CORS Configuration
    cors_origins: List[str] = Field(
        default=["http://localhost:5173", "http://127.0.0.1:5173",
                 "http://localhost:5174", "http://127.0.0.1:5174",
                 "http://localhost:3000", "http://127.0.0.1:3000",
                 "http://localhost:3001", "http://127.0.0.1:3001"],
        description="Lista de orígenes permitidos para CORS"
    )
    
    @property
    def database_url(self) -> str:
        """Retorna la URL de base de datos, preferentemente desde DATABASE_URL."""
        if self.DATABASE_URL:
            url = self.DATABASE_URL.strip()
            # Convertir postgresql:// a postgresql+asyncpg:// para asyncpg
            if url.startswith("postgresql://"):
                url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
            elif url.startswith("postgresql+asyncpg://"):
                pass  # Ya está en el formato correcto
            elif url.startswith("postgresql+psycopg2://"):
                pass  # Formato sincrono para Alembic
            # Validar que no sea localhost en producción sin DATABASE_URL explícito
            if url.startswith("postgresql+asyncpg://") or url.startswith("postgresql+psycopg2://"):
                if "localhost" in url and self.environment == "production":
                    raise ValueError(
                        "DATABASE_URL apunta a localhost en entorno production. "
                        "Configure DATABASE_URL desde Railway o ajuste DB_HOST."
                    )
                return url
            # Si la URL no es reconocida, intentar construirla
            raise ValueError(f"DATABASE_URL no tiene formato reconocido: {url[:50]}...")
        
        # DATABASE_URL no definida: solo permitir en development
        if self.environment == "production":
            raise ValueError(
                "DATABASE_URL no está configurada y el entorno es production. "
                "Configure DATABASE_URL desde el servicio PostgreSQL de Railway."
            )
        
        # Development: construir desde componentes (con warning)
        import warnings
        warnings.warn(
            "DATABASE_URL no definida - construyendo desde componentes DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME. "
            "En producción debe establecerse DATABASE_URL.",
            stacklevel=2
        )
        return f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
    
    @property
    def database_sync_url(self) -> str:
        """Retorna la URL síncrona para Alembic (psycopg2)."""
        if self.DATABASE_URL:
            url = self.DATABASE_URL.strip()
            # Convertir postgresql:// o postgresql+asyncpg:// a postgresql+psycopg2://
            if url.startswith("postgresql+asyncpg://"):
                url = url.replace("postgresql+asyncpg://", "postgresql+psycopg2://", 1)
            elif url.startswith("postgresql://"):
                url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
            elif url.startswith("postgresql+psycopg2://"):
                pass  # Ya está en formato sincrono
            else:
                raise ValueError(f"DATABASE_URL no tiene formato compatible con Alembic: {url[:50]}...")
            return url
        
        # Fallback: construir desde componentes
        return f"postgresql+psycopg2://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
    
    # Property: CORS origins from env, allow overriding
    @property
    def effective_cors_origins(self) -> List[str]:
        """Retorna los orígenes CORS efectivos, permitiendo overrides de entorno."""
        return self.cors_origins
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        # Cargar variables de Railway automáticamente
        # Las variables de Railway se mapean directamente: DATABASE_URL, ENVIRONMENT, etc.

# Instancia global - se inicializará con los valores del entorno
settings = CoreSettings()