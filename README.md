# SIGA - Sistema Integrado de Gestión Académica

Este es el repositorio principal del Sistema Integrado de Gestión Académica (SIGA) para el Instituto de Educación Superior Tecnológico Público (IESTP).

Toda la documentación arquitectónica, técnica y de negocio oficial se encuentra centralizada en la carpeta `docs/`.

👉 **[Ver Documentación Principal (Índice Maestro)](docs/00-INDICE.md)**

Para conocer el estado actual y los siguientes pasos, revisa el [Informe de Estado](_estado.md).

## Despliegue en producción

- **Backend:** Railway (Core + 7 módulos en un solo servicio).
- **Frontend:** Vercel.

👉 **[Guía de despliegue Railway + Vercel](DEPLOY_RAILWAY_VERCEL.md)**

## Levantar todo con Docker

Requisitos: Docker Desktop encendido.

```powershell
# 1. Crear el archivo de variables (solo la primera vez)
copy .env.example .env

# 2. Construir y levantar todos los servicios
docker compose up --build -d

# 3. Ver el estado
docker compose ps
```

La primera vez, el contenedor `postgres` crea la base `siga_core` y restaura
automáticamente el dump `backup_siga_core_pre_reset_20261102.sql`.

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:5173 |
| API / Swagger | http://localhost:8000/docs |
| Core health | http://localhost:8000/health |
| PostgreSQL (pgAdmin/DBeaver) | `localhost:5433`, usuario `postgres`, clave la de `.env` |

Usuario de prueba: `admin@siga.edu` / `admin123`.

### Comandos útiles

```powershell
docker compose logs -f siga-core      # logs del gateway
docker compose restart siga-core      # reiniciar un servicio
docker compose down                   # detener (los datos se conservan)
docker compose down -v                # detener y borrar la BD (restaura el dump al subir)
```

### Base de datos

- La configuración vive en `.env` (raíz): `DB_USER`, `DB_PASSWORD`, `DB_NAME`,
  `DB_EXPOSED_PORT` y `DB_INIT_DUMP`.
- Para usar otro dump, cambia `DB_INIT_DUMP` y ejecuta `docker compose down -v`
  seguido de `docker compose up -d`.
- Si prefieres usar un PostgreSQL instalado en Windows en lugar del contenedor,
  comenta el servicio `postgres`, cambia `DB_HOST` a `host.docker.internal`
  en `docker-compose.yml` y ajusta las credenciales.

## Contribuir
Ver [CONTRIBUTING.md](CONTRIBUTING.md). Configuración local sin Docker: copiar `siga_backend/.env.example` a `.env`.
