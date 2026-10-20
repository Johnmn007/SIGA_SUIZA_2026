# Detiene los procesos de SIGA levantados por start_local.ps1

$ErrorActionPreference = "SilentlyContinue"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

$patrones = @(
    "uvicorn app.main:app",
    "uvicorn main:app",
    "vite"
)

$muertos = 0
foreach ($p in Get-CimInstance Win32_Process -Filter "Name = 'python.exe' OR Name = 'node.exe'") {
    $cmd = $p.CommandLine
    if (-not $cmd) { continue }
    if ($cmd -notlike "*$root*") { continue }
    foreach ($pat in $patrones) {
        if ($cmd -like "*$pat*") {
            Stop-Process -Id $p.ProcessId -Force
            Write-Host "  detenido PID $($p.ProcessId)  ($pat)" -ForegroundColor DarkGray
            $muertos++
            break
        }
    }
}

Write-Host ""
if ($muertos -gt 0) {
    Write-Host " $muertos proceso(s) detenido(s)." -ForegroundColor Green
} else {
    Write-Host " No habia procesos de SIGA corriendo." -ForegroundColor Yellow
}
