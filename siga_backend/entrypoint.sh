#!/bin/sh
set -e

# Build DB URL for Alembic
export DB_URL="postgresql+asyncpg://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

# Only run migrations for siga-core (microservices skip via SKIP_MIGRATIONS)
if [ "$SKIP_MIGRATIONS" != "true" ]; then
    echo "Running database migrations..."
    alembic upgrade head
else
    echo "Skipping migrations (SKIP_MIGRATIONS=true)"
fi

if [ "$#" -eq 0 ]; then
    echo "Starting SIGA Core con Hot Reload..."
    exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
else
    echo "Starting Module with command: $@"
    exec "$@"
fi
