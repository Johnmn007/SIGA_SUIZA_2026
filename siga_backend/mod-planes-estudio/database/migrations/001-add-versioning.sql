-- Migración: Agregar versionado a planes de estudio
-- Fecha: 2024
-- Descripción: Agrega campos para manejar múltiples versiones de planes

-- Agregar nuevas columnas para versionado
ALTER TABLE planes_estudio 
ADD COLUMN codigo_base VARCHAR(50),
ADD COLUMN version VARCHAR(20),
ADD COLUMN estado_version VARCHAR(20) DEFAULT 'vigente',
ADD COLUMN vigente_desde DATE,
ADD COLUMN vigente_hasta DATE,
ADD COLUMN fecha_retiro DATE,
ADD COLUMN version_anterior_id INTEGER REFERENCES planes_estudio(id);

-- Actualizar datos existentes con valores por defecto
UPDATE planes_estudio SET 
    codigo_base = 'J2662-3',
    version = '2024',
    estado_version = 'vigente',
    vigente_desde = CURRENT_DATE,
    codigo_completo = codigo
WHERE codigo_base IS NULL;

-- Crear índice para búsquedas por código base y versión
CREATE INDEX IF NOT EXISTS idx_planes_codigo_base_version 
ON planes_estudio(codigo_base, version);

-- Crear índice para búsquedas de planes vigentes
CREATE INDEX IF NOT EXISTS idx_planes_estado_vigente 
ON planes_estudio(estado_version) 
WHERE estado_version = 'vigente';

-- Comentarios descriptivos para las nuevas columnas
COMMENT ON COLUMN planes_estudio.codigo_base IS 'Identificador base del plan (ej: J2662-3)';
COMMENT ON COLUMN planes_estudio.version IS 'Versión del plan (ej: 2023, 2024)';
COMMENT ON COLUMN planes_estudio.estado_version IS 'Estado de la versión: borrador, vigente, historico';
COMMENT ON COLUMN planes_estudio.vigente_desde IS 'Fecha desde cuando esta versión está vigente';
COMMENT ON COLUMN planes_estudio.vigente_hasta IS 'Fecha hasta cuando acepta nuevos estudiantes';
COMMENT ON COLUMN planes_estudio.fecha_retiro IS 'Fecha cuando el último estudiante egresa';
COMMENT ON COLUMN planes_estudio.version_anterior_id IS 'ID de la versión anterior que reemplaza';

-- Verificar que la migración se aplicó correctamente
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'planes_estudio' AND column_name = 'codigo_base'
    ) THEN
        RAISE NOTICE '✅ Migración de versionado aplicada exitosamente';
    ELSE
        RAISE EXCEPTION '❌ Error en migración de versionado';
    END IF;
END $$;