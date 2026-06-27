# MEMORIA DE CONTEXTO Y APRENDIZAJE - SIGA

> **Propósito:** Este archivo es una memoria viva que registra decisiones, correcciones, metodología de trabajo y lecciones aprendidas durante el desarrollo del Sistema Integral de Gestión Académica (SIGA) para el IESTP Suiza. Debe ser consultado al inicio de cada sesión y actualizado cuando se aprenda algo nuevo.

---

## 1. META DEL PROYECTO

Construir un sistema integral de gestión académica **modular, resiliente y escalable** para un instituto tecnológico público peruano con **11 carreras profesionales**, reemplazando procesos manuales que consumen ~920 horas/año.

**Principios rectores:**
- Arquitectura Core + Módulos (microservicios)
- Resiliencia ante fallos de componentes individuales
- Documentación exhaustiva antes que código
- Estándares claros y aplicados consistentemente (MODULE-STD-2.0)
- Zero-trust: cada request se autentica y autoriza individualmente

---

## 2. METODOLOGÍA DE TRABAJO

### 2.1 Cómo trabajamos

| Regla | Descripción |
|-------|-------------|
| **Auditar antes de tocar** | Siempre leer y entender el código existente antes de modificarlo |
| **Arquitectura primero** | Los documentos de diseño preceden a la implementación |
| **Rigor, no intuición** | Cada decisión debe estar fundamentada y documentada |
| **Fallos críticos primero** | Las fallas que rompen el sistema se corrigen antes de añadir funcionalidad |
| **Una cosa a la vez** | Una tarea `in_progress` a la vez en el todo list |
| **Verificar después de cambiar** | Siempre revisar que los cambios sean correctos (lectura post-edit) |
| **Preguntar si hay duda** | Si una decisión requiere criterio del usuario, preguntar antes de actuar |
| **Testear antes de avanzar** | Ejecutar pruebas (unitarias, integración o manuales) después de finalizar cada tarea o fase para validar que todo funcione antes de pasar al siguiente paso |

### 2.2 Flujo de trabajo

1. El usuario indica una tarea o necesidad
2. Se crea/actualiza el `todowrite` con los pasos a seguir
3. Se exploran los archivos relevantes para entender el contexto
4. Se implementan los cambios (edit, write)
5. Se verifica que los cambios sean correctos
6. Se actualiza el todo list
7. Se informa al usuario del resultado

### 2.3 Herramientas disponibles

| Herramienta | Uso principal |
|-------------|---------------|
| `bash` | Comandos de terminal (git, npm, etc.) - NO para leer/escribir archivos |
| `read` | Leer archivos y directorios |
| `write` | Escribir archivos nuevos (usar `edit` para modificar existentes) |
| `edit` | Modificar archivos existentes (requiere haber leído antes) |
| `glob` | Buscar archivos por patrón de nombre |
| `grep` | Buscar contenido dentro de archivos |
| `task` | Delegar tareas complejas a sub-agentes |
| `question` | Preguntar algo al usuario |
| `websearch`/`webfetch` | Buscar información externa |

---

## 3. LECCIONES APRENDIDAS (CORRECCIONES APLICADAS)

### 3.1 Fallas Críticas Corregidas

| # | Falla | Síntoma | Corrección | Archivos afectados |
|---|-------|---------|------------|-------------------|
| 1 | Security middleware requiere `:access` pero módulos emiten `:read/:write` | Toda petición a módulos responde 403 | Cambiar a verificación por prefijo: `any(p.startswith(f"{module}:")` | `app/core/gateway/security_middleware.py:50` |
| 2 | Manifiestos de módulos en formato no estándar (campos `entry_point`, `port`, sin `api_version`, `endpoints`) | El validador de manifiestos rechaza los módulos | Reescribir a MODULE-STD-2.0 | `modules/mod-estudiantes/manifest.yaml`, `modules/mod-matricula/manifest.yaml` |
| 3 | Import de NATS sin try/except | Si NATS no está instalado, el módulo no arranca | Envolver `from nats.aio.client import Client as NATS` en try/except | `modules/*/event_bus.py` (3 archivos) |
| 4 | Redis no está en requirements.txt | `pip install -r requirements.txt` no instala Redis | Agregar `redis>=5.0.0` a requirements.txt | `requirements.txt` |
| 5 | Password de BD hardcodeada en alembic.ini | Exposición de credenciales en el repo | Reemplazar por `%(DB_URL)s` (variable de entorno) | `alembic.ini` |
| 6 | URLs del backend hardcodeadas como `http://localhost:8000` en frontend | Si el backend cambia de puerto/host, todo se rompe | Usar `import.meta.env.VITE_API_URL` y exportar `API_BASE` desde `client.jsx` | `src/core/api/client.jsx` + 5 componentes frontend (~18 ocurrencias) |
| 7 | Admin UI vacío (nunca construido) | No hay interfaz de administración | Crear `AdminDashboard.jsx` con 4 vistas e integrarlo en App.jsx y DashboardLayout | `src/modules/admin/AdminDashboard.jsx`, `App.jsx`, `DashboardLayout.jsx` |
| 8 | Violación de Patrón Saga (Outbox faltante) | Emisión directa de NATS en `routes.py`, riesgo de datos inconsistentes si falla NATS | Implementar `OutboxEvent` atómico y Transactional Outbox Pattern | `mod-estudiantes/routes.py`, `database.py` |
| 9 | Ruptura de Trazabilidad | No se propaga `X-Request-ID` desde Gateway a los Eventos NATS | Extraer `request.headers.get("X-Request-ID")` y adjuntarlo a `metadata` de eventos | `mod-estudiantes/routes.py` |
| 10 | Estándar BaseModel Incompleto | Módulos usan `Base` normal sin Mixins estándar | Implementar `BaseModel` con `TimeStampedMixin` (MODULE-STD-2.0) | `mod-estudiantes/models.py`, `database.py` |
| 11 | Secretos Hardcodeados | Fallbacks con passwords en plano (ej. `john.007`) | Eliminar fallback, usar solo `os.getenv` | `mod-estudiantes/database.py` |
| 12 | Fricción de Dominios (Boundaries cruzados) | Estudiantes y Matrícula separados generan alta latencia y transacciones distribuidas complejas | Fusión Pragmática (Boundary Fusion) en un solo módulo macro: `mod-gestion-academica` | `modules/mod-gestion-academica/` (eliminación de `mod-estudiantes` y `mod-matricula`) |
| 13 | Módulos Desfasados del Patrón Saga | `mod-programas-estudio` y `mod-planes-estudio` usaban `event_bus.publish` directo sin Transactional Outbox | Normalización a *Golden Template*. Se implementó `BaseModel`, `OutboxEvent` y `outbox_worker.py` en ambos | `modules/mod-*/*.py` |
| 14 | Módulos Duplicados / Obsoletos | `mod-carreras` replicaba lógica y dominio de `mod-programas-estudio` | Eliminación total de `mod-carreras` | `modules/mod-carreras/` |

### 3.2 Reglas que no deben romperse

| Regla | Explicación | Ejemplo de violación |
|-------|-------------|---------------------|
| **No hardcodear secrets** | Passwords, tokens, API keys van en variables de entorno | `postgresql+asyncpg://postgres:john.007@localhost:5432/siga_core` en alembic.ini |
| **No hardcodear URLs** | Las URLs de servicios van en .env o configuración | `fetch('http://localhost:8000/api/...')` esparcido en 6 componentes |
| **No omitir graceful degradation** | Dependencias opcionales no deben causar crash si faltan | `from nats.aio.client import Client as NATS` sin try/except |
| **No usar formato de manifiesto no estándar** | Todos los módulos deben cumplir MODULE-STD-2.0 | `entry_point: main:app`, `port: 8006` en lugar de `endpoints.http` |
| **No posponer fallas críticas** | Las fallas que impiden el funcionamiento deben corregirse de inmediato | Admin UI quedó para "después" inicialmente |
| **No asumir permisos que no existen** | Verificar permisos contra los que realmente genera el sistema | `required_permission = f"{module}:access"` cuando solo existen `{module}:read/write` |
| **No duplicar puertos entre módulos** | Cada módulo debe tener un puerto exclusivo | `mod-estudiantes` y `mod-matricula` compartían puerto 8006 |

---

## 4. DECISIONES ARQUITECTÓNICAS FUNDAMENTALES

### 4.1 Stack Tecnológico

| Componente | Tecnología | Versión | Justificación |
|------------|-----------|---------|---------------|
| Backend Core | Python + FastAPI | 0.104+ | Rendimiento async, tipado moderno, OpenAPI nativo |
| Backend Módulos | Python + FastAPI | 0.104+ | Misma tecnología que Core, consistencia |
| Frontend | React + Vite | React 18+ | SPA moderna, vite para dev rápido |
| Base de datos | PostgreSQL | 16+ | Madurez, JSONB, rendimiento |
| ORM | SQLAlchemy | 2.0+ | Async support, madurez |
| Event Bus | NATS | 2.x | Ligero, Cloud Native, persistente (JetStream) |
| Cache | Redis | 7.x | Cache distribuido, TTL, pub/sub |
| Auth | JWT (python-jose) | - | Stateless, sin sesión en servidor |

### 4.2 Decisiones de Diseño

| Decisión | Opción elegida | Alternativa descartada | Razón |
|----------|---------------|----------------------|-------|
| Arquitectura | Core + Módulos | Monolito | Escalabilidad, aislamiento, despliegue independiente |
| BD por módulo | Sí, cada módulo con su propia BD | BD única compartida | Aislamiento de datos, independencia, sin acoplamiento |
| Frontend | SPA monolítica con lazy loading | Micro-frontends | Innecesario para esta escala (11 carreras, ~5-8 módulos) |
| Multi-tenencia | Columna `programa_id` | Schemas separados por programa | Simplicidad operativa |
| Auth | JWT stateless, 30min expiración | Sesiones con estado | Escalabilidad horizontal |
| Comunicación módulos | NATS (event bus asíncrono) | HTTP síncrono entre módulos | Desacoplamiento temporal, resiliencia |
| Resiliencia | Circuit Breaker 3 estados | Timeout simple | Prevención de cascada de fallos |
| Manifiesto módulo | MODULE-STD-2.0 | v1 (sin dependencies, tags, grants) | Mayor expresividad, mejor gobernanza |

### 4.3 Puertos Asignados

| Módulo | Puerto | Notas |
|--------|--------|-------|
| Core | 8000 | Gateway principal |
| mod-planes-estudio | 8002 | Planes de estudio MINEDU |
| mod-programas-estudio | 8005 | Programas/carreras |
| mod-gestion-academica | 8006 | Centraliza estudiantes y matrículas |

*(Los puertos 8001, 8003, 8004, 8007 están libres para futuros módulos)*

---

## 5. CONVENCIONES DEL PROYECTO

### 5.1 Código

- **Python**: snake_case para funciones/variables, PascalCase para clases, UPPER_CASE para constantes
- **JavaScript/React**: camelCase para variables/funciones, PascalCase para componentes, PascalCase para archivos de componentes
- **BD**: snake_case plural para tablas, snake_case para columnas
- **APIs**: Prefijo `/api/v1/{module}/{resource}`

### 5.2 Frontend

- Los componentes van en `src/modules/{nombre}/`
- El API client centralizado en `src/core/api/client.jsx`
- Los hooks de autenticación en `src/core/auth/`
- NO usar `fetch` directo con URL hardcodeada - siempre usar `API_BASE` o `apiClient`
- NO guardar tokens en variables globales - usar `localStorage` + `apiClient`

### 5.3 Backend

- Los módulos van en `modules/mod-{nombre}/`
- El Core en `app/core/`
- Cada módulo debe tener su `event_bus.py` con import condicional de NATS
- Cada módulo debe tener `manifest.yaml` en formato MODULE-STD-2.0
- Los endpoints de health check son obligatorios en cada módulo

---

## 6. OBJETIVOS PENDIENTES (ROADMAP)

### Fase 1 - Fundación (Semanas 1-8)
- [x] Configurar entorno de desarrollo (PostgreSQL, Python venv, Node.js)
- [x] Implementar Circuit Breaker real en `app/core/resilience/circuit_breaker.py`
- [x] Implementar persistencia del Module Registry en tabla `core_modules`
- [x] Core estable + Socket funcional
- [x] mod-planes-estudio funcional
- [x] mod-programas-estudio funcional
- [x] Parser Excel MINEDU para importación de planes de estudio

### Fase 2 - Núcleo Académico (Semanas 9-16)
- [x] mod-estudiantes funcional
- [x] mod-usuarios funcional (con roles)
- [x] UI de Administración de Usuarios
- [ ] Sistema de Auditoría

### Fases 3-6
- Ver `docs/12-ROADMAP.md` para el plan completo

---

## 7. DOCUMENTOS DE ARQUITECTURA

| Documento | Propósito |
|-----------|-----------|
| `docs/00-INDICE.md` | Índice maestro de toda la documentación |
| `docs/01-VISION-ARQUITECTONICA.md` | Visión general, principios SOLID, ADRs |
| `docs/02-CORE.md` | Arquitectura interna del Core |
| `docs/03-SOCKET-MODULE-RUNTIME.md` | Ciclo de vida de módulos, 8 estados |
| `docs/04-RESILIENCIA.md` | Circuit breaker, health monitor, fallbacks |
| `docs/05-MODELO-DATOS.md` | Esquemas SQL completos |
| `docs/06-COMUNICACION.md` | Flujo proxy, eventos NATS, WebSocket |
| `docs/07-SEGURIDAD.md` | JWT, RBAC, rate limiting, auditoría |
| `docs/08-FRONTEND.md` | Estructura del frontend |
| `docs/09-PLAN-NEGOCIO.md` | Problema/solución, mercado, ROI, KPIs |
| `docs/10-LOGICA-NEGOCIO.md` | Reglas de negocio académicas |
| `docs/11-ESTANDAR-MODULOS.md` | Estándar MODULE-STD-2.0 |
| `docs/12-ROADMAP.md` | Plan de 6 fases, 36 semanas |

---

## 8. HISTORIAL DE ACTUALIZACIONES

| Fecha | Versión | Cambios |
|-------|---------|---------|
| 2026-06-26 | 1.0 | Creación inicial del documento. Registro de 7 fallas críticas corregidas, metodología de trabajo, decisiones arquitectónicas y objetivos del proyecto. |
| 2026-06-27 | 1.1 | Auditoría de Backend (Fase 1). Aplicación estricta del Transactional Outbox, BaseModels y Trazabilidad (X-Request-ID) en `mod-estudiantes` como plantilla (Golden Template). Eliminación de passwords hardcodeados. |
| 2026-06-27 | 1.2 | Pragmatic Boundary Fusion: Fusión de `mod-estudiantes` y `mod-matricula` en `mod-gestion-academica` para resolver problemas de límites transaccionales y alta cohesión. |
| 2026-06-27 | 1.3 | Auditoría General del Backend: Aplicación del Golden Template (Outbox Pattern, X-Request-ID, BaseModel) a `mod-programas-estudio` y `mod-planes-estudio`. Eliminación del obsoleto `mod-carreras`. Creación del `outbox_worker` para At-Least-Once Delivery. |
| 2026-06-27 | 1.4 | Implementación de Circuit Breaker real con 3 estados (CLOSED, OPEN, HALF_OPEN) y Persistencia del Module Registry en base de datos (`core_modules`). |
| 2026-06-27 | 1.5 | Sockets conectados en el Frontend Layout para notificaciones en tiempo real. APIs completadas (CRUD) para `mod-planes-estudio` y `mod-programas-estudio`. |
| 2026-06-27 | 1.6 | Implementación de `ExcelMineduParser` en `mod-planes-estudio` para importar los planes MINEDU (hojas de Módulos y Unidades) usando Pandas y endpoint FastAPI (`/planes/importar-minedu`). Fase 1 completada. |
| 2026-06-27 | 2.0 | Implementación de `mod-usuarios` (Modelos y Rutas CRUD para Usuarios, Roles, Permisos) mapeando la BD `siga_core`. Creación de la interfaz de Administración de Usuarios con React (`UserManagement.jsx`) en el Frontend. Fase 2 iniciada. |
| 2026-06-27 | 2.1 | Implementación completa de CRUDs en `mod-gestion-academica` para Estudiantes y Matrículas. Actualización de las vistas frontend `StudentMaster.jsx` y `EnrollmentProcess.jsx` para integrar correctamente el backend unificado. |

---

*Este documento debe actualizarse cada vez que se identifique una nueva lección, corrección importante o cambio en la metodología de trabajo.*
