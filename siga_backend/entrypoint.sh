#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL is required but not set." >&2
    exit 1
fi

export DB_URL="$DATABASE_URL"

if [ "$SKIP_MIGRATIONS" != "true" ]; then
    echo "Running database migrations..."
    if ! alembic upgrade head; then
        echo "ERROR: Database migrations failed. Cannot start application." >&2
        exit 1
    fi
    echo "Migrations applied successfully."
fi

if [ "$#" -eq 0 ]; then
    exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
else
    exec "$@"
fi