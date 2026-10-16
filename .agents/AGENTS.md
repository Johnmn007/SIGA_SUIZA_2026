# Reglas de Trabajo para el Agente SIGA

## Metodología de Inicio de Sesión
Cada vez que retomes el trabajo (por ejemplo, al iniciar una nueva sesión o cambiar de contexto), DEBES cumplir estrictamente la siguiente serie de pasos:

1. **Revisar la Documentación Base**: Leer los archivos clave dentro de la carpeta `docs/` (especialmente `12-ROADMAP.md` y la arquitectura).
2. **Leer la Memoria del Contexto**: Leer detenidamente el archivo `docs/MEMORIA_CONTEXTO.md`.
3. **Leer el Estado Actual**: Leer detenidamente el archivo `memoria.md` ubicado en la raíz del proyecto.
4. **Validación del Estado vs. Código**: Analizar el código fuente actual del proyecto para evaluar si efectivamente el estado descrito en los documentos es correcto y se corresponde con la realidad.
5. **Planificación según el Macro**: Con esta información validada, determinar desde dónde continuar y fijar la meta a corto plazo, asegurando que esté siempre alineada con el Plan Maestro (`12-ROADMAP.md`). Nunca desviarse del MVP ni saltar a fases posteriores sin completar las anteriores.

Esta restricción es crítica y obligatoria para evitar desvíos del MVP y asegurar una entrega integral basada en la arquitectura definida.

---

## RUNBOOK DE LEVANTAMIENTO (verificado 2026-09-29)

> Entorno: **Windows + PowerShell**. El proyecto corre **solo en Docker**. Docker Desktop debe estar abierto; los servicios nativos de Windows están detenidos.

### Servicios

| Servicio | Puerto | Cómo se inicia | Estado típico |
|----------|--------|----------------|---------------|
| Core Gateway | 8000 | `docker compose up -d` | Automático |
| Frontend (Docker) | 3000 | `docker compose up -d` | Automático |
| PostgreSQL (contenedor) | 5432 | `docker compose up -d` | Automático |
| Módulos (8001-8009) | 8001-8009 | `docker compose up -d` | Automático |

```powershell
docker compose ps
docker compose restart mod-gestion-academica   # reiniciar un módulo
```

### Credenciales

- **Login del Core**: `POST /auth/login?email=admin@siga.edu&password=admin123`
  ⚠️ `POST /api/core/auth/login` devuelve 401: el middleware de seguridad exige token en esa ruta.
- **Postgres (Docker)**: user `postgres`, password **`john.007`**, db `siga_core`, host `localhost:5432`.
  El `.env` local conserva `61077615` (BD nativa), pero **docker-compose.yml la sobreescribe**. No mezclar.
  `$env:PGPASSWORD="john.007"; & "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -h localhost -p 5432 -d siga_core -c "\dt"`

### Problemas conocidos

- **Carrera en el arranque**: los módulos corren `Base.metadata.create_all()` en paralelo y chocan en `outbox_events`. Si un módulo queda `unhealthy`, reiniciarlo hasta que arranque. Workaround temporal; falta migraciones centralizadas.
- **`entrypoint.sh` con CRLF** rompe el arranque de forma silenciosa. `.gitattributes` ya fuerza LF; no revertirlo.
- **Sin red en Docker Hub**: `docker compose up --build` puede fallar con `failed to resolve source metadata ... no such host`. Verificar conectividad antes de reconstruir; se pueden reutilizar imágenes ya construidas.
- El venv `siga_backend/venv` (Python 3.13) sirve solo para los scripts de `tools/` y análisis de Excel, no para levantar el backend.

### Datos cargados

- 11 programas de estudio (ids 1-11) y 438 estudiantes de admisión 2026. Detalle en `memoria.md` §0.
- Recarga idempotente: `python siga_backend\tools\cargar_admitidos_2026.py` (`--dry-run` para previsualizar).

### Lecciones / contexto que NO olvidar

- `requirements.txt` trae `bcrypt==3.2.2` (requerido por passlib 1.7.4). No subir a bcrypt 4.x.
- Credenciales de prueba: `docs/90-CREDENCIALES-PRUEBA.md`.
- Estado del proyecto: `memoria.md`. Contexto completo: `docs/MEMORIA_CONTEXTO.md`.
