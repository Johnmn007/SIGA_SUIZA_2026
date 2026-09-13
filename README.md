# SIGA — Sistema Integrado de Gestión Académica

Sistema para el Instituto de Educación Superior Tecnológico Público (IESTP).
Arquitectura modular: un **Core FastAPI** que actúa como gateway, identidad y
registro de módulos, **siete microservicios** y una **SPA React**.

La documentación arquitectónica está en [`docs/`](docs/00-INDICE.md).
El estado funcional del proyecto, en [`_estado.md`](_estado.md).

---

## 1. Requisitos

| Requisito | Versión verificada | Notas |
|---|---|---|
| Docker Desktop | 4.88.1 (engine 29.7.2) | Debe estar **arrancado** antes de nada |
| RAM disponible para Docker | ≥ 4 GB | El stack levanta 12 contenedores |
| Puertos libres en el host | 3000, 8000, 5432 | Configurables en `.env` |

No hace falta instalar Python ni Node en el host: todo se ejecuta en contenedores.

---

## 2. Puesta en marcha desde cero

```powershell
# 1. Configuración: copia la plantilla y rellena los valores
Copy-Item .env.example .env
#    Edita .env y define como mínimo POSTGRES_PASSWORD y SECRET_KEY.
#    Para generar una SECRET_KEY aleatoria:
#      docker run --rm python:3.12-slim python -c "import secrets; print(secrets.token_urlsafe(48))"

# 2. Construir y levantar
docker compose up -d --build

# 3. Esperar a que todo esté "healthy" (~90 s la primera vez)
docker compose ps
```

Compose **se niega a arrancar** si falta `POSTGRES_PASSWORD`, `SECRET_KEY`,
`POSTGRES_USER` o `POSTGRES_DB`, en lugar de levantar a medias.

### URLs

| Servicio | URL | Notas |
|---|---|---|
| Frontend (SPA) | http://localhost:3000 | Vite dev server con hot reload |
| Core / Gateway | http://localhost:8000 | Única puerta de entrada a la API |
| API docs | http://localhost:8000/docs | Solo con `DEBUG=True` |
| Health del Core | http://localhost:8000/health | |
| Estado de módulos | http://localhost:8000/core/modules | |
| PostgreSQL | localhost:5432 | Solo para depuración |

Los **siete módulos (8001–8009) no publican puerto en el host** a propósito:
solo son accesibles a través del gateway. Para hablar con uno directamente:

```powershell
docker compose exec siga-core curl http://mod-usuarios:8001/health
```

### Credenciales de desarrollo

Se siembran automáticamente **solo con `ENVIRONMENT=development`**.
Están documentadas en [`docs/06-CREDENCIALES-PRUEBA.md`](docs/06-CREDENCIALES-PRUEBA.md);
la de superadministrador es `admin@siga.edu` / `admin123`.

> Con cualquier otro `ENVIRONMENT` no se crea ninguna cuenta: hay que crear el
> primer administrador a mano.

---

## 3. Operación diaria

```powershell
docker compose ps                        # estado y healthchecks
docker compose logs -f siga-core         # seguir logs de un servicio
docker compose logs --since 10m          # logs recientes de todo el stack
docker compose restart mod-usuarios      # reiniciar un servicio
docker compose stop                      # parar sin borrar nada
docker compose start                     # volver a arrancar
docker compose down                      # parar y eliminar contenedores (los datos SE CONSERVAN)
```

El código está montado en los contenedores, así que **editar un `.py` o un
`.jsx` recarga solo**; no hace falta reconstruir para cambios de código.

### Reconstruir

```powershell
docker compose build                     # tras cambiar requirements.txt, package.json o un Dockerfile
docker compose up -d --build             # reconstruir y relanzar
docker compose build --no-cache siga-core # forzar reconstrucción completa de un servicio
```

### Borrar los datos y empezar de cero

```powershell
docker compose down -v                   # ⚠️ ELIMINA el volumen de PostgreSQL
docker compose up -d --build             # rehace migraciones y seeds
```

---

## 4. Base de datos

Una única base `siga_core` compartida por el Core y los módulos.

- **Migraciones (Alembic):** las aplica automáticamente el entrypoint de
  `siga-core` al arrancar. Cubren las siete tablas `core_*`.
- **Tablas de negocio:** las crea cada módulo en su arranque con
  `create_all()`. Todavía **no** están bajo control de Alembic.
- **Seeds:** roles, permisos y usuarios de prueba, mediante `SeederRunner`.
  Son idempotentes: se pueden re-ejecutar sin duplicar.

```powershell
# Consola SQL
docker compose exec postgres psql -U postgres -d siga_core

# Revisión / estado de migraciones
docker compose exec siga-core alembic current
docker compose exec siga-core alembic history

# Copia de seguridad y restauración
docker compose exec -T postgres pg_dump -U postgres siga_core > backup.sql
Get-Content backup.sql | docker compose exec -T postgres psql -U postgres -d siga_core
```

---

## 5. Tests, lint y build

| Comando | Qué hace | Estado verificado |
|---|---|---|
| `docker compose exec siga-core python tools/test_core.py` | Comprueba la inicialización del Core y los seeders | **PASS** |
| `docker compose exec siga-core python test_api.py` | Login y permisos por rol a través del gateway | **PASS** |
| `docker compose exec siga-frontend npm run lint` | ESLint sobre `src/` | **FALLA**: 29 errores preexistentes de calidad (variables sin usar, `setState` en efectos) |
| `docker compose exec siga-frontend npm run build` | Bundle de producción con Vite | **PASS** |
| `docker build --target prod ./siga_frontend` | Imagen de producción con nginx | **PASS** |

> **No hay framework de tests.** No existe pytest, Vitest ni CI. Los archivos
> `test_*.py` son scripts que requieren el stack levantado, no pruebas
> automatizadas. Montar una suite real es trabajo pendiente.

---

## 6. Producción

El `Dockerfile` del frontend tiene una etapa `prod` que sirve el bundle
estático con nginx y hace de proxy inverso hacia el Core:

```powershell
docker build --target prod -t siga-frontend:prod ./siga_frontend
```

Diferencias respecto a desarrollo:

- El bundle hornea rutas **relativas** (`/api`, `/ws`) que resuelve nginx, en
  lugar de `http://localhost:8000`. Se ajusta con `--build-arg VITE_API_URL=...`.
- La imagen `prod` necesita que el host `siga-core` resuelva por DNS: solo
  arranca dentro de la red de Compose.

Antes de desplegar fuera de una máquina de desarrollo:

1. `ENVIRONMENT=production` y `DEBUG=False` (desactiva `/docs` y el log SQL).
2. `SECRET_KEY` nueva y aleatoria, entregada por variable de entorno.
3. Quitar la publicación del puerto 5432 de `postgres`.
4. Crear el primer administrador manualmente.

---

## 7. Solución de problemas

**`docker compose up` falla con `falta POSTGRES_PASSWORD en .env`**
No has creado el `.env`. Copia `.env.example` y rellénalo.

**`password authentication failed for user "postgres"`**
El volumen `postgres_data` se inicializó con otra contraseña. Postgres ignora
`POSTGRES_PASSWORD` si el volumen ya existe. Si puedes perder los datos:
`docker compose down -v` y vuelve a levantar.

**El build del frontend falla con `npm error Exit handler never called!`**
No es un fallo de npm: es inspección TLS de un antivirus o proxy corporativo.
Diagnóstico y solución en [`siga_frontend/certs/README.md`](siga_frontend/certs/README.md).

**Un módulo aparece `unhealthy`**
```powershell
docker compose logs --tail 50 mod-<nombre>
```
Causa habitual: no puede conectar con Postgres, o su `create_all()` chocó con
otro módulo. Cada módulo tiene ya su propia tabla `outbox_events_<modulo>`
precisamente para evitar lo segundo.

**`/core/modules` muestra un módulo `offline` que sí está corriendo**
El monitor de salud refresca cada `HEALTH_CHECK_INTERVAL` segundos (15 por
defecto). Espera un ciclo. El módulo debe devolver exactamente
`{"status": "healthy"}` en `/health`; cualquier otro valor cuenta como degradado.

**El frontend no llega a la API**
Comprueba que `VITE_API_URL` apunta al puerto **publicado en el host**
(`http://localhost:8000`), no al nombre interno de Docker: quien hace la
petición es el navegador, no el contenedor.

**Los cambios de código no se reflejan**
Sí lo hacen para `.py` y `.jsx` (montaje en bind). Cambios en
`requirements.txt`, `package.json` o los Dockerfile requieren
`docker compose up -d --build`.

---

## 8. Arquitectura en un vistazo

```
Navegador ──► siga-core :8000 ──► mod-usuarios          :8001
              (gateway,           mod-planes-estudio    :8002
               identidad,         mod-programas-estudio :8005
               RBAC)              mod-gestion-academica :8006
                 │                mod-auditoria         :8007
                 │                mod-evaluacion        :8008
                 │                mod-admision          :8009
                 ▼                        │
         PostgreSQL · NATS · Redis ◄──────┘
```

- **Autenticación:** JWT HS256, 30 min, sin refresh.
- **Autorización:** el gateway exige `{modulo}:read` o `{modulo}:write` según
  el método HTTP. `is_superuser` lo exime.
- **Eventos:** patrón outbox. Cada módulo escribe en su tabla
  `outbox_events_<modulo>`, un worker la sondea y publica en NATS, y
  `mod-auditoria` consume y persiste en `core_audit_logs`.
- **Redes:** `backend` (datos y módulos) y `edge` (frontend y core).

---

## 9. Seguridad — léelo antes de desplegar

- `.env` está en `.gitignore`. **Nunca lo subas.**
- Los `.env` que había versionados se han dejado de versionar, pero
  **siguen en el historial de git**. La `SECRET_KEY` y la contraseña de
  Postgres anteriores deben considerarse comprometidas y ya no deben usarse.
- Las hojas de cálculo con datos de postulantes y los volcados `.dump` también
  siguen en el historial. Valora purgarlo con `git filter-repo`.
- Los módulos **no tienen autenticación propia**: confían en que el gateway
  filtre. Por eso no deben publicar puerto. No añadas `ports:` a ninguno.
