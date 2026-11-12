#!/bin/sh
# Arranque "all-in-one" para Railway: Core + los 7 modulos en un solo contenedor.
# El Core queda expuesto en $PORT (Railway lo inyecta) y los modulos escuchan
# solo en 127.0.0.1 en puertos internos.
set -e

log() {
    echo "[railway] $*"
}

# ---------------------------------------------------------------------------
# 1. URL de base de datos
# ---------------------------------------------------------------------------
if [ -z "${DB_URL:-}" ]; then
    if [ -n "${DATABASE_URL:-}" ]; then
        DB_URL="$DATABASE_URL"
    else
        DB_URL="postgresql://${DB_USER:-postgres}:${DB_PASSWORD:-}@${DB_HOST:-localhost}:${DB_PORT:-5432}/${DB_NAME:-siga_core}"
    fi
    export DB_URL
fi

# psql no entiende el driver de SQLAlchemy.
PSQL_URL="$DB_URL"
case "$PSQL_URL" in
    postgresql+asyncpg://*) PSQL_URL="postgresql://${PSQL_URL#postgresql+asyncpg://}" ;;
    postgresql+psycopg://*) PSQL_URL="postgresql://${PSQL_URL#postgresql+psycopg://}" ;;
    postgres://*) PSQL_URL="postgresql://${PSQL_URL#postgres://}" ;;
esac

# ---------------------------------------------------------------------------
# 2. Esperar a PostgreSQL
# ---------------------------------------------------------------------------
log "Esperando a PostgreSQL..."
intentos=0
until psql "$PSQL_URL" -c "SELECT 1" >/dev/null 2>&1; do
    intentos=$((intentos + 1))
    if [ "$intentos" -ge 60 ]; then
        log "ERROR: PostgreSQL no respondio despues de 120 segundos."
        exit 1
    fi
    sleep 2
done
log "PostgreSQL disponible."

# ---------------------------------------------------------------------------
# 3. Inicializar esquema / migraciones
# ---------------------------------------------------------------------------
has_table() {
    psql "$PSQL_URL" -tAc "SELECT to_regclass('public.$1') IS NOT NULL" 2>/dev/null | tr -d '[:space:]'
}

if [ "${AUTO_INIT_DB:-true}" = "true" ]; then
    if [ "$(has_table estudiantes)" != "t" ]; then
        if [ -f /app/db/schema.sql ]; then
            log "Esquema de negocio no encontrado. Aplicando /app/db/schema.sql..."
            psql "$PSQL_URL" -v ON_ERROR_STOP=1 -f /app/db/schema.sql
            log "Esquema aplicado. Marcando Alembic en head..."
            alembic stamp head
        else
            log "ADVERTENCIA: no existe /app/db/schema.sql; solo se aplicaran migraciones."
        fi
    else
        if [ "$(has_table alembic_version)" != "t" ]; then
            log "Base existente sin alembic_version. Marcando en head..."
            alembic stamp head
        elif [ "${SKIP_MIGRATIONS:-false}" != "true" ]; then
            log "Aplicando migraciones Alembic..."
            alembic upgrade head
        fi
    fi
fi

# ---------------------------------------------------------------------------
# 4. URLs internas de los modulos para el Core
# ---------------------------------------------------------------------------
export SIGA_MODULE_USUARIOS_URL="http://127.0.0.1:18001"
export SIGA_MODULE_PLANES_ESTUDIO_URL="http://127.0.0.1:18002"
export SIGA_MODULE_PROGRAMAS_ESTUDIO_URL="http://127.0.0.1:18005"
export SIGA_MODULE_GESTION_ACADEMICA_URL="http://127.0.0.1:18006"
export SIGA_MODULE_AUDITORIA_URL="http://127.0.0.1:18007"
export SIGA_MODULE_EVALUACION_URL="http://127.0.0.1:18008"
export SIGA_MODULE_ADMISION_URL="http://127.0.0.1:18009"

# Dependencias entre modulos (gestion academica consulta programas/planes).
export PROGRAMAS_MODULE_URL="http://127.0.0.1:18005"
export PLANES_MODULE_URL="http://127.0.0.1:18002"

# ---------------------------------------------------------------------------
# 5. Arrancar modulos
# ---------------------------------------------------------------------------
start_module() {
    module="$1"
    port="$2"
    log "Iniciando ${module} en 127.0.0.1:${port}"
    (cd "/app/modules/${module}" && exec uvicorn main:app --host 127.0.0.1 --port "$port") &
}

start_module mod-usuarios 18001
start_module mod-planes-estudio 18002
start_module mod-programas-estudio 18005
start_module mod-gestion-academica 18006
start_module mod-auditoria 18007
start_module mod-evaluacion 18008
start_module mod-admision 18009

wait_for_health() {
    module="$1"
    port="$2"
    intentos=0
    while [ "$intentos" -lt 60 ]; do
        if python -c "import sys,urllib.request; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:${port}/health', timeout=1).getcode() == 200 else 1)" 2>/dev/null; then
            log "${module} listo."
            return 0
        fi
        intentos=$((intentos + 1))
        sleep 1
    done
    log "ADVERTENCIA: ${module} no respondio en 60s. El Core lo marcara offline."
    return 1
}

wait_for_health mod-usuarios 18001 || true
wait_for_health mod-planes-estudio 18002 || true
wait_for_health mod-programas-estudio 18005 || true
wait_for_health mod-gestion-academica 18006 || true
wait_for_health mod-auditoria 18007 || true
wait_for_health mod-evaluacion 18008 || true
wait_for_health mod-admision 18009 || true

# ---------------------------------------------------------------------------
# 6. Arrancar el Core (unico puerto publico)
# ---------------------------------------------------------------------------
log "Iniciando SIGA Core en 0.0.0.0:${PORT:-8000}"
exec uvicorn app.main:app \
    --host 0.0.0.0 \
    --port "${PORT:-8000}" \
    --proxy-headers \
    --forwarded-allow-ips='*'
