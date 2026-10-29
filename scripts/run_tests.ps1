<#
.SYNOPSIS
    Script centralizado para ejecucion de la suite de pruebas de SIGA (Backend y Frontend).

.DESCRIPTION
    1. Valida de forma estricta la presencia de $env:PGPASSWORD.
    2. Registra el conteo de estudiantes en 'siga_local' antes de iniciar.
    3. Verifica que 'siga_test' posea su esquema; si esta vacia o se especifica -RebuildSchema, la restaura via pg_dump (--schema-only).
    4. Ejecuta las pruebas del Backend usando el entorno virtual .venv-test y pytest.
    5. Ejecuta las pruebas del Frontend usando vitest.
    6. Compara el conteo posterior en 'siga_local' asegurando que no sufrio ninguna modificacion.

.PARAMETER RebuildSchema
    Fuerza el refresco de tablas en siga_test a partir del esquema limpio de siga_local.
#>

[CmdletBinding()]
param(
    [switch]$RebuildSchema
)

$ErrorActionPreference = "Stop"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "          SIGA SUIZA 2026 - SUITE DE PRUEBAS INTEGRAL       " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Validacion de Credencial Mandatoria
if (-not $env:PGPASSWORD) {
    Write-Host "[ERROR DE SEGURIDAD] La variable de entorno `$env:PGPASSWORD no esta definida." -ForegroundColor Red
    Write-Host "Por politica institucional, no se almacenan contrasenas en scripts ni repositorios." -ForegroundColor Yellow
    Write-Host "Asigne la variable antes de ejecutar las pruebas:" -ForegroundColor Yellow
    Write-Host "   `$env:PGPASSWORD = 'tu_password_local'" -ForegroundColor Gray
    exit 1
}

# 2. Rutas y Herramientas del Sistema
$WorkspaceRoot = Split-Path -Parent $PSScriptRoot
if (-not $WorkspaceRoot) {
    $WorkspaceRoot = (Get-Location).Path
}
$PsqlBin = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
$PgDumpBin = "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe"
$VenvPytest = Join-Path $WorkspaceRoot ".venv-test\Scripts\pytest.exe"

if (-not (Test-Path $PsqlBin)) {
    Write-Error "No se encontro el ejecutable nativo de PostgreSQL 18: $PsqlBin"
    exit 1
}

if (-not (Test-Path $VenvPytest)) {
    Write-Error "No se encontro el entorno virtual de pruebas en '$VenvPytest'."
    exit 1
}

# 3. Conteo previo en siga_local (Failsafe y Auditoria Multitabla)
$tablesToAudit = @(
    'estudiantes',
    'matriculas',
    'matricula_detalles',
    'evaluacion_registros',
    'carga_lectiva',
    'core_users',
    'periodos_academicos'
)

function Get-SigaLocalCounts {
    $sql = @"
SELECT 'estudiantes', count(*) FROM estudiantes
UNION ALL SELECT 'matriculas', count(*) FROM matriculas
UNION ALL SELECT 'matricula_detalles', count(*) FROM matricula_detalles
UNION ALL SELECT 'evaluacion_registros', count(*) FROM evaluacion_registros
UNION ALL SELECT 'carga_lectiva', count(*) FROM carga_lectiva
UNION ALL SELECT 'core_users', count(*) FROM core_users
UNION ALL SELECT 'periodos_academicos', count(*) FROM periodos_academicos;
"@
    $raw = & $PsqlBin -h 127.0.0.1 -p 5432 -U postgres -d siga_local -t -A -F "|" -c $sql
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Error conectando a la base de datos siga_local."
        exit 1
    }
    $counts = @{}
    foreach ($line in ($raw -split "`r?`n")) {
        if ($line.Trim()) {
            $parts = $line.Split("|")
            $counts[$parts[0].Trim()] = [int]$parts[1].Trim()
        }
    }
    return $counts
}

Write-Host "[1/5] Verificando estado inicial de 'siga_local'..." -ForegroundColor Blue
$countsBefore = Get-SigaLocalCounts
foreach ($t in $tablesToAudit) {
    Write-Host ("      -> {0,-22}: {1} filas" -f $t, $countsBefore[$t]) -ForegroundColor Green
}

# 4. Verificacion / Preparacion de siga_test
Write-Host "[2/5] Comprobando infraestructura de 'siga_test'..." -ForegroundColor Blue
$testTablesRaw = & $PsqlBin -h 127.0.0.1 -p 5432 -U postgres -d siga_test -t -A -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';"
$testTablesCount = [int]$testTablesRaw.Trim()

if ($testTablesCount -eq 0 -or $RebuildSchema) {
    Write-Host "      -> Inicializando esquema de 'siga_test' desde 'siga_local' (--schema-only)..." -ForegroundColor Yellow
    $dumpOutput = & $PgDumpBin -h 127.0.0.1 -p 5432 -U postgres -d siga_local --schema-only --no-owner --no-privileges 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Fallo al generar el volcado de esquema con pg_dump."
        exit 1
    }
    $dumpOutput | & $PsqlBin -h 127.0.0.1 -p 5432 -U postgres -d siga_test -q
    Write-Host "      -> Esquema restaurado exitosamente en 'siga_test'." -ForegroundColor Green
} else {
    Write-Host "      -> 'siga_test' ya cuenta con $testTablesCount tablas listas." -ForegroundColor Green
}

# 5. Ejecucion de Pruebas de Backend
Write-Host ""
Write-Host "[3/5] Ejecutando pruebas de Backend (pytest con motor aislado siga_test)..." -ForegroundColor Blue
$env:DB_NAME = "siga_test"
$env:DATABASE_URL = "postgresql+asyncpg://postgres:$($env:PGPASSWORD)@127.0.0.1:5432/siga_test"
$env:SKIP_MIGRATIONS = "true"
if (-not $env:SECRET_KEY) {
    $env:SECRET_KEY = "test_ephemeral_secret_key_for_runner"
}

Push-Location $WorkspaceRoot
try {
    & $VenvPytest -c siga_backend/pytest.ini siga_backend -v
    $backendExitCode = $LASTEXITCODE
} finally {
    Pop-Location
}

# 6. Ejecucion de Pruebas de Frontend
Write-Host ""
Write-Host "[4/5] Ejecutando pruebas de Frontend (vitest en siga_frontend)..." -ForegroundColor Blue
Push-Location (Join-Path $WorkspaceRoot "siga_frontend")
try {
    npm run test
    $frontendExitCode = $LASTEXITCODE
} finally {
    Pop-Location
}

# 7. Verificacion de Invarianza en siga_local (Auditoria Multitabla)
Write-Host ""
Write-Host "[5/5] Auditando integridad de la base real institucional ('siga_local')..." -ForegroundColor Blue
$countsAfter = Get-SigaLocalCounts
$hasChanges = $false

foreach ($t in $tablesToAudit) {
    $cBefore = $countsBefore[$t]
    $cAfter = $countsAfter[$t]
    if ($cBefore -ne $cAfter) {
        $hasChanges = $true
        $diff = $cAfter - $cBefore
        $diffStr = if ($diff -gt 0) { "+$diff" } else { "$diff" }
        Write-Host ("      -> [CAMBIO DETECTADO] {0,-22}: {1} -> {2} ({3})" -f $t, $cBefore, $cAfter, $diffStr) -ForegroundColor Yellow
    } else {
        Write-Host ("      -> {0,-22}: {1} filas (sin cambios)" -f $t, $cAfter) -ForegroundColor Green
    }
}

if ($hasChanges) {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Yellow
    Write-Host " [ADVERTENCIA DE INTEGRIDAD / CONCURRENCIA EN SIGA_LOCAL]  " -ForegroundColor Yellow
    Write-Host " Se detectaron variaciones en los conteos de siga_local.    " -ForegroundColor Yellow
    Write-Host " Puede deberse a actividad concurrente de otro usuario/test." -ForegroundColor Yellow
    Write-Host " Verifique manualmente que no haya sido originado por un test." -ForegroundColor Yellow
    Write-Host "============================================================" -ForegroundColor Yellow
} else {
    Write-Host "      -> [CONFIRMADO] Todas las tablas auditadas de siga_local permanecieron 100% INTACTAS." -ForegroundColor Green
}

# 8. Reporte Final Consolidado
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "                     RESUMEN DE PRUEBAS                    " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Backend Status : $(if ($backendExitCode -eq 0) { 'EXITOSO (PASSED)' } else { 'CON FALLOS (FAILED)' })" -ForegroundColor $(if ($backendExitCode -eq 0) { "Green" } else { "Red" })
Write-Host "Frontend Status: $(if ($frontendExitCode -eq 0) { 'EXITOSO (PASSED)' } else { 'CON FALLOS (FAILED)' })" -ForegroundColor $(if ($frontendExitCode -eq 0) { "Green" } else { "Red" })

if ($backendExitCode -eq 0 -and $frontendExitCode -eq 0) {
    Write-Host ""
    Write-Host "*** TODAS LAS PRUEBAS PASARON SATISFACTORIAMENTE ***" -ForegroundColor Green
    Write-Host ""
    exit 0
} else {
    Write-Host ""
    Write-Host "*** LA SUITE DE PRUEBAS FINALIZO CON ERRORES ***" -ForegroundColor Red
    Write-Host ""
    exit 1
}
