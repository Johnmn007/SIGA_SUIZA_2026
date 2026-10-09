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
- [x] Sistema de Auditoría

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
| `docs/13-PLAN-CASUISTICAS-ACADEMICAS.md` | Trámites, convalidaciones, beneficios y procesos administrativos |
| `docs/14-PLAN-MATRICULAS-CASUISTICAS.md` | Fases de matrícula, extemporánea, bloqueos y nóminas |
| `docs/15-PROCESOS-NEGOCIO.md` | Procesos de negocio y flujos operativos (especificación viva): parser de planes, ingesta de admitidos, periodos y matrícula por tipo de estudiante |
| `docs/90-CREDENCIALES-PRUEBA.md` | Apéndice: credenciales de prueba (solo desarrollo) |

> **Consolidación DOC-00 (2026-08-29):** `05-SEGURIDAD-ROLES.md` y `13-ARQUITECTURA_ROLES.md` se fusionaron como Anexos A y B en `07-SEGURIDAD.md` (que pasó a v1.1); `06-CREDENCIALES-PRUEBA.md` se renumeró a `90-CREDENCIALES-PRUEBA.md`.

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
| 2026-06-27 | 3.0 | Implementación de Fase 3 (Evaluación - MVP). Creación de `EvaluationDashboard.jsx` para docentes y `CoordinatorSupervision.jsx` para supervisión de actas, con integración al `mod-evaluacion` y cálculo de la Regla del 70%. |
| 2026-06-27 | 4.0 | Implementación de Fase 4 (Trámites y Casuísticas). Creación de documento arquitectónico maestro (`13-PLAN-CASUISTICAS-ACADEMICAS.md`). Adición de 6 entidades a `mod-gestion-academica` (HistorialAcademico, Beneficios, Convalidaciones) y desarrollo del UI `TramitesDashboard.jsx` (Glassmorphism) para Secretaría Académica. Próximo paso prioritario definido: Parser Excel MINEDU. |
| 2026-07-01 | 4.1 | Simplificación UI/UX (Decisión MVP): Se refactorizó el ingreso de notas (`EvaluationDashboard.jsx` y `mod-evaluacion/schemas.py`) a usar un único campo de `nota_final`. Se redujo la fricción de adopción para los docentes que ya manejan sus notas parciales en Excel. Implementación de edición rápida de alumnos (typos) en Secretaría. |
| 2026-08-29 | 4.2 | Consolidación de documentación (DOC-00): fusión de `05-SEGURIDAD-ROLES.md` y `13-ARQUITECTURA_ROLES.md` como Anexos A y B de `07-SEGURIDAD.md` (v1.1), renumera de `06-CREDENCIALES-PRUEBA.md` a `90-CREDENCIALES-PRUEBA.md`, e índice maestro (`00-INDICE.md`) actualizado con la numeración canónica sin colisiones. |
| 2026-08-29 | 4.3 | Especificación de procesos (DOC-15): creación de `15-PROCESOS-NEGOCIO.md` como especificación viva de flujos operativos (parser de planes crea la carrera; parser de admitidos reparte por carrera; periodos `YYYY-N` 2026-1 Abr–Ago / 2026-2 Ago–Dic; matrícula automática Ciclo I + credenciales DNI/DNI; matrícula por tipo de estudiante). Reglas canónicas aprobadas y reflejadas en DOC-10 §1.1 y DOC-14 v2.1 (Caso C: avance correlativo primero, jaladas según creditaje; Caso F: repitente repite ciclo completo con evaluación del área académica). |
| 2026-08-29 | 4.4 | Detalle de matrícula regular de ingresantes (DOC-15 v1.1): semestres por calendario con denominación `YYYY-N` y distribución fija de ciclos (impares I, III, V en `YYYY-1`; pares II, IV, VI en `YYYY-2`, §4.1); ventana anual de ingesta enero–abril (botón "Extraer ingresantes") con aislamiento por área académica (§3.3); ciclo de ratificación de la matrícula (§5.4): standby → boleta de Tesorería → validación + ficha de estudiante → Nómina Oficial de Matriculados; reporte MINEDU (SISEDU). Ajustes menores: DOC-10 v1.2 (estado inicial STAND BY) y DOC-14 v2.2 (Caso A detallado). |
| 2026-08-29 | 4.5 | Matrícula de **estudiantes no regulares** (DOC-15 v1.2, §5.5/§5.6/§5.7): definición de no regular/invicto (jalados del ciclo anterior, ciclos previos acumulados, o del ciclo actual); regla del **70% sobre asignaturas (UDs)**: <70% avanza al siguiente ciclo, >70% = **separación del periodo** con retorno el próximo año **como reingresante** (evaluación + permiso, DOC-13 §3); jalados recuperables solo de ciclos de **misma paridad/semestre** y vigentes, tope 24 créditos; mecánica de matrícula por formulario de un clic con carga masiva del ciclo (históricos uno-a-uno); **credenciales de históricos se mantienen** (no se regeneran); §5.7 **fichas de matrícula desde plantillas Word con variables** (data de formularios/parsers/Excel; motor de render como pendiente). Ajustes: DOC-14 v2.3 (Caso C y F afinados) y DOC-10 v1.3 (§4.4 y §7.1 actualizados). |
| 2026-08-29 | 4.6 | Retomar trabajo tras pausa. Alcance de matrícula declarado (DOC-15 v1.3 §5.1, DOC-14 v2.4): **el MVP opera 3 tipos de matrícula** — Ingresante/Cachimbo (Caso A), Histórico Regular/Invicto (Caso B) e Irregular con jalados (Caso C). Los tipos **Reingresante (D), Traslado Interno/Externo (G — nuevo), Convalidación (H — nuevo) y Convenio/Becado (E)** quedan con **base de diseño lista** (motor de reglas A–H, flujos DOC-13, esquemas `mod-gestion-academica`) para habilitarse en versiones futuras del roadmap (DOC-12) sin bloquear el MVP. Pendiente de activación registrado en DOC-15 §9. DOC-10 v1.4 sin cambios de reglas. |
| 2026-08-29 | 4.7 | **Gestión académica** (DOC-15 v1.4 §4.2/§4.3, DOC-14 v2.5, DOC-05 v1.2.0): **periodos** — un solo periodo activo a la vez (al activar el nuevo el anterior se desactiva/cierra solo), botones "Activar/Abrir Ciclo" y "Cerrar Semestre", aislamiento por `periodo_id` (UI operativa solo muestra el activo; la data siempre está viva y consultable por reportes históricos). **Coexistencia de mallas en transición de plan** — estados `Vigente / En Baja / Reemplazado`; `plan_anclado_id` fijado por estudiante en la ingesta (todo su recorrido se resuelve contra SU malla); **dictado en paralelo** (los docentes siguen dictando las UDs del plan en baja hasta el egreso de la última promoción, a la par de las UDs de la malla nueva); el parser marca el plan anterior `En Baja`; reportes por programa mezclan ambos planes; Adecuación de Malla (DOC-13 §3) solo al fin de la transición. |
| 2026-08-29 | 4.8 | Ciclo de vida del periodo **refinado** (DOC-15 v1.5 §4.2, DOC-14 v2.6 §1.1): se **mantienen los 4 estados** (Planificación → Matrícula Abierta → En Curso → Histórico) con ajustes — Planificación precarga cursos por semestre y oferta de mallas coexistentes; **Bloqueo Definitivo sella la Nómina solo de ratificados** (los standby no integran la nómina); En Curso = único periodo visible; Histórico = sellado pero consultable. Los botones pasan a ser **transiciones**: "Activar/Abrir Ciclo" (→ Matrícula Abierta) y "Cerrar Semestre" (→ Histórico). |
| 2026-08-29 | 4.9 | Cambio de plan controlado en carreras (DOC-15 v1.6 §2.4, DOC-05 v1.3.0, DOC-14 v2.7): la **carrera es única y el plan es versionado (1:N)** — "Crear carrera" sube el Plan v1 (`Vigente`); en una carrera existente, **"Gestionar planes de estudio → Subir nuevo plan"** crea una nueva versión sin tocar la carrera. Flujo controlado: **Subir (borrador revisable) → Publicar → `Vigente`** y el anterior pasa **automáticamente a `En Baja`** (nunca dos Vigentes por programa). La ficha de la carrera muestra todas las versiones con estado, vigencia y **conteo de estudiantes anclados**; un plan solo pasa a `Reemplazado` con 0 alumnos activos (bloqueo automático). El plan Vigente gobierna a los nuevos ingresantes; los históricos usan su `plan_anclado_id`. |
| 2026-08-29 | 4.10 | **Registro de estudiantes** confirmado y precisado (DOC-15 v1.7): ingestión del Excel de admisión → registro automático → **filtro y reparto por las 11 carreras** (§3.2/§3.3). **Aislamiento por área reforzado**: cada una de las 11 carreras es un ámbito independiente; la secretaria/encargada de cada área solo ve y opera a los estudiantes de su carrera (roles + sombrilla `programa_id`, DOC-07). **Credenciales DNI/DNI generadas al matricular** al ingresante (no al asentar), con cambio posible en el primer ingreso (§5.2). |
| 2026-08-29 | 4.11 | **Nuevo Proceso E — Personal Académico** (DOC-15 v1.8 §6): área académica requiere 3 actores — **Coordinador de Área** (cargo más elevado), **docentes** (según alumnos/salones/secciones) y **secretaria** (bajo el mando del coordinador). 3 tipos de trabajadores: **docentes nombrados** (permanentes, sin contrato anual), **docentes contratados** (por **Resolución de la DREU**) y **secretarias** (contratadas por la institución). La institución **asigna** el personal a las áreas (puesto, área, mando, designación de coordinador). **Doble función del coordinador**: coordinación + docencia con carga **siempre menor** que un docente regular (1-2 cursos vs 4-6). Roles ya existentes en DOC-07 (`coordinador_programa`, `docente`, `secretaria_programa`). Secciones de DOC-15 renumeradas (matriz→§7, precedencias→§8, casos→§9, pendientes→§10, historial→§11); precedencia nueva y pendiente de provisión de personal en `mod-usuarios`. |
| 2026-08-30 | 4.12 | **Verificación de implementación (especificado vs código)** — auditoría del código real (backend `siga_backend` + frontend `siga_frontend`) contra las reglas DOC-15/DOC-14/DOC-10. Resultado: la **plataforma** está construida (CRUDs, roles, parser MINEDU, UI estudiantes/matrícula/periodos/docentes), pero la **capa de reglas de negocio nuevas** está parcial o pendiente (conexión ingesta→matrícula Ciclo I→credenciales DNI/DNI, ratificación con nómina oficial, aislamiento forzado por `programa_id` en backend, coexistencia de mallas en datos, regla 70% y paridad ≤24, login por body JSON vs query params según ADR-013). Detalle trazable por requerimiento en **Anexo de verificación al final de este archivo**. |

---

# ═══ SISTEMA DE DISEÑO UI (FASE 2 + FASE 3) ═══

## Contexto
Rediseño integral del frontend (`siga_frontend`) aplicando el sistema de diseño institucional en **solo light mode**, ejecutado por fases con verificación de build+lint por fase. Sin commit hasta indicación del usuario. Fuente de identidad: `siga_frontend/src/index.css` (Tailwind v4 `@theme`) y `siga_frontend/tailwind.config.js`.

## Identidad canónica
- **Paleta `web_suiza`**: `primary #0044B2`, `primary-dark #003388`, `primary-light #A0C1F7`, `primary-soft #E5EEFE`, `secondary #002D7A`, `secondary-dark #001F58`, `background #F3F4F6`, `surface #FFFFFF`, `slate-text #1E293B`, `slate-light #F8FAFC`, `navy #3A4B74`, `darkaccent #0F172A`.
- **Tipografía** Outfit. **Textura** Shipibo-Kené. **Glassmorphism** `rgba(255,255,255,.78)` + blur 16px. Botones `min-h 44px` con `active:scale`.
- **Tokens de clase verificados**: `text-slate-text`, `bg-primary-soft`, `badge` + `badge-blue/green/amber/red/slate`, `btn-primary/secondary/ghost/danger/icon`, `input-field`, `label`, `glass-panel`, `glass-card`, `data-table`, `page-header`, `animate-fade-in`, shadows `glass/glass-lg/card/card-lg/focus-ring`. **No existe `secondary-soft`** (usar `slate-light`).

## Aplicado — FASE 2 (pantallas núcleo)
Dashboard, StudentMaster, EditStudentModal, EnrollmentDashboard, EnrollmentProcess, ExtraordinaryEnrollmentModal, AcademicDashboard, CoordinatorAcademic, CoordinatorReview, CoordinatorTutorias, TramitesDashboard, CurriculumMesh, PeriodManager. Sustitución de emojis/svg → iconos **Lucide**, índigo/púrpura/naranja no canónicos → paleta institucional, texto `slate-800` → `text-slate-text`, tablas → `data-table`, estados → `badge-*`.

## Aplicado — FASE 3 (pantallas secundarias)
EvaluationDashboard, FinancesDashboard, AdminDashboard (+ UserManagement, StaffManagement, AdmissionModule, AuditLogs), ChangePasswordModal, CoordinatorSupervision, StudentReportCard, DocentePlanning. Misma metodología de tokens/iconos/paleta.

## Lección de build
- Build falla si una clase Tailwind no existe (p.ej. `hover:bg-primary/8` — opacidad no válida; corregido a `/10`). Antes de usar una clase con opacidad `/n`, validar que `n` esté en la paleta permitida.
- Icono Lucide `UserOff` NO existe → usar `UserX`. Verificar nombre exacto del icono antes de importar (el build de rollup falla con "not exported").
- Lección lint: `.map(({ icon, label }) => <Icon/>)` dispara `no-unused-vars` → `const Icon = icon;` en el body del map.
- `npm run build` pasó ✓. `npm run lint` global sigue con **errores pre-existentes** de lógica (set-state-in-effect, exhaustive-deps, dead state `malla`/`selectedStudent`/`setNewProgram`/`programs/periods`/`setPlanActual`/`cargaActiva`/`setStudentId`/`setPeriod`, catch `e` unused) en archivos cuya lógica no se tocó — deuda técnica separada, fuera del alcance del rediseño visual.

## Docker (verificado)
`docker-compose.yml` válido (`docker compose config --quiet` OK). Servicios: postgres, nats(+JS), redis, siga-core (8000), mod-usuarios/planes/programas/gestion-academica/auditoria/evaluacion/admision (8001-8009), siga-frontend (3000→80, target `build` con `npm run dev`). Levanta todo con **`docker compose up --build`**. Docker Engine disponible (v29, Compose v2.40).

---

## ANEXO — ESTADO REAL vs ESPECIFICADO (verificado 2026-08-30)

> Resultado de la auditoría de código (sin modificaciones) contra las reglas canónicas de DOC-15 (v1.8), DOC-14 (v2.7) y DOC-10 (v1.4). Sirve de **backlog trazable**: cada brecha cita su ubicación real para planificar su cierre.

| Requerimiento (regla) | Verdicto | Estado real detectado (ubicación) |
|---|---|---|
| **Registro de estudiantes + filtro por carrera** | ✅ Implementado | UI: `siga_frontend/src/modules/students/StudentMaster.jsx` (filtro `?programa_id=:82-84`; auto-aislamiento para `secretaria_programa:63-67`), edición `EditStudentModal.jsx`. Backend CRUD: `modules/mod-gestion-academica/routes.py` |
| **Ingesta Excel admisión → reparto por carrera** | ⚠️ Parcial | Parser Excel (`modules/mod-admision/main.py:187`) llena `PostulanteAdmitido` **sin crear estudiantes**; `/admision/ingesta` (`modules/mod-gestion-academica/routes.py:14-71`) crea `Estudiante` con `codigo={year}-{dni}` y valida duplicado por DNI. **Piezas desconectadas** (la ingesta consume JSON, no el Excel); sin repartición por cupos — solo mapeo manual de nombre→ID con fallback `99` (`main.py:221-243`) |
| **Matrícula automática Ciclo I → standby → boleta → Nómina** | 🟠 Ausente | El evento `estudiante_ingresado` solo menciona la intención en comentario (`routes.py:47-48`); **no hay consumidor** que matricule Ciclo I ni cree usuario (los listeners NATS activos son solo de auditoría). No existen `standby`, `Habilitado_Financiero` ni Nómina Oficial. Front: matrícula manual por estudiante sí existe (`EnrollmentProcess.jsx`), con bloqueo por `pago_matricula` (:83-86) y precarga Ciclo I (:127-132); `pago_matricula` se marca desde Finanzas (`FinancesDashboard.jsx:48-68`) |
| **Credenciales DNI/DNI + cambio en 1er ingreso** | 🟠 Ausente | Identity usa **email como login** (`app/core/identity/models.py:22-36`; `/auth/login` `app/main.py:113-122`); sin provisión de usuario al matricular; sin `must_change_password`. El cambio voluntario de contraseña sí existe (`/auth/change-password` `app/main.py:151-177` + `ChangePasswordModal.jsx`). **Divergencia ADR-013**: el login espera `email/password` como **query params, no body JSON** (`tmp_login.json` lo confirma) |
| **Periodos 2026-1/2026-2, activar/cerrar, un solo activo** | ⚠️ Parcial | `PeriodoAcademico` (`modules/mod-programas-estudio/models.py:24-35`) con estados `planificacion/matricula_abierta/en_curso/cerrado`; CRUD y cambio de estado `routes.py:81-133`; UI `PeriodManager.jsx`. ⚠️ Nombre en formato **`2026-I`** (no `2026-1`); **aislamiento por `periodo_id` incompleto** — `GET /estudiantes/` y `GET /matriculas/` (`routes.py:100-106`, `222-225`) no filtran por periodo |
| **Coexistencia de mallas (Vigente/En Baja/Reemplazado, `plan_anclado_id`, dictado en paralelo)** | ⚠️ Parcial | Parser MINEDU ✅ (`modules/mod-planes-estudio/excel_parser.py`; endpoints `parse-minedu`/`importar-minedu` `routes.py:163-236`); UI de importación y malla ✅ (`AcademicDashboard.jsx`, `CurriculumMesh.jsx`). ⚠️ `PlanEstudio.estado` es texto genérico `"activo"` (`models.py:18`) — **no existen** `vigente/en_baja/reemplazado/borrador` con transiciones; **`estudiantes.plan_anclado_id` NO existe** (`mod-gestion-academica/models.py:5-25`); sin gestor de versiones de plan en UI |
| **Reglas de matrícula por tipo (70% UDs, paridad ≤24, invicto/irregular/repitente/reingresante)** | 🟠 Ausente | Solo validación genérica de créditos **1–40** (`routes.py:191-194`); sin cálculo de jalados ni regla 70% (el único criterio es `aprobado >= 13` en evaluación `mod-evaluacion/routes.py:20-23`). Convalidaciones (`routes.py:314-333`) y beneficios/convenio (`routes.py:335-346`) existen como **CRUD suelto sin efecto** en la matrícula. Front: tope 40 hardcodeado y solo visual (`EnrollmentProcess.jsx:347-348`) |
| **Personal académico (roles, DREU, asignación a áreas, coordinador)** | ✅ Implementado | Multirol M:N (`app/core/identity/models.py:7-12`; `modules/mod-usuarios/routes.py:129-165`). `perfiles_personal` (`modules/mod-usuarios/models.py:53-66`): `condicion_laboral` NOMBRADO_ESTADO / CONTRATADO_DRE / CONTRATADO_INSTITUCIONAL, `numero_resolucion`, `fecha_fin_contrato`, `cargo_funcional` (JEFE_AREA→`coordinador_programa`+`docente`), `programa_estudio_id`. `POST /personal` `routes.py:242-308`; UI `StaffManagement.jsx`, asignación a programa `:321-338` |
| **Aislamiento por área (sombrilla `programa_id`) forzado** | 🟠 Ausente (backend) | El JWT no lleva `programa_id` (`app/core/identity/tokens.py:13-23`); el gateway no inyecta header de programa (`app/core/gateway/http_proxy.py:281-284`); el middleware solo valida `{module}:read/write` (`security_middleware.py:48-64`). El filtro por programa es **query param opcional** (`routes.py:100-106`) — la secretaria de un área podría leer otra pasando `programa_id=...`. Front sí auto-restringe la opción de programa por rol |
| **Bonus — provisioning de permisos de roles** | 🟠 Ausente | `role_permissions` queda vacío en el seeder (`permissions.py:35-38` placeholder); los no-`superadmin` pueden recibir **403** en `/api/*` por el chequeo del middleware |

**Conclusión:** la plataforma (CRUDs, roles, parser, UI) está operativa; las brechas corresponden a la **capa de reglas de negocio nuevas** especificadas desde DOC-15 v1.1 en adelante (matrícula automatizada con ciclo de ratificación, credenciales DNI/DNI, aislamiento forzado, coexistencia de mallas, regla 70%/paridad). Estas brechas son las candidatas prioritarias del plan de implementación (pendiente de ejecutar).

---

*Este documento debe actualizarse cada vez que se identifique una nueva lección, corrección importante o cambio en la metodología de trabajo.*

