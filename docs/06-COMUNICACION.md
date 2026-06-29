# Comunicación entre Componentes

> **Versión:** 1.0.0  
> **Última actualización:** 2026-06-26  
> **Responsable:** Arquitectura de Software SIGA

---

## 1. Diagrama General de Comunicación

```
┌─────────────────────────────────────────────────────────────────┐
│                         INTERNET / LAN                          │
└─────────────────────────────────────────────────────────────────┘
         │                                              ▲
         │ HTTPS (REST JSON)                             │ HTTPS (REST JSON)
         │ JWT Auth                                      │ JWT Auth
         ▼                                              │
┌────────────────────────────────────────────────────────────────────┐
│                FRONTEND (React + Vite, SPA)                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐             │
│  │ Dashboard│ │Academic  │ │Students  │ │Enrollm.  │   ...       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘             │
│  ┌──────────────────────────────────────────────────────────┐     │
│  │              SIGAApiClient (core/api/client.jsx)          │     │
│  └──────────────────────────────────────────────────────────┘     │
└──────────────────────┬───────────────────────────────────────────┘
                       │ HTTPS (REST JSON + WebSocket)
                       │ Authorization: Bearer <JWT>
                       ▼
┌────────────────────────────────────────────────────────────────────┐
│  CORE GATEWAY (FastAPI + Python)                                  │
│                                                                   │
│  ┌────────────┐  ┌─────────────┐  ┌─────────────┐                │
│  │ Auth       │  │ Proxy       │  │ Registry    │                │
│  │ Middleware │→│ Gateway     │→│ Manager     │                │
│  └────────────┘  └──────┬──────┘  └─────────────┘                │
│                        │                                         │
│  ┌────────────┐  ┌──────┴──────┐  ┌─────────────┐                │
│  │ Circuit    │  │ Internal    │  │ Cache       │                │
│  │ Breaker    │  │ Router      │  │ Manager     │                │
│  └────────────┘  └──────┬──────┘  └──────┬──────┘                │
│                        │                 │                        │
│  ┌────────────┐  ┌──────┴──────┐  ┌──────┴──────┐                │
│  │ WebSocket  │  │ Event       │  │ Audit      │                │
│  │ Manager    │  │ Publisher   │  │ Logger     │                │
│  └────────────┘  └──────┬──────┘  └─────────────┘                │
│                         │                                         │
│  ┌────────────┐  ┌──────┴──────┐                                  │
│  │ Redis      │  │ NATS        │                                  │
│  │ (Cache)    │  │ (Event Bus) │                                  │
│  └────────────┘  └─────────────┘                                  │
└──────┬──────────────────┬─────────────────────────────────────────┘
       │                  │
       │ HTTP (Proxy)     │ NATS (Pub/Sub)
       │ X-Internal-Token │ Eventos asíncronos
       ▼                  ▼
┌────────────────────────────────────────────────────────────────────┐
│  MÓDULOS (Microservicios FastAPI independientes)                  │
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │
│  │ mod-planes-      │  │ mod-programas-   │  │ mod-estudiantes  │ │
│  │ estudio          │  │ estudio          │  │                  │ │
│  │ :8001            │  │ :8002            │  │ :8003            │ │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘ │
│           │                     │                     │           │
│  ┌────────┴─────────┐  ┌───────┴──────────┐  ┌────────┴─────────┐ │
│  │ BD: mod_planes   │  │ BD: mod_         │  │ BD: mod_         │ │
│  │ _estudio         │  │ programas_estudio│  │ estudiantes      │ │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘ │
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │
│  │ mod-matricula    │  │ mod-evaluacion   │  │ mod-gobierno     │ │
│  │ :8004            │  │ :8005            │  │ :8006            │ │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘ │
│           │                     │                     │           │
│  ┌────────┴─────────┐  ┌───────┴──────────┐  ┌────────┴─────────┐ │
│  │ BD: mod_matricula│  │ BD: mod_         │  │ BD: mod_gobierno │ │
│  └──────────────────┘  │ evaluacion       │  └──────────────────┘ │
│                        └──────────────────┘                       │
└────────────────────────────────────────────────────────────────────┘
```

---

## 2. Comunicación Frontend ↔ Core

### 2.1 Protocolo

| Capa | Protocolo | Formato | Puerto |
|------|-----------|---------|--------|
| REST API | HTTPS/1.1 | JSON (application/json) | 443 (prod) / 8000 (dev) |
| Tiempo real | WebSocket (WSS) | JSON sobre WebSocket | 443 (prod) / 8000 (dev) |
| Streaming | Server-Sent Events | text/event-stream | 443 (prod) / 8000 (dev) |

### 2.2 Autenticación JWT

El frontend se autentica mediante JWT (JSON Web Token). El flujo completo es:

```
Frontend                          Core                              Redis
   │                                │                                │
   │  POST /auth/login              │                                │
   │  {email, password}             │                                │
   │───────────────────────────────>│                                │
   │                                │  Validar credenciales          │
   │                                │  Verificar contra core_users   │
   │                                │  Verificar is_active           │
   │                                │  Verificar locked_until        │
   │                                │                                │
   │                                │  Generar JWT access_token      │
   │                                │  (exp: 30 min)                 │
   │                                │  Generar refresh_token         │
   │                                │  (exp: 7 days)                 │
   │                                │                                │
   │                                │  Almacenar refresh_token hash  │
   │                                │  en core_sessions              │
   │                                │                                │
   │  {access_token,                │                                │
   │   refresh_token,               │                                │
   │   user}                        │                                │
   │<───────────────────────────────│                                │
   │                                │                                │
   │  Almacenar en localStorage     │                                │
   │  (access_token, refresh_token) │                                │
```

### 2.3 Refresh Token Flow

```javascript
// Cuando el access_token expira (HTTP 401)
// El SIGAApiClient automáticamente intenta refrescar

POST /auth/refresh
Headers: { Authorization: "Bearer <refresh_token>" }
Response: { access_token: "nuevo_jwt...", refresh_token: "nuevo_refresh..." }

// Si el refresh_token también expiró → logout forzado
```

### 2.4 Formato de Requests y Responses

**Request genérico:**

```http
POST /api/mod-planes-estudio/api/v1/planes HTTP/1.1
Host: siga.iestp.edu.pe
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json
X-Request-ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890

{
    "codigo": "DSI-2027",
    "nombre": "Plan de Estudios 2027 - DSI",
    "programa_id": 1,
    "creditos_totales": 180,
    ...otros campos del plan
}
```

**Response exitoso:**

```http
HTTP/1.1 201 Created
Content-Type: application/json
X-Request-ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890
X-Processing-Time: 45ms

{
    "id": 1,
    "codigo": "DSI-2027",
    "nombre": "Plan de Estudios 2027 - DSI",
    "programa_id": 1,
    "creditos_totales": 180,
    "created_at": "2026-06-26T10:30:00Z",
    ...resto de campos
}
```

**Response con error:**

```http
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/json
X-Request-ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890

{
    "detail": [
        {
            "loc": ["body", "codigo"],
            "msg": "field required",
            "type": "value_error.missing"
        }
    ]
}
```

**Response de error estandarizado:**

```http
HTTP/1.1 403 Forbidden
Content-Type: application/json
X-Request-ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890

{
    "error": {
        "code": "FORBIDDEN",
        "message": "No tienes permisos para acceder a este recurso",
        "details": {
            "required_permission": "mod-planes-estudio:write",
            "user_permissions": ["mod-planes-estudio:read", "mod-estudiantes:read"]
        },
        "request_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "timestamp": "2026-06-26T10:30:00Z"
    }
}
```

### 2.5 WebSocket para Tiempo Real

**Conexión:**

```javascript
const ws = new WebSocket('wss://siga.iestp.edu.pe/ws?token=' + jwtToken);

ws.onopen = () => {
    // Suscribirse a canales de eventos
    ws.send(JSON.stringify({
        type: "subscribe",
        channels: ["grade.published", "enrollment.confirmed"]
    }));
};

ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    // Manejar evento
};

ws.onclose = () => {
    // Reconectar con backoff exponencial
};
```

**Mensajes del sistema:**

| Tipo | Dirección | Propósito | Frecuencia |
|------|-----------|-----------|------------|
| `subscribe` | Cliente → Servidor | Suscribirse a canales | Bajo demanda |
| `unsubscribe` | Cliente → Servidor | Cancelar suscripción | Bajo demanda |
| `event` | Servidor → Cliente | Notificación de evento | Cuando ocurre |
| `ping` | Cliente → Servidor | Keepalive | Cada 30s |
| `pong` | Servidor → Cliente | Respuesta a ping | Inmediato |
| `error` | Servidor → Cliente | Error en suscripción | Cuando ocurre |

**Formato de mensaje de evento:**

```json
{
    "type": "event",
    "channel": "grade.published",
    "event_id": "evt_a1b2c3d4",
    "timestamp": "2026-06-26T10:30:00Z",
    "data": {
        "estudiante_id": 456,
        "periodo_id": 78,
        "promedio_general": 15.50,
        "uds_aprobadas": 5,
        "uds_desaprobadas": 1
    }
}
```

---

## 3. Comunicación Core ↔ Módulos

### 3.1 Protocolo: HTTP Proxy Interno

El Core actúa como un API Gateway. Todas las solicitudes a módulos pasan a través del Core.

```
Ruta externa:  /api/{module_name}/{endpoint_path}
Ruta interna:  http://{module_host}:{module_port}/{endpoint_path}

Ejemplo:
  Externa: GET /api/mod-planes-estudio/api/v1/planes?programa_id=1
  Interna: GET http://localhost:8001/api/v1/planes?programa_id=1
```

### 3.2 Flujo Completo de Proxy

```
Frontend                                               Core Gateway                              Módulo Destino
   │                                                      │                                          │
   │  GET /api/mod-planes-estudio/api/v1/planes           │                                          │
   │  Authorization: Bearer <jwt>                         │                                          │
   │─────────────────────────────────────────────────────>│                                          │
   │                                                      │                                          │
   │                                                      │  1. SecurityMiddleware                   │
   │                                                      │     ├── Extraer JWT del header           │
   │                                                      │     ├── Validar JWT (firma, exp)         │
   │                                                      │     ├── Verificar blacklist en Redis      │
   │                                                      │     ├── Extraer user_id, permissions      │
   │                                                      │     └── Setear en request.state.user      │
   │                                                      │                                          │
   │                                                      │  2. AuthorizationMiddleware              │
   │                                                      │     ├── Obtener endpoint desde Registry   │
   │                                                      │     ├── Verificar auth_required           │
   │                                                      │     ├── Verificar permissions_required    │
   │                                                      │     └── Si no autorizado → 403            │
   │                                                      │                                          │
   │                                                      │  3. RateLimitMiddleware                   │
   │                                                      │     ├── Obtener contador de Redis         │
   │                                                      │     ├── Verificar límite por usuario/ruta  │
   │                                                      │     └── Si excede → 429 Too Many Requests  │
   │                                                      │                                          │
   │                                                      │  4. ModuleRuntime.get_module()            │
   │                                                      │     ├── Buscar en core_modules por nombre  │
   │                                                      │     ├── Verificar is_active, status        │
   │                                                      │     ├── Obtener endpoint_http              │
   │                                                      │     └── Si no encontrado → 404             │
   │                                                      │                                          │
   │                                                      │  5. CircuitBreaker.check()                │
   │                                                      │     ├── Obtener circuit_state del módulo   │
   │                                                      │     ├── Si OPEN → 503 (fallback rápido)    │
   │                                                      │     ├── Si HALF_OPEN → permitir 1 request  │
   │                                                      │     └── Si CLOSED → continuar              │
   │                                                      │                                          │
   │                                                      │  6. CacheMiddleware (solo GET)            │
   │                                                      │     ├── Generar cache_key por URL+params   │
   │                                                      │     ├── Buscar en Redis                    │
   │                                                      │     ├── Si HIT → retornar respuesta        │
   │                                                      │     └── Si MISS → continuar al módulo      │
   │                                                      │                                          │
   │                                                      │  7. HTTPGateway.proxy_to_module()         │
   │                                                      │     ├── Construir URL interna              │
   │                                                      │     ├── Agregar headers de contexto        │
   │                                                      │     │  X-User-ID: 1                        │
   │                                                      │     │  X-User-Email: admin@siga.edu        │
   │                                                      │     │  X-User-Permissions: ...              │
   │                                                      │     │  X-User-Roles: admin, director        │
   │                                                      │     │  X-Request-ID: uuid                  │
   │                                                      │     │  X-Internal-Token: jwt...            │
   │                                                      │     │  X-Gateway-Version: 2.0.0            │
   │                                                      │     │  X-Forwarded-For: client_ip           │
   │                                                      │     ├── Enviar request al módulo            │
   │                                                      │     │                                     │
   │                                                      │─────────────────────────────────────────>│
   │                                                      │                                          │
   │                                                      │                                          │  8. Módulo recibe request
   │                                                      │                                          │     ├── Verificar X-Internal-Token
   │                                                      │                                          │     ├── Extraer headers de contexto
   │                                                      │                                          │     ├── Ejecutar lógica de negocio
   │                                                      │                                          │     └── Retornar respuesta
   │                                                      │                                          │
   │                                                      │<─────────────────────────────────────────│
   │                                                      │                                          │
   │                                                      │  9. Post-procesamiento                    │
   │                                                      │     ├── Si GET exitoso → cachear en Redis  │
   │                                                      │     ├── Si POST/PUT/DELETE → auditar       │
   │                                                      │     ├── Si error → circuit breaker eval    │
   │                                                      │     └── Si timeout → 504 Gateway Timeout  │
   │                                                      │                                          │
   │<─────────────────────────────────────────────────────│                                          │
   │                                                      │                                          │
   │  Response: {...datos del módulo...}                  │                                          │
```

### 3.3 Headers de Contexto (Core → Módulo)

Cuando el Core hace proxy a un módulo, incluye estos headers para transmitir el contexto del usuario autenticado:

| Header | Tipo | Descripción | Ejemplo |
|--------|------|-------------|---------|
| `X-User-ID` | Integer | ID del usuario autenticado | `42` |
| `X-User-Email` | String | Email del usuario | `jdocente@siga.edu` |
| `X-User-Full-Name` | String | Nombre completo del usuario | `Juan Pérez García` |
| `X-User-Roles` | String | Roles del usuario (separados por coma) | `docente,jefe_unidad` |
| `X-User-Permissions` | String | Permisos del usuario (separados por coma) | `mod-planes:read,mod-estudiantes:write` |
| `X-Request-ID` | UUID | ID único para tracing distribuido | `a1b2c3d4-e5f6-7890-abcd-ef1234567890` |
| `X-Internal-Token` | JWT | Token interno que autentica al Core ante el módulo | `eyJ...` |
| `X-Gateway-Version` | String | Versión del gateway para compatibilidad | `2.0.0` |
| `X-Forwarded-For` | IP | IP original del cliente | `10.0.0.1` |
| `X-Forwarded-Proto` | String | Protocolo original | `https` |

### 3.4 Security del X-Internal-Token

```python
# Ejemplo de verificación en el módulo (Python/FastAPI middleware)
import jwt

async def verify_internal_token(request: Request):
    internal_token = request.headers.get("X-Internal-Token")
    if not internal_token:
        raise HTTPException(status_code=401, detail="Missing internal token")

    try:
        payload = jwt.decode(
            internal_token,
            settings.INTERNAL_JWT_SECRET,  # Secreto compartido Core-Módulos
            algorithms=["HS256"],
            audience="siga-modules"
        )
        # Verificar que el emisor es el Core
        if payload.get("iss") != "siga-core":
            raise HTTPException(status_code=403, detail="Invalid issuer")
        # Verificar expiración (tokens internos: 30 segundos)
        # (ya lo hace jwt.decode automáticamente)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Internal token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=403, detail="Invalid internal token")
```

**Reglas de seguridad:**
- Los módulos **confían** en los headers `X-User-*` porque vienen del Core a través de la red interna
- El `X-Internal-Token` permite al módulo verificar que el request proviene del Core legítimo
- Los tokens internos expiran en 30 segundos (tiempo suficiente para el proxy)
- Los módulos **no deben** aceptar requests directos desde fuera de la red interna
- La red interna debe estar aislada (VLAN privada o Docker network)
- No exponer puertos de módulos directamente al exterior

### 3.5 Endpoints del Core

| Endpoint | Método | Propósito | Auth |
|----------|--------|-----------|------|
| `POST /auth/login` | POST | Login de usuario | No |
| `POST /auth/register` | POST | Registro de usuario | No |
| `POST /auth/refresh` | POST | Refrescar token | Refresh token |
| `GET /auth/me` | GET | Obtener usuario actual | JWT |
| `POST /auth/logout` | POST | Logout (invalidar token) | JWT |
| `GET /core/modules` | GET | Listar módulos registrados | JWT |
| `GET /core/modules/{name}` | GET | Obtener detalle de módulo | JWT |
| `GET /core/status` | GET | Estado del sistema | JWT |
| `POST /core/audit/query` | POST | Consultar logs de auditoría | JWT (admin) |
| `POST /internal/module-query` | POST | Proxy para comunicación módulo→módulo | Internal Token |
| `GET /api/{module}/{path}` | * | Proxy a módulo | JWT |
| `POST /api/{module}/{path}` | * | Proxy a módulo | JWT |
| `PUT /api/{module}/{path}` | * | Proxy a módulo | JWT |
| `DELETE /api/{module}/{path}` | * | Proxy a módulo | JWT |
| `GET /health` | GET | Health check del Core | No |
| `GET /ws` | WS | WebSocket para tiempo real | JWT (query param) |

---

## 4. Comunicación Módulo ↔ Módulo

### 4.1 Principio Fundamental

> **Los módulos NUNCA se comunican directamente entre sí.**

Toda comunicación entre módulos sigue uno de estos patrones:

```
Opción A (Síncrona): Módulo A → Core Gateway → Módulo B
Opción B (Asíncrona): Módulo A → NATS (Event Bus) → Módulo B
```

### 4.2 Opción A: Comunicación Síncrona vía Core Gateway

Cuando un módulo necesita datos de otro módulo de forma síncrona:

```
mod-matricula necesita validar datos de un estudiante
                                   │
mod-matricula                      │                     Core                     mod-estudiantes
   │                               │                       │                           │
   │ POST /internal/module-query    │                       │                           │
   │ X-Internal-Token: <token>      │                       │                           │
   │ {                              │                       │                           │
   │   "target_module": "mod-      │                       │                           │
   │    estudiantes",               │                       │                           │
   │   "endpoint": "/api/v1/       │                       │                           │
   │    estudiantes/456",           │                       │                           │
   │   "method": "GET"              │                       │                           │
   │ }                              │                       │                           │
   │───────────────────────────────>│                       │                           │
   │                               │  Verificar token      │                           │
   │                               │  Verificar módulo     │                           │
   │                               │  origen tiene permiso │                           │
   │                               │                       │                           │
   │                               │  GET /api/v1/estudiantes/456                      │
   │                               │  X-User-ID: 0 (system)                            │
   │                               │  X-Request-ID: uuid                               │
   │                               │  X-Internal-Token: <token>                        │
   │                               │─────────────────────────────────────────────────>│
   │                               │                       │                           │
   │                               │                       │  Datos del estudiante      │
   │                               │<─────────────────────────────────────────────────│
   │                               │                       │                           │
   │  {estudiante_data}            │                       │                           │
   │<───────────────────────────────│                       │                           │
```

**Implementación en Python:**

```python
# En el módulo origen (ej: mod-matricula)
import httpx

class ModuleGateway:
    def __init__(self, core_url: str, module_name: str, internal_token: str):
        self.core_url = core_url
        self.module_name = module_name
        self.internal_token = internal_token
        self.client = httpx.AsyncClient(timeout=10.0)

    async def query_module(self, target_module: str, endpoint: str, method: str = "GET", data: dict = None):
        response = await self.client.post(
            f"{self.core_url}/internal/module-query",
            headers={
                "X-Internal-Token": self.internal_token,
                "X-Source-Module": self.module_name
            },
            json={
                "target_module": target_module,
                "endpoint": endpoint,
                "method": method,
                "data": data
            }
        )
        response.raise_for_status()
        return response.json()

# Uso:
gateway = ModuleGateway("http://siga-core:8000", "mod-matricula", "internal_jwt...")
estudiante = await gateway.query_module("mod-estudiantes", "/api/v1/estudiantes/456")
```

### 4.3 Opción B: Comunicación Asíncrona vía NATS Event Bus

Para acciones que no requieren respuesta inmediata, los módulos publican y se suscriben a eventos a través de NATS.

**Arquitectura del Event Bus:**

```
                     ┌─────────────────────────┐
                     │       NATS Server        │
                     │   (nats://nats:4222)     │
                     └─────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  Publisher        │  │  Subscriber 1    │  │  Subscriber 2    │
│  mod-matricula    │  │  mod-evaluacion  │  │  mod-notif.      │
│                   │  │                  │  │                  │
│  "enrollment.     │  │  → prepara      │  │  → envia correo  │
│   confirmed"      │  │    estructura    │  │    al estudiante │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

**Publicación de eventos (Publisher) - Implementando Transactional Outbox:**

```python
# En mod-matricula, en lugar de publicar directo a NATS, se guarda en la tabla outbox:
def confirmar_matricula(db: Session, matricula_data: dict):
    # 1. Lógica de negocio (guardar matrícula)
    matricula = Matricula(**matricula_data)
    db.add(matricula)
    
    # 2. Transactional Outbox (Guardar evento en la MISMA transacción)
    event_payload = {
        "event_id": str(uuid.uuid4()),
        "event_type": "enrollment.confirmed",
        "source": "mod-matricula",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "version": "1.0.0",
        "data": matricula.to_dict(),
        "metadata": {
            "user_id": get_current_user_id(),
            "request_id": get_current_request_id() # OBLIGATORIO para trazabilidad
        }
    }
    
    outbox_entry = OutboxEvent(
        event_type="enrollment.confirmed",
        payload=json.dumps(event_payload)
    )
    db.add(outbox_entry)
    
    # 3. Commit de ambos (Atómico)
    db.commit()

# Un proceso worker en background (Relay) leerá OutboxEvent y hará el await js.publish()
```

**Suscripción a eventos (Subscriber):**

```python
# En mod-evaluacion
import nats
from nats.js import JetStreamContext

async def setup_subscribers():
    nc = await nats.connect("nats://nats:4222")
    js = nc.jetstream()

    # Suscribirse al stream de eventos
    await js.subscribe(
        "enrollment.confirmed",
        stream="siga-events",
        cb=handle_enrollment_confirmed,
        durable="mod-evaluacion-enrollment-consumer"  # Consumer durable
    )

    await js.subscribe(
        "student.created",
        stream="siga-events",
        cb=handle_student_created,
        durable="mod-evaluacion-student-consumer"
    )

async def handle_enrollment_confirmed(msg):
    data = json.loads(msg.data.decode())
    event_type = data["event_type"]
    event_data = data["data"]

    logger.info(f"Received event: {event_type} for matricula {event_data['matricula_id']}")

    # Preparar estructura de evaluaciones para las UDs matriculadas
    for unidad_id in event_data["unidades"]:
        await create_evaluacion_pending(
            matricula_detalle_id=event_data["matricula_id"],
            unidad_id=unidad_id,
            periodo_id=event_data["periodo_id"]
        )

    await msg.ack()  # Confirmar procesamiento
```

### 4.4 Catálogo Completo de Eventos del Sistema

| Evento | Publisher | Subscribers | Disparo | Datos incluidos |
|--------|-----------|-------------|---------|-----------------|
| `core.started` | Core | Todos los módulos | Inicio del Core | `version`, `environment`, `startup_time` |
| `core.shutdown` | Core | Todos los módulos | Apagado graceful | `reason`, `shutdown_time` |
| `user.created` | Core | Módulos relevantes | Nuevo usuario registrado | `user_id`, `email`, `roles` |
| `user.updated` | Core | Módulos relevantes | Actualización de usuario | `user_id`, `email`, `changes` |
| `user.deactivated` | Core | Módulos | Usuario desactivado | `user_id`, `reason` |
| `module.registered` | Core | Módulos, monitoreo | Nuevo módulo registrado | `module_name`, `version`, `endpoints` |
| `module.health.changed` | Core | Monitoreo | Cambio de estado de salud | `module_name`, `old_status`, `new_status` |
| `module.circuit.opened` | Core | Monitoreo, admin | Circuit breaker se abre | `module_name`, `fail_count` |
| `program.created` | mod-programas | mod-planes, mod-matricula | Nuevo programa | `programa_id`, `codigo`, `nombre` |
| `program.updated` | mod-programas | mod-planes, mod-matricula | Programa actualizado | `programa_id`, `changes` |
| `period.opened` | mod-programas | mod-matricula, mod-evaluacion | Periodo aperturado | `periodo_id`, `programa_id`, `fechas` |
| `period.closed` | mod-programas | mod-matricula, mod-evaluacion | Periodo cerrado | `periodo_id`, `programa_id` |
| `student.created` | mod-estudiantes | mod-matricula, mod-reportes, mod-evaluacion | Nuevo estudiante registrado | `student_id`, `dni`, ` nombres`, `apellidos` |
| `student.updated` | mod-estudiantes | mod-matricula | Estudiante actualizado | `student_id`, `changes` |
| `student.state.changed` | mod-estudiantes | mod-matricula | Cambio de estado académico | `student_id`, `old_state`, `new_state` |
| `plan.published` | mod-planes-estudio | mod-programas, mod-matricula, mod-evaluacion | Nuevo plan aprobado | `plan_id`, `programa_id`, `version` |
| `plan.archived` | mod-planes-estudio | mod-programas | Plan reemplazado | `plan_id`, `programa_id`, `new_plan_id` |
| `ud.updated` | mod-planes-estudio | mod-matricula | UD actualizada (ej: prerrequisitos) | `unidad_id`, `codigo`, `changes` |
| `enrollment.started` | mod-matricula | mod-reportes | Inicio de proceso de matrícula | `estudiante_id`, `periodo_id` |
| `enrollment.validated` | mod-matricula | mod-evaluacion, mod-reportes | Matrícula validada | `matricula_id`, `estudiante_id`, `periodo_id`, `unidades` |
| `enrollment.confirmed` | mod-matricula | mod-evaluacion, mod-notificaciones, mod-reportes | Matrícula confirmada oficialmente | `matricula_id`, `estudiante_id`, `periodo_id`, `unidades`, `creditos` |
| `enrollment.cancelled` | mod-matricula | mod-evaluacion | Matrícula anulada | `matricula_id`, `estudiante_id`, `motivo` |
| `grade.registered` | mod-evaluacion | mod-reportes | Nota registrada (aún no publicada) | `evaluacion_id`, `unidad_id`, `nota` |
| `grade.published` | mod-evaluacion | mod-reportes, mod-notificaciones, mod-gobierno, mod-estudiantes | Notas publicadas oficialmente | `estudiante_id`, `periodo_id`, `promedio_general`, `uds_aprobadas` |
| `grade.updated` | mod-evaluacion | mod-reportes | Nota rectificada | `evaluacion_id`, `nota_anterior`, `nota_nueva`, `motivo` |
| `average.calculated` | mod-evaluacion | mod-reportes, mod-gobierno | Promedio de periodo calculado | `estudiante_id`, `periodo_id`, `promedio`, `estado_promocion` |
| `risk.alert.generated` | mod-evaluacion | mod-notificaciones | Alerta de riesgo académico | `estudiante_id`, `tipo_riesgo`, `nivel`, `detalle` |
| `indicator.updated` | mod-gobierno | Core | Indicador de gestión actualizado | `codigo`, `valor`, `periodo` |

### 4.5 Formato Estandarizado de Eventos

```json
{
    "event_id": "evt_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "event_type": "enrollment.confirmed",
    "source": "mod-matricula",
    "version": "1.0.0",
    "timestamp": "2026-06-26T10:30:00.123Z",
    "data": {
        "matricula_id": 123,
        "estudiante_id": 456,
        "programa_id": 1,
        "periodo_id": 78,
        "unidades": [
            {"unidad_id": 101, "codigo": "DSI301"},
            {"unidad_id": 102, "codigo": "DSI302"},
            {"unidad_id": 103, "codigo": "DSI303"}
        ],
        "creditos_matriculados": 18
    },
    "metadata": {
        "user_id": 1,
        "user_email": "admin@siga.edu",
        "request_id": "req_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "correlation_id": "corr_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "environment": "production"
    }
}
```

### 4.6 NATS Stream Configuration

```bash
# Configuración de JetStream
nats stream add siga-events \
    --subjects ">" \
    --storage file \
    --retention limits \
    --max-msgs 1000000 \
    --max-bytes 1G \
    --max-age 7d \
    --durable \
    --replicas 3

# Consumidores durables por módulo
nats consumer add siga-events mod-matricula-consumer \
    --filter "mod-matricula.>" \
    --ack explicit \
    --deliver all \
    --max-deliver 3 \
    --backoff "10s,30s,1m,5m"

nats consumer add siga-events mod-evaluacion-consumer \
    --filter "enrollment.>" \
    --ack explicit \
    --deliver all \
    --max-deliver 3 \
    --backoff "10s,30s,1m,5m"
```

---

## 5. Manejo de Errores en Comunicación

### 5.1 Tabla de Errores HTTP

| Código | Significado | Causa | Acción del Gateway | Acción del Frontend |
|--------|-------------|-------|-------------------|---------------------|
| 400 | Bad Request | Datos de entrada inválidos (validación falló) | Retornar error de validación detallado | Mostrar errores de validación campo por campo |
| 401 | Unauthorized | Token JWT inválido, expirado, o no provisto | No hacer proxy, retornar 401 inmediatamente | Redirigir a login, limpiar token |
| 403 | Forbidden | Usuario no tiene el permiso requerido | No hacer proxy, retornar 403 inmediatamente | Mostrar "No tienes permisos para esta acción" |
| 404 | Not Found | Recurso no existe o módulo no registrado | Retornar 404 con mensaje descriptivo | Mostrar "Recurso no encontrado" |
| 409 | Conflict | Conflicto de estado (ej: matrícula duplicada) | Retornar 409 con detalle del conflicto | Mostrar mensaje de conflicto y sugerir acción |
| 422 | Unprocessable | Validación de datos falló (formato incorrecto) | Retornar errores de validación | Mostrar errores de validación |
| 429 | Too Many Requests | Límite de tasa excedido | Retornar 429 con header Retry-After | Mostrar "Demasiadas solicitudes, intenta en N segundos" |
| 502 | Bad Gateway | Módulo destino no responde o está offline | Circuit breaker registra fallo, retornar 502 | Mostrar "Servicio temporalmente no disponible" |
| 503 | Service Unavailable | Circuit breaker abierto o módulo en mantenimiento | Retornar 503 inmediatamente (fallback rápido) | Mostrar "Servicio en mantenimiento, intenta más tarde" |
| 504 | Gateway Timeout | Módulo destino no respondió en el tiempo límite | Circuit breaker registra timeout, retornar 504 | Mostrar "El servicio está tardando demasiado, intenta de nuevo" |

### 5.2 Circuit Breaker — Detalle

```python
# Implementación conceptual del Circuit Breaker en el Core
class CircuitBreakerState(enum.Enum):
    CLOSED = "closed"       # Funcionando normalmente
    OPEN = "open"           # Fallando, rechazar requests
    HALF_OPEN = "half_open" # Probando si ya se recuperó

class CircuitBreaker:
    def __init__(self, module_name: str, redis_client):
        self.module_name = module_name
        self.redis = redis_client
        self.failure_threshold = 5      # Fallos consecutivos para abrir
        self.success_threshold = 3      # Éxitos consecutivos para cerrar
        self.timeout_open = 30          # Segundos en estado OPEN
        self.timeout_half_open = 10     # Timeout para request de prueba

    async def get_state(self) -> CircuitBreakerState:
        state = await self.redis.get(f"circuit:{self.module_name}:state")
        return CircuitBreakerState(state) if state else CircuitBreakerState.CLOSED

    async def check(self) -> bool:
        state = await self.get_state()
        if state == CircuitBreakerState.OPEN:
            # Verificar si ya pasó el tiempo de espera
            opened_at = await self.redis.get(f"circuit:{self.module_name}:opened_at")
            if opened_at and (time.time() - float(opened_at)) > self.timeout_open:
                await self.set_state(CircuitBreakerState.HALF_OPEN)
                return True  # Permitir un request de prueba
            return False  # Rechazar
        return True  # CLOSED o HALF_OPEN

    async def record_success(self):
        state = await self.get_state()
        if state == CircuitBreakerState.HALF_OPEN:
            success_count = await self.redis.incr(f"circuit:{self.module_name}:half_open_success")
            if success_count >= self.success_threshold:
                await self.reset()
        else:
            await self.redis.set(f"circuit:{self.module_name}:fail_count", 0)

    async def record_failure(self):
        fail_count = await self.redis.incr(f"circuit:{self.module_name}:fail_count")
        if fail_count >= self.failure_threshold:
            await self.set_state(CircuitBreakerState.OPEN)
            await self.redis.set(f"circuit:{self.module_name}:opened_at", time.time())
            # Publicar evento de circuito abierto
            await publish_event("module.circuit.opened", {
                "module_name": self.module_name,
                "fail_count": fail_count
            })

    async def reset(self):
        await self.redis.delete(
            f"circuit:{self.module_name}:state",
            f"circuit:{self.module_name}:fail_count",
            f"circuit:{self.module_name}:opened_at",
            f"circuit:{self.module_name}:half_open_success"
        )
```

### 5.3 Timeouts

| Operación | Timeout | Acción si expira |
|-----------|---------|-----------------|
| Proxy a módulo (request normal) | 30 segundos | 504 Gateway Timeout |
| Proxy a módulo (circuit half-open) | 10 segundos | Circuit breaker registra fallo |
| Health check de módulo | 5 segundos | Marcar módulo como unhealthy |
| Consulta interna módulo → módulo | 15 segundos | 504, reintentar 1 vez |
| Publicación de evento NATS | 5 segundos | Reintentar 2 veces, luego log error |
| Autenticación JWT | 3 segundos | 401 |

### 5.4 Reintentos (Retry Policy)

| Escenario | Reintentos | Backoff | Estrategia |
|-----------|-----------|---------|------------|
| Proxy GET a módulo (timeout) | 1 | 1s | Solo si idempotente |
| Proxy POST a módulo (timeout) | 0 | — | No reintentar (riesgo de duplicación) |
| Health check fallido | 3 | 1s, 2s, 5s | Marcar unhealthy si todos fallan |
| Publicación NATS fallida | 2 | 500ms, 1s | Log error si persiste |
| Consulta módulo→módulo | 1 | 500ms | Solo GETs |
| Conexión a BD fallida | 3 | 1s, 2s, 4s | Pool de conexiones con reconexión |

---

## 6. API Client (Frontend)

### 6.1 Implementación Completa

```javascript
// src/core/api/client.jsx

class APIError extends Error {
    constructor(status, data) {
        super(data?.detail || data?.error?.message || `Error ${status}`);
        this.name = 'APIError';
        this.status = status;
        this.data = data;
    }
}

class SIGAApiClient {
    constructor() {
        this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        this.token = localStorage.getItem('siga_access_token');
        this.refreshToken = localStorage.getItem('siga_refresh_token');
        this.isRefreshing = false;
        this.refreshSubscribers = [];
    }

    setToken(token, refreshToken) {
        this.token = token;
        this.refreshToken = refreshToken;
        localStorage.setItem('siga_access_token', token);
        if (refreshToken) {
            localStorage.setItem('siga_refresh_token', refreshToken);
        }
    }

    clearToken() {
        this.token = null;
        this.refreshToken = null;
        localStorage.removeItem('siga_access_token');
        localStorage.removeItem('siga_refresh_token');
        window.location.href = '/login';
    }

    async request(endpoint, options = {}) {
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(this.token && { Authorization: `Bearer ${this.token}` }),
                'X-Request-ID': crypto.randomUUID(),
            },
            ...options,
        };

        let response;
        try {
            response = await fetch(`${this.baseURL}${endpoint}`, config);
        } catch (networkError) {
            throw new APIError(0, { detail: 'Error de conexión. Verifica tu red.' });
        }

        // Token expirado → intentar refresh
        if (response.status === 401 && this.refreshToken) {
            const refreshed = await this._attemptRefresh();
            if (refreshed) {
                config.headers.Authorization = `Bearer ${this.token}`;
                response = await fetch(`${this.baseURL}${endpoint}`, config);
            } else {
                this.clearToken();
                throw new APIError(401, { detail: 'Sesión expirada. Inicia sesión nuevamente.' });
            }
        }

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new APIError(response.status, data);
        }

        return response.json();
    }

    async _attemptRefresh() {
        if (this.isRefreshing) {
            // Esperar a que otro request complete el refresh
            return new Promise((resolve) => {
                this.refreshSubscribers.push(resolve);
            });
        }

        this.isRefreshing = true;
        try {
            const response = await fetch(`${this.baseURL}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.refreshToken}`,
                },
            });

            if (!response.ok) return false;

            const data = await response.json();
            this.setToken(data.access_token, data.refresh_token);

            // Notificar a los subscribers
            this.refreshSubscribers.forEach(cb => cb(true));
            this.refreshSubscribers = [];

            return true;
        } catch {
            return false;
        } finally {
            this.isRefreshing = false;
        }
    }

    // === Auth ===
    async login(email, password) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        this.setToken(data.access_token, data.refresh_token);
        return data;
    }

    async getCurrentUser() {
        return this.request('/auth/me');
    }

    async logout() {
        try {
            await this.request('/auth/logout', { method: 'POST' });
        } finally {
            this.clearToken();
        }
    }

    // === Módulos (via Core proxy) ===
    async callModule(moduleName, endpoint, method = 'GET', data = null) {
        const options = { method };
        if (data && method !== 'GET') {
            options.body = JSON.stringify(data);
        }
        return this.request(`/api/${moduleName}/${endpoint}`, options);
    }

    // === Core ===
    async getModules() {
        return this.request('/core/modules');
    }

    async getSystemStatus() {
        return this.request('/core/status');
    }
}

// Singleton
export const apiClient = new SIGAApiClient();
export { APIError };
```

### 6.2 Uso del API Client en Componentes

```jsx
// src/modules/academic/AcademicDashboard.jsx
import { useState, useEffect } from 'react';
import { apiClient } from '../../core/api/client';
import { usePermissions } from '../../core/hooks/usePermissions';

export function AcademicDashboard() {
    const [planes, setPlanes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { hasPermission } = usePermissions();

    useEffect(() => {
        loadPlanes();
    }, []);

    async function loadPlanes() {
        try {
            setLoading(true);
            const data = await apiClient.callModule(
                'mod-planes-estudio',
                'api/v1/planes?programa_id=1',
                'GET'
            );
            setPlanes(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleCreatePlan(newPlan) {
        if (!hasPermission('mod-planes-estudio:write')) return;
        try {
            const created = await apiClient.callModule(
                'mod-planes-estudio',
                'api/v1/planes',
                'POST',
                newPlan
            );
            setPlanes(prev => [...prev, created]);
        } catch (err) {
            setError(err.message);
        }
    }

    if (loading) return <Loading />;
    if (error) return <ErrorMessage message={error} />;

    return (
        <div>
            <h1>Planes de Estudio</h1>
            <DataTable
                data={planes}
                columns={[
                    { key: 'codigo', label: 'Código' },
                    { key: 'nombre', label: 'Nombre' },
                    { key: 'creditos_totales', label: 'Créditos' },
                    { key: 'estado', label: 'Estado' },
                ]}
                onEdit={handleEditPlan}
                onDelete={handleDeletePlan}
            />
        </div>
    );
}
```

---

## 7. Manejo de Errores en Frontend

### 7.1 Estrategia de Captura de Errores

```
ErrorBoundary (nivel módulo)
    │
    ├── Captura errores de renderizado
    ├── Muestra UI de fallback
    └── Reporta error al equipo técnico
    
Componente (try/catch en async)
    │
    ├── Captura errores de API
    ├── Mapa de errores a mensajes UX
    └── Acciones según tipo de error
```

### 7.2 ErrorBoundary Component

```jsx
// src/core/components/ErrorBoundary.jsx
import { Component } from 'react';

export class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
        // Reportar al sistema de monitoreo
        if (window.reportError) {
            window.reportError(error, errorInfo);
        }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="error-boundary">
                    <h2>Algo salió mal</h2>
                    <p>{this.props.fallbackMessage || 'Ha ocurrido un error inesperado.'}</p>
                    <button onClick={() => this.setState({ hasError: false })}>
                        Reintentar
                    </button>
                    {this.props.showDetails && (
                        <details>
                            <summary>Detalles técnicos</summary>
                            <pre>{this.state.error?.message}</pre>
                        </details>
                    )}
                </div>
            );
        }
        return this.props.children;
    }
}
```

### 7.3 Hook useApi

```jsx
// src/core/hooks/useApi.js
import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '../api/client';

export function useApi(moduleName, endpoint, options = {}) {
    const { method = 'GET', immediate = true, params = {} } = options;
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(immediate);
    const [error, setError] = useState(null);

    const execute = useCallback(async (body = null) => {
        setLoading(true);
        setError(null);
        try {
            const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
            const result = await apiClient.callModule(
                moduleName,
                `${endpoint}${queryString}`,
                method,
                body
            );
            setData(result);
            return result;
        } catch (err) {
            const message = getErrorMessage(err);
            setError(message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [moduleName, endpoint, method, JSON.stringify(params)]);

    useEffect(() => {
        if (immediate && method === 'GET') {
            execute();
        }
    }, [immediate, method, execute]);

    return { data, loading, error, execute, setData };
}

function getErrorMessage(err) {
    if (err instanceof APIError) {
        switch (err.status) {
            case 401: return 'Sesión expirada. Inicia sesión nuevamente.';
            case 403: return 'No tienes permisos para realizar esta acción.';
            case 404: return 'El recurso solicitado no fue encontrado.';
            case 429: return 'Demasiadas solicitudes. Intenta de nuevo en unos segundos.';
            case 502: case 503: return 'El servicio está temporalmente no disponible.';
            case 504: return 'El servicio está tardando demasiado. Intenta de nuevo.';
            default: return err.data?.detail || err.message || 'Error inesperado.';
        }
    }
    return 'Error de conexión. Verifica tu red.';
}
```

---

## 8. Monitoreo y Tracing

### 8.1 Distributed Tracing (OpenTelemetry)

```yaml
Headers de tracing:
  traceparent: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01
  tracestate: congo=t61rcWkgMzE
  
Propagación:
  Frontend → Core (HTTP): traceparent generado en frontend o Core
  Core → Módulo (HTTP): traceparent propagado en header
  Módulo → NATS: traceparent incluido en metadata del evento
  Módulo → BD: traceparent incluido en comment SQL (opcional)
```

### 8.2 Métricas Clave

| Métrica | Tipo | Recolectada en | Propósito |
|---------|------|---------------|-----------|
| `http_requests_total` | Counter | Core | Volumen de requests |
| `http_request_duration_ms` | Histogram | Core | Latencia de requests |
| `http_errors_total` | Counter | Core, Módulos | Tasa de error |
| `module_health_status` | Gauge | Core | Estado de cada módulo |
| `circuit_breaker_state` | Gauge | Core | Estado del circuit breaker |
| `nats_messages_published` | Counter | Módulos | Volumen de eventos |
| `nats_messages_consumed` | Counter | Módulos | Eventos procesados |
| `db_connection_pool_size` | Gauge | Core, Módulos | Conexiones activas a BD |
| `cache_hit_ratio` | Gauge | Core | Efectividad de caché Redis |
| `jwt_validation_time_ms` | Histogram | Core | Tiempo de validación JWT |

---

## 9. Seguridad en la Comunicación

### 9.1 Resumen de Medidas de Seguridad

| Capa | Medida | Implementación |
|------|--------|---------------|
| Transporte | HTTPS/TLS | Certificados Let's Encrypt, TLS 1.3 |
| Transporte (interno) | HTTP plano (solo red interna) | Docker network interna, VLAN dedicada |
| Autenticación | JWT (access + refresh) | RS256 o HS256, expiración 30 min |
| Autorización | Permisos por endpoint | Validación en Core antes de proxy |
| Comunicación interna | X-Internal-Token | JWT con secreto compartido, exp 30s |
| Rate limiting | Por usuario + ruta | Redis + contadores deslizantes |
| Anti-falsificación | X-Request-ID único | Validación de idempotencia |
| CORS | Orígenes permitidos | Solo dominios del frontend |
| Headers seguridad | CSP, X-Frame-Options, etc. | Middleware de seguridad HTTP |

### 9.2 Configuración CORS del Core

```python
# En el Core (FastAPI)
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://siga.iestp.edu.pe",
        "http://localhost:5173",  # Desarrollo
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-Processing-Time"],
)
```

### 9.3 Rate Limiting

```python
# Middleware de rate limiting en el Core
class RateLimitMiddleware:
    def __init__(self, redis_client):
        self.redis = redis_client

    async def check_rate_limit(self, user_id: int, endpoint_pattern: str) -> bool:
        # Ventana deslizante de 1 minuto
        key = f"ratelimit:{user_id}:{endpoint_pattern}"
        current = await self.redis.incr(key)
        if current == 1:
            await self.redis.expire(key, 60)

        limit = await self.get_limit_for_endpoint(endpoint_pattern)
        return current <= limit
```

---

## 10. Historial de Cambios

| Versión | Fecha | Autor | Cambios |
|---------|-------|-------|---------|
| 1.0.0 | 2026-06-26 | Arquitectura SIGA | Versión inicial del documento de comunicación |

---

> **Documento generado como parte de la arquitectura del Sistema Integrado de Gestión Académica (SIGA)**
> **IESTP — Instituto de Educación Superior Tecnológico Público**
