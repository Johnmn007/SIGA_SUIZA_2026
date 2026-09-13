FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# curl: lo usan los healthchecks de compose y el diagnostico manual
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Capa de dependencias aparte: solo se invalida si cambia requirements.txt
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Usuario sin privilegios
RUN useradd --create-home --uid 10001 siga \
    && chown -R siga:siga /app
USER siga

EXPOSE 8000

ENTRYPOINT ["sh", "./entrypoint.sh"]
