# Guía de Scripts de Base de Datos y Migraciones - SIGA Suiza 2026

**Ubicación:** `siga_backend/db_scripts/`  
**Motor Oficial:** PostgreSQL 18.4 (`C:\Program Files\PostgreSQL\18\bin\`)  
**Base de Datos Institucional:** `siga_local`  
**Base de Pruebas:** `siga_test`

---

## 1. Inventario de Scripts

### Script `001_carga_lectiva_actas.sql`
* **Propósito:** Agrega soporte para el ciclo de vida de cierre de actas y plazos de evaluación en la tabla `carga_lectiva`.
* **Idempotencia:** Utiliza `ADD COLUMN IF NOT EXISTS` para garantizar que pueda ejecutarse múltiples veces consecutivas de forma segura sin generar errores ni alterar datos existentes.
* **Columnas Agregadas:**
  | Columna | Tipo | Nulabilidad / Default | Propósito |
  |---|---|---|---|
  | `fecha_limite_notas` | `DATE` | `NULL` | Fecha límite para el ingreso de calificaciones configurada por el Coordinador. Si es `NULL`, no hay límite temporal impuesto. |
  | `acta_cerrada` | `BOOLEAN` | `NOT NULL DEFAULT FALSE` | Bandera que indica si el acta de la unidad didáctica fue consolidada y cerrada. Por defecto `false` para no bloquear cargas activas ni históricas. |
  | `acta_cerrada_at` | `TIMESTAMP` | `NULL` | Fecha y hora exacta de oficialización/cierre del acta (auditoría). |
  | `acta_cerrada_por` | `INTEGER` | `NULL` | ID del usuario (`core_users`) del Coordinador o Administrador responsable del cierre. |

### Script `001_carga_lectiva_actas_rollback.sql`
* **Propósito:** Reversión controlada del cambio de esquema. Elimina las 4 columnas de la tabla `carga_lectiva` mediante `DROP COLUMN IF EXISTS`.
* **ADVERTENCIA:** Este script es destructivo para los metadatos de actas y **solo debe ejecutarse si se requiere explícitamente revertir la migración**.

---

## 2. Instrucciones de Aplicación en Entorno Local (`siga_local`)

Para aplicar la migración a la base de datos local de desarrollo de forma segura:

### Paso 1: Configurar la variable de contraseña
En PowerShell (sin versionar contraseñas en scripts ni terminales compartidas):
```powershell
$env:PGPASSWORD = 'tu_password_local_aqui'
```

### Paso 2: Ejecutar el script con protección de timeout transaccional
Se recomienda utilizar un bloque transaccional con `SET lock_timeout = '5s'` para evitar que el proceso quede bloqueado indefinidamente si otra aplicación retiene un bloqueo exclusivo en la tabla:

```powershell
$migrationSql = @"
BEGIN;
SET lock_timeout = '5s';
\i siga_backend/db_scripts/001_carga_lectiva_actas.sql
COMMIT;
"@

$migrationSql | & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h 127.0.0.1 -p 5432 -d siga_local -v ON_ERROR_STOP=1
```

---

## 3. Verificación de la Aplicación

Para comprobar que las columnas se crearon correctamente:

```powershell
$checkSql = @"
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'carga_lectiva' 
ORDER BY ordinal_position;
"@

$env:PGPASSWORD = 'tu_password_local_aqui'; & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h 127.0.0.1 -p 5432 -d siga_local -c $checkSql
```

**Resultado esperado:**
La tabla debe contar con 14 columnas, incluyendo:
- `fecha_limite_notas`: `date`, nullable `YES`
- `acta_cerrada`: `boolean`, nullable `NO`, default `false`
- `acta_cerrada_at`: `timestamp without time zone`, nullable `YES`
- `acta_cerrada_por`: `integer`, nullable `YES`

---

## 4. Procedimiento de Reversión (Rollback)

Si por alguna razón técnica se necesita revertir el cambio en el esquema:

```powershell
$env:PGPASSWORD = 'tu_password_local_aqui'; & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h 127.0.0.1 -p 5432 -d siga_local -f siga_backend/db_scripts/001_carga_lectiva_actas_rollback.sql
```

---

## 5. Mensaje para Reenviar al Equipo de Desarrollo

Copia y pega el siguiente mensaje para tus compañeros de equipo:

```text
Estimado equipo,

Antes de actualizar el código de la rama mejoras/docente-coordinacion, por favor apliquen la siguiente migración en su base de datos local (siga_local) para habilitar el soporte de cierre de actas en carga_lectiva:

En PowerShell:
$env:PGPASSWORD = 'tu_contraseña_postgres'
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h 127.0.0.1 -p 5432 -d siga_local -f siga_backend/db_scripts/001_carga_lectiva_actas.sql

El script es 100% idempotente y seguro (no altera datos existentes, asigna acta_cerrada=false y fecha_limite_notas=NULL por defecto).
¡Gracias!
```
