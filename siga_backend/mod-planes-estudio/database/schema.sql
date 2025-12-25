-- Tabla de Planes de Estudio
CREATE TABLE IF NOT EXISTS planes_estudio (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    nivel_formativo VARCHAR(100) NOT NULL,
    total_horas INTEGER NOT NULL,
    total_creditos INTEGER NOT NULL,
    modalidad VARCHAR(50) NOT NULL,
    sector_economico VARCHAR(100),
    familia_productiva VARCHAR(100),
    actividad_economica VARCHAR(100),
    perfil_egreso TEXT,
    estado VARCHAR(20) DEFAULT 'activo',
    version VARCHAR(20) DEFAULT '1.0',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Módulos
CREATE TABLE IF NOT EXISTS modulos (
    id SERIAL PRIMARY KEY,
    plan_estudio_id INTEGER REFERENCES planes_estudio(id),
    nombre VARCHAR(255) NOT NULL,
    numero INTEGER NOT NULL,
    descripcion TEXT,
    competencias_tecnicas JSONB,
    competencias_empleabilidad JSONB,
    creditos_tecnicos INTEGER DEFAULT 0,
    creditos_empleabilidad INTEGER DEFAULT 0,
    creditos_esrt INTEGER DEFAULT 0,
    horas_tecnicas INTEGER DEFAULT 0,
    horas_empleabilidad INTEGER DEFAULT 0,
    horas_esrt INTEGER DEFAULT 0,
    estado VARCHAR(20) DEFAULT 'activo'
);

-- Tabla de Unidades Didácticas
CREATE TABLE IF NOT EXISTS unidades_didacticas (
    id SERIAL PRIMARY KEY,
    modulo_id INTEGER REFERENCES modulos(id),
    nombre VARCHAR(255) NOT NULL,
    periodo_academico VARCHAR(10) NOT NULL,
    creditos_teoricos INTEGER DEFAULT 0,
    creditos_practicos INTEGER DEFAULT 0,
    horas_teoricas INTEGER DEFAULT 0,
    horas_practicas INTEGER DEFAULT 0,
    tipo VARCHAR(20) NOT NULL,
    competencias_asociadas JSONB,
    perfil_docente TEXT,
    estado VARCHAR(20) DEFAULT 'activo'
);

-- Tabla de Competencias
CREATE TABLE IF NOT EXISTS competencias (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE NOT NULL,
    tipo VARCHAR(20) NOT NULL,
    descripcion TEXT NOT NULL,
    unidad_competencia TEXT,
    ambitos_desempenio JSONB,
    estado VARCHAR(20) DEFAULT 'activo'
);

-- Tabla de Capacidades
CREATE TABLE IF NOT EXISTS capacidades (
    id SERIAL PRIMARY KEY,
    competencia_id INTEGER REFERENCES competencias(id),
    codigo VARCHAR(20) UNIQUE NOT NULL,
    tipo VARCHAR(20) NOT NULL,
    verbo VARCHAR(100) NOT NULL,
    objeto TEXT NOT NULL,
    condicion TEXT,
    contenidos JSONB,
    indicadores_logro JSONB,
    estado VARCHAR(20) DEFAULT 'activo'
);

