#!/bin/sh
set -e

# Build DB URL for Alembic
export DB_URL="postgresql+asyncpg://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

echo "Running database migrations..."
if alembic upgrade head; then
    echo "Migrations applied successfully."
else
    echo "WARNING: alembic upgrade head failed — starting without migrations."
fi

if [ "$#" -eq 0 ]; then
    echo "Starting SIGA Core con Hot Reload..."
    exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
else
    echo "Starting Module with command: $@"
    exec "$@"
fi