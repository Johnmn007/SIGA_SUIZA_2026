#!/bin/sh
set -e

# Build DB URL for Alembic
export DB_URL="postgresql+asyncpg://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

echo "Running database migrations..."
alembic upgrade head

echo "Starting SIGA Core..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
