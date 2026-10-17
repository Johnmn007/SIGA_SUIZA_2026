<#
  Normaliza las imagenes generadas en _raw/ al formato final del carrusel.

  - Recorta al centro para obtener 16:9
  - Escala a 1600 x 900 px (o el tamaño indicado)
  - Guarda como JPEG de calidad ~88 y descarta metadatos
  - Crea copia de seguridad de los archivos reemplazados en _backup/

  Uso:
    powershell -ExecutionPolicy Bypass -File normalizar.ps1
    powershell -ExecutionPolicy Bypass -File normalizar.ps1 -Forzar
#>
param(
  [string]$RawDir    = (Join-Path $PSScriptRoot '_raw'),
  [string]$DestDir   = (Join-Path $PSScriptRoot '..\..\siga_frontend\public\assets\carreras'),
  [string]$BackupDir = (Join-Path $PSScriptRoot '_backup'),
  [int]$Ancho        = 1600,
  [int]$Alto         = 900,
  [int]$Calidad      = 88,
  [switch]$Forzar
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

if (-not (Test-Path -LiteralPath $RawDir)) { Write-Host "No existe $RawDir"; exit 0 }
if (-not (Test-Path -LiteralPath $DestDir)) { New-Item -ItemType Directory -Path $DestDir -Force | Out-Null }

$codificador = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
  Where-Object { $_.MimeType -eq 'image/jpeg' }
$params = New-Object System.Drawing.Imaging.EncoderParameters 1
$params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter `
  ([System.Drawing.Imaging.Encoder]::Quality), ([long]$Calidad)

$aspecto = $Ancho / $Alto
$n = 0

foreach ($archivo in Get-ChildItem -LiteralPath $RawDir -File | Where-Object { $_.Extension -match '^\.(jpg|jpeg|png)$' }) {
  $destino = Join-Path $DestDir $archivo.Name

  if ((Test-Path -LiteralPath $destino) -and (-not $Forzar)) {
    Write-Host ("  omitido  {0}  (ya existe, usa -Forzar para reemplazar)" -f $archivo.Name)
    continue
  }

  $img  = [System.Drawing.Image]::FromFile($archivo.FullName)
  $origenW = $img.Width
  $origenH = $img.Height

  # --- Recorte central al aspecto 16:9 ---
  if ($origenW / $origenH -gt $aspecto) {
    $recorteW = [int][math]::Round($origenH * $aspecto)
    $recorteH = $origenH
  } else {
    $recorteW = $origenW
    $recorteH = [int][math]::Round($origenW / $aspecto)
  }
  $x = [int][math]::Round(($origenW - $recorteW) / 2)
  $y = [int][math]::Round(($origenH - $recorteH) / 2)

  # --- Lienzo final y escalado de alta calidad ---
  $lienzo = New-Object System.Drawing.Bitmap $Ancho, $Alto, ([System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $g = [System.Drawing.Graphics]::FromImage($lienzo)
  $g.CompositingQuality  = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $g.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.Clear([System.Drawing.Color]::White)
  $g.DrawImage(
    $img,
    (New-Object System.Drawing.Rectangle 0, 0, $Ancho, $Alto),
    (New-Object System.Drawing.Rectangle $x, $y, $recorteW, $recorteH),
    [System.Drawing.GraphicsUnit]::Pixel
  )
  $g.Dispose()
  $img.Dispose()

  # --- Copia de seguridad de lo que se reemplaza ---
  if (Test-Path -LiteralPath $destino) {
    if (-not (Test-Path -LiteralPath $BackupDir)) { New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null }
    Copy-Item -LiteralPath $destino -Destination (Join-Path $BackupDir $archivo.Name) -Force
  }

  $tmp = Join-Path $DestDir ("." + $archivo.Name)
  $lienzo.Save($tmp, $codificador, $params)
  $lienzo.Dispose()
  Move-Item -LiteralPath $tmp -Destination $destino -Force

  $kb = [math]::Round((Get-Item -LiteralPath $destino).Length / 1KB)
  Write-Host ("  ok        {0}  {1}x{2} -> {3}x{4}  {5} KB" -f $archivo.Name, $origenW, $origenH, $Ancho, $Alto, $kb) -ForegroundColor Green
  $n++
}

Write-Host ("`nNormalizadas: {0} archivo(s) en {1}" -f $n, $DestDir)
