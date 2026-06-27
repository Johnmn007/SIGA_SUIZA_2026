# Modelo de Datos Global

> **Versión:** 1.0.0  
> **Última actualización:** 2026-06-26  
> **Responsable:** Arquitectura de Software SIGA

---

## 1. Filosofía de Datos

"Una sola fuente de verdad para cada entidad." Este principio guía todo el diseño de datos del sistema SIGA. Cada módulo es dueño absoluto de sus datos y los expone a través de su API. El Core únicamente gestiona:

- Identidad de usuarios y autenticación
- Registry de módulos (service discovery)
- Auditoría centralizada
- Enrutamiento de solicitudes entre módulos

Ningún módulo accede directamente a la base de datos de otro módulo. Toda comunicación entre módulos ocurre exclusivamente vía APIs (HTTP síncrono a través del Core Gateway) o mediante eventos asíncronos (NATS Event Bus).

---

## 2. Estrategia de Base de Datos

| Componente | Motor | Driver | Conexión | Propósito |
|-----------|-------|--------|----------|-----------|
| Core Database | PostgreSQL 16 | asyncpg | Pool asíncrono | Identidad, registry, auditoría |
| Módulo Database | PostgreSQL 16 | psycopg2 / asyncpg | Pool por módulo | Datos funcionales del módulo |
| Redis | Redis 7.x | redis-py | Pool síncrono | Caché, sesiones, rate limiting |

### 2.1 Core Database (`siga_core`)

Base de datos central que contiene únicamente tablas de identidad, registry de módulos, y auditoría. Conexión asíncrona via `asyncpg` para máximo rendimiento en operaciones de autenticación.

### 2.2 Module Databases (`mod_{nombre}`)

Cada módulo tiene su propia base de datos PostgreSQL independiente. Esto garantiza:

- **Aislamiento:** Un módulo caído no afecta la BD de otros módulos
- **Escalabilidad:** Cada módulo puede escalar su BD independientemente
- **Versionamiento:** Cada módulo puede tener su propio esquema y migraciones
- **Despliegue independiente:** Los equipos pueden modificar sus esquemas sin coordinación

### 2.3 Redis

Redis se utiliza para:

- **Caché de respuestas:** Respuestas GET de módulos cacheadas con TTL configurable
- **Sesiones:** Almacenamiento de sesiones activas y tokens invalidados (blacklist)
- **Rate Limiting:** Contadores de requests por usuario/IP
- **Colas ligeras:** Tareas programadas y procesamiento diferido

---

## 3. Convenciones de Nomenclatura

### 3.1 Bases de Datos

| Tipo | Formato | Ejemplo |
|------|---------|---------|
| Core | `siga_core` | `siga_core` |
| Módulo | `mod_{nombre}` | `mod_planes_estudio`, `mod_estudiantes` |

### 3.2 Tablas

| Tipo | Formato | Ejemplo |
|------|---------|---------|
| Core | Prefijo `core_` | `core_users`, `core_modules`, `core_audit_log` |
| Módulo | Nombre descriptivo en plural | `estudiantes`, `matriculas`, `unidades_didacticas` |

### 3.3 Columnas

| Tipo de Dato | Convención | Ejemplo |
|-------------|------------|---------|
| Identificador | `id` como SERIAL PRIMARY KEY | `id SERIAL PRIMARY KEY` |
| Timestamp creación | `created_at` con DEFAULT NOW() | `created_at TIMESTAMPTZ DEFAULT NOW()` |
| Timestamp actualización | `updated_at` con trigger ON UPDATE | `updated_at TIMESTAMPTZ DEFAULT NOW()` |
| Fecha sin hora | Sufijo `_date` | `fecha_nacimiento DATE`, `fecha_inicio DATE` |
| Booleano | Prefijo `is_` o `has_` | `is_active`, `is_superuser`, `has_internet` |
| JSON | Sufijo `_data` o tipo JSONB | `metadata JSONB`, `prerrequisitos JSONB` |
| Array de texto | Tipo `TEXT[]` | `permissions TEXT[]` |
| Array de enteros | Tipo `INTEGER[]` | `programa_ids INTEGER[]` |
| Número decimal | `NUMERIC(precision, scale)` | `creditos NUMERIC(4,1)`, `nota NUMERIC(4,2)` |

### 3.4 Llaves Foráneas

Formato: `{tabla_referenciada}_id`

| Columna FK | Tabla Referencia | Tipo |
|-----------|-----------------|------|
| `estudiante_id` | `estudiantes` | `INTEGER REFERENCES estudiantes(id)` |
| `programa_id` | `programas_estudio` | `INTEGER` (FK lógica) |
| `plan_id` | `planes_estudio` | `INTEGER REFERENCES planes_estudio(id)` |
| `periodo_id` | `periodos_academicos` | `INTEGER` (FK lógica) |

> **Nota sobre FKs lógicas:** Cuando la tabla referenciada pertenece a otro módulo, se usa FK lógica (columna INTEGER sin constraint REFERENCES). La integridad referencial se garantiza a nivel de aplicación mediante validaciones en el módulo correspondiente.

### 3.5 Índices

| Tipo | Formato | Ejemplo |
|------|---------|---------|
| Índice simple | `idx_{tabla}_{columna}` | `idx_estudiantes_dni` |
| Índice compuesto | `idx_{tabla}_{col1}_{col2}` | `idx_matriculas_estudiante_periodo` |
| Índice único | Usar UNIQUE constraint | `UNIQUE (user_id, role_id, programa_id)` |
| Índice parcial | Con cláusula WHERE | `CREATE INDEX ... WHERE is_active = true` |

---

## 4. Esquema del Core (`siga_core`)

### 4.1 Tablas de Identidad y Autenticación

```sql
-- ============================================================
-- core_users: Usuarios del sistema (alcance global)
-- ============================================================
CREATE TABLE core_users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_superuser BOOLEAN DEFAULT false,
    programa_ids INTEGER[],          -- IDs de programas a los que tiene acceso
    metadata JSONB DEFAULT '{}',     -- Metadatos extensibles (teléfono, cargo, etc.)
    last_login_at TIMESTAMPTZ,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_core_users_email ON core_users(email);
CREATE INDEX idx_core_users_active ON core_users(is_active) WHERE is_active = true;

-- ============================================================
-- core_roles: Roles del sistema
-- ============================================================
CREATE TABLE core_roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,  -- admin, director_academico, jefe_unidad, docente, alumno, secretario
    description VARCHAR(255),
    permissions TEXT[],                -- Lista de permisos asociados al rol
    is_system BOOLEAN DEFAULT false,   -- true = rol del sistema (no editable)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- core_user_roles: Asignación de roles a usuarios
-- ============================================================
CREATE TABLE core_user_roles (
    user_id INTEGER REFERENCES core_users(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES core_roles(id) ON DELETE CASCADE,
    programa_id INTEGER,               -- NULL = aplica a todos los programas
    granted_by INTEGER REFERENCES core_users(id),
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,            -- NULL = sin expiración
    PRIMARY KEY (user_id, role_id, programa_id)
);
CREATE INDEX idx_user_roles_user ON core_user_roles(user_id);

-- ============================================================
-- core_permissions: Catálogo de permisos del sistema
-- ============================================================
CREATE TABLE core_permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,  -- ej: "mod-planes-estudio:read"
    description VARCHAR(255),
    module_name VARCHAR(100),           -- Módulo al que pertenece el permiso
    category VARCHAR(50),               -- read, write, admin, report
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_core_permissions_module ON core_permissions(module_name);

-- ============================================================
-- core_sessions: Sesiones activas de usuarios
-- ============================================================
CREATE TABLE core_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES core_users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) UNIQUE NOT NULL,   -- SHA-256 del JWT
    refresh_token_hash VARCHAR(64) UNIQUE,     -- SHA-256 del refresh token
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    is_revoked BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_sessions_user ON core_sessions(user_id);
CREATE INDEX idx_sessions_expires ON core_sessions(expires_at) WHERE is_revoked = false;
```

### 4.2 Tablas de Registry de Módulos

```sql
-- ============================================================
-- core_modules: Registro de módulos del sistema
-- ============================================================
CREATE TABLE core_modules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,         -- Nombre único del módulo
    display_name VARCHAR(200),                  -- Nombre para mostrar en UI
    version VARCHAR(20) NOT NULL,               -- Versión semver del módulo
    api_version VARCHAR(10) NOT NULL,           -- Versión de la API (v1, v2)
    description TEXT,
    manifest JSONB NOT NULL,                    -- Manifest completo del módulo
    status VARCHAR(20) DEFAULT 'discovered',    -- discovered, validated, registered, healthy, unhealthy, offline
    endpoint_http VARCHAR(255),                 -- URL base del módulo (red interna)
    health_check_path VARCHAR(100) DEFAULT '/health',
    health_check_interval INTEGER DEFAULT 30,   -- Segundos entre health checks
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    last_health_check TIMESTAMPTZ,
    health_count INTEGER DEFAULT 0,             -- Health checks exitosos consecutivos
    fail_count INTEGER DEFAULT 0,               -- Health checks fallidos consecutivos
    circuit_state VARCHAR(20) DEFAULT 'closed', -- closed, open, half_open
    compliance_result JSONB,                    -- Resultado de validación de compliance
    dependencies TEXT[],                        -- Lista de módulos de los que depende
    is_active BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_core_modules_status ON core_modules(status);
CREATE INDEX idx_core_modules_active ON core_modules(is_active) WHERE is_active = true;

-- ============================================================
-- core_module_endpoints: Endpoints registrados por cada módulo
-- ============================================================
CREATE TABLE core_module_endpoints (
    id SERIAL PRIMARY KEY,
    module_id INTEGER REFERENCES core_modules(id) ON DELETE CASCADE,
    path VARCHAR(255) NOT NULL,                -- /api/v1/estudiantes
    methods TEXT[] NOT NULL,                    -- {GET, POST, PUT, DELETE}
    description TEXT,
    auth_required BOOLEAN DEFAULT true,
    permissions_required TEXT[],                -- Permisos necesarios para acceder
    rate_limit INTEGER DEFAULT 0,               -- 0 = sin límite, N = requests/minuto
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_endpoints_module ON core_module_endpoints(module_id);

-- ============================================================
-- core_module_events: Eventos registrados por cada módulo
-- ============================================================
CREATE TABLE core_module_events (
    id SERIAL PRIMARY KEY,
    module_id INTEGER REFERENCES core_modules(id) ON DELETE CASCADE,
    event_name VARCHAR(100) NOT NULL,           -- student.created, enrollment.confirmed
    description TEXT,
    schema_definition JSONB,                    -- Schema del payload del evento (JSON Schema)
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_module_events ON core_module_events(module_id, event_name);
```

### 4.3 Tablas de Auditoría

```sql
-- ============================================================
-- core_audit_log: Registro de auditoría centralizado
-- ============================================================
CREATE TABLE core_audit_log (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES core_users(id),
    action VARCHAR(50) NOT NULL,                -- create, read, update, delete, login, logout, export, import
    entity_type VARCHAR(100) NOT NULL,          -- usuario, modulo, estudiante, matricula, evaluacion
    entity_id INTEGER,
    entity_description VARCHAR(255),            -- Descripción legible de la entidad afectada
    module_name VARCHAR(100),                   -- Módulo que generó la acción (o 'core')
    changes JSONB,                              -- Cambios específicos: {"campo": {"old": "x", "new": "y"}}
    metadata JSONB,                             -- Datos adicionales contextuales
    ip_address VARCHAR(45),
    user_agent TEXT,
    request_id VARCHAR(100),                    -- Para correlación de tracing distribuido
    created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Crear particiones mensuales
CREATE TABLE core_audit_log_2026_01 PARTITION OF core_audit_log
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE core_audit_log_2026_02 PARTITION OF core_audit_log
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE core_audit_log_2026_03 PARTITION OF core_audit_log
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
-- ... (se crean automáticamente cada mes via cron job)

CREATE INDEX idx_audit_user ON core_audit_log(user_id);
CREATE INDEX idx_audit_entity ON core_audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_action ON core_audit_log(action);
CREATE INDEX idx_audit_created ON core_audit_log(created_at);
CREATE INDEX idx_audit_request ON core_audit_log(request_id);
CREATE INDEX idx_audit_module ON core_audit_log(module_name);

-- ============================================================
-- core_audit_retention: Política de retención de auditoría
-- ============================================================
-- Los logs de auditoría se conservan por 2 años.
-- Los logs mayores a 2 años se archivan (dump CSV) y eliminan.
-- Proceso automático: cron mensual que ejecuta el archivado.
```

### 4.4 Tablas de Configuración Global

```sql
-- ============================================================
-- core_config: Configuración global del sistema
-- ============================================================
CREATE TABLE core_config (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,           -- sistema.nombre, auth.token_expiration, etc.
    value JSONB NOT NULL,
    description VARCHAR(255),
    is_encrypted BOOLEAN DEFAULT false,
    updated_by INTEGER REFERENCES core_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- core_rate_limits: Configuración de límites de tasa
-- ============================================================
CREATE TABLE core_rate_limits (
    id SERIAL PRIMARY KEY,
    pattern VARCHAR(255) NOT NULL,              -- /api/*, /auth/login
    method VARCHAR(10) NOT NULL,                -- GET, POST, *
    limit_per_minute INTEGER NOT NULL,
    burst_size INTEGER DEFAULT 0,               -- 0 = mismo que limit_per_minute
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. Esquema de Módulos

### 5.1 Módulo: mod-planes-estudio (BD: `mod_planes_estudio`)

```sql
-- ============================================================
-- planes_estudio: Planes de estudio por programa
-- ============================================================
CREATE TABLE planes_estudio (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    nivel_formativo VARCHAR(100),               -- Técnico, Profesional Técnico, etc.
    creditos_totales INTEGER,
    horas_totales INTEGER,
    fecha_aprobacion DATE,
    resolucion_aprobacion VARCHAR(100),
    estado VARCHAR(20) DEFAULT 'activo',         -- activo, inactivo, reemplazado, borrador
    programa_id INTEGER NOT NULL,                -- FK lógica a mod-programas-estudio
    version VARCHAR(20),                         -- ej: "2024-01", "2027-01"
    vigencia_desde DATE,
    vigencia_hasta DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_planes_codigo ON planes_estudio(codigo);
CREATE INDEX idx_planes_programa ON planes_estudio(programa_id);
CREATE INDEX idx_planes_estado ON planes_estudio(estado);

-- ============================================================
-- modulos_formativos: Módulos formativos dentro de un plan
-- Cada plan tiene N módulos formativos (ej: 6-8 módulos por plan)
-- ============================================================
CREATE TABLE modulos_formativos (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER REFERENCES planes_estudio(id) ON DELETE CASCADE,
    codigo VARCHAR(50),
    nombre VARCHAR(255) NOT NULL,
    horas INTEGER,
    creditos INTEGER,
    orden INTEGER NOT NULL,                      -- Orden dentro del plan
    descripcion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_modulos_plan ON modulos_formativos(plan_id);

-- ============================================================
-- unidades_didacticas: Unidades didácticas (cursos/asignaturas)
-- ============================================================
CREATE TABLE unidades_didacticas (
    id SERIAL PRIMARY KEY,
    modulo_id INTEGER REFERENCES modulos_formativos(id) ON DELETE CASCADE,
    codigo VARCHAR(20) UNIQUE NOT NULL,          -- ej: "ENF101", "DSI201"
    nombre VARCHAR(255) NOT NULL,
    horas_teoricas INTEGER DEFAULT 0,
    horas_practicas INTEGER DEFAULT 0,
    horas_virtuales INTEGER DEFAULT 0,
    horas_presenciales INTEGER DEFAULT 0,
    creditos_teoricos NUMERIC(4,1) DEFAULT 0,
    creditos_practicos NUMERIC(4,1) DEFAULT 0,
    creditos_virtuales NUMERIC(4,1) DEFAULT 0,
    tipo VARCHAR(50),                            -- Teoría, Práctica, Teoría-Práctica
    ciclo_numero INTEGER CHECK (ciclo_numero BETWEEN 1 AND 6),
    orden INTEGER,                               -- Orden dentro del módulo
    prerrequisitos JSONB DEFAULT '[]',           -- [{"codigo": "ENF101", "tipo": "obligatorio"}]
    competencias_asociadas TEXT[],               -- Lista de códigos de competencias
    sumilla TEXT,                                -- Descripción breve del contenido
    horas_semanales NUMERIC(4,1),
    semanas INTEGER,
    estado VARCHAR(20) DEFAULT 'activa',         -- activa, inactiva, eliminada
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_unidades_codigo ON unidades_didacticas(codigo);
CREATE INDEX idx_unidades_modulo ON unidades_didacticas(modulo_id);
CREATE INDEX idx_unidades_ciclo ON unidades_didacticas(ciclo_numero);
CREATE INDEX idx_unidades_estado ON unidades_didacticas(estado);

-- ============================================================
-- capacidades: Capacidades por unidad didáctica
-- ============================================================
CREATE TABLE capacidades (
    id SERIAL PRIMARY KEY,
    unidad_id INTEGER REFERENCES unidades_didacticas(id) ON DELETE CASCADE,
    codigo VARCHAR(20),
    descripcion TEXT NOT NULL,
    orden INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_capacidades_unidad ON capacidades(unidad_id);

-- ============================================================
-- indicadores_logro: Indicadores de logro por capacidad
-- ============================================================
CREATE TABLE indicadores_logro (
    id SERIAL PRIMARY KEY,
    capacidad_id INTEGER REFERENCES capacidades(id) ON DELETE CASCADE,
    codigo VARCHAR(20),
    descripcion TEXT NOT NULL,
    orden INTEGER,
    criterio_evaluacion TEXT,                    -- Cómo se evalúa este indicador
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_indicadores_capacidad ON indicadores_logro(capacidad_id);

-- ============================================================
-- competencias: Competencias del programa
-- ============================================================
CREATE TABLE competencias (
    id SERIAL PRIMARY KEY,
    programa_id INTEGER NOT NULL,                -- FK lógica a mod-programas-estudio
    tipo VARCHAR(20) CHECK (tipo IN ('especifica', 'empleabilidad', 'basica')),
    codigo VARCHAR(20) UNIQUE NOT NULL,          -- UC1, CE1, CG1, etc.
    descripcion TEXT NOT NULL,
    nivel VARCHAR(20),                           -- inicial, intermedio, avanzado
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_competencias_codigo ON competencias(codigo);
CREATE INDEX idx_competencias_programa ON competencias(programa_id);

-- ============================================================
-- competencias_unidades: Relación N:M entre competencias y UDs
-- ============================================================
CREATE TABLE competencias_unidades (
    competencia_id INTEGER REFERENCES competencias(id) ON DELETE CASCADE,
    unidad_id INTEGER REFERENCES unidades_didacticas(id) ON DELETE CASCADE,
    nivel_logro VARCHAR(20),                     -- introductorio, intermedio, logrado
    PRIMARY KEY (competencia_id, unidad_id)
);
CREATE INDEX idx_comp_unidades_unidad ON competencias_unidades(unidad_id);
```

### 5.2 Módulo: mod-programas-estudio (BD: `mod_programas_estudio`)

```sql
-- ============================================================
-- programas_estudio: Programas de estudio del instituto
-- ============================================================
CREATE TABLE programas_estudio (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE NOT NULL,          -- ej: "DSI", "ENF", "MEC"
    nombre VARCHAR(255) NOT NULL,                -- "Desarrollo de Sistemas de Información"
    codigo_cnof VARCHAR(50),                     -- Código CNOF/MINEDU
    codigo_licenciamiento VARCHAR(50),           -- Código de licenciamiento institucional
    descripcion TEXT,
    duracion_periodos INTEGER DEFAULT 6,         -- 6 ciclos = 3 años
    duracion_anios INTEGER DEFAULT 3,
    creditos_totales INTEGER,
    horas_totales INTEGER,
    horas_presenciales INTEGER,
    horas_virtuales INTEGER,
    plan_estudio_activo_id INTEGER,              -- FK lógica a mod-planes-estudio (plan activo)
    modalidad VARCHAR(50) DEFAULT 'presencial',  -- presencial, semipresencial, virtual
    sector_economico VARCHAR(255),
    familia_productiva VARCHAR(255),
    estado VARCHAR(20) DEFAULT 'activo',         -- activo, inactivo, licenciado, cerrado
    fecha_licenciamiento DATE,
    resolucion_creacion VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_programas_codigo ON programas_estudio(codigo);
CREATE INDEX idx_programas_estado ON programas_estudio(estado);

-- ============================================================
-- periodos_academicos: Periodos académicos por programa
-- ============================================================
CREATE TABLE periodos_academicos (
    id SERIAL PRIMARY KEY,
    programa_id INTEGER REFERENCES programas_estudio(id) ON DELETE CASCADE,
    nombre VARCHAR(50) NOT NULL,                 -- "2025-I", "2025-II", "2026-0" (verano)
    codigo VARCHAR(20) UNIQUE NOT NULL,          -- "2025-I-DSI"
    ciclo_numero INTEGER CHECK (ciclo_numero BETWEEN 0 AND 6),  -- 0 = verano/intensivo
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    fecha_max_matricula DATE,
    fecha_max_retiro DATE,
    fecha_inicio_notas DATE,
    fecha_fin_notas DATE,
    fecha_publicacion_notas DATE,
    estado VARCHAR(20) DEFAULT 'planificado',    -- planificado, aperturado, activo, cerrado
    vacantes_disponibles INTEGER DEFAULT 40,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_periodos_programa ON periodos_academicos(programa_id);
CREATE INDEX idx_periodos_estado ON periodos_academicos(estado);
CREATE INDEX idx_periodos_fechas ON periodos_academicos(programa_id, fecha_inicio, fecha_fin);

-- ============================================================
-- programa_configuracion: Configuración académica por programa
-- ============================================================
CREATE TABLE programa_configuracion (
    id SERIAL PRIMARY KEY,
    programa_id INTEGER REFERENCES programas_estudio(id) ON DELETE CASCADE,
    periodo_id INTEGER REFERENCES periodos_academicos(id),
    creditos_minimos INTEGER DEFAULT 12,
    creditos_maximos INTEGER DEFAULT 24,
    nota_minima_aprobatoria NUMERIC(4,2) DEFAULT 13.00,
    nota_minima_suficiencia NUMERIC(4,2) DEFAULT 10.00,  -- Nota mínima para convalidación
    max_veces_llevar_ud INTEGER DEFAULT 3,      -- Máximo de veces que puede llevar una UD
    permite_matricula_extemporanea BOOLEAN DEFAULT false,
    dias_matricula_extemporanea INTEGER DEFAULT 0,
    requiere_aprobacion_director BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_prog_config ON programa_configuracion(programa_id, periodo_id);

-- ============================================================
-- programa_jerarquia: Jerarquía organizacional del programa
-- ============================================================
CREATE TABLE programa_jerarquia (
    id SERIAL PRIMARY KEY,
    programa_id INTEGER REFERENCES programas_estudio(id) ON DELETE CASCADE,
    jefe_unidad_id INTEGER,                      -- FK lógica a core_users
    director_id INTEGER,                         -- FK lógica a core_users
    secretario_id INTEGER,                       -- FK lógica a core_users
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_programa_jerarquia ON programa_jerarquia(programa_id);
```

### 5.3 Módulo: mod-estudiantes (BD: `mod_estudiantes`)

```sql
-- ============================================================
-- estudiantes: Datos maestros de estudiantes
-- ============================================================
CREATE TABLE estudiantes (
    id SERIAL PRIMARY KEY,
    codigo_estudiante VARCHAR(20) UNIQUE NOT NULL,  -- Código institucional (ej: "2025-001234")
    dni VARCHAR(15) UNIQUE NOT NULL,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    genero VARCHAR(20),                           -- Masculino, Femenino
    estado_civil VARCHAR(20),                     -- Soltero, Casado, Viudo, Divorciado
    nacionalidad VARCHAR(50) DEFAULT 'Peruana',
    lugar_nacimiento VARCHAR(150),                -- "Lima, Lima, Perú"

    -- Contacto
    email_institucional VARCHAR(100) UNIQUE,
    email_personal VARCHAR(100),
    telefono_movil VARCHAR(20),
    telefono_fijo VARCHAR(20),
    direccion_residencia TEXT,
    distrito VARCHAR(100),
    provincia VARCHAR(100),
    departamento VARCHAR(100),
    referencia_direccion TEXT,
    ubigeo VARCHAR(6),                            -- Código ubigeo de ubicación

    -- Información socioeconómica
    trabaja BOOLEAN DEFAULT false,
    lugar_trabajo VARCHAR(255),
    ingreso_mensual NUMERIC(10,2) DEFAULT 0,
    tipo_vivienda VARCHAR(50),                    -- propia, alquilada, familiar, otros
    tiene_internet BOOLEAN DEFAULT false,
    tiene_computadora BOOLEAN DEFAULT false,
    personas_dependientes INTEGER DEFAULT 0,

    -- Salud
    tipo_sangre VARCHAR(5),                       -- A+, A-, B+, B-, AB+, AB-, O+, O-
    seguro_salud VARCHAR(50),                     -- SIS, EsSalud, Privado, Ninguno
    alergias TEXT,
    condiciones_medicas TEXT,
    discapacidad BOOLEAN DEFAULT false,
    detalle_discapacidad TEXT,
    tipo_discapacidad VARCHAR(50),                -- física, visual, auditiva, intelectual, mental

    -- Información académica de ingreso
    colegio_procedencia VARCHAR(150),
    tipo_colegio VARCHAR(30),                     -- nacional, particular, parroquial
    anio_egreso_colegio INTEGER,
    modalidad_ingreso VARCHAR(50),                -- ordinario, primera_opcion, traslado_externo, titulado
    vacante_id INTEGER,                           -- FK lógica a modulo de admisión

    -- Estado académico
    estado_academico VARCHAR(30) DEFAULT 'postulante',
    -- postulante, admitido, regular, irregular, egresado, titulado, retirado, suspendido, fallecido

    -- Documentación
    doc_dni BOOLEAN DEFAULT false,
    doc_cert_estudios BOOLEAN DEFAULT false,
    doc_partida_nac BOOLEAN DEFAULT false,
    doc_foto BOOLEAN DEFAULT false,
    doc_recibo_servicio BOOLEAN DEFAULT false,
    doc_cv BOOLEAN DEFAULT false,
    observaciones_documentacion TEXT,

    -- Auditoría
    foto_url VARCHAR(255),
    observaciones TEXT,
    usuario_registro_id INTEGER,                   -- FK lógica a core_users
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_estudiantes_dni ON estudiantes(dni);
CREATE UNIQUE INDEX idx_estudiantes_codigo ON estudiantes(codigo_estudiante);
CREATE INDEX idx_estudiantes_estado ON estudiantes(estado_academico);
CREATE INDEX idx_estudiantes_nombres ON estudiantes USING gin (nombres gin_trgm_ops, apellidos gin_trgm_ops);
CREATE INDEX idx_estudiantes_email ON estudiantes(email_institucional) WHERE email_institucional IS NOT NULL;
CREATE INDEX idx_estudiantes_programa ON estudiantes(estado_academico) WHERE estado_academico IN ('admitido', 'regular', 'irregular');

-- ============================================================
-- historial_academico: Historial de periodos por estudiante
-- ============================================================
CREATE TABLE historial_academico (
    id SERIAL PRIMARY KEY,
    estudiante_id INTEGER REFERENCES estudiantes(id) ON DELETE CASCADE,
    programa_id INTEGER NOT NULL,                 -- FK lógica a mod-programas-estudio
    periodo_id INTEGER NOT NULL,                  -- FK lógica a periodos academicos
    estado VARCHAR(30) DEFAULT 'activo',          -- activo, completado, retirado, congelado
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_historial_estudiante ON historial_academico(estudiante_id);
CREATE INDEX idx_historial_periodo ON historial_academico(periodo_id);
CREATE UNIQUE INDEX idx_historial_uniq ON historial_academico(estudiante_id, programa_id, periodo_id);

-- ============================================================
-- estudiante_documentos: Documentos digitales del estudiante
-- ============================================================
CREATE TABLE estudiante_documentos (
    id SERIAL PRIMARY KEY,
    estudiante_id INTEGER REFERENCES estudiantes(id) ON DELETE CASCADE,
    tipo_documento VARCHAR(50) NOT NULL,           -- DNI, Certificado, Partida, Foto, etc.
    nombre_archivo VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    tamano_bytes INTEGER,
    mime_type VARCHAR(100),
    es_actual BOOLEAN DEFAULT true,
    subido_por INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_est_docs_estudiante ON estudiante_documentos(estudiante_id);

-- ============================================================
-- estudiante_observaciones: Historial de observaciones
-- ============================================================
CREATE TABLE estudiante_observaciones (
    id SERIAL PRIMARY KEY,
    estudiante_id INTEGER REFERENCES estudiantes(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL,                     -- academico, disciplinario, administrativo
    descripcion TEXT NOT NULL,
    registrado_por INTEGER,                        -- FK lógica a core_users
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_est_obs_estudiante ON estudiante_observaciones(estudiante_id);
```

### 5.4 Módulo: mod-matricula (BD: `mod_matricula`)

```sql
-- ============================================================
-- matriculas: Registro de matrículas por periodo
-- ============================================================
CREATE TABLE matriculas (
    id SERIAL PRIMARY KEY,
    estudiante_id INTEGER NOT NULL,              -- FK lógica a mod-estudiantes
    programa_id INTEGER NOT NULL,                -- FK lógica a mod-programas-estudio
    periodo_id INTEGER NOT NULL,                 -- FK lógica a periodos_academicos
    tipo_ingreso VARCHAR(50) DEFAULT 'ordinario', -- ordinario, traslado, reingreso, beca, extemporanea
    estado_matricula VARCHAR(30) DEFAULT 'pendiente',
    -- pendiente, confirmada, anulada, congelada, retirada
    creditos_matriculados INTEGER DEFAULT 0,
    creditos_aprobados INTEGER DEFAULT 0,
    creditos_desaprobados INTEGER DEFAULT 0,
    tiene_deuda BOOLEAN DEFAULT false,
    observaciones TEXT,
    usuario_registro_id INTEGER,                 -- FK lógica a core_users
    usuario_confirmacion_id INTEGER,             -- FK lógica a core_users
    fecha_registro TIMESTAMPTZ DEFAULT NOW(),
    fecha_confirmacion TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_matriculas_estudiante ON matriculas(estudiante_id);
CREATE INDEX idx_matriculas_periodo ON matriculas(periodo_id);
CREATE INDEX idx_matriculas_estado ON matriculas(estado_matricula);
CREATE UNIQUE INDEX idx_matricula_uniq ON matriculas(estudiante_id, periodo_id) WHERE estado_matricula NOT IN ('anulada', 'retirada');

-- ============================================================
-- matricula_detalle: Detalle de unidades matriculadas
-- ============================================================
CREATE TABLE matricula_detalle (
    id SERIAL PRIMARY KEY,
    matricula_id INTEGER REFERENCES matriculas(id) ON DELETE CASCADE,
    unidad_id INTEGER NOT NULL,                  -- FK lógica a mod-planes-estudio (unidades_didacticas)
    estado VARCHAR(30) DEFAULT 'activo',         -- activo, retirado, convalidado, exonerado
    tipo_matricula VARCHAR(20) DEFAULT 'regular', -- regular, convalidacion, repitente, adelanto
    nota_final NUMERIC(4,2),                     -- Nota final (opcional, referencial)
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_matricula_detalle_matricula ON matricula_detalle(matricula_id);
CREATE INDEX idx_matricula_detalle_unidad ON matricula_detalle(unidad_id);
CREATE UNIQUE INDEX idx_mat_det_uniq ON matricula_detalle(matricula_id, unidad_id);

-- ============================================================
-- matricula_historial_cambios: Trazabilidad de cambios en matrícula
-- ============================================================
CREATE TABLE matricula_historial_cambios (
    id SERIAL PRIMARY KEY,
    matricula_id INTEGER NOT NULL,
    campo_modificado VARCHAR(50) NOT NULL,
    valor_anterior TEXT,
    valor_nuevo TEXT,
    modificado_por INTEGER,                      -- FK lógica a core_users
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_mat_hist_matricula ON matricula_historial_cambios(matricula_id);

-- ============================================================
-- convalidaciones: Registro de convalidaciones de unidades
-- ============================================================
CREATE TABLE convalidaciones (
    id SERIAL PRIMARY KEY,
    estudiante_id INTEGER NOT NULL,              -- FK lógica a mod-estudiantes
    unidad_origen_id INTEGER NOT NULL,           -- UD de origen (de donde viene)
    programa_origen VARCHAR(255),                -- Institución/programa de origen
    unidad_destino_id INTEGER NOT NULL,          -- UD destino (la que se convalida)
    matricula_detalle_id INTEGER,                -- Detalle de matrícula asociado
    resolucion VARCHAR(100),
    fecha_convalidacion DATE,
    aprobado_por INTEGER,                        -- FK lógica a core_users
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_convalidaciones_estudiante ON convalidaciones(estudiante_id);
```

### 5.5 Módulo: mod-evaluacion (BD: `mod_evaluacion`) — FUTURO

```sql
-- ============================================================
-- evaluaciones: Registro de evaluaciones por unidad
-- ============================================================
CREATE TABLE evaluaciones (
    id SERIAL PRIMARY KEY,
    matricula_detalle_id INTEGER NOT NULL,       -- FK lógica a mod-matricula
    unidad_id INTEGER NOT NULL,                  -- FK lógica a mod-planes-estudio
    periodo_id INTEGER NOT NULL,                 -- FK lógica a mod-programas-estudio
    nota_final NUMERIC(4,2),                     -- Escala 0-20 (redondeado a 2 decimales)
    letra_nota VARCHAR(2),                       -- A, B, C, D (opcional, escala cualitativa)
    estado VARCHAR(20) DEFAULT 'pendiente',      -- pendiente, registrada, publicada, apelada, rectificada
    usuario_registro_id INTEGER,                 -- FK lógica a core_users
    usuario_publicacion_id INTEGER,
    fecha_registro TIMESTAMPTZ DEFAULT NOW(),
    fecha_publicacion TIMESTAMPTZ,
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_eval_matricula ON evaluaciones(matricula_detalle_id);
CREATE INDEX idx_eval_unidad ON evaluaciones(unidad_id);
CREATE INDEX idx_eval_periodo ON evaluaciones(periodo_id);
CREATE UNIQUE INDEX idx_eval_uniq ON evaluaciones(matricula_detalle_id, unidad_id);

-- ============================================================
-- evaluacion_detalle: Notas parciales que componen la nota final
-- ============================================================
CREATE TABLE evaluacion_detalle (
    id SERIAL PRIMARY KEY,
    evaluacion_id INTEGER REFERENCES evaluaciones(id) ON DELETE CASCADE,
    tipo_evaluacion VARCHAR(50) NOT NULL,         -- practica_calificada, examen_parcial, examen_final, trabajo_investigacion, participacion, otros
    nombre VARCHAR(100),                          -- "Práctica Calificada 1", "Examen Parcial"
    nota NUMERIC(4,2),
    peso NUMERIC(4,2),                            -- Porcentaje del peso (ej: 0.20 = 20%)
    fecha_evaluacion DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_eval_detalle_evaluacion ON evaluacion_detalle(evaluacion_id);

-- ============================================================
-- promedios: Promedios calculados por periodo
-- ============================================================
CREATE TABLE promedios (
    id SERIAL PRIMARY KEY,
    estudiante_id INTEGER NOT NULL,
    periodo_id INTEGER NOT NULL,
    programa_id INTEGER NOT NULL,
    promedio_general NUMERIC(4,2),               -- Promedio ponderado del periodo
    promedio_ponderado NUMERIC(4,2),             -- Promedio ponderado por créditos
    creditos_matriculados INTEGER DEFAULT 0,
    creditos_aprobados INTEGER DEFAULT 0,
    creditos_desaprobados INTEGER DEFAULT 0,
    uds_aprobadas INTEGER DEFAULT 0,
    uds_desaprobadas INTEGER DEFAULT 0,
    pct_aprobados NUMERIC(5,2),                  -- Porcentaje de créditos aprobados
    estado_promocion VARCHAR(30),                -- regular, irregular, repite, egresa
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_promedios_uniq ON promedios(estudiante_id, periodo_id, programa_id);
CREATE INDEX idx_promedios_estudiante ON promedios(estudiante_id);
CREATE INDEX idx_promedios_periodo ON promedios(periodo_id);

-- ============================================================
-- riesgo_academico: Alertas de riesgo académico
-- ============================================================
CREATE TABLE riesgo_academico (
    id SERIAL PRIMARY KEY,
    estudiante_id INTEGER NOT NULL,
    periodo_id INTEGER NOT NULL,
    tipo_riesgo VARCHAR(50) NOT NULL,             -- bajo_rendimiento, inasistencia, repitencia, abandono
    nivel_riesgo VARCHAR(20) NOT NULL,            -- bajo, medio, alto, critico
    indicadores JSONB,                            -- Métricas que generaron la alerta
    recomendacion TEXT,
    activo BOOLEAN DEFAULT true,
    creado_por INTEGER,                           -- NULL = generado automáticamente
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_riesgo_estudiante ON riesgo_academico(estudiante_id);
CREATE INDEX idx_riesgo_activo ON riesgo_academico(activo) WHERE activo = true;
```

### 5.6 Módulo: mod-gobierno (BD: `mod_gobierno`) — FUTURO

```sql
-- ============================================================
-- indicadores_gestion: Indicadores de gestión académica
-- ============================================================
CREATE TABLE indicadores_gestion (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE NOT NULL,           -- I01, I02, ...
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    tipo VARCHAR(50),                             -- eficiencia, eficacia, calidad, cobertura
    formula TEXT,                                 -- Descripción de la fórmula de cálculo
    periodicidad VARCHAR(20),                     -- mensual, bimestral, trimestral, semestral, anual
    meta NUMERIC(10,2),
    unidad_medida VARCHAR(50),                    -- porcentaje, numero, ratio
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- reportes: Reportes predefinidos del sistema
-- ============================================================
CREATE TABLE reportes (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    tipo VARCHAR(50),                             -- excel, pdf, csv, html
    query_definition JSONB,                       -- Definición parametrizada del reporte
    parametros JSONB,                             -- Parámetros requeridos [{nombre, tipo, requerido}]
    roles_permitidos TEXT[],                      -- Roles que pueden ejecutar este reporte
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 6. Matriz de Responsabilidad de Datos

| Entidad | Dueño (Módulo) | BD Propietaria | APIs CRUD | Leído por | Eventos que publica |
|---------|---------------|----------------|-----------|-----------|---------------------|
| Usuario | Core | `siga_core` | Core Auth | Core, todos los módulos | `user.created`, `user.updated` |
| Rol/Permiso | Core | `siga_core` | Core Admin | Core, todos los módulos | `role.assigned`, `role.revoked` |
| Programa Estudio | mod-programas-estudio | `mod_programas_estudio` | mod-programas | Core, mod-matricula, mod-planes | `program.created`, `program.updated` |
| Periodo Académico | mod-programas-estudio | `mod_programas_estudio` | mod-programas | mod-matricula, mod-evaluacion | `period.opened`, `period.closed` |
| Plan Estudio | mod-planes-estudio | `mod_planes_estudio` | mod-planes | mod-programas, mod-matricula, mod-evaluacion | `plan.published`, `plan.archived` |
| Módulo Formativo | mod-planes-estudio | `mod_planes_estudio` | mod-planes | mod-matricula | — |
| Unidad Didáctica | mod-planes-estudio | `mod_planes_estudio` | mod-planes | mod-matricula, mod-evaluacion | `ud.created`, `ud.updated` |
| Estudiante | mod-estudiantes | `mod_estudiantes` | mod-estudiantes | mod-matricula, mod-evaluacion, mod-reportes | `student.created`, `student.updated` |
| Matrícula | mod-matricula | `mod_matricula` | mod-matricula | mod-evaluacion, mod-reportes | `enrollment.confirmed`, `enrollment.cancelled` |
| Detalle Matrícula | mod-matricula | `mod_matricula` | mod-matricula | mod-evaluacion | `enrollment.detail.added` |
| Evaluación/Nota | mod-evaluacion | `mod_evaluacion` | mod-evaluacion | mod-reportes, mod-gobierno | `grade.published`, `grade.updated` |
| Promedio | mod-evaluacion | `mod_evaluacion` | mod-evaluacion | mod-reportes, mod-gobierno | `average.calculated` |
| Riesgo Académico | mod-evaluacion | `mod_evaluacion` | mod-evaluacion | mod-notificaciones | `risk.alert` |
| Reporte | mod-gobierno | `mod_gobierno` | mod-gobierno | Core, usuarios autorizados | — |
| Log Auditoría | Core | `siga_core` | Solo escritura | Core Admin | `audit.log.created` |

---

## 7. Relaciones entre Entidades (Modelo ER Lógico)

### 7.1 Diagrama Textual de Alto Nivel

```
Programa Estudio (mod-programas)
  │
  ├── Tiene muchos → Periodos Académicos
  ├── Tiene muchos → Planes de Estudio (mod-planes)
  │     │
  │     └── Tiene muchos → Módulos Formativos
  │           │
  │           └── Tiene muchas → Unidades Didácticas
  │                 │
  │                 ├── Tiene muchas → Capacidades
  │                 │     └── Tiene muchos → Indicadores de Logro
  │                 │
  │                 └── Tiene muchas → Competencias (N:M)
  │
  └── Configuración (1:1)

Estudiante (mod-estudiantes)
  │
  ├── Tiene muchos → Historial Académico (1:N)
  ├── Tiene muchos → Documentos (1:N)
  └── Tiene muchas → Matrículas (mod-matricula) (1:N)
        │
        └── Tiene muchos → Detalles de Matrícula (1:N)
              │
              └── Tiene una → Evaluación (mod-evaluacion) (1:1)
                    │
                    └── Tiene muchas → Notas Parciales (1:N)

Estudiante + Periodo → Promedios (mod-evaluacion)
```

### 7.2 Reglas de Negocio sobre Datos

| Regla | Descripción |
|-------|-------------|
| Unicidad de matrícula | Un estudiante no puede tener dos matrículas activas en el mismo periodo |
| Prerrequisitos | Una UD no puede ser matriculada si no se han aprobado sus prerrequisitos |
| Créditos mínimo/máximo | La suma de créditos de UDs matriculadas debe estar entre créditos_minimos y créditos_maximos del programa |
| Estado de estudiante | El estado académico del estudiante se actualiza según su rendimiento en el periodo anterior |
| Nota mínima | La nota_minima_aprobatoria se define por programa (default: 13.00) |
| Máximo de repitencias | Un estudiante puede cursar una UD máximo N veces (configurable, default: 3) |
| Promedio ponderado | Se calcula como Σ(nota_ud * creditos_ud) / Σ(creditos_ud) |
| Estado irregular | Un estudiante con menos del 60% de créditos aprobados en el periodo anterior es irregular |

### 7.3 Integridad Referencial entre Módulos

La integridad referencial entre entidades de diferentes módulos se garantiza mediante:

1. **Validación en API Gateway:** Antes de enrutar una solicitud, el Core puede validar la existencia de referencias consultando al módulo correspondiente
2. **Eventos de dominio:** Cuando una entidad es eliminada, el módulo propietario publica un evento para que los módulos dependientes actualicen sus registros
3. **Soft delete:** Las entidades raramente se eliminan físicamente; se marcan como inactivas
4. **Consistencia eventual:** Para operaciones asíncronas, se acepta consistencia eventual con reconciliación periódica

---

## 8. Migraciones y Versionamiento

### 8.1 Core (Alembic)

```bash
# Estructura de migraciones del Core
siga-core/
├── alembic/
│   ├── env.py                    # Configuración de Alembic
│   ├── script.py.mako            # Template para migraciones
│   └── versions/                 # Migraciones generadas
│       ├── 0001_initial_schema.py
│       ├── 0002_add_core_sessions.py
│       └── 0003_add_core_rate_limits.py
├── alembic.ini
└── requirements.txt

# Comandos
alembic revision --autogenerate -m "descripcion"
alembic upgrade head
alembic downgrade -1
alembic history
alembic current
```

**Convenciones de migraciones Core:**
- Archivo: `{revision_short}_{descripcion_snake_case}.py`
- Descripción en inglés para consistencia técnica
- Cada migración debe tener `upgrade()` y `downgrade()` implementados
- Las migraciones deben ser reversibles
- Una migración = un cambio lógico (no mezclar cambios no relacionados)

### 8.2 Módulos

Cada módulo gestiona sus propias migraciones. Opciones disponibles:

| Opción | Herramienta | Uso recomendado |
|--------|------------|-----------------|
| A | Alembic (recomendado) | Producción |
| B | SQLAlchemy `create_all()` | Desarrollo rápido |
| C | Scripts SQL versionados | Equipos que prefieren SQL puro |

**Estructura recomendada (Opción A):**

```bash
mod-planes-estudio/
├── alembic/
│   ├── env.py
│   ├── script.py.mako
│   └── versions/
│       ├── 0001_initial_planes.py
│       ├── 0002_add_competencias.py
│       └── 0003_add_indicadores_logro.py
├── alembic.ini
└── requirements.txt
```

**Opción C — Scripts SQL versionados:**

```bash
mod-estudiantes/
├── migrations/
│   ├── V001__initial_schema.sql
│   ├── V002__add_documentos_table.sql
│   ├── V003__add_observaciones_index.sql
│   └── V004__add_ubigeo_column.sql
```

### 8.3 Política de Versionamiento de Esquemas

| Cambio | Tipo | Acción |
|--------|------|--------|
| Nueva tabla | Menor | Nueva migración |
| Nueva columna nullable | Menor | Nueva migración |
| Nueva columna NOT NULL con default | Menor | Nueva migración |
| Renombrar columna | Mayor | Migración + actualizar código |
| Eliminar columna | Mayor | Mark como deprecated → migración futura |
| Eliminar tabla | Mayor | Soft delete primero → migración futura |
| Cambiar tipo de columna | Mayor | Migración con conversión de datos |

---

## 9. Backup y Recuperación

### 9.1 Estrategia

```bash
# Backup completo (diario)
pg_dump -h localhost -U siga -Fc siga_core > /backups/siga_core_$(date +%Y%m%d).dump

# Backup por módulo (diario)
pg_dump -h localhost -U siga -Fc mod_planes_estudio > /backups/mod_planes_estudio_$(date +%Y%m%d).dump

# Restauración
pg_restore -h localhost -U siga -d siga_core /backups/siga_core_20260625.dump
```

### 9.2 Política de Retención

| Tipo | Frecuencia | Retención | Almacenamiento |
|------|-----------|-----------|---------------|
| Backup diario | Cada 24h (02:00 AM) | 7 días | Local + S3 |
| Backup semanal | Cada domingo 02:00 AM | 4 semanas | Local + S3 |
| Backup mensual | 1ro de cada mes 02:00 AM | 12 meses | Local + S3 + Archivado |
| Backup anual | 1ro de enero 02:00 AM | 5 años | Archivado en frío |

### 9.3 Pruebas de Restauración

- **Frecuencia:** Mensual
- **Procedimiento:** Restaurar backup en entorno de pruebas, validar integridad, reportar resultados
- **Responsable:** Administrador de Base de Datos

### 9.4 Disaster Recovery

```yaml
RTO (Recovery Time Objective): 4 horas
RPO (Recovery Point Objective): 24 horas (pérdida máxima de 1 día)
```

---

## 10. Consideraciones Técnicas Adicionales

### 10.1 Uso de JSONB

JSONB se utiliza para:
- Metadatos extensibles (evitar EAV anti-pattern)
- Prerrequisitos flexibles de unidades didácticas
- Configuraciones dinámicas
- Resultados de compliance

**No usar JSONB para:**
- Datos que necesitan consultas JOIN frecuentes
- Datos que requieren integridad referencial
- Datos que son consultados con filtros complejos (preferir columnas indexadas)

### 10.2 Estrategia de Índices

- Índices en todas las FK lógicas (aunque no tengan constraint REFERENCES)
- Índices en columnas usadas en WHERE y ORDER BY frecuentes
- Índices compuestos para consultas multi-columna
- Índices parciales para tablas grandes donde solo un subconjunto es activo
- Índices trigram (pg_trgm) para búsquedas de texto parcial
- EVITAR índices redundantes (cubiertos por otros índices compuestos)

### 10.3 Política de Conexiones

```yaml
Core:
  max_connections: 50
  pool_size: 10
  pool_overflow: 5

Cada módulo:
  max_connections: 30
  pool_size: 5
  pool_overflow: 3

Total estimado: 50 + (11 módulos * 8) ≈ 138 conexiones pico
```

---

## 11. Historial de Cambios

| Versión | Fecha | Autor | Cambios |
|---------|-------|-------|---------|
| 1.0.0 | 2026-06-26 | Arquitectura SIGA | Versión inicial del modelo de datos global |

---

> **Documento generado como parte de la arquitectura del Sistema Integrado de Gestión Académica (SIGA)**
> **IESTP — Instituto de Educación Superior Tecnológico Público**
