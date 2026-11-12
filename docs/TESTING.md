# Infraestructura de Pruebas Automatizadas - SIGA Suiza 2026

Este documento detalla la arquitectura, directrices de seguridad y procedimientos de ejecución de las pruebas automatizadas (Backend y Frontend) del sistema SIGA.

---

## 1. Regla de Oro de Seguridad Institucional

> [!CAUTION]
> **PROHIBICIÓN ESTRICTA DE ESCRITURA EN `siga_local`:**
> La base de datos `siga_local` (PostgreSQL 18.4 en `127.0.0.1:5432`) contiene los datos reales institucionales (ej. 784 estudiantes).
> **Ningún test unitario, test de integración, fixture o script de prueba puede escribir o alterar datos en `siga_local`.**
> Todas las pruebas se ejecutan de manera 100% aislada en la base de datos de pruebas **`siga_test`**.

### Mecanismos de Salvaguarda Implementados (Failsafe)
1. **Validación de entorno (`conftest.py`):** Antes de iniciar la sesión de pruebas, pytest verifica que `DB_NAME == 'siga_test'` y que la URL de conexión termine en `/siga_test`.
2. **Consulta activa al motor (`SELECT current_database()`):** Toda conexión de prueba ejecuta esta consulta para certificar que la sesión activa es exactamente `siga_test`. Si no coincide, aborta inmediatamente.
3. **Limpieza segura (`clean_test_db`):** Antes de ejecutar cualquier sentencia destructiva (`TRUNCATE`), se vuelve a validar en vivo el nombre de la base de datos.
4. **Auditoría de invarianza en `run_tests.ps1`:** El script toma el conteo de estudiantes en `siga_local` antes de iniciar y lo compara contra el conteo final. Si difiere por un solo registro, emite una alarma crítica de seguridad.

---

## 2. Requisitos Previos

- **PostgreSQL 18.4** instalado en el host local (`127.0.0.1:5432`).
- **Python 3.10+** (utilizando el entorno virtual aislado `.venv-test`).
- **Node.js 18+** y `npm`.
- Herramientas nativas de PostgreSQL 18 en `C:\Program Files\PostgreSQL\18\bin\`:
  - `psql.exe`
  - `pg_dump.exe` (Nunca usar clientes de Docker v16 debido a incompatibilidad de versiones).

---

## 3. Ejecución Rápida (Comando Único)

Para ejecutar la suite completa (Backend + Frontend) con validación automática de invarianza de base de datos:

```powershell
# 1. Definir la contraseña local en la sesión (sin persistir en archivos)
$env:PGPASSWORD = "tu_password_local"

# 2. Ejecutar el script centralizado
.\scripts\run_tests.ps1
```

Si deseas forzar la recreación del esquema en `siga_test`:
```powershell
.\scripts\run_tests.ps1 -RebuildSchema
```

---

## 4. Reconstrucción de `siga_test` desde Cero

Si la base de datos `siga_test` necesita ser reinicializada o sincronizada con los últimos cambios de esquema de `siga_local`:

### Paso 1: Crear la base de datos (si no existe)
```powershell
$env:PGPASSWORD = "tu_password_local"
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -h 127.0.0.1 -p 5432 -U postgres -c "CREATE DATABASE siga_test;"
```

### Paso 2: Volcado exclusivo de esquema (--schema-only)
Este comando extrae la estructura completa (tablas, secuencias, tipos y triggers de outbox_events) sin transferir ningún dato de producción:
```powershell
& "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" -h 127.0.0.1 -p 5432 -U postgres -d siga_local --schema-only --no-owner --no-privileges | & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -h 127.0.0.1 -p 5432 -U postgres -d siga_test -q
```

---

## 5. Pruebas de Backend (pytest)

### Entorno Virtual Dedicado
Las pruebas de backend se ejecutan sobre `.venv-test` (excluido en `.gitignore`):
```powershell
# Crear y activar el venv si es una instalación inicial:
python -m venv .venv-test
.\.venv-test\Scripts\python.exe -m pip install -r siga_backend/requirements.txt -r siga_backend/requirements-dev.txt
```

### Ejecutar pytest directamente
```powershell
$env:PGPASSWORD = "tu_password_local"
$env:DB_NAME = "siga_test"
$env:DATABASE_URL = "postgresql+asyncpg://postgres:$($env:PGPASSWORD)@127.0.0.1:5432/siga_test"
$env:SKIP_MIGRATIONS = "true"
$env:SECRET_KEY = "clave_de_prueba_temporal"

.\.venv-test\Scripts\pytest.exe -c siga_backend/pytest.ini siga_backend -v
```

### Importación de Módulos con Guiones
Los módulos en `siga_backend/modules` (ej. `mod-gestion-academica`, `mod-evaluacion`) no pueden importarse directamente por tener guiones. Para probarlos, se utiliza el cargador dinámico ubicado en `siga_backend/tests/helpers/module_loader.py`:
```python
from tests.helpers.module_loader import import_siga_module
mod_eval = import_siga_module("mod-evaluacion", "routes")
```

### Helper JWT Seguro y Variable $env:SECRET_KEY Obligatoria
A partir de la implementación de verificación de identidad y roles (BUG-D02), el helper `siga_backend/tests/helpers/jwt_helper.py` genera tokens de usuario (`user_access`) y tokens internos de módulo (`module_access`) firmados con HMAC-SHA256.

> [!IMPORTANT]
> **Variable de entorno `$env:SECRET_KEY` obligatoria:**
> Para garantizar la reproducibilidad y seguridad estricta, los ejecutores de pruebas (`scripts/run_tests.ps1` o ejecuciones manuales de `pytest`) **exigen obligatoriamente** la presencia de la variable de entorno `$env:SECRET_KEY`.
> Si dicha variable no está definida, `run_tests.ps1` aborta de inmediato sin ejecutar pruebas y sin usar valores de contingencia ("fallbacks").
>
> Ejemplo de ejecución manual:
> ```powershell
> $env:PGPASSWORD = "tu_password_local"
> $env:SECRET_KEY = "clave_de_prueba_temporal_en_memoria"
> .\scripts\run_tests.ps1
> ```

---

## 6. Pruebas de Frontend (vitest)

Configurado en `siga_frontend` usando `vitest`, `jsdom` y `@testing-library/react` como `devDependencies`.

### Ejecución de Pruebas
```powershell
cd siga_frontend
npm run test
```

### Verificación de Build
Para comprobar que el empaquetado de producción (`vite build`) no se vio afectado:
```powershell
cd siga_frontend
npm run build
```

---

## 7. Estructura de Archivos de Prueba

```text
SIGA_SUIZA_2026/
├── scripts/
│   └── run_tests.ps1                     # Script centralizado PowerShell
├── docs/
│   └── TESTING.md                        # Esta guía de infraestructura
├── siga_backend/
│   ├── pytest.ini                        # Configuración de rutas y filtros pytest
│   ├── requirements-dev.txt              # Dependencias de prueba (pytest, pytest-asyncio, httpx)
│   ├── conftest.py                       # Failsafe, engine de prueba y fixtures reutilizables
│   └── tests/
│       ├── helpers/
│       │   ├── jwt_helper.py             # Generador de tokens JWT sin secretos en código
│       │   └── module_loader.py          # Cargador para carpetas mod-* con guiones
│       ├── test_safety_guard.py          # Validación del seguro obligatorio siga_test
│       └── test_fixtures_and_jwt.py      # Verificación de fixtures y generación JWT
└── siga_frontend/
    ├── vitest.config.js                  # Configuración de vitest (jsdom) aislada de vite.config.js
    └── src/
        └── test/
            ├── setup.js                  # Configuración jest-dom
            └── smoke.test.jsx            # Prueba de humo de renderizado React
```
