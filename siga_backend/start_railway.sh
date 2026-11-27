#!/bin/sh
set -e

echo "=========================================="
echo "🚀 Iniciando SIGA Backend (Railway)"
echo "=========================================="

PORT="${PORT:-8000}"
export PORT
echo "📡 Puerto principal: $PORT"

cleanup() {
    echo "🛑 Deteniendo servicios internos..."
    kill 0 2>/dev/null || true
    exit 0
}
trap cleanup EXIT INT TERM

if [ -n "$DATABASE_URL" ]; then
    echo "📦 DATABASE_URL detectada de Railway."
    export DB_URL="$DATABASE_URL"
fi

if [ "$SKIP_MIGRATIONS" != "true" ]; then
    echo "🔄 Ejecutando migraciones de base de datos..."
    alembic upgrade head || echo "⚠️ Alembic upgrade head falló o fue omitido — continuando..."
fi

export SIGA_MODULE_USUARIOS_URL="http://127.0.0.1:8001"
export SIGA_MODULE_PLANES_ESTUDIO_URL="http://127.0.0.1:8002"
export SIGA_MODULE_PROGRAMAS_ESTUDIO_URL="http://127.0.0.1:8005"
export SIGA_MODULE_GESTION_ACADEMICA_URL="http://127.0.0.1:8006"
export SIGA_MODULE_AUDITORIA_URL="http://127.0.0.1:8007"
export SIGA_MODULE_EVALUACION_URL="http://127.0.0.1:8008"
export SIGA_MODULE_ADMISION_URL="http://127.0.0.1:8009"

echo "⚙️ Levantando 7 microservicios internos..."
# Uno por uno: cada módulo crea sus tablas al arrancar y, en una base nueva, hacerlo en
# paralelo choca ("duplicate key ... pg_type_typname_nsp_index") y deja tablas sin crear.
iniciar_modulo() {
    python -m uvicorn main:app --host 127.0.0.1 --port "$1" --app-dir "modules/$2" &
    intentos=0
    until python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:$1/health', timeout=2)" >/dev/null 2>&1 || [ "$intentos" -ge 60 ]; do
        intentos=$((intentos + 1))
        sleep 1
    done
    echo "   ✅ $2 listo en el puerto $1"
}
iniciar_modulo 8001 mod-usuarios
iniciar_modulo 8002 mod-planes-estudio
iniciar_modulo 8005 mod-programas-estudio
iniciar_modulo 8006 mod-gestion-academica
iniciar_modulo 8007 mod-auditoria
iniciar_modulo 8008 mod-evaluacion
iniciar_modulo 8009 mod-admision

echo "🌐 Iniciando Core Gateway en 0.0.0.0:$PORT..."
exec python -m uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
