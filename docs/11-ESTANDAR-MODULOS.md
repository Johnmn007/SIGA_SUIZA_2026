# Estándar de Módulos - MODULE-STD-2.0

> **Versión:** 2.0 | **Última actualización:** Junio 2026 | **Estado:** Aprobado

---

## 1. Propósito

Definir el estándar que todo módulo debe cumplir para ser registrado en el Core SIGA. Este estándar garantiza interoperabilidad, mantenibilidad y consistencia entre todos los módulos del sistema. El cumplimiento de este estándar es **obligatorio** para que un módulo sea aceptado en el ecosistema SIGA.

### 1.1 Objetivos

1. **Interoperabilidad**: Todos los módulos se comunican con el Core de la misma forma
2. **Mantenibilidad**: Cualquier desarrollador puede entender y modificar cualquier módulo
3. **Consistencia**: APIs, modelos, y configuraciones siguen las mismas convenciones
4. **Escalabilidad**: Nuevos módulos se integran sin modificar el Core
5. **Gobernanza**: El Core puede monitorizar y gestionar todos los módulos uniformemente

---

## 2. Estructura de Directorios

### 2.1 Árbol Completo

```
mod-{nombre}/
│
├── manifest.yaml              # REQUERIDO - Metadatos del módulo
├── main.py                    # REQUERIDO - Entry point del módulo
├── models.py                  # REQUERIDO - Modelos SQLAlchemy
├── routes.py                  # REQUERIDO - Endpoints FastAPI
│
├── database.py                # RECOMENDADO - Configuración de BD
├── event_bus.py               # RECOMENDADO - Integración con NATS
├── auth.py                    # RECOMENDADO - Validación de tokens
├── services/                  # RECOMENDADO - Lógica de negocio
│   ├── __init__.py
│   └── calculo_notas.py
├── schemas.py                 # RECOMENDADO - Pydantic schemas
│
├── tests/                     # RECOMENDADO - Pruebas
│   ├── __init__.py
│   ├── test_routes.py
│   ├── test_services.py
│   └── test_contracts.py      # OBLIGATORIO - Consumer-Driven Contracts (ej. Pact)
│
├── requirements.txt           # RECOMENDADO - Dependencias Python
├── .env.example               # RECOMENDADO - Variables de entorno
├── Dockerfile                 # RECOMENDADO - Containerización
└── README.md                  # RECOMENDADO - Documentación del módulo
```

### 2.2 Convenciones de Naming

| Elemento | Convención | Ejemplo |
|----------|-----------|---------|
| Directorio del módulo | `mod-{nombre}` | `mod-planes-estudio` |
| Módulo Python | snake_case | `mod_planes_estudio/` |
| Clases | PascalCase | `PlanEstudio`, `UnidadDidactica` |
| Funciones | snake_case | `calcular_nota_final()` |
| Variables | snake_case | `nota_final` |
| Constantes | UPPER_CASE | `CREDITOS_MAX` |
| Tablas BD | snake_case plural | `unidades_didacticas` |
| Columnas BD | snake_case | `nota_final` |

### 2.3 Nombres de Módulo Permitidos

```
Regex: ^mod-[a-z0-9]+(-[a-z0-9]+)*$

Ejemplos válidos:
  - mod-planes-estudio
  - mod-programas-estudio
  - mod-estudiantes
  - mod-matricula
  - mod-evaluacion
  - mod-convalidaciones
  - mod-traslados
  - mod-reingresos
  - mod-reportes
  - mod-usuarios

Nombres RESERVADOS (no usar):
  core, system, admin, api, ws, health, docs, auth, user, config, test, internal
```

---

## 3. Especificación del Manifiesto

### 3.1 Formato YAML Completo

```yaml
# manifest.yaml
name: "mod-planes-estudio"
version: "1.2.0"
api_version: "v1"
description: "Gestión de planes de estudio, módulos formativos, unidades didácticas, capacidades e indicadores de logro"
author: "Equipo SIGA - Desarrollo"

repository: "https://github.com/siga/mod-planes-estudio"
license: "MIT"

endpoints:
  http: "http://localhost:8001"
  health: "/health"
  ready: "/ready"
  manifest: "/manifest"

dependencies:
  requires:
    - "mod-programas-estudio"
  optional:
    - "mod-evaluacion"

events:
  publishes:
    - "planes.plan.creado"
    - "planes.plan.actualizado"
    - "planes.plan.eliminado"
    - "planes.modulo.creado"
    - "planes.ud.creada"
  subscribes:
    - "core.started"
    - "programas.programa.eliminado"

permissions:
  requires:
    - "mod-planes-estudio:read"
    - "mod-planes-estudio:write"
  grants:
    - "mod-planes-estudio:admin"
    - "mod-planes-estudio:import"
    - "mod-planes-estudio:export"

config:
  database:
    db_name: "mod_planes_estudio"
    pool_size: 5
    max_overflow: 10
  port: 8001
  timeout: 30
  cache_ttl: 300

tags:
  - academico
  - fase-1
  - core-module
```

### 3.2 Validaciones del Manifiesto

| Campo | Regla de Validación | Error si |
|-------|-------------------|----------|
| `name` | `^mod-[a-z0-9]+(-[a-z0-9]+)*$` | No cumple el patrón o es nombre reservado |
| `version` | `^\d+\.\d+\.\d+$` (semver) | Formato inválido |
| `api_version` | `^v\d+$` | No comienza con `v` |
| `endpoints.http` | URL válida con protocolo | Falta `http://` o `https://` |
| `endpoints.health` | Comienza con `/` | No es ruta absoluta |
| `dependencies.requires` | Lista de strings | No es array o contiene duplicados |
| `permissions.requires` | Lista de strings con formato `{mod}:{accion}` | No cumple el patrón |

### 3.3 Esquema de Validación (JSON Schema)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["name", "version", "api_version", "endpoints"],
  "properties": {
    "name": {
      "type": "string",
      "pattern": "^mod-[a-z0-9]+(-[a-z0-9]+)*$",
      "not": {"enum": ["core", "system", "admin", "api", "ws", "health", "docs", "auth", "user", "config", "test", "internal"]}
    },
    "version": {"type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+$"},
    "api_version": {"type": "string", "pattern": "^v\\d+$"},
    "endpoints": {
      "type": "object",
      "required": ["http", "health"],
      "properties": {
        "http": {"type": "string", "format": "uri", "pattern": "^https?://"},
        "health": {"type": "string", "pattern": "^/"}
      }
    }
  }
}
```

---

## 4. Endpoints Requeridos

### 4.1 Health Check (OBLIGATORIO)

```python
@app.get("/health")
async def health_check(request: Request):
    """
    Endpoint de health check.
    El Core consulta este endpoint cada 30 segundos.
    """
    # Verificar conexión a base de datos
    db_status = "connected"
    try:
        db = next(get_db())
        db.execute(text("SELECT 1"))
        db.close()
    except Exception:
        db_status = "disconnected"

    # Verificar dependencias externas
    dep_status = {}
    for dep in DEPENDENCIES:
        try:
            async with httpx.AsyncClient() as client:
                r = await client.get(f"{dep}/health", timeout=5)
                dep_status[dep] = "healthy" if r.status_code == 200 else "degraded"
        except Exception:
            dep_status[dep] = "unhealthy"

    # Determinar estado general
    if db_status == "disconnected":
        overall = "unhealthy"
    elif any(s == "unhealthy" for s in dep_status.values()):
        overall = "degraded"
    else:
        overall = "healthy"

    return {
        "status": overall,
        "module": "mod-planes-estudio",
        "version": "1.2.0",
        "database": db_status,
        "dependencies": dep_status,
        "uptime": int(time.time() - START_TIME),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
```

### 4.2 Ready Check (RECOMENDADO)

```python
@app.get("/ready")
async def ready():
    """
    Indica si el módulo está listo para recibir tráfico.
    Diferente de /health: aquí se verifican dependencias externas.
    """
    # Verificar que las dependencias obligatorias están listas
    if not all(ready_status.get(dep, False) for dep in REQUIRED_DEPS):
        return {"ready": False, "message": "Dependencias no listas"}

    return {"ready": True, "message": "Módulo listo para recibir tráfico"}
```

### 4.3 Manifest (RECOMENDADO)

```python
@app.get("/manifest")
async def get_manifest():
    """Retorna el manifiesto completo del módulo."""
    return manifest_data
```

---

## 5. Convenciones de API

### 5.1 Prefijo de Rutas

```
/api/v1/{nombre_modulo}/{recurso}[/{id}][?parametros]

Ejemplos:
  GET    /api/v1/planes?programa_id=1
  POST   /api/v1/planes
  GET    /api/v1/planes/42
  PUT    /api/v1/planes/42
  DELETE /api/v1/planes/42
  GET    /api/v1/planes/42/modulos
  POST   /api/v1/planes/42/modulos
```

### 5.2 Formato de Respuestas

**Éxito (200 OK):**
```json
{
    "id": 1,
    "codigo": "DSI101",
    "nombre": "Introducción a la Programación",
    "creditos": 4,
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-15T10:30:00Z"
}
```

**Lista (200 OK):**
```json
{
    "items": [
        {"id": 1, "nombre": "Item 1"},
        {"id": 2, "nombre": "Item 2"}
    ],
    "total": 100,
    "page": 1,
    "page_size": 20,
    "pages": 5
}
```

**Creación (201 Created):**
```json
{
    "id": 42,
    "nombre": "Nuevo Recurso",
    "created_at": "2025-06-26T10:00:00Z"
}
```

**Error (4xx/5xx):**
```json
{
    "detail": "Mensaje de error descriptivo",
    "error_code": "NOT_FOUND",
    "timestamp": "2025-01-01T00:00:00Z",
    "request_id": "req_abc123",
    "errors": [
        {"field": "creditos", "message": "Debe ser entre 1 y 6"}
    ]
}
```

### 5.3 Códigos HTTP

| Código | Uso | Descripción |
|--------|-----|-------------|
| 200 | GET exitoso, PUT/PATCH exitoso | OK |
| 201 | POST exitoso (creación) | Created |
| 204 | DELETE exitoso | No Content |
| 400 | Error de validación de datos | Bad Request |
| 401 | No autenticado (token faltante/inválido) | Unauthorized |
| 403 | No autorizado (permiso insuficiente) | Forbidden |
| 404 | Recurso no encontrado | Not Found |
| 409 | Conflicto (duplicado, estado inválido) | Conflict |
| 422 | Error de validación de datos (Pydantic) | Unprocessable Entity |
| 429 | Rate limit excedido | Too Many Requests |
| 500 | Error interno del servidor | Internal Server Error |
| 502 | Bad Gateway (error en dependencia) | Bad Gateway |
| 503 | Servicio no disponible | Service Unavailable |
| 504 | Timeout en dependencia externa | Gateway Timeout |

### 5.4 Parámetros de Lista (Query)

```
Paginación:
  page=1&page_size=20    (default: page=1, page_size=20, max: page_size=100)

Ordenamiento:
  sort=nombre&order=asc  (default: sort=id, order=asc)

Filtros:
  ?campo=valor           (filtro exacto)
  ?nombre__contains=prog (filtro LIKE)
  ?creditos__gte=3       (filtro >=)
  ?creditos__lte=5       (filtro <=)
  ?created_at__gte=2025-01-01 (filtro fecha >=)
```

---

## 6. Convenciones de Base de Datos

### 6.1 Configuración

```python
# database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

DB_USER = os.getenv("DB_USER", "siga")
DB_PASS = os.getenv("DB_PASS", "siga123")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "mod_planes_estudio")

DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(
    DATABASE_URL,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
    pool_recycle=3600,
    echo=os.getenv("SQL_ECHO", "false").lower() == "true"
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Crea todas las tablas si no existen."""
    Base.metadata.create_all(bind=engine)
```

### 6.2 Naming Conventions

```python
# Configuración de naming para SQLAlchemy
convention = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s"
}

Base = declarative_base(naming_convention=convention)
```

### 6.3 Modelo Base

```python
# models.py
from sqlalchemy import Column, Integer, DateTime, func
from database import Base
import uuid


class TimeStampedMixin:
    """Mixin que agrega timestamps a los modelos."""
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class BaseModel(Base, TimeStampedMixin):
    __abstract__ = True

    id = Column(Integer, primary_key=True, index=True)


class OutboxEvent(BaseModel):
    """Obligatorio para el Patrón Transactional Outbox (Consistencia Eventual)"""
    __tablename__ = "outbox_events"

    event_type = Column(String(100), nullable=False)
    payload = Column(JSON, nullable=False)
    published = Column(Boolean, default=False, index=True)


# Ejemplo de modelo concreto
class PlanEstudio(BaseModel):
    __tablename__ = "planes_estudio"

    programa_id = Column(Integer, nullable=False, index=True)
    version = Column(String(20), nullable=False)
    vigencia_inicio = Column(Date, nullable=False)
    vigencia_fin = Column(Date)
    resolucion_aprobacion = Column(String(100))
    activo = Column(Boolean, default=True)
    perfil_egreso = Column(JSONB)
    programa_estudios = Column(JSONB)
```

---

## 7. Eventos (NATS)

### 7.1 Configuración del Event Bus

```python
# event_bus.py
import asyncio
import json
import nats
from nats.errors import TimeoutError
import os

NATS_URL = os.getenv("NATS_URL", "nats://localhost:4222")


class EventBus:
    """Wrapper para la comunicación con NATS."""

    def __init__(self):
        self.nc = None
        self.js = None  # JetStream context
        self.subscriptions = []

    async def connect(self):
        self.nc = await nats.connect(
            NATS_URL,
            max_reconnect_attempts=10,
            reconnect_time_wait=2,
            name="mod-planes-estudio"
        )
        self.js = self.nc.jetstream()
        print(f"[EventBus] Conectado a NATS en {NATS_URL}")

    async def disconnect(self):
        for sub in self.subscriptions:
            await sub.unsubscribe()
        if self.nc:
            await self.nc.drain()
            await self.nc.close()

    async def publish(self, subject: str, data: dict):
        """Publica un evento en NATS."""
        if not self.nc:
            raise RuntimeError("EventBus no conectado")
        payload = json.dumps(data, default=str).encode()
        await self.nc.publish(subject, payload)
        print(f"[EventBus] Evento publicado: {subject}")

    async def subscribe(self, subject: str, callback):
        """Se suscribe a un evento NATS."""
        if not self.nc:
            raise RuntimeError("EventBus no conectado")
        sub = await self.nc.subscribe(subject, cb=callback)
        self.subscriptions.append(sub)
        print(f"[EventBus] Suscrito a: {subject}")
        return sub


# Instancia global
event_bus = EventBus()
```

### 7.2 Publicación de Eventos

```python
# En routes.py, después de crear un recurso:
@router.post("/planes", status_code=201)
async def crear_plan(data: PlanCreate, db: Session = Depends(get_db)):
    plan = PlanEstudio(**data.dict())
    db.add(plan)
    db.commit()
    db.refresh(plan)

    # Publicar evento
    await event_bus.publish("planes.plan.creado", {
        "id": plan.id,
        "programa_id": plan.programa_id,
        "version": plan.version,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

    return plan
```

### 7.3 Suscripción a Eventos

```python
# En main.py, durante el startup:
@app.on_event("startup")
async def startup():
    await event_bus.connect()
    await event_bus.subscribe("core.started", handle_core_started)
    await event_bus.subscribe("programas.programa.eliminado", handle_programa_eliminado)


async def handle_core_started(msg):
    data = json.loads(msg.data.decode())
    print(f"[EventBus] Core iniciado: {data}")
    # Registrar módulo en Core automáticamente


async def handle_programa_eliminado(msg):
    data = json.loads(msg.data.decode())
    programa_id = data.get("id")
    print(f"[EventBus] Programa {programa_id} eliminado, limpiando planes...")
    # Lógica para desactivar planes del programa eliminado
```

### 7.4 Catálogo de Eventos Estándar

Cada módulo debe documentar en su README los eventos que publica y a los que se suscribe.

| Evento | Dirección | Propósito | Payload |
|--------|-----------|-----------|---------|
| `core.started` | Core -> Módulos | Core iniciado, módulos deben registrarse | `{timestamp}` |
| `core.heartbeat` | Core -> Módulos | Heartbeat cada 30s | `{module_count, timestamp}` |
| `{mod}.{entity}.creado` | Módulo -> NATS | Recurso creado | `{id, timestamp}` |
| `{mod}.{entity}.actualizado` | Módulo -> NATS | Recurso actualizado | `{id, changes, timestamp}` |
| `{mod}.{entity}.eliminado` | Módulo -> NATS | Recurso eliminado | `{id, timestamp}` |

---

## 8. Seguridad en Módulos

### 8.1 Validación de Token Interno

```python
# auth.py
from fastapi import Request, HTTPException, Depends
from jose import jwt, JWTError
import os

CORE_SECRET_KEY = os.getenv("CORE_SECRET_KEY")


def verify_internal_token(request: Request) -> dict:
    """
    Valida el X-Internal-Token enviado por el Core.
    OBLIGATORIO en todos los endpoints del módulo.
    """
    token = request.headers.get("X-Internal-Token")
    if not token:
        raise HTTPException(status_code=401, detail="Token interno requerido")

    try:
        payload = jwt.decode(
            token,
            CORE_SECRET_KEY,
            algorithms=["HS256"]
        )
    except JWTError:
        raise HTTPException(status_code=403, detail="Token interno inválido o expirado")

    if payload.get("type") != "module_access":
        raise HTTPException(status_code=403, detail="Tipo de token inválido")

    return payload


# Uso en rutas:
@router.get("/planes")
async def listar_planes(
    db: Session = Depends(get_db),
    token: dict = Depends(verify_internal_token)
):
    # Token validado, procesar request
    ...
```

### 8.2 Headers de Confianza del Core

El Core envía estos headers después de validar al usuario:

| Header | Contenido | Propósito |
|--------|-----------|-----------|
| `X-Internal-Token` | JWT interno del módulo | Autenticación módulo-core |
| `X-User-Id` | ID del usuario autenticado | Identificación |
| `X-User-Email` | Email del usuario | Identificación |
| `X-User-Role` | Rol del usuario (admin, docente, etc.) | Autorización |
| `X-User-Permissions` | JSON array de permisos | Autorización granular |
| `X-Request-Id` | UUID único del request | Trazabilidad |

### 8.3 Reglas de Seguridad

- **Nunca exponer** endpoints directamente a internet (solo via Core Gateway)
- **Nunca almacenar** contraseñas, tokens, o secrets en el módulo
- **Validar** X-Internal-Token en cada request (incluso en health check interno)
- **Sanitizar** todos los inputs (SQLAlchemy ORM ayuda, pero no es suficiente)
- **Usar** HTTPS en producción (el Core Gateway debe terminar TLS, no el módulo)
- **Loggear** todas las operaciones de escritura (create, update, delete)

---

## 9. Plantilla de Módulo

### 9.1 main.py

```python
# main.py
import os
import time
import uvicorn
from fastapi import FastAPI
from routes import router
from database import init_db
from event_bus import event_bus

app = FastAPI(
    title="mod-planes-estudio",
    description="Gestión de planes de estudio para SIGA",
    version="1.2.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

app.include_router(router, prefix="/api/v1/planes")

START_TIME = time.time()


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "module": "mod-planes-estudio",
        "version": "1.2.0",
        "uptime": int(time.time() - START_TIME)
    }


@app.get("/manifest")
async def get_manifest():
    import yaml
    with open("manifest.yaml") as f:
        return yaml.safe_load(f)


@app.on_event("startup")
async def startup():
    print(f"[mod-planes-estudio] Inicializando...")
    init_db()
    await event_bus.connect()
    await event_bus.subscribe("core.started", lambda msg: print("Core started"))
    print(f"[mod-planes-estudio] Inicializado correctamente")


@app.on_event("shutdown")
async def shutdown():
    await event_bus.disconnect()
    print(f"[mod-planes-estudio] Detenido")


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8001))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=os.getenv("ENV") == "development"
    )
```

### 9.2 routes.py

```python
# routes.py
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
from models import PlanEstudio, UnidadDidactica
from auth import verify_internal_token
from event_bus import event_bus

router = APIRouter()


@router.get("")
async def listar_planes(
    programa_id: Optional[int] = Query(None),
    activo: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    token: dict = Depends(verify_internal_token)
):
    query = db.query(PlanEstudio)

    if programa_id:
        query = query.filter(PlanEstudio.programa_id == programa_id)
    if activo is not None:
        query = query.filter(PlanEstudio.activo == activo)

    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size
    }


@router.post("", status_code=201)
async def crear_plan(
    data: dict,
    db: Session = Depends(get_db),
    token: dict = Depends(verify_internal_token)
):
    plan = PlanEstudio(**data)
    db.add(plan)
    db.commit()
    db.refresh(plan)

    await event_bus.publish("planes.plan.creado", {
        "id": plan.id,
        "programa_id": plan.programa_id,
        "version": plan.version
    })

    return plan


@router.get("/{plan_id}")
async def obtener_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    token: dict = Depends(verify_internal_token)
):
    plan = db.query(PlanEstudio).get(plan_id)
    if not plan:
        raise HTTPException(404, "Plan de estudio no encontrado")
    return plan


@router.put("/{plan_id}")
async def actualizar_plan(
    plan_id: int,
    data: dict,
    db: Session = Depends(get_db),
    token: dict = Depends(verify_internal_token)
):
    plan = db.query(PlanEstudio).get(plan_id)
    if not plan:
        raise HTTPException(404, "Plan de estudio no encontrado")

    for key, value in data.items():
        setattr(plan, key, value)

    db.commit()
    db.refresh(plan)

    await event_bus.publish("planes.plan.actualizado", {
        "id": plan.id,
        "changes": list(data.keys())
    })

    return plan


@router.delete("/{plan_id}", status_code=204)
async def eliminar_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    token: dict = Depends(verify_internal_token)
):
    plan = db.query(PlanEstudio).get(plan_id)
    if not plan:
        raise HTTPException(404, "Plan de estudio no encontrado")

    db.delete(plan)
    db.commit()

    await event_bus.publish("planes.plan.eliminado", {"id": plan_id})
```

### 9.3 requirements.txt

```
fastapi==0.115.0
uvicorn[standard]==0.30.0
sqlalchemy==2.0.35
psycopg2-binary==2.9.9
python-jose[cryptography]==3.3.0
nats-py==2.9.0
httpx==0.27.0
pyyaml==6.0.2
pydantic==2.9.0
python-dotenv==1.0.1
```

### 9.4 Dockerfile

```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8001

ENV PORT=8001
ENV PYTHONPATH=/app

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
```

### 9.5 .env.example

```ini
# Configuración del módulo
PORT=8001
ENV=development
LOG_LEVEL=info

# Base de datos
DB_USER=siga
DB_PASS=siga123
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mod_planes_estudio
SQL_ECHO=false

# Core
CORE_SECRET_KEY=change-this-in-production
CORE_URL=http://localhost:8000
NATS_URL=nats://localhost:4222
REDIS_URL=redis://localhost:6379/0
```

---

## 10. Checklist para Nuevo Módulo

### 10.1 Obligatorio (no pasa revisión sin esto)

- [ ] `manifest.yaml` con todos los campos requeridos y válidos
- [ ] `main.py` con entry point y endpoint `/health`
- [ ] `models.py` con modelos SQLAlchemy y `TimeStampedMixin`
- [ ] `routes.py` con CRUD básico del recurso principal
- [ ] `/health` retorna `{"status": "healthy", "module": "...", "version": "..."}`
- [ ] Corre en puerto específico (diferente de otros módulos)
- [ ] Valida `X-Internal-Token` en cada endpoint protegido
- [ ] No expone rutas públicas sensibles
- [ ] README con descripción, instalación y ejemplos

### 10.2 Recomendado (se espera en fase de producción)

- [ ] `database.py` con conexión a BD y `get_db()`
- [ ] `requirements.txt` con dependencias fijas
- [ ] `.env.example` con todas las variables documentadas
- [ ] README con documentación completa de API
- [ ] Tests básicos en `tests/` (mínimo health check)
- [ ] Integración con event bus (NATS)
- [ ] Manejo de errores consistente (códigos HTTP estándar)
- [ ] Paginación en endpoints de lista
- [ ] Filtros en endpoints de lista
- [ ] Schemas Pydantic en `schemas.py`
- [ ] Dockerfile para containerización
- [ ] Logging estructurado

### 10.3 Opcional (deseable para madurez)

- [ ] Integración con Redis para caché
- [ ] Pruebas de integración
- [ ] CI/CD (GitHub Actions)
- [ ] Documentación OpenAPI personalizada
- [ ] Métricas Prometheus
- [ ] Tracing distribuido (OpenTelemetry)

---

## 11. Pruebas

### 11.1 tests/test_routes.py

```python
# tests/test_routes.py
from fastapi.testclient import TestClient
from main import app
import os

os.environ["CORE_SECRET_KEY"] = "test-secret-key"

client = TestClient(app)

VALID_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["module"] == "mod-planes-estudio"


def test_list_planes_requires_auth():
    response = client.get("/api/v1/planes")
    assert response.status_code == 401


def test_list_planes_with_valid_token():
    response = client.get(
        "/api/v1/planes",
        headers={"X-Internal-Token": VALID_TOKEN}
    )
    assert response.status_code == 200
```

---

## 12. Manejo de Errores

```python
# exceptions.py
from fastapi import Request
from fastapi.responses import JSONResponse


class ModuleException(Exception):
    """Excepción base para errores del módulo."""

    def __init__(self, detail: str, error_code: str, status_code: int = 400):
        self.detail = detail
        self.error_code = error_code
        self.status_code = status_code


class NotFoundException(ModuleException):
    def __init__(self, entity: str, entity_id: int):
        super().__init__(
            detail=f"{entity} con id {entity_id} no encontrado",
            error_code="NOT_FOUND",
            status_code=404
        )


class DuplicateException(ModuleException):
    def __init__(self, entity: str, field: str, value: str):
        super().__init__(
            detail=f"Ya existe {entity} con {field}={value}",
            error_code="DUPLICATE",
            status_code=409
        )


@app.exception_handler(ModuleException)
async def module_exception_handler(request: Request, exc: ModuleException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "error_code": exc.error_code,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    )
```

---

## 13. Versiones del Estándar

| Versión | Cambios | Fecha |
|---------|---------|-------|
| 1.0 | Versión inicial del estándar | 2025-11 |
| 2.0 | Nuevos campos: dependencies, tags, author, permissions.grants; eventos NATS; Dockerfile; pruebas | 2026-06 |

---

## 14. Historial de Cambios

| Fecha | Versión | Autor | Cambios |
|-------|---------|-------|---------|
| 2026-06-26 | 2.0 | Arquitecto SIGA | Versión completa del estándar de módulos |

---
