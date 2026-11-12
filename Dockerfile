FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY siga_backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY siga_backend /app

RUN chmod +x /app/entrypoint.sh /app/start_railway.sh

EXPOSE 8000

CMD ["sh", "./start_railway.sh"]
