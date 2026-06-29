# Arquitectura de Seguridad

> **Versión:** 1.0 | **Última actualización:** Junio 2026 | **Estándar:** SIGA-SEC-1.0

---

## 1. Principios de Seguridad

| # | Principio | Descripción |
|---|-----------|-------------|
| 1 | **Defense in Depth** | Múltiples capas de seguridad: red, transporte, aplicación, base de datos, almacenamiento |
| 2 | **Mínimo Privilegio** | Cada usuario, módulo y servicio tiene solo los permisos necesarios para su función |
| 3 | **Separación de Responsabilidades** | Ninguna entidad tiene control completo sobre un proceso crítico |
| 4 | **Nunca Confiar en el Cliente** | Todo input del cliente es potencialmente malicioso; validar siempre en servidor |
| 5 | **Validar Todo en el Servidor** | Validación duplicada: frontend (UX) + backend (seguridad) |
| 6 | **No Almacenar Secrets en Código** | Usar variables de entorno, Docker secrets, o K8s secrets |
| 7 | **HTTPS Siempre** | TLS 1.3 obligatorio en producción; HTTP solo en desarrollo local |
| 8 | **Auditoría de Acciones Sensibles** | Toda operación crítica debe ser registrada con trazabilidad completa |
| 9 | **Fail Secure** | Ante fallo, el sistema debe denegar acceso por defecto (default-deny) |
| 10 | **Seguridad por Diseño** | La seguridad no es un añadido; se incorpora desde la arquitectura |

---

## 2. Modelo de Autenticación

### 2.1 JWT (JSON Web Tokens)

| Parámetro | Valor |
|-----------|-------|
| Algoritmo | HS256 (HMAC con SHA-256) |
| Secret Key | `SECRET_KEY` (variable de entorno, mínimo 32 caracteres) |
| Expiración Usuario | 30 minutos (`ACCESS_TOKEN_EXPIRE_MINUTES = 30`) |
| Expiración Módulo | 24 horas (`INTERNAL_TOKEN_EXPIRE_HOURS = 24`) |
| Refresh Token | 7 días (para renovar sin login) |
| Almacenamiento Frontend | `localStorage` con prefijo `siga_` |

### 2.2 Estructura del Token de Usuario

```json
{
    "sub": "1",
    "email": "admin@siga.edu",
    "permissions": [
        "mod-planes:read",
        "mod-planes:write",
        "mod-planes:admin",
        "core:access",
        "core:user:manage",
        "core:module:manage"
    ],
    "type": "user_access",
    "role": "admin",
    "programa_id": null,
    "exp": 1700000000,
    "iat": 1699996400,
    "jti": "550e8400-e29b-41d4-a716-446655440000"
}
```

### 2.3 Estructura del Token Interno (Módulos)

```json
{
    "sub": "module::mod-matricula",
    "scopes": [
        "matricula:read",
        "matricula:write",
        "core:health",
        "core:events"
    ],
    "type": "module_access",
    "module_name": "mod-matricula",
    "module_version": "1.2.0",
    "exp": 1700000000,
    "iat": 1699910000
}
```

### 2.4 Flujo de Autenticación Completo

```
┌─────────┐          ┌──────────┐          ┌──────────┐          ┌────────┐
│ Frontend │          │   Core   │          │    BD    │          │ Redis  │
└────┬─────┘          └────┬─────┘          └────┬─────┘          └───┬────┘
     │                     │                     │                   │
     │  POST /auth/login   │                     │                   │
     │  {email, password}  │                     │                   │
     │────────────────────>│                     │                   │
     │                     │  SELECT hash FROM   │                   │
     │                     │  core_users WHERE   │                   │
     │                     │  email = :email     │                   │
     │                     │────────────────────>│                   │
     │                     │  hash, user_data    │                   │
     │                     │<────────────────────│                   │
     │                     │                     │                   │
     │                     │  bcrypt.verify()    │                   │
     │                     │                     │                   │
     │                     │  Generar JWT        │                   │
     │                     │  payload + sign     │                   │
     │                     │                     │                   │
     │                     │  SET blacklist      │                   │
     │                     │  jti:false          │                   │
     │                     │─────────────────────────────────────────>│
     │                     │                     │                   │
     │  {access_token,     │                     │                   │
     │   refresh_token,    │                     │                   │
     │   user}             │                     │                   │
     │<────────────────────│                     │                   │
     │                     │                     │                   │
     │  Almacenar en       │                     │                   │
     │  localStorage       │                     │                   │
     │                     │                     │                   │
```

### 2.5 Implementación del Servicio de Autenticación

```python
# core/auth/service.py
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from passlib.context import CryptContext
from core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AuthService:
    def __init__(self, secret_key: str, algorithm: str = "HS256"):
        self.secret_key = secret_key
        self.algorithm = algorithm

    def hash_password(self, password: str) -> str:
        """Genera hash bcrypt con salt automático."""
        return pwd_context.hash(password)

    def verify_password(self, plain: str, hashed: str) -> bool:
        """Verifica contraseña contra hash almacenado."""
        return pwd_context.verify(plain, hashed)

    def create_user_token(self, user_id: int, email: str,
                          permissions: list, role: str,
                          programa_id: int | None = None) -> str:
        """Crea JWT para usuario."""
        now = datetime.now(timezone.utc)
        payload = {
            "sub": str(user_id),
            "email": email,
            "permissions": permissions,
            "type": "user_access",
            "role": role,
            "programa_id": programa_id,
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(minutes=30)).timestamp()),
            "jti": str(uuid4())
        }
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)

    def create_internal_token(self, module_name: str,
                              scopes: list[str]) -> str:
        """Crea JWT interno para comunicación módulo-core."""
        now = datetime.now(timezone.utc)
        payload = {
            "sub": f"module::{module_name}",
            "scopes": scopes,
            "type": "module_access",
            "module_name": module_name,
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(hours=24)).timestamp())
        }
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)

    def verify_token(self, token: str) -> dict | None:
        """Verifica y decodifica JWT. Retorna payload o None."""
        try:
            payload = jwt.decode(
                token, self.secret_key,
                algorithms=[self.algorithm]
            )
            return payload
        except JWTError:
            return None
```

### 2.6 Refresh Token Flow

```python
@app.post("/auth/refresh")
async def refresh_token(refresh_token: str, db: Session = Depends(get_db)):
    """Renueva access token usando refresh token."""
    payload = auth_service.verify_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(401, "Refresh token inválido")

    user = db.query(User).get(int(payload["sub"]))
    if not user or not user.is_active:
        raise HTTPException(401, "Usuario inactivo o no encontrado")

    # Invalidar refresh token anterior (rotación)
    new_access = auth_service.create_user_token(
        user.id, user.email, user.permissions, user.role
    )
    new_refresh = auth_service.create_refresh_token(user.id)

    return {"access_token": new_access, "refresh_token": new_refresh}
```

### 2.7 Logout (Blacklist de Tokens)

```python
@app.post("/auth/logout")
async def logout(token: str = Depends(get_bearer_token),
                 redis: Redis = Depends(get_redis)):
    """Invalida token actual agregándolo a blacklist."""
    payload = auth_service.verify_token(token)
    if payload:
        jti = payload.get("jti")
        exp = payload.get("exp")
        ttl = max(0, int(exp) - int(datetime.now(timezone.utc).timestamp()))
        await redis.set(f"blacklist:{jti}", "true", ex=ttl)
    return {"message": "Sesión cerrada exitosamente"}
```

---

## 3. Modelo de Autorización

### 3.1 RBAC + Permisos Granulares

```
Usuario
    ↓ tiene 1..N
Roles (admin, docente, alumno, director, secretario, sistemas)
    ↓ dan acceso a
Permisos: "{modulo}:{accion}"
    ↓ ejemplos
    mod-planes-estudio:read       → Leer planes de estudio
    mod-planes-estudio:write      → Crear/editar planes
    mod-planes-estudio:admin      → Eliminar, aprobar planes
    core:access                   → Acceder al sistema
    core:module:manage            → Registrar/desregistrar módulos
    core:user:manage              → Gestionar usuarios
    core:user:impersonate         → (solo admin) Suplantar usuario
```

### 3.2 Roles y sus Permisos Base

| Rol | Permisos | Módulos Accesibles |
|-----|----------|-------------------|
| **admin** | `*:*` (todos) | Todos (total) |
| **director** | `mod-*:read`, `mod-reportes:*`, `core:dashboard` | Todos (lectura), Reportes (total) |
| **secretario** | `mod-estudiantes:write`, `mod-matricula:write`, `mod-*:read` | Estudiantes, Matrícula, resto (lectura) |
| **docente** | `mod-planes:read`, `mod-evaluacion:write`, `mod-estudiantes:read` | Planes (lectura), Evaluación (escritura), Estudiantes (lectura) |
| **alumno** | `mod-planes:read`, `mod-matricula:self`, `mod-evaluacion:self` | Planes (lectura), Matrícula (propia), Evaluación (propia) |
| **sistemas** | `core:*`, `mod-*:read`, `mod-*:admin` | Todos (configuración técnica) |
| **invitado** | `core:access` | Solo dashboard público |

### 3.3 Matriz de Permisos por Módulo

Cada módulo define sus permisos en el manifiesto. A continuación, la matriz consolidada:

| Módulo | Permisos | Descripción |
|--------|----------|-------------|
| `mod-planes-estudio` | `read`, `write`, `admin` | CRUD + aprobación de planes |
| `mod-programas-estudio` | `read`, `write`, `admin` | Gestión de programas |
| `mod-estudiantes` | `read`, `write`, `admin`, `import` | Maestro de estudiantes |
| `mod-matricula` | `process`, `read`, `write`, `admin`, `cancel` | Proceso de matrícula |
| `mod-evaluacion` | `read`, `write`, `admin`, `publish` | Registro de notas |
| `mod-convalidaciones` | `read`, `write`, `admin`, `approve` | Convalidaciones |
| `mod-traslados` | `read`, `write`, `admin` | Traslados internos/externos |
| `mod-reingresos` | `read`, `write`, `admin` | Reingresos |
| `mod-reportes` | `read`, `generate`, `admin`, `export` | Reportes MINEDU |
| `core` | `access`, `module:manage`, `user:manage`, `config:manage` | Core del sistema |

### 3.4 Verificación de Permisos

```python
# core/auth/permissions.py
from fastapi import HTTPException, Depends
from functools import wraps

def require_permission(permission: str):
    """Decorator para verificar permisos en endpoints."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Buscar current_user en kwargs (inyectado por dependencia)
            current_user = kwargs.get("current_user")
            if not current_user:
                raise HTTPException(401, "No autenticado")

            # Admin tiene todos los permisos
            if current_user["role"] == "admin":
                return await func(*args, **kwargs)

            # Verificar permiso específico
            user_permissions = current_user.get("permissions", [])
            if permission not in user_permissions:
                raise HTTPException(403, f"Permiso requerido: {permission}")

            return await func(*args, **kwargs)
        return wrapper
    return decorator

# Uso en rutas:
@router.get("/planes")
@require_permission("mod-planes-estudio:read")
async def listar_planes(current_user = Depends(get_current_user)):
    ...
```

### 3.5 Tabla de Permisos en Base de Datos

```sql
-- core/database/migrations/003_roles_permissions.sql

CREATE TABLE core_roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE,  -- No editable si es del sistema
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE core_permissions (
    id SERIAL PRIMARY KEY,
    codename VARCHAR(100) UNIQUE NOT NULL,  -- "mod-planes:read"
    description TEXT,
    module VARCHAR(50) NOT NULL,            -- "mod-planes-estudio"
    action VARCHAR(50) NOT NULL,            -- "read", "write", "admin"
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE core_role_permissions (
    role_id INTEGER REFERENCES core_roles(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES core_permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE core_user_roles (
    user_id INTEGER REFERENCES core_users(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES core_roles(id) ON DELETE CASCADE,
    granted_by INTEGER REFERENCES core_users(id),
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);

-- Índices
CREATE INDEX idx_permissions_module ON core_permissions(module);
CREATE INDEX idx_user_roles_user ON core_user_roles(user_id);
CREATE INDEX idx_user_roles_role ON core_user_roles(role_id);
```

---

## 4. Middleware de Seguridad (SecurityMiddleware)

### 4.1 Implementación del Middleware

```python
# core/middleware/security.py
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
import time
import re

class SecurityMiddleware(BaseHTTPMiddleware):
    """
    Middleware de seguridad integral:
    - Autenticación JWT
    - Autorización por permisos
    - Rate limiting básico
    - Logging de auditoría
    - Headers de seguridad
    """

    def __init__(self, app, auth_service, redis_client=None):
        super().__init__(app)
        self.auth_service = auth_service
        self.redis = redis_client

    async def dispatch(self, request: Request, call_next):
        # Registrar tiempo de inicio
        start_time = time.time()

        # 1. Verificar si es ruta pública
        if self._is_public_path(request.url.path):
            return await call_next(request)

        # 2. Extraer y validar token
        auth_header = request.headers.get("Authorization", "")
        token = self._extract_bearer_token(auth_header)

        if not token:
            return Response(
                content='{"detail": "Token de autenticación requerido"}',
                status_code=401,
                media_type="application/json"
            )

        # 3. Verificar JWT
        payload = self.auth_service.verify_token(token)
        if not payload:
            return Response(
                content='{"detail": "Token inválido o expirado"}',
                status_code=401,
                media_type="application/json"
            )

        # 4. Verificar blacklist (logout)
        if self.redis:
            jti = payload.get("jti")
            if jti and await self.redis.get(f"blacklist:{jti}"):
                return Response(
                    content='{"detail": "Token revocado"}',
                    status_code=401,
                    media_type="application/json"
                )

        # 5. Determinar tipo de token
        if payload.get("type") == "module_access":
            # Token interno de módulo
            request.state.auth_type = "module"
            request.state.module_name = payload.get("module_name")
            request.state.scopes = payload.get("scopes", [])
        else:
            # Token de usuario
            request.state.auth_type = "user"
            request.state.user_id = payload.get("sub")
            request.state.user_email = payload.get("email")
            request.state.user_permissions = payload.get("permissions", [])
            request.state.user_role = payload.get("role")

        # 6. Verificar permisos para rutas de módulos
        if request.url.path.startswith("/api/"):
            module_name = self._extract_module_name(request.url.path)
            if module_name and not self._is_internal_request(request):
                required = f"mod-{module_name}:read"
                perms = request.state.user_permissions
                if required not in perms and "*:*" not in perms:
                    return Response(
                        content='{"detail": "Permisos insuficientes"}',
                        status_code=403,
                        media_type="application/json"
                    )

        # 7. Ejecutar request
        try:
            response = await call_next(request)

            # 8. Agregar headers de seguridad
            response.headers["X-Content-Type-Options"] = "nosniff"
            response.headers["X-Frame-Options"] = "DENY"

            # 9. Log de auditoría para writes
            if request.method in ("POST", "PUT", "PATCH", "DELETE"):
                await self._log_audit(request, response.status_code)

            return response

        except Exception as e:
            # Log de error de seguridad
            await self._log_audit(request, 500, error=str(e))
            raise

    def _is_public_path(self, path: str) -> bool:
        PUBLIC_PATHS = [
            r"^/$",
            r"^/health$",
            r"^/core/status$",
            r"^/core/modules$",
            r"^/auth/login$",
            r"^/auth/register$",
            r"^/auth/refresh$",
            r"^/docs",
            r"^/redoc",
            r"^/openapi.json",
        ]
        return any(re.match(p, path) for p in PUBLIC_PATHS)

    def _extract_bearer_token(self, auth_header: str) -> str | None:
        if not auth_header.startswith("Bearer "):
            return None
        return auth_header[7:]

    def _extract_module_name(self, path: str) -> str | None:
        # /api/v1/planes/... -> "planes"
        match = re.match(r"^/api/v1/([^/]+)", path)
        return match.group(1) if match else None

    async def _log_audit(self, request: Request, status: int, error=None):
        """Registra evento de auditoría (asíncrono, no bloqueante)."""
        audit_event = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "method": request.method,
            "path": request.url.path,
            "status": status,
            "user_id": getattr(request.state, "user_id", None),
            "ip": request.client.host if request.client else None,
            "user_agent": request.headers.get("user-agent"),
            "error": error
        }
        # Publicar evento de auditoría a NATS
        await event_bus.publish("core.audit.log", audit_event)
```

### 4.2 Rutas Públicas (sin autenticación)

| Ruta | Método | Propósito |
|------|--------|-----------|
| `/` | GET | Página de inicio / API info |
| `/health` | GET | Health check del Core |
| `/core/status` | GET | Estado general del sistema |
| `/core/modules` | GET | Lista de módulos registrados |
| `/auth/login` | POST | Inicio de sesión |
| `/auth/register` | POST | Registro de nuevo usuario |
| `/auth/refresh` | POST | Renovación de token |
| `/docs` | GET | Documentación Swagger |
| `/redoc` | GET | Documentación ReDoc |
| `/openapi.json` | GET | Especificación OpenAPI |

---

## 5. Comunicación Segura Módulo-Core

### 5.1 Token Interno

```python
# core/services/token_service.py
def generate_module_token(module_name: str, scopes: list[str]) -> str:
    """Genera token interno para comunicación módulo-core."""
    payload = {
        "sub": f"module::{module_name}",
        "scopes": scopes,
        "type": "module_access",
        "module_name": module_name,
        "iat": int(datetime.now(timezone.utc).timestamp()),
        "exp": int((datetime.now(timezone.utc) + timedelta(hours=24)).timestamp()),
        "jti": str(uuid4())
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")
```

### 5.2 Validación del Lado del Módulo

```python
# mod-ejemplo/auth.py
from fastapi import Request, HTTPException, Depends
from jose import jwt, JWTError

def verify_internal_token(request: Request) -> dict:
    """
    Valida el X-Internal-Token enviado por el Core.
    Cada módulo debe llamar esta función en sus endpoints protegidos.
    """
    token = request.headers.get("X-Internal-Token")
    if not token:
        raise HTTPException(
            status_code=401,
            detail="Token interno requerido"
        )

    try:
        payload = jwt.decode(
            token,
            os.getenv("CORE_SECRET_KEY"),
            algorithms=["HS256"]
        )
    except JWTError:
        raise HTTPException(
            status_code=403,
            detail="Token interno inválido o expirado"
        )

    if payload.get("type") != "module_access":
        raise HTTPException(
            status_code=403,
            detail="Tipo de token inválido"
        )

    return payload


# Uso en rutas:
@router.get("/estudiantes")
async def listar_estudiantes(
    request: Request,
    db: Session = Depends(get_db),
    token: dict = Depends(verify_internal_token)
):
    # Token validado, procesar request
    estudiantes = db.query(Estudiante).all()
    return {"items": estudiantes}
```

### 5.3 Headers de Confianza (Trusted Headers)

El Core envía estos headers a los módulos después de validar al usuario:

| Header | Contenido | Ejemplo |
|--------|-----------|---------|
| `X-Internal-Token` | JWT interno del módulo | `eyJhbGciOiJIUzI1NiIs...` |
| `X-User-Id` | ID del usuario autenticado | `42` |
| `X-User-Email` | Email del usuario | `docente@siga.edu` |
| `X-User-Role` | Rol del usuario | `docente` |
| `X-User-Permissions` | Permisos (JSON) | `["mod-evaluacion:write"]` |
| `X-Request-Id` | ID único de request (trazabilidad) | `req_abc123` |

### 5.4 Proxy con Inyección de Headers

```python
# core/gateway/http_gateway.py
async def proxy_to_module(request: Request, module_url: str):
    """Proxy con inyección de headers de seguridad."""

    # Generar headers de confianza
    trusted_headers = {
        "X-Internal-Token": generate_module_token(
            module_name=module_url,
            scopes=["*"]
        ),
        "X-User-Id": str(request.state.user_id),
        "X-User-Email": request.state.user_email,
        "X-User-Role": request.state.user_role,
        "X-User-Permissions": json.dumps(
            request.state.user_permissions
        ),
        "X-Request-Id": str(uuid4())
    }

    # Construir request proxy
    proxy_request = await build_proxy_request(
        request, module_url, trusted_headers
    )

    # Enviar con timeout
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.send(proxy_request)
            return Response(
                content=response.content,
                status_code=response.status_code,
                headers=dict(response.headers)
            )
    except httpx.TimeoutException:
        raise HTTPException(504, "Módulo no respondió a tiempo")
    except httpx.ConnectionError:
        raise HTTPException(502, "Módulo no disponible")
```

---

## 6. Protección de Contraseñas

### 6.1 Política de Contraseñas

```python
# core/auth/password_policy.py
import re
from pydantic import BaseModel, validator

class PasswordPolicy(BaseModel):
    min_length: int = 8
    max_length: int = 128
    require_uppercase: bool = True
    require_lowercase: bool = True
    require_digit: bool = True
    require_special: bool = True
    special_chars: str = "!@#$%^&*()-_=+[]{}|;:,.<>?/~`"
    reject_common: bool = True
    max_consecutive_repeat: int = 3
    password_history: int = 5  # No permitir últimas 5 contraseñas

    def validate(self, password: str, user_data: dict = None) -> list[str]:
        errors = []

        if len(password) < self.min_length:
            errors.append(f"Mínimo {self.min_length} caracteres")

        if len(password) > self.max_length:
            errors.append(f"Máximo {self.max_length} caracteres")

        if self.require_uppercase and not re.search(r"[A-Z]", password):
            errors.append("Debe contener mayúscula")

        if self.require_lowercase and not re.search(r"[a-z]", password):
            errors.append("Debe contener minúscula")

        if self.require_digit and not re.search(r"\d", password):
            errors.append("Debe contener número")

        if self.require_special and not re.search(
            f"[{re.escape(self.special_chars)}]", password
        ):
            errors.append("Debe contener carácter especial")

        # No permitir información personal
        if user_data:
            for field in ["email", "nombre", "apellido", "dni"]:
                if user_data.get(field, "").lower() in password.lower():
                    errors.append(f"No debe contener {field}")

        return errors
```

### 6.2 Hash con bcrypt

```python
from passlib.context import CryptContext

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12  # Cost factor: 2^12 iteraciones
)

def hash_password(password: str) -> str:
    """Genera hash seguro con bcrypt (salt automático de 16 bytes)."""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica contraseña contra hash almacenado."""
    return pwd_context.verify(plain_password, hashed_password)
```

---

## 7. CORS (Cross-Origin Resource Sharing)

### 7.1 Configuración en Core

```python
# core/main.py
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "X-Internal-Token",
        "X-Request-Id",
        "X-User-Id",
        "X-User-Email",
        "X-User-Role",
        "X-User-Permissions"
    ],
    expose_headers=[
        "X-Request-Id",
        "X-RateLimit-Limit",
        "X-RateLimit-Remaining"
    ],
    max_age=600  # Cache de preflight por 10 minutos
)
```

### 7.2 Configuración por Entorno

```python
# core/config.py
class Settings(BaseSettings):
    # ... otros settings ...

    @property
    def CORS_ORIGINS(self) -> list[str]:
        if self.ENVIRONMENT == "development":
            return [
                "http://localhost:5173",
                "http://localhost:5174",
                "http://localhost:3000",
                "http://127.0.0.1:5173",
            ]
        elif self.ENVIRONMENT == "staging":
            return [
                "https://staging.siga.iestp.edu.pe",
                "https://admin.staging.siga.iestp.edu.pe",
            ]
        else:  # production
            return [
                "https://siga.iestp.edu.pe",
                "https://admin.siga.iestp.edu.pe",
            ]
```

---

## 8. Headers de Seguridad

### 8.1 Configuración para Nginx (Producción)

```nginx
# /etc/nginx/conf.d/security-headers.conf

# HSTS: Fuerza HTTPS por 1 año
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

# Prevenir MIME sniffing
add_header X-Content-Type-Options "nosniff" always;

# Prevenir clickjacking
add_header X-Frame-Options "DENY" always;

# Protección XSS para navegadores antiguos
add_header X-XSS-Protection "1; mode=block" always;

# Content Security Policy
add_header Content-Security-Policy "
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data:;
    font-src 'self';
    connect-src 'self' https://api.siga.iestp.edu.pe;
    frame-src 'none';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
" always;

# Referrer Policy
add_header Referrer-Policy "strict-origin-when-cross-origin" always;

# Permissions Policy (Feature Policy)
add_header Permissions-Policy "
    camera=(),
    microphone=(),
    geolocation=(),
    payment=(),
    usb=(),
    fullscreen=(self)
" always;

# Cache Control para APIs
add_header Cache-Control "no-store, no-cache, must-revalidate" always;

# Deshabilitar server version
server_tokens off;
```

### 8.2 Verificación con Security Headers

```bash
# Script de verificación de headers de seguridad
curl -sI https://siga.iestp.edu.pe | grep -iE "^(strict|content-security|x-|referrer|permissions)"
```

---

## 9. Auditoría de Seguridad

### 9.1 Tabla de Auditoría

```sql
-- core/database/migrations/004_audit_log.sql

CREATE TABLE core_audit_log (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES core_users(id),
    session_id VARCHAR(100),
    action VARCHAR(50) NOT NULL,
    -- login, logout, create, update, delete, read_sensitive,
    -- permission_change, role_change, module_register,
    -- module_unregister, password_change, export, impersonate
    entity_type VARCHAR(100),
    -- user, role, permission, module, student, enrollment, grade
    entity_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    metadata JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    request_id VARCHAR(100) UNIQUE,
    correlation_id VARCHAR(100),
    duration_ms INTEGER,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Particionamiento por mes (mejora rendimiento en tablas grandes)
CREATE TABLE core_audit_log_2026_01 () INHERITS (core_audit_log);
CREATE TABLE core_audit_log_2026_02 () INHERITS (core_audit_log);
-- ... creación automática via cron mensual

-- Índices
CREATE INDEX idx_audit_user ON core_audit_log(user_id);
CREATE INDEX idx_audit_action ON core_audit_log(action);
CREATE INDEX idx_audit_entity ON core_audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_created ON core_audit_log(created_at DESC);
CREATE INDEX idx_audit_request ON core_audit_log(request_id);
CREATE INDEX idx_audit_correlation ON core_audit_log(correlation_id);
```

### 9.2 Eventos Auditados Obligatoriamente

| Categoría | Evento | Datos Registrados |
|-----------|--------|-------------------|
| **Autenticación** | Login exitoso | user_id, IP, user-agent |
| | Login fallido | email, IP, user-agent, motivo |
| | Logout | user_id, session_id |
| | Refresh token | user_id, old_token_jti |
| **Usuarios** | Creación de usuario | new_values (email, role) |
| | Modificación de usuario | old_values, new_values |
| | Eliminación de usuario | old_values, motivo |
| | Cambio de contraseña | user_id (nunca el password) |
| **Roles/Permisos** | Asignación de rol | user_id, role_id, granted_by |
| | Remoción de rol | user_id, role_id, revoked_by |
| | Creación de permiso | name, description |
| **Módulos** | Registro de módulo | module_name, version, endpoint |
| | Desregistro de módulo | module_name, motivo |
| | Fallo de health check | module_name, error |
| **Datos Sensibles** | Exportación de datos | entity_type, filters, user |
| | Eliminación de registros | entity_type, entity_id, old_values |
| | Modificación masiva | entity_type, count, changes |
| **Admin** | Impersonación | admin_id, target_user_id |
| | Cambio de configuración | config_key, old_value, new_value |

### 9.3 Servicio de Auditoría

```python
# core/services/audit_service.py
from datetime import datetime, timezone
import json

class AuditService:
    def __init__(self, db_session, event_bus=None):
        self.db = db_session
        self.event_bus = event_bus

    async def log(self, action: str, entity_type: str = None,
                  entity_id: int = None, user_id: int = None,
                  old_values: dict = None, new_values: dict = None,
                  metadata: dict = None, request=None):
        """Registra un evento de auditoría."""

        audit_entry = {
            "user_id": user_id or getattr(request.state, "user_id", None),
            "session_id": getattr(request.state, "session_id", None),
            "action": action,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "old_values": json.dumps(old_values) if old_values else None,
            "new_values": json.dumps(new_values) if new_values else None,
            "metadata": json.dumps(metadata) if metadata else None,
            "ip_address": request.client.host if request else None,
            "user_agent": request.headers.get("user-agent") if request else None,
            "request_id": getattr(request.state, "request_id", None),
            "created_at": datetime.now(timezone.utc)
        }

        # Insertar en BD (asíncrono)
        stmt = """
            INSERT INTO core_audit_log
                (user_id, action, entity_type, entity_id,
                 old_values, new_values, metadata,
                 ip_address, user_agent, request_id, created_at)
            VALUES
                (:user_id, :action, :entity_type, :entity_id,
                 :old_values, :new_values, :metadata,
                 :ip_address, :user_agent, :request_id, :created_at)
        """
        await self.db.execute(stmt, audit_entry)

        # Publicar evento para monitoreo en tiempo real
        if self.event_bus:
            await self.event_bus.publish("core.audit.event", {
                "action": action,
                "entity_type": entity_type,
                "entity_id": entity_id,
                "user_id": audit_entry["user_id"],
                "timestamp": audit_entry["created_at"].isoformat()
            })
```

---

## 10. Secrets Management

### 10.1 Desarrollo (.env)

```ini
# .env (NO SUBIR A GIT)
SECRET_KEY=dev-secret-key-change-in-production-min-32-chars
DATABASE_URL=postgresql://siga:siga123@localhost:5432/siga_core
REDIS_URL=redis://localhost:6379/0
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
INTERNAL_TOKEN_EXPIRE_HOURS=24
ENCRYPTION_KEY=32-byte-key-for-field-level-encryption
NATS_URL=nats://localhost:4222
```

### 10.2 Producción (Docker Secrets)

```yaml
# docker-compose.yml
services:
  core:
    image: siga/core:latest
    secrets:
      - db_password
      - secret_key
      - jwt_secret
    environment:
      DATABASE_URL: "postgresql://siga:{{DB_PASSWORD}}@db:5432/siga_core"
      SECRET_KEY_FILE: /run/secrets/secret_key

secrets:
  db_password:
    file: ./secrets/db_password.txt
  secret_key:
    file: ./secrets/secret_key.txt
```

### 10.3 Kubernetes Secrets

```yaml
# k8s/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: siga-core-secrets
type: Opaque
stringData:
  secret_key: "prod-secret-key-32-chars-minimum"
  db_password: "complex-db-password"
  jwt_secret: "jwt-signing-secret-different-from-secret-key"
```

### 10.4 Rotación de Secrets

```python
# core/security/rotation.py
from datetime import datetime, timedelta

class SecretRotator:
    """
    Gestiona rotación periódica de secrets.
    Ejecutar como cron job: 0 0 1 * * (primer día del mes)
    """

    def __init__(self, vault_client):
        self.vault = vault_client

    async def rotate_secret_key(self):
        """Rotación de SECRET_KEY manteniendo la anterior por 48h."""
        # Obtener key actual
        current_key = await self.vault.get("secret/siga/secret_key")

        # Generar nueva key
        new_key = secrets.token_hex(32)

        # Almacenar nueva como primaria
        await self.vault.set("secret/siga/secret_key", new_key)

        # Mantener anterior para tokens aún válidos
        await self.vault.set(
            "secret/siga/secret_key_previous",
            current_key,
            ttl=48 * 3600  # 48 horas
        )

        # Log de rotación
        await audit_service.log(
            action="secret_rotation",
            metadata={"secret": "SECRET_KEY"}
        )
```

---

## 11. Rate Limiting

### 11.1 Configuración

```python
# core/middleware/rate_limit.py
from fastapi import Request, HTTPException
from dataclasses import dataclass
from datetime import datetime, timezone

@dataclass
class RateLimitRule:
    pattern: str      # Regex de ruta
    limit: int        # Requests máximos
    window: int       # Ventana de tiempo en segundos

RATE_LIMIT_RULES = [
    RateLimitRule(pattern=r"^/auth/login$", limit=5, window=60),
    RateLimitRule(pattern=r"^/auth/register$", limit=3, window=3600),
    RateLimitRule(pattern=r"^/auth/refresh$", limit=10, window=60),
    RateLimitRule(pattern=r"^/api/.*", limit=200, window=60),
    RateLimitRule(pattern=r"^/admin/.*", limit=50, window=60),
    RateLimitRule(pattern=r"^/.*", limit=100, window=60),  # Default
]


class RateLimiter:
    """
    Rate limiter basado en Sliding Window + Redis.
    Usa Sorted Sets para ventanas deslizantes precisas.
    """

    def __init__(self, redis_client):
        self.redis = redis_client

    async def check(self, request: Request) -> bool:
        client_ip = request.client.host
        path = request.url.path

        # Encontrar regla aplicable
        rule = self._match_rule(path)

        # Clave: rate_limit:{ip}:{pattern}
        key = f"rate_limit:{client_ip}:{rule.pattern}"
        now = datetime.now(timezone.utc).timestamp()
        window_start = now - rule.window

        # Pipeline atómico
        pipe = self.redis.pipeline()
        pipe.zremrangebyscore(key, 0, window_start)  # Limpiar antiguos
        pipe.zcard(key)                                # Contar actuales
        pipe.zadd(key, {str(now): now})                # Agregar actual
        pipe.expire(key, rule.window)                  # TTL automático
        results = await pipe.execute()

        current_count = results[1]  # zcard result

        if current_count > rule.limit:
            return False  # Rate limit excedido

        return True
```

### 11.2 Headers de Rate Limit

```python
# En la respuesta, el middleware agrega:
response.headers["X-RateLimit-Limit"] = str(rule.limit)
response.headers["X-RateLimit-Remaining"] = str(rule.limit - current_count)
response.headers["X-RateLimit-Reset"] = str(int(window_start + rule.window))
```

---

## 12. Seguridad por Capas (Defense in Depth)

```
Capa 1 - Network
├── Firewall (solo puertos 80, 443, 5432 interno)
├── VPN para acceso administrativo
├── Red interna (VPC) - módulos no expuestos públicamente
├── WAF (Web Application Firewall) en producción
└── DDoS protection (CloudFlare o similar)

Capa 2 - Transport
├── HTTPS/TLS 1.3 (certificados Let's Encrypt)
├── HSTS con preload
├── Cipher suites fuertes (ECDHE + AES-GCM)
└── Certificate pinning (opcional)

Capa 3 - Application
├── JWT con expiración corta
├── RBAC + permisos granulares
├── Validación de inputs (Pydantic)
├── Rate limiting por IP
├── ORM (SQLAlchemy) - prevención SQL injection
├── CORS restrictivo
└── Auditoría de acciones sensibles

Capa 4 - Database
├── Roles de BD (siga_app, siga_readonly, siga_admin)
├── Conexiones SSL entre app y BD
├── Query timeout (30s default)
├── Connection pooling con límites
├── Backups automáticos cifrados
└── Point-in-time recovery habilitado

Capa 5 - Storage / Secrets
├── Secrets encriptados en reposo
├── Docker secrets / K8s secrets / HashiCorp Vault
├── Backups en S3 con cifrado AES-256
├── Logs rotados y comprimidos
└── Acceso a secrets auditado

Capa 6 - Monitoring & Response
├── SIEM (Security Information and Event Management)
├── Alertas automáticas de intrusiones
├── Escaneo de vulnerabilidades semanal
├── Bug bounty program (futuro)
├── Incident response plan documentado
└── Penetration testing anual
```

---

## 13. Checklist de Seguridad para Producción

### Pre-Despliegue

- [ ] `SECRET_KEY` cambiada (no usar valor por defecto)
- [ ] `JWT_ALGORITHM` configurado como `HS256` (no `none`)
- [ ] `CORS_ORIGINS` configurado con dominios específicos
- [ ] `DATABASE_URL` con credenciales seguras (no root)
- [ ] `DEBUG = False`
- [ ] `server_tokens off` en nginx
- [ ] SSL/TLS configurado (certificado válido)
- [ ] Rate limiting habilitado
- [ ] Headers de seguridad configurados en nginx
- [ ] Firewall configurado (solo puertos 80, 443, 22 interno)
- [ ] Logs de auditoría configurados
- [ ] Backups automáticos configurados

### Post-Despliegue

- [ ] Pruebas de penetración ejecutadas
- [ ] Revisión de dependencias: `pip audit`, `npm audit`
- [ ] Revisión de permisos de usuarios y roles
- [ ] Monitoreo de intentos de acceso fallidos (configurar alerta >10/min)
- [ ] Rotación de tokens internos verificada
- [ ] Prueba de restauración de backup
- [ ] Verificación de headers de seguridad con `securityheaders.com`
- [ ] Revisión de logs de acceso (buscar patrones sospechosos)
- [ ] Configuración de WAF (si aplica)
- [ ] Documentación de incidentes actualizada

### Periódico (Mensual)

- [ ] Rotación de `SECRET_KEY`
- [ ] Revisión de usuarios y roles
- [ ] Auditoría de permisos concedidos
- [ ] Revisión de logs de seguridad
- [ ] Escaneo de vulnerabilidades
- [ ] Actualización de dependencias
- [ ] Revisión de accesos de módulos

---

## 14. Plan de Respuesta a Incidentes

| Fase | Acción | Responsable | Tiempo |
|------|--------|-------------|--------|
| **Detección** | Identificar anomalía (alarma, reporte) | Sistema / Usuario | Inmediato |
| **Contención** | Aislar sistema afectado, revocar tokens | DevOps | 15 min |
| **Análisis** | Determinar alcance, vector de ataque | Equipo Seguridad | 2 h |
| **Erradicación** | Eliminar vulnerabilidad, parchear | Desarrollo | 4 h |
| **Recuperación** | Restaurar desde backup, validar integridad | DevOps | 4 h |
| **Post-mortem** | Documentar lecciones, actualizar defensas | Todo el equipo | 1 semana |

---

## 15. Referencias

- [OWASP Top 10 (2021)](https://owasp.org/Top10/)
- [OWASP API Security Top 10](https://owasp.org/API-Security/)
- [JWT Best Practices (RFC 7519)](https://datatracker.ietf.org/doc/html/rfc7519)
- [NIST SP 800-63B (Digital Identity Guidelines)](https://pages.nist.gov/800-63-3/sp800-63b.html)
- [bcrypt Password Hashing](https://github.com/pyca/bcrypt)

---

## 16. Historial de Cambios

| Fecha | Versión | Autor | Cambios |
|-------|---------|-------|---------|
| 2026-06-26 | 1.0 | Arquitecto SIGA | Versión inicial del documento de seguridad |

---
