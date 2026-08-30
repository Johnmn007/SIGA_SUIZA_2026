# SIGA - Sistema Integrado de Gestión Académica

## Índice Maestro de Documentación

---

### Nivel Macro (Visión Global)

| Documento | Descripción |
|-----------|-------------|
| [01-VISION-ARQUITECTONICA.md](01-VISION-ARQUITECTONICA.md) | Visión general del sistema, principios arquitectónicos, stack tecnológico, ADR y decisiones del MVP (v1.1) |

### Nivel Core (Infraestructura Central)

| Documento | Descripción |
|-----------|-------------|
| [02-CORE.md](02-CORE.md) | Arquitectura detallada del Core: configuración, base de datos, event bus, caché |
| [03-SOCKET-MODULE-RUNTIME.md](03-SOCKET-MODULE-RUNTIME.md) | Socket de anclaje para microservicios: ciclo de vida, registro, descubrimiento |
| [04-RESILIENCIA.md](04-RESILIENCIA.md) | Sistema de resiliencia: circuit breaker, health monitor, fallback, caché distribuida |
| [05-MODELO-DATOS.md](05-MODELO-DATOS.md) | Modelo de datos global: Core, módulos, relaciones, migraciones |
| [06-COMUNICACION.md](06-COMUNICACION.md) | Patrones de comunicación: Frontend-Core, Core-Módulos, Módulo-Módulo, eventos |
| [07-SEGURIDAD.md](07-SEGURIDAD.md) | Arquitectura de seguridad: autenticación, autorización, tokens, auditoría (incluye Anexo A: Matriz de Roles IESTP y Anexo B: Macro-Procesos) |

### Nivel Módulos (Microservicios)

| Documento | Descripción |
|-----------|-------------|
| [11-ESTANDAR-MODULOS.md](11-ESTANDAR-MODULOS.md) | Estándar de desarrollo de módulos: manifiesto, estructura, contratos, validación |

### Nivel Frontend

| Documento | Descripción |
|-----------|-------------|
| [08-FRONTEND.md](08-FRONTEND.md) | Arquitectura del frontend: componentes, estado, módulos, API client |

### Nivel Negocio

| Documento | Descripción |
|-----------|-------------|
| [09-PLAN-NEGOCIO.md](09-PLAN-NEGOCIO.md) | Plan de negocio: problema, solución, mercado, ROI, cronograma |
| [10-LOGICA-NEGOCIO.md](10-LOGICA-NEGOCIO.md) | Lógica de negocio académica: reglas, procesos, flujos, indicadores |

### Nivel Ejecución y Plan

| Documento | Descripción |
|-----------|-------------|
| [12-ROADMAP.md](12-ROADMAP.md) | Roadmap de desarrollo: fases, hitos, entregables, priorización |
| [13-PLAN-CASUISTICAS-ACADEMICAS.md](13-PLAN-CASUISTICAS-ACADEMICAS.md) | Plan de casuísticas académicas: trámites, convalidaciones, beneficios y procesos administrativos |
| [14-PLAN-MATRICULAS-CASUISTICAS.md](14-PLAN-MATRICULAS-CASUISTICAS.md) | Plan de matrículas y casuísticas: fases, extemporánea, bloqueos y nóminas |
| [15-PROCESOS-NEGOCIO.md](15-PROCESOS-NEGOCIO.md) | Procesos de negocio y flujos operativos (especificación viva): parser de planes, ingesta de admitidos, periodos y matrícula por tipo de estudiante |

### Anexos y Documentos de Soporte

| Documento | Descripción |
|-----------|-------------|
| [90-CREDENCIALES-PRUEBA.md](90-CREDENCIALES-PRUEBA.md) | Apéndice: credenciales de cuentas de uso exclusivo para desarrollo local |
| [MEMORIA_CONTEXTO.md](MEMORIA_CONTEXTO.md) | Memoria del contexto del proyecto: decisiones, lecciones e historial de trabajo |
| [mock_admision.json](mock_admision.json) | Mock de datos de admisión para pruebas e ingesta (formato MINEDU) |

---

### Convenciones del Proyecto

- **Prefijo de archivos:** `XX-` para orden canónico:
  - `00` índice | `01-08` arquitectura | `09-10` negocio | `11` estándares de módulos | `12` roadmap | `13-15` procesos de negocio y casuísticas | `90+` anexos
- **Formato:** Markdown (.md) con extensión GitHub Flavored Markdown
- **Diagramas:** Diagramas en texto (ASCII art) para compatibilidad, complementados con Mermaid donde sea necesario
- **Código:** Bloques con lenguaje especificado para syntax highlighting
- **Actualización:** Cada documento tiene sección de historial de cambios al final
- **Consolidación DOC-00 (2026-08-29):** `05-SEGURIDAD-ROLES.md` y `13-ARQUITECTURA_ROLES.md` fueron absorbidos por `07-SEGURIDAD.md` (Anexos A y B); `06-CREDENCIALES-PRUEBA.md` pasó a `90-CREDENCIALES-PRUEBA.md`. Numeración sin colisiones.