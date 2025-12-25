# 🏛 CONTEXTO MAESTRO - SIGA (Sistema Integral de Gestión Académica)

## 🎯 VISIÓN GENERAL
**Sistema modular tipo Moodle pero para institutos superiores con 11 carreras, 
arquitectura de microservicios independientes conectados vía Core central.**

## 🏗 ARQUITECTURA PRINCIPAL

### Core Central (COMPLETADO ✅)
Core Gateway
├── Identidad & Seguridad (JWT)
├── Module Registry
├── Event Bus (NATS)
├── API Gateway único
└── UI Administrativa mínima

Módulos Independientes
mod-planes-estudio ✅
mod-carreras 🚧 PRÓXIMO
mod-cursos-generados 📋 PLANEADO
mod-estudiantes 📋 PLANEADO
mod-docencia 📋 PLANEADO

--------------------------------------------------------

### Principios de Diseño
- ✅ **Cada módulo es 100% independiente**
- ✅ **Bases de datos separadas**
- ✅ **Comunicación solo vía Core (APIs/Events)**
- ✅ **Pueden ser removidos sin afectar sistema**
- ✅ "Plug & Play" extremo

## 📊 CONTEXTO INSTITUCIONAL

### Instituto
- 11 carreras profesionales
- Sistema bajo normativa MINEDU
- Planes de estudio complejos (8 libros Excel)
- Enfoque en replicabilidad entre carreras

### Estructura Académica

------------------------------------------------------------------------------------
Plan Estudio MINEDU → Malla Curricular → Cursos Generados → Gestión Académica

## 🔧 TECNOLOGÍAS Y CONFIGURACIÓN

### Stack Principal
- **Backend**: Node.js + Express + PostgreSQL
- **Comunicación**: REST APIs + NATS (eventos)
- **Contenedores**: Docker
- **Frontend**: React (futuro)
----------------------------------------------
### Configuración Core (.env)
```env
DB_HOST=localhost
DB_PORT=5432  
DB_USER=postgres
DB_PASSWORD=john.007
DB_NAME=siga_core

Estándares Módulos
Puerto: 3001, 3002, 3003...

Health check: /health

API: /api/v1/[entidad]

Manifiesto: manifest.yaml

------------------------------------------------

ROADMAP GLOBAL
FASE 1 - FUNDACIONES ✅
Core central

mod-planes-estudio

FASE 2 - GESTIÓN ACADÉMICA 🚧
mod-carreras (configuración por carrera)

mod-cursos-generados (desde planes)

mod-estudiantes (matrícula, documentos)

FASE 3 - OPERACIONES ACADÉMICAS 📋
mod-docencia (asignación docente)

mod-calificaciones (sistema evaluativo)

mod-asistencia (control de presencia)

FASE 4 - AVANZADO 📋
mod-silabos (desarrollo curricular)

mod-sesiones (planificación docente)

mod-certificados (titulación)

🎓 ESTRUCTURA PLANES DE ESTUDIO (MINEDU)
Libros de Planes
Perfil de Egreso

Programa de Estudios

Capacidades e Indicadores

Organización Modular

Módulo 1: Arquitectura y desarrollo

Módulo 2: Diseño y administración

Módulo 3: Aplicaciones web y emprendimiento

Itinerario Formativo

Datos Clave
3,264 horas totales

127 créditos

3 módulos × 27 unidades didácticas

6 periodos académicos (I-VI)

🔄 PATRONES DE DESARROLLO
Estructura Módulo Típica
text
mod-nombre/
├── manifest.yaml
├── src/
│   ├── models/
│   ├── controllers/ 
│   ├── routes/
│   ├── repositories/
│   └── config/
├── database/
│   └── schema.sql
└── Dockerfile
Comunicación entre Módulos
javascript
// PROHIBIDO: Conexión directa a BD de otro módulo
// PERMITIDO: Comunicación vía Core APIs/Events

// Ejemplo: mod-cursos necesita datos de planes
const response = await fetch('http://core/api/planes-estudio/123');
📝 HISTORIAL DE DESARROLLO
2024 - Módulos Completados
mod-planes-estudio ✅

APIs: CRUD planes de estudio

BD: mod_planes_estudio

Puerto: 3001

Próximos Módulos Prioritarios
mod-carreras - Gestión de las 11 carreras

mod-cursos-generados - Cursos desde planes

mod-estudiantes - Matrícula y gestión

----------------------------------------------------------------------

## **PASO 2: PROMPT PARA FUTUROS CHATS**

### **🛠 ACCIÓN 2:**
Guarda este prompt para usar en futuros desarrollos:
CONTEXTO SIGA - DESARROLLO DE MÓDULOS

Sistema: SIGA (Sistema Integral de Gestión Académica)
Arquitectura: Microservicios independientes + Core Gateway
Contexto: Instituto con 11 carreras, normativa MINEDU

INSTRUCCIONES:

ANTES de codificar, LEE el archivo CONTEXTO_SISTEMA.md

SEGUIR arquitectura existente de mod-planes-estudio

Módulos son 100% independientes con BD propia

Comunicación solo vía Core (APIs/Events)

Usar estándares: health checks, manifiestos, Docker

MÓDULO ACTUAL: [nombre del módulo a desarrollar]
OBJETIVO: [descripción específica]

Referencia: mod-planes-estudio ya completado como ejemplo.

-----------------------------------------------------------------------

## **PASO 3: ACTUALIZACIÓN CONTINUA**

### **Estrategia:**
- **Cada módulo nuevo** → Actualizar `CONTEXTO_SISTEMA.md`
- **Cada decisión arquitectónica** → Documentar aquí
- **Cada configuración importante** → Agregar al contexto

---


