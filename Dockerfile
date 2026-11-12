# Dockerfile de despliegue para Railway.
# Se construye desde la raíz del repositorio, pero solo copia siga_backend/
# (ver .dockerignore). También sirve si el servicio usa Root Directory =
# siga_backend y el Dockerfile de esa carpeta.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# psql se usa para esperar/inicializar la base de datos en Railway.
RUN apt-get update \
    && apt-get install -y --no-install-recommends postgresql-client \
    && rm -rf /var/lib/apt/lists/*

COPY siga_backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY siga_backend/ .

RUN chmod +x entrypoint.sh start_railway.sh

EXPOSE 8000

ENTRYPOINT ["sh", "./entrypoint.sh"]
