# 16 - Imágenes de Carreras (Carrusel de Gestión Académica)

> Mejora visual del módulo **Gestión Académica**: cada tarjeta de carrera incorpora un
> carrusel de **3 imágenes** en la parte superior. No se modificó el resto del diseño,
> estructura, información ni la lógica existente del módulo.

---

## 1. Objetivo

Dar una identidad visual institucional a cada tarjeta de carrera del catálogo de
programas de estudio, sin alterar la información que ya se mostraba
(código, área, estado, nombre, resolución, descripción, créditos, duración,
modalidad y los botones **Ver Malla**, **Parametrización** y **Editar**).

---

## 2. Archivos involucrados

| Archivo | Tipo | Responsabilidad |
|---------|------|-----------------|
| `siga_frontend/src/modules/academic/carrerasImagenes.js` | Nuevo | Estructura de datos: 3 rutas de imagen por cada una de las 11 carreras + imagen por defecto + función de resolución |
| `siga_frontend/src/modules/academic/CareerCarousel.jsx` | Nuevo | Componente del carrusel (autoplay, flechas, dots, pausa, fallback) |
| `siga_frontend/src/modules/academic/AcademicDashboard.jsx` | Modificado (mínimamente) | 1 import + 1 línea que monta el carrusel en la tarjeta del grid view |
| `siga_frontend/public/assets/carreras/*.jpg` | Nuevo (34 archivos) | 3 imágenes por carrera (33) + `default.jpg` |
| `tools/imagenes-carreras/` | Nuevo | Pipeline de generación automática (Node + PowerShell, sin dependencias) |

La vista de **lista/tabla** no se tocó. La integración se hizo de forma que el
carrusel se "sangra" con márgenes negativos (`-mx-6 -mt-6 mb-5`) hasta el borde
de la tarjeta, conservando el `p-6` y el resto del layout intactos.

---

## 3. Estructura de datos

Cada carrera declara un `slug`, su nombre, las palabras clave de coincidencia
(`match`, evaluadas en orden) y sus 3 imágenes:

```js
{
  slug: 'desarrollo-sistemas-informacion',
  nombre: 'Desarrollo de Sistemas de Información',
  match: ['DESARROLLO DE SISTEMAS', 'SISTEMAS DE INFORMACION', 'SISTEMAS'],
  imagenes: [
    '/assets/carreras/desarrollo-sistemas-informacion-1.jpg',
    '/assets/carreras/desarrollo-sistemas-informacion-2.jpg',
    '/assets/carreras/desarrollo-sistemas-informacion-3.jpg',
  ],
}
```

`getCarreraImagenes(nombreCarrera)` normaliza el nombre que devuelve el backend
(mayúsculas, sin tildes), busca coincidencia exacta y luego parcial, y si no
encuentra devuelve la imagen por defecto. Nunca devuelve un carrusel vacío.

> **Nota sobre el catálogo real:** en la base de datos el programa aparece como
> `GESTIÓN ADMINISTRATIVA` y no como `Administración de Empresas`, por lo que
> esa entrada declara ambas palabras clave en `match`.

---

## 4. Comportamiento del carrusel

| Requisito | Implementación |
|-----------|----------------|
| 3 imágenes por carrera | `getCarreraImagenes()` siempre devuelve 3 rutas |
| Una imagen a la vez | Pista `flex` con `translateX(-indice * 100%)` y `transition-transform duration-500` |
| Flechas izq/der | Botones circulares `ChevronLeft` / `ChevronRight` con `aria-label` |
| Dots indicadores | Botones `w-1.5` → `w-5 bg-white` en el slide activo, con `aria-current` |
| Autoplay 3-4 s | `CARRUSEL_AUTOPLAY_MS = 4000` |
| Pausa en hover | `onMouseEnter` / `onMouseLeave` (y `onFocus` / `onBlur`) → `pausado` |
| Mismo tamaño y proporción | Contenedor de altura fija `h-40 sm:h-44`; cada slide `w-full h-full flex-shrink-0` |
| `object-fit: cover` | `className="h-full w-full object-cover select-none"` |
| Bordes redondeados | `rounded-t-2xl` (mismo radio `1rem` que la tarjeta) + `overflow-hidden` |
| Responsive | Rejilla existente `md:grid-cols-2`; altura del carrusel sube de `h-40` a `h-44` en `sm+` |
| No rompe la altura | Altura fija del carrusel, independiente del texto de la tarjeta |
| Imagen por defecto | `onError` por slide → sustituye por `IMAGEN_POR_DEFECTO`; si tampoco existe, muestra un bloque neutro con `ImageOff` |
| Accesibilidad | `aria-roledescription="carrusel"`, flechas con teclado (`←` / `→`), `motion-reduce` respetado, `loading="lazy"` |

---

## 5. Especificación de los archivos de imagen

| Requisito | Valor |
|-----------|-------|
| Medida | **1600 × 900 px** (16:9 horizontal) para las 34 imágenes |
| Formato | JPG (calidad ~78) |
| Peso actual | 42-59 KB por archivo (1.7 MB en total) |
| Peso recomendado para fotos reales | 120-250 KB por archivo |
| Restricciones de contenido | Sin texto incrustado, sin logos, sin marcas de agua, sin collage |
| Estilo | Realista, profesional, moderna, institucional; estudiantes jóvenes en ambiente educativo o práctico |
| Paleta | Coherente con la identidad del IESTP Suiza: `#0044B2`, `#002D7A`, `#A0C1F7` |

### 5.1. Cómo reemplazar los placeholders por fotografías reales

1. Genera o fotografía las imágenes con los prompts del §6.
2. Exporta cada una a **1600 × 900 px JPG**.
3. Sobrescribe el archivo con el **mismo nombre** dentro de
   `siga_frontend/public/assets/carreras/`.

No hace falta tocar código: las rutas ya están declaradas en `carrerasImagenes.js`.
La carpeta `public/` de Vite se sirve desde la raíz, por lo que la URL pública es
`/assets/carreras/<archivo>.jpg`.

### 5.2. Estado actual de los archivos

Los 34 archivos existentes son **placeholders abstractos generados
programáticamente** (degradados y formas geométricas en la paleta de cada área).
Sirven para validar el carrusel y el layout.

Para reemplazarlos por fotografías reales existen dos vías:

| Vía | Cómo |
|-----|------|
| **Automática (recomendada)** | `node tools/imagenes-carreras/generar.mjs --forzar` — ver `tools/imagenes-carreras/README.md` |
| **Manual** | Copiar los prompts de `tools/imagenes-carreras/PROMPTS.md` en cualquier generador y sobrescribir cada archivo con el nombre indicado |

En ambos casos el resultado es idéntico: mismas rutas, mismos nombres, mismo carrusel.

---

## 6. Prompts para generar las fotografías

La fuente de verdad de los prompts es la tabla `TABLA` de
`tools/imagenes-carreras/generar.mjs`, que se exporta a
`tools/imagenes-carreras/carreras-imagenes.json` y `tools/imagenes-carreras/PROMPTS.md`:

```powershell
node tools/imagenes-carreras/generar.mjs --exportar-mapa
```

Cada imagen expone tres campos:

- `promptEscena`: la escena específica de esa imagen (en inglés).
- `promptCompleto`: escena + estilo institucional + restricciones, tal como se envía a la API.
- `titulo` / `descripcionVisual`: referencia en español para revisión.

Estilo global común a las 33 imágenes (ya incluido en cada `promptCompleto`):

```
Professional institutional documentary photograph, photorealistic, horizontal 16:9.
Young Peruvian students aged 18 to 24, diverse, in a real educational or practical
environment of a technological institute in Pucallpa, Peru.
Soft diffused natural daylight, 35mm lens, shallow depth of field, balanced composition
with negative space in the upper third.
Institutional color grading in deep blues #0044B2 and #002D7A with subtle warm accents.
Professional focused attitude, hands visibly engaged in the activity.
Clean modern setting, high detail, editorial quality, sharp focus, 8k.
Absolutely no text, no letters and no numbers anywhere in the image.
No logos, no crests, no badges, no flags and no institutional emblems.
No watermark, no signature.
No collage, no photomontage, no split or divided image, no frames or borders.
```

### 6.0. Escenario por imagen (resumen)

| Carrera | 1 | 2 | 3 |
|---|---|---|---|
| Administración de Empresas | Trabajo en equipo en aula moderna | Presentación de plan de negocios | Análisis financiero y organigrama |
| Administración de Operaciones Turísticas | Atención al huésped en recepción | Guiado turístico en la Amazonia | Planificación de itinerario |
| Asistencia Administrativa | Gestión documental en oficina | Atención administrativa al usuario | Digitalización de archivos |
| Contabilidad | Análisis de estados financieros | Cálculos y declaraciones tributarias | Conciliación de comprobantes |
| Construcción Civil | Revisión de planos en obra | Medición con estación total | Supervisión de vaciado de concreto |
| Desarrollo de Sistemas de Información | Programación en laboratorio | Revisión de esquema de base de datos | Programación en primer plano |
| Electricidad Industrial | Trabajo en tablero eléctrico industrial | Cableado de tablero de control | Programación de PLC |
| Enfermería Técnica | Práctica en laboratorio de simulación | Preparación de medicamentos | Toma de signos vitales |
| Manejo Forestal | Medición forestal en campo | Reforestación con plántulas nativas | Registro de inventario forestal |
| Mecatrónica Automotriz | Trabajo en motor de vehículo | Diagnóstico computarizado | Montaje de módulo electrónico |
| Producción Agropecuaria | Inspección de cultivos tropicales | Trabajo en invernadero | Manejo sanitario de ganado |

### 6.1. Administración de Empresas — `administracion-empresas-{1,2,3}.jpg`

| # | Prompt |
|---|-------|
| 1 | Young business administration students working together around a table in a modern classroom, laptops, printed financial charts, collaborative discussion |
| 2 | Team of students presenting a business plan on a screen in a bright seminar room, instructor observing, professional atmosphere |
| 3 | Close-up of student hands reviewing an inventory spreadsheet and a printed organizational chart in a modern office-style study room |

### 6.2. Administración de Operaciones Turísticas — `administracion-operaciones-turisticas-{1,2,3}.jpg`

| # | Prompt |
|---|-------|
| 1 | Young tourism students guiding visitors at a reception desk in a modern hotel lobby, warm welcoming lighting |
| 2 | Tourism students on a field trip in the Peruvian Amazon, guiding a small group of travelers along a nature trail, backpacks and clipboards |
| 3 | Students planning a tour itinerary at a table with maps, brochures and a laptop in a travel agency classroom |

### 6.3. Asistencia Administrativa — `asistencia-administrativa-{1,2,3}.jpg`

| # | Prompt |
|---|-------|
| 1 | Young administrative assistant students organizing documents in a modern institutional office, folders, archive boxes, desk lamps |
| 2 | Student answering a phone call and taking notes at an administrative reception desk, tidy modern office |
| 3 | Two students digitizing and filing records at a workstation with a scanner and labeled folders, cool neutral light |

### 6.4. Contabilidad — `contabilidad-{1,2,3}.jpg`

| # | Prompt |
|---|-------|
| 1 | Accounting students analyzing financial statements on a large monitor in a modern computer lab, printed ledgers on the desk |
| 2 | Close-up of student hands using a calculator and reviewing tax declaration forms with a pen, accounting classroom |
| 3 | Students reconciling invoices and receipts at a bright office table, spreadsheet printouts, professional and organized |

### 6.5. Construcción Civil — `construccion-civil-{1,2,3}.jpg`

| # | Prompt |
|---|-------|
| 1 | Civil engineering students on a building site reviewing large blueprints, hard hats, measuring tape, overcast daylight |
| 2 | Student operating a total station and another recording measurements on a construction site, safety helmets and vests |
| 3 | Students supervising a concrete pour and a structural column on site, modern mid-rise building in the background |

### 6.6. Desarrollo de Sistemas de Información — `desarrollo-sistemas-informacion-{1,2,3}.jpg`

| # | Prompt |
|---|-------|
| 1 | Young software development students coding at dual-monitor workstations in a modern technology laboratory, code on the screens |
| 2 | Two students reviewing a database schema and API documentation on a large screen in a university tech lab |
| 3 | Close-up of a student's hands typing on a mechanical keyboard with a clean code editor and a terminal window visible |

### 6.7. Electricidad Industrial — `electricidad-industrial-{1,2,3}.jpg`

| # | Prompt |
|---|-------|
| 1 | Electrical engineering students working on an industrial electrical panel with a multimeter, safety gloves and helmets, plant workshop |
| 2 | Student wiring a control cabinet with neatly routed cables while an instructor supervises, industrial lab |
| 3 | Students at a PLC programming station with laptops connected to an automation trainer, industrial automation classroom |

### 6.8. Enfermería Técnica — `enfermeria-tecnica-{1,2,3}.jpg`

| # | Prompt |
|---|-------|
| 1 | Technical nursing students practicing in a simulation lab with a training mannequin, scrubs and gloves, clean clinical environment |
| 2 | Nursing student preparing medication in a clinical practice room, organized tray, bright and hygienic lighting |
| 3 | Student taking vital signs with a sphygmomanometer while a classmate records data on a clipboard, clinical training room |

### 6.9. Manejo Forestal — `manejo-forestal-{1,2,3}.jpg`

| # | Prompt |
|---|-------|
| 1 | Forestry students measuring tree diameter with a dendrometer in a misty Amazonian forest plot, field notebooks and backpacks |
| 2 | Students planting native seedlings in a reforestation plot in the Amazon, sunlight through the canopy |
| 3 | Student recording forest inventory data on a tablet in the field, dense green vegetation of the Peruvian Amazon in the background |

### 6.10. Mecatrónica Automotriz — `mecatronica-automotriz-{1,2,3}.jpg`

| # | Prompt |
|---|-------|
| 1 | Mechatronics students working on a car engine in a well-equipped automotive workshop, mechanic uniforms and gloves, diagnostic scanner |
| 2 | Student reading a laptop with an OBD diagnostic tool connected to a vehicle in a modern service bay |
| 3 | Two students assembling an electronic control module on a workbench with soldering equipment and wiring harnesses, technical training lab |

### 6.11. Producción Agropecuaria — `produccion-agropecuaria-{1,2,3}.jpg`

| # | Prompt |
|---|-------|
| 1 | Agricultural production students inspecting tropical crops in a modern field, measuring leaf growth, sunny Amazonian farmland |
| 2 | Students in a greenhouse handling seedlings and irrigation lines, tropical crop production |
| 3 | Students performing health check and feeding management on cattle in a clean modern barn, veterinary gloves and protective equipment |

---

## 7. Verificación

```powershell
# 1. El pipeline valida su propio mapeo y no llama a la API
node tools/imagenes-carreras/generar.mjs --seco

# 2. Frontend
cd siga_frontend
npm run lint
npm run build
```

En desarrollo (`npm run dev`) las imágenes se recargan sin reiniciar el servidor,
porque viven en `public/`. El componente detecta rutas inexistentes por slide y
cae automáticamente a `default.jpg`, de modo que una imagen faltante no rompe la
tarjeta.

---

## 8. Historial de cambios

| Fecha | Cambio |
|-------|--------|
| 2026-09-28 | Versión inicial: estructura de datos, componente `CareerCarousel`, integración en la tarjeta, 34 imágenes placeholder y prompts de las 33 fotografías reales |
| 2026-09-28 | Añadido `tools/imagenes-carreras/`: pipeline automático de generación y reemplazo (OpenAI / Gemini / Replicate / A1111), normalizador 16:9 y mapa exportado |
