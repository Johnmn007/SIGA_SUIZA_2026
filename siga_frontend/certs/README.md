# Certificados de CA adicionales (opcional)

Esta carpeta existe para máquinas donde un antivirus o un proxy corporativo
hace **inspección TLS**: interceptan la conexión a `registry.npmjs.org` y la
vuelven a firmar con una CA propia. Windows confía en esa CA, pero el
contenedor Linux no, así que `npm ci` falla durante el build con:

```
npm error Exit handler never called!
```

Que en realidad esconde un `UNABLE_TO_VERIFY_LEAF_SIGNATURE` (visible con
`npm ci --loglevel verbose`).

## Cómo saber si te afecta

```powershell
docker run --rm node:22-alpine node -e "const t=require('tls');const s=t.connect({host:'registry.npmjs.org',port:443,servername:'registry.npmjs.org',rejectUnauthorized:false},()=>{console.log(JSON.stringify(s.getPeerCertificate().issuer));s.end()})"
```

Si el emisor **no** es una CA pública conocida (DigiCert, Let's Encrypt, GTS…),
tu tráfico está siendo interceptado.

## Solución

Exporta la CA interceptora desde el almacén de Windows a esta carpeta en
formato PEM. Sustituye el filtro `Zen|Irbis` por el nombre de tu CA:

```powershell
$c = Get-ChildItem Cert:\CurrentUser\Root, Cert:\LocalMachine\Root |
     Where-Object { $_.Subject -match 'Zen|Irbis' } | Select-Object -First 1
$b64 = [Convert]::ToBase64String($c.RawData, 'InsertLineBreaks')
Set-Content -Encoding ascii .\siga_frontend\certs\mi-ca.crt `
  "-----BEGIN CERTIFICATE-----`n$b64`n-----END CERTIFICATE-----"
```

El `Dockerfile` recoge automáticamente cualquier `*.crt` de esta carpeta.

## Por qué no está en git

Los `.crt` de aquí están en `.gitignore`: son específicos de cada máquina y
subirlos obligaría al resto del equipo a confiar en la CA de tu antivirus.
Si tu red no intercepta TLS, deja la carpeta vacía: el build funciona igual.
