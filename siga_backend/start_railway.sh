#!/bin/sh
set -e

# Normaliza la URL de PostgreSQL que entrega Railway.
if [ -n "$DATABASE_URL" ]; then
    case "$DATABASE_URL" in
        postgres://*) export DATABASE_URL="postgresql://${DATABASE_URL#postgres://}" ;;
    esac
fi

# Alembic usa DB_URL; el resto de la aplicación usa DATABASE_URL o las DB_*.
if [ -z "$DB_URL" ]; then
    if [ -n "$DATABASE_URL" ]; then
        export DB_URL="$DATABASE_URL"
    else
        export DB_URL="postgresql+asyncpg://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
    fi
fi

export ENABLE_NATS="${ENABLE_NATS:-false}"
export SKIP_MIGRATIONS="${SKIP_MIGRATIONS:-false}"
export RUN_MODULES="${RUN_MODULES:-true}"

# Los módulos viven en el mismo contenedor y se comunican por loopback.
# Se pueden sobrescribir estas variables para desplegarlos como servicios separados.
export SIGA_MODULE_USUARIOS_URL="${SIGA_MODULE_USUARIOS_URL:-http://127.0.0.1:8001}"
export SIGA_MODULE_PLANES_ESTUDIO_URL="${SIGA_MODULE_PLANES_ESTUDIO_URL:-http://127.0.0.1:8002}"
export SIGA_MODULE_PROGRAMAS_ESTUDIO_URL="${SIGA_MODULE_PROGRAMAS_ESTUDIO_URL:-http://127.0.0.1:8005}"
export SIGA_MODULE_GESTION_ACADEMICA_URL="${SIGA_MODULE_GESTION_ACADEMICA_URL:-http://127.0.0.1:8006}"
export SIGA_MODULE_AUDITORIA_URL="${SIGA_MODULE_AUDITORIA_URL:-http://127.0.0.1:8007}"
export SIGA_MODULE_EVALUACION_URL="${SIGA_MODULE_EVALUACION_URL:-http://127.0.0.1:8008}"
export SIGA_MODULE_ADMISION_URL="${SIGA_MODULE_ADMISION_URL:-http://127.0.0.1:8009}"
export PROGRAMAS_MODULE_URL="${PROGRAMAS_MODULE_URL:-http://127.0.0.1:8005}"
export PLANES_MODULE_URL="${PLANES_MODULE_URL:-http://127.0.0.1:8002}"

if [ "$SKIP_MIGRATIONS" != "true" ]; then
    echo "Running database migrations..."
    attempts=0
    until alembic upgrade head; do
        attempts=$((attempts + 1))
        if [ "$attempts" -ge 10 ]; then
            echo "WARNING: alembic upgrade head failed after $attempts attempts - starting without migrations."
            break
        fi
        echo "Migrations failed (attempt $attempts/10). Retrying in 3s..."
        sleep 3
    done
fi

MODULE_PIDS=""

start_module() {
    name="$1"
    port="$2"
    dir="/app/modules/$name"

    echo "Starting $name on 127.0.0.1:$port"
    (
        cd "$dir"
        PORT="$port" exec uvicorn main:app --host 127.0.0.1 --port "$port"
    ) &
    MODULE_PIDS="$MODULE_PIDS $!"
}

if [ "$RUN_MODULES" = "true" ]; then
    start_module mod-usuarios 8001
    start_module mod-planes-estudio 8002
    start_module mod-programas-estudio 8005
    start_module mod-gestion-academica 8006
    start_module mod-auditoria 8007
    start_module mod-evaluacion 8008
    start_module mod-admision 8009

    echo "Waiting for modules to become healthy..."
    python - <<'PY'
import time
import urllib.request

ports = [8001, 8002, 8005, 8006, 8007, 8008, 8009]
pending = set(ports)
deadline = time.time() + 90

while pending and time.time() < deadline:
    for port in list(pending):
        try:
            with urllib.request.urlopen(f"http://127.0.0.1:{port}/health", timeout=2) as response:
                if response.status == 200:
                    pending.discard(port)
                    print(f"Module on port {port} is healthy")
        except Exception:
            pass
    if pending:
        time.sleep(1)

if pending:
    print(f"WARNING: modules still not healthy: {sorted(pending)}")
else:
    print("All modules are healthy")
PY
fi

cleanup() {
    for pid in $MODULE_PIDS; do
        kill "$pid" 2>/dev/null || true
    done
}
trap cleanup INT TERM

echo "Starting SIGA Core on 0.0.0.0:${PORT:-8000}"
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
