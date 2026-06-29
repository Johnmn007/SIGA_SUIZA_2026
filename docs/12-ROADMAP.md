# Roadmap de Desarrollo

> **Versión:** 1.0 | **Última actualización:** Junio 2026 | **Estado:** Activo

---

## 1. Visión General

El roadmap de SIGA está organizado en 6 fases que abarcan 36 semanas de desarrollo. Cada fase tiene objetivos claros, entregables definidos, y criterios de aceptación medibles. El enfoque es **iterativo e incremental**: cada fase produce software funcional que puede ser desplegado y utilizado.

### Timeline Resumido

```
Fase 0: Preparación     │ Sem 1-2  │ Documentación y setup
Fase 1: Core + Socket   │ Sem 3-6  │ Core, gateway, 2 módulos
Fase 2: Estudiantes+Mat │ Sem 7-12 │ Gestión de estudiantes y matrícula
Fase 3: Evaluación      │ Sem 13-18│ Notas, promedios, alertas
Fase 4: Expansión       │ Sem 19-24│ 11 programas, módulos avanzados
Fase 5: Madurez         │ Sem 25-36│ Escalabilidad, integraciones, app móvil
```

---

## 2. Fase 0: Preparación (Semana 1-2)

> **Estado:** ✅ COMPLETADO (documentación) / 🔄 EN PROGRESO (setup técnico)

### Objetivo
Tener toda la documentación, arquitectura y entorno de desarrollo listos antes de comenzar la implementación.

### Entregables

| ID | Entregable | Estado | Prioridad |
|----|-----------|--------|-----------|
| DOC-01 | Documentación de arquitectura (docs/) | ✅ Completo | Crítica |
| DOC-02 | Plan de negocio | ✅ Completo | Alta |
| DOC-03 | Lógica de negocio documentada | ✅ Completo | Crítica |
| DOC-04 | Estándar de módulos definido (MODULE-STD-2.0) | ✅ Completo | Crítica |
| DOC-05 | Roadmap de desarrollo | ✅ Completo | Alta |
| DEV-01 | Corrección de fallas críticas del Core (Fallos #1-#6) | 🔄 Pendiente | Crítica |
| DEV-02 | Setup de entorno de desarrollo | 🔄 Pendiente | Alta |
| DEV-03 | Repositorio Git con estructura inicial | 🔄 Pendiente | Alta |

### Criterios de Aceptación

- [ ] Todos los documentos de arquitectura están en `docs/`
- [ ] El estándar de módulos está definido y revisado
- [ ] PostgreSQL 16+ instalado y corriendo
- [ ] Python 3.12+ instalado con venv
- [ ] Node.js 20+ instalado
- [ ] Redis 7+ instalado
- [ ] NATS server instalado
- [ ] Repositorio con estructura de directorios creada
- [ ] Fallos críticos del Core identificados y planificados

---

## 3. Fase 1: Core + Socket + Módulos Base (Semana 3-6)

> **Estado:** 🔄 PLANIFICADO

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

## 4. Fase 2: Estudiantes + Matrícula (Semana 7-12)

> **Estado:** 🔄 PLANIFICADO

### Objetivo
Gestión completa de estudiantes y proceso de matrícula automatizado.

### Módulos

*Nota de Arquitectura: Dada la extrema cohesión entre estudiantes y matrícula, se recomienda implementar estos dos módulos dentro de un mismo "Boundary Context" inicialmente (o usar un enfoque monorepo para la base de código `siga-core-lib`) para evitar fricción de Sagas tempranas.*

#### mod-estudiantes (Semanas 7-8)

| Feature | Descripción | Prioridad |
|---------|-------------|-----------|
| CRUD estudiantes | Registro, modificación, eliminación, consulta | Alta |
| Búsqueda avanzada | Por DNI, nombres, código de estudiante, programa | Alta |
| Historial académico | UDs cursadas, notas, estados, promedios históricos | Alta |
| Importación Excel | Carga masiva desde archivo Excel con validaciones | Media |
| Gestión de documentos | Subida de documentos (DNI, partida, certificados) | Media |
| Foto de perfil | Almacenamiento y visualización | Baja |

#### mod-matricula (Semanas 9-11)

| Feature | Descripción | Prioridad |
|---------|-------------|-----------|
| Períodos de matrícula | Apertura, cierre, fechas por programa | Alta |
| Matrícula Ciclo I | Automática, asignación completa del primer ciclo | Alta |
| Matrícula Ciclos II-VI | Asistida, selección de UDs con validación | Alta |
| Validación de prerrequisitos | Verificación de UDs aprobadas antes de cursar | Alta |
| Control de créditos | Validación 12-24 créditos | Alta |
| Regla del 70% | Cálculo de estado regular/irregular/repite | Alta |
| Carga sugerida | Algoritmo de recomendación de UDs por ciclo | Alta |
| Retiro de curso | Proceso de retiro con validaciones | Media |
| Matrícula extemporánea | Fuera de período con aprobación especial | Media |

### Frontend

| Feature | Descripción | Sprints |
|---------|-------------|---------|
| Módulo estudiantes | Formulario de registro, tabla con búsqueda, detalle | 7-8 |
| Módulo matrícula | Wizard de matrícula, selección de UDs, validaciones en tiempo real | 9-11 |
| Dashboard | Estadísticas de estudiantes, matrículas por programa | 11-12 |

### Criterios de Aceptación

- [ ] Registro de estudiante con todos los datos (DNI, nombres, dirección, etc.)
- [ ] Búsqueda por DNI/nombres en < 2s
- [ ] Importación de 100+ estudiantes desde Excel en < 30s
- [ ] Matrícula automática para ciclo I: asigna todas las UDs del primer ciclo
- [ ] Matrícula asistida: selección de UDs con validación en tiempo real
- [ ] Validación correcta de prerrequisitos (obligatorios y recomendados)
- [ ] Control de créditos: rechaza < 12 o > 24 créditos
- [ ] Cálculo correcto de estado de promoción (regular/irregular/repite)
- [ ] Carga sugerida prioriza UDs desaprobadas para irregulares
- [ ] Alertas de riesgo básicas (bajo rendimiento, inasistencia)
- [ ] Frontend: wizard de matrícula completo y funcional

---

## 5. Fase 3: Evaluación (Semana 13-18)

> **Estado:** 🔄 PLANIFICADO

### Objetivo
Registro de notas, cálculo de promedios, alertas tempranas, boletines.

### Módulos

#### mod-evaluacion (Semanas 13-17)

| Feature | Descripción | Prioridad |
|---------|-------------|-----------|
| Periodos de evaluación | Apertura/cierre por ciclo, configuración de tipos y pesos | Alta |
| Registro de notas | Docente ingresa notas parciales (PC, EP, TF, EF) | Alta |
| Validación de notas | Rango 0-20, nota mínima en EF para derecho a promedio | Alta |
| Cálculo nota final | Promedio ponderado por UD con pesos configurables | Alta |
| Promedio general | Promedio ponderado por créditos del ciclo | Alta |
| Estado de promoción | Regular/Irregular/Repite según regla del 70% | Alta |
| Alertas tempranas | Motor de alertas (riesgo repitencia, inasistencia, bajo rendimiento) | Alta |
| Boletín de notas | PDF descargable con notas, promedios, estado | Media |
| Actas de evaluación | Reporte consolidado por UD y sección | Media |

### Frontend

| Feature | Descripción | Sprints |
|---------|-------------|---------|
| Registro de notas | Interfaz tipo planilla para docentes, ingreso por UD y estudiante | 13-14 |
| Consulta de notas | Vista para estudiantes: notas, promedios, estado | 15 |
| Boletin PDF | Generación y descarga de boletín | 16 |
| Dashboard docente | Resumen de UDs a cargo, estado de registro de notas | 17 |

### Criterios de Aceptación

- [ ] Docente puede registrar notas parciales y finales correctamente
- [ ] Validación: notas 0-20, EF < 6 -> nota final 0
- [ ] Nota final calculada automáticamente con pesos configurables
- [ ] Promedio general coincide con cálculo manual (precisión 2 decimales)
- [ ] Estado de promoción calculado correctamente (tests de la regla del 70%)
- [ ] Alertas de riesgo se disparan según reglas definidas
- [ ] Boletin PDF generado con datos correctos
- [ ] Actas de evaluación exportables

---

## 6. Fase 4: Expansión (Semana 19-24)

> **Estado:** 🔄 PLANIFICADO

### Objetivo
11 programas configurados, módulos avanzados, reportes MINEDU.

### Módulos

| Módulo | Funcionalidad | Sprints |
|--------|--------------|---------|
| **mod-convalidaciones** | Convalidación de UDs entre planes, entre programas, convalidación externa | 19-20 |
| **mod-traslados** | Traslado interno (cambio de programa), traslado externo (desde/hacia otro IESTP) | 20-21 |
| **mod-reingresos** | Reingreso después de abandono, evaluación de UDs previas | 21 |
| **mod-reportes** | Reportes MINEDU (SISEDU), estadísticas institucionales, exportación Excel/PDF | 22-24 |

### Infraestructura

| Tarea | Descripción | Sprints |
|-------|-------------|---------|
| Dockerización | Dockerfiles para Core y todos los módulos, docker-compose para desarrollo | 19-20 |
| CI/CD | GitHub Actions: lint, test, build, deploy | 20-21 |
| Scripts backup/restore | Backup diario de BD, restore point-in-time | 21 |
| Scripts deploy | Deploy automatizado a staging/producción | 22 |

### Criterios de Aceptación

- [ ] 11 programas configurados y operativos en el sistema
- [ ] Convalidaciones entre planes del mismo programa funcionando
- [ ] Convalidaciones entre programas diferentes funcionando
- [ ] Traslado interno: cambio de programa con convalidación automática
- [ ] Traslado externo: registro de UDs cursadas en otro IESTP
- [ ] Reingreso: reactivación de estudiante con historial preservado
- [ ] Reportes MINEDU generados en formato SISEDU
- [ ] Docker: `docker-compose up` levanta todo el sistema
- [ ] CI/CD: push a main deploya a staging automáticamente
- [ ] Backup/restore probado con datos reales

---

## 7. Fase 5: Madurez (Semana 25-36)

> **Estado:** 🔄 PLANIFICADO

### Objetivo
Escalabilidad, integraciones, app móvil, monitoreo, producción madura.

### Infraestructura

| Tarea | Descripción | Sprints |
|-------|-------------|---------|
| Kubernetes | Manifiestos para orquestación de contenedores, auto-scaling | 25-27 |
| Monitoreo | Prometheus + Grafana, métricas de Core y módulos | 27-28 |
| Logging centralizado | ELK Stack o Loki + Grafana, logs estructurados | 28-29 |
| Rate limiting | Implementación a nivel de gateway, configuración por ruta | 29 |
| Load balancing | Distribución de carga entre instancias de módulos | 30 |

### Integraciones

| Integración | Descripción | Sprints |
|------------|-------------|---------|
| Sistema financiero | API para consulta de pagos, deudas, estado financiero | 30-31 |
| Biblioteca digital | API para consulta de materiales, préstamos | 31-32 |
| Aula virtual (LMS) | API para sincronización de cursos, notas, estudiantes | 32-33 |
| App móvil | React Native o Flutter: consulta de notas, matrícula, notificaciones | 33-36 |

### Frontend

| Feature | Descripción | Sprints |
|---------|-------------|---------|
| Portal padres | Consulta de notas y asistencia de hijos | 30-31 |
| App móvil estudiantes | Notas, horarios, notificaciones push, matrícula | 33-36 |
| Notificaciones push | Alertas, recordatorios, comunicados | 34 |

### Criterios de Aceptación

- [ ] 100 usuarios concurrentes sin degradación (target: < 500ms P95)
- [ ] Tiempo de respuesta < 2s en todos los endpoints (P99)
- [ ] Disponibilidad 99.9% (máximo 8.7 horas de downtime al año)
- [ ] Dashboard de monitoreo con métricas de todos los servicios
- [ ] Logging centralizado con búsqueda por request_id
- [ ] Rate limiting configurado y funcional
- [ ] App móvil publicada (al menos Android)
- [ ] CI/CD con deploys automatizados a producción

---

## 8. Priorización de Módulos

```
CRITICA (Fase 1):
  mod-planes-estudio    -> Base para cualquier programa académico
  mod-programas-estudio -> Base para cualquier programa académico

ALTA (Fase 2):
  mod-estudiantes       -> Maestro de estudiantes, requisito para matrícula
  mod-matricula         -> Proceso central del instituto

MEDIA (Fase 3):
  mod-evaluacion        -> Registro de notas, cálculo de promedios

BAJA (Fase 4):
  mod-convalidaciones   -> Necesario solo cuando hay cambios de plan
  mod-traslados         -> Volumen bajo de solicitudes
  mod-reingresos        -> Volumen bajo de solicitudes
  mod-reportes          -> Importante pero no bloqueante

FUTURA (Fase 5):
  mod-reportes avanzados-> Dashboard gobierno, BI
  App movil             -> Canal adicional, no crítico
  Integraciones         -> Dependen de sistemas externos
```

---

## 9. Dependencias entre Módulos

### Grafo de Dependencias

```
mod-planes-estudio
        │
        v
mod-programas-estudio
        │
        v
mod-estudiantes
        │
        v
mod-matricula
        │
        v
mod-evaluacion
        │
        ├────────────────┐
        v                 v
mod-convalidaciones   mod-reportes
        │
        v
mod-traslados
        │
        v
mod-reingresos
```

### Tabla de Dependencias

| Módulo | Depende de | Es dependencia de |
|--------|-----------|-------------------|
| mod-planes-estudio | mod-programas-estudio | mod-evaluacion, mod-matricula, mod-convalidaciones |
| mod-programas-estudio | - | mod-planes-estudio, mod-estudiantes |
| mod-estudiantes | mod-programas-estudio | mod-matricula, mod-evaluacion |
| mod-matricula | mod-estudiantes, mod-planes-estudio | mod-evaluacion |
| mod-evaluacion | mod-matricula, mod-planes-estudio | mod-reportes, mod-convalidaciones |
| mod-convalidaciones | mod-evaluacion, mod-planes-estudio | mod-traslados |
| mod-traslados | mod-convalidaciones | mod-reingresos |
| mod-reingresos | mod-traslados | - |
| mod-reportes | mod-evaluacion, mod-estudiantes, mod-matricula | - |

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
| R08 | Retraso en cronograma por subestimación de complejidad | Media | Medio | **Medio** | Metodología ágil con sprints de 2 semanas; MVP temprano (Fase 1-2); priorización estricta por valor de negocio; buffer de 20% en estimaciones |
| R09 | Incompatibilidad con versiones de PostgreSQL/Redis/NATS | Baja | Medio | **Bajo** | Versionado de dependencias en requirements.txt y Docker; pruebas en CI con versiones específicas; migration guide documentado |

---

## 11. Hitos Clave

| Hito | ID | Fecha Estimada | Semana | Entregable Principal | Dependencias |
|------|-----|-------------|--------|---------------------|--------------|
| Documentación completa | H-01 | Semana 2 | 2 | docs/ completo (arquitectura, negocio, seguridad, estándar, roadmap) | - |
| Core funcional | H-02 | Semana 4 | 4 | Core con auth, registro de módulos, proxy básico | H-01 |
| MVP operativo | H-03 | Semana 6 | 6 | Core + 2 módulos base (planes, programas) + frontend login/dashboard | H-02 |
| Matrícula funcional | H-04 | Semana 12 | 12 | Estudiantes + matrícula operativo con 1 programa piloto | H-03 |
| Evaluación completa | H-05 | Semana 18 | 18 | Evaluación funcional (notas, promedios, alertas, boletines) | H-04 |
| 11 programas | H-06 | Semana 24 | 24 | Todos los módulos operativos, 11 programas configurados | H-05 |
| Producción madura | H-07 | Semana 36 | 36 | K8s, monitoreo, app móvil, 100 usuarios concurrentes | H-06 |

### Hito H-01: Documentación Completa
**Criterios:**
- [ ] 07-SEGURIDAD.md: principios, JWT, RBAC, middleware, auditoría, checklist
- [ ] 09-PLAN-NEGOCIO.md: problema, solución, mercado, competencia, ROI, fases, equipo, KPIs
- [ ] 10-LOGICA-NEGOCIO.md: jerarquía académica, evaluación, promoción, matrícula, alertas
- [ ] 11-ESTANDAR-MODULOS.md: estructura, manifest, endpoints, BD, eventos, plantilla
- [ ] 12-ROADMAP.md: fases, hitos, dependencias, riesgos

### Hito H-02: Core Funcional
**Criterios:**
- [ ] Login/register/JWT funcionando
- [ ] Roles y permisos configurados en BD
- [ ] SecurityMiddleware validando tokens
- [ ] HTTP Gateway con proxy a módulos
- [ ] Module Registry con persistencia
- [ ] Al menos 1 módulo registrado y accesible via proxy

### Hito H-03: MVP Operativo
**Criterios:**
- [ ] Planes de estudio CRUD completo
- [ ] Programas de estudio CRUD completo
- [ ] Parser Excel MINEDU funcional
- [ ] Frontend: login, dashboard, listado de planes
- [ ] 1 programa piloto configurado de principio a fin

### Hito H-04: Matrícula Funcional
**Criterios:**
- [ ] 100+ estudiantes registrados (importación Excel)
- [ ] Proceso de matrícula Ciclo I automático
- [ ] Proceso de matrícula Ciclos II-VI asistido
- [ ] Validación de prerrequisitos funcionando
- [ ] Regla del 70% implementada y probada
- [ ] Frontend de matrícula usable

### Hito H-05: Evaluación Completa
**Criterios:**
- [ ] Docentes registran notas sin errores
- [ ] Cálculo de promedios verificado vs. cálculo manual
- [ ] Alertas tempranas generándose correctamente
- [ ] Boletines de notas descargables
- [ ] Actas de evaluación generadas

### Hito H-06: 11 Programas
**Criterios:**
- [ ] Todos los planes de estudio cargados
- [ ] Convalidaciones entre planes funcionando
- [ ] Traslados y reingresos operativos
- [ ] Reportes MINEDU generados correctamente
- [ ] Dockerización completa

### Hito H-07: Producción Madura
**Criterios:**
- [ ] K8s con auto-scaling
- [ ] Prometheus + Grafana dashboard
- [ ] Logging centralizado operativo
- [ ] 100 usuarios concurrentes sin degradación
- [ ] App móvil publicada (Android)
- [ ] 99.9% uptime en el último mes

---

## 12. Métricas de Progreso

| Métrica | Fase 1 | Fase 2 | Fase 3 | Fase 4 | Fase 5 | Target Final |
|---------|--------|--------|--------|--------|--------|--------------|
| Módulos Core completos | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 | 10 |
| Módulos de negocio | 2 | 4 | 5 | 9 | 9 | 9 |
| Programas configurados | 1 | 3 | 6 | 11 | 11 | 11 |
| Cobertura de pruebas | 30% | 40% | 50% | 60% | 70% | >70% |
| Tiempo respuesta (P95) | <1000ms | <800ms | <600ms | <500ms | <300ms | <500ms |
| Disponibilidad | 95% | 97% | 98% | 99% | 99.5% | 99.5% |
| Usuarios concurrentes | 5 | 20 | 50 | 80 | 100 | 100 |
| Bugs críticos abiertos | <5 | <3 | <2 | <1 | 0 | 0 |

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
   ├── CI/CD build + test + deploy a staging
   ├── Smoke tests en staging
   └── Deploy a producción (tag versionado)
```

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
| 2026-06-26 | 1.0 | Arquitecto SIGA | Versión inicial del roadmap de desarrollo |

---
