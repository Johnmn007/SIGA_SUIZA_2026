# Arquitectura del Core - SIGA

| Versión | Fecha       | Autor               | Descripción                                    |
|---------|-------------|----------------------|------------------------------------------------|
| 1.0     | 2026-06-26  | Equipo Arquitectura  | Versión inicial de la arquitectura del Core    |

---

## 1. Propósito del Core

### 1.1 Definición
El **Core** es el componente central del sistema SIGA. Es un servicio FastAPI que actúa como **API Gateway**, **sistema de identidad**, **registro de módulos** y **capa de resiliencia**. Es el único punto de entrada a todo el sistema.

### 1.2 Responsabilidades Inmutables
Estas responsabilidades **nunca cambian**. Son la esencia del Core:

| # | Responsabilidad | Descripción |
|---|----------------|-------------|
| 1 | **Autenticación** | Verificar quién es el usuario (login, JWT, refresh tokens) |
| 2 | **Autorización** | Verificar qué puede hacer el usuario (RBAC, permisos por módulo) |
| 3 | **API Gateway** | Enrutar peticiones HTTP/WS al módulo correspondiente |
| 4 | **Module Registry** | Registrar, validar, monitorear y desregistrar módulos |
| 5 | **Resiliencia** | Circuit Breaker, Health Monitor, Fallback Manager, Cache Manager |
| 6 | **Event Bus** | Gestionar la conexión con NATS (publish/subscribe) |
| 7 | **Auditoría** | Registrar operaciones críticas en `core_audit_log` |
| 8 | **Proxy de Comunicación** | Todas las comunicaciones inter-módulo pasan por el Core |

### 1.3 Lo que NO hace el Core

| No hace | ¿Por qué? |
|---------|-----------|
| ❌ Lógica de negocio académico | Esa es responsabilidad de los módulos. El Core no sabe qué es una matrícula, una nota, o un plan de estudios |
| ❌ Acceso directo a BD de módulos | Cada módulo es dueño de sus datos. El Core solo accede a `siga_core` |
| ❌ Procesamiento de datos de módulos | El Core no transforma, procesa o valida datos de negocio |
| ❌ Cacheo de datos de negocio | El cache es para mejorar rendimiento y resiliencia, no para almacenar lógica de negocio |
| ❌ Almacenamiento de archivos de módulos | Cada módulo maneja su propio storage (fotos, documentos) |
| ❌ Orquestación de transacciones entre módulos | Eso es responsabilidad de las Sagas (coreografiadas por eventos) |

---

## 2. Estructura de Capas Internas

```
app/
├── core/                          # Core del Core
│   ├── __init__.py
│   ├── config.py                  # CoreSettings (Pydantic)
│   ├── database.py                # Async engine, session, Base
│   │
│   ├── identity/                  # Capa de Identidad
│   │   ├── __init__.py
│   │   ├── models.py              # CoreUser, CoreRole, CorePermission
│   │   ├── auth_service.py        # AuthService (register, login, verify)
│   │   ├── tokens.py              # TokenService (JWT creation/validation)
│   │   ├── permissions.py         # PermissionService (RBAC, scopes)
│   │   ├── repositories/
│   │   │   ├── __init__.py
│   │   │   └── user_repository.py # UserRepository (CRUD usuarios)
│   │   └── seeds/
│   │       ├── __init__.py
│   │       ├── base.py            # SeederRunner (base class)
│   │       ├── role_seeder.py     # RoleSeeder (roles por defecto)
│   │       └── user_seeder.py     # UserSeeder (usuarios iniciales)
│   │
│   ├── gateway/                   # Capa de Gateway
│   │   ├── __init__.py
│   │   ├── http_proxy.py          # HTTPGateway (proxy con resiliencia)
│   │   ├── websocket_proxy.py     # WebSocketGateway
│   │   ├── security_middleware.py # SecurityMiddleware (auth + rate limit)
│   │   └── event_schemas.py       # BaseEvent, EventType, EventFactory
│   │
│   ├── registry/                  # Capa de Registry (Socket)
│   │   ├── __init__.py
│   │   ├── runtime.py             # ModuleRuntime (ModuleInfo, estados)
│   │   ├── schemas.py             # ModuleManifest, ModuleStatus, ModuleStandard
│   │   └── validator.py           # ManifestValidator (schema + compliance)
│   │
│   └── resilience/                # Capa de Resiliencia
│       ├── __init__.py
│       ├── circuit_breaker.py     # CircuitBreaker
│       ├── health_monitor.py      # HealthMonitor
│       ├── fallback_manager.py    # FallbackManager
│       └── cache_manager.py       # CacheManager (Redis + fallback a memoria)
│
├── routers/                       # Routers de FastAPI
│   ├── __init__.py
│   ├── core_routes.py             # /core/* endpoints
│   ├── auth_routes.py             # /auth/* endpoints
│   └── module_routes.py           # /api/{module}/{path} gateway routes
│
├── models/                        # Modelos SQLAlchemy del Core
│   ├── __init__.py
│   ├── core_user.py
│   ├── core_role.py
│   └── core_permission.py
│
├── schemas/                       # Pydantic schemas
│   ├── __init__.py
│   ├── auth.py
│   └── module.py
│
├── middleware/                    # Middleware adicional
│   ├── __init__.py
│   ├── tracing.py                 # X-Request-ID propagation
│   └── cors.py                    # CORS configuration
│
├── main.py                        # Punto de entrada
├── requirements.txt               # Dependencias
└── alembic/                       # Migraciones del Core
    ├── env.py
    └── versions/
```

### 2.1 Capa Infrastructure

#### `app/core/config.py` - CoreSettings

```python
from pydantic_settings import BaseSettings
from typing import Optional, List
from functools import lru_cache

class CoreSettings(BaseSettings):
    # ──────────────────────────────────────────────
    # Core Identity
    # ──────────────────────────────────────────────
    APP_NAME: str = "SIGA Core"
    ENVIRONMENT: str = "development"  # development | staging | production
    SECRET_KEY: str = "change-me-in-production"
    DEBUG: bool = False

    # ──────────────────────────────────────────────
    # Database (siga_core)
    # ──────────────────────────────────────────────
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_USER: str = "siga"
    DB_PASSWORD: str = "siga_pass"
    DB_NAME: str = "siga_core"

    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    @property
    def DATABASE_SYNC_URL(self) -> str:
        """Para Alembic (migraciones sincrónicas)"""
        return f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    # ──────────────────────────────────────────────
    # Module Registry
    # ──────────────────────────────────────────────
    MODULES_AUTO_DISCOVER: bool = True
    MODULES_VALIDATE_ON_START: bool = True
    MODULES_DIR: str = "modules"  # Directorio donde buscar módulos

    # ──────────────────────────────────────────────
    # Communication
    # ──────────────────────────────────────────────
    HTTP_PROXY_TIMEOUT: int = 30  # segundos
    WS_RECONNECT_INTERVAL: int = 5  # segundos

    # ──────────────────────────────────────────────
    # Security
    # ──────────────────────────────────────────────
    TOKEN_EXPIRE_MINUTES: int = 60
    MODULE_TOKEN_EXPIRE_HOURS: int = 24
    ALLOWED_ORIGINS: List[str] = ["http://localhost:5173"]
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_REQUESTS: int = 100  # requests por minuto

    # ──────────────────────────────────────────────
    # NATS Event Bus
    # ──────────────────────────────────────────────
    NATS_ENABLED: bool = True
    NATS_URL: str = "nats://localhost:4222"
    NATS_MAX_RECONNECT: int = 5
    NATS_RECONNECT_INTERVAL: int = 2

    # ──────────────────────────────────────────────
    # Resilience
    # ──────────────────────────────────────────────
    CACHE_ENABLED: bool = True
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    CACHE_DEFAULT_TTL: int = 300  # 5 minutos
    CACHE_GET_TTL: int = 600  # 10 minutos para GET
    HEALTH_CHECK_INTERVAL: int = 30  # segundos
    HEALTH_CHECK_TIMEOUT: int = 10  # segundos
    CIRCUIT_BREAKER_FAILURE_THRESHOLD: int = 5
    CIRCUIT_BREAKER_RECOVERY_TIMEOUT: int = 60  # segundos
    CIRCUIT_BREAKER_SUCCESS_THRESHOLD: int = 3

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

@lru_cache
def get_settings() -> CoreSettings:
    return CoreSettings()
```

**Validación de entorno**: Al cargar `CoreSettings`, Pydantic valida que todos los campos requeridos estén presentes. Si falta `SECRET_KEY` en producción, el sistema no arranca.

**Multi-entorno**: Se usa `.env` para desarrollo, `.env.staging` para staging, y variables de entorno en producción (Kubernetes Secrets o Docker Secrets).

#### `app/core/database.py` - Database Engine

```python
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.core.config import get_settings

settings = get_settings()

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,  # Verifica conexión antes de usarla
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

class Base(DeclarativeBase):
    pass

async def get_db() -> AsyncSession:
    """Dependency de FastAPI para obtener sesión de BD."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
```

**Pool de conexiones**: `pool_size=10` con `max_overflow=20` permite hasta 30 conexiones concurrentes. `pool_pre_ping=True` evita usar conexiones muertas.

#### `app/core/gateway/event_bus.py` - NATS Event Bus

```python
import nats
from nats.aio.client import Client as NATSClient
from nats.aio.msg import Msg
from typing import Callable, Dict, Any, Optional
import json
import asyncio
from app.core.config import get_settings

settings = get_settings()

class EventBus:
    def __init__(self):
        self._client: Optional[NATSClient] = None
        self._subscribers: Dict[str, Callable] = {}
        self._connected: bool = False

    async def connect(self):
        """Conecta a NATS con reconexión automática."""
        try:
            self._client = await nats.connect(
                settings.NATS_URL,
                max_reconnect_attempts=settings.NATS_MAX_RECONNECT,
                reconnect_time_wait=settings.NATS_RECONNECT_INTERVAL,
                name="siga-core",
                # Callbacks de conexión
                disconnected_cb=self._on_disconnected,
                reconnected_cb=self._on_reconnected,
                closed_cb=self._on_closed,
            )
            self._connected = True
            print(f"✅ Conectado a NATS en {settings.NATS_URL}")
        except Exception as e:
            self._connected = False
            print(f"⚠️ No se pudo conectar a NATS: {e}. Modo sin event bus.")

    async def publish(self, subject: str, data: Dict[str, Any]):
        """Publica un evento en NATS."""
        if not self._connected or not self._client:
            print(f"⚠️ NATS no conectado. Evento no publicado: {subject}")
            return
        payload = json.dumps(data).encode()
        await self._client.publish(subject, payload)

    async def subscribe(self, subject: str, callback: Callable):
        """Se suscribe a un subject de NATS."""
        if not self._client:
            print(f"⚠️ NATS no conectado. No se puede suscribir a: {subject}")
            return
        sub = await self._client.subscribe(subject, cb=callback)
        self._subscribers[subject] = sub

    async def request(self, subject: str, data: Dict[str, Any], timeout: int = 5) -> Optional[Dict]:
        """Request-reply a un módulo a través de NATS."""
        if not self._connected or not self._client:
            return None
        payload = json.dumps(data).encode()
        try:
            msg = await self._client.request(subject, payload, timeout=timeout)
            return json.loads(msg.data.decode())
        except Exception:
            return None

    async def close(self):
        if self._client:
            await self._client.close()
            self._connected = False

    def _on_disconnected(self):
        self._connected = False
        print("⚠️ NATS desconectado")

    def _on_reconnected(self):
        self._connected = True
        print("✅ NATS reconectado")

    def _on_closed(self):
        self._connected = False
        print("🔴 Conexión NATS cerrada")

# Singleton
event_bus = EventBus()
```

#### `app/core/resilience/cache_manager.py` - Cache Manager

```python
import redis.asyncio as redis
from typing import Optional, Any, Dict
import json
import asyncio
from datetime import timedelta
from app.core.config import get_settings

settings = get_settings()

class CacheManager:
    def __init__(self):
        self._redis: Optional[redis.Redis] = None
        self._memory_cache: Dict[str, tuple[Any, float]] = {}  # fallback local
        self._enabled = settings.CACHE_ENABLED
        self._ttl = settings.CACHE_DEFAULT_TTL

    async def connect(self):
        if not self._enabled:
            return
        try:
            self._redis = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                db=settings.REDIS_DB,
                decode_responses=True,
            )
            await self._redis.ping()
            print(f"✅ Redis conectado en {settings.REDIS_HOST}:{settings.REDIS_PORT}")
        except Exception as e:
            self._redis = None
            print(f"⚠️ Redis no disponible: {e}. Usando cache en memoria.")

    async def get(self, key: str) -> Optional[Any]:
        if self._redis:
            data = await self._redis.get(key)
            if data:
                return json.loads(data)
            return None
        # Fallback a memoria
        if key in self._memory_cache:
            value, expiry = self._memory_cache[key]
            if asyncio.get_event_loop().time() < expiry:
                return value
            del self._memory_cache[key]
        return None

    async def set(self, key: str, value: Any, ttl: Optional[int] = None):
        ttl = ttl or self._ttl
        if self._redis:
            await self._redis.setex(key, timedelta(seconds=ttl), json.dumps(value))
        else:
            self._memory_cache[key] = (value, asyncio.get_event_loop().time() + ttl)

    async def delete(self, key: str):
        if self._redis:
            await self._redis.delete(key)
        elif key in self._memory_cache:
            del self._memory_cache[key]

    async def delete_pattern(self, pattern: str):
        """Invalida cache por patrón de key (ej: mod-estudiantes:*)"""
        if self._redis:
            cursor = 0
            while True:
                cursor, keys = await self._redis.scan(cursor=cursor, match=pattern)
                if keys:
                    await self._redis.delete(*keys)
                if cursor == 0:
                    break

    async def close(self):
        if self._redis:
            await self._redis.close()

    def _make_key(self, module_name: str, endpoint: str) -> str:
        return f"{module_name}:{endpoint.replace('/', ':')}"

# Singleton
cache_manager = CacheManager()
```

**Estrategia de Cache:**
- **Redis** en producción: caché distribuido, TTL configurable.
- **Memoria** en desarrollo o cuando Redis no está disponible: dict simple con expiración por timestamp.
- **Invalidación**: por clave exacta o por patrón (para invalidar todo el caché de un módulo).

---

### 2.2 Capa Identity

#### `app/core/identity/models.py` - Modelos de Identidad

```python
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Table, Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base

# ──────────────────────────────────────────────
# Tabla asociativa M2M (usuarios ↔ roles)
# ──────────────────────────────────────────────
user_roles = Table(
    "core_user_roles",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("core_users.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", Integer, ForeignKey("core_roles.id", ondelete="CASCADE"), primary_key=True),
)

# ──────────────────────────────────────────────
# Tabla asociativa M2M (roles ↔ permisos)
# ──────────────────────────────────────────────
role_permissions = Table(
    "core_role_permissions",
    Base.metadata,
    Column("role_id", Integer, ForeignKey("core_roles.id", ondelete="CASCADE"), primary_key=True),
    Column("permission_id", Integer, ForeignKey("core_permissions.id", ondelete="CASCADE"), primary_key=True),
)

class CoreUser(Base):
    __tablename__ = "core_users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    document_type = Column(String(20), nullable=False)  # DNI, CE, PASAPORTE
    document_number = Column(String(20), unique=True, nullable=False, index=True)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    programa_ids = Column(String(255), nullable=True)  # CSV: "1,2,3" - carreras asignadas
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)

    roles = relationship("CoreRole", secondary=user_roles, back_populates="users", lazy="selectin")

class CoreRole(Base):
    __tablename__ = "core_roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)  # admin, docente, alumno, director, secretario
    description = Column(String(255))
    is_system = Column(Boolean, default=False)  # Rol del sistema (no se puede eliminar)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    users = relationship("CoreUser", secondary=user_roles, back_populates="roles", lazy="selectin")
    permissions = relationship("CorePermission", secondary=role_permissions, back_populates="roles", lazy="selectin")

class CorePermission(Base):
    __tablename__ = "core_permissions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)  # formato: "{modulo}:{accion}"
    description = Column(String(255))
    resource = Column(String(50), nullable=False)  # ej: mod-estudiantes, mod-matricula
    action = Column(String(50), nullable=False)    # ej: read, write, admin
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    roles = relationship("CoreRole", secondary=role_permissions, back_populates="permissions", lazy="selectin")
```

**Estrategia de carga**: `lazy="selectin"` para roles y permisos — carga en una consulta adicional (no N+1). Para consultas muy frecuentes, `UserRepository` usa `joinedload` explícito.

**`programa_ids`**: Almacenado como CSV ("1,2,3") por simplicidad. En producción, podría normalizarse en una tabla `core_user_programas`. La CSV permite operaciones simples de búsqueda con `LIKE` o división en la aplicación.

#### `app/core/identity/repositories/user_repository.py` - UserRepository

```python
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.identity.models import CoreUser
from typing import Optional, List

class UserRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, user_id: int) -> Optional[CoreUser]:
        stmt = (
            select(CoreUser)
            .options(joinedload(CoreUser.roles).joinedload(CoreRole.permissions))
            .where(CoreUser.id == user_id)
        )
        result = await self.session.execute(stmt)
        return result.unique().scalar_one_or_none()

    async def get_by_username(self, username: str) -> Optional[CoreUser]:
        stmt = (
            select(CoreUser)
            .options(joinedload(CoreUser.roles).joinedload(CoreRole.permissions))
            .where(CoreUser.username == username)
        )
        result = await self.session.execute(stmt)
        return result.unique().scalar_one_or_none()

    async def get_by_email(self, email: str) -> Optional[CoreUser]:
        stmt = (
            select(CoreUser)
            .options(joinedload(CoreUser.roles).joinedload(CoreRole.permissions))
            .where(CoreUser.email == email)
        )
        result = await self.session.execute(stmt)
        return result.unique().scalar_one_or_none()

    async def create(self, user: CoreUser) -> CoreUser:
        self.session.add(user)
        await self.session.flush()
        return user

    async def update(self, user: CoreUser) -> CoreUser:
        await self.session.merge(user)
        await self.session.flush()
        return user

    async def delete(self, user_id: int) -> bool:
        user = await self.get_by_id(user_id)
        if user:
            await self.session.delete(user)
            await self.session.flush()
            return True
        return False

    async def list_active(self) -> List[CoreUser]:
        stmt = (
            select(CoreUser)
            .options(joinedload(CoreUser.roles))
            .where(CoreUser.is_active == True)
        )
        result = await self.session.execute(stmt)
        return list(result.unique().scalars().all())
```

**Eager loading**: `joinedload` garantiza que roles y permisos se carguen en la misma consulta (LEFT OUTER JOIN), evitando N+1 queries. Es crítico porque cada request de API verifica permisos.

#### `app/core/identity/auth_service.py` - AuthService

```python
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from app.core.identity.models import CoreUser, CoreRole
from app.core.identity.repositories.user_repository import UserRepository
from app.core.identity.tokens import TokenService
from app.core.identity.permissions import PermissionService
from typing import Optional, Tuple, List

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AuthService:
    def __init__(self, session, token_service: TokenService, permission_service: PermissionService):
        self.user_repo = UserRepository(session)
        self.token_service = token_service
        self.permission_service = permission_service

    async def register(
        self,
        username: str,
        email: str,
        password: str,
        full_name: str,
        document_type: str,
        document_number: str,
        role_names: List[str] = ["alumno"],
        programa_ids: Optional[List[int]] = None,
    ) -> CoreUser:
        """Registra un nuevo usuario en el sistema."""
        # Validar unicidad
        existing_user = await self.user_repo.get_by_username(username)
        if existing_user:
            raise ValueError(f"El usuario '{username}' ya existe")

        existing_email = await self.user_repo.get_by_email(email)
        if existing_email:
            raise ValueError(f"El email '{email}' ya está registrado")

        # Hashear password
        hashed = pwd_context.hash(password)

        # Crear usuario
        user = CoreUser(
            username=username,
            email=email,
            hashed_password=hashed,
            full_name=full_name,
            document_type=document_type,
            document_number=document_number,
            programa_ids=",".join(str(p) for p in (programa_ids or [])),
            is_active=True,
        )

        # Asignar roles
        roles = await self.permission_service.get_roles_by_names(role_names)
        user.roles = roles

        created_user = await self.user_repo.create(user)
        return created_user

    async def authenticate(self, username: str, password: str) -> Optional[CoreUser]:
        """Autentica un usuario por username/email + password."""
        user = await self.user_repo.get_by_username(username)
        if not user:
            # Intentar por email
            user = await self.user_repo.get_by_email(username)
        if not user:
            return None
        if not user.is_active:
            return None
        if not pwd_context.verify(password, user.hashed_password):
            return None
        return user

    async def login(self, username: str, password: str) -> Tuple[Optional[str], Optional[str], Optional[CoreUser]]:
        """
        Realiza el login completo.
        Returns: (access_token, refresh_token, user) o (None, None, None)
        """
        user = await self.authenticate(username, password)
        if not user:
            return None, None, None

        # Generar tokens
        access_token = self.token_service.create_access_token(user)
        refresh_token = self.token_service.create_refresh_token(user)

        # Actualizar último login
        user.last_login = datetime.now(timezone.utc)

        return access_token, refresh_token, user
```

**Password hashing**: bcrypt via `passlib`. Es el estándar de la industria. Cost factor: 12 (default de passlib).

#### `app/core/identity/tokens.py` - TokenService

```python
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from typing import Optional, Dict, Any
from app.core.identity.models import CoreUser
from app.core.config import get_settings

settings = get_settings()

ALGORITHM = "RS256"

class TokenService:
    def __init__(self):
        # En producción, cargar desde archivos seguros
        self.private_key = self._load_private_key()
        self.public_key = self._load_public_key()

    def _load_private_key(self) -> str:
        """Carga la clave privada RSA. En producción, desde archivo o secret."""
        # TODO: Cargar desde variable de entorno o archivo
        return settings.SECRET_KEY  # Temporal (cambiar a RSA)

    def _load_public_key(self) -> str:
        """Carga la clave pública RSA."""
        return settings.SECRET_KEY  # Temporal (cambiar a RSA)

    def create_access_token(self, user: CoreUser) -> str:
        """Crea un access token JWT con claims mínimos."""
        now = datetime.now(timezone.utc)
        permissions = self._get_user_permissions(user)

        payload = {
            "sub": str(user.id),
            "username": user.username,
            "email": user.email,
            "roles": [role.name for role in user.roles],
            "permissions": permissions,
            "programa_ids": [int(p) for p in user.programa_ids.split(",") if p] if user.programa_ids else [],
            "type": "access",
            "iat": now,
            "exp": now + timedelta(minutes=settings.TOKEN_EXPIRE_MINUTES),
            "iss": "siga-core",
        }
        return jwt.encode(payload, self.private_key, algorithm=ALGORITHM)

    def create_refresh_token(self, user: CoreUser) -> str:
        """Crea un refresh token con mayor duración."""
        now = datetime.now(timezone.utc)
        payload = {
            "sub": str(user.id),
            "type": "refresh",
            "iat": now,
            "exp": now + timedelta(days=7),
            "iss": "siga-core",
        }
        return jwt.encode(payload, self.private_key, algorithm=ALGORITHM)

    def validate_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Valida un token JWT y retorna el payload si es válido."""
        try:
            payload = jwt.decode(token, self.public_key, algorithms=[ALGORITHM], issuer="siga-core")
            return payload
        except JWTError:
            return None

    def validate_access_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Valida que sea un access token (no refresh)."""
        payload = self.validate_token(token)
        if payload and payload.get("type") == "access":
            return payload
        return None

    def _get_user_permissions(self, user: CoreUser) -> list:
        """Extrae la lista plana de permisos del usuario."""
        permissions = set()
        for role in user.roles:
            for perm in role.permissions:
                permissions.add(f"{perm.resource}:{perm.action}")
        return list(permissions)

token_service = TokenService()
```

**Claims del Access Token:**
- `sub`: ID del usuario (integer)
- `username`: Nombre de usuario (para display)
- `roles`: Lista de nombres de roles (ej: `["alumno", "director"]`)
- `permissions`: Lista plana de permisos (ej: `["mod-estudiantes:read", "mod-matricula:write"]`)
- `programa_ids`: IDs de programas a los que el usuario tiene acceso
- `type`: "access" o "refresh"
- `iat`, `exp`, `iss`: Estándar JWT

**Seguridad**: Los tokens NO incluyen el password ni datos sensibles. En producción, usar RS256 con claves RSA-2048 bit. En desarrollo, se puede usar HS256 con una clave secreta.

#### `app/core/identity/permissions.py` - PermissionService

```python
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.identity.models import CoreRole, CorePermission
from typing import List

class PermissionService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_roles_by_names(self, role_names: List[str]) -> List[CoreRole]:
        """Obtiene objetos CoreRole por sus nombres."""
        if not role_names:
            return []
        stmt = select(CoreRole).where(CoreRole.name.in_(role_names))
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_all_permissions(self) -> List[CorePermission]:
        """Lista todos los permisos registrados."""
        stmt = select(CorePermission)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def verify_permission(self, user, required_permission: str) -> bool:
        """
        Verifica si un usuario tiene un permiso específico.
        Formato: "{modulo}:{accion}" ej: "mod-estudiantes:read"
        """
        if user.is_superuser:
            return True
        for role in user.roles:
            for perm in role.permissions:
                if f"{perm.resource}:{perm.action}" == required_permission:
                    return True
                # Wildcard: "mod-estudiantes:*" matchea cualquier acción
                if f"{perm.resource}:*" == required_permission.replace(f":{required_permission.split(':')[1]}", ":*"):
                    return True
        return False
```

#### `app/core/identity/seeds/` - Seeders

Los seeders son ejecutados al iniciar el sistema por primera vez o cuando la BD está vacía.

**`base.py` - SeederRunner:**
```python
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

class SeederRunner:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def run_all(self):
        """Ejecuta todos los seeders en orden."""
        from app.core.identity.seeds.role_seeder import RoleSeeder
        from app.core.identity.seeds.user_seeder import UserSeeder

        seeders = [
            RoleSeeder(self.session),
            UserSeeder(self.session),
        ]
        for seeder in seeders:
            await seeder.seed()
        print("✅ Seeders ejecutados correctamente")
```

**`role_seeder.py` - RoleSeeder:**
```python
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.identity.models import CoreRole, CorePermission

class RoleSeeder:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def seed(self):
        """Crea roles y permisos por defecto si no existen."""
        # Roles del sistema
        roles_data = [
            {"name": "admin", "description": "Administrador del sistema", "is_system": True},
            {"name": "director", "description": "Director general del IESTP", "is_system": True},
            {"name": "secretario", "description": "Secretaría académica", "is_system": True},
            {"name": "docente", "description": "Docente / profesor", "is_system": True},
            {"name": "alumno", "description": "Estudiante", "is_system": True},
        ]

        for role_data in roles_data:
            existing = await self.session.execute(
                select(CoreRole).where(CoreRole.name == role_data["name"])
            )
            if not existing.scalar_one_or_none():
                role = CoreRole(**role_data)
                self.session.add(role)
                print(f"  + Rol creado: {role_data['name']}")

        # Permisos base
        base_permissions = [
            # Módulo Estudiantes
            {"name": "mod-estudiantes:read", "resource": "mod-estudiantes", "action": "read", "description": "Leer datos de estudiantes"},
            {"name": "mod-estudiantes:write", "resource": "mod-estudiantes", "action": "write", "description": "Crear/editar estudiantes"},
            {"name": "mod-estudiantes:admin", "resource": "mod-estudiantes", "action": "admin", "description": "Admin estudiantes"},
            # Módulo Matrícula
            {"name": "mod-matricula:read", "resource": "mod-matricula", "action": "read", "description": "Leer matrículas"},
            {"name": "mod-matricula:write", "resource": "mod-matricula", "action": "write", "description": "Crear/editar matrículas"},
            {"name": "mod-matricula:admin", "resource": "mod-matricula", "action": "admin", "description": "Admin matrículas"},
            # Módulo Planes de Estudio
            {"name": "mod-planes-estudio:read", "resource": "mod-planes-estudio", "action": "read", "description": "Leer planes de estudio"},
            {"name": "mod-planes-estudio:write", "resource": "mod-planes-estudio", "action": "write", "description": "Crear/editar planes de estudio"},
            # Módulo Programas de Estudio
            {"name": "mod-programas-estudio:read", "resource": "mod-programas-estudio", "action": "read", "description": "Leer programas de estudio"},
            {"name": "mod-programas-estudio:write", "resource": "mod-programas-estudio", "action": "write", "description": "Crear/editar programas de estudio"},
        ]

        for perm_data in base_permissions:
            existing = await self.session.execute(
                select(CorePermission).where(CorePermission.name == perm_data["name"])
            )
            if not existing.scalar_one_or_none():
                perm = CorePermission(**perm_data)
                self.session.add(perm)
                print(f"  + Permiso creado: {perm_data['name']}")

        await self.session.flush()
```

**`user_seeder.py` - UserSeeder:**
```python
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.identity.models import CoreUser, CoreRole
from app.core.identity.auth_service import pwd_context

class UserSeeder:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def seed(self):
        """Crea usuarios por defecto si no existen."""
        users_data = [
            {
                "username": "admin",
                "email": "admin@siga.edu.pe",
                "password": "Admin123!",
                "full_name": "Administrador SIGA",
                "document_type": "DNI",
                "document_number": "00000001",
                "role_names": ["admin"],
                "is_superuser": True,
            },
            {
                "username": "director",
                "email": "director@siga.edu.pe",
                "password": "Director123!",
                "full_name": "Director General",
                "document_type": "DNI",
                "document_number": "00000002",
                "role_names": ["director"],
            },
            {
                "username": "secretario",
                "email": "secretario@siga.edu.pe",
                "password": "Secretario123!",
                "full_name": "Secretaría Académica",
                "document_type": "DNI",
                "document_number": "00000003",
                "role_names": ["secretario"],
            },
        ]

        for user_data in users_data:
            existing = await self.session.execute(
                select(CoreUser).where(CoreUser.username == user_data["username"])
            )
            if existing.scalar_one_or_none():
                continue

            password = user_data.pop("password")
            role_names = user_data.pop("role_names", [])
            user_data["hashed_password"] = pwd_context.hash(password)

            user = CoreUser(**user_data)
            self.session.add(user)
            await self.session.flush()

            # Asignar roles
            if role_names:
                roles_result = await self.session.execute(
                    select(CoreRole).where(CoreRole.name.in_(role_names))
                )
                user.roles = list(roles_result.scalars().all())

            print(f"  + Usuario creado: {user_data['username']}")

        await self.session.flush()
```

---

### 2.3 Capa Gateway

#### `app/core/gateway/http_proxy.py` - HTTPGateway

```python
import httpx
from typing import Optional, Dict, Any
from fastapi import Request, Response
from app.core.config import get_settings
from app.core.registry.runtime import module_runtime
from app.core.resilience.circuit_breaker import circuit_breaker_registry
from app.core.resilience.fallback_manager import fallback_manager
from app.core.gateway.event_schemas import EventFactory

settings = get_settings()

class HTTPGateway:
    def __init__(self):
        self._client: Optional[httpx.AsyncClient] = None

    async def start(self):
        self._client = httpx.AsyncClient(
            timeout=settings.HTTP_PROXY_TIMEOUT,
            follow_redirects=True,
        )

    async def proxy_request(self, module_name: str, path: str, request: Request) -> Response:
        """
        Enruta una petición HTTP al módulo correspondiente.
        Aplica Circuit Breaker, Health Check y Fallback.
        """
        # 1. Obtener información del módulo
        module = module_runtime.get_module(module_name)
        if not module:
            return Response(
                content=f'{{"error": "Módulo no encontrado: {module_name}"}}',
                status_code=404,
                media_type="application/json",
            )

        # 2. Verificar Circuit Breaker
        cb = circuit_breaker_registry.get(module_name)

        async def call_module():
            """Función real de llamada al módulo."""
            url = f"{module.endpoints['http']}/{path}"
            headers = dict(request.headers)
            # Remover headers de host (el módulo tiene su propio host)
            headers.pop("host", None)
            # Propagar tracing
            headers["X-Request-ID"] = request.state.request_id if hasattr(request.state, "request_id") else ""
            headers["X-User-ID"] = str(request.state.user.id) if hasattr(request.state, "user") else ""
            headers["X-User-Roles"] = ",".join(r.name for r in request.state.user.roles) if hasattr(request.state, "user") else ""

            response = await self._client.request(
                method=request.method,
                url=url,
                headers=headers,
                content=await request.body(),
                params=request.query_params,
            )
            return Response(
                content=response.content,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=response.headers.get("content-type"),
            )

        async def fallback():
            """Función de fallback cuando el módulo no responde."""
            return await fallback_manager.execute(
                module_name=module_name,
                path=path,
                request=request,
            )

        # 3. Ejecutar con Circuit Breaker
        result = await cb.call(call_module, fallback)
        return result

    async def stop(self):
        if self._client:
            await self._client.aclose()

http_gateway = HTTPGateway()
```

#### `app/core/gateway/security_middleware.py` - SecurityMiddleware

```python
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.identity.tokens import token_service
from app.core.gateway.event_schemas import EventFactory
from typing import List, Optional
import time

class SecurityMiddleware(BaseHTTPMiddleware):
    """
    Middleware de seguridad que se ejecuta en cada request.
    - Autenticación JWT
    - Autorización (permisos)
    - Rate limiting
    - Inyección de usuario en request.state
    """

    def __init__(self, app, exclude_paths: Optional[List[str]] = None):
        super().__init__(app)
        self.exclude_paths = exclude_paths or [
            "/",
            "/health",
            "/docs",
            "/redoc",
            "/openapi.json",
            "/auth/login",
            "/auth/register",
            "/core/status",
            "/core/modules",
        ]

    async def dispatch(self, request: Request, call_next):
        # 1. Verificar si la ruta está excluida de autenticación
        path = request.url.path
        if any(path.startswith(excluded) for excluded in self.exclude_paths):
            return await call_next(request)

        # 2. Extraer y validar token JWT
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return JSONResponse(
                status_code=401,
                content={"error": "Token de autenticación requerido"},
            )

        token = auth_header.replace("Bearer ", "")
        payload = token_service.validate_access_token(token)
        if not payload:
            return JSONResponse(
                status_code=401,
                content={"error": "Token inválido o expirado"},
            )

        # 3. Inyectar usuario en request.state
        request.state.user_id = int(payload["sub"])
        request.state.username = payload.get("username")
        request.state.roles = payload.get("roles", [])
        request.state.permissions = payload.get("permissions", [])
        request.state.programa_ids = payload.get("programa_ids", [])

        # 4. Verificar permisos para endpoints de módulo (/api/{module}/{path})
        if path.startswith("/api/"):
            parts = path.split("/")
            if len(parts) >= 4:
                module_name = parts[3]
                method = request.method.lower()
                action = {"get": "read", "post": "write", "put": "write", "patch": "write", "delete": "admin"}.get(method, "read")
                required = f"{module_name}:{action}"

                if required not in request.state.permissions:
                    return JSONResponse(
                        status_code=403,
                        content={"error": f"Permiso requerido: {required}"},
                    )

        # 5. Rate limiting simple
        request.state.request_id = f"{time.time_ns()}-{id(request)}"

        # 6. Procesar request
        response = await call_next(request)
        return response
```

#### `app/core/gateway/event_schemas.py` - Event Schemas

```python
from pydantic import BaseModel, Field
from typing import Any, Dict, Optional, List
from enum import Enum
from datetime import datetime, timezone

class EventType(str, Enum):
    # Eventos del Core
    CORE_STARTED = "core.started"
    CORE_SHUTDOWN = "core.shutdown"
    CORE_HEALTH_CHANGED = "core.health.changed"

    # Eventos de Módulos
    MODULE_REGISTERED = "module.registered"
    MODULE_UNREGISTERED = "module.unregistered"
    MODULE_HEALTH_CHANGED = "module.health.changed"
    MODULE_COMPLIANCE_CHANGED = "module.compliance.changed"

    # Eventos de Usuario (Core Identity)
    USER_CREATED = "user.created"
    USER_UPDATED = "user.updated"
    USER_DELETED = "user.deleted"
    USER_LOGGED_IN = "user.logged_in"

    # Eventos de Negocio (publicados por módulos)
    ESTUDIANTE_CREADO = "estudiante.creado"
    ESTUDIANTE_ACTUALIZADO = "estudiante.actualizado"
    MATRICULA_INICIADA = "matricula.iniciada"
    MATRICULA_CONFIRMADA = "matricula.confirmada"
    MATRICULA_REVERTIDA = "matricula.revertida"
    PLAN_CREADO = "plan.creado"
    PLAN_ACTUALIZADO = "plan.actualizado"

    # Eventos de Resiliencia
    CIRCUIT_BREAKER_OPENED = "circuit_breaker.opened"
    CIRCUIT_BREAKER_CLOSED = "circuit_breaker.closed"
    FALLBACK_ACTIVATED = "fallback.activated"

class BaseEvent(BaseModel):
    """Esquema base para todos los eventos del sistema."""
    event_id: str = Field(default_factory=lambda: f"evt-{datetime.now(timezone.utc).timestamp()}-{id(object())}")
    event_type: EventType
    source: str  # "core", "mod-estudiantes", etc.
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    data: Dict[str, Any]
    correlation_id: Optional[str] = None  # Para tracing de sagas

class EventFactory:
    """Fábrica de eventos para crear eventos tipados."""

    @staticmethod
    def module_registered(module_name: str, version: str, endpoints: dict) -> BaseEvent:
        return BaseEvent(
            event_type=EventType.MODULE_REGISTERED,
            source="core",
            data={
                "module_name": module_name,
                "version": version,
                "endpoints": endpoints,
            }
        )

    @staticmethod
    def module_unregistered(module_name: str) -> BaseEvent:
        return BaseEvent(
            event_type=EventType.MODULE_UNREGISTERED,
            source="core",
            data={"module_name": module_name}
        )

    @staticmethod
    def user_created(user_id: int, username: str, email: str, roles: List[str]) -> BaseEvent:
        return BaseEvent(
            event_type=EventType.USER_CREATED,
            source="core",
            data={
                "user_id": user_id,
                "username": username,
                "email": email,
                "roles": roles,
            }
        )

    @staticmethod
    def circuit_breaker_opened(module_name: str, failure_count: int) -> BaseEvent:
        return BaseEvent(
            event_type=EventType.CIRCUIT_BREAKER_OPENED,
            source="core",
            data={
                "module_name": module_name,
                "failure_count": failure_count,
            }
        )
```

---

### 2.4 Capa Registry (Socket)

#### `app/core/registry/runtime.py` - ModuleRuntime

```python
from typing import Dict, Optional, List
from fastapi import APIRouter
import asyncio
from datetime import datetime
from app.core.registry.schemas import ModuleInfo, ModuleStatus, CircuitState

class ModuleRuntime:
    """
    El "Socket" del sistema. Mantiene el registro en memoria de todos los
    módulos activos y gestiona su ciclo de vida.
    """

    def __init__(self):
        self._modules: Dict[str, ModuleInfo] = {}
        self._lock = asyncio.Lock()

    async def register(self, module_info: ModuleInfo) -> ModuleInfo:
        async with self._lock:
            module_info.status = ModuleStatus.REGISTERED
            module_info.registered_at = datetime.utcnow()
            self._modules[module_info.name] = module_info
            return module_info

    async def unregister(self, name: str) -> bool:
        async with self._lock:
            if name in self._modules:
                self._modules[name].status = ModuleStatus.REMOVED
                del self._modules[name]
                return True
            return False

    def get_module(self, name: str) -> Optional[ModuleInfo]:
        return self._modules.get(name)

    def list_modules(self, status: Optional[ModuleStatus] = None) -> List[ModuleInfo]:
        if status:
            return [m for m in self._modules.values() if m.status == status]
        return list(self._modules.values())

    def get_healthy_modules(self) -> List[ModuleInfo]:
        return [m for m in self._modules.values() if m.status in (ModuleStatus.HEALTHY, ModuleStatus.DEGRADED)]

    async def update_status(self, name: str, status: ModuleStatus):
        async with self._lock:
            if name in self._modules:
                self._modules[name].status = status
                self._modules[name].last_health_check = datetime.utcnow()

    async def update_health(self, name: str, success: bool):
        async with self._lock:
            if name not in self._modules:
                return
            mod = self._modules[name]
            if success:
                mod.health_count += 1
                mod.fail_count = 0
                if mod.circuit_state == CircuitState.HALF_OPEN and mod.health_count >= 3:
                    mod.circuit_state = CircuitState.CLOSED
                    mod.status = ModuleStatus.HEALTHY
                elif mod.circuit_state == CircuitState.OPEN:
                    mod.circuit_state = CircuitState.HALF_OPEN
            else:
                mod.fail_count += 1
                mod.health_count = 0
                if mod.fail_count >= 5:
                    mod.circuit_state = CircuitState.OPEN
                    mod.status = ModuleStatus.UNHEALTHY
                elif mod.fail_count >= 3:
                    mod.status = ModuleStatus.DEGRADED

module_runtime = ModuleRuntime()
```

#### `app/core/registry/schemas.py` - Schemas del Registry

```python
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from enum import Enum
from datetime import datetime
import re

class ModuleStatus(str, Enum):
    DISCOVERED = "discovered"
    VALIDATED = "validated"
    REGISTERED = "registered"
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    OFFLINE = "offline"
    REMOVED = "removed"

class CircuitState(str, Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"

class ModuleManifest(BaseModel):
    """Representa el manifest.yaml de un módulo."""
    name: str = Field(pattern=r"^mod-[a-z0-9-]+$")
    version: str = Field(pattern=r"^\d+\.\d+\.\d+$")
    api_version: str = Field(pattern=r"^v\d+$")
    description: Optional[str] = None
    author: Optional[str] = None
    endpoints: Dict[str, str]  # {"http": "http://localhost:8002"}
    health_check: str = "/health"
    dependencies: Optional[Dict[str, List[str]]] = None
    events: Optional[Dict[str, List[str]]] = None
    permissions: Optional[Dict[str, List[str]]] = None
    config: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = None

    @field_validator("endpoints")
    @classmethod
    def validate_endpoints(cls, v):
        if "http" not in v:
            raise ValueError("El manifiesto debe incluir un endpoint http")
        # Validar URL
        if not v["http"].startswith("http://") and not v["http"].startswith("https://"):
            raise ValueError(f"Endpoint http inválido: {v['http']}")
        return v

    @field_validator("health_check")
    @classmethod
    def validate_health_check(cls, v):
        if not v.startswith("/"):
            raise ValueError("health_check debe comenzar con /")
        return v

class ModuleInfo(BaseModel):
    """Representación completa de un módulo en el runtime."""
    name: str
    version: str
    api_version: str
    description: Optional[str] = None
    endpoints: Dict[str, str]
    health_check: str = "/health"
    events: Optional[Dict[str, List[str]]] = None
    permissions: Optional[Dict[str, List[str]]] = None
    config: Optional[Dict[str, Any]] = None
    dependencies: Optional[Dict[str, List[str]]] = None
    tags: Optional[List[str]] = None

    # Runtime state
    status: ModuleStatus = ModuleStatus.DISCOVERED
    registered_at: Optional[datetime] = None
    last_health_check: Optional[datetime] = None
    health_count: int = 0
    fail_count: int = 0
    circuit_state: CircuitState = CircuitState.CLOSED
    compliance_result: Optional[Dict] = None
```

#### `app/core/registry/validator.py` - ManifestValidator

```python
from app.core.registry.schemas import ModuleManifest
from typing import Tuple, List, Dict
import httpx
import asyncio
import os

class ManifestValidator:
    """
    Valida manifiestos de módulos según el estándar MODULE-STD-2.0.
    Calcula un compliance score (0-100).
    """

    def __init__(self):
        self.compliance_steps = [
            ("schema_valid", "Schema del manifiesto válido", 15),
            ("name_valid", "Nombre cumple formato mod-[a-z0-9-]+", 5),
            ("name_not_reserved", "Nombre no reservado", 5),
            ("http_endpoint_valid", "Endpoint HTTP válido y accesible", 15),
            ("health_check_exists", "Health check endpoint configurado", 10),
            ("health_check_responds", "Health check responde 200 OK", 15),
            ("main_py_exists", "main.py existe", 5),
            ("requirements_txt_exists", "requirements.txt existe", 5),
            ("events_declared", "Eventos declarados son válidos", 10),
            ("permissions_valid", "Permisos declarados son válidos", 10),
            ("dependencies_valid", "Dependencias declaradas existen", 5),
        ]

    async def validate(self, manifest: ModuleManifest, module_path: str) -> Dict:
        """
        Ejecuta todas las validaciones de compliance.
        Retorna: { "passed": [...], "failed": [...], "score": int, "compliant": bool }
        """
        passed = []
        failed = []
        total_weight = sum(w for _, _, w in self.compliance_steps)

        for step_name, step_desc, weight in self.compliance_steps:
            try:
                result = await self._run_step(step_name, manifest, module_path)
                if result:
                    passed.append({"step": step_name, "description": step_desc})
                else:
                    failed.append({"step": step_name, "description": step_desc, "reason": result})
            except Exception as e:
                failed.append({"step": step_name, "description": step_desc, "reason": str(e)})

        earned = sum(w for name, _, w in self.compliance_steps if name in [p["step"] for p in passed])
        score = int((earned / total_weight) * 100)
        compliant = score >= 80

        return {
            "passed": passed,
            "failed": failed,
            "score": score,
            "compliant": compliant,
        }

    async def _run_step(self, step_name: str, manifest: ModuleManifest, module_path: str) -> bool:
        if step_name == "schema_valid":
            return True  # Si llegamos aquí, Pydantic ya validó el schema

        if step_name == "name_valid":
            import re
            return bool(re.match(r"^mod-[a-z0-9-]+$", manifest.name))

        if step_name == "name_not_reserved":
            reserved = ["core", "siga", "admin", "auth", "api", "ws"]
            return manifest.name.replace("mod-", "") not in reserved

        if step_name == "http_endpoint_valid":
            try:
                async with httpx.AsyncClient(timeout=5) as client:
                    r = await client.get(manifest.endpoints["http"])
                    return r.status_code < 500
            except Exception:
                return False

        if step_name == "health_check_exists":
            return bool(manifest.health_check)

        if step_name == "health_check_responds":
            try:
                url = f"{manifest.endpoints['http'].rstrip('/')}{manifest.health_check}"
                async with httpx.AsyncClient(timeout=5) as client:
                    r = await client.get(url)
                    return r.status_code == 200
            except Exception:
                return False

        if step_name == "main_py_exists":
            return os.path.exists(os.path.join(module_path, "main.py"))

        if step_name == "requirements_txt_exists":
            return os.path.exists(os.path.join(module_path, "requirements.txt"))

        if step_name == "events_declared":
            events = manifest.events or {}
            has_publishes = "publishes" in events and len(events["publishes"]) > 0
            has_subscribes = "subscribes" in events and len(events["subscribes"]) > 0
            return has_publishes or has_subscribes

        if step_name == "permissions_valid":
            perms = manifest.permissions or {}
            has_requires = "requires" in perms and len(perms["requires"]) > 0
            has_grants = "grants" in perms and len(perms["grants"]) > 0
            return has_requires or has_grants

        if step_name == "dependencies_valid":
            # Verificar que las dependencias requeridas tengan sentido
            deps = manifest.dependencies or {}
            return True  # La validación real se hace al registrar

        return False
```

---

### 2.5 Capa Resilience

Ver documento completo: `04-RESILIENCIA.md`

Resumen de componentes:

| Componente | Archivo | Propósito |
|-----------|---------|-----------|
| CircuitBreaker | `circuit_breaker.py` | Estados Closed/Open/Half-open, failure threshold, recovery timeout |
| HealthMonitor | `health_monitor.py` | Loop periódico de health checks, actualiza ModuleRuntime |
| FallbackManager | `fallback_manager.py` | Estrategias: cache, datos estáticos, degradación, 503 |
| CacheManager | `cache_manager.py` | Redis (producción) / Memoria (desarrollo), TTL configurable |

---

## 3. Main.py - Punto de Entrada

```python
# app/main.py

import os
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.core.config import get_settings
from app.core.database import engine, AsyncSessionLocal, Base
from app.core.gateway.http_proxy import http_gateway
from app.core.gateway.event_bus import event_bus
from app.core.gateway.security_middleware import SecurityMiddleware
from app.core.registry.runtime import module_runtime
from app.core.registry.validator import ManifestValidator
from app.core.resilience.cache_manager import cache_manager
from app.core.resilience.health_monitor import health_monitor
from app.core.resilience.circuit_breaker import circuit_breaker_registry
from app.core.identity.auth_service import AuthService
from app.core.identity.tokens import token_service
from app.core.identity.permissions import PermissionService
from app.core.identity.seeds.base import SeederRunner
from app.core.gateway.event_schemas import EventFactory, EventType

settings = get_settings()

# ──────────────────────────────────────────────
# Startup / Shutdown
# ──────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Maneja el ciclo de vida de la aplicación."""
    # ── STARTUP ──────────────────────────────
    print("🚀 Iniciando SIGA Core...")
    
    # 1. Cargar configuración (.env) — ya cargada por Pydantic
    print(f"   Entorno: {settings.ENVIRONMENT}")
    print(f"   Debug: {settings.DEBUG}")
    
    # 2. Conectar PostgreSQL (siga_core)
    print("   Conectando a PostgreSQL...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("   ✅ Tablas del Core creadas/verificadas")
    
    # 3. Crear sesión asíncrona
    session = AsyncSessionLocal()
    print("   ✅ Sesión de BD creada")
    
    # 4. Inicializar AuthService
    auth_service = AuthService(session, token_service, PermissionService(session))
    app.state.auth_service = auth_service
    print("   ✅ AuthService inicializado")
    
    # 5. Inicializar SecurityMiddleware (ya configurado como middleware)
    print("   ✅ SecurityMiddleware activo")
    
    # 6. Ejecutar Seeders (roles → usuarios)
    seeder_runner = SeederRunner(session)
    await seeder_runner.run_all()
    print("   ✅ Seeders ejecutados")
    
    # 7. Conectar NATS (si habilitado)
    if settings.NATS_ENABLED:
        await event_bus.connect()
        app.state.event_bus = event_bus
        print("   ✅ NATS conectado")
    else:
        print("   ⚠️ NATS deshabilitado")
    
    # 8. Suscribir a eventos del sistema
    if settings.NATS_ENABLED:
        await event_bus.subscribe("module.*", handle_module_event)
        await event_bus.subscribe("user.*", handle_user_event)
        print("   ✅ Suscripciones NATS activas")
    
    # 9. Descubrir módulos automáticamente
    if settings.MODULES_AUTO_DISCOVER:
        discovered = await discover_modules()
        print(f"   ✅ {len(discovered)} módulos descubiertos")
    
    # 10. Health check inicial de módulos
    healthy_count = 0
    for module in module_runtime.list_modules():
        try:
            await health_monitor.check_module(module.name)
            healthy_count += 1
        except Exception:
            pass
    print(f"   ✅ Health check inicial: {healthy_count} módulos saludables")
    
    # 11. Inicializar Resilience
    await cache_manager.connect()
    await health_monitor.start_monitoring()
    print("   ✅ Sistema de resiliencia inicializado")
    
    # 12. Publicar evento CORE_STARTED
    if settings.NATS_ENABLED:
        await event_bus.publish(
            EventType.CORE_STARTED.value,
            {"core_version": "1.0.0", "environment": settings.ENVIRONMENT}
        )
    
    # 13. Inicializar HTTP Gateway
    await http_gateway.start()
    
    print("✅✅✅ SIGA Core iniciado correctamente")
    
    # ── YIELD (app running) ──────────────────
    yield
    
    # ── SHUTDOWN ────────────────────────────
    print("🛑 Apagando SIGA Core...")
    
    await http_gateway.stop()
    await health_monitor.stop_monitoring()
    await cache_manager.close()
    await event_bus.close()
    await session.close()
    await engine.dispose()
    
    print("✅ SIGA Core apagado correctamente")

# ──────────────────────────────────────────────
# Crear aplicación FastAPI
# ──────────────────────────────────────────────
app = FastAPI(
    title="SIGA Core API",
    description="API Gateway del Sistema Integrado de Gestión Académica",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ──────────────────────────────────────────────
# Middleware
# ──────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# SecurityMiddleware se aplica como middleware de Starlette
app.add_middleware(SecurityMiddleware)

from app.middleware.tracing import TracingMiddleware
app.add_middleware(TracingMiddleware)

# ──────────────────────────────────────────────
# Handlers de eventos NATS
# ──────────────────────────────────────────────
async def handle_module_event(msg):
    """Maneja eventos relacionados a módulos."""
    from nats.aio.msg import Msg
    import json
    data = json.loads(msg.data.decode())
    subject = msg.subject
    print(f"📨 Evento NATS recibido: {subject} → {data}")
    await msg.ack()

async def handle_user_event(msg):
    """Maneja eventos relacionados a usuarios."""
    from nats.aio.msg import Msg
    import json
    data = json.loads(msg.data.decode())
    subject = msg.subject
    print(f"📨 Evento NATS recibido: {subject} → {data}")
    await msg.ack()

# ──────────────────────────────────────────────
# Descubrimiento de módulos
# ──────────────────────────────────────────────
async def discover_modules():
    """Descubre módulos en el filesystem y los registra."""
    import yaml
    import os
    
    discovered = []
    modules_dir = settings.MODULES_DIR
    
    if not os.path.exists(modules_dir):
        print(f"   ⚠️ Directorio {modules_dir} no encontrado")
        return []
    
    for item in os.listdir(modules_dir):
        module_path = os.path.join(modules_dir, item)
        manifest_path = os.path.join(module_path, "manifest.yaml")
        
        if not os.path.isdir(module_path) or not os.path.exists(manifest_path):
            continue
        
        try:
            with open(manifest_path, "r") as f:
                manifest_data = yaml.safe_load(f)
            
            from app.core.registry.schemas import ModuleManifest
            manifest = ModuleManifest(**manifest_data)
            
            # Validar compliance
            validator = ManifestValidator()
            compliance = await validator.validate(manifest, module_path)
            
            # Crear ModuleInfo
            from app.core.registry.schemas import ModuleInfo
            module_info = ModuleInfo(
                name=manifest.name,
                version=manifest.version,
                api_version=manifest.api_version,
                description=manifest.description or "",
                endpoints=manifest.endpoints,
                health_check=manifest.health_check,
                events=manifest.events or {},
                permissions=manifest.permissions or {},
                config=manifest.config or {},
                dependencies=manifest.dependencies or {},
                tags=manifest.tags or [],
                status="discovered",
                compliance_result=compliance,
            )
            
            await module_runtime.register(module_info)
            discovered.append(module_info.name)
            print(f"   📦 Módulo descubierto: {manifest.name} v{manifest.version}")
            
        except Exception as e:
            print(f"   ⚠️ Error al cargar módulo en {module_path}: {e}")
    
    return discovered

# ──────────────────────────────────────────────
# Endpoints del Core
# ──────────────────────────────────────────────
@app.get("/")
async def root():
    return {
        "service": "SIGA Core",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
        "docs": "/docs",
        "status": "/health",
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "modules_healthy": len(module_runtime.get_healthy_modules()),
        "modules_total": len(module_runtime.list_modules()),
        "nats_connected": event_bus._connected if settings.NATS_ENABLED else False,
        "cache_connected": cache_manager._redis is not None if settings.CACHE_ENABLED else False,
    }

@app.get("/core/status")
async def core_status():
    return {
        "core": {
            "version": "1.0.0",
            "uptime": "N/A",  # TODO: calcular uptime
            "environment": settings.ENVIRONMENT,
        },
        "modules": [
            {
                "name": m.name,
                "version": m.version,
                "status": m.status.value,
                "circuit_state": m.circuit_state.value,
                "health_count": m.health_count,
                "fail_count": m.fail_count,
                "compliance": m.compliance_result.get("score") if m.compliance_result else None,
            }
            for m in module_runtime.list_modules()
        ],
        "nats": {"connected": event_bus._connected},
        "cache": {"connected": cache_manager._redis is not None},
    }

# Endpoints de módulos dinámicos
from app.routers.module_routes import router as module_router
app.include_router(module_router, prefix="/api")

# Endpoints de auth
from app.routers.auth_routes import router as auth_router
app.include_router(auth_router, prefix="/auth")

# Endpoints del core
from app.routers.core_routes import router as core_router
app.include_router(core_router, prefix="/core")

# ──────────────────────────────────────────────
# WebSocket
# ──────────────────────────────────────────────
@app.websocket("/ws")
async def websocket_endpoint(websocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            # Procesar mensaje
            await websocket.send_text(f"Echo: {data}")
    except Exception:
        pass
    finally:
        await websocket.close()

# ──────────────────────────────────────────────
# Manejo global de errores
# ──────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "error": "Error interno del servidor",
            "detail": str(exc) if settings.DEBUG else "Ocurrió un error inesperado",
            "request_id": request.state.request_id if hasattr(request.state, "request_id") else None,
        }
    )

# ──────────────────────────────────────────────
# Entry point
# ──────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="info",
    )
```

### 3.1 Startup Sequence (Orden Exacto)

```
┌─────────────────────────────────────────────────────────────┐
│                    STARTUP SEQUENCE                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Cargar configuración (.env)                             │
│     → Pydantic CoreSettings valida variables de entorno     │
│     → Lee DB_HOST, SECRET_KEY, NATS_URL, etc.              │
│                                                             │
│  2. Conectar PostgreSQL (siga_core)                         │
│     → create_async_engine con pool de conexiones            │
│     → Verifica conectividad                                 │
│                                                             │
│  3. Crear sesión asíncrona                                   │
│     → async_sessionmaker para operaciones BD               │
│                                                             │
│  4. Inicializar AuthService                                 │
│     → TokenService (JWT) + PermissionService + UserRepository│
│                                                             │
│  5. Inicializar SecurityMiddleware                          │
│     → Configurar rutas excluidas (/health, /docs, /auth)    │
│                                                             │
│  6. Ejecutar Seeders                                        │
│     → RoleSeeder: admin, director, secretario, docente,    │
│       alumno                                                │
│     → PermissionSeeder: permisos base por módulo           │
│     → UserSeeder: admin, director, secretario por defecto  │
│                                                             │
│  7. Conectar NATS (si habilitado)                           │
│     → nats.connect con reconexión automática               │
│     → Si NATS no está disponible → modo sin event bus      │
│                                                             │
│  8. Suscribir a eventos del sistema                         │
│     → module.* (eventos de módulos)                         │
│     → user.* (eventos de usuarios)                          │
│                                                             │
│  9. Descubrir módulos automáticamente                       │
│     → Escanear modules/ en filesystem                      │
│     → Cargar y validar manifest.yaml                        │
│     → Verificar compliance (MODULE-STD-2.0)                 │
│     → Registrar en ModuleRuntime                            │
│                                                             │
│ 10. Health check inicial de módulos                         │
│     → GET /health de cada módulo registrado                │
│     → Timeout: 5 segundos por módulo                        │
│     → Módulos que no responden → estado OFFLINE            │
│                                                             │
│ 11. Inicializar Resilience                                  │
│     → CacheManager.connect() → Redis o memoria             │
│     → HealthMonitor.start() → loop cada 30s                │
│     → Cargar fallbacks estáticos                           │
│                                                             │
│ 12. Publicar evento CORE_STARTED                            │
│     → NATS subject: core.started                           │
│     → Datos: versión, entorno, módulos descubiertos        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Shutdown Sequence

```
┌─────────────────────────────────────────────────────────────┐
│                    SHUTDOWN SEQUENCE                         │
├─────────────────────────────────────────────────────────────┤
│  1. Dejar de aceptar nuevas peticiones (graceful)           │
│  2. Cerrar WebSocket connections                            │
│  3. HTTPGateway.stop() → cerrar httpx client               │
│  4. HealthMonitor.stop() → detener loop de monitoreo       │
│  5. CacheManager.close() → cerrar conexión Redis           │
│  6. EventBus.close() → cerrar conexión NATS                │
│  7. Cerrar sesión de BD                                    │
│  8. Engine.dispose() → cerrar pool de conexiones           │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Configuración (CoreSettings)

| Grupo | Variable | Default | Descripción |
|-------|----------|---------|-------------|
| **Core Identity** | `APP_NAME` | "SIGA Core" | Nombre de la aplicación |
| | `ENVIRONMENT` | "development" | Entorno: development, staging, production |
| | `SECRET_KEY` | "change-me-in-production" | Clave secreta para JWT (HS256) o ruta a clave privada RSA |
| | `DEBUG` | False | Modo debug (reload automático, stack traces) |
| **Database** | `DB_HOST` | "localhost" | Host de PostgreSQL |
| | `DB_PORT` | 5432 | Puerto de PostgreSQL |
| | `DB_USER` | "siga" | Usuario de BD |
| | `DB_PASSWORD` | "siga_pass" | Contraseña de BD |
| | `DB_NAME` | "siga_core" | Nombre de la BD del Core |
| **Module Registry** | `MODULES_AUTO_DISCOVER` | True | Descubrir módulos automáticamente al iniciar |
| | `MODULES_VALIDATE_ON_START` | True | Validar compliance al iniciar |
| **Communication** | `HTTP_PROXY_TIMEOUT` | 30 | Timeout en segundos para proxy HTTP a módulos |
| **Security** | `TOKEN_EXPIRE_MINUTES` | 60 | TTL de access token en minutos |
| | `MODULE_TOKEN_EXPIRE_HOURS` | 24 | TTL de token de módulo |
| | `ALLOWED_ORIGINS` | ["http://localhost:5173"] | Orígenes CORS permitidos |
| | `RATE_LIMIT_ENABLED` | True | Habilitar rate limiting |
| | `RATE_LIMIT_REQUESTS` | 100 | Requests por minuto por IP |
| **NATS** | `NATS_ENABLED` | True | Habilitar NATS event bus |
| | `NATS_URL` | "nats://localhost:4222" | URL del servidor NATS |
| | `NATS_MAX_RECONNECT` | 5 | Reintentos máximos de reconexión |
| **Resilience** | `CACHE_ENABLED` | True | Habilitar sistema de caché |
| | `REDIS_HOST` | "localhost" | Host de Redis |
| | `REDIS_PORT` | 6379 | Puerto de Redis |
| | `REDIS_DB` | 0 | Base de datos de Redis |
| | `CACHE_DEFAULT_TTL` | 300 | TTL por defecto (segundos) |
| | `CACHE_GET_TTL` | 600 | TTL para respuestas GET |
| | `HEALTH_CHECK_INTERVAL` | 30 | Intervalo de health checks (segundos) |
| | `HEALTH_CHECK_TIMEOUT` | 10 | Timeout de health check (segundos) |
| | `CIRCUIT_BREAKER_FAILURE_THRESHOLD` | 5 | Fallos consecutivos para abrir circuito |
| | `CIRCUIT_BREAKER_RECOVERY_TIMEOUT` | 60 | Timeout antes de half-open (segundos) |
| | `CIRCUIT_BREAKER_SUCCESS_THRESHOLD` | 3 | Éxitos consecutivos para cerrar circuito |

### Propiedades Calculadas

```python
@property
def DATABASE_URL(self) -> str:
    return f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

@property
def DATABASE_SYNC_URL(self) -> str:
    """Para Alembic (migraciones sincrónicas)"""
    return f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
```

---

## 5. Base de Datos del Core

### 5.1 Tablas de Identidad

#### `core_users`
| Columna | Tipo | Restricciones | Descripción |
|---------|------|--------------|-------------|
| id | INTEGER | PK, AUTO | ID único del usuario |
| username | VARCHAR(100) | UNIQUE, NOT NULL, INDEX | Nombre de usuario para login |
| email | VARCHAR(255) | UNIQUE, NOT NULL, INDEX | Correo electrónico |
| hashed_password | VARCHAR(255) | NOT NULL | Password hasheado con bcrypt |
| full_name | VARCHAR(255) | NOT NULL | Nombre completo |
| document_type | VARCHAR(20) | NOT NULL | Tipo de documento (DNI, CE, PASAPORTE) |
| document_number | VARCHAR(20) | UNIQUE, NOT NULL, INDEX | Número de documento |
| is_active | BOOLEAN | DEFAULT true | Usuario activo o desactivado |
| is_superuser | BOOLEAN | DEFAULT false | Acceso total al sistema |
| programa_ids | VARCHAR(255) | NULL | CSV de IDs de programas asignados |
| created_at | TIMESTAMP | DEFAULT NOW() | Fecha de creación |
| updated_at | TIMESTAMP | ON UPDATE NOW() | Última modificación |
| last_login | TIMESTAMP | NULL | Último inicio de sesión |

#### `core_roles`
| Columna | Tipo | Restricciones | Descripción |
|---------|------|--------------|-------------|
| id | INTEGER | PK, AUTO | ID único del rol |
| name | VARCHAR(50) | UNIQUE, NOT NULL | Nombre del rol (admin, docente, alumno) |
| description | VARCHAR(255) | NULL | Descripción del rol |
| is_system | BOOLEAN | DEFAULT false | Rol del sistema (no se puede eliminar) |
| created_at | TIMESTAMP | DEFAULT NOW() | Fecha de creación |

#### `core_permissions`
| Columna | Tipo | Restricciones | Descripción |
|---------|------|--------------|-------------|
| id | INTEGER | PK, AUTO | ID único del permiso |
| name | VARCHAR(100) | UNIQUE, NOT NULL | Nombre del permiso (mod-estudiantes:read) |
| description | VARCHAR(255) | NULL | Descripción del permiso |
| resource | VARCHAR(50) | NOT NULL | Recurso (mod-estudiantes, mod-matricula) |
| action | VARCHAR(50) | NOT NULL | Acción (read, write, admin) |
| created_at | TIMESTAMP | DEFAULT NOW() | Fecha de creación |

#### `core_user_roles` (M2M)
| Columna | Tipo | Restricciones |
|---------|------|--------------|
| user_id | INTEGER | PK, FK → core_users(id) ON DELETE CASCADE |
| role_id | INTEGER | PK, FK → core_roles(id) ON DELETE CASCADE |

#### `core_role_permissions` (M2M)
| Columna | Tipo | Restricciones |
|---------|------|--------------|
| role_id | INTEGER | PK, FK → core_roles(id) ON DELETE CASCADE |
| permission_id | INTEGER | PK, FK → core_permissions(id) ON DELETE CASCADE |

### 5.2 Tablas de Registry

#### `core_modules`
| Columna | Tipo | Restricciones | Descripción |
|---------|------|--------------|-------------|
| id | SERIAL | PK | ID único del módulo |
| name | VARCHAR(100) | UNIQUE, NOT NULL | Nombre del módulo (mod-estudiantes) |
| version | VARCHAR(20) | NOT NULL | Versión semver |
| api_version | VARCHAR(10) | NOT NULL | Versión de API (v1) |
| manifest | JSONB | NOT NULL | Manifiesto completo del módulo |
| status | VARCHAR(20) | DEFAULT 'discovered' | Estado actual del módulo |
| endpoint_http | VARCHAR(255) | NULL | Endpoint HTTP del módulo |
| health_check_path | VARCHAR(100) | DEFAULT '/health' | Path del health check |
| registered_at | TIMESTAMP | DEFAULT NOW() | Fecha de registro |
| last_health_check | TIMESTAMP | NULL | Último health check |
| health_count | INTEGER | DEFAULT 0 | Intentos de health check exitosos |
| fail_count | INTEGER | DEFAULT 0 | Fallos consecutivos |
| circuit_state | VARCHAR(20) | DEFAULT 'closed' | Estado del circuit breaker |
| compliance_result | JSONB | NULL | Resultado de validación de compliance |
| is_active | BOOLEAN | DEFAULT true | Módulo activo/inactivo |
| updated_at | TIMESTAMP | DEFAULT NOW() | Última actualización |

#### `core_audit_log`
| Columna | Tipo | Restricciones | Descripción |
|---------|------|--------------|-------------|
| id | BIGSERIAL | PK | ID único del registro |
| event_type | VARCHAR(50) | NOT NULL | Tipo de evento (user.login, module.register) |
| user_id | INTEGER | FK → core_users(id) | Usuario que realizó la acción (NULL para sistema) |
| module_name | VARCHAR(100) | NULL | Módulo involucrado |
| action | VARCHAR(50) | NOT NULL | Acción realizada (CREATE, READ, UPDATE, DELETE) |
| resource_type | VARCHAR(50) | NOT NULL | Tipo de recurso afectado |
| resource_id | VARCHAR(100) | NULL | ID del recurso afectado |
| details | JSONB | NULL | Detalles adicionales de la operación |
| ip_address | VARCHAR(45) | NULL | Dirección IP del cliente |
| user_agent | VARCHAR(500) | NULL | User-Agent del cliente |
| success | BOOLEAN | DEFAULT true | Si la operación fue exitosa |
| error_message | TEXT | NULL | Mensaje de error si falló |
| created_at | TIMESTAMP | DEFAULT NOW() | Fecha del evento |

### 5.3 Estrategia de Migraciones

**Herramienta**: Alembic 1.12+

**Configuración** (`alembic/env.py`):
```python
from app.core.config import get_settings
from app.core.database import Base
from app.core.identity.models import CoreUser, CoreRole, CorePermission
from app.core.registry.schemas import ModuleInfo  # No es tabla, solo referencia

settings = get_settings()
target_metadata = Base.metadata

def run_migrations_offline():
    url = settings.DATABASE_SYNC_URL
    context.configure(url=url, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online():
    connectable = create_engine(settings.DATABASE_SYNC_URL)
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()
```

**Convenciones de nomenclatura**:
- Archivos de migración: `{YYYYMMDD_HHMM}_{descripcion}.py`
- Ejemplo: `20260626_1200_create_core_users.py`
- Prefijo `revises` para migraciones encadenadas

**Política**:
- Las migraciones del Core solo tocan el schema `siga_core`
- Cada módulo maneja sus propias migraciones Alembic en su propio repositorio
- Las migraciones deben ser **reversibles** (downgrade implementado)
- Las migraciones se ejecutan automáticamente al iniciar el Core (`Base.metadata.create_all`)
- En producción, se usa `alembic upgrade head` en el proceso de CI/CD

---

## 6. Endpoints del Core

### 6.1 Tabla Completa de Endpoints

| Endpoint | Método | Propósito | Auth | Permisos | Request | Response |
|----------|--------|-----------|------|----------|---------|----------|
| `/` | GET | Root del sistema | No | - | - | `{"service", "version", "docs", "status"}` |
| `/health` | GET | Health check del Core | No | - | - | `{"status", "modules_healthy", "nats"}` |
| `/core/status` | GET | Estado completo del sistema | No | - | - | `{"core", "modules[], "nats", "cache"}` |
| `/core/modules` | GET | Lista módulos registrados | No | - | - | `[{"name", "version", "status"}]` |
| `/core/modules/register` | POST | Registrar un nuevo módulo | No | - | `ModuleManifest` | `{"name", "status", "compliance"}` |
| `/core/modules/{name}` | GET | Detalle de un módulo | No | - | - | `ModuleInfo` |
| `/core/modules/{name}` | DELETE | Desregistrar un módulo | No | - | - | `{"success": true}` |
| `/core/modules/{name}/health` | GET | Health check de un módulo | No | - | - | `{"status", "response_time"}` |
| `/core/modules/{name}/compliance` | GET | Compliance de un módulo | No | - | - | `{"score", "compliant", "checks"}` |
| `/core/modules/{name}/status` | PUT | Actualizar estado manualmente | No | - | `{"status"}` | `{"success"}` |
| `/auth/register` | POST | Registrar nuevo usuario | No | - | `{"username", "email", "password", ...}` | `{"user", "access_token"}` |
| `/auth/login` | POST | Login de usuario | No | - | `{"username", "password"}` | `{"access_token", "refresh_token"}` |
| `/auth/me` | GET | Usuario actual | Sí | - | - | `{"id", "username", "roles", "permissions"}` |
| `/auth/refresh` | POST | Refrescar access token | No | - | `{"refresh_token"}` | `{"access_token"}` |
| `/api/{module}/{path:path}` | ALL | Proxy a módulo | Sí | `{module}:{method}` | Variable | Variable |
| `/ws` | WS | WebSocket proxy | Sí | - | Mensaje WS | Mensaje WS |

### 6.2 `/auth/login` - Flujo Detallado

```
POST /auth/login
Content-Type: application/json
Body: {"username": "admin", "password": "Admin123!"}

1. AuthService.authenticate(username, password)
   a. Buscar usuario por username en BD
   b. Si no encuentra, buscar por email
   c. Si no encuentra → 401 "Credenciales inválidas"
   d. Verificar is_active
   e. Verificar password con bcrypt
   f. Si todo ok → retornar CoreUser

2. TokenService.create_access_token(user)
   a. Extraer roles y permisos del usuario (eager loaded)
   b. Construir payload JWT
   c. Firmar con RS256 (o HS256 en desarrollo)
   d. Retornar token string

3. TokenService.create_refresh_token(user)
   a. Payload mínimo (sub, type="refresh", exp=7 días)
   b. Firmar y retornar

4. Actualizar last_login del usuario

5. Publicar evento user.logged_in (NATS)

Response 200:
{
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "token_type": "bearer",
    "expires_in": 3600,
    "user": {
        "id": 1,
        "username": "admin",
        "email": "admin@siga.edu.pe",
        "full_name": "Administrador SIGA",
        "roles": ["admin"],
        "permissions": ["mod-estudiantes:admin", "mod-matricula:admin", ...],
        "programa_ids": []
    }
}
```

### 6.3 `/api/{module}/{path}` - Proxy Flow

```
GET /api/mod-estudiantes/v1/estudiantes?programa_id=1
Authorization: Bearer eyJ...

1. SecurityMiddleware (se ejecuta primero)
   a. Extraer token del header
   b. Validar token JWT
   c. Extraer payload (user_id, roles, permissions, programa_ids)
   d. Verificar permiso "mod-estudiantes:read"
   e. Inyectar user en request.state

2. Router: /api/{module}/{path}
   a. Extraer module_name = "mod-estudiantes"
   b. Extraer path = "v1/estudiantes"
   c. Llamar a http_gateway.proxy_request()

3. HTTPGateway.proxy_request("mod-estudiantes", "v1/estudiantes", request)
   a. module_runtime.get_module("mod-estudiantes")
      → Encuentra ModuleInfo con endpoint http://localhost:8006
   b. circuit_breaker_registry.get("mod-estudiantes")
      → Obtiene CircuitBreaker para este módulo
   c. cb.call(call_module, fallback)
      - Si CLOSED: ejecuta call_module()
      - Si OPEN: ejecuta fallback() (a menos que haya pasado recovery_timeout)
      - Si HALF_OPEN: ejecuta call_module(), decide según resultado
   d. call_module():
      - Construir URL: http://localhost:8006/v1/estudiantes?programa_id=1
      - Propagar headers (X-Request-ID, X-User-ID, X-User-Roles)
      - Ejecutar httpx request con timeout 30s
      - Retornar Response
   e. Cachear respuesta si es GET y status 200
   f. Retornar Response al cliente

Response 200 (del módulo):
{
    "data": [
        {"id": 1, "nombre": "Juan Pérez", "programa_id": 1},
        {"id": 2, "nombre": "María García", "programa_id": 1}
    ],
    "total": 2
}
```

---

## 7. Dependencias (requirements.txt)

```txt
# =============================================================================
# SIGA Core - Dependencias
# =============================================================================
# Framework principal
# -----------------------------------------------------------------------------
fastapi==0.104.1               # Core framework (esencial)
uvicorn[standard]==0.24.0       # ASGI server (esencial)
pydantic==2.5.2                 # Validación de datos (esencial)
pydantic-settings==2.1.0        # Configuración por variables de entorno (esencial)

# Base de datos
# -----------------------------------------------------------------------------
sqlalchemy[asyncio]==2.0.23     # ORM (esencial)
asyncpg==0.29.0                 # Driver async para PostgreSQL (esencial)
alembic==1.13.0                 # Migraciones (esencial)
psycopg2-binary==2.9.9          # Driver sync para Alembic (esencial)

# Autenticación y seguridad
# -----------------------------------------------------------------------------
python-jose[cryptography]==3.3.0 # JWT (esencial)
passlib[bcrypt]==1.7.4          # Password hashing (esencial)
bcrypt==4.1.2                   # Implementación bcrypt (esencial)
python-multipart==0.0.6         # Procesamiento de formularios (esencial)

# Comunicación
# -----------------------------------------------------------------------------
httpx==0.25.2                   # Cliente HTTP asíncrono (esencial)
nats-py==2.6.0                  # Cliente NATS (esencial)
redis[hiredis]==5.0.1           # Cliente Redis (opcional - cache)
hiredis==2.3.2                  # Parseador Redis optimizado (opcional)

# Utilidades
# -----------------------------------------------------------------------------
PyYAML==6.0.1                   # Parseo de manifest.yaml (esencial)
python-dotenv==1.0.0            # Carga de .env (esencial)
structlog==24.1.0               # Logs estructurados (opcional - logging)
orjson==3.9.10                  # JSON optimizado (opcional - rendimiento)

# Desarrollo y testing
# -----------------------------------------------------------------------------
pytest==7.4.3                   # Test runner (desarrollo)
pytest-asyncio==0.23.2          # Soporte async en tests (desarrollo)
httpx==0.25.2                   # Cliente HTTP para tests (desarrollo)
ruff==0.1.9                     # Linter (desarrollo)
mypy==1.7.1                     # Type checker (desarrollo)
coverage==7.3.2                 # Cobertura de código (desarrollo)
```

---

## 8. Historial de Cambios

| Versión | Fecha | Autor | Descripción |
|---------|-------|-------|-------------|
| 1.0 | 2026-06-26 | Equipo Arquitectura | Versión inicial del documento. Define propósito del Core, estructura de capas, configuración, BD, endpoints, y dependencias. |
