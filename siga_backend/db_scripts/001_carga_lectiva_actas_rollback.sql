-- ==============================================================================
-- Reversión de Migración 001: Eliminación de columnas de actas en carga_lectiva
-- Archivo: siga_backend/db_scripts/001_carga_lectiva_actas_rollback.sql
-- ==============================================================================
--
-- Propósito:
-- Restaura el esquema original de la tabla carga_lectiva eliminando las 4 columnas
-- agregadas por la migración 001 (fecha_limite_notas, acta_cerrada, acta_cerrada_at, acta_cerrada_por).
--
-- ADVERTENCIA:
-- Este script es destructivo para los metadatos de cierre de actas existentes en la base de datos.
-- Solo debe ejecutarse en procedimientos de reversión planificada.
--
-- Idempotencia:
-- Utiliza 'DROP COLUMN IF EXISTS' para asegurar que pueda ejecutarse de forma segura
-- incluso si alguna columna ya fue eliminada previamente.
-- ==============================================================================

ALTER TABLE carga_lectiva
    DROP COLUMN IF EXISTS fecha_limite_notas,
    DROP COLUMN IF EXISTS acta_cerrada,
    DROP COLUMN IF EXISTS acta_cerrada_at,
    DROP COLUMN IF EXISTS acta_cerrada_por;
