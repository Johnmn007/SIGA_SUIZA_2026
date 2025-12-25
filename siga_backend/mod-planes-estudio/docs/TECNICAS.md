# 📚 Módulo: Planes de Estudio - Documentación Técnica

## 🏗 Arquitectura
- **Tipo**: Microservicio independiente
- **Base de datos**: PostgreSQL propia (`mod_planes_estudio`)
- **Comunicación**: APIs REST + Eventos (futuro)
- **Estado**: ✅ PRODUCCIÓN + ✅ VERSIONADO IMPLEMENTADO

## 🆕 SISTEMA DE VERSIONADO

### Conceptos Clave
- **Código Base**: Identificador único de carrera (ej: `J2662-3`)
- **Versión**: Año de la versión (ej: `2023`, `2024`, `2027`)
- **Código Completo**: Código base + versión (ej: `J2662-3-2023`)
- **Estados de Versión**: 
  - `borrador`: En desarrollo, no visible
  - `vigente`: Acepta nuevos estudiantes
  - `historico`: Solo estudiantes activos

### Flujo de Convivencia
2023 (histórico) → 2024 (vigente) → 2027 (borrador)
↓ ↓ ↓
Estudiantes Nuevos estudiantes En desarrollo
activos (hasta 2026) (desde 2024) (para 2027)

text

## 🗄 Modelos de Datos Actualizados

### PlanEstudio (Con Versionado)
```javascript
{
  codigo_base: "J2662-3",
  version: "2024",
  codigo_completo: "J2662-3-2024",
  nombre: "DESARROLLO DE SISTEMAS DE INFORMACIÓN (2024)",
  estado_version: "vigente",
  vigente_desde: "2024-01-01",
  vigente_hasta: null, // Acepta nuevos estudiantes
  fecha_retiro: null,  // Sin fecha de retiro
  // ... más campos existentes
}
🔌 APIs DISPONIBLES
APIs Existentes (Compatibilidad)
Método	Endpoint	Descripción
GET	/health	Estado del módulo
POST	/api/v1/planes-estudio	Crear plan
GET	/api/v1/planes-estudio	Listar planes
GET	/api/v1/planes-estudio/:id	Obtener plan específico
🆕 APIs de Versionado
Método	Endpoint	Descripción
GET	/api/v1/planes-estudio/codigo-completo/:codigoCompleto	Obtener por código completo
GET	/api/v1/planes-estudio/carrera/:codigoBase/versiones	Todas las versiones de una carrera
GET	/api/v1/planes-estudio/estado/vigentes	Planes que aceptan nuevos estudiantes
GET	/api/v1/planes-estudio/estado/activos	Planes con estudiantes activos
POST	/api/v1/planes-estudio/:id/versionar	Crear nueva versión
PUT	/api/v1/planes-estudio/:id/activar	Activar versión
🚀 DESPLIEGUE Y MIGRACIÓN
Comandos Disponibles
bash
# Aplicar migración de versionado
npm run migrate:versioning

# Cargar datos de prueba con versionado
npm run seed:versioning

# Ejecutar migración + datos de prueba
npm run setup:versioning
Estructura de Base de Datos
sql
planes_estudio (tabla actualizada)
├── id
├── codigo_base          -- 🆕 "J2662-3"
├── version              -- 🆕 "2023", "2024"
├── codigo_completo      -- 🆕 "J2662-3-2023"
├── estado_version       -- 🆕 'borrador', 'vigente', 'historico'
├── vigente_desde        -- 🆕 Fecha inicio vigencia
├── vigente_hasta        -- 🆕 Fecha fin nuevos estudiantes
├── fecha_retiro         -- 🆕 Fecha retiro último estudiante
├── version_anterior_id  -- 🆕 ID versión anterior
└── ... (campos existentes)
📊 EJEMPLOS DE USO
Crear Nueva Versión
javascript
// POST /api/v1/planes-estudio/1/versionar
{
  "version": "2027",
  "nombre": "DESARROLLO DE SISTEMAS (2027)",
  "total_horas": 3300,
  "total_creditos": 130
}
Obtener Versiones de Carrera
bash
GET /api/v1/planes-estudio/carrera/J2662-3/versiones

Respuesta:
{
  "success": true,
  "data": [
    { "version": "2027", "estado_version": "borrador", ... },
    { "version": "2024", "estado_version": "vigente", ... },
    { "version": "2023", "estado_version": "historico", ... }
  ]
}
🐳 DOCKER
bash
# Desplegar módulo independiente
docker build -t mod-planes-estudio .
docker run -p 3001:3001 mod-planes-estudio
🔄 INTEGRACIÓN
Este módulo se comunica exclusivamente vía:

APIs REST para datos

Eventos para notificaciones

Core como gateway único

