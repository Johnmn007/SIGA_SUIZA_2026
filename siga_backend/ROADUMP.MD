ROADMAP DETALLADO - SIGA (Sistema Integral de Gestión Académica)
📅 VISIÓN TEMPORAL
Duración total estimada: 6-8 meses
Metodología: Modular incremental
Prioridad: MVP funcional → Mejoras progresivas

🎯 FASE 0 - ARQUITECTURA BASE (COMPLETADA ✅)
FASE 0.1: Core Central
✅ Sistema de identidad y autenticación

✅ Module Registry para descubrimiento

✅ API Gateway unificado

✅ Event Bus (NATS) configurado

✅ Sistema de permisos y roles

FASE 0.2: Estándares y Protocolos
✅ Patrón de desarrollo modular establecido

✅ Estándares de APIs y health checks

✅ Configuración Docker base

✅ Protocolos de comunicación inter-módulos

🏗 FASE 1 - GESTIÓN ACADÉMICA FUNDAMENTAL (EN PROGRESO 🚧)
FASE 1.1: Planes de Estudio (COMPLETADO ✅)
✅ mod-planes-estudio - Gestión de planes MINEDU

✅ Modelos de datos para estructura académica completa

✅ APIs CRUD para planes, módulos, competencias

✅ Base de datos independiente operativa

FASE 1.2: Gestión de Carreras (PRÓXIMO ⏳)
Módulo: mod-carreras

Configuración específica por cada una de las 11 carreras

Relación con planes de estudio vigentes

Coordinadores y estructura organizativa

Periodos académicos y configuraciones

FASE 1.3: Cursos Generados (PLANEADO 📋)
Módulo: mod-cursos-generados

Generación automática de cursos desde planes de estudio

Gestión de cohortes y grupos por carrera

Estructura de lecciones y contenidos base

Relación estudiantes ↔ cursos

FASE 1.4: Gestión Estudiantil (PLANEADO 📋)
Módulo: mod-estudiantes

Proceso completo de matrícula

Gestión documental (expedientes digitales)

Estados académicos y situaciones estudiantiles

Historial académico base

📚 FASE 2 - OPERACIONES ACADÉMICAS (PLANEADO 📋)
FASE 2.1: Gestión Docente
Módulo: mod-docencia

Registro y perfilamiento de docentes

Asignación de cargas académicas

Distribución horaria basada en planes

Control de disponibilidad y especialidades

FASE 2.2: Sistema de Evaluación
Módulo: mod-calificaciones

Configuración de sistemas de evaluación por curso

Registro de notas y aprovechamiento

Cálculo de promedios y estadísticas

Reportes de rendimiento académico

FASE 2.3: Control de Asistencia
Módulo: mod-asistencia

Registro de asistencia estudiantil

Control de porcentajes y límites

Justificación de inasistencias

Reportes de cumplimiento

🚀 FASE 3 - PROCESOS AVANZADOS (FUTURO 🔮)
FASE 3.1: Desarrollo Curricular
Módulo: mod-silabos

Elaboración y gestión de sílabos

Alineación con competencias del plan

Aprobación y versionado de sílabos

Recursos educativos asociados

FASE 3.2: Planificación Docente
Módulo: mod-sesiones

Planificación de sesiones de aprendizaje

Gestión de recursos por sesión

Seguimiento de cumplimiento

Adaptaciones curriculares

FASE 3.3: Certificación y Titulación
Módulo: mod-certificados

Procesos de titulación automáticos

Generación de certificados y diplomas

Gestión de actas de grado

Integración con SUNEDU (futuro)

💡 FASE 4 - OPTIMIZACIÓN E INTELIGENCIA (FUTURO LEJANO 🔭)
FASE 4.1: Analytics Académico
Dashboards de rendimiento institucional

Predictores de deserción estudiantil

Optimización de recursos académicos

Business Intelligence educativo

FASE 4.2: Automatización Avanzada
Asistentes IA para planificación

Generación automática de contenidos

Sistema de alertas tempranas

Optimización de horarios y recursos

FASE 4.3: Integraciones Externas
Conexión con plataformas gubernamentales

APIs para sistemas externos

Movilidad estudiantil inter-institucional

Ecosistema educativo conectado

🔄 CRITERIOS DE AVANCE ENTRE FASES
Transición FASE 1 → FASE 2:
✅ Módulos fundamentales operativos

✅ Flujo académico básico funcionando

✅ Al menos 2 carreras usando el sistema

✅ Estabilidad demostrada en producción

Transición FASE 2 → FASE 3:
✅ 80% de operaciones académicas digitalizadas

✅ Sistema estable con carga real

✅ Retroalimentación positiva de usuarios

✅ Capacidad de escalamiento demostrada

Transición FASE 3 → FASE 4:
✅ Madurez operativa completa

✅ Datos históricos suficientes para analytics

✅ Equipo técnico capacitado para IA

✅ Recursos para desarrollo avanzado

🎯 HITOS PRINCIPALES POR MÓDULO
HITO 1: MVP Académico (3 meses)
mod-planes-estudio + mod-carreras + mod-cursos-generados

Gestión completa de 1 carrera piloto

Procesos básicos de matrícula y cursos

HITO 2: Sistema Operativo (6 meses)
Todos los módulos de FASE 1 + FASE 2 operativos

3-5 carreras usando el sistema

Procesos académicos 100% digitalizados

HITO 3: Excelencia Académica (9 meses)
Módulos de FASE 3 implementados

Todas las 11 carreras operativas

Analytics y optimizaciones básicas

HITO 4: Liderazgo Innovador (12+ meses)
Sistema de inteligencia artificial académica

Ecosistema educativo conectado

Referente nacional en gestión académica

📊 MÉTRICAS DE ÉXITO POR FASE
FASE 1:
100% de planes de estudio digitalizados

Reducción del 70% en tiempo de configuración académica

0 errores en generación automática de cursos

FASE 2:
90% de procesos académicos sin papel

Reducción del 50% en carga administrativa

95% de satisfacción docente con el sistema

FASE 3:
100% de sílabos digitalizados y alineados

Reducción del 80% en tiempo de planificación

Mejora del 15% en indicadores de aprendizaje

FASE 4:
90% de predicción acertada en rendimiento

50% de automatización en procesos avanzados

Reconocimiento como sistema innovador a nivel nacional

ESTADO ACTUAL: FASE 1.1 COMPLETADA - EN TRANSICIÓN A FASE 1.2
PRÓXIMO MÓDULO: mod-carreras
PRIORIDAD: Establecer base operativa para las 11 carreras

Este roadmap está diseñado para ser evolutivo y se ajustará según:

Feedback de usuarios reales

Cambios en normativa MINEDU

Capacidades técnicas del equipo

Recursos disponibles para desarrollo

Última actualización: Noviembre 2024
Próxima revisión: Al completar FASE 1.2