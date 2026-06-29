# Visión Arquitectónica General - SIGA

| Versión | Fecha       | Autor               | Descripción                        |
|---------|-------------|----------------------|------------------------------------|
| 1.0     | 2026-06-26  | Equipo Arquitectura  | Versión inicial del documento      |

---

## 1. Propósito del Documento

### 1.1 Alcance
Este documento define la visión arquitectónica completa del Sistema Integrado de Gestión Académica (SIGA) para el Instituto de Educación Superior Tecnológico Público (IESTP). Abarca desde los principios fundamentales de diseño hasta el detalle de componentes, flujos de datos, decisiones arquitectónicas, y el stack tecnológico. Es el documento raíz del que derivan los artefactos técnicos detallados: `02-CORE.md`, `03-SOCKET-MODULE-RUNTIME.md`, y `04-RESILIENCIA.md`.

### 1.2 Audiencia
| Rol | Uso del documento |
|-----|-------------------|
| Arquitectos de Software | Validar consistencia arquitectónica, resolver decisiones de diseño |
| Desarrolladores Backend | Entender la estructura del Core, módulos, y protocolos de comunicación |
| Desarrolladores Frontend | Conocer los puntos de integración, API Gateway, y flujos de datos |
| DevOps / Infraestructura | Planificar despliegue, escalamiento, monitoreo y CI/CD |
| Jefe de Proyecto | Validar que la arquitectura cumple los requisitos funcionales y no funcionales |
| Stakeholders / Dirección | Comprender el enfoque técnico a alto nivel |

### 1.3 Convenciones del Documento
- **Clave primaria**: PK
- **Clave foránea**: FK
- **Relación muchos a muchos**: M2M
- **Código**: `monospaced`
- **Archivos**: `ruta/al/archivo.py`
- **Alertas**: ⚠️ Importante / 🔴 Crítico / ✅ Correcto
- **Términos técnicos** se definen en el Glosario (Sección 10)
- Las referencias a otros documentos SIGA se indican con `[DOC-XX]`

---

## 2. Visión del Sistema

### 2.1 ¿Qué es SIGA?
SIGA (Sistema Integrado de Gestión Académica) es una plataforma tecnológica integral diseñada para automatizar, centralizar y optimizar todos los procesos académicos de un Instituto de Educación Superior Tecnológico Público (IESTP) peruano. SIGA no es un monolito: es un ecosistema de microservicios orquestados por un Core central que provee identidad, seguridad, y comunicación.

### 2.2 ¿Qué problema resuelve?
| Problema | Situación Actual | Solución SIGA |
|----------|------------------|---------------|
| Gestión manual de matrícula | Hojas de cálculo, expedientes físicos, altas tasas de error | Flujo digital automatizado con validaciones en tiempo real |
| Datos dispersos | Cada área maneja su información sin integración (secretaría, académicos, tesorería) | Base de datos centralizada por módulo pero orquestada por el Core |
| Procesos ineficientes | Trámites presenciales, múltiples visitas a ventanillas, demoras de días | Autoservicio digital con flujos de aprobación |
| Falta de trazabilidad | No se sabe quién hizo qué ni cuándo | Auditoría completa con Core Audit Log y tracing distribuido |
| Sin interoperabilidad | Sistemas aislados, imposible compartir datos entre carreras | APIs estandarizadas, event bus para comunicación asíncrona |
| Escalabilidad nula | Un solo servidor, caídas generalizadas | Microservicios que escalan independientemente |
| Sin respaldo | Pérdida de información por falta de backups automatizados | PostgreSQL con backups automáticos y estrategia de recuperación |
| Múltiples fuentes de verdad | Datos de estudiantes inconsistentes entre sistemas | Core como fuente única de identidad y roles |

### 2.3 ¿Para quién?

| Usuario | Descripción | Necesidades principales |
|---------|-------------|------------------------|
| Administrativos | Secretaría académica, administración, tesorería | Matrícula, trámites, reportes, generación de documentos |
| Docentes | Profesores de las 11 carreras | Registro de notas (evaluación), consulta de horarios, listas de estudiantes |
| Estudiantes | Alumnos de las 11 carreras (aprox. 3000-5000) | Matrícula online, consulta de notas, horarios, malla curricular |
| Directivos | Director general, jefes de unidad académica | Reportes gerenciales, indicadores, toma de decisiones basada en datos |
| Soporte TI | Administradores del sistema | Monitoreo, configuración, resolución de incidencias |

---

## 3. Principios Arquitectónicos

### P1: Separación Total de Responsabilidades
El **Core** no contiene lógica académica de negocio. Su única responsabilidad es identidad, seguridad, registro de módulos, proxy de comunicación y resiliencia. Toda la lógica académica vive exclusivamente dentro de los **módulos (microservicios)**. El Core no sabe qué es una matrícula, una nota, o un plan de estudios. Esto garantiza que el Core sea estable y evolucione independientemente.

### P2: Contratos Estrictos
Cada módulo publica un **Manifiesto (`manifest.yaml`)** que declara: endpoints, eventos que publica/consume, permisos que requiere/otorga, dependencias y configuración. El Core valida este manifiesto al registrar el módulo y rechaza módulos que no cumplan el estándar `MODULE-STD-2.0`. Esto garantiza que la integración sea predecible y verificable.

### P3: Comunicación Descentralizada (Event-Driven)
Los módulos se comunican de forma asíncrona a través de **NATS** (event bus). No hay invocaciones directas entre módulos. Cuando un módulo necesita datos de otro módulo, debe hacerlo a través del Core (API Gateway) o suscribiéndose a los eventos que el otro módulo publica. Esto desacopla los módulos y permite que fallen independientemente.

### P4: Aislamiento de Datos
Cada módulo posee su propia base de datos PostgreSQL. Ningún módulo accede directamente a la BD de otro módulo. El Core tiene su propia BD (`siga_core`) para identidad y registry. Esto garantiza que un bug en un módulo no corrompa datos de otro, y que cada módulo pueda evolucionar su esquema independientemente.

### P5: Resiliencia Primero
El sistema tolera fallos de módulos individuales sin colapsar. Se implementan: **Circuit Breaker** (evita cascada de fallos), **Health Monitor** (detección temprana), **Fallback Manager** (respuestas degradadas), **Cache Manager** (tiempos de respuesta rápidos y resiliencia a fallos de BD), y **Retry Policy** (reintentos con backoff exponencial). Un módulo caído no tumba el sistema.

### P6: Seguridad por Capas (Defense in Depth)

| Capa | Mecanismo |
|------|-----------|
| Transporte | HTTPS/TLS obligatorio en producción |
| Autenticación | JWT (access + refresh tokens) con RS256 |
| Autorización | RBAC + Permisos por módulo (scope-based) |
| API | Rate limiting, validación de esquemas, CORS whitelist |
| Aplicación | Validación de inputs, sanitización, SQL injection protection |
| Datos | Column-level encryption para datos sensibles, backups cifrados |
| Infraestructura | Firewall, WAF, segwitación de redes, containers aislados |

### P7: Escalabilidad Horizontal
Cada módulo es stateless y puede escalar horizontalmente independientemente. El Core puede tener múltiples réplicas. NATS maneja la comunicación entre réplicas. Redis centraliza el caché distribuido. Las BDs PostgreSQL pueden escalar con read replicas. No hay puntos únicos de fallo no mitigados.

### P8: Evolución sin Reescribir
El Core es **estable por diseño**: sus interfaces (`/auth/*`, `/core/*`, `/api/{module}/*`) cambian solo con versionado explícito (`/api/v1/...`, `/api/v2/...`). Los módulos evolucionan independientemente. Un módulo nuevo se "enchufa" al socket sin modificar el Core. Un módulo legacy se extrae gradualmente (Strangler Fig Pattern). No hay más "big bang rewrites".

### P9: Observabilidad Total
Todo componente expone: **logs estructurados** (JSON, niveles estándar), **métricas** (Prometheus: latencia, throughput, errores, estado de circuit breaker), y **tracing distribuido**. Es **obligatorio** el uso del header `X-Request-ID`, propagándolo desde el Frontend, pasando por el Gateway y Módulos, hasta incluirlo en los metadatos de los mensajes NATS. Esto permite debugging rápido, detección proactiva de anomalías y evitar "cajas negras" en fallos asíncronos.

### P10: Multi-tenencia por Programa
El instituto tiene 11 carreras. Los datos de cada carrera deben estar aislados lógicamente aunque compartan infraestructura. Esto se logra mediante la columna `programa_id` en todas las tablas de datos de módulos. Cada usuario puede tener acceso a una o más carreras. Las consultas siempre filtran por `programa_id` implícita o explícitamente. En el futuro, si una carrera requiere aislamiento físico, se puede migrar a su propia instancia sin cambios arquitectónicos mayores.

### P11: API-First
Todo componente expone APIs REST bien documentadas (OpenAPI/Swagger). No hay integraciones ocultas, archivos compartidos, ni accesos directos a BD. El contrato API se define antes de la implementación. Las APIs del Core son auto-documentadas con FastAPI (OpenAPI en `/docs` y `/redoc`).

### P12: Automatización
CI/CD obligatorio: cada commit pasa por linting, type checking, tests unitarios, tests de integración, y build. El despliegue a staging es automático. El despliegue a producción requiere aprobación manual pero es un proceso de un clic. Infraestructura como código (Docker Compose para desarrollo, Kubernetes para producción).

---

## 4. Diagrama de Arquitectura

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                            INTERNET / RED LOCAL                              ║
╚═══════════════════════════════════════════════════════════════════════════════╝
                                    │
                                    ▼
╔═══════════════════════════════════════════════════════════════════════════════╗
║                          FRONTEND (React + Vite)                             ║
║                                                                              ║
║  ┌──────────────────────────────────────────────────────────────────────────┐║
║  │  Single Page Application (SPA) con módulos lazy-loaded                  │║
║  │  - Auth Module (login, register, profile)                               │║
║  │  - Dashboard Module                                                    │║
║  │  - Student Module (consulta notas, horarios, matrícula)                 │║
║  │  - Teacher Module (registro notas, listas)                              │║
║  │  - Admin Module (gestión usuarios, config)                              │║
║  └──────────────────────────────────────────────────────────────────────────┘║
╚═══════════════════════════════════════════════════════════════════════════════╝
                                    │
                          HTTPS / WebSocket
                                    ▼
╔═══════════════════════════════════════════════════════════════════════════════╗
║                      CORE (FastAPI - Puerto :8000)                            ║
║                                                                              ║
║  ┌──────────────────────────────────────────────────────────────────────────┐║
║  │  LAYER 1: INFRASTRUCTURE                                                │║
║  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────────────────────┐ │║
║  │  │  Config  │ │ Database │ │  NATS    │ │        Redis                │ │║
║  │  │ Settings │ │  Async   │ │EventBus  │ │     (Cache + Session)        │ │║
║  │  │ Pydantic │ │ SQLAlch. │ │Pub/Sub   │ │                             │ │║
║  │  └──────────┘ └──────────┘ └──────────┘ └─────────────────────────────┘ │║
║  │                                                                          │║
║  │  LAYER 2: IDENTITY                                                      │║
║  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────────────────────┐ │║
║  │  │  Models  │ │  Auth    │ │  Tokens  │ │      Permissions            │ │║
║  │  │ User/Role│ │ Service  │ │ JWT/RSA  │ │      RBAC + Scopes           │ │║
║  │  │Permission│ │ Register │ │Refresh   │ │                             │ │║
║  │  └──────────┘ └──────────┘ └──────────┘ └─────────────────────────────┘ │║
║  │                                                                          │║
║  │  LAYER 3: GATEWAY                                                       │║
║  │  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────────┐ │║
║  │  │   HTTP Proxy     │ │  WebSocket Proxy │ │   Security Middleware    │ │║
║  │  │(con resiliencia) │ │   (con reconnect)│ │   (Auth + Rate Limit)    │ │║
║  │  └──────────────────┘ └──────────────────┘ └──────────────────────────┘ │║
║  │                                                                          │║
║  │  LAYER 4: REGISTRY (SOCKET)                                             │║
║  │  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────────┐ │║
║  │  │  ModuleRuntime   │ │  Manifest        │ │   Module Discovery       │ │║
║  │  │  (Registry)      │ │  Validator       │ │   (FS, Docker, K8s)      │ │║
║  │  └──────────────────┘ └──────────────────┘ └──────────────────────────┘ │║
║  │                                                                          │║
║  │  LAYER 5: RESILIENCE                                                    │║
║  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────────┐ │║
║  │  │CircuitBrkr   │ │HealthMonitor │ │FallbackMgr   │ │ Cache Manager  │ │║
║  │  │(CB)          │ │(HM)          │ │(FM)          │ │ (CM)           │ │║
║  │  └──────────────┘ └──────────────┘ └──────────────┘ └────────────────┘ │║
║  └──────────────────────────────────────────────────────────────────────────┘║
╚═══════════════════════════════════════════════════════════════════════════════╝
            │                        │                       │
            ▼                        ▼                       ▼
╔════════════════════╗  ╔════════════════════╗  ╔════════════════════╗
║     NATS Event Bus ║  │  Redis Cache       ║  │   PostgreSQL       ║
║   (Comunicación    ║  │  - Datos frecuentes║  │   - siga_core      ║
║    asíncrona)      ║  │  - Sesiones        ║  │   - mod_*          ║
║                    ║  │  - Rate limiting    ║  │   (1 BD/módulo)    ║
╚════════════════════╝  └────────────────────┘  └────────────────────┘
            │
            ▼
╔═══════════════════════════════════════════════════════════════════════════════╗
║                         MÓDULOS (Microservicios)                              ║
║                                                                              ║
║  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ║
║  │ mod-planes-     │ │ mod-programas-│ │ mod-estudiantes│ │ mod-matricula  │ ║
║  │ estudio :8002   │ │ estudio :8005 │ │ :8006          │ │ :8007          │ ║
║  │                 │ │               │ │                │ │                │ ║
║  │ Planes de      │ │ Programas/    │ │ Gestión de     │ │ Proceso de     │ ║
║  │ estudio por    │ │ Carreras (11) │ │ estudiantes    │ │ matrícula      │ ║
║  │ carrera        │ │               │ │ (datos, fotos, │ │ (cupos, pagos) │ ║
║  │                │ │               │ │ historial)     │ │                │ ║
║  │ BD: siga_planes│ │ BD: siga_prog │ │ BD: siga_est   │ │ BD: siga_matr  │ ║
║  └────────────────┘ └────────────────┘ └────────────────┘ └────────────────┘ ║
║                                                                              ║
║  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ║
║  │ mod-evaluacion │ │ mod-docencia   │ │ mod-tramites   │ │ mod-reportes   │ ║
║  │ :8008 (futuro) │ │ :8009 (futuro) │ │ :8010 (futuro) │ │ :8011 (futuro) │ ║
║  │                │ │                │ │                │ │                │ ║
║  │ Notas,        │ │ Asignación     │ │ Trámites       │ │ Reportes       │ ║
║  │ evaluaciones  │ │ docente,       │ │ documentarios  │ │ gerenciales    │ ║
║  │                │ │ horarios       │ │ (certificados) │ │ + BI           │ ║
║  └────────────────┘ └────────────────┘ └────────────────┘ └────────────────┘ ║
║                                                                              ║
║  ┌────────────────┐ ┌────────────────┐                                      ║
║  │ mod-requisitos │ │ mod-egresados  │  ... más módulos                      ║
║  │ :8012 (futuro) │ │ :8013 (futuro) │                                      ║
║  └────────────────┘ └────────────────┘                                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════════════════════════╗
║                         INFRAESTRUCTURA COMPARTIDA                            ║
║                                                                              ║
║  ┌─────────────────────┐  ┌─────────────────────┐  ┌──────────────────────┐ ║
║  │ Docker / Docker Comp│  │ Kubernetes (K8s)    │  │   CI/CD Pipeline     │ ║
║  │ (dev)               │  │ (producción futuro) │  │   (GitHub Actions)   │ ║
║  └─────────────────────┘  └─────────────────────┘  └──────────────────────┘ ║
║  ┌─────────────────────┐  ┌─────────────────────┐  ┌──────────────────────┐ ║
║  │   Prometheus         │  │   Grafana            │  │   Loki + Tempo       │ ║
║  │ (métricas)          │  │ (dashboard)         │  │ (logs + tracing)     │ ║
║  └─────────────────────┘  └─────────────────────┘  └──────────────────────┘ ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

## 5. Mapa de Componentes

| Componente | Tecnología | Propósito | Puerto | Dependencias | Estado |
|-----------|-----------|-----------|--------|-------------|-------|
| **Core** | FastAPI + Python 3.11 | Gateway, Identity, Registry, Resilience | :8000 | PostgreSQL, NATS, Redis | Implementado |
| **Frontend** | React 18 + Vite | Interfaz de usuario SPA | :5173 | Core (:8000) | Implementado |
| **NATS** | NATS Server 2.10 | Event Bus asíncrono | :4222 | - | Implementado |
| **Redis** | Redis 7 | Caché distribuido, sesiones, rate limiting | :6379 | - | Implementado |
| **PostgreSQL** | PostgreSQL 15 | Base de datos principal | :5432 | - | Implementado |
| **mod-planes-estudio** | FastAPI + Python 3.11 | Gestión de planes de estudio por carrera | :8002 | PostgreSQL, NATS | Implementado |
| **mod-programas-estudio** | FastAPI + Python 3.11 | Catálogo de programas/carreras | :8005 | PostgreSQL, NATS | Implementado |
| **mod-estudiantes** | FastAPI + Python 3.11 | Registro y gestión de estudiantes | :8006 | PostgreSQL, NATS | Implementado |
| **mod-matricula** | FastAPI + Python 3.11 | Proceso de matrícula académica | :8007 | PostgreSQL, NATS, mod-estudiantes | Implementado |
| **mod-evaluacion** | FastAPI + Python 3.11 | Gestión de notas y evaluaciones | :8008 (futuro) | PostgreSQL, NATS, mod-estudiantes, mod-matricula | Planeado |
| **mod-docencia** | FastAPI + Python 3.11 | Asignación docente y horarios | :8009 (futuro) | PostgreSQL, NATS, mod-planes-estudio | Planeado |
| **mod-tramites** | FastAPI + Python 3.11 | Trámites documentarios digitales | :8010 (futuro) | PostgreSQL, NATS, mod-estudiantes | Planeado |
| **mod-reportes** | FastAPI + Python 3.11 | Reportes gerenciales e indicadores | :8011 (futuro) | PostgreSQL, NATS, múltiples módulos | Planeado |
| **mod-requisitos** | FastAPI + Python 3.11 | Requisitos de programas de estudio | :8012 (futuro) | PostgreSQL, NATS, mod-programas-estudio | Planeado |
| **mod-egresados** | FastAPI + Python 3.11 | Gestión de egresados y titulados | :8013 (futuro) | PostgreSQL, NATS, mod-estudiantes | Planeado |

---

## 6. Stack Tecnológico Detallado

| Capa | Tecnología | Versión | Propósito | Alternativas Consideradas |
|------|-----------|---------|-----------|--------------------------|
| **Core Framework** | FastAPI | 0.104+ | API Gateway, endpoints REST, WebSocket, validación automática | Flask (síncrono, sin WebSocket nativo), Django REST (pesado, síncrono) |
| **Lenguaje Backend** | Python | 3.11+ | Lenguaje principal del Core y módulos | Node.js (cambio de ecosistema), Go (curva de aprendizaje alta) |
| **ORM** | SQLAlchemy | 2.0+ | Mapeo objeto-relacional asíncrono | Tortoise ORM (menos maduro), Peewee (síncrono, limitado) |
| **Migraciones** | Alembic | 1.12+ | Migraciones de BD para Core y módulos | - |
| **Base de Datos** | PostgreSQL | 15+ | BD principal (Core + módulos) | MySQL (menor compliance SQL), MariaDB |
| **Cache** | Redis | 7+ | Caché distribuido, sesiones, rate limiting | Memcached (solo cache, sin persistencia) |
| **Event Bus** | NATS | 2.10+ | Mensajería asíncrona, pub/sub, request/reply | RabbitMQ (más complejo, menor throughput), Kafka (overkill para el alcance) |
| **Frontend Framework** | React | 18+ | UI interactiva SPA | Vue 3 (menor ecosistema laboral), Angular (más opinado, pesado) |
| **Build Frontend** | Vite | 5+ | Bundler rápido de desarrollo | Webpack (lento), Parcel (menos configurable) |
| **HTTP Client** | Axios | 1.6+ | Peticiones HTTP desde frontend | Fetch API (menos features) |
| **Containerización** | Docker | 24+ | Contenedores para desarrollo y producción | - |
| **Orquestación** | Docker Compose | 2.24+ | Orquestación multi-contenedor en desarrollo | K8s (complejo para desarrollo local) |
| **Auth** | PyJWT + python-jose | - | JWT creation/validation | - |
| **Validación** | Pydantic | 2.5+ | Validación de esquemas y configuraciones | Marshmallow (menos integrado con FastAPI) |
| **Async HTTP** | httpx | 0.25+ | Cliente HTTP asíncrono para proxy | requests (síncrono, bloqueante) |
| **Testing Backend** | pytest + pytest-asyncio | 7+ | Tests unitarios y de integración | unittest (menos expresivo) |
| **Testing Frontend** | Vitest + Testing Library | - | Tests unitarios y de componentes | Jest (más lento) |
| **Logging** | structlog + loguru | - | Logs estructurados JSON | logging estándar (menos flexible) |
| **Métricas** | Prometheus + client | - | Métricas de sistema y negocio | - |
| **Dashboard** | Grafana | - | Visualización de métricas y estado | - |
| **Tracing** | OpenTelemetry | - | Tracing distribuido entre servicios | - |
| **CI/CD** | GitHub Actions | - | Integración y despliegue continuo | GitLab CI, Jenkins (más configuración) |
| **Calidad Código** | ruff + mypy + bandit | - | Linting, type checking, seguridad | flake8 (más lento), pylint (lento) |

---

## 7. Flujo de Datos General

### 7.1 Diagrama de Flujo

```
┌──────────┐     ┌─────────────────────────────────────────────────────────────┐
│ USUARIO   │     │                      CORE (:8000)                            │
│           │     │                                                             │
│ Browser   │     │  ┌──────────┐  ┌────────────┐  ┌──────────────────────────┐ │
│ (React)   │────┼─→│  Auth     │─→│  Security  │─→│  Gateway / Proxy          │ │
│           │     │  │ (JWT)    │  │ (Permisos) │  │  (HTTP Proxy o WS Proxy)  │ │
│ :5173     │     │  └──────────┘  └────────────┘  └──────────┬───────────────┘ │
└──────────┘     │                                             │                │
      ↑          │                                             ▼                │
      │          │                                    ┌──────────────────────┐ │
      │          │                                    │  Circuit Breaker     │ │
      │          │                                    │  (verifica estado)   │ │
      │          │                                    └──────────┬───────────┘ │
      │          │                                               │             │
      │          │                                               ▼             │
      │          │                                    ┌──────────────────────┐ │
      │          │                                    │  Health Check        │ │
      │          │                                    │  (último estado)     │ │
      │          │                                    └──────────┬───────────┘ │
      │          │                                               │             │
      │          │                          ┌────────────────────┴───────┐    │
      │          │                          │          ¿Módulo          │    │
      │          │                          │         HEALTHY?          │    │
      │          │                          └───────────┬───────────────┘    │
      │          │                               Sí     │        No          │
      │          │                                 │    ▼        ▼          │
      │          │                                 │  ┌────────┐ ┌────────┐ │
      │          │                                 │  │Enviar a│ │Activar │ │
      │          │                                 │  │Módulo  │ │Fallback│ │
      │          │                                 │  └───┬────┘ └───┬────┘ │
      │          │                                 │      │          │      │
      │          │                                 ▼      ▼          ▼      │
      │          │                           ┌──────────────────────────┐  │
      │          │                           │      MÓDULO (FastAPI)    │  │
      │          │                           │    ┌─────────────────┐   │  │
      │          │                           │    │  Módulo Service  │   │  │
      │          │                           │    └────────┬────────┘   │  │
      │          │                           │         │                │  │
      │          │                           │         ▼                │  │
      │          │                           │    ┌─────────────────┐   │  │
      │          │                           │    │  Module ORM     │   │  │
      │          │                           │    │ (SQLAlchemy)    │   │  │
      │          │                           │    └────────┬────────┘   │  │
      │          │                           │         │                │  │
      │          │                           │         ▼                │  │
      │          │                           │    ┌─────────────────┐   │  │
      │          │                           │    │  Module DB      │   │  │
      │          │                           │    │ (PostgreSQL)    │   │  │
      │          │                           │    └─────────────────┘   │  │
      │          │                           └──────────────────────────┘  │
      │          │                                      │                 │
      │          │                    ┌─────────────────┴───┐             │
      │          │                    │   Publicar evento   │             │
      │          │                    │  (NATS: evento.xxx) │             │
      │          │                    └─────────────────┬───┘             │
      │          │                                      │                 │
      │          │              Otros módulos suscritos ←┘                │
      │          │                                                        │
      │          │  ┌────────────────────────────────────────────────────┐ │
      │          │  │  Respuesta al usuario                              │ │
      │          │  │  (200 OK / 201 Created / 4xx / 5xx + fallback)    │ │
      │          │  └──────────────────┬─────────────────────────────────┘ │
      │          └─────────────────────┼───────────────────────────────────┘
      └────────────────────────────────┘
```

### 7.2 Desglose Paso a Paso

**Paso 1: Usuario → Frontend**
- El usuario interactúa con la SPA React.
- La acción desencadena una petición HTTP (Axios) o WebSocket.
- Si es HTTP: método, URL, headers (Authorization: Bearer {jwt}), body.
- Si es WS: conexión a `wss://siga.edu.pe/ws?token={jwt}`.

**Paso 2: Frontend → Core (Auth)**
- El request llega al Core en `:8000`.
- Si el endpoint requiere autenticación (endpoints protegidos), el Security Middleware:
  1. Extrae el token JWT del header `Authorization: Bearer <token>`.
  2. Valida la firma RS256.
  3. Verifica expiración.
  4. Extrae payload (user_id, roles, permissions, programa_ids).
  5. Inyecta `current_user` en el request state.
- Si el token es inválido o expirado → 401 Unauthorized.
- Si el endpoint requiere permisos específicos → 403 Forbidden.

**Paso 3: Core (Auth) → Core (Gateway Proxy)**
- Si es un endpoint del Core (`/auth/*`, `/core/*`, `/health`), se maneja internamente.
- Si es un endpoint de módulo (`/api/{module_name}/{path}`), el Gateway Proxy:
  1. Identifica `module_name` y `path`.
  2. Busca el módulo en el ModuleRuntime (registry).
  3. Verifica que el módulo esté en estado HEALTHY o DEGRADED.
  4. Si está OPEN (circuit breaker) → activa fallback.
  5. Si está HEALTHY → construye URL completa: `http://{module_endpoint}/{path}`.

**Paso 4: Core (Proxy) → Módulo**
- El proxy envía la petición al módulo usando httpx asíncrono.
- Headers propagados: Content-Type, Authorization (opcional, para módulo), X-Request-ID (tracing), X-User-ID, X-User-Roles.
- Timeout: 30 segundos (configurable).
- Si el módulo responde antes del timeout → se procesa la respuesta.
- Si el módulo no responde dentro del timeout → se activa el Circuit Breaker.

**Paso 5: Módulo → BD del Módulo**
- El módulo recibe la petición en su endpoint.
- Valida los datos de entrada (Pydantic schemas).
- Ejecuta lógica de negocio (services).
- Consulta/escribe en su propia BD PostgreSQL a través de SQLAlchemy async.
- Publica eventos en NATS si corresponde (ej: `estudiante.creado`).

**Paso 6: Módulo → Core (Respuesta)**
- El módulo retorna la respuesta al Core.
- Respuesta típica: `{"status": "success", "data": {...}}` o `{"status": "error", "message": "..."}`.
- El proxy del Core cachea la respuesta si corresponde (método GET, TTL configurable).

**Paso 7: Core → Frontend → Usuario**
- El Core retorna la respuesta al Frontend.
- El Frontend actualiza la UI (React state + re-render).
- El usuario ve el resultado de su acción.

### 7.3 Flujo Asíncrono (Event-Driven)

Cuando un módulo publica un evento en NATS:

```
Módulo A → NATS (evento: estudiante.creado) → Módulo B (suscrito)
                                                     ↓
                                              Módulo B procesa evento
                                                     ↓
                                              Actualiza su BD local
                                                     ↓
                                              (Opcional) Publica respuesta en NATS
```

Ejemplo: Cuando `mod-estudiantes` crea un estudiante, publica `estudiante.creado`. `mod-matricula` está suscrito a este evento y automáticamente crea un registro de matrícula pendiente para el nuevo estudiante.

---

## 8. Patrones Arquitectónicos

### 8.1 API Gateway Pattern
**Problema**: Múltiples microservicios con diferentes endpoints, protocolos y formatos. El cliente necesitaría conocer la ubicación de cada uno.
**Solución**: El Core actúa como **único punto de entrada** para todos los clientes. Enruta peticiones al módulo correspondiente basado en la URL (`/api/{module_name}/{path}`). Centraliza autenticación, autorización, rate limiting, y resiliencia.
**Variante**: API Gateway con routing dinámico (no código estático). Los módulos se registran dinámicamente y el Gateway aprende sus rutas.

### 8.2 Microservices Pattern
**Problema**: Un monolito académico es difícil de mantener, escalar y evolucionar. Un cambio en matrícula puede afectar a planes de estudio.
**Solución**: Cada dominio académico es un **microservicio independiente** con su propia base de datos, su propio ciclo de vida y su propio equipo. Se comunican por NATS (eventos) y por HTTP a través del Core.
**Límites de los servicios**:
- `mod-planes-estudio`: Planes de estudio, mallas curriculares, UDs, módulos formativos.
- `mod-estudiantes-matricula`: *Recomendación arquitectónica*: Al inicio del proyecto, considerar fusionar `Estudiantes` y `Matrícula` temporalmente para evitar alta complejidad de Sagas, debido a su extrema cohesión. Posteriormente separarlos si el rendimiento lo exige.
- `mod-evaluacion`: Notas, evaluaciones, calificaciones, actas.
*(Nota: Para compartir código base entre estos microservicios sin acoplarlos lógicamente, se utilizará un enfoque de Monorepo con una librería interna `siga-core-lib`).*

### 8.3 Event-Driven Architecture (EDA)
**Problema**: Las operaciones entre módulos requieren consistencia eventual pero sin acoplamiento síncrono.
**Solución**: NATS como **event bus central**. Los módulos publican eventos de dominio (ej: `estudiante.creado`, `matricula.confirmada`, `nota.registrada`) y otros módulos suscritos reaccionan. El Core también publica eventos del sistema (`core.started`, `module.registered`).
**Garantías**: Al menos una vez (at-least-once delivery). Idempotencia en los handlers de eventos.

### 8.4 CQRS (Command Query Responsibility Segregation)
**Problema**: Las operaciones de lectura y escritura tienen diferentes requisitos de escalabilidad, consistencia y rendimiento.
**Solución**: A nivel de cada módulo, se separan las operaciones de **comando** (escritura: POST, PUT, PATCH, DELETE) de las de **consulta** (lectura: GET). Esto permite optimizar cada ruta independientemente. No es CQRS estricto (misma BD para reads y writes), pero los services están separados: `ModuleCommandService` y `ModuleQueryService`.
**Futuro**: Si un módulo requiere alta escalabilidad de lecturas, se puede introducir una read replica o cache dedicado sin cambiar la lógica de escritura.

### 8.5 Circuit Breaker Pattern
**Problema**: Cuando un módulo falla, los requests siguen llegando, agotando recursos (threads, conexiones) y causando fallos en cascada.
**Solución**: El **Circuit Breaker** monitorea las llamadas a cada módulo. Si detecta N fallos consecutivos, abre el circuito: las llamadas fallan inmediatamente sin intentar la conexión. Después de un timeout, permite una llamada de prueba (half-open). Si tiene éxito, cierra el circuito.
**Ver**: `04-RESILIENCIA.md` para implementación detallada.

### 8.6 Strangler Fig Pattern
**Problema**: El IESTP tiene sistemas legacy que deben ser reemplazados gradualmente sin interrumpir operaciones.
**Solución**: Cada nuevo módulo de SIGA "estrangula" una funcionalidad del sistema legacy. El Core redirige el tráfico al nuevo módulo cuando está disponible. El sistema legacy sigue funcionando para las funcionalidades no migradas. Eventualmente, el legacy se apaga completamente.
**Ejemplo**: La matrícula manual (legacy) coexiste con `mod-matricula` durante el periodo de transición. El Core decide si usa el módulo o el legacy basado en configuración o feature flags.

### 8.7 Database per Service
**Problema**: Si todos los módulos comparten una BD, un cambio de esquema en un módulo puede afectar a otros. No hay aislamiento.
**Solución**: Cada módulo tiene su **propia base de datos PostgreSQL**. Solo el módulo dueño accede a su BD. El Core tiene su propia BD (`siga_core`) para identidad, registry y auditoría. No hay joins entre BDs de diferentes módulos — la integración se hace por API (a través del Core) o por eventos (NATS).
**Excepción**: Tablas de referencia muy estables (ej: catálogo de programas de estudio) pueden cachearse en varios módulos, pero la fuente de verdad es siempre el módulo dueño.

### 8.8 Saga Pattern & Transactional Outbox
**Problema**: Una operación de negocio puede requerir cambios en múltiples módulos (ej: matricular a un estudiante requiere crear registro en mod-matricula y actualizar estado en mod-estudiantes). No hay transacciones distribuidas. Si la BD hace commit pero NATS cae, los datos quedan inconsistentes.
**Solución**: **Saga coreográfica combinada con el Patrón Transactional Outbox**. Cada módulo guarda los cambios de negocio y el evento a emitir en la misma transacción SQL (tabla `outbox_events`). Un proceso asíncrono lee esta tabla y publica a NATS. Si un paso de la saga falla, se ejecutan transacciones compensatorias (rollback) a través de eventos de compensación.
**Ejemplo**:
1. `mod-matricula` crea registro de matrícula y el evento en `outbox_events` de forma atómica. Relay publica `matricula.iniciada`.
2. `mod-estudiantes` recibe el evento, actualiza estado a "matriculado" y guarda su evento en outbox.
3. Si falla el paso 2 → `mod-matricula` recibe evento de error y revierte la matrícula.

---

## 9. Restricciones y Decisiones Arquitectónicas (ADR)

### ADR-001: Framework Backend

| Campo | Valor |
|-------|-------|
| **Contexto** | Se necesita un framework para construir el Core API Gateway y los microservicios. Los candidatos son FastAPI, Flask, Django REST Framework. |
| **Decisión** | Usar **FastAPI** como framework principal para el Core y todos los módulos. |
| **Fundamento** | FastAPI ofrece: (1) soporte nativo de async/await, crítico para operaciones I/O bound como proxy HTTP y NATS; (2) validación automática con Pydantic; (3) soporte nativo de WebSocket; (4) OpenAPI/Swagger auto-documentado; (5) alto rendimiento (Starlette/Uvicorn). Flask es síncrono y carece de WebSocket nativo. Django REST es monolítico por defecto y más pesado. |
| **Consecuencias** | + Rendimiento superior, async nativo, documentación automática. - Menor ecosistema de plugins que Django. - El equipo debe estar familiarizado con async/await. |

### ADR-002: Base de Datos por Módulo

| Campo | Valor |
|-------|-------|
| **Contexto** | Se debe decidir si todos los módulos comparten una BD o cada uno tiene la suya. |
| **Decisión** | **BD independiente por módulo** (Database per Service). |
| **Fundamento** | (1) Aislamiento total: un bug en un módulo no corrompe datos de otro. (2) Independencia evolutiva: cada módulo migra su esquema sin afectar otros. (3) Escalabilidad: cada BD puede escalar independientemente. (4) Seguridad: un módulo comprometido no accede a datos de otros módulos. |
| **Consecuencias** | + Aislamiento, escalabilidad, evolución independiente. - No hay joins entre BDs. - Consistencia eventual (Saga Pattern). - Mayor complejidad operacional (múltiples BDs). |

### ADR-003: NATS vs RabbitMQ

| Campo | Valor |
|-------|-------|
| **Contexto** | Se necesita un message broker para comunicación asíncrona entre servicios. |
| **Decisión** | Usar **NATS** como event bus principal. |
| **Fundamento** | (1) NATS es significativamente más rápido que RabbitMQ (>1M msg/s vs ~50K msg/s). (2) NATS es más simple de operar (binario único, configuración mínima). (3) NATS JetStream proporciona persistencia y exactly-once delivery cuando se necesita. (4) RabbitMQ es más complejo (exchanges, queues, bindings, routing keys). (5) Para el volumen de un IESTP (cientos de eventos/minuto, no millones), NATS es más que suficiente. |
| **Consecuencias** | + Alto rendimiento, simplicidad operativa. - Menos features de routing que RabbitMQ (no hay routing keys complejas). - Ecosistema de clientes más pequeño. |

### ADR-004: JWT vs Sesiones

| Campo | Valor |
|-------|-------|
| **Contexto** | Se necesita un mecanismo de autenticación para APIs REST. |
| **Decisión** | Usar **JWT (JSON Web Tokens)** con RS256 (asimétrico). |
| **Fundamento** | (1) Stateless: el Core no necesita almacenar sesiones en BD. (2) Escalabilidad: cualquier réplica del Core puede validar tokens sin estado compartido. (3) Los tokens incluyen claims (user_id, roles, permissions, programa_ids) que evitan consultas adicionales. (4) RS256 permite que los módulos validen tokens con la clave pública sin llamar al Core. |
| **Consecuencias** | + Stateless, escalable, auto-contenido. - Los tokens no se pueden revocar inmediatamente (usar TTL corto + refresh tokens). - Mayor tamaño de payload (mitigado: claims mínimos en access token, detalles en refresh). |

### ADR-005: Lenguaje Único vs Mixto

| Campo | Valor |
|-------|-------|
| **Contexto** | Los módulos podrían implementarse en diferentes lenguajes (Go, Rust, Node.js) según el caso de uso. |
| **Decisión** | **Python (FastAPI)** para todos los módulos iniciales. En el futuro, se puede evaluar otros lenguajes para módulos específicos si hay una justificación clara de rendimiento. |
| **Fundamento** | (1) Consistencia: mismo lenguaje en Core y módulos simplifica el reclutamiento, el onboarding y la revisión de código. (2) Reutilización: librerías compartidas (middleware, schemas, utilities). (3) Performance actual: FastAPI con async maneja miles de req/s, suficiente para IESTP. (4) Time-to-market: el equipo puede desarrollar módulos secuencialmente sin cambiar de contexto. |
| **Consecuencias** | + Consistencia, reutilización, velocidad de desarrollo. - No se aprovechan ventajas específicas de otros lenguajes. - Si un módulo requiere cómputo intensivo, se podría necesitar reescribir en el futuro. |

### ADR-006: Versionado de API

| Campo | Valor |
|-------|-------|
| **Contexto** | Las APIs evolucionan y los cambios breaking deben ser manejados sin romper clientes existentes. |
| **Decisión** | **Prefijo de URL** con versionado mayor: `/api/v1/{module}/{path}`, `/api/v2/{module}/{path}`. |
| **Fundamento** | (1) URL versioning es el más explícito y fácil de depurar. (2) Cada versión es un conjunto de rutas independiente. (3) El Core puede coexistir con v1 y v2 simultáneamente durante la migración. (4) Header versioning (Accept-Version) es menos visible y más difícil de testear. |
| **Consecuencias** | + Explícito, fácil de depurar, coexistencia de versiones. - URLs más largas. - Código duplicado temporalmente entre versiones. |

### ADR-007: Multi-tenencia por Programa

| Campo | Valor |
|-------|-------|
| **Contexto** | El IESTP tiene 11 carreras (programas de estudio). Los datos deben estar aislados pero compartiendo infraestructura. |
| **Decisión** | Multi-tenencia lógica: columna `programa_id` (FK a `mod-programas-estudio`) en todas las tablas de datos de los módulos. El Core inyecta el `programa_id` basado en el usuario autenticado. |
| **Fundamento** | (1) Infraestructura compartida → menor costo operativo. (2) Aislamiento lógico suficiente: todas las consultas incluyen `WHERE programa_id = X`. (3) Flexibilidad futura: si una carrera requiere aislamiento físico, se puede migrar a su propia instancia. (4) Reportes multi-carrera son posibles (para dirección). |
| **Consecuencias** | + Bajo costo, flexibilidad, reportes multi-carrera. - Riesgo de fuga de datos entre carreras si un query olvida el filtro (mitigado: middleware que fuerza el filtro, tests de integración). - Las tablas crecen más (particionamiento por programa_id futuro). |

### ADR-008: Frontend Monolítico

| Campo | Valor |
|-------|-------|
| **Contexto** | El frontend crecerá con nuevos módulos. ¿Micro-frontends o SPA monolítica? |
| **Decisión** | **SPA monolítica** con módulos lazy-loaded (React.lazy + Suspense). No micro-frontends. |
| **Fundamento** | (1) El equipo es pequeño (2-3 frontend). Micro-frontends añaden complejidad de integración, despliegue y testing. (2) React.lazy proporciona lazy-loading efectivo para mantener el bundle inicial pequeño. (3) La UI es coherente (misma librería de componentes, mismos patrones). (4) Si en el futuro se necesita micro-frontends, la estructura de módulos actual facilita la separación. |
| **Consecuencias** | + Simplicidad, coherencia UI, desarrollo más rápido. - Single point of failure en frontend. - Bundle único (mitigado con lazy-loading). |

### ADR-009: ORM Asíncrono

| Campo | Valor |
|-------|-------|
| **Contexto** | Se necesita un ORM para PostgreSQL que soporte async/await. |
| **Decisión** | **SQLAlchemy 2.0+** con el patrón **async session**. |
| **Fundamento** | (1) SQLAlchemy es el ORM Python más maduro y probado. (2) La versión 2.0 soporta async nativo con `asyncpg` como driver. (3) Tortoise ORM es más nuevo y menos probado en producción. (4) La familiaridad del equipo con SQLAlchemy reduce la curva de aprendizaje. |
| **Consecuencias** | + ORM maduro, soporte async, amplia comunidad. - Configuración más verbosa que Tortoise. - Migraciones con Alembic requieren configuración adicional para async. |

### ADR-010: Domain Events en Manifiesto

| Campo | Valor |
|-------|-------|
| **Contexto** | Los módulos necesitan declarar qué eventos publican y a cuáles se suscriben. |
| **Decisión** | **Declaración en el manifiesto** (`manifest.yaml`: sección `events.publishes` y `events.subscribes`). El Core valida que los eventos declarados existan y sean consistentes. |
| **Fundamento** | (1) Hace explícito el contrato de eventos entre módulos. (2) Permite al Core hacer validación temprana (un módulo no puede suscribirse a eventos que no existen). (3) Sirve como documentación viva del bus de eventos. (4) Permite generar automáticamente la topología de eventos para debugging. |
| **Consecuencias** | + Contrato explícito, validación temprana, documentación viva. - El manifiesto debe mantenerse sincronizado con la implementación. - Mayor verbosidad en la definición del módulo. |

### ADR-011: Integración con Sistema Externo de Admisión

| Campo | Valor |
|-------|-------|
| **Contexto** | Los estudiantes ingresan a la institución tras un proceso de admisión. El módulo de Admisión manejará pagos, puntajes y prospectos (cientos de candidatos). Mezclar esta data temporal con el SIGA ensuciaría la base de datos principal. |
| **Decisión** | **Mantener Admisión como una App/Módulo Externo** (Separación de Contextos / Bounded Context). La integración se hará mediante **Ingesta por Push masiva** hacia `mod-gestion-academica` una vez culminado el proceso. |
| **Fundamento** | (1) *Domain-Driven Design (DDD)*: El contexto "Postulante" es efímero y diferente al contexto "Estudiante". (2) *Single Source of Truth*: `mod-gestion-academica` actúa como MDM (Master Data Management); recibe el JSON masivo de admitidos, aplica una Capa Anticorrupción (ACL), genera los códigos universitarios y asienta a los alumnos en el Ciclo I. (3) *Seguridad*: Al asentar al estudiante, se gatilla la creación de credenciales en `mod-usuarios`. |
| **Consecuencias** | + Base de datos académica limpia, escalabilidad separada para exámenes de admisión, alta cohesión. - Requiere construir el endpoint de ingesta masiva (ACL) en `mod-gestion-academica`. |

---

## 10. Glosario de Términos

| Término | Definición |
|---------|-----------|
| **Core** | Componente central del sistema. Provee identidad (auth), registry de módulos, API Gateway, y resiliencia. No contiene lógica de negocio académica. |
| **Socket** | Sinónimo de Module Runtime. Es el mecanismo de acoplamiento donde se "enchufan" los módulos al Core. Término tomado de la analogía del enchufe eléctrico. |
| **Módulo** | Microservicio independiente que implementa lógica de negocio de un dominio académico específico (matrícula, estudiantes, planes de estudio). Tiene su propia BD. |
| **Manifiesto** | Archivo `manifest.yaml` en la raíz de cada módulo que declara su identidad, endpoints, eventos, permisos, dependencias y configuración. Es el contrato entre el módulo y el Core. |
| **Gateway** | Componente del Core que recibe peticiones HTTP/WS del frontend y las redirige al módulo correspondiente. También maneja autenticación, autorización y resiliencia. |
| **Registry** | Base de datos y runtime donde se almacena el estado de todos los módulos registrados. Vive en el Core. |
| **Resilience** | Conjunto de patrones (Circuit Breaker, Health Monitor, Fallback Manager, Cache Manager) que garantizan que el sistema tolere fallos de módulos individuales. |
| **Circuit Breaker** | Patrón de resiliencia que monitorea fallos en la comunicación con un módulo. Cuando se supera un umbral de fallos, "abre el circuito" y las llamadas fallan inmediatamente sin intentar la conexión. |
| **Fallback** | Mecanismo que provee una respuesta alternativa (datos cacheados, datos estáticos, mensaje de degradación) cuando un módulo no está disponible. |
| **UD** | Unidad Didáctica. Componente curricular mínimo en un plan de estudios de educación superior tecnológica. Equivalente a una asignatura/materia. |
| **MF** | Módulo Formativo. Conjunto de UDs que conforman un área de formación específica dentro de un plan de estudios. |
| **NATS** | Message broker de alto rendimiento usado como event bus para comunicación asíncrona entre el Core y los módulos, y entre módulos entre sí. |
| **JWT** | JSON Web Token. Estándar abierto (RFC 7519) para autenticación stateless basada en tokens firmados digitalmente. |
| **RBAC** | Role-Based Access Control. Modelo de autorización donde los permisos se asignan a roles, y los roles se asignan a usuarios. |
| **BD por Módulo** | Patrón arquitectónico donde cada microservicio tiene su propia base de datos, aislada de los demás. |
| **Saga** | Patrón para manejar transacciones distribuidas en sistemas de microservicios. Consiste en una secuencia de transacciones locales, cada una con su evento y su compensación en caso de fallo. |
| **Programa de Estudio** | Carrera profesional ofrecida por el IESTP. SIGA maneja 11 programas de estudio. Cada programa tiene su propio plan de estudios. |
| **Compliance** | Grado de cumplimiento de un módulo con el estándar MODULE-STD-2.0. Se calcula como porcentaje de pasos de validación superados. Un módulo debe tener ≥80% para ser considerado compliant. |
| **Event Bus** | Canal de comunicación asíncrono basado en eventos. En SIGA, NATS es el event bus. |
| **MODULE-STD-2.0** | Estándar que define la estructura, formato y requisitos que todo módulo debe cumplir para ser registrado en el Core. Incluye validación de manifiesto, estructura de archivos, health check, y más. |
| **Tracing Distribuido** | Técnica de observabilidad que permite seguir el camino de una petición a través de múltiples servicios, identificando cuellos de botella y fallos. |
| **Graceful Degradation** | Capacidad del sistema de seguir funcionando (con funcionalidad reducida) cuando algunos componentes fallan. |

---

## 11. Historial de Cambios

| Versión | Fecha | Autor | Descripción |
|---------|-------|-------|-------------|
| 1.0 | 2026-06-26 | Equipo Arquitectura | Versión inicial del documento. Define visión, principios, componentes, stack, flujos, patrones, ADRs y glosario. |
