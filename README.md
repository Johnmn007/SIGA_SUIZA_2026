# SIGA - Sistema Integrado de Gestión Académica

Sistema modular para el Instituto de Educación Superior Tecnológico Público (IESTP):
Core Gateway FastAPI + 7 microservicios + frontend React + NATS + Redis en Docker,
y **PostgreSQL nativo de Windows** (visible en pgAdmin, BD `siga_core` con los datos
de `dump_railway.sql`).

Toda la documentación arquitectónica, técnica y de negocio oficial se encuentra
centralizada en la carpeta `docs/`.

👉 **[Ver Documentación Principal (Índice Maestro)](docs/00-INDICE.md)**

Para conocer el estado actual y los siguientes pasos, revisa el [Informe de Estado](_estado.md).

---

## Requisitos

- **Docker Desktop** 4.x (Engine 29.x, Compose v5) — verificado con 4.88.1.
- **4 GB RAM libre** recomendados (12 contenedores).
- Puertos libres en el host: `3000, 5432, 4222, 8222, 6379, 8000-8002, 8005-8009`.
- Sin Docker: Python 3.12 + Node 20 + PostgreSQL 16 + NATS + Redis manuales.

## Instalación

```powershell
git clone <repo> SIGA_SUIZA_2026
cd SIGA_SUIZA_2026
Copy-Item .env.example .env   # completar valores reales, nunca commitear el .env
docker compose build
```

## Configuración de .env

Los valores de conexión usados por defecto en `docker-compose.yml` (válidos para
levantar en local tal cual) son:

| Variable | Valor local |
|---|---|
| `POSTGRES_USER / DB_USER` | `postgres` |
| `POSTGRES_DB / DB_NAME` | `siga_core` |
| `DB_HOST` (en Compose) | `host.docker.internal` (PostgreSQL nativo de Windows) |
| `DB_HOST` (local sin Docker) | `localhost` |
| `NATS_URL` (en Compose) | `nats://nats:4222` |
| `VITE_API_URL / VITE_WS_URL` | `http://localhost:8000` / `ws://localhost:8000` |

Plantillas sin secretos: `.env.example` (raíz), `siga_backend/.env.example`,
`siga_frontend/.env.example` (este último requiere `git add -f` porque el
`.gitignore` del frontend ignora `.env*`).

> Los `.env` reales con credenciales están commiteados históricamente en este
> repo: rota `SECRET_KEY` y `DB_PASSWORD` antes de cualquier despliegue.

## Cómo iniciar / detener / reconstruir

```powershell
docker compose up -d --build     # construir (si hace falta) y levantar todo
docker compose ps                # ver estado (todos deben estar Up/healthy)
docker compose logs -f siga-core # ver logs del gateway
docker compose down              # detener y eliminar contenedores (conserva datos)
docker compose down -v           # detener y BORRAR datos (incluye la BD)
docker compose restart siga-core # reiniciar un servicio
```

## Cómo consultar logs

```powershell
docker compose logs --tail 50 siga-core
docker compose logs --tail 50 mod-usuarios
docker compose logs --tail 50 siga-frontend
```

## Cómo ejecutar tests / comprobaciones

No hay suite formal de tests (ver `siga_backend/test_api.py` y
`tools/test_core.py`, scripts manuales que requieren DB viva). Comprobaciones
verificadas:

```powershell
Invoke-WebRequest http://localhost:8000/health            # Core => healthy
Invoke-WebRequest http://localhost:8001/health            # mod-usuarios (8001/8002/8005-8009 igual)
Invoke-WebRequest http://localhost:8000/core/modules      # 7 módulos healthy
Invoke-WebRequest http://localhost:3000/                  # frontend => 200
cd siga_frontend; npm run lint; npm run build             # lint + build prod
```

Login de prueba (credenciales semilla de desarrollo):

```powershell
Invoke-WebRequest -Method POST "http://localhost:8000/auth/login?email=admin@siga.edu&password=admin123"
```

## URLs y puertos

| Servicio | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Core Gateway + docs (`DEBUG=True`) | http://localhost:8000, http://localhost:8000/docs |
| Microservicios | http://localhost:8001, :8002, :8005, :8006, :8007, :8008, :8009 |
| Postgres (nativo, pgAdmin) | localhost:5432, BD `siga_core` |
| NATS / Redis (Docker) | localhost:4222 (:8222 monitor) / :6379 |

## Comandos útiles

```powershell
docker compose config --quiet                          # validar el compose
docker compose exec -T postgres psql -U postgres -d siga_core -c "\dt"  # tablas de la BD
docker compose exec -T siga-core pip list              # dependencias instaladas
```

## Solución de problemas comunes

- **`exec ./entrypoint.sh: no such file or directory`**: finales de línea CRLF.
  Ya corregido en el repo (archivo en LF + `sed` en el Dockerfile).
- **`No module named 'greenlet'` / `'yaml'`**: faltaban `sqlalchemy[asyncio]`,
  `PyYAML` y `email-validator` en `requirements.txt`. Ya añadidos.
- **Módulos en `offline` en `/core/modules`**: el Core descubrió antes de que los
  módulos estuvieran listos. `docker compose restart siga-core` y vuelven a
  `healthy`.
- **`npm run lint` con 21 errores**: deuda pre-existente del frontend
  (variables no usadas, dependencias de hooks). No bloquea dev ni build.
- **Puertos ocupados**: libera los puertos listados arriba o ajusta el mapeo.
- **La app no conecta a la BD**: verifica que el servicio `postgresql-x64-17`
  esté corriendo, que `siga_core` exista en pgAdmin y que `pg_hba.conf` tenga la
  línea de la red Docker (`172.18.0.0/16`); luego `SELECT pg_reload_conf();`.
