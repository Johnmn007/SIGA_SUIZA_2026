ROADMAP DETALLADO - CARRERA PILOTO "DESARROLLO DE SISTEMAS"
FASE 1: FUNDACIÓN DE CARRERA COMPLETA 🚧 ACTUAL
SPRINT 1.1 - ESTRUCTURA ACADÉMICA COMPLETA

text
✅ [ ] Modelo de Carrera con datos MINEDU completos
✅ [ ] Relación PlanEstudio → Módulos → Unidades Didácticas
✅ [ ] Competencias técnicas (UC1-UC4) y empleabilidad (CE1-CE7)
✅ [ ] API para gestión jerárquica de estructura académica
SPRINT 1.2 - DATOS MAESTROS CARGADOS

text
✅ [ ] Carga completa de 3 módulos formativos
✅ [ ] 27 unidades didácticas con horas/créditos
✅ [ ] Competencias y capacidades por unidad
✅ [ ] Datos de ejemplo para testing
FASE 2: GENERACIÓN AUTOMÁTICA 📋 PRÓXIMA
SPRINT 2.1 - SISTEMA DE CURSOS GENERADOS

text
🔧 [ ] Modelo CursoGenerado desde Unidad Didáctica
🔧 [ ] API para generar cursos desde plan de estudios
🔧 [ ] Configuración por periodo académico (I-VI)
🔧 [ ] Validaciones de integridad académica
SPRINT 2.2 - CORRELATIVIDADES Y PRERREQUISITOS

text
🔧 [ ] Modelo de correlatividades entre cursos
🔧 [ ] Sistema de árbol de dependencias
🔧 [ ] API para consultar rutas académicas
🔧 [ ] Validación de secuencia lógica
FASE 3: GESTIÓN ACADÉMICA AVANZADA 📋 FUTURA
SPRINT 3.1 - CONFIGURACIÓN POR CARRERA

text
📊 [ ] Parámetros específicos por carrera
📊 [ ] Sistema de requisitos de titulación
📊 [ ] Configuración de modalidad (presencial)
📊 [ ] Horarios y carga académica
SPRINT 3.2 - REPORTES Y ANÁLISIS

text
📊 [ ] Reporte de malla curricular completa
📊 [ ] Análisis de carga académica por periodo
📊 [ ] Dashboard de progreso de carrera
📊 [ ] Estadísticas de cumplimiento MINEDU
FASE 4: PREPARACIÓN PARA REPLICACIÓN 📋 ESCALAMIENTO
SPRINT 4.1 - PATRONES Y PLANTILLAS

text
🚀 [ ] Plantilla de carrera replicable
🚀 [ ] Scripts de migración entre carreras
🚀 [ ] Documentación de implementación
🚀 [ ] Casos de prueba estandarizados
SPRINT 4.2 - OPTIMIZACIÓN Y VALIDACIÓN

text
🚀 [ ] Performance testing con datos completos
🚀 [ ] Validación de normas MINEDU
🚀 [ ] Optimización de consultas académicas
🚀 [ ] Preparación para 10 carreras adicionales
📊 ENTREGABLES POR SPRINT
SPRINT 1.1 - ENTREGABLES:

Modelo Carrera extendido en base de datos

APIs: GET /api/v1/carreras/:id/estructura-completa

Documentación técnica de estructura académica

Script de migración para datos existentes

SPRINT 1.2 - ENTREGABLES:

Datos completos de 3 módulos y 27 unidades

APIs para gestión de competencias

Colección Postman para testing

Documentación funcional de flujos académicos

🔄 DEPENDENCIAS CRÍTICAS
INTERNAS (mod-planes-estudio):

Modelo PlanEstudio existente ✅

APIs CRUD básicas ✅

Base de datos independiente ✅

EXTERNAS (vía Core):

Eventos: carrera.estructura_completada

Integración futura con mod-cursos-generados

Comunicación con mod-estudiantes (futuro)

📋 CRITERIOS DE ACEPTACIÓN
CARRERA PILOTO COMPLETA CUANDO:

Estructura académica 100% cargada y validada

APIs responden todas las consultas académicas

Generación de cursos funcional

Sistema de correlatividades operativo

Documentación completa para replicación

