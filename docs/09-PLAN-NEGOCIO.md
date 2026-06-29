# Plan de Negocio - SIGA

> **Versión:** 1.0 | **Última actualización:** Junio 2026 | **Estado:** Borrador

---

## 1. Resumen Ejecutivo

**SIGA** (Sistema Integrado de Gestión Académica) es una solución de software modular, de código abierto, diseñada específicamente para Institutos de Educación Superior Tecnológica Públicos (IESTP) en Perú. El sistema automatiza la totalidad de los procesos académicos —desde la gestión de planes de estudio hasta la emisión de reportes para el MINEDU— mediante una arquitectura moderna de microservicios basada en FastAPI, PostgreSQL, Redis y NATS sobre un frontend React.

SIGA reemplaza procesos manuales basados en Excel, documentos físicos y sistemas legacy con una plataforma integrada, API-first, que elimina la duplicación de datos, reduce errores de cálculo y proporciona trazabilidad completa. Su arquitectura modular permite una adopción progresiva: la institución comienza con los módulos esenciales (planes, programas) y agrega funcionalidad según su madurez digital.

**Mercado objetivo primario:** ~100 IESTP públicos en Perú, cada uno con 500–3000 estudiantes y 5–20 programas de estudio.

**Modelo de negocio:** Código abierto sin costo de licencia. Ingresos por implementación, capacitación, soporte anual y hosting administrado. ROI estimado: reducción de 920 horas administrativas por año por institución.

---

## 2. Problema

### 2.1 Problemas Actuales en IESTP Públicos

| # | Problema | Descripción Detallada | Impacto |
|---|----------|----------------------|---------|
| 1 | **Gestión manual** | Uso predominante de Excel, documentos físicos, procesos manuales para matrícula, registro de notas, generación de reportes | Error humano, pérdida de datos, lentitud |
| 2 | **Datos dispersos** | Información duplicada en múltiples archivos, hojas de cálculo, sistemas aislados; datos inconsistentes entre secretaría, dirección académica y docentes | Imposibilidad de consolidar información confiable |
| 3 | **Procesos ineficientes** | Matrícula presencial con colas, cálculo manual de promedios, reportes que tardan semanas | Insatisfacción de estudiantes y personal |
| 4 | **Falta de integración** | Sistemas de matrícula, notas, reportes y biblioteca no se comunican entre sí | Duplicación de trabajo, datos inconsistentes |
| 5 | **Sin trazabilidad** | No hay registro de quién modificó qué y cuándo; imposible auditar cambios históricos | Riesgo de seguridad, dificultad para resolver disputas |
| 6 | **Software comercial inadecuado** | Sistemas propietarios costosos (SUMA, otros), difíciles de personalizar, dependencia del proveedor, no adaptados a normativa peruana | Alto costo total de propiedad, rigidez |

### 2.2 Impacto Cuantificado

| Área | Problema | Horas/Ciclo Perdidas | Costo Estimado (Soles/año) |
|------|----------|---------------------|---------------------------|
| Secretaría Académica | Matrícula manual | 400 h | S/ 12,000 |
| Docentes | Registro y cálculo de notas | 300 h | S/ 9,000 |
| Dirección Académica | Generación de reportes MINEDU | 200 h | S/ 6,000 |
| Administración | Resolución de errores e inconsistencias | 100 h | S/ 3,000 |
| **Total** | | **1,000 h** | **S/ 30,000** |

*Costo estimado basado en S/ 30/hora promedio de personal administrativo en IESTP público.*

### 2.3 Análisis de Causa Raíz (5 Whys)

```
1. ¿Por qué los procesos son manuales?
   → Porque no existe un sistema integrado que los automatice.

2. ¿Por qué no existe un sistema integrado?
   → Porque el software comercial es costoso y no se adapta.

3. ¿Por qué el software comercial es inadecuado?
   → Porque está diseñado para universidades, no para institutos tecnológicos.

4. ¿Por qué no se desarrolla internamente?
   → Porque los IESTP no tienen equipos de desarrollo de software.

5. ¿Por qué no hay alternativas de código abierto?
   → Porque el nicho es pequeño y no ha sido abordado adecuadamente.

→ Solución: SIGA, un sistema de código abierto diseñado específicamente para IESTP.
```

---

## 3. Solución

### 3.1 Descripción de la Solución

SIGA es un sistema integral de gestión académica que cubre todo el ciclo de vida del estudiante en un IESTP, desde la definición de planes de estudio hasta la emisión de reportes institucionales.

### 3.2 Componentes Clave

| Componente | Descripción | Tecnología |
|-----------|-------------|------------|
| **Core** | Autenticación, autorización, gateway, registro de módulos, health monitoring | FastAPI (Python 3.12+) |
| **Módulos** | Funcionalidad independiente: planes, programas, estudiantes, matrícula, evaluación | FastAPI (cada módulo) |
| **Frontend** | Interfaz de usuario unificada para todos los roles | React 18 + Vite + Tailwind |
| **Base de Datos** | Almacenamiento persistente de datos académicos | PostgreSQL 16+ |
| **Cache** | Caché distribuido para sesiones y datos frecuentes | Redis 7+ |
| **Bus de Eventos** | Comunicación asíncrona entre módulos | NATS |
| **Gateway** | Proxy inverso para enrutamiento a módulos | Core (HTTP) + nginx |

### 3.3 Principios de Diseño

1. **Modular**: Cada funcionalidad es un módulo independiente; se pueden desarrollar, desplegar y escalar por separado.
2. **API-first**: Todas las funcionalidades exponen APIs REST; el frontend consume APIs, no bases de datos.
3. **Resiliente**: Circuit breakers, health checks, reintentos con backoff, degradación graceful.
4. **Seguro**: JWT, RBAC, validación server-side, auditoría, comunicación cifrada.
5. **Estandarizado**: Todos los módulos siguen el estándar `MODULE-STD-2.0`.
6. **Observable**: Logs estructurados, métricas, tracing distribuido, health checks.

### 3.4 Diferenciadores

| Característica | SIGA | Software Comercial | Excel/Manual |
|---------------|------|-------------------|--------------|
| Código abierto | ✅ | ❌ | N/A |
| Sin costo de licencia | ✅ | ❌ | ✅ |
| Adaptable a normativa MINEDU | ✅ | Parcial | ✅ |
| Modular (crecimiento progresivo) | ✅ | ❌ | N/A |
| Trazabilidad completa | ✅ | Parcial | ❌ |
| Acceso remoto | ✅ | ✅ | ❌ |
| API para integraciones | ✅ | ❌ | ❌ |
| Reportes MINEDU automatizados | ✅ | Parcial | ❌ |
| Sin dependencia de proveedor | ✅ | ❌ | ✅ |

---

## 4. Mercado Objetivo

### 4.1 Segmento Primario: IESTP Públicos Peruanos

| Dimensión | Dato |
|-----------|------|
| Universo total | ~100 IESTP públicos |
| Distribución | 25 regiones del Perú |
| Estudiantes por IESTP | 500 – 3,000 (promedio: 1,200) |
| Programas por IESTP | 5 – 20 (promedio: 11) |
| Personal administrativo por IESTP | 15 – 40 personas |
| Docentes por IESTP | 30 – 120 |
| Presupuesto anual promedio (TI) | S/ 50,000 – S/ 200,000 |
| Madurez digital | Baja: mayoría usa Excel + papel |

### 4.2 Segmento Secundario (Futuro)

| Segmento | Número Potencial | Adaptación Necesaria |
|----------|-----------------|---------------------|
| IESTP Privados | ~200 | Mínima (mismos procesos) |
| CETPRO (Centros Técnicos Productivos) | ~500 | Media (estructura diferente) |
| Universidades públicas (filiales) | ~50 | Alta (currícula diferente) |
| Institutos de otras regiones (Latam) | ~500 | Media (adaptar normativa local) |

### 4.3 Tamaño del Mercado

```
TAM (Total Addressable Market):
  ~100 IESTP × S/ 100,000 (gasto potencial en 5 años) = S/ 10,000,000

SAM (Serviceable Addressable Market):
  ~50 IESTP (adopción temprana) × S/ 60,000 = S/ 3,000,000

SOM (Serviceable Obtainable Market - 3 años):
  ~10 IESTP × S/ 50,000 = S/ 500,000
```

### 4.4 Perfil del Cliente Ideal

```
Institución: IESTP público con 800–2000 estudiantes
Ubicación: Capital de región o provincia grande
Madurez digital: Dispuesto a adoptar tecnología
Presupuesto TI: S/ 50,000+ anual
Problema crítico: Matrícula manual que toma semanas
Motivación: Mejorar eficiencia, reportes MINEDU, satisfacción estudiantil
```

---

## 5. Competencia

### 5.1 Mapa Competitivo

| Competidor | Tipo | Cobertura | Costo | Adaptabilidad | Modernidad | Score |
|-----------|------|-----------|-------|---------------|-----------|-------|
| **SIGA** | Open Source | Completa | $0 | Alta | Alta | ★★★★★ |
| SISEDU | Gobierno | Parcial | $0 | Baja | Baja | ★★ |
| SUMA | Comercial | Completa | Alto | Media | Media | ★★★ |
| Google Classroom | Gratuito | Educativo | $0 | Baja | Alta | ★★ |
| Desarrollo in-house | A medida | Variable | Muy Alto | Alta | Variable | ★★★ |
| Moodle | Open Source | LMS | $0 | Alta | Media | ★★★ |
| SAP | Enterprise | Completa | Muy Alto | Media | Alta | ★★★ |

### 5.2 Análisis Detallado de Competidores

#### SISEDU (Sistema de Información del MINEDU)
- **Tipo:** Sistema público obligatorio
- **Fortaleza:** Todos los IESTP deben usarlo para reportes oficiales; datos normalizados
- **Debilidad:** Solo reportes, no cubre gestión académica diaria; interfaz anticuada; sin API moderna
- **Estrategia SIGA:** SIGA complementa a SISEDU; genera reportes en formato SISEDU automáticamente

#### SUMA (Sistema Universitario de Matrícula Académica)
- **Tipo:** Software comercial propietario
- **Fortaleza:** Amplia base instalada en universidades; funcionalidad completa
- **Debilidad:** Costo alto (S/ 80,000–150,000 inicial + S/ 20,000/año); diseñado para universidades, no institutos; difícil de personalizar; vendor lock-in
- **Estrategia SIGA:** Competir en costo y adaptabilidad para el nicho IESTP

#### Google Classroom
- **Tipo:** Plataforma educativa gratuita
- **Fortaleza:** Gratuito, popular, fácil de usar, buena experiencia de usuario
- **Debilidad:** No es un ERP académico; no gestiona matrícula, promedios, reportes MINEDU; no cumple normativa peruana
- **Estrategia SIGA:** No es competidor directo; Google Classroom puede complementar la parte pedagógica

#### Desarrollo in-house
- **Tipo:** Desarrollo interno del IESTP
- **Fortaleza:** 100% personalizado a necesidades locales
- **Debilidad:** Costo altísimo (S/ 200,000+); dependencia del equipo desarrollador; mantenimiento complejo; alta probabilidad de abandono
- **Estrategia SIGA:** Ofrecer alternativa 10x más barata y mantenible

### 5.3 Ventaja Competitiva de SIGA

```
Ventaja 1: COSTO
  SIGA:     S/ 0 (licencia) + S/ 30,000 (implementación)
  SUMA:     S/ 120,000 (licencia 5 años) + S/ 20,000 (mantenimiento anual)
  In-house: S/ 200,000+ (desarrollo)

  Ahorro vs. SUMA en 5 años: ~S/ 150,000

Ventaja 2: ADAPTABILIDAD
  SIGA:     Código abierto → cualquier modificación es posible
  SUMA:     Configuración limitada → dependencia del proveedor
  SISEDU:   Sin posibilidad de modificación

Ventaja 3: MODERNIDAD
  SIGA:     FastAPI + React + NATS + Redis → arquitectura 2025
  SUMA:     Legacy (Java 8, JSF, Oracle)
  SISEDU:   Legacy (PHP 5, MySQL)

Ventaja 4: ENFOQUE EN NORMATIVA PERUANA
  SIGA:     Diseñado desde el inicio para IESTP y MINEDU
  SUMA:     Diseñado para universidades, adaptado a institutos
```

---

## 6. Modelo de Negocio

### 6.1 Estrategia de Monetización

SIGA sigue un modelo **Open Core** con servicios profesionales:

| Componente | Licencia | Modelo |
|-----------|----------|--------|
| Núcleo (Core) | Open Source (MIT) | Gratuito |
| Módulos estándar (planes, estudiantes, matrícula, evaluación) | Open Source (MIT) | Gratuito |
| Módulos avanzados (reportes avanzados, dashboard gobierno) | Open Source (MIT) | Gratuito |
| Implementación | Servicio | Pago único |
| Capacitación | Servicio | Pago por taller |
| Soporte técnico | Servicio | Suscripción anual |
| Hosting administrado (SaaS) | Servicio | Suscripción mensual |
| Personalización | Servicio | Por proyecto |

### 6.2 Fuentes de Ingreso

| # | Fuente | Descripción | Precio Estimado | Margen |
|---|--------|-------------|-----------------|--------|
| 1 | **Implementación inicial** | Instalación, configuración, despliegue | S/ 15,000 – 30,000 | 60% |
| 2 | **Capacitación** | Talleres para administrativos, docentes, directivos | S/ 3,000 – 8,000 | 70% |
| 3 | **Soporte anual** | Mantenimiento, actualizaciones, soporte técnico (5% del costo de implementación) | S/ 750 – 1,500/año | 80% |
| 4 | **Hosting administrado** | Infraestructura cloud, backups, monitoreo 24/7 | S/ 500 – 2,000/mes | 40% |
| 5 | **Personalización** | Módulos adicionales, integraciones, reportes a medida | S/ 5,000 – 20,000 | 65% |
| 6 | **Consultoría** | Optimización de procesos, migración de datos | S/ 2,000 – 5,000 | 75% |

### 6.3 Proyección Financiera (3 Años)

| Año | IESTP Implementados | Ingresos Implementación | Ingresos Recurrentes | Ingresos Totales | Costos | Utilidad |
|-----|-------------------|------------------------|---------------------|-----------------|--------|----------|
| 1 | 2 | S/ 45,000 | S/ 3,000 | S/ 48,000 | S/ 60,000 | -S/ 12,000 |
| 2 | 5 (3 nuevos) | S/ 60,000 | S/ 12,000 | S/ 72,000 | S/ 60,000 | S/ 12,000 |
| 3 | 10 (5 nuevos) | S/ 100,000 | S/ 30,000 | S/ 130,000 | S/ 80,000 | S/ 50,000 |

*Supuestos: Costo de desarrollo en año 1 (no capitalizado), crecimiento de ingresos recurrentes por renovaciones y nuevos clientes.*

### 6.4 Estructura de Costos

| Categoría | Costo Mensual | Anual |
|-----------|--------------|-------|
| Infraestructura cloud (dev/staging/prod) | S/ 800 | S/ 9,600 |
| Dominios y SSL | S/ 20 | S/ 240 |
| Herramientas (GitHub, Sentry, etc.) | S/ 100 | S/ 1,200 |
| Desarrollo (2 personas, año 1) | S/ 8,000 | S/ 96,000 |
| **Total Año 1** | | **S/ 107,040** |

---

## 7. ROI para la Institución

### 7.1 Ahorros Cuantitativos

Para un IESTP típico con 1,000 estudiantes, 11 programas y 6 ciclos activos:

| Proceso | Antes (horas/ciclo) | Después (horas/ciclo) | Ahorro (horas/ciclo) | Ahorro (horas/año) | Ahorro (S//año)* |
|---------|--------------------|----------------------|--------------------|--------------------|------------------|
| Matrícula (inscripción, verificación, registro) | 200 h | 20 h | 180 h | 360 h | S/ 10,800 |
| Procesamiento de notas (registro, cálculo, revisión) | 150 h | 10 h | 140 h | 280 h | S/ 8,400 |
| Generación de reportes (MINEDU, dirección) | 100 h | 5 h | 95 h | 190 h | S/ 5,700 |
| Resolución de errores (notas mal calculadas, datos duplicados) | 50 h | 5 h | 45 h | 90 h | S/ 2,700 |
| **Total** | **500 h** | **40 h** | **460 h** | **920 h** | **S/ 27,600** |

*\*Basado en S/ 30/hora costo de personal administrativo.*

### 7.2 Beneficios Cualitativos

| Beneficio | Descripción | Impacto |
|-----------|-------------|---------|
| **Datos precisos** | Una sola fuente de verdad; sin duplicación ni inconsistencias | Confianza en la información |
| **Trazabilidad** | Cada cambio queda registrado con quién, cuándo y qué | Auditoría, resolución de disputas |
| **Acceso remoto** | Estudiantes consultan notas online; docentes registran desde cualquier lugar | Satisfacción, eficiencia |
| **Reportes MINEDU** | Generación automática en formato oficial | Cumplimiento normativo, ahorro de tiempo |
| **Alertas tempranas** | Identificación de estudiantes en riesgo antes del fin del ciclo | Mejora de retención |
| **Toma de decisiones** | Datos consolidados para dirección académica | Gestión basada en evidencia |
| **Imagen institucional** | Modernización de procesos, percepción de calidad | Atracción de estudiantes |

### 7.3 Cálculo de Payback

```
Inversión inicial (implementación): S/ 25,000
Ahorro anual:                      S/ 27,600

Payback simple: 25,000 / 27,600 = 0.91 años ≈ 11 meses

ROI a 3 años:
  Inversión: S/ 25,000
  Beneficio: S/ 27,600 × 3 = S/ 82,800
  ROI: (82,800 - 25,000) / 25,000 = 231%
```

---

## 8. Fases de Implementación

### 8.1 Timeline General

```
Año 1
├── Q1 (Meses 1-3):   Fase 1 - Fundación
│   ├── Core + Socket
│   ├── mod-planes-estudio + mod-programas-estudio
│   ├── Frontend: login, dashboard
│   └── 1 programa piloto
│
├── Q2 (Meses 4-6):   Fase 2 - Operación
│   ├── mod-estudiantes + mod-matricula
│   ├── Frontend: módulos funcionales
│   └── 3 programas
│
├── Q3 (Meses 7-9):   Fase 3 - Evaluación
│   ├── mod-evaluacion
│   ├── Boletines y reportes
│   └── 6 programas
│
└── Q4 (Meses 10-12): Fase 4 - Expansión
    ├── mod-convalidaciones, mod-traslados, mod-reingresos
    ├── Reportes MINEDU
    └── 11 programas

Año 2
└── Fase 5 - Madurez
    ├── Dashboard de gobierno académico
    ├── Integraciones (biblioteca, financiero)
    ├── App móvil
    └── Optimización y escalabilidad
```

### 8.2 Dependencias entre Módulos

```
Fase 1                    Fase 2                    Fase 3              Fase 4
┌──────────────────┐    ┌──────────────────┐    ┌──────────────┐    ┌────────────────┐
│ mod-planes-est.  │───>│ mod-estudiantes  │───>│mod-evaluacion│───>│mod-convalidac. │
└──────────────────┘    └──────────────────┘    └──────────────┘    └────────────────┘
         │                      │                                          │
         v                      v                                          v
┌──────────────────┐    ┌──────────────────┐                       ┌────────────────┐
│mod-programas-est.│───>│ mod-matricula    │                       │mod-traslados   │
└──────────────────┘    └──────────────────┘                       └────────────────┘
                                                                          │
                                                                          v
                                                                   ┌────────────────┐
                                                                   │mod-reingresos  │
                                                                   └────────────────┘
```

### 8.3 Hitos por Fase

| Fase | Hito | Criterio de Aceptación |
|------|------|----------------------|
| **F1** | Core funcional | Login, registro de módulos, proxy funcionando |
| **F1** | 2 módulos base | CRUD de planes y programas operativos |
| **F2** | MVP funcional | 1 programa con ciclo completo de matrícula |
| **F2** | Matrícula operativa | Estudiante se matricula, validación de reglas funciona |
| **F3** | Evaluación completa | Docente registra notas, sistema calcula promedios |
| **F4** | 11 programas | Todos los programas configurados y operativos |
| **F5** | Producción madura | 99.9% uptime, <500ms respuestas, 100 usuarios concurrentes |

---

## 9. Equipo Requerido

### 9.1 Equipo Mínimo (Fase 1-2)

| Rol | Dedicación | Meses | Costo Mensual (S/) | Costo Total (S/) |
|-----|-----------|-------|-------------------|------------------|
| Arquitecto/Backend Senior | Full-time | 1-12 | 7,000 | 84,000 |
| Backend Developer | Full-time | 1-12 | 5,000 | 60,000 |
| Frontend Developer | Full-time | 2-12 | 5,000 | 55,000 |
| **Subtotal** | | | | **199,000** |

### 9.2 Equipo Ampliado (Fase 3-4)

| Rol | Dedicación | Meses | Costo Mensual (S/) | Costo Total (S/) |
|-----|-----------|-------|-------------------|------------------|
| DevOps Engineer | Part-time (50%) | 4-12 | 3,000 | 27,000 |
| Tester QA | Part-time (50%) | 3-12 | 2,500 | 25,000 |
| Product Owner | Part-time (50%) | 1-12 | 3,500 | 42,000 |
| **Subtotal** | | | | **94,000** |

### 9.3 Perfiles y Responsabilidades

| Rol | Responsabilidades | Habilidades Requeridas |
|-----|-------------------|----------------------|
| **Arquitecto/Backend Senior** | Arquitectura del sistema, Core, estándares, revisión de código, decisiones técnicas | FastAPI, PostgreSQL, Redis, NATS, Docker, patrones de microservicios |
| **Backend Developer** | Desarrollo de módulos, APIs, integración con Core, pruebas | Python, FastAPI, SQLAlchemy, pytest, Git |
| **Frontend Developer** | Interfaz de usuario, consumo de APIs, experiencia de usuario | React, TypeScript, Vite, Tailwind CSS, React Query |
| **DevOps Engineer** | CI/CD, Docker, infraestructura, monitoreo, backups | Docker, GitHub Actions, Linux, PostgreSQL, nginx |
| **Tester QA** | Pruebas funcionales, de integración, de regresión, documentación de bugs | pytest, Playwright, Postman, reporting |
| **Product Owner** | Priorización, contacto con stakeholders, definición de requisitos, validación | Gestión de productos, conocimiento de procesos académicos |

---

## 10. KPIs del Proyecto

### 10.1 KPIs Técnicos

| KPI | Target | Medición | Frecuencia |
|-----|--------|----------|------------|
| Cobertura de módulos core | 100% funcional | Todos los módulos del roadmap implementados | Mensual |
| Tiempo de respuesta (promedio) | < 500ms | Promedio de latencia de APIs | Semanal |
| Tiempo de respuesta (P99) | < 2s | Percentil 99 de latencia | Semanal |
| Disponibilidad | 99.5% | Uptime del sistema | Mensual |
| Cobertura de pruebas unitarias | > 70% | Líneas de código cubiertas | Quincenal |
| Cobertura de pruebas de integración | > 50% | Escenarios cubiertos | Quincenal |
| Deployments exitosos | > 95% | Deployments sin rollback | Mensual |
| Bugs en producción | < 5/mes | Bugs reportados por usuarios | Mensual |
| Vulnerabilidades críticas | 0 | Escaneo de seguridad | Semanal |

### 10.2 KPIs de Negocio

| KPI | Target | Medición | Frecuencia |
|-----|--------|----------|------------|
| Programas configurados | 11 de 11 | Programas activos en el sistema | Al inicio de cada ciclo |
| Procesos automatizados | 100% | % de procesos académicos sin intervención manual | Ciclo académico |
| Reducción de tiempo administrativo | > 80% | Horas reportadas vs. horas antes de SIGA | Ciclo académico |
| Precisión de cálculos | 100% | Errores en promedios, promociones, reportes | Ciclo académico |
| Satisfacción de usuarios | > 80% | Encuesta a administrativos, docentes, estudiantes | Trimestral |
| Adopción de módulos | > 90% | % de usuarios usando el sistema vs. procesos manuales | Mensual |
| Tiempo de matrícula | < 1 semana | Días desde apertura hasta cierre de matrícula | Ciclo académico |
| Reportes MINEDU | Entregados a tiempo | Días antes del deadline | Ciclo académico |

### 10.3 KPIs Financieros

| KPI | Target | Medición |
|-----|--------|----------|
| ROI a 3 años (institución) | > 200% | (Ahorros - Inversión) / Inversión |
| Payback (institución) | < 18 meses | Tiempo en recuperar inversión |
| Costo por estudiante (SIGA) | < S/ 5/año | Costo total / número de estudiantes |

---

## 11. Sostenibilidad

### 11.1 Continuidad del Proyecto

| Factor | Estrategia |
|--------|-----------|
| **Documentación** | Documentación completa y actualizada en `/docs/`; README por módulo; arquitectura documentada |
| **Código modular** | Módulos independientes; si uno falla, los demás continúan |
| **Pruebas automatizadas** | CI ejecuta pruebas unitarias, de integración y lint en cada PR |
| **CI/CD** | GitHub Actions para builds, tests, deployments automáticos |
| **Infraestructura como código** | Docker + scripts de deploy reproducibles en cualquier entorno |
| **Backups** | Automáticos diarios con retención de 30 días; point-in-time recovery |
| **Seguridad** | Secrets nunca en código; auditoría de todas las acciones |

### 11.2 Transferencia de Conocimiento

| Actividad | Frecuencia | Audiencia |
|-----------|-----------|-----------|
| Documentación técnica en repo | Continua | Desarrolladores |
| Sesiones de capacitación internas | Mensual | Equipo de desarrollo |
| Capacitación a personal IESTP | Por implementación | Usuarios finales |
| Videos tutoriales (futuro) | Por módulo | Todos los usuarios |
| Wiki / Base de conocimiento | Continua | Todos |

### 11.3 Arquitectura a 10 Años

```
Hoy (2026):               Año 3 (2029):             Año 5+ (2031+):
┌──────────┐              ┌──────────┐              ┌────────────┐
│ FastAPI  │              │ FastAPI  │              │ FastAPI +  │
│ React    │              │ React    │              │ K8s        │
│ PostgreSQL│              │ PostgreSQL│              │ React Native│
│ Monolito │              │ Micro-serv│              │ Multi-tenant│
│ modular  │              │ NATS     │              │ GraphQL    │
│ On-premise│              │ Docker   │              │ Cloud-native│
└──────────┘              └──────────┘              └────────────┘
```

---

## 12. Análisis de Riesgos

| Riesgo | P | I | Puntuación | Mitigación |
|--------|---|---|-----------|-------------|
| Complejidad del parser Excel MINEDU | Alta | Alto | **Crítico** | Parser iterativo; probar con 3 programas reales; fallar rápido |
| Resistencia al cambio del personal | Media | Alto | **Alto** | Capacitación gradual; interfaz intuitiva; campeones internos |
| Cambios en normativa MINEDU | Media | Medio | **Medio** | Configuración parametrizable; no hardcodear reglas |
| Carga en períodos pico (matrícula) | Alta | Medio | **Alto** | Arquitectura escalable; caché Redis; load testing |
| Pérdida de datos | Baja | Crítico | **Crítico** | Backups automáticos diarios; replicación; point-in-time recovery |
| Dependencia del equipo original | Media | Alto | **Alto** | Documentación completa; código modular; pruebas |
| Falla de seguridad | Baja | Crítico | **Crítico** | Defense in depth; auditoría; pen testing; actualizaciones |
| Retraso en cronograma | Media | Medio | **Medio** | Metodología ágil; MVP temprano; priorización estricta |

---

## 13. Estrategia de Marketing y Adopción

### 13.1 Canales de Adquisición

| Canal | Esfuerzo | Costo | Alcance |
|-------|----------|-------|---------|
| Referencias de directores de IESTP | Bajo | Bajo | Alto |
| Presentaciones en reuniones de RED (Red de IESTP) | Medio | Bajo | Alto |
| Demostraciones personalizadas | Alto | Medio | Medio |
| GitHub / comunidades open source | Bajo | Bajo | Medio |
| Artículos en LinkedIn / Medium | Medio | Bajo | Medio |
| Participación en eventos de educación tecnológica | Alto | Medio | Alto |

### 13.2 Estrategia de Adopción

```
Fase 1 - Piloto (Año 1):
  1 IESTP pionero → implementación completa → caso de éxito documentado

Fase 2 - Early Adopters (Año 2):
  3-5 IESTP adicionales → referencias del piloto → testimonios

Fase 3 - Crecimiento (Año 3):
  5-10 IESTP → presencia regional → comunidad open source contribuyendo

Fase 4 - Escalamiento (Año 4+):
  20+ IESTP → consolidación → módulos premium → sostenibilidad
```

---

## 14. Proyección de Impacto

### 14.1 Impacto Social

| Indicador | Por IESTP | 10 IESTP | 50 IESTP |
|-----------|-----------|----------|----------|
| Horas administrativas recuperadas/año | 920 h | 9,200 h | 46,000 h |
| Estudiantes beneficiados | 1,200 | 12,000 | 60,000 |
| Docentes beneficiados | 60 | 600 | 3,000 |
| Reportes MINEDU a tiempo | 12/año | 120/año | 600/año |

### 14.2 Impacto en la Educación

- **Mejora en retención estudiantil**: Alertas tempranas permiten intervenir antes de la deserción
- **Calidad educativa**: Docentes dedican más tiempo a enseñar, menos a papeleo
- **Toma de decisiones**: Directores tienen datos confiables para planificar
- **Modernización**: IESTP públicos compiten en igualdad de condiciones tecnológicas con privados

---

## 15. Glosario

| Término | Definición |
|---------|-----------|
| IESTP | Instituto de Educación Superior Tecnológica Público |
| MINEDU | Ministerio de Educación del Perú |
| SISEDU | Sistema de Información del MINEDU |
| UD | Unidad Didáctica (curso/materia) |
| Ciclo Académico | Período semestral (I: abril-agosto, II: septiembre-febrero) |
| Crédito | Unidad de valor de una UD (1 crédito = 16-18 horas) |
| Módulo Formativo | Conjunto de UDs que conforman una competencia |
| Plan de Estudio | Documento que define la estructura académica de un programa |
| RBAC | Role-Based Access Control |
| Open Core | Modelo de negocio donde el núcleo es open source + servicios premium |

---

## 16. Historial de Cambios

| Fecha | Versión | Autor | Cambios |
|-------|---------|-------|---------|
| 2026-06-26 | 1.0 | Arquitecto SIGA | Versión inicial del plan de negocio |

---
