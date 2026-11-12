-- ==============================================================================
-- Migración 001: Soporte para Cierre de Actas y Plazos de Calificación en carga_lectiva
-- Archivo: siga_backend/db_scripts/001_carga_lectiva_actas.sql
-- ==============================================================================
--
-- Propósito:
-- Permite al Coordinador de Programa gestionar el ciclo de vida del acta de evaluación
-- por cada unidad didáctica y periodo académico asignados en la carga lectiva:
--   1. fecha_limite_notas: Fecha límite de ingreso de notas establecida por el coordinador.
--      NULL indica que no existe fecha límite configurada (comportamiento por defecto).
--   2. acta_cerrada: Bandera booleana que indica si el acta fue oficializada y cerrada.
--      Por defecto es FALSE para no bloquear registros preexistentes ni cargas activas.
--   3. acta_cerrada_at: Marca de tiempo (TIMESTAMP) que audita el momento exacto del cierre.
--   4. acta_cerrada_por: ID de usuario (core_users) del coordinador o administrador que ejecutó el cierre.
--
-- Idempotencia:
-- El script utiliza 'ADD COLUMN IF NOT EXISTS' para permitir ejecuciones repetidas
-- sin generar errores ni alterar datos existentes en la tabla carga_lectiva.
-- ==============================================================================

ALTER TABLE carga_lectiva
    ADD COLUMN IF NOT EXISTS fecha_limite_notas DATE NULL,
    ADD COLUMN IF NOT EXISTS acta_cerrada BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS acta_cerrada_at TIMESTAMP WITHOUT TIME ZONE NULL,
    ADD COLUMN IF NOT EXISTS acta_cerrada_por INTEGER NULL;
