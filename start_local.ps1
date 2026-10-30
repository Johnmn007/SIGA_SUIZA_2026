# Arranque local de SIGA: Core + 7 modulos + frontend Vite
# Requisito: PostgreSQL local corriendo con la base siga_core

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root "siga_backend"
$frontend = Join-Path $root "siga_frontend"
$python = Join-Path $backend "venv\Scripts\python.exe"

if (-not (Test-Path $python)) {
    Write-Host "ERROR: no existe $python" -ForegroundColor Red
    Write-Host "Crealo con:  py -3.14 -m venv siga_backend\venv" -ForegroundColor Yellow
    Write-Host "Y luego:      siga_backend\venv\Scripts\python -m pip install -r siga_backend\requirements.txt" -ForegroundColor Yellow
    exit 1
}

# Base de datos local
$env:DB_HOST     = "localhost"
$env:DB_PORT     = "5432"
$env:DB_USER     = "postgres"
$env:DB_PASSWORD = "john.007"
$env:DB_NAME     = "siga_core"
$env:SKIP_MIGRATIONS = "true"

# Al ejecutar nativo no hay DNS de Docker: los manifests apuntan al nombre del
# servicio (mod-xxx). El core necesita saber que aqui todo vive en localhost.
$modulos = @(
    @{ n = "mod-usuarios";          p = 8001 },
    @{ n = "mod-planes-estudio";    p = 8002 },
    @{ n = "mod-programas-estudio"; p = 8005 },
    @{ n = "mod-gestion-academica"; p = 8006 },
    @{ n = "mod-auditoria";         p = 8007 },
    @{ n = "mod-evaluacion";        p = 8008 },
    @{ n = "mod-admision";          p = 8009 }
)

foreach ($m in $modulos) {
    $slug = $m.n
    if ($slug.StartsWith("mod-")) { $slug = $slug.Substring(4) }
    $clave = "SIGA_MODULE_" + $slug.Replace("-", "_").ToUpper() + "_URL"
    Set-Item -Path "Env:$clave" -Value "http://localhost:$($m.p)"
}

Write-Host " Levantando Core en http://localhost:8000  (docs: /docs)" -ForegroundColor Cyan
Start-Process -FilePath $python -WorkingDirectory $backend -ArgumentList `
    "-m","uvicorn","app.main:app","--host","0.0.0.0","--port","8000","--reload" `
    -WindowStyle Minimized

Start-Sleep -Seconds 2

foreach ($m in $modulos) {
    $dir = Join-Path $backend "modules\$($m.n)"
    if (-not (Test-Path $dir)) { Write-Host "  (falta) $($m.n)" -ForegroundColor Red; continue }
    Write-Host " Levantando $($m.n) en http://localhost:$($m.p)" -ForegroundColor Cyan
    Start-Process -FilePath $python -WorkingDirectory $dir -ArgumentList `
        "-m","uvicorn","main:app","--host","0.0.0.0","--port","$($m.p)","--reload" `
        -WindowStyle Minimized
    Start-Sleep -Milliseconds 700
}

Start-Sleep -Seconds 1
Write-Host " Levantando frontend (Vite)" -ForegroundColor Cyan
Start-Process -FilePath "npm" -WorkingDirectory $frontend -ArgumentList "run","dev" -WindowStyle Minimized

Write-Host ""
Write-Host " Todo lanzado. Espera ~10s y abre:" -ForegroundColor Green
Write-Host "   Frontend : http://localhost:5173"
Write-Host "   API docs : http://localhost:8000/docs"
Write-Host "   Login    : admin@siga.edu / admin123"
Write-Host ""
Write-Host " Para detener: cierra las ventanas, o ejecuta stop_local.ps1" -ForegroundColor DarkGray
