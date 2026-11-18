#!/bin/sh
set -e

echo "=========================================="
echo "🚀 Iniciando SIGA Backend (Railway)"
echo "=========================================="

PORT="${PORT:-8000}"
export PORT
echo "📡 Puerto principal: $PORT"

# Ejecutar migraciones de base de datos
if [ -n "$DATABASE_URL" ]; then
    echo "📦 DATABASE_URL detectada de Railway."
    export DB_URL="$DATABASE_URL"
fi

if [ "$SKIP_MIGRATIONS" != "true" ]; then
    echo "🔄 Ejecutando migraciones de base de datos..."
    alembic upgrade head || echo "⚠️ Alembic upgrade head falló — continuando sin migraciones forzadas."
fi

# ✅ SIN MICROSERVICES INLINE en Railway
# Cada módulo debe desplegarse como servicio independiente en Railway.
# El Core Gateway proxifica requests a los módulos via /api/{module_name}/*
# si están configurados. Si no, el Core funciona como aplicación única.

echo "⚙️ Iniciando Core Gateway..."
exec python -m uvicorn app.main:app --host 0.0.0.0 --port "$PORT"