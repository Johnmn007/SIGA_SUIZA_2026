# Roadmap de Desarrollo

> **Versión:** 1.1 | **Última actualización:** 2026-08-29 | **Estado:** Activo

---

## 1. Visión General

El roadmap de SIGA describe el desarrollo en **4 fases de implementación ya cumplidas** (núcleo, núcleo académico, evaluación, trámites y casuísticas), seguidas por el **Pulido** (CI/CD, hardening, pruebas completas) y el **Post-MVP** (módulos de expansión, K8s, app móvil, BD por módulo). Las 4 fases de implementación produjeron software funcional; el enfoque es **iterativo e incremental**. El estado real al 2026-08-29 se resume en [`MEMORIA_CONTEXTO.md`](MEMORIA_CONTEXTO.md) §4.2.

### Timeline Resumido

```
Fase 1: Núcleo           │ Sem 1-8   │ Core, planes-estudio, programas-estudio  → ✅ IMPLEMENTADA
Fase 2: Núcleo Académico │ Sem 9-16  │ gestión-académica (estudiantes+matrícula+trámites),
                                       usuarios, auditoría                        → ✅ IMPLEMENTADA
Fase 3: Evaluación       │ Sem 17-24 │ mod-evaluacion (notas, regla del 70%)     → ✅ IMPLEMENTADA
Fase 4: Trámites         │ Sem 25-32 │ Trámites/casuísticas, catálogo 11 programas → ✅ IMPLEMENTADA
Pulido                   │ actual    │ CI/CD, hardening, pruebas completas (rate limiting ya en MVP)
Post-MVP                 │ futuro    │ reportes, docencia, traslados, reingresos, K8s, app móvil, BD por módulo
```

> **Realineación v1.1 (2026-08-29):** el roadmap anterior (6 fases / 36 semanas) se actualizó al estado real. Las fases 1-4 de implementación están **completadas** (ver historial §14). La nomenclatura "Fase 5/Fase 6" se reemplaza por **Pulido** y **Post-MVP** para no colisionar con la Fase 4 real (Trámites).

---

## 2. Fase 0: Preparación (documentación y setup)

> **Estado:** ✅ COMPLETADO

### Objetivo
Tener toda la documentación, arquitectura y entorno de desarrollo listos antes de comenzar la implementación.

### Entregables

| ID | Entregable | Estado | Prioridad |
|----|-----------|--------|-----------|
| DOC-01 | Documentación de arquitectura (docs/) | ✅ Completo | Crítica |
| DOC-02 | Plan de negocio | ✅ Completo | Alta |
| DOC-03 | Lógica de negocio documentada | ✅ Completo | Crítica |
| DOC-04 | Estándar de módulos definido (MODULE-STD-2.1) | ✅ Completo | Crítica |
| DOC-05 | Roadmap de desarrollo | ✅ Completo | Alta |
| DEV-01 | Corrección de fallas críticas del Core (Fallos #1-#6) | ✅ Completo | Crítica |
| DEV-02 | Setup de entorno de desarrollo | ✅ Completo | Alta |
| DEV-03 | Repositorio Git con estructura inicial | ✅ Completo | Alta |

### Criterios de Aceptación

- [x] Todos los documentos de arquitectura están en `docs/`
- [x] El estándar de módulos está definido y revisado
- [x] PostgreSQL 16+ instalado y corriendo
- [x] Python 3.12+ instalado con venv
- [x] Node.js LTS instalado (versión no fijada en el roadmap; el frontend usa Vite 7 / React 19)
- [x] Redis 7+ instalado
- [x] NATS server instalado
- [x] Repositorio con estructura de directorios creada
- [x] Fallos críticos del Core identificados y planificados

---

## 3. Fase 1: Núcleo - Core + Módulos Base (Semanas 1-8)

> **Estado:** ✅ IMPLEMENTADA

### Objetivo
Core estable, socket funcional, proxy dinámico, y 2 módulos base operativos.

### Módulos del Core

| Componente | Descripción | Sprints |
|-----------|-------------|---------|
| **Core Identity** | Autenticación (login, register, JWT), refresh token, logout (blacklist) | 1 |
| **RBAC** | Roles, permisos, asignación usuario-rol, verificación en middleware | 1-2 |
| **HTTP Gateway** | Proxy dinámico a módulos, inyección de headers de seguridad, circuit breaker | 2-3 |
| **WebSocket Gateway** | Conexiones WebSocket a módulos, heartbeat | 3 |
| **Module Registry** | Registro/desregistro de módulos, persistencia en BD, health checks | 2-3 |
| **Health Monitor** | Verificación periódica de salud de módulos (cada 30s), estado degraded/unhealthy | 3-4 |
| **Circuit Breaker** | Estados: closed/open/half-open, timeout configurables, fallback | 3-4 |
| **Cache Manager** | Conexión Redis, caché de consultas frecuentes, invalidación por evento | 4 |
| **Fallback Manager** | Respuestas degradadas cuando un módulo no responde | 4 |
| **Admin Endpoints** | Gestión de módulos, usuarios, configuración del Core | 4 |

### Módulos de Negocio

| Módulo | Funcionalidad | Sprints |
|--------|--------------|---------|
| **mod-planes-estudio** | CRUD completo de planes, parser Excel MINEDU, módulos formativos, UDs, capacidades, indicadores | 2-4 |
| **mod-programas-estudio** | CRUD completo de programas, asociación con planes | 3-4 |

### Entregables Técnicos Detallados

```
Semana 3 (Sprint 1):
├── Core: Identity (login, register, JWT)
├── Core: RBAC (roles, permisos, middleware)
├── Core: HTTP Gateway (proxy básico a módulos)
└── Core: Module Registry (registro manual)

Semana 4 (Sprint 2):
├── Core: HTTP Gateway (inyección de headers, circuit breaker)
├── Core: Health Monitor (health checks cada 30s)
├── mod-planes-estudio: CRUD básico
└── mod-programas-estudio: CRUD básico

Semana 5 (Sprint 3):
├── Core: WebSocket Gateway
├── Core: Circuit Breaker (estados, timeout, fallback)
├── mod-planes-estudio: parser Excel MINEDU
├── Frontend: Login + Dashboard básico
└── Frontend: Lista de módulos registrados

Semana 6 (Sprint 4):
├── Core: Cache Manager (Redis)
├── Core: Fallback Manager
├── Core: Admin Endpoints
├── mod-planes-estudio: Capacidades e indicadores
├── Frontend: CRUD básico de planes
└── Pruebas de integración Core -> Módulo -> Core
```

### Criterios de Aceptación

- [ ] Login/register funcionando con JWT (access + refresh token)
- [ ] Proxy a módulos funcionando con verificación de permisos
- [ ] Registro automático de módulos desde el filesystem
- [ ] Health check de módulos cada 30s con detección de fallos
- [ ] Circuit breaker abriendo/cerrando correctamente según configuración
- [ ] WebSocket: módulos reciben eventos del Core
- [ ] Frontend puede listar módulos registrados
- [ ] CRUD completo de planes de estudio
- [ ] CRUD completo de programas de estudio
- [ ] Parser Excel MINEDU: importa 1 plan correctamente
- [ ] Pruebas de integración: Core -> módulo -> Core

---

## 4. Fase 2: Núcleo Académico - mod-gestion-academica, usuarios y auditoría (Semanas 9-16)

> **Estado:** ✅ IMPLEMENTADA

### Objetivo
Gestión completa de estudiantes y proceso de matrícula automatizado, más usuarios/roles y auditoría.

### Módulos

#### mod-gestion-academica (Semanas 9-12) — fusión Estudiantes + Matrícula + Trámites

> **Nota de Arquitectura (ya ejecutada):** por la extrema cohesión entre estudiantes y matrícula, estos dominios se fusionaron en un **Boundary Context** único (`mod-gestion-academica`), eliminando `mod-estudiantes` y `mod-matricula` como módulos separados (ver [`MEMORIA_CONTEXTO.md`](MEMORIA_CONTEXTO.md) §4.2). Hoy incorpora además los trámites y casuísticas (ver Fase 4).

| Feature | Descripción | Prioridad |
|---------|-------------|-----------|
| CRUD estudiantes | Registro, modificación, eliminación, consulta | Alta |
| Búsqueda avanzada | Por DNI, nombres, código de estudiante, programa | Alta |
| Historial académico | UDs cursadas, notas, estados, promedios históricos (`HistorialAcademico`) | Alta |
| Gestión de documentos | Subida de documentos (DNI, partida, certificados) | Media |
| Períodos de matrícula | Apertura, cierre, fases Regular → Extemporánea → Bloqueo Definitivo | Alta |
| Matrícula Ciclo I | Automática, asignación completa del primer ciclo | Alta |
| Matrícula Ciclos II-VI | Asistida, selección de UDs con validación | Alta |
| Validación de prerrequisitos | Verificación de UDs aprobadas antes de cursar | Alta |
| Control de créditos | Validación 12-24 créditos (parametrizable) | Alta |
| Regla del 70% | Cálculo de estado regular/irregular/repite | Alta |
| Beneficios y Convalidaciones | Becas/beneficios y convalidaciones (internas) | Media |
| Importación Excel | Carga masiva desde archivo Excel con validaciones | Media |

#### mod-usuarios (Semanas 9-10)

| Feature | Descripción | Prioridad |
|---------|-------------|-----------|
| CRUD usuarios/roles/permisos | Usuarios, roles, permisos (RBAC) | Alta |
| Autenticación | Login JWT (HS256), gestión de sesiones | Alta |
| UI Administración de Usuarios | `UserManagement.jsx` | Alta |

#### mod-auditoria (Semanas 11-12)

| Feature | Descripción | Prioridad |
|---------|-------------|-----------|
| Trazabilidad | Registro de cambios en `core_audit_logs` (quién, cuándo, qué) | Alta |
| Auditoría de trámites | Rastro de auditoría en trámites formales (p. ej. rectificación de nota) | Alta |

### Frontend

| Feature | Descripción | Sprints |
|---------|-------------|---------|
| Módulo estudiantes | Formulario de registro, tabla con búsqueda, detalle (`StudentMaster.jsx`) | 9-10 |
| Módulo matrícula | Wizard de matrícula, selección de UDs, validaciones en tiempo real (`EnrollmentProcess.jsx`) | 11-12 |
| Dashboard | Estadísticas de estudiantes, matrículas por programa | 12 |

### Criterios de Aceptación

- [x] Registro de estudiante con todos los datos (DNI, nombres, dirección, etc.)
- [x] Búsqueda por DNI/nombres en < 2s
- [x] Importación de 100+ estudiantes desde Excel en < 30s
- [x] Matrícula automática para ciclo I: asigna todas las UDs del primer ciclo
- [x] Matrícula asistida: selección de UDs con validación en tiempo real
- [x] Validación correcta de prerrequisitos (obligatorios y recomendados)
- [x] Control de créditos: rechaza < 12 o > 24 créditos
- [x] Cálculo correcto de estado de promoción (regular/irregular/repite)
- [x] Carga sugerida prioriza UDs desaprobadas para irregulares
- [x] Alertas de riesgo básicas (bajo rendimiento, inasistencia)
- [x] Frontend: wizard de matrícula completo y funcional
- [x] CRUD de usuarios/roles/permisos y registro de auditoría operativos

---

## 5. Fase 3: Evaluación - mod-evaluacion (Semanas 17-24)

> **Estado:** ✅ IMPLEMENTADA

### Objetivo
Registro de notas, cálculo de promedios, alertas tempranas, boletines.

### Módulos

#### mod-evaluacion (Semanas 17-24)

| Feature | Descripción | Prioridad |
|---------|-------------|-----------|
| Periodos de evaluación | Apertura/cierre por ciclo, configuración de tipos y pesos | Alta |
| Registro de notas | Docente ingresa notas (MVP: campo único `nota_final`, ver MEMORIA v4.1) | Alta |
| Validación de notas | Rango 0-20, nota mínima para derecho a promedio (parametrizable, no hardcodeada) | Alta |
| Cálculo nota final | Promedio ponderado por UD con pesos configurables | Alta |
| Promedio general | Promedio ponderado por créditos del ciclo | Alta |
| Estado de promoción | Regular/Irregular/Repite según regla del 70% | Alta |
| Alertas tempranas | Motor de alertas (riesgo repitencia, inasistencia, bajo rendimiento) | Alta |
| Boletín de notas | PDF descargable con notas, promedios, estado | Media |
| Actas de evaluación | Reporte consolidado por UD y sección | Media |

### Frontend

| Feature | Descripción | Sprints |
|---------|-------------|---------|
| Registro de notas | Interfaz tipo planilla para docentes (`EvaluationDashboard.jsx`) | 17-18 |
| Consulta de notas | Vista para estudiantes: notas, promedios, estado | 19 |
| Supervisión de actas | `CoordinatorSupervision.jsx` para jefatura de programa | 20 |
| Boletin PDF | Generación y descarga de boletín | post-pulido |
| Dashboard docente | Resumen de UDs a cargo, estado de registro de notas | 21 |

### Criterios de Aceptación

- [x] Docente puede registrar notas correctamente
- [x] Validación de rango de notas (umbrales parametrizables, no hardcoded)
- [x] Nota final calculada automáticamente con pesos configurables
- [x] Promedio general coincide con cálculo manual (precisión 2 decimales)
- [x] Estado de promoción calculado correctamente (tests de la regla del 70%)
- [ ] Alertas de riesgo se disparan según reglas definidas (post-pulido)
- [ ] Boletin PDF generado con datos correctos (post-pulido)
- [ ] Actas de evaluación exportables (post-pulido)

---

## 6. Fase 4: Trámites y Casuísticas (Semanas 25-32)

> **Estado:** ✅ IMPLEMENTADA

### Objetivo
Trámites y casuísticas académicas, certificaciones y procesos administrativos; el catálogo de 11 programas es un hito del **MVP** (ya configurado, [ADR-014]).

### Alcance implementado

| Entregable | Descripción | Estado |
|-----------|-------------|--------|
| Documento maestro | `13-PLAN-CASUISTICAS-ACADEMICAS.md` | ✅ |
| Entidades en mod-gestion-academica | `HistorialAcademico`, `BeneficiosEstudiante`, `RegistroPracticas`, `ResolucionesConvalidacion`, `ConvalidacionesDetalle`, `SolicitudesTramite` | ✅ |
| UI de trámites | `TramitesDashboard.jsx` (Glassmorphism) para Secretaría Académica | ✅ |
| Notas con anulación lógica | Las notas parciales no se borran destructivamente: anulación lógica con registro en `core_audit_logs` | ✅ |
| Rectificación de Nota | Trámite formal con rastro de auditoría (Anexo B de `07-SEGURIDAD`) | ✅ |
| Certificación Modular | Al completar módulo/año + EFSRT, Secretaría Central emite certificación cobrada vía Tesorería | ✅ |
| Convalidación interna | Flujo coherente dentro de `mod-gestion-academica` | ✅ |
| Ingreso de admitidos | Ingesta Excel MINEDU (mod-admision → mod-gestion-academica, capa anticorrupción, ADR-011/013/014) | ✅ |

### Criterios de Aceptación

- [x] Trámites y casuísticas operativos en `mod-gestion-academica`
- [x] 11 programas configurados y operativos (**hito MVP**, [ADR-014])
- [x] Ingesta de admitidos funcionando (sin fallback 99: nombre no reconocido bloquea con alerta)
- [x] `docker-compose up` levanta todo el sistema (todos los servicios sobre `siga_core`)
- [x] Backup/restore probado con datos reales

> Las casuísticas planificadas (convalidaciones avanzadas, traslados, reingresos) y las dependencias para operarlas se detallan en la sección Post-MVP (§7).

---

## 7. Pulido y Post-MVP

### 7.1 Pulido (actual — fase MVP)

> **Estado:** EN PROGRESO / SIGUIENTE ENTREGABLE

Hardening y calidad sobre el MVP v1.1 (los 7 módulos ya implementados).

| Tarea | Descripción | Estado |
|-------|-------------|--------|
| **CI/CD** | GitHub Actions (lint, test, build, deploy). **No existe hoy** (`.github/workflows` ausente); el despliegue es manual vía `docker-compose` (ver §13.2) | Pendiente |
| **Rate limiting** | Implementación a nivel de gateway, configuración por ruta. **Es parte del MVP** (no de una fase posterior) | MVP |
| **Pruebas completas** | Suite de contratos obligatoria (Consumer-Driven Contracts); cobertura >70% | Pendiente |
| **Hardening** | Endurecer seguridad, validaciones y manejo de errores | Pendiente |
| **Observabilidad** | Prometheus + Grafana, métricas de Core y módulos | Post-pulido |
| **Logging centralizado** | ELK Stack o Loki + Grafana, logs estructurados, búsqueda por `request_id` | Post-pulido |
| **Normalizar manifest de mod-admision** | Alinear al canon del manifest (ver `11-ESTANDAR-MODULOS` §3.2.1) | Post-pulido |

### 7.2 Post-MVP (futuro)

> **Estado:** PLANIFICADO (fuera del alcance v1.1)

| Bloque | Contenido |
|--------|-----------|
| **Módulos de expansión** | `mod-reportes`, `mod-docencia`, `mod-requisitos`, `mod-egresados`, `mod-bienestar`, `mod-traslados`, `mod-convalidaciones` (independiente), `mod-reingresos` |
| **BD por módulo** | Separación de bases de datos (hoy todo corre sobre `siga_core` en MVP) |
| **Infraestructura** | Kubernetes (orquestación, auto-scaling), load balancing |
| **Integraciones** | Sistema financiero, biblioteca digital, aula virtual (LMS) |
| **App móvil** | React Native o Flutter: consulta de notas, matrícula, notificaciones |
| **Frontend** | Portal padres, notificaciones push |
| **Gateway para admisión** | Migrar el acceso directo a `:8009` por el Gateway (cancelar excepción [ADR-013]) |

### 7.3 Criterios de Aceptación (futuros)

- [ ] CI/CD con deploys automatizados a producción (Pulido)
- [ ] Suite de contratos ejecutándose en CI (Pulido)
- [ ] Rate limiting configurado y funcional (MVP/implementación actual)
- [ ] Dashboard de monitoreo con métricas de todos los servicios (post-pulido)
- [ ] Logging centralizado con búsqueda por `request_id` (post-pulido)
- [ ] Reportes MINEDU generados en formato SISEDU (post-MVP)
- [ ] Convalidaciones/traslados/reingresos como módulos independientes (post-MVP)
- [ ] 100 usuarios concurrentes sin degradación (target: < 500ms P95) (post-MVP)
- [ ] Disponibilidad 99.9% (máximo 8.7 horas de downtime al año) (post-MVP)
- [ ] App móvil publicada (al menos Android) (post-MVP)
- [ ] K8s con auto-scaling (post-MVP)

---

## 8. Priorización de Módulos

```
MVP v1.1 (los 7 módulos implementados):
  mod-planes-estudio     -> Base para cualquier programa académico
  mod-programas-estudio  -> Base para cualquier programa académico
  mod-gestion-academica  -> Estudiantes + Matrícula + Trámites (proceso central)
  mod-usuarios           -> Usuarios, roles, permisos (RBAC)
  mod-auditoria          -> Trazabilidad y auditoría (core_audit_logs)
  mod-evaluacion         -> Registro de notas, cálculo de promedios
  mod-admision           -> Dominio externo (ADR-011), ingesta de admitidos

POST-MVP (futuro):
  mod-reportes           -> Reportes MINEDU (SISEDU), estadísticas, exportación Excel/PDF
  mod-docencia           -> Cargas lectivas avanzadas, planificaciones
  mod-requisitos         -> Gestión de requisitos documentales
  mod-egresados          -> Seguimiento de egresados
  mod-bienestar          -> Bienestar estudiantil
  mod-traslados          -> Traslados internos/externos (volumen bajo)
  mod-convalidaciones    -> Módulo independiente (hoy dentro de mod-gestion-academica)
  mod-reingresos         -> Reingresos (volumen bajo)

FUTURA (post-MVP):
  Reportes avanzados     -> Dashboard gobierno, BI
  App móvil              -> Canal adicional, no crítico
  Integraciones          -> Dependen de sistemas externos
```

---

## 9. Dependencias entre Módulos

### Grafo de Dependencias (MVP v1.1)

```
mod-planes-estudio
        │
        v
mod-programas-estudio
        │
        v
mod-gestion-academica  ←── mod-usuarios (creación de credenciales)
        │
        v
mod-evaluacion
        │
        ▪
mod-admision (dominio externo, ADR-011) ──ingesta──▶ mod-gestion-academica
        ▪
mod-auditoria (transversal: core_audit_logs)
```

*Post-MVP (futuros):* `mod-convalidaciones` (hoy dentro de gestion-academica), `mod-traslados`, `mod-reingresos`, `mod-reportes`, `mod-docencia`, `mod-requisitos`, `mod-egresados`, `mod-bienestar`.

### Tabla de Dependencias (MVP v1.1)

| Módulo | Depende de | Es dependencia de |
|--------|-----------|-------------------|
| mod-planes-estudio | mod-programas-estudio | mod-gestion-academica, mod-evaluacion |
| mod-programas-estudio | - | mod-planes-estudio, mod-gestion-academica |
| mod-gestion-academica | mod-programas-estudio, mod-planes-estudio | mod-evaluacion, mod-usuarios (ingesta de credenciales) |
| mod-evaluacion | mod-gestion-academica, mod-planes-estudio | - |
| mod-usuarios | - | mod-gestion-academica (ingesta), Core (auth) |
| mod-auditoria | Core (`core_audit_logs`) | transversal |
| mod-admision | es externo (ADR-011) | mod-gestion-academica (ingesta de admitidos) |

---

## 10. Riesgos y Mitigaciones

| ID | Riesgo | Probabilidad | Impacto | Puntaje | Estrategia de Mitigación |
|----|--------|-------------|---------|---------|-------------------------|
| R01 | Complejidad del parser Excel MINEDU (formato inconsistente entre IESTP) | Alta | Alto | **Critico** | Parser modular con test por programa; fallar rápido con mensajes claros; validar contra 3+ programas reales antes de liberar |
| R02 | Resistencia al cambio del personal administrativo | Media | Alto | **Alto** | Capacitación gradual por roles; interfaz intuitiva; identificar "campeones internos" que promuevan el sistema; período de coexistencia con procesos actuales |
| R03 | Cambios en normativa MINEDU durante el desarrollo | Media | Medio | **Medio** | Reglas de negocio parametrizables (no hardcodear valores como 13, 70%, etc.); configuración institucional en BD; documentar supuestos normativos |
| R04 | Sobrecarga del sistema en período pico de matrícula | Alta | Medio | **Alto** | Arquitectura escalable horizontalmente; caché Redis para consultas frecuentes; load testing antes del período pico; rate limiting |
| R05 | Pérdida de datos por fallo de infraestructura | Baja | Critico | **Critico** | Backups automáticos diarios con retención de 30 días; replicación de BD; point-in-time recovery; pruebas de restauración mensuales |
| R06 | Dependencia del equipo original de desarrollo | Media | Alto | **Alto** | Documentación completa; código modular y autodocumentado; pruebas automatizadas; CI/CD; conocimiento distribuido entre 2+ desarrolladores |
| R07 | Falla de seguridad (JWT compromise, SQL injection) | Baja | Critico | **Critico** | Defense in depth; JWT con expiración corta; ORM para prevenir SQL injection; auditoría de acciones sensibles; pen testing antes de producción |
| R08 | Retraso en cronograma por subestimación de complejidad | Media | Medio | **Medio** | Metodología ágil con sprints de 2 semanas; MVP temprano (Fases 1-4 ya cumplidas); priorización estricta por valor de negocio; buffer de 20% en estimaciones |
| R09 | Incompatibilidad con versiones de PostgreSQL/Redis/NATS | Baja | Medio | **Bajo** | Versionado de dependencias en requirements.txt y Docker; pruebas en CI con versiones específicas; migration guide documentado |

---

## 11. Hitos Clave

| Hito | ID | Estado | Entregable Principal | Dependencias |
|------|-----|--------|----------------------|--------------|
| Documentación completa | H-01 | ✅ | docs/ completo (arquitectura, negocio, seguridad, estándar, roadmap) | - |
| Core funcional | H-02 | ✅ | Core con auth, registro de módulos, proxy básico | H-01 |
| Fase 1 - Núcleo | H-03 | ✅ | Core + planes-estudio + programas-estudio + frontend login/dashboard | H-02 |
| Fase 2 - Núcleo Académico | H-04 | ✅ | mod-gestion-academica (estudiantes+matrícula+trámites), mod-usuarios, mod-auditoria | H-03 |
| Fase 3 - Evaluación | H-05 | ✅ | mod-evaluacion (notas, promedios, regla del 70%) | H-04 |
| Fase 4 - Trámites | H-06 | ✅ | Trámites/casuísticas en gestion-academica, `TramitesDashboard.jsx` | H-05 |
| Catálogo 11 programas | H-07 | ✅ | Catálogo oficial de 11 programas (programa_id 1..11, ADR-014) + MVP v1.1 con 7 módulos | H-06 |
| Pulido | H-08 | ⏳ | CI/CD, hardening, pruebas completas, rate limiting activo; observabilidad post-pulido | H-07 |
| Post-MVP | H-09 | 📅 | Módulos de expansión, K8s, monitoreo, app móvil, BD por módulo | H-08 |

### Hito H-01: Documentación Completa ✅
**Criterios:**
- [x] 07-SEGURIDAD.md: principios, JWT, RBAC, middleware, auditoría, checklist
- [x] 09-PLAN-NEGOCIO.md: problema, solución, mercado, competencia, ROI, fases, equipo, KPIs
- [x] 10-LOGICA-NEGOCIO.md: jerarquía académica, evaluación, promoción, matrícula, alertas
- [x] 11-ESTANDAR-MODULOS.md: estructura, manifest, endpoints, BD, eventos, plantilla
- [x] 12-ROADMAP.md: fases, hitos, dependencias, riesgos

### Hito H-02: Core Funcional ✅
**Criterios:**
- [x] Login/register/JWT funcionando
- [x] Roles y permisos configurados en BD
- [x] SecurityMiddleware validando tokens
- [x] HTTP Gateway con proxy a módulos (rutas `/api/v1/{module}/...`)
- [x] Module Registry con persistencia
- [x] Al menos 1 módulo registrado y accesible via proxy

### Hito H-03: Fase 1 - Núcleo ✅
**Criterios:**
- [x] Planes de estudio CRUD completo
- [x] Programas de estudio CRUD completo
- [x] Parser Excel MINEDU funcional
- [x] Frontend: login, dashboard, listado de planes
- [x] 1 programa piloto configurado de principio a fin

### Hito H-04: Fase 2 - Núcleo Académico ✅
**Criterios:**
- [x] 100+ estudiantes registrados (importación Excel)
- [x] Proceso de matrícula Ciclo I automático
- [x] Proceso de matrícula Ciclos II-VI asistido
- [x] Validación de prerrequisitos funcionando
- [x] Regla del 70% implementada y probada
- [x] Frontend de matrícula usable (`StudentMaster.jsx`, `EnrollmentProcess.jsx`)
- [x] mod-usuarios (usuarios, roles, permisos) y mod-auditoria operativos

### Hito H-05: Fase 3 - Evaluación ✅
**Criterios:**
- [x] Docentes registran notas sin errores
- [x] Cálculo de promedios verificado vs. cálculo manual
- [x] Regla del 70% y estados de promoción calculados
- [ ] Alertas tempranas generándose correctamente (post-pulido)
- [ ] Boletines de notas descargables (post-pulido)
- [ ] Actas de evaluación generadas (post-pulido)

### Hito H-06: Fase 4 - Trámites y Casuísticas ✅
**Criterios:**
- [x] Entidades de trámites/casuísticas en `mod-gestion-academica` (HistorialAcademico, Beneficios, Convalidaciones)
- [x] `TramitesDashboard.jsx` operativo
- [x] Anulación lógica de notas con registro de auditoría
- [x] Certificación Modular con EFSRT y Rectificación de Nota como trámites formales

### Hito H-07: Catálogo 11 Programas + MVP v1.1 ✅
**Criterios:**
- [x] Catálogo oficial de 11 programas (`programa_id` 1..11, [ADR-014])
- [x] Ingesta de admitidos sin fallback 99 (bloqueo con alerta)
- [x] 7 módulos MVP implementados y desplegados vía `docker-compose` sobre `siga_core`
- [x] Rate limiting implementado (alcance MVP)

### Hito H-08: Pulido ⏳
**Criterios:**
- [ ] CI/CD (GitHub Actions) — no existe hoy (`.github/workflows` ausente); deploy manual vía compose (ver §13.2)
- [ ] Suite de contratos (Consumer-Driven Contracts) en CI
- [ ] Cobertura de pruebas >70%
- [ ] Hardening de seguridad y validaciones
- [ ] Normalización del manifest de `mod-admision` al canon (post-pulido)
- [ ] Prometheus + Grafana, logging centralizado (post-pulido)

### Hito H-09: Post-MVP 📅
**Criterios:**
- [ ] Módulos de expansión: reportes, docencia, requisitos, egresados, bienestar, traslados, convalidaciones independientes, reingresos
- [ ] Separación de BD por módulo
- [ ] K8s con auto-scaling
- [ ] 100 usuarios concurrentes sin degradación
- [ ] App móvil publicada (Android)
- [ ] 99.9% uptime en el último mes
- [ ] Migrar acceso directo a `:8009` por el Gateway

---

## 12. Métricas de Progreso

Estado real al 2026-08-29 (MVP v1.1): los **7 módulos MVP** están implementados; los módulos de expansión son **post-MVP**.

| Métrica | MVP v1.1 (actual) | Post-MVP (target) |
|---------|-------------------|-------------------|
| Módulos de negocio MVP | **7/7** implementados | 7 + 8 post-MVP = 15 |
| Módulos post-MVP | 0 | 8 (reportes, docencia, requisitos, egresados, bienestar, traslados, convalidaciones, reingresos) |
| Programas configurados | 11/11 | 11 |
| Fases de implementación (1-4) | 4/4 cumplidas | - |
| Cobertura de pruebas | smoke + E2E matrícula-admisión | >70% (Pulido) |
| Tiempo respuesta (P95) | <500ms | <500ms |
| Disponibilidad | - | 99.9% (post-MVP) |
| Usuarios concurrentes | - | 100 (post-MVP) |
| Bugs críticos abiertos | <3 | 0 |

---

## 13. Proceso de Desarrollo

### 13.1 Ceremonias

| Ceremonia | Frecuencia | Duración | Participantes |
|-----------|-----------|----------|--------------|
| Sprint Planning | Cada 2 semanas | 2h | PO + Equipo |
| Daily Standup | Diaria | 15min | Equipo |
| Sprint Review | Cada 2 semanas | 1h | PO + Equipo + Stakeholders |
| Sprint Retrospective | Cada 2 semanas | 1h | Equipo |
| Refinamiento de backlog | Semanal | 1h | PO + Arquitecto |

### 13.2 Flujo de Trabajo

```
1. Backlog Refinement
   ├── PO prioriza historias de usuario
   └── Arquitecto valida viabilidad técnica

2. Sprint Planning
   ├── Equipo selecciona historias del backlog
   └── Desglose en tareas técnicas (2-8h cada una)

3. Desarrollo
   ├── Branch feature/NOMBRE desde develop
   ├── Commits atómicos con mensajes descriptivos
   ├── Tests unitarios para cada cambio
   └── PR a develop con revisión de código

4. Code Review
   ├── Mínimo 1 approval requerido
   ├── Verificar estándar de módulos
   └── Verificar tests pasan

5. QA
   ├── Pruebas en entorno staging
   ├── Pruebas de regresión automatizadas
   └── Aprobación del PO

6. Deploy
   ├── Merge a main
   ├── Smoke tests en staging
   └── Deploy a producción
```

> **Deploy actual (MVP v1.1):** procedimiento **manual** — `docker-compose up --build` levanta Core y módulos (todos sobre `siga_core`); los cambios se aplican reconstruyendo el o los servicios afectados y reiniciando. **No existe CI/CD hoy** (`.github/workflows` ausente). El **post-pulido** automatizará la cadena: build + test + deploy a staging y producción (tag versionado) vía CI/CD.

> **Deploy post-pulido (a automatizar):**
> ```
> push a main → CI/CD build + test + deploy a staging → smoke tests → deploy a producción (tag versionado)
> ```

### 13.3 Definition of Done

Una historia de usuario se considera "Done" cuando:

- [ ] Código implementado y funcional
- [ ] Tests unitarios escritos y pasando (>80% cobertura)
- [ ] Pruebas de integración pasando
- [ ] Code review aprobado
- [ ] Documentación actualizada (README si aplica)
- [ ] Sin vulnerabilidades de seguridad conocidas
- [ ] Desplegado en staging y verificado
- [ ] Criterios de aceptación cumplidos
- [ ] PO aprueba funcionalmente

---

## 14. Historial de Cambios

| Fecha | Versión | Autor | Cambios |
|-------|---------|-------|---------|
| 2026-06-26 | 1.0 | Arquitecto SIGA | Versión inicial del roadmap de desarrollo (6 fases / 36 semanas) |
| 2026-08-29 | 1.1 | Mesa de trabajo (planificación) | Realineación al estado real (MEMORIA_CONTEXTO §4.2): fases 1-4 de implementación marcadas COMPLETADAS; se elimina la colisión con la "Fase 4" real (Trámites); se renombran las etapas futuras a **Pulido** (CI/CD, hardening, pruebas completas; rate limiting ya en MVP) y **Post-MVP** (módulos de expansión, K8s, app móvil, BD por módulo). Mapa de dependencias y priorización actualizados a los 7 módulos MVP. El catálogo de 11 programas pasa a hito del MVP (ADR-014). Deploy descrito como manual (compose) hasta post-pulido. |

---
