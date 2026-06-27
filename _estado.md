# INFORME DE ESTADO - SIGA

> **Última actualización:** 26 Jun 2026 | **Sesión:** 1 (Setup + Core + Migracion asyncpg + Docker)

---

## 1. OBJETIVO GENERAL

Construir el SIGA (Sistema Integrado de Gestion Academica): Core modular (FastAPI + SQLAlchemy async + NATS + JWT + Redis) + microservicios + frontend React + parser MINEDU. Meta inmediata: **MVP operativo** con Core funcional, 2+ modulos, y planes de estudio cargados.

---

## 2. ESTRUCTURA DEL PROYECTO

```
D:\SIGA\
├── docs/                       # Documentacion arquitectura (14 docs)
├── siga_backend/               # Backend Python
│   ├── app/                    # Core FastAPI
│   │   ├── core/               # Gateway, Registry, Security, Config
│   │   │   ├── gateway/        # http_proxy, websocket_proxy, event_bus, security_middleware
│   │   │   ├── identity/       # auth_service, user_repository, seeds
│   │   │   └── registry/       # module_runtime, discovery
│   │   └── main.py             # Punto de entrada Core (puerto 8000)
│   ├── modules/                # Microservicios modulares
│   │   ├── mod-carreras/       # CRUD carreras (asyncpg - 11 seeds)
│   │   ├── mod-planes-estudio/ # Planes de estudio (asyncpg)
│   │   ├── mod-programas-estudio/ # Programas de estudio (asyncpg)
│   │   ├── mod-estudiantes/    # Maestro estudiantes (asyncpg)
│   │   └── mod-matricula/      # Proceso de matricula (asyncpg)
│   ├── alembic/                # Migraciones BD Core
│   ├── docker/                 # Dockerfiles
│   └── tools/                  # Scripts auxiliares
├── siga_frontend/              # React 19 + Vite 7 + Tailwind
├── docker-compose.yml          # Orquestacion completa
└── _estado.md                  # ESTE ARCHIVO
```

---

## 3. QUE FUNCIONA

### 3.1 Core (puerto 8000)

| Componente | Estado | Notas |
|-----------|--------|-------|
| FastAPI + Uvicorn | **OK** | Arranca sin errores |
| Auth (registro + login + JWT) | **OK** | Seed admin/admin123 |
| SecurityMiddleware | **OK** | Valida JWT + permisos |
| HTTP Gateway (proxy) | **OK** | Proxy a modulos con `Depends` + `Header(None)` corregido |
| Module Registry | **OK** | Descubre modulos en modules/, registra en BD |
| Event Bus (NATS) | **Degradado** | Sin NATS local; graceful degradation con timeout 3s |
| Cache (Redis) | **Degradado** | Sin Redis local; warning + sigue |
| WebSocket Gateway | **Sin probar** | Pendiente |
| Circuit Breaker | **Sin probar** | Pendiente |
| Fallback Manager | **Sin probar** | Pendiente |

### 3.2 Modulos

| Modulo | Puerto | Estado | CRUD | BD | Notas |
|--------|--------|--------|------|----|-------|
| mod-carreras | 8001 | **OK** | POST/GET/PUT/DELETE | asyncpg | 11 carreras seed |
| mod-planes-estudio | 8002 | **OK** | POST/GET | asyncpg | Tablas dropeadas por schema mismatch |
| mod-programas-estudio | 8005 | **OK** | POST/GET | asyncpg | Programas + periodos |
| mod-estudiantes | 8006 | **OK** | POST/GET | asyncpg | Campos socioeconomicos |
| mod-matricula | 8007 | **OK** | POST/GET/historial | asyncpg | Event bus NATS con timeout |

### 3.3 Frontend

| Componente | Estado | Notas |
|-----------|--------|-------|
| React 19 + Vite 7 | **OK** | `npm run build` compila |
| Tailwind CSS | **OK** | Configurado |
| Conexion backend real | **Pendiente** | Apunta a mock por ahora |

### 3.4 Docker

| Componente | Estado | Notas |
|-----------|--------|-------|
| Dockerfiles Core/modulos/frontend | **Creados** | Sin probar |
| docker-compose.yml | **Creado** | Sin probar |
| Docker Desktop | **Instalado** | Servicio `com.docker.service` detenido |

---

## 4. PROBLEMAS CONOCIDOS Y BLOQUEOS

### CRITICOS

| ID | Problema | Impacto | Status | Solucion |
|----|----------|---------|--------|----------|
| P1 | psycopg2 + Python 3.14 + Windows WIN1252: `UnicodeDecodeError` | **Todos los modulos con sync SQLAlchemy** | **RESUELTO** | Migrar a asyncpg (no usa WIN1252) |
| P2 | NATS no instalado localmente | Event bus inoperativo sin servidor | **Mitigado** | Graceful degradation con timeout 2-3s en connect |
| P3 | Redis no instalado localmente | Cache inoperativo | **Mitigado** | Graceful degradation con warning |
| P4 | Docker Desktop detenido | No se puede probar `docker compose up` | **BLOQUEADO** | Iniciar servicio: `net start com.docker.service` |
| P5 | `create_all` no modifica tablas existentes | Si schema cambio hay que dropear | **Mitigado** | Dropear tablas manualmente en desarrollo |

### PENDIENTES

| ID | Problema | Impacto | Prioridad |
|----|----------|---------|-----------|
| P6 | Parser MINEDU no implementado | No se pueden cargar planes de estudio | **ALTA** |
| P7 | Frontend apunta a mock backend | No conecta con datos reales | **MEDIA** |
| P8 | Sin tests automatizados | Riesgo de regression | **MEDIA** |
| P9 | Sin CI/CD | Deploy manual | **BAJA** |

---

## 5. LECCIONES APRENDIDAS (PROCESO)

1. **Leer todo antes de escribir** - No modificar un archivo sin leer todos los archivos del modulo primero. El contexto completo evita errores en cadena.
2. **Batch changes** - Identificar TODOS los problemas de un modulo de una vez, escribir todos los archivos, probar una sola vez. No iterar archivo por archivo.
3. **Detectar bloqueos temprano** - Al encontrar un bloqueo (ej: psycopg2 WIN1252), cancelar approach actual, buscar solucion completa, no parchar.
4. **NATS timeout** - `asyncio.wait_for()` necesario en todas las conexiones NATS. Sin timeout, `connect()` cuelga el modulo indefinidamente.
5. **Pydantic v2** - `from_attributes=True` va en `model_config = ConfigDict(from_attributes=True)`, no en `Config`. `.dict()` -> `.model_dump()`. `datetime` fields tipar como `datetime`, no `str`.
6. **Password BD** - La password real es `john.007`, no `postgres`. Verificar `.env` de cada modulo.
7. **AsyncSession commit/refresh** - `await db.commit()` + `await db.refresh(obj)` es obligatorio en asyncpg. Sin `refresh`, el objeto no tiene `id` poblado.

---

## 6. PROXIMOS PASOS CONCRETOS

### Inmediatos (proxima sesion)

1. **Parser MINEDU** - Construir parser para los 8 libros Excel de planes de estudio (estructura modular con tests por programa).
2. **Docker** - Iniciar Docker Desktop y probar `docker compose up` con todos los servicios.
3. **Frontend** - Conectar frontend al backend real (cambiar proxy de mock a Core:8000).
4. **Test integracion** - Probar gateway Core -> todos los modulos con autenticacion JWT.
5. **mod-evaluacion** - Iniciar fase 3: modulo de evaluacion (notas, promedios, boletines).

### Pendientes por resolver

- NATS: Instalar servidor local o decidir si usar solo graceful degradation.
- Redis: Instalar o decidir si prescindir del cache por ahora.
- Tests: Escribir tests unitarios para Core y modulos.
- Seed data: Cargar data real de 11 programas.

---

## 7. REFERENCIAS

- Documentacion: `D:\SIGA\docs\00-INDICE.md`
- Roadmap: `D:\SIGA\docs\12-ROADMAP.md`
- Core: `D:\SIGA\siga_backend\app\main.py`
- Modulos: `D:\SIGA\siga_backend\modules\`
- Docker: `D:\SIGA\docker-compose.yml`
- Frontend: `D:\SIGA\siga_frontend\`
