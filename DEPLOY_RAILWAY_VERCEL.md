# Despliegue: Backend en Railway + Frontend en Vercel

Esta guía deja el repositorio listo para desplegar SIGA sin usar `docker-compose`
en producción.

## Por qué falló el primer despliegue en Railway

Railway tomó la raíz del repositorio, donde conviven `siga_backend/`,
`siga_frontend/`, dumps y Excel. Railpack no encontró un proyecto único y
respondió:

```
Railpack could not determine how to build the app.
```

La solución aplicada es un **Dockerfile en la raíz** que construye únicamente
`siga_backend/`, más un `.dockerignore` que excluye todo lo demás. Railway
detecta ese Dockerfile automáticamente.

También puedes usar **Root Directory = `siga_backend`** en la configuración del
servicio; el `Dockerfile` de esa carpeta sigue funcionando.

---

## 1. Backend en Railway

### 1.1 Crear la base de datos

1. En el proyecto de Railway: **New > Database > PostgreSQL**.
2. Railway crea la variable `DATABASE_URL` del servicio PostgreSQL.
3. En el servicio del backend, referencia esa variable:
   - Si usas el canvas de Railway, abre el backend > **Variables** > **Add Reference**
     y selecciona `DATABASE_URL` del PostgreSQL.
   - Alternativamente, copia el valor de `DATABASE_URL` del PostgreSQL y pégalo
     como variable del backend.

### 1.2 Crear el servicio backend

1. **New > GitHub Repo** y selecciona `Johnmn007/SIGA_SUIZA_2026`.
2. Deja **Root Directory** vacío (raíz del repo). Railway usará el `Dockerfile`
   de la raíz.
   - Si prefieres aislar el backend, usa `siga_backend` como Root Directory.
3. Railway detectará el Dockerfile y lo usará en lugar de Railpack.

### 1.3 Variables del backend

Copia las variables de `siga_backend/.env.railway.example` en
**Service > Variables**. Como mínimo:

| Variable | Valor |
|---|---|
| `RUN_MODULES` | `true` |
| `ENVIRONMENT` | `production` |
| `DEBUG` | `false` |
| `SECRET_KEY` | valor largo y aleatorio |
| `DATABASE_URL` | referencia al PostgreSQL de Railway |
| `AUTO_INIT_DB` | `true` |
| `SKIP_MIGRATIONS` | `false` |
| `ENABLE_NATS` | `false` |
| `CORS_ORIGINS` | `https://tu-frontend.vercel.app` |
| `CORS_ORIGIN_REGEX` | vacío |

> `PORT` lo inyecta Railway automáticamente. No lo definas.
>
> `RUN_MODULES=true` arranca el Core y los 7 módulos dentro del mismo
> contenedor. El Core queda expuesto en el único puerto público y los módulos
> escuchan en `127.0.0.1:18001..18009`.

### 1.4 Dominio y healthcheck

1. **Settings > Networking > Generate Domain**.
2. Copia la URL, por ejemplo:
   `https://siga-backend-production.up.railway.app`.
3. El healthcheck debe ser `/health`.
4. Despliega. El arranque hace lo siguiente:
   - Espera a PostgreSQL.
   - Si la base está vacía, aplica `siga_backend/db/schema.sql` (solo esquema,
     sin datos) y marca Alembic en `head`.
   - Arranca los 7 módulos y espera su `/health`.
   - Arranca el Core y ejecuta los seeders (roles, permisos y usuarios base).
5. Login inicial: `admin@siga.edu` / `admin123`.

### 1.5 Restaurar los datos existentes (opcional)

Por defecto la base queda con esquema y usuarios base, sin estudiantes ni
matrículas. Si quieres restaurar los datos actuales, usa el dump
`backup_siga_core_pre_reset_20261102.sql` contra el PostgreSQL de Railway.

**Importante:** hazlo sobre una base vacía o elimina antes el esquema, porque el
dump crea las tablas.

```powershell
# 1. Copia la URL pública de PostgreSQL desde Railway > PostgreSQL > Connect.
$env:DATABASE_URL = "postgresql://postgres:...@...railway.app:.../railway"

# 2. Limpiar el esquema (¡borra datos!)
psql $env:DATABASE_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# 3. Restaurar el dump
psql $env:DATABASE_URL -f "backup_siga_core_pre_reset_20261102.sql"
```

Si restauras el dump antes del primer arranque, el script detecta que ya existe
la tabla `estudiantes` y no vuelve a crear el esquema.

---

## 2. Frontend en Vercel

1. En Vercel: **Add New > Project** e importa el mismo repositorio.
2. Configura:
   - **Root Directory:** `siga_frontend`
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm ci`
3. Agrega las variables de entorno (Production, Preview y Development):

| Variable | Valor |
|---|---|
| `VITE_API_URL` | `https://tu-backend.up.railway.app` |
| `VITE_WS_URL` | `wss://tu-backend.up.railway.app` |

4. Despliega. Vercel usará `siga_frontend/vercel.json`.
5. Copia el dominio de Vercel, por ejemplo
   `https://siga-suiza-2026.vercel.app`.

### 2.1 Actualizar CORS en Railway

Vuelve a Railway > backend > Variables y actualiza:

```
CORS_ORIGINS=https://siga-suiza-2026.vercel.app
CORS_ORIGIN_REGEX=
```

Railway redepliega automáticamente. Sin este paso el navegador bloqueará las
llamadas del frontend al backend por CORS.

---

## 3. Verificación rápida

```powershell
# Backend
Invoke-RestMethod https://tu-backend.up.railway.app/health

# Login
Invoke-RestMethod -Method Post `
  -Uri "https://tu-backend.up.railway.app/auth/login?email=admin%40siga.edu&password=admin123"

# Módulos registrados
Invoke-RestMethod https://tu-backend.up.railway.app/core/modules
```

En el frontend, abre la URL de Vercel e inicia sesión con
`admin@siga.edu` / `admin123`.

---

## 4. Notas importantes

- **No subas `.env` reales.** El repositorio tiene `.env` versionado con
  credenciales locales; para producción usa únicamente las variables de Railway
  y Vercel. Se recomienda sacar `.env` del control de versiones:
  ```powershell
  git rm --cached .env
  ```
- `railway.json` es configuración opcional/legacy de Railway. El despliegue
  funciona igual porque Railway detecta el `Dockerfile` de la raíz.
- Si en el futuro separas los módulos en servicios independientes, no uses
  `RUN_MODULES=true`; arranca cada módulo con su propio comando y define
  `SIGA_MODULE_*_URL` apuntando a los dominios privados de Railway.
- `siga_backend/db/schema.sql` contiene **solo estructura** (sin datos). El dump
  completo sigue siendo `backup_siga_core_pre_reset_20261102.sql`.
