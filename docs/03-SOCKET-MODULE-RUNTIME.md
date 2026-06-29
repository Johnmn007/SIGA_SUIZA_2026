# Socket de Anclaje - Module Runtime

| Versión | Fecha       | Autor               | Descripción                                        |
|---------|-------------|----------------------|----------------------------------------------------|
| 1.0     | 2026-06-26  | Equipo Arquitectura  | Versión inicial del Socket / Module Runtime        |

---

## 1. ¿Qué es el Socket?

### 1.1 Definición

El **Socket** (también llamado **Module Runtime**) es el componente del Core responsable de la gestión del ciclo de vida de los módulos (microservicios). Actúa como el mecanismo de acoplamiento entre el Core y los módulos: un "enchufe" donde los módulos se conectan dinámicamente.

El Socket no es un servicio separado — vive dentro del Core como la **Capa de Registry** (`app/core/registry/`). Es el punto de integración que permite que los módulos sean descubiertos, validados, registrados, monitoreados y eventualmente desregistrados sin necesidad de modificar el Core.

### 1.2 Analogía

```
CORE                      SOCKET                    MÓDULOS
┌─────────────────┐      ┌─────────────┐      ┌──────────────────┐
│                 │      │             │      │  mod-estudiantes  │
│  Energía        │─────→│  Registry   │←────→│  ┌────────────┐  │
│  (Infraestructura)     │  Runtime    │      │  │ BD propia  │  │
│                 │      │  Validator  │      │  └────────────┘  │
│  Identidad      │      │  Discovery  │      ├──────────────────┤
│  (Auth)         │      │  Health     │      │  mod-matricula   │
│                 │      │  Monitor    │      │  ┌────────────┐  │
│  Gateway        │      │  Circuit    │      │  │ BD propia  │  │
│  (Proxy)        │      │  Breaker    │      │  └────────────┘  │
│                 │      │             │      ├──────────────────┤
│  Resiliencia    │      │             │      │  mod-planes-e.  │
│  (Cache)        │      │             │      │  ┌────────────┐  │
│                 │      │             │      │  │ BD propia  │  │
└─────────────────┘      └─────────────┘      │  └────────────┘  │
                                               └──────────────────┘
```

El Core provee la **infraestructura base** (energía eléctrica): autenticación, gateway, resiliencia, event bus. El **Socket** es el punto de conexión estandarizado (el enchufe): define el contrato, valida que los módulos cumplan el estándar, y gestiona su estado. Cada **módulo** es un dispositivo que se enchufa: tiene su propia función, sus propios datos, y puede ser reemplazado sin modificar la instalación eléctrica.

### 1.3 Responsabilidades del Socket

| Responsabilidad | Descripción |
|----------------|-------------|
| **Descubrimiento** | Encontrar módulos disponibles en el filesystem, BD, Docker o Kubernetes |
| **Validación** | Verificar que el manifiesto del módulo cumple el estándar MODULE-STD-2.0 |
| **Registro** | Agregar el módulo al runtime, haciéndolo disponible para routing |
| **Monitoreo** | Health checks periódicos para conocer el estado de cada módulo |
| **Gestión de Estado** | Mantener y actualizar el estado de cada módulo (healthy, degraded, offline) |
| **Circuit Breaker** | Integración con el sistema de resiliencia para evitar fallos en cascada |
| **Notificación** | Publicar eventos cuando un módulo cambia de estado |
| **Persistencia** | Almacenar el estado de los módulos en la BD del Core (`core_modules`) |

### 1.4 Lo que NO hace el Socket

- **No ejecuta código de módulos**: los módulos son procesos independientes.
- **No almacena datos de módulos**: cada módulo tiene su propia BD.
- **No implementa lógica de negocio**: eso es responsabilidad de cada módulo.
- **No reemplaza un API Gateway completo**: el Socket solo gestiona el ciclo de vida; el Gateway (otra capa del Core) maneja el ruteo de peticiones.

---

## 2. Ciclo de Vida de un Módulo

### 2.1 Diagrama de Estados

```
                     ┌──────────────────────────────────────────────────────┐
                     │              CICLO DE VIDA DE UN MÓDULO               │
                     └──────────────────────────────────────────────────────┘

                  (Descubrimiento inicial)
                           │
                           ▼
                    ┌──────────────┐
                    │  DISCOVERED  │
                    │  (Encontrado)│
                    └──────┬───────┘
                           │  Validar manifiesto + compliance
                           ▼
                    ┌──────────────┐
                    │  VALIDATED   │
                    │  (Válido)    │
                    └──────┬───────┘
                           │  Registrar en runtime
                           ▼
                    ┌──────────────┐
                    │  REGISTERED  │
                    │  (Registrado)│
                    └──────┬───────┘
                           │  Health check inicial
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
       ┌──────────┐ ┌──────────┐ ┌──────────┐
       │ HEALTHY  │ │DEGRADED  │ │ OFFLINE  │
       │ (Salud.) │ │(Degrad.) │ │(Descon.) │
       └────┬─────┘ └────┬─────┘ └──────────┘
            │            │
            │  3 fallos  │
            ├────────────┘
            ▼
       ┌──────────┐
       │UNHEALTHY │  5 fallos → Circuit Breaker OPEN
       │(No salud)│
       └────┬─────┘
            │
            ▼
       ┌──────────┐
       │ REMOVED  │  (Desregistro explícito)
       │ (Elimin.)│
       └──────────┘

  Transiciones posibles:
  ─────────────────────
  DISCOVERED  → VALIDATED   (manifiesto válido)
  DISCOVERED  → REMOVED     (manifiesto inválido, no cumple estándar)
  VALIDATED   → REGISTERED  (registro exitoso)
  REGISTERED  → HEALTHY     (health check inicial OK)
  REGISTERED  → OFFLINE     (health check inicial falló)
  HEALTHY     → DEGRADED    (1-2 fallos en health check)
  HEALTHY     → UNHEALTHY   (3+ fallos consecutivos)
  DEGRADED    → HEALTHY     (health check OK después de degradación)
  DEGRADED    → UNHEALTHY   (más fallos)
  UNHEALTHY   → REMOVED     (desregistro manual o automático)
  UNHEALTHY   → HEALTHY     (recuperación manual)
  OFFLINE     → REMOVED     (desregistro)
  OFFLINE     → HEALTHY     (recuperación, nuevo health check)
```

### 2.2 Descripción de Estados

| Estado | Significado | ¿Recibe tráfico? | Acción del Gateway |
|--------|-------------|------------------|-------------------|
| **DISCOVERED** | Módulo encontrado en filesystem/BD, pendiente de validación | ❌ No | No está disponible para routing |
| **VALIDATED** | Manifiesto válido, cumple compliance ≥ 80% | ❌ No | Esperando registro formal |
| **REGISTERED** | Registrado en el runtime, listo para health check inicial | ❌ No | Primer health check pendiente |
| **HEALTHY** | Health check OK, funcionando normalmente | ✅ Sí | Enrutamiento normal, cache habilitado |
| **DEGRADED** | 1-2 fallos consecutivos, responde parcialmente | ⚠️ Sí (con advertencia) | Enrutamiento con fallback parcial |
| **UNHEALTHY** | 3+ fallos consecutivos, Circuit Breaker OPEN | ❌ No | Fallback activado, sin enrutamiento directo |
| **OFFLINE** | No responde desde el registro inicial | ❌ No | Sin intentos de conexión |
| **REMOVED** | Desregistrado explícitamente | ❌ No | No existe en el runtime |

### 2.3 Eventos Asociados a Cambios de Estado

| Transición | Evento NATS | Datos del Evento |
|------------|-------------|------------------|
| DISCOVERED → VALIDATED | `module.validated` | `{name, version, score}` |
| VALIDATED → REGISTERED | `module.registered` | `{name, version, endpoints}` |
| REGISTERED → HEALTHY | `module.health.changed` | `{name, status: "healthy"}` |
| HEALTHY → DEGRADED | `module.health.changed` | `{name, status: "degraded", fail_count}` |
| HEALTHY → UNHEALTHY | `module.health.changed` | `{name, status: "unhealthy", fail_count}` |
| UNHEALTHY → HEALTHY | `module.health.changed` | `{name, status: "healthy", recovery: true}` |
| * → REMOVED | `module.unregistered` | `{name}` |

---

## 3. El Manifiesto (MODULE-STD-2.0)

### 3.1 Especificación Completa

El manifiesto es un archivo `manifest.yaml` ubicado en la raíz de cada módulo. Define el contrato entre el módulo y el Core. Sin un manifiesto válido, el módulo no puede ser registrado.

```yaml
# =============================================================================
# MANIFIESTO DE MÓDULO - MODULE-STD-2.0
# =============================================================================
# Este archivo define el contrato entre el módulo y el Core SIGA.

# ──────────────────────────────────────────────
# IDENTIDAD DEL MÓDULO (Obligatorio)
# ──────────────────────────────────────────────
name: "mod-estudiantes"                # Obligatorio. Regex: ^mod-[a-z0-9-]+$
                                       # Debe ser único en el sistema.
                                       # No puede usar nombres reservados:
                                       # core, siga, admin, auth, api, ws

version: "1.2.3"                       # Obligatorio. Semver: X.Y.Z
                                       # X: Major (cambios breaking)
                                       # Y: Minor (nuevas features)
                                       # Z: Patch (bug fixes)

api_version: "v1"                      # Obligatorio. Regex: ^v\d+$
                                       # Define la versión de API que expone.
                                       # Cada versión major tiene su prefijo:
                                       # /api/v1/mod-estudiantes/...

description: >                         # Opcional pero recomendado
  Gestión de estudiantes del IESTP.
  CRUD de datos personales, historial académico,
  documentos, y estado del estudiante.

author: "Equipo SIGA"                  # Opcional

# ──────────────────────────────────────────────
# ENDPOINTS (Obligatorio)
# ──────────────────────────────────────────────
endpoints:
  http: "http://localhost:8006"        # Obligatorio. URL base del módulo.
                                       # El Core proxye a esta URL.
  grpc: ""                             # Opcional (futuro). Para gRPC.

# ──────────────────────────────────────────────
# HEALTH CHECK (Obligatorio)
# ──────────────────────────────────────────────
health_check: "/health"                # Default: /health
                                       # Debe retornar 200 OK con
                                       # {"status": "healthy"}

# ──────────────────────────────────────────────
# DEPENDENCIAS (Nueva en v2)
# ──────────────────────────────────────────────
dependencies:
  requires:                            # Módulos MUST HAVE para funcionar
    - "mod-programas-estudio"          # Sin estos, el módulo no opera
    - "mod-planes-estudio"
  optional:                            # Módulos NICE TO HAVE
    - "mod-notificaciones"             # Sin estos, funcionalidad reducida

# ──────────────────────────────────────────────
# EVENTOS (Obligatorio)
# ──────────────────────────────────────────────
events:
  publishes:                           # Eventos que este módulo emite
    - "estudiante.creado"              #   → Otros módulos se suscriben
    - "estudiante.actualizado"
    - "estudiante.eliminado"
  subscribes:                          # Eventos a los que este módulo
    - "usuario.creado"                 #   reacciona
    - "core.started"
    - "matricula.confirmada"

# ──────────────────────────────────────────────
# PERMISOS (Obligatorio)
# ──────────────────────────────────────────────
permissions:
  requires:                            # Permisos que el módulo necesita
    - "mod-estudiantes:read"           #   (el usuario debe tenerlos)
    - "mod-estudiantes:write"
    - "mod-programas-estudio:read"
  grants:                              # Permisos que el módulo define
    - "mod-estudiantes:read"           #   (se crean automáticamente)
    - "mod-estudiantes:write"
    - "mod-estudiantes:admin"

# ──────────────────────────────────────────────
# CONFIGURACIÓN (Opcional)
# ──────────────────────────────────────────────
config:
  database: "siga_estudiantes"         # Nombre de la BD del módulo
  port: 8006                           # Puerto del módulo
  timeout: 30                          # Timeout por defecto
  cache_ttl: 300                       # TTL de cache para este módulo

# ──────────────────────────────────────────────
# TAGS (Opcional)
# ──────────────────────────────────────────────
tags:
  - "core"
  - "academico"
  - "fase-1"
  - "estudiantes"
```

### 3.2 Validaciones del Manifiesto

| Campo | Tipo | Obligatorio | Validación |
|-------|------|-------------|------------|
| `name` | string | ✅ | Regex: `^mod-[a-z0-9-]+$`. No puede ser nombre reservado. Debe ser único. |
| `version` | string | ✅ | Regex: `^\d+\.\d+\.\d+$` (semver). |
| `api_version` | string | ✅ | Regex: `^v\d+$`. |
| `description` | string | ❌ | Sin validación especial. |
| `author` | string | ❌ | Sin validación especial. |
| `endpoints.http` | string | ✅ | URL válida (debe comenzar con `http://` o `https://`). |
| `health_check` | string | ✅ | Debe comenzar con `/`. Default: `/health`. |
| `dependencies.requires` | list | ❌ | Cada elemento debe ser nombre de módulo válido. |
| `dependencies.optional` | list | ❌ | Cada elemento debe ser nombre de módulo válido. |
| `events.publishes` | list | ✅ | Al menos un evento. Debe contener al menos un punto (ej: `estudiante.creado`). |
| `events.subscribes` | list | ✅ | Al menos un evento. |
| `permissions.requires` | list | ✅ | Formato `{modulo}:{accion}`. |
| `permissions.grants` | list | ✅ | Formato `{modulo}:{accion}`. |
| `config` | dict | ❌ | Sin validación específica. |
| `tags` | list | ❌ | Strings sin validación específica. |

### 3.3 Nombres Reservados

Los siguientes nombres están reservados y no pueden ser usados como nombre de módulo:

```
core, siga, admin, auth, api, ws, health, docs, redoc,
openapi, metrics, system, internal, gateway, registry,
config, identity, resilience, cache, event-bus, nats,
redis, postgres, database, server, public, private
```

---

## 4. ModuleInfo - Representación en Memoria

```python
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum
from datetime import datetime

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

class ModuleInfo(BaseModel):
    """
    Representación en memoria de un módulo registrado en el Socket.
    Combina datos del manifiesto con estado de runtime.
    """
    # ── Datos del Manifiesto ──────────────────
    name: str                                                 # mod-estudiantes
    version: str                                              # 1.2.3
    api_version: str                                          # v1
    description: Optional[str] = None
    endpoints: Dict[str, str]                                 # {"http": "http://localhost:8006"}
    health_check: str = "/health"
    events: Optional[Dict[str, List[str]]] = None             # {"publishes": [...], "subscribes": [...]}
    permissions: Optional[Dict[str, List[str]]] = None        # {"requires": [...], "grants": [...]}
    config: Optional[Dict[str, Any]] = None                   # {"database": "siga_estudiantes", ...}
    dependencies: Optional[Dict[str, List[str]]] = None       # {"requires": [...], "optional": [...]}
    tags: Optional[List[str]] = None                          # ["core", "academico", "fase-1"]

    # ── Estado de Runtime ─────────────────────
    status: ModuleStatus = ModuleStatus.DISCOVERED            # Estado actual
    registered_at: Optional[datetime] = None                  # Fecha de registro
    last_health_check: Optional[datetime] = None              # Último health check
    health_count: int = 0                                     # Intentos de health check exitosos
    fail_count: int = 0                                       # Fallos consecutivos
    circuit_state: CircuitState = CircuitState.CLOSED         # Estado del circuit breaker
    compliance_result: Optional[Dict] = None                  # Resultado de validación

    class Config:
        use_enum_values = True

    # ── Propiedades calculadas ────────────────
    @property
    def is_available(self) -> bool:
        """El módulo puede recibir tráfico."""
        return self.status in (ModuleStatus.HEALTHY, ModuleStatus.DEGRADED)

    @property
    def base_url(self) -> str:
        """URL base del módulo para proxy."""
        return self.endpoints.get("http", "")

    @property
    def health_url(self) -> str:
        """URL completa del health check."""
        base = self.base_url.rstrip("/")
        hc = self.health_check.lstrip("/")
        return f"{base}/{hc}"

    @property
    def compliance_score(self) -> Optional[int]:
        """Score de compliance (0-100)."""
        if self.compliance_result:
            return self.compliance_result.get("score")
        return None

    @property
    def is_compliant(self) -> bool:
        """Cumple con el estándar MODULE-STD-2.0."""
        score = self.compliance_score
        return score is not None and score >= 80

    def dict_for_db(self) -> Dict:
        """Serialización para persistir en core_modules."""
        return {
            "name": self.name,
            "version": self.version,
            "api_version": self.api_version,
            "manifest": self.model_dump(mode="json"),
            "status": self.status.value,
            "endpoint_http": self.endpoints.get("http"),
            "health_check_path": self.health_check,
            "registered_at": self.registered_at,
            "last_health_check": self.last_health_check,
            "health_count": self.health_count,
            "fail_count": self.fail_count,
            "circuit_state": self.circuit_state.value,
            "compliance_result": self.compliance_result,
            "is_active": self.status != ModuleStatus.REMOVED,
        }
```

### 4.1 Cache en Memoria vs Persistencia

La estructura `ModuleInfo` vive en **dos lugares**:

1. **En memoria** (`ModuleRuntime._modules: Dict[str, ModuleInfo]`): acceso rápido O(1), actualización en tiempo real con cada health check.

2. **En BD** (`core_modules` tabla): persistencia para recuperación ante caídas del Core, histórico, y descubrimiento inicial.

**Estrategia**: Al iniciar el Core, se carga `core_modules` desde BD y se sincroniza con el estado actual (health checks en vivo). La memoria es la fuente de verdad para el estado en tiempo real; la BD se actualiza periódicamente y en cada cambio de estado.

---

## 5. ModuleRuntime - El Socket

### 5.1 Arquitectura

El `ModuleRuntime` es el corazón del Socket. Es un singleton que mantiene el registro de todos los módulos y provee métodos para gestionar su ciclo de vida.

```python
import asyncio
from typing import Dict, Optional, List
from datetime import datetime
from app.core.registry.schemas import ModuleInfo, ModuleStatus, CircuitState
from app.core.registry.validator import ManifestValidator
from app.core.database import AsyncSessionLocal
from app.core.gateway.event_bus import event_bus
from app.core.gateway.event_schemas import EventFactory

class ModuleRuntime:
    """
    El Socket del sistema. Gestiona el ciclo de vida de todos los módulos.
    Mantiene un Dict en memoria para acceso O(1) y persiste en BD.
    """

    def __init__(self):
        self._modules: Dict[str, ModuleInfo] = {}  # Cache en memoria
        self._lock = asyncio.Lock()                 # Thread safety para async
        self._validator = ManifestValidator()

    # ──────────────────────────────────────────────
    # Descubrimiento
    # ──────────────────────────────────────────────
    async def discover_modules(self) -> List[str]:
        """
        Descubre módulos de todas las fuentes disponibles.
        Retorna lista de nombres de módulos encontrados.
        """
        discovered = []

        # 1. Filesystem: escanear modules/
        discovered.extend(await self._discover_from_filesystem())

        # 2. Base de Datos: cargar módulos registrados previamente
        discovered.extend(await self._discover_from_database())

        # 3. Docker: (futuro) consultar contenedores con label siga-module=true
        # TODO: Implementar _discover_from_docker()

        # 4. Kubernetes: (futuro) consultar services con anotación siga.io/module
        # TODO: Implementar _discover_from_kubernetes()

        return discovered

    async def _discover_from_filesystem(self) -> List[str]:
        """Escanea el directorio modules/ en busca de manifest.yaml."""
        import os
        import yaml
        from app.core.config import get_settings

        settings = get_settings()
        modules_dir = settings.MODULES_DIR
        discovered = []

        if not os.path.exists(modules_dir):
            return discovered

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
                compliance = await self._validator.validate(manifest, module_path)

                # Verificar si ya existe (actualizar) o es nuevo
                if manifest.name in self._modules:
                    existing = self._modules[manifest.name]
                    # Actualizar datos del manifiesto
                    existing.version = manifest.version
                    existing.api_version = manifest.api_version
                    existing.description = manifest.description
                    existing.endpoints = manifest.endpoints
                    existing.health_check = manifest.health_check
                    existing.events = manifest.events or {}
                    existing.permissions = manifest.permissions or {}
                    existing.config = manifest.config or {}
                    existing.dependencies = manifest.dependencies or {}
                    existing.tags = manifest.tags or []
                    existing.compliance_result = compliance
                    print(f"   🔄 Módulo actualizado: {manifest.name} v{manifest.version}")
                else:
                    # Nuevo módulo
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
                        status=ModuleStatus.DISCOVERED,
                        compliance_result=compliance,
                    )
                    self._modules[manifest.name] = module_info

                discovered.append(manifest.name)

            except Exception as e:
                print(f"   ⚠️ Error al cargar módulo en {module_path}: {e}")

        return discovered

    async def _discover_from_database(self) -> List[str]:
        """Carga módulos persistidos en core_modules."""
        from app.core.registry.models import CoreModule

        try:
            async with AsyncSessionLocal() as session:
                from sqlalchemy import select
                stmt = select(CoreModule).where(CoreModule.is_active == True)
                result = await session.execute(stmt)
                db_modules = result.scalars().all()

                for db_mod in db_modules:
                    if db_mod.name not in self._modules:
                        module_info = ModuleInfo(
                            name=db_mod.name,
                            version=db_mod.version,
                            api_version=db_mod.api_version,
                            endpoints={"http": db_mod.endpoint_http or ""},
                            health_check=db_mod.health_check_path or "/health",
                            status=ModuleStatus(db_mod.status),
                            registered_at=db_mod.registered_at,
                            last_health_check=db_mod.last_health_check,
                            health_count=db_mod.health_count,
                            fail_count=db_mod.fail_count,
                            circuit_state=CircuitState(db_mod.circuit_state),
                            compliance_result=db_mod.compliance_result,
                        )
                        self._modules[db_mod.name] = module_info

                return [m.name for m in db_modules]
        except Exception as e:
            print(f"   ⚠️ Error al cargar módulos desde BD: {e}")
            return []

    # ──────────────────────────────────────────────
    # Registro y Desregistro
    # ──────────────────────────────────────────────
    async def register_module(self, manifest_data: dict) -> ModuleInfo:
        """
        Registra un nuevo módulo en el runtime.
        Flujo completo: validación → registro → health check inicial → evento.
        """
        from app.core.registry.schemas import ModuleManifest

        # 1. Validar schema del manifiesto
        manifest = ModuleManifest(**manifest_data)

        # 2. Validar unicidad
        if manifest.name in self._modules:
            existing = self._modules[manifest.name]
            if existing.status != ModuleStatus.REMOVED:
                raise ValueError(f"El módulo '{manifest.name}' ya está registrado")
            # Si estaba removed, reactivar
            self._modules.pop(manifest.name)

        # 3. Validar compliance
        compliance = await self._validator.validate(manifest, "")

        # 4. Crear ModuleInfo
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
            status=ModuleStatus.REGISTERED,
            compliance_result=compliance,
        )

        # 5. Persistir en BD
        await self._persist_module(module_info)

        # 6. Agregar a caché en memoria
        async with self._lock:
            module_info.registered_at = datetime.utcnow()
            self._modules[module_info.name] = module_info

        # 7. Health check inicial
        await self.check_module_health(module_info.name)

        # 8. Publicar evento
        if event_bus._connected:
            event = EventFactory.module_registered(
                module_info.name,
                module_info.version,
                module_info.endpoints,
            )
            await event_bus.publish(event.event_type.value, event.model_dump(mode="json"))

        return module_info

    async def unregister_module(self, name: str) -> bool:
        """
        Desregistra un módulo del runtime.
        Notifica al módulo (graceful shutdown), remueve del registry y emite evento.
        """
        async with self._lock:
            if name not in self._modules:
                return False

            module = self._modules[name]
            module.status = ModuleStatus.REMOVED

            # 1. Notificar al módulo (graceful shutdown)
            try:
                import httpx
                url = f"{module.base_url.rstrip('/')}/shutdown"
                async with httpx.AsyncClient(timeout=5) as client:
                    await client.post(url, json={"reason": "unregistered"})
            except Exception:
                pass  # El módulo puede no responder

            # 2. Persistir cambio en BD
            await self._update_module_status(name, ModuleStatus.REMOVED)

            # 3. Remover del registro en memoria
            del self._modules[name]

        # 4. Publicar evento
        if event_bus._connected:
            event = EventFactory.module_unregistered(name)
            await event_bus.publish(event.event_type.value, event.model_dump(mode="json"))

        return True

    # ──────────────────────────────────────────────
    # Consultas
    # ──────────────────────────────────────────────
    async def get_module(self, name: str) -> Optional[ModuleInfo]:
        return self._modules.get(name)

    async def list_modules(self, status_filter: Optional[ModuleStatus] = None) -> List[ModuleInfo]:
        if status_filter:
            return [m for m in self._modules.values() if m.status == status_filter]
        return list(self._modules.values())

    async def get_healthy_modules(self) -> List[ModuleInfo]:
        return [m for m in self._modules.values() if m.is_available]

    async def get_module_count(self) -> int:
        return len(self._modules)

    # ──────────────────────────────────────────────
    # Health Check
    # ──────────────────────────────────────────────
    async def check_module_health(self, name: str, timeout: int = 5) -> bool:
        """
        Ejecuta health check contra un módulo.
        Actualiza estado, fail_count, health_count y circuit_state.
        """
        if name not in self._modules:
            return False

        module = self._modules[name]

        try:
            import httpx
            url = module.health_url
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.get(url)

            if response.status_code == 200:
                async with self._lock:
                    module.health_count += 1
                    module.fail_count = 0
                    module.last_health_check = datetime.utcnow()

                    # Transiciones de estado
                    if module.status == ModuleStatus.UNHEALTHY:
                        module.status = ModuleStatus.HEALTHY
                        module.circuit_state = CircuitState.CLOSED
                    elif module.status == ModuleStatus.DEGRADED:
                        module.status = ModuleStatus.HEALTHY
                    elif module.status in (ModuleStatus.REGISTERED, ModuleStatus.OFFLINE):
                        module.status = ModuleStatus.HEALTHY
                    elif module.status == ModuleStatus.HEALTHY:
                        pass  # Se mantiene healthy

                    # Half-open → Closed si ya se recuperó
                    if module.circuit_state == CircuitState.HALF_OPEN and module.health_count >= 3:
                        module.circuit_state = CircuitState.CLOSED

                return True
            else:
                raise Exception(f"Health check retornó {response.status_code}")

        except Exception as e:
            async with self._lock:
                module.fail_count += 1
                module.health_count = 0
                module.last_health_check = datetime.utcnow()

                # Transiciones de estado por fallo
                if module.fail_count >= 5:
                    module.status = ModuleStatus.UNHEALTHY
                    module.circuit_state = CircuitState.OPEN
                    # Publicar evento de circuit breaker abierto
                    if event_bus._connected:
                        await event_bus.publish(
                            "circuit_breaker.opened",
                            {"module": name, "fail_count": module.fail_count}
                        )
                elif module.fail_count >= 3:
                    module.status = ModuleStatus.DEGRADED
                elif module.status == ModuleStatus.HEALTHY and module.fail_count >= 1:
                    module.status = ModuleStatus.DEGRADED

            return False

    # ──────────────────────────────────────────────
    # Actualización de Estado
    # ──────────────────────────────────────────────
    async def update_module_status(self, name: str, status: ModuleStatus):
        async with self._lock:
            if name in self._modules:
                old_status = self._modules[name].status
                self._modules[name].status = status

                # Publicar evento de cambio de estado
                if old_status != status and event_bus._connected:
                    await event_bus.publish(
                        "module.health.changed",
                        {
                            "module": name,
                            "old_status": old_status.value,
                            "new_status": status.value,
                        }
                    )

    # ──────────────────────────────────────────────
    # Persistencia
    # ──────────────────────────────────────────────
    async def _persist_module(self, module: ModuleInfo):
        """Persiste o actualiza un módulo en core_modules."""
        from app.core.registry.models import CoreModule

        async with AsyncSessionLocal() as session:
            from sqlalchemy import select
            stmt = select(CoreModule).where(CoreModule.name == module.name)
            result = await session.execute(stmt)
            db_module = result.scalar_one_or_none()

            if db_module:
                # Actualizar existente
                for key, value in module.dict_for_db().items():
                    setattr(db_module, key, value)
                db_module.updated_at = datetime.utcnow()
            else:
                # Crear nuevo
                db_module = CoreModule(**module.dict_for_db())
                session.add(db_module)

            await session.commit()

    async def _update_module_status(self, name: str, status: ModuleStatus):
        """Actualiza solo el estado en BD."""
        from app.core.registry.models import CoreModule

        async with AsyncSessionLocal() as session:
            from sqlalchemy import select
            stmt = select(CoreModule).where(CoreModule.name == name)
            result = await session.execute(stmt)
            db_module = result.scalar_one_or_none()
            if db_module:
                db_module.status = status.value
                db_module.updated_at = datetime.utcnow()
                await session.commit()

    async def _update_module_health_in_db(self, name: str):
        """Persiste datos de health check en BD."""
        if name not in self._modules:
            return
        module = self._modules[name]
        from app.core.registry.models import CoreModule
        async with AsyncSessionLocal() as session:
            from sqlalchemy import select
            stmt = select(CoreModule).where(CoreModule.name == name)
            result = await session.execute(stmt)
            db_module = result.scalar_one_or_none()
            if db_module:
                db_module.status = module.status.value
                db_module.last_health_check = module.last_health_check
                db_module.health_count = module.health_count
                db_module.fail_count = module.fail_count
                db_module.circuit_state = module.circuit_state.value
                db_module.updated_at = datetime.utcnow()
                await session.commit()

# Singleton global
module_runtime = ModuleRuntime()
```

### 5.2 Hilos y Concurrencia

El `ModuleRuntime` usa `asyncio.Lock` para operaciones de escritura (`register`, `unregister`, `update_status`, `update_health`). Las operaciones de lectura (`get_module`, `list_modules`) no requieren lock porque el Dict de Python es thread-safe para lecturas concurrentes en asyncio (single-threaded event loop).

**⚠️ Importante**: Si en el futuro se usa multi-threading (ej: Gunicorn con workers), se debe reemplazar `asyncio.Lock` por `threading.Lock` o usar un patrón de actor/message-passing.

---

## 6. Persistencia del Registry

### 6.1 Tabla `core_modules`

```sql
CREATE TABLE core_modules (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) UNIQUE NOT NULL,
    version         VARCHAR(20) NOT NULL,
    api_version     VARCHAR(10) NOT NULL,
    manifest        JSONB NOT NULL,                     -- Manifiesto completo
    status          VARCHAR(20) DEFAULT 'discovered',
    endpoint_http   VARCHAR(255),
    health_check_path VARCHAR(100) DEFAULT '/health',
    registered_at   TIMESTAMP DEFAULT NOW(),
    last_health_check TIMESTAMP,
    health_count    INTEGER DEFAULT 0,
    fail_count      INTEGER DEFAULT 0,
    circuit_state   VARCHAR(20) DEFAULT 'closed',
    compliance_result JSONB,
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_core_modules_status ON core_modules(status);
CREATE INDEX idx_core_modules_is_active ON core_modules(is_active);
CREATE INDEX idx_core_modules_circuit_state ON core_modules(circuit_state);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_core_modules_updated_at
    BEFORE UPDATE ON core_modules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 6.2 Modelo SQLAlchemy

```python
# app/core/registry/models.py

from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from app.core.database import Base

class CoreModule(Base):
    __tablename__ = "core_modules"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    version = Column(String(20), nullable=False)
    api_version = Column(String(10), nullable=False)
    manifest = Column(JSONB, nullable=False)
    status = Column(String(20), default="discovered", index=True)
    endpoint_http = Column(String(255), nullable=True)
    health_check_path = Column(String(100), default="/health")
    registered_at = Column(DateTime(timezone=True), server_default=func.now())
    last_health_check = Column(DateTime(timezone=True), nullable=True)
    health_count = Column(Integer, default=0)
    fail_count = Column(Integer, default=0)
    circuit_state = Column(String(20), default="closed", index=True)
    compliance_result = Column(JSONB, nullable=True)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
```

### 6.3 Estrategia de Sincronización Memoria ↔ BD

| Evento | Acción en Memoria | Acción en BD |
|--------|-------------------|--------------|
| Core inicia | Cargar desde DB y descubrir filesystem | - |
| Nuevo módulo descubierto | Agregar a `_modules` | INSERT en `core_modules` |
| Módulo existente actualizado | Actualizar en `_modules` | UPDATE en `core_modules` |
| Módulo se desregistra | Remover de `_modules` | UPDATE `is_active=false` |
| Health check exitoso | Actualizar `health_count`, `fail_count`, `status` | UPDATE cada N checks (no en cada uno para evitar carga) |
| Health check fallido | Actualizar `fail_count`, `status`, `circuit_state` | UPDATE inmediato si cambia de estado |
| Core se apaga | - | Estado actual ya está persistido |

**Frecuencia de persistencia de health checks**: Se persiste en BD cada 5 health checks exitosos consecutivos (para reducir escrituras). Los cambios de estado (HEALTHY → DEGRADED → UNHEALTHY) se persisten inmediatamente.

---

## 7. Algoritmo de Descubrimiento

### 7.1 Flujo Completo

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    ALGORITMO DE DESCUBRIMIENTO                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  discover_modules()                                                     │
│  ├── 1. Filesystem                                                      │
│  │    ├── Escanear modules/                                             │
│  │    ├── Por cada subdirectorio:                                       │
│  │    │   ├── ¿Existe manifest.yaml? → No → Saltar                     │
│  │    │   ├── Cargar YAML                                              │
│  │    │   ├── Validar con ModuleManifest (Pydantic)                     │
│  │    │   ├── Validar compliance (ManifestValidator)                    │
│  │    │   ├── ¿Ya existe en _modules?                                   │
│  │    │   │   ├── Sí → Actualizar datos del manifiesto                 │
│  │    │   │   └── No → Crear ModuleInfo + Agregar a _modules           │
│  │    │   └── Agregar a lista de descubiertos                          │
│  │    └── Retornar nombres descubiertos                                │
│  │                                                                      │
│  ├── 2. Base de Datos                                                   │
│  │    ├── SELECT * FROM core_modules WHERE is_active = true            │
│  │    ├── Por cada registro:                                            │
│  │    │   ├── ¿Ya existe en _modules? → Sí → Saltar (priorizar FS)    │
│  │    │   └── No → Crear ModuleInfo desde DB + Agregar a _modules      │
│  │    └── Retornar nombres cargados                                   │
│  │                                                                      │
│  ├── 3. Docker (futuro)                                                 │
│  │    ├── docker ps --filter "label=siga-module=true"                   │
│  │    ├── Por cada contenedor:                                          │
│  │    │   ├── Extraer manifest desde docker inspect                     │
│  │    │   ├── Validar                                                  │
│  │    │   └── Agregar a _modules                                       │
│  │    └── Retornar nombres descubiertos                                │
│  │                                                                      │
│  └── 4. Kubernetes (futuro)                                             │
│       ├── kubectl get pods -l siga.io/module=true                       │
│       ├── Por cada pod:                                                 │
│       │   ├── Extraer anotaciones (siga.io/manifest)                    │
│       │   ├── Validar                                                  │
│       │   └── Agregar a _modules                                       │
│       └── Retornar nombres descubiertos                                │
│                                                                         │
│  health_check_inicial()                                                 │
│  ├── Por cada módulo en _modules:                                       │
│  │   ├── Ejecutar GET /health (timeout: 5s)                           │
│  │   ├── ¿Responde 200?                                                │
│  │   │   ├── Sí → status = HEALTHY                                     │
│  │   │   └── No → status = OFFLINE                                     │
│  │   └── Actualizar en memoria y BD                                    │
│  └── Retornar conteo (healthy / total)                                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Orden de Prioridad

Cuando un módulo se encuentra en múltiples fuentes, el orden de prioridad es:

1. **Filesystem** (mayor prioridad) — contiene la versión más reciente del manifiesto
2. **Base de Datos** — registros históricos, usado si filesystem no está disponible
3. **Docker** — (futuro) para entornos containerizados
4. **Kubernetes** — (futuro) para orquestación en producción

Si un módulo existe en filesystem y en BD, se usa la información del filesystem (más actualizada) y se actualiza la BD.

### 7.3 Health Check Inicial Después del Descubrimiento

```python
async def initial_health_check():
    """Ejecuta health check para todos los módulos descubiertos."""
    modules = await module_runtime.list_modules()
    healthy = 0
    for module in modules:
        success = await module_runtime.check_module_health(module.name, timeout=5)
        if success:
            healthy += 1
            await module_runtime.update_module_status(module.name, ModuleStatus.HEALTHY)
        else:
            await module_runtime.update_module_status(module.name, ModuleStatus.OFFLINE)
    return healthy, len(modules)
```

---

## 8. Validación de Manifiestos

### 8.1 Validación de Schema (Pydantic)

El schema `ModuleManifest` (Pydantic) valida:

```python
class ModuleManifest(BaseModel):
    name: str = Field(pattern=r"^mod-[a-z0-9-]+$")
    version: str = Field(pattern=r"^\d+\.\d+\.\d+$")
    api_version: str = Field(pattern=r"^v\d+$")
    description: Optional[str] = None
    author: Optional[str] = None
    endpoints: Dict[str, str]  # {"http": "http://localhost:8006"}
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
        if not v["http"].startswith("http://") and not v["http"].startswith("https://"):
            raise ValueError(f"Endpoint http inválido: {v['http']}")
        return v

    @field_validator("health_check")
    @classmethod
    def validate_health_check(cls, v):
        if not v.startswith("/"):
            raise ValueError("health_check debe comenzar con /")
        return v

    @field_validator("name")
    @classmethod
    def validate_name_not_reserved(cls, v):
        reserved = ["core", "siga", "admin", "auth", "api", "ws",
                     "health", "docs", "redoc", "openapi", "metrics",
                     "system", "internal", "gateway", "registry", "config",
                     "identity", "resilience", "cache", "event-bus",
                     "nats", "redis", "postgres", "database", "server",
                     "public", "private"]
        name_without_prefix = v.replace("mod-", "")
        if name_without_prefix in reserved:
            raise ValueError(f"Nombre '{v}' usa un prefijo reservado: '{name_without_prefix}'")
        return v
```

### 8.2 Validación de Compliance (MODULE-STD-2.0)

```python
class ManifestValidator:
    """
    Valida que un módulo cumpla con el estándar MODULE-STD-2.0.
    Calcula un compliance score (0-100). Mínimo 80% para ser compliant.
    """

    COMPLIANCE_STEPS = [
        # (nombre, descripción, peso)
        ("schema_valid", "Schema del manifiesto válido", 15),
        ("name_valid", "Nombre cumple formato mod-[a-z0-9-]+", 5),
        ("name_not_reserved", "Nombre no reservado", 5),
        ("http_endpoint_valid", "Endpoint HTTP válido y accesible", 15),
        ("health_check_exists", "Health check endpoint configurado", 10),
        ("health_check_responds", "Health check responde 200 OK", 15),
        ("main_py_exists", "main.py existe en el módulo", 5),
        ("requirements_txt_exists", "requirements.txt existe", 5),
        ("events_declared", "Eventos declarados son válidos (publishes/subscribes)", 10),
        ("permissions_valid", "Permisos declarados son válidos (requires/grants)", 10),
        ("dependencies_valid", "Dependencias declaradas existen en el runtime", 5),
    ]

    async def validate(self, manifest: ModuleManifest, module_path: str) -> Dict:
        """
        Ejecuta todas las validaciones de compliance.
        Retorna: {"passed": [...], "failed": [...], "score": int, "compliant": bool}
        """
        passed = []
        failed = []
        total_weight = sum(w for _, _, w in self.COMPLIANCE_STEPS)

        for step_name, step_desc, weight in self.COMPLIANCE_STEPS:
            try:
                result = await self._run_step(step_name, manifest, module_path)
                if result is True:
                    passed.append({"step": step_name, "description": step_desc, "weight": weight})
                else:
                    failed.append({"step": step_name, "description": step_desc, "weight": weight, "reason": result})
            except Exception as e:
                failed.append({"step": step_name, "description": step_desc, "weight": weight, "reason": str(e)})

        earned = sum(item["weight"] for item in passed)
        score = int((earned / total_weight) * 100) if total_weight > 0 else 0
        compliant = score >= 80

        return {
            "passed": [p["step"] for p in passed],
            "failed": [f["step"] for f in failed],
            "details": {"passed": passed, "failed": failed},
            "score": score,
            "compliant": compliant,
            "total_steps": len(self.COMPLIANCE_STEPS),
            "passed_steps": len(passed),
            "failed_steps": len(failed),
        }
```

### 8.3 Cálculo de Compliance Score

```
Compliance Score = (Suma de pesos de pasos exitosos / Suma total de pesos) × 100

Ejemplo:
- Todos los pasos exitosos: score = 100% → COMPLIANT
- Falló health_check_responds (peso 15): score = 85% → COMPLIANT (≥80)
- Falló health_check_responds (15) + http_endpoint_valid (15) + events_declared (10): score = 60% → NOT COMPLIANT
```

### 8.4 ¿Qué pasa si un módulo no es compliant?

| Score | Acción |
|-------|--------|
| 100% | Registro completo, todos los features habilitados |
| 80-99% | Registro completo, warning en logs |
| 50-79% | Registro parcial, modo "compatibility" (algunas features del Core limitadas) |
| < 50% | Registro denegado, error al desarrollador |

---

## 9. Health Check System

### 9.1 Health Check Inicial (al registrar)

```python
async def initial_health_check(module_name: str) -> bool:
    """
    Health check ejecutado inmediatamente después de registrar un módulo.
    Timeout: 5 segundos.
    """
    module = await module_runtime.get_module(module_name)
    if not module:
        return False

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(module.health_url)

        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "healthy":
                await module_runtime.update_module_status(module_name, ModuleStatus.HEALTHY)
                return True

        await module_runtime.update_module_status(module_name, ModuleStatus.OFFLINE)
        return False

    except Exception:
        await module_runtime.update_module_status(module_name, ModuleStatus.OFFLINE)
        return False
```

### 9.2 Health Check Periódico (HealthMonitor)

```python
# app/core/resilience/health_monitor.py

import asyncio
from typing import Dict, Optional
from datetime import datetime
from app.core.config import get_settings
from app.core.registry.runtime import module_runtime
from app.core.registry.schemas import ModuleStatus

settings = get_settings()

class HealthMonitor:
    """
    Monitorea la salud de todos los módulos registrados.
    Ejecuta health checks periódicos y actualiza el estado en ModuleRuntime.
    """

    def __init__(self):
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self._interval = settings.HEALTH_CHECK_INTERVAL
        self._timeout = settings.HEALTH_CHECK_TIMEOUT

    async def start_monitoring(self):
        """Inicia el loop de monitoreo periódico."""
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._monitoring_loop())
        print(f"✅ HealthMonitor iniciado (intervalo: {self._interval}s)")

    async def stop_monitoring(self):
        """Detiene el loop de monitoreo."""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        print("✅ HealthMonitor detenido")

    async def _monitoring_loop(self):
        """Loop principal de monitoreo."""
        while self._running:
            try:
                await self._check_all_modules()
            except Exception as e:
                print(f"⚠️ Error en HealthMonitor: {e}")
            await asyncio.sleep(self._interval)

    async def _check_all_modules(self):
        """Ejecuta health check para todos los módulos activos."""
        modules = await module_runtime.list_modules()
        for module in modules:
            if module.status in (ModuleStatus.HEALTHY, ModuleStatus.DEGRADED, ModuleStatus.UNHEALTHY):
                await self.check_module(module.name)

    async def check_module(self, module_name: str) -> bool:
        """Health check para un módulo específico."""
        return await module_runtime.check_module_health(module_name, self._timeout)

# Singleton
health_monitor = HealthMonitor()
```

### 9.3 Health Check Response Esperada

Cada módulo debe exponer un endpoint `/health` que retorne:

```json
// HTTP 200 OK
{
    "status": "healthy",
    "module": "mod-estudiantes",
    "version": "1.2.3",
    "timestamp": "2026-06-26T12:00:00Z",
    "uptime_seconds": 3600,
    "database": "connected",
    "dependencies": {
        "mod-programas-estudio": "healthy",
        "mod-planes-estudio": "healthy"
    }
}
```

Si el módulo tiene problemas internos (BD caída, dependencia no disponible):

```json
// HTTP 200 OK (aún responde, pero reporta problemas)
{
    "status": "degraded",
    "module": "mod-estudiantes",
    "version": "1.2.3",
    "timestamp": "2026-06-26T12:00:00Z",
    "database": "disconnected",
    "dependencies": {
        "mod-programas-estudio": "healthy"
    },
    "message": "Base de datos no disponible, usando cache local"
}
```

```json
// HTTP 503 Service Unavailable
{
    "status": "unhealthy",
    "module": "mod-estudiantes",
    "version": "1.2.3",
    "timestamp": "2026-06-26T12:00:00Z",
    "message": "Módulo no puede procesar requests"
}
```

### 9.4 Umbrales de Health Check

| Condición | Acción | Estado Resultante |
|-----------|--------|-------------------|
| 1-2 fallos consecutivos | Marcar como DEGRADED | DEGRADED |
| 3+ fallos consecutivos | Marcar como UNHEALTHY | UNHEALTHY |
| 5+ fallos consecutivos | Abrir Circuit Breaker | UNHEALTHY + CB OPEN |
| 1 éxito después de CB OPEN | Transición a HALF_OPEN | UNHEALTHY + CB HALF_OPEN |
| 3 éxitos consecutivos en HALF_OPEN | Cerrar CB | HEALTHY |
| 1 fallo en HALF_OPEN | Volver a OPEN | UNHEALTHY + CB OPEN |

---

## 10. Endpoints del Socket (API)

| Endpoint | Método | Propósito | Request | Response |
|----------|--------|-----------|---------|----------|
| `/core/modules` | GET | Listar todos los módulos | Query: `?status=healthy` | `[ModuleInfo, ...]` |
| `/core/modules/register` | POST | Registrar nuevo módulo | `ModuleManifest` (JSON) | `ModuleInfo` + compliance |
| `/core/modules/{name}` | GET | Detalle de un módulo | - | `ModuleInfo` |
| `/core/modules/{name}` | DELETE | Desregistrar un módulo | - | `{"success": bool}` |
| `/core/modules/{name}/health` | GET | Health check de un módulo | - | `{"status", "response_time"}` |
| `/core/modules/{name}/compliance` | GET | Compliance de un módulo | - | `{"score", "compliant", "checks"}` |
| `/core/modules/{name}/status` | PUT | Actualizar estado manual | `{"status": "healthy"}` | `{"success": bool}` |

### Implementación de Rutas

```python
# app/routers/core_routes.py

from fastapi import APIRouter, HTTPException
from app.core.registry.runtime import module_runtime
from app.core.registry.schemas import ModuleManifest, ModuleStatus
from app.core.registry.validator import ManifestValidator

router = APIRouter(prefix="/modules", tags=["Socket API"])

@router.get("")
async def list_modules(status: Optional[str] = None):
    """Lista todos los módulos registrados, opcionalmente filtrados por estado."""
    if status:
        status_filter = ModuleStatus(status)
        modules = await module_runtime.list_modules(status_filter)
    else:
        modules = await module_runtime.list_modules()
    return [
        {
            "name": m.name,
            "version": m.version,
            "api_version": m.api_version,
            "status": m.status.value,
            "circuit_state": m.circuit_state.value,
            "health_count": m.health_count,
            "fail_count": m.fail_count,
            "compliance_score": m.compliance_score,
            "last_health_check": m.last_health_check,
            "tags": m.tags,
        }
        for m in modules
    ]

@router.post("/register")
async def register_module(manifest: ModuleManifest):
    """Registra un nuevo módulo en el sistema."""
    try:
        module = await module_runtime.register_module(manifest.model_dump())
        return {
            "success": True,
            "module": {
                "name": module.name,
                "version": module.version,
                "status": module.status.value,
                "compliance": module.compliance_result,
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{name}")
async def get_module(name: str):
    """Obtiene detalle completo de un módulo."""
    module = await module_runtime.get_module(name)
    if not module:
        raise HTTPException(status_code=404, detail="Módulo no encontrado")
    return module.model_dump(mode="json")

@router.delete("/{name}")
async def unregister_module(name: str):
    """Desregistra un módulo del sistema."""
    success = await module_runtime.unregister_module(name)
    if not success:
        raise HTTPException(status_code=404, detail="Módulo no encontrado")
    return {"success": True}

@router.get("/{name}/health")
async def check_module_health(name: str):
    """Ejecuta health check en vivo para un módulo."""
    module = await module_runtime.get_module(name)
    if not module:
        raise HTTPException(status_code=404, detail="Módulo no encontrado")
    
    success = await module_runtime.check_module_health(name)
    return {
        "name": name,
        "status": module.status.value if module else "unknown",
        "healthy": success,
        "response_time": "N/A",  # TODO: medir tiempo real
        "circuit_state": module.circuit_state.value if module else "unknown",
        "fail_count": module.fail_count if module else 0,
    }

@router.get("/{name}/compliance")
async def get_module_compliance(name: str):
    """Obtiene el resultado de compliance de un módulo."""
    module = await module_runtime.get_module(name)
    if not module:
        raise HTTPException(status_code=404, detail="Módulo no encontrado")
    return {
        "name": name,
        "version": module.version,
        "compliant": module.is_compliant,
        "score": module.compliance_score,
        "result": module.compliance_result,
    }

@router.put("/{name}/status")
async def update_module_status(name: str, status_data: dict):
    """Actualiza manualmente el estado de un módulo."""
    new_status = status_data.get("status")
    if not new_status:
        raise HTTPException(status_code=400, detail="Campo 'status' requerido")
    try:
        status = ModuleStatus(new_status)
        await module_runtime.update_module_status(name, status)
        return {"success": True}
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Estado inválido: {new_status}")
```

---

## 11. Integración con Circuit Breaker

### 11.1 Flujo de Integración

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Gateway    │────→│  CircuitBreaker  │────→│  ModuleRuntime  │
│  (HTTPProxy) │     │                  │     │                 │
│              │     │  Estado del CB   │     │  Estado del     │
│   call()     │     │  para el módulo  │     │  módulo         │
│              │     │                  │     │                 │
│              │     │  CLOSED  → call  │     │  HEALTHY        │
│              │     │  OPEN    → fallb.│     │  DEGRADED       │
│              │     │  HALF_OP → test  │     │  UNHEALTHY      │
└──────────────┘     └──────────────────┘     └─────────────────┘
                            │                        │
                            ▼                        ▼
                     ┌──────────────────┐     ┌─────────────────┐
                     │  FallbackManager │     │  HealthMonitor  │
                     │                  │     │                 │
                     │  Cache → Static  │     │  Loop cada 30s  │
                     │  → Degraded → 503│     │  Actualiza      │
                     └──────────────────┘     │  ModuleRuntime  │
                                               └─────────────────┘
```

### 11.2 Comportamiento Detallado

| Estado del Módulo | Circuit Breaker | Comportamiento del Gateway |
|-------------------|-----------------|---------------------------|
| HEALTHY | CLOSED | Proxy normal, cache habilitado |
| DEGRADED | CLOSED | Proxy normal, cache habilitado, respuesta incluye header `X-SIGA-Degraded: true` |
| UNHEALTHY | OPEN | No se envía tráfico al módulo. Se activa Fallback Manager. Health Monitor sigue verificando cada 30s. |
| UNHEALTHY | HALF_OPEN | Se permite 1 request de prueba. Si éxito → CLOSED. Si fallo → OPEN. |
| OFFLINE | OPEN | No se intenta conexión. Módulo requiere intervención manual. |

### 11.3 Eventos de Circuit Breaker

Cuando el Circuit Breaker cambia de estado, se publican eventos en NATS:

```python
# Cuando se abre el circuito (5 fallos consecutivos)
await event_bus.publish("circuit_breaker.opened", {
    "module": "mod-estudiantes",
    "fail_count": 5,
    "timestamp": "2026-06-26T12:00:00Z"
})

# Cuando se cierra el circuito (recuperación)
await event_bus.publish("circuit_breaker.closed", {
    "module": "mod-estudiantes",
    "recovery_time_seconds": 120,
    "timestamp": "2026-06-26T12:02:00Z"
})
```

---

## 12. Eventos del Socket

| Evento | Disparador | Datos | Suscriptores típicos |
|--------|-----------|-------|---------------------|
| `module.registered` | Nuevo módulo registrado exitosamente | `{module_name, version, endpoints, api_version}` | Core Gateway (actualizar rutas), Frontend (actualizar UI) |
| `module.unregistered` | Módulo desregistrado | `{module_name}` | Core Gateway (remover rutas), Frontend |
| `module.health.changed` | Cambio de estado de salud | `{module_name, old_status, new_status, fail_count}` | Health Dashboard, sistema de alertas |
| `module.compliance.changed` | Cambio en compliance (nueva versión) | `{module_name, old_score, new_score, compliant}` | Administradores, CI/CD |
| `module.validated` | Módulo validado exitosamente | `{module_name, version, score}` | Core (continuar registro) |
| `circuit_breaker.opened` | Circuit breaker se abre | `{module, fail_count, timestamp}` | Sistema de alertas, logging |
| `circuit_breaker.closed` | Circuit breaker se cierra | `{module, recovery_time, timestamp}` | Sistema de alertas |

---

## 13. Seguridad del Socket

### 13.1 Principios de Seguridad

1. **Solo el Core puede registrar/desregistrar módulos**: Los endpoints de registro (`POST /core/modules/register`, `DELETE /core/modules/{name}`) solo son accesibles desde localhost o mediante token interno de administración.

2. **Autenticación de módulos**: Cada módulo puede autenticarse ante el Core usando un token interno (API key) configurado en el manifiesto. Esto evita que módulos no autorizados se registren.

3. **Validación de origen**: En desarrollo, solo se permiten módulos desde `localhost`. En producción, se configura una whitelist de IPs/redes.

4. **Rate limiting**: Los endpoints del Socket tienen rate limiting (100 requests/minuto por IP) para evitar ataques de registro masivo.

5. **Validación estricta de manifiestos**: El schema Pydantic y el compliance validator garantizan que solo módulos que cumplan el estándar sean registrados.

### 13.2 Token Interno de Módulo

```python
# Generación de token interno para un módulo
def generate_module_token(module_name: str, secret: str) -> str:
    """Genera un token HMAC para autenticar un módulo."""
    import hmac
    import hashlib
    import time
    message = f"{module_name}:{int(time.time())}"
    signature = hmac.new(
        secret.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()
    return f"{message}:{signature}"

# Validación
def validate_module_token(token: str, module_name: str, secret: str) -> bool:
    """Valida un token de módulo."""
    parts = token.split(":")
    if len(parts) != 3:
        return False
    name, timestamp, sig = parts
    if name != module_name:
        return False
    # Verificar expiración (24 horas)
    if int(time.time()) - int(timestamp) > 86400:
        return False
    expected = hmac.new(
        secret.encode(),
        f"{name}:{timestamp}".encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(sig, expected)
```

### 13.3 Endpoints Protegidos del Socket

| Endpoint | Método | Autenticación | Rate Limit | Acceso |
|----------|--------|--------------|------------|--------|
| `/core/modules` | GET | No requerida | 100/min | Público |
| `/core/modules/register` | POST | Token interno | 20/min | Solo Core/localhost |
| `/core/modules/{name}` | GET | No requerida | 100/min | Público |
| `/core/modules/{name}` | DELETE | Token interno | 10/min | Solo Core/localhost |
| `/core/modules/{name}/status` | PUT | Token interno | 30/min | Solo Core/localhost |

---

## 14. Historial de Cambios

| Versión | Fecha | Autor | Descripción |
|---------|-------|-------|-------------|
| 1.0 | 2026-06-26 | Equipo Arquitectura | Versión inicial del documento. Define el Socket/Module Runtime, ciclo de vida de módulos, manifiesto MODULE-STD-2.0, algoritmos de descubrimiento, validación, health check, y seguridad. |
