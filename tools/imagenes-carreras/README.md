# Pipeline de imágenes — Carreras (Gestión Académica)

Genera automáticamente las **33 imágenes** del carrusel de carreras (11 carreras × 3) y las
reemplaza en `siga_frontend/public/assets/carreras/` **conservando exactamente el nombre de
archivo**, por lo que el carrusel y las cards **no requieren ningún cambio de código**.

---

## 1. Qué hay en esta carpeta

| Archivo | Función |
|---|---|
| `generar.mjs` | Orquestador. Sin dependencias externas (usa `fetch` nativo de Node ≥ 18). |
| `normalizar.ps1` | Recorta a 16:9, escala a 1600×900 y re-codifica a JPEG. Hace copia de seguridad en `_backup/`. |
| `carreras-imagenes.json` | **Mapeo completo exportado**: 33 archivos → carrera, título, descripción visual y prompt listo para pegar. |
| `PROMPTS.md` | Los mismos 33 prompts en Markdown, listos para copiar y pegar en cualquier generador. |
| `_raw/` | Descargas originales de la API ( intermedias, se pueden borrar). |
| `_backup/` | Copias de los placeholders reemplazados. |

La fuente de verdad de los prompts es la tabla `TABLA` dentro de `generar.mjs`.
Si editas un prompt allí, vuelve a exportar con `--exportar-mapa`.

---

## 2. Configuración (una sola vez)

Agrega tu clave al archivo `.env` de la **raíz del proyecto** (ya está en `.gitignore`):

```env
OPENAI_API_KEY=sk-...
```

El script también acepta la variable de entorno directa:
```powershell
$env:OPENAI_API_KEY = "sk-..."
```

---

## 3. Uso

```powershell
# 1. Ver qué se haría, sin llamar a la API y exportando el mapa
node tools/imagenes-carreras/generar.mjs --seco

# 2. Generar las 33 imágenes (respeta lo que ya existe)
node tools/imagenes-carreras/generar.mjs --forzar

# 3. Reemplazar los placeholders actuales
node tools/imagenes-carreras/generar.mjs --forzar

# 4. Regenerar solo un par de carreras (para probar)
node tools/imagenes-carreras/generar.mjs --forzar --solo=contabilidad,enfermeria-tecnica

# 5. Probar con 1 sola imagen antes de gastar créditos
node tools/imagenes-carreras/generar.mjs --forzar --limite=1
```

### Flags

| Flag | Default | Descripción |
|---|---|---|
| `--forzar` | off | Regenera aunque el archivo ya exista (reemplaza los placeholders). |
| `--solo=a,b` | todas | Limita a los slugs indicados, separados por coma. |
| `--limite=N` | sin límite | Genera solo las N primeras. Útil para pruebas. |
| `--concurrencia=N` | `2` | Peticiones en paralelo. Súbelo si tu plan lo permite. |
| `--calidad=` | `high` | `low` \| `medium` \| `high` (solo OpenAI). |
| `--modelo=` | `gpt-image-1` | Alternativa de modelo. |
| `--size=` | `1536x1024` | Tamaño pedido a la API. |
| `--base-url=` | API oficial | Permite apuntar a un endpoint compatible con OpenAI. |
| `--seco` | off | No llama a la API: valida, muestra un prompt y exporta el mapa. |
| `--exportar-mapa` | off | Regenera `carreras-imagenes.json` y `PROMPTS.md`. |
| `--proveedor=` | `openai` | `openai` \| `gemini` \| `replicate` \| `a1111`. |

---

## 4. Qué hace exactamente

1. **Verifica** que existan los 33 archivos esperados y reporta los que falten.
2. **Compone** el prompt de cada imagen: `prompt de escena + estilo global + restricciones`.
3. **Llama a la API** con reintentos automáticos (hasta 3) y espera ante `429`/`5xx`.
4. **Guarda** la imagen original en `_raw/` con el nombre definitivo.
5. **Normaliza** con `normalizar.ps1`: recorte central a 16:9 → escalado a **1600×900** →
   JPEG calidad 88 sin metadatos. Antes de reemplazar, copia el archivo viejo a `_backup/`.
6. **Verifica** el resultado.

`gpt-image-1` no produce 16:9 nativo (su formato horizontal es 3:2), por eso el paso 5
existe. El recorte es central, y los prompts piden espacio negativo en el tercio superior
para que el recorte no recorte rostros.

---

## 5. Alternativas sin créditos

| Proveedor | Uso | Requisitos |
|---|---|---|
| `gemini` | `--proveedor=gemini` | `GEMINI_API_KEY` |
| `replicate` | `--proveedor=replicate` | `REPLICATE_API_TOKEN` |
| `a1111` | `--proveedor=a1111` | Automatic1111 o Forge corriendo en `127.0.0.1:7860` con GPU. Sin clave. |

También puedes generar las imágenes a mano con cualquier herramienta y simplemente
**sobrescribir los 33 archivos** con los nombres de `PROMPTS.md`. El normalizador
puede correr por separado para estandarizar el tamaño:

```powershell
# si generaste imágenes y las dejaste sueltas en una carpeta
Copy-Item .\mis-fotos\* tools\imagenes-carreras\_raw\
powershell -ExecutionPolicy Bypass -File tools\imagenes-carreras\normalizar.ps1
```

---

## 6. Costos estimados

Con `gpt-image-1` en calidad `high` y 33 imágenes, el costo es de **~US$ 4–8** por
corrida completa (varía según el precio por imagen vigente). Para una prueba barata:

```powershell
node tools\imagenes-carreras\generar.mjs --forzar --limite=3 --calidad=medium
```

---

## 7. Después de generar

`public/` se sirve tal cual en desarrollo, pero el bundle se reconstruye:

```powershell
cd siga_frontend
npm run dev          # desarrollo: las imágenes se ven recargando
npm run build        # producción
```

El carrusel no se entera del cambio: lee las mismas rutas de siempre desde
`src/modules/academic/carrerasImagenes.js`.

Si alguna imagen sale mal, basta con **repetir el paso 4** sobre el slug afectado, o
borrar ese `.jpg` y volver a ejecutar sin `--forzar` para que el pipeline lo regenere.

---

## 8. Prompts

`PROMPTS.md` y `carreras-imagenes.json` contienen los 33 prompts completos. Estructura:

- `promptEscena` — la escena específica de esa imagen.
- `promptCompleto` — la escena + estilo institucional + restricciones, tal como se envía a la API.
- `titulo` / `descripcionVisual` — referencia en español para revisión.
