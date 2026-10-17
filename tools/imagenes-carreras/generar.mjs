/**
 * Pipeline de generacion y reemplazo de imagenes del carrusel de Carreras.
 *
 *   node tools/imagenes-carreras/generar.mjs --seco
 *   node tools/imagenes-carreras/generar.mjs --exportar-mapa
 *   node tools/imagenes-carreras/generar.mjs --proveedor=openai --concurrencia=2
 *   node tools/imagenes-carreras/generar.mjs --solo=contabilidad,enfermeria-tecnica
 *
 * Sin dependencias externas: usa fetch nativo de Node >= 18.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import process from 'node:process';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..', '..');
const DESTINO = path.join(RAIZ, 'siga_frontend', 'public', 'assets', 'carreras');
const RAW = path.join(AQUI, '_raw');
const BACKUP = path.join(AQUI, '_backup');
const MAPA_JSON = path.join(AQUI, 'carreras-imagenes.json');
const MAPA_MD = path.join(AQUI, 'PROMPTS.md');

const MEDIDA = { ancho: 1600, alto: 900 };
const CALIDAD_FINAL = 88;

const ESTILO_GLOBAL = [
  'Professional institutional documentary photograph, photorealistic, horizontal 16:9.',
  'Young Peruvian students aged 18 to 24, diverse, in a real educational or practical environment of a technological institute in Pucallpa, Peru.',
  'Soft diffused natural daylight, 35mm lens, shallow depth of field, balanced composition with negative space in the upper third.',
  'Institutional color grading in deep blues #0044B2 and #002D7A with subtle warm accents.',
  'Professional focused attitude, hands visibly engaged in the activity.',
  'Clean modern setting, high detail, editorial quality, sharp focus, 8k.',
].join(' ');

const RESTRICCIONES = [
  'Absolutely no text, no letters and no numbers anywhere in the image.',
  'No logos, no crests, no badges, no flags and no institutional emblems.',
  'No watermark, no signature.',
  'No collage, no photomontage, no split or divided image, no frames or borders.',
];

// ---------------------------------------------------------------------------
// Tabla maestra. Un registro por imagen: slug | indice | titulo | descripcion | prompt
// Los prompts de escena van en ingles porque rinden mejor en los modelos de imagen.
// ---------------------------------------------------------------------------
const TABLA = `
administracion-empresas|1|Trabajo en equipo en aula moderna|Cuatro estudiantes alrededor de una mesa de cristal con laptops abiertos, cuadernos y graficos de ventas, con una pantalla de pared al fondo.|Four business administration students working together around a glass table in a bright modern classroom, open laptops, notebooks and printed sales charts on the table, a wall screen in the background showing a bar graph, business school atmosphere, soft window daylight.
administracion-empresas|2|Presentacion de plan de negocios|Estudiante de pie explicando un plan de negocios ante sus companeros en un salon de seminarios moderno, companeros tomando notas.|A business administration student standing and presenting a business plan to seated classmates in a modern seminar room, pointing at a large screen, classmates taking notes, glass walls.
administracion-empresas|3|Analisis financiero y organigrama|Primer plano de manos de dos estudiantes revisando un cuadro financiero impreso y un organigrama junto a una laptop.|Close-up of two students hands reviewing a printed financial statement and an organizational chart next to a laptop on a modern office desk.
administracion-operaciones-turisticas|1|Atencion al huesped en recepcion|Dos estudiantes de turismo recibiendo a visitantes en la recepcion de un hotel moderno, ambiente calido y acogedor.|Two tourism students welcoming visitors at a modern hotel reception desk, smiling, professional attire, warm welcoming lobby lighting, plants and soft wood finishes.
administracion-operaciones-turisticas|2|Guiado turistico en la Amazonia|Estudiantes de turismo guiando a un grupo pequeno de viajeros por un sendero de selva en la Amazonia peruana, mochilas y listas de control.|Tourism students guiding a small group of travelers along a jungle nature trail in the Peruvian Amazon, backpacks and clipboards, lush green tropical vegetation, dappled sunlight.
administracion-operaciones-turisticas|3|Planificacion de itinerario|Los estudiantes planificando un itinerario en una mesa con mapas impresos, folletos turisticos y una laptop.|Tourism students planning an itinerary at a table with printed maps, travel brochures and a laptop in a classroom, pointing at the map.
asistencia-administrativa|1|Gestion documental en oficina|Los estudiantes organizando y archivando documentos en una oficina institucional moderna, carpetas etiquetadas y cajas de archivo.|Administrative assistant students organizing and filing documents in a modern institutional office, labeled folders, archive boxes, desk lamps, shelves in the background.
asistencia-administrativa|2|Atencion administrativa al usuario|Una estudiante atendiendo un telefono y tomando notas en un escritorio de recepcion administrativa, oficina ordenada.|A student answering a phone and taking notes at an administrative reception desk, tidy modern office, computer monitor, folders and a small plant.
asistencia-administrativa|3|Digitalizacion de archivos|Dos estudiantes escaneando y digitalizando registros en un puesto de trabajo con escaner y carpetas ordenadas.|Two students scanning and digitizing records at a workstation with a document scanner and sorted folders, cool neutral daylight, modern office.
contabilidad|1|Analisis de estados financieros|Los estudiantes de contabilidad analizando estados financieros en un monitor grande en un laboratorio de computo moderno.|Accounting students analyzing financial statements on a large monitor in a modern computer lab, printed ledgers and a calculator on the desk.
contabilidad|2|Calculos y declaraciones tributarias|Primer plano de las manos de una estudiante usando calculadora y revisando formularios de declaracion tributaria con un lapiz.|Close-up of a student hands using a calculator and reviewing printed tax declaration forms with a pen at an accounting classroom desk.
contabilidad|3|Conciliacion de comprobantes|Los estudiantes conciliando facturas y recibos en una mesa de oficina luminosa, spreadsheets impresas y calculadora.|Accounting students reconciling invoices and receipts at a bright office table, printed spreadsheets, calculator and a laptop, organized professional atmosphere.
construccion-civil|1|Revision de planos en obra|Estudiantes de ingenieria civil revisando planos de gran formato en una obra, con cascos y chalecos de seguridad.|Civil engineering students on a building site reviewing large rolled blueprints, wearing hard hats and safety vests, measuring tape, overcast daylight, concrete structure in the background.
construccion-civil|2|Medicion con estacion total|Un estudiante operando una estacion total sobre un tripode mientras otro registra medidas en una libreta, obra al aire libre.|A student operating a total station on a tripod while another records measurements on a clipboard, construction site, hard hats and vests, partially built structure.
construccion-civil|3|Supervision de vaciado de concreto|Los estudiantes supervisando un vaciado de concreto y una columna estructural en obra, edificio de media altura al fondo.|Students supervising a concrete pour and a structural column on a construction site, modern mid-rise building in the background, rebar and formwork visible.
desarrollo-sistemas-informacion|1|Programacion en laboratorio|Jovenes estudiantes de desarrollo de sistemas programando en puestos con doble monitor en un laboratorio tecnologico moderno.|Young software development students coding at dual-monitor workstations in a modern technology laboratory, code visible on the screens, clean desks.
desarrollo-sistemas-informacion|2|Revision de esquema de base de datos|Dos estudiantes revisando un diagrama de esquema de base de datos en una pantalla grande de un laboratorio universitario.|Two students reviewing a database schema diagram on a large screen in a university technology lab, one pointing at the display, modern interior.
desarrollo-sistemas-informacion|3|Programacion en primer plano|Primer plano de las manos de un estudiante escribiendo en un teclado mecanico, editor de codigo y terminal en el monitor.|Close-up of a student hands typing on a mechanical keyboard, clean code editor and a terminal window visible on the monitor, blurred lab background.
electricidad-industrial|1|Trabajo en tablero electrico industrial|Estudiantes de electricidad trabajando en un tablero electrico industrial con multimetro, guantes y cascos de seguridad.|Electrical students working on an industrial electrical panel with a multimeter, wearing safety gloves and helmets, plant workshop, neatly arranged cables.
electricidad-industrial|2|Cableado de tablero de control|Un estudiante cableando un gabinete de control con cables ordenados mientras un instructor supervisa, laboratorio industrial.|A student wiring a control cabinet with neatly routed cables while an instructor supervises, industrial training lab, bright overhead lighting.
electricidad-industrial|3|Programacion de PLC|Los estudiantes en una estacion de programacion de PLC con laptops conectadas a un automata de formacion.|Students at a PLC programming station with laptops connected to an automation trainer, industrial automation classroom, control panel nearby.
enfermeria-tecnica|1|Practica en laboratorio de simulacion|Estudiantes de enfermeria tecnica practicando en un laboratorio de simulacion con maniqui de entrenamiento, uniforms y guantes.|Technical nursing students practicing in a simulation lab with a training mannequin, wearing scrubs and gloves, clean clinical environment.
enfermeria-tecnica|2|Preparacion de medicamentos|Una estudiante de enfermeria preparando medicacion sobre una bandeja organizada en una sala de practica clinica.|A nursing student preparing medication on an organized tray in a clinical practice room, bright hygienic lighting, clean surfaces.
enfermeria-tecnica|3|Toma de signos vitales|Una estudiante tomando signos vitales con un esfigmomanometro a un maniqui mientras otra registra datos en una tabla.|A student measuring vital signs with a sphygmomanometer on a training mannequin while a classmate records data on a clipboard, clinical training room.
manejo-forestal|1|Medicion forestal en campo|Estudiantes de manejo forestal midiendo el diametro de un arbol con dendrometro en una parcela de bosque amazonico con neblina.|Forestry students measuring tree diameter with a dendrometer in a misty Amazon forest plot, field notebooks and backpacks, tall trees in the background.
manejo-forestal|2|Reforestacion con plantulas nativas|Estudiantes de manejo forestal plantando plantulas nativas en una parcela de reforestacion en la Amazonia, luz filtrada por el dosel.|Forestry students planting native seedlings in a reforestation plot in the Amazon, sunlight filtering through the canopy, hands in the soil.
manejo-forestal|3|Registro de inventario forestal|Un estudiante registrando datos de inventario forestal en una tablet en campo, vegetacion verde amazonica densa al fondo.|A forestry student recording inventory data on a tablet in the field, dense green Amazon vegetation in the background, field boots and notebook.
mecatronica-automotriz|1|Trabajo en motor de vehiculo|Los estudiantes de mecatronica trabajando en el motor de un vehiculo en un taller automakers bien equipado.|Mechatronics students working on a car engine in a well equipped automotive workshop, mechanic coveralls and gloves, diagnostic scanner nearby, tool cabinets.
mecatronica-automotriz|2|Diagnostico computarizado|Una estudiante leyendo una laptop con una herramienta de diagnostico OBD conectada a un vehiculo en una bahia de servicio moderna.|A student reading a laptop with an OBD diagnostic tool connected to a vehicle in a modern service bay, lift and tool cart in the background.
mecatronica-automotriz|3|Montaje de modulo electronico|Dos estudiantes armando un modulo de control electronico en un banco de trabajo con equipo de soldadura y arneses de cableado.|Two students assembling an electronic control module on a workbench with soldering equipment and wiring harnesses, technical training lab, anti-static mat.
produccion-agropecuaria|1|Inspeccion de cultivos tropicales|Los estudiantes de produccion agropecuaria inspeccionando cultivos tropicales en un campo moderno, midiendo el crecimiento de las hojas.|Agricultural production students inspecting tropical crops in a modern field, measuring leaf growth, sunny Amazonian farmland, neat crop rows.
produccion-agropecuaria|2|Trabajo en invernadero|Los estudiantes trabajando en un invernadero manipulando plantulas y lineas de riego, produccion de cultivos tropicales.|Students working in a greenhouse handling seedlings and irrigation lines, tropical crop production, condensation on the roof, metal structure.
produccion-agropecuaria|3|Manejo sanitario de ganado|Los estudiantes realizando un control sanitario y manejo de alimentacion en ganado bovino en un establo moderno y limpio.|Students performing a health check and feeding management on cattle in a clean modern barn, protective equipment and gloves, well kept pens.
`.trim();

/** Nombres de las carreras, para el JSON exportado. */
const NOMBRES_CARRERA = {
  'administracion-empresas': 'Administración de Empresas',
  'administracion-operaciones-turisticas': 'Administración de Operaciones Turísticas',
  'asistencia-administrativa': 'Asistencia Administrativa',
  contabilidad: 'Contabilidad',
  'construccion-civil': 'Construcción Civil',
  'desarrollo-sistemas-informacion': 'Desarrollo de Sistemas de Información',
  'electricidad-industrial': 'Electricidad Industrial',
  'enfermeria-tecnica': 'Enfermería Técnica',
  'manejo-forestal': 'Manejo Forestal',
  'mecatronica-automotriz': 'Mecatrónica Automotriz',
  'produccion-agropecuaria': 'Producción Agropecuaria',
};

const AREA_CARRERA = {
  'administracion-empresas': 'Gestión y Negocios',
  'administracion-operaciones-turisticas': 'Turismo y Hotelería',
  'asistencia-administrativa': 'Gestión y Negocios',
  contabilidad: 'Gestión y Negocios',
  'construccion-civil': 'Ingeniería y Construcción',
  'desarrollo-sistemas-informacion': 'Tecnologías de la Información',
  'electricidad-industrial': 'Electrotecnia y Mecánica',
  'enfermeria-tecnica': 'Ciencias de la Salud',
  'manejo-forestal': 'Agropecuaria y Forestal',
  'mecatronica-automotriz': 'Electrotecnia y Mecánica',
  'produccion-agropecuaria': 'Agropecuaria y Forestal',
};

const SLUG_A_ARCHIVO = (slug, i) => `${slug}-${i}.jpg`;

// La TABLA se escribe sin tildes para evitar problemas de codificacion al editar.
// Este mapa las restituye unicamente en los campos de referencia en espanol
// (titulo y descripcionVisual). Los prompts de escena van en ingles y no les afecta.
const ACENTOS = {
  Practica: 'Práctica', practica: 'práctica',
  Practicas: 'Prácticas', practicas: 'prácticas',
  tecnica: 'técnica', tecnicas: 'técnicas', tecnico: 'técnico', tecnicos: 'técnicos',
  informacion: 'información', Informacion: 'Información',
  administracion: 'administración', Administracion: 'Administración',
  turisticas: 'turísticas', turistica: 'turística', turistico: 'turístico',
  documentacion: 'documentación',
  digitalizacion: 'digitalización', Digitalizacion: 'Digitalización',
  graficos: 'gráficos', grafico: 'gráfico',
  organizacion: 'organización',
  organigrama: 'organigrama', Organigrama: 'Organigrama',
  modulo: 'módulo', modulos: 'módulos',
  construccion: 'construcción', Construccion: 'Construcción',
  ingenieria: 'ingeniería', Ingenieria: 'Ingeniería',
  programacion: 'programación', Programacion: 'Programación',
  atencion: 'atención', Atencion: 'Atención',
  electrico: 'eléctrico', electrica: 'eléctrica', electricos: 'eléctricos',
  automatizacion: 'automatización',
  formacion: 'formación',
  enfermeria: 'enfermería', Enfermeria: 'Enfermería',
  simulacion: 'simulación',
  esfigmomanometro: 'esfigmomanómetro',
  vegetacion: 'vegetación',
  reforestacion: 'reforestación', Reforestacion: 'Reforestación',
  plantulas: 'plántulas',
  diametro: 'diámetro',
  mecanica: 'mecánica',
  vehiculo: 'vehículo', vehiculos: 'vehículos',
  agricola: 'agrícola',
  ganaderia: 'ganadería',
  produccion: 'producción', Produccion: 'Producción',
  presentacion: 'presentación', Presentacion: 'Presentación',
  reunion: 'reunión',
  analisis: 'análisis', Analisis: 'Análisis',
  pequenos: 'pequeños', pequeno: 'pequeño',
  imagenes: 'imágenes', Imagenes: 'Imágenes',
  Planificacion: 'Planificación', planificacion: 'planificación',
  Calculos: 'Cálculos', calculos: 'cálculos',
  Conciliacion: 'Conciliación', conciliacion: 'conciliación',
  Revision: 'Revisión', revision: 'revisión',
  Medicion: 'Medición', medicion: 'medición',
  estacion: 'estación', Estacion: 'Estación',
  Supervision: 'Supervisión', supervision: 'supervisión',
  Preparacion: 'Preparación', preparacion: 'preparación',
  electronico: 'electrónico', electronica: 'electrónica',
  Inspeccion: 'Inspección', inspeccion: 'inspección',
  huesped: 'huésped', recepcion: 'recepción', Recepcion: 'Recepción',
  Amazonia: 'Amazonía', amazonia: 'Amazonía',
  Gestion: 'Gestión', gestion: 'gestión',
 negocio: 'negocio', companeros: 'compañeros',
};

/** Restituye tildes en texto de referencia, respetando mayusculas. */
function acentuar(texto) {
  return (texto || '').split(' ').map((palabra) => {
    if (ACENTOS[palabra]) return ACENTOS[palabra];
    const conPuntuacion = palabra.match(/^([^\wÁÉÍÓÚÑáéíóúñ]+)(.*?)([^\wÁÉÍÓÚÑáéíóúñ]*)$/);
    if (conPuntuacion) {
      const [, ini, medio, fin] = conPuntuacion;
      return ini + (ACENTOS[medio] || medio) + fin;
    }
    return palabra;
  }).join(' ');
}

// ===========================================================================
//  Parte 2: utilidades de datos, proveedores, pipeline y CLI
//  (requiere las constantes definidas en la parte 1 del mismo archivo)
// ===========================================================================



/** Divide la tabla piped en una lista normalizada de imágenes. */
function leerTabla() {
  const filas = [];
  TABLA.split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((linea, n) => {
      const partes = linea.split('|');
      if (partes.length !== 5) {
        throw new Error(`TABLA linea ${n + 1}: se esperaban 5 campos, hay ${partes.length}.`);
      }
      const [slug, indice, titulo, descripcion, prompt] = partes.map((s) => s.trim());
      if (!prompt) throw new Error(`TABLA linea ${n + 1}: prompt vacio para ${slug}-${indice}.`);
      filas.push({ slug, indice: Number(indice), titulo, descripcion, prompt });
    });

  // Validación de integridad: cada slug debe tener 3 índices 1..3 sin repetir.
  const porSlug = new Map();
  for (const f of filas) {
    if (!porSlug.has(f.slug)) porSlug.set(f.slug, []);
    porSlug.get(f.slug).push(f.indice);
  }
  for (const [slug, indices] of porSlug) {
    const orden = [...indices].sort((a, b) => a - b).join(',');
    if (orden !== '1,2,3') throw new Error(`El slug "${slug}" tiene indices [${orden}]; se requiere 1,2,3.`);
  }
  return filas;
}

const componerPrompt = (promptEscena) =>
  `${promptEscena} ${ESTILO_GLOBAL} ${RESTRICCIONES.join(' ')}`;

/** Estructura completa, lista para exportar a JSON/MD. */
function construirMapa() {
  const filas = leerTabla();
  const carreras = [];
  for (const slug of [...new Set(filas.map((f) => f.slug))]) {
    carreras.push({
      slug,
      nombre: NOMBRES_CARRERA[slug] || slug,
      area: AREA_CARRERA[slug] || '',
      imagenes: filas
        .filter((f) => f.slug === slug)
        .sort((a, b) => a.indice - b.indice)
        .map((f) => ({
          archivo: SLUG_A_ARCHIVO(f.slug, f.indice),
          indice: f.indice,
          titulo: acentuar(f.titulo),
          descripcionVisual: acentuar(f.descripcion),
          promptEscena: f.prompt,
          promptCompleto: componerPrompt(f.prompt),
        })),
    });
  }
  return carreras;
}

// ---------------------------------------------------------------------------
//  Carga de .env
// ---------------------------------------------------------------------------

async function cargarEnv() {
  const candidatos = [path.join(AQUI, '.env'), path.join(RAIZ, '.env')];
  for (const archivo of candidatos) {
    let texto;
    try { texto = await fs.readFile(archivo, 'utf8'); } catch { continue; }
    for (const linea of texto.split(/\r?\n/)) {
      const m = linea.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m || linea.trim().startsWith('#')) continue;
      const valor = m[2].trim().replace(/^["']|["']$/g, '');
      if (valor) process.env[m[1]] ??= valor;
    }
  }
}

// ---------------------------------------------------------------------------
//  Proveedores
// ---------------------------------------------------------------------------

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function pedirJson(url, opciones, intentos = 3) {
  let ultimoError;
  for (let intento = 1; intento <= intentos; intento++) {
    try {
      const res = await fetch(url, opciones);
      const cuerpo = await res.text();
      if (res.ok) return JSON.parse(cuerpo);

      const espera = res.headers.get('retry-after');
      const ms = espera ? Number(espera) * 1000 : 1500 * 2 ** (intento - 1);
      ultimoError = new Error(`HTTP ${res.status}: ${cuerpo.slice(0, 400)}`);
      if (res.status < 400 || res.status >= 500 || res.status === 429) {
        if (intento < intentos) { await esperar(ms); continue; }
      }
      throw ultimoError;
    } catch (e) {
      ultimoError = e;
      if (intento < intentos) { await esperar(1500 * 2 ** (intento - 1)); continue; }
      throw e;
    }
  }
  throw ultimoError;
}

const PROVEEDORES = {
  openai: {
    clave: 'OPENAI_API_KEY',
    descripcion: 'OpenAI gpt-image-1 (recomendado). Compatible con cualquier endpoint que exponga /v1/images/generations.',
    basePorDefecto: 'https://api.openai.com',
    async ejecutar({ prompt, cfg }) {
      const base = cfg.baseUrl || this.basePorDefecto;
      const datos = await pedirJson(`${base}/v1/images/generations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.clave}` },
        body: JSON.stringify({
          model: cfg.modelo,
          prompt,
          n: 1,
          size: cfg.size,
          quality: cfg.calidad,
          output_format: 'jpeg',
          output_compression: 92,
        }),
      });
      const b64 = datos?.data?.[0]?.b64_json;
      if (!b64) throw new Error('La respuesta de OpenAI no trae data[0].b64_json.');
      return Buffer.from(b64, 'base64');
    },
  },

  gemini: {
    clave: 'GEMINI_API_KEY',
    descripcion: 'Google Gemini / Imagen 3.',
    basePorDefecto: 'https://generativelanguage.googleapis.com',
    modeloPorDefecto: 'imagen-3.0-generate-002',
    async ejecutar({ prompt, cfg }) {
      const modelo = cfg.modelo || this.modeloPorDefecto;
      const url = `${cfg.baseUrl || this.basePorDefecto}/v1beta/models/${modelo}:predict?key=${cfg.clave}`;
      const datos = await pedirJson(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: { sampleCount: 1, aspectRatio: '16:9', sampleImageSize: '1K' },
        }),
      });
      const b64 = datos?.predictions?.[0]?.bytesBase64Encoded;
      if (!b64) throw new Error('La respuesta de Gemini no trae predictions[0].bytesBase64Encoded.');
      return Buffer.from(b64, 'base64');
    },
  },

  replicate: {
    clave: 'REPLICATE_API_TOKEN',
    descripcion: 'Replicate (Flux, SDXL y otros).',
    modeloPorDefecto: 'black-forest-labs/flux-1.1-pro',
    async ejecutar({ prompt, cfg }) {
      const modelo = cfg.modelo || this.modeloPorDefecto;
      const creado = await pedirJson('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.clave}` },
        body: JSON.stringify({ model: modelo, input: { prompt, aspect_ratio: '16:9', output_format: 'jpeg' } }),
      });

      const url = creado?.urls?.get;
      if (!url) throw new Error('Replicate no devolvio urls.get.');

      for (let i = 0; i < 60; i++) {
        await esperar(2000);
        const estado = await pedirJson(url, { headers: { Authorization: `Bearer ${cfg.clave}` } });
        if (estado.status === 'succeeded') {
          const salida = Array.isArray(estado.output) ? estado.output[0] : estado.output;
          const res = await fetch(salida);
          if (!res.ok) throw new Error(`No se pudo descargar la salida: HTTP ${res.status}`);
          return Buffer.from(await res.arrayBuffer());
        }
        if (estado.status === 'failed' || estado.status === 'canceled') {
          throw new Error(`Replicate: ${estado.status} - ${estado.error || ''}`);
        }
      }
      throw new Error('Replicate: tiempo de espera agotado.');
    },
  },

  a1111: {
    clave: null,
    descripcion: 'Automatic1111 / Forge local (gratis, requiere GPU).',
    basePorDefecto: 'http://127.0.0.1:7860',
    modeloPorDefecto: 'xl',
    async ejecutar({ prompt, cfg }) {
      const url = `${cfg.baseUrl || this.basePorDefecto}/sdapi/v1/txt2img`;
      const datos = await pedirJson(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          negative_prompt: 'text, letters, words, logo, watermark, badge, crest, flag, collage, split image, frame, border, lowres, blurry',
          width: 1536,
          height: 864,
          steps: 32,
          cfg_scale: 7,
          sampler_name: 'DPM++ 2M Karras',
        }),
      });
      const b64 = datos?.images?.[0];
      if (!b64) throw new Error('Automatic1111 no devolvio images[0].');
      return Buffer.from(b64, 'base64');
    },
  },
};

// ---------------------------------------------------------------------------
//  Normalización a 1600x900 (crop centro + escala, sin metadatos)
// ---------------------------------------------------------------------------

function ejecutar(comando, args) {
  return new Promise((resolve) => {
    const p = spawn(comando, args, { stdio: 'inherit', windowsHide: true });
    p.on('error', () => resolve(-1));
    p.on('close', (code) => resolve(code ?? -1));
  });
}

async function normalizar({ forzar }) {
  const ps = path.join(AQUI, 'normalizar.ps1');
  const tieneRaw = await fs.readdir(RAW).catch(() => []);
  if (!tieneRaw.some((f) => /\.(jpg|jpeg|png)$/i.test(f))) {
    console.log('\nNo hay imagenes en _raw/, se omite la normalizacion.');
    return true;
  }

  if (process.platform !== 'win32') {
    console.log('\n[aviso] La normalizacion automatica requiere Windows (System.Drawing).');
    console.log('       Ejecuta manualmente en Windows:');
    console.log(`       powershell -ExecutionPolicy Bypass -File "${ps}"`);
    return false;
  }

  const flags = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps,
    '-RawDir', RAW, '-DestDir', DESTINO, '-Ancho', String(MEDIDA.ancho),
    '-Alto', String(MEDIDA.alto), '-Calidad', String(CALIDAD_FINAL)];
  if (forzar) flags.push('-Forzar');

  console.log('\nNormalizando a 1600x900...');
  const codigo = await ejecutar('powershell.exe', flags);
  return codigo === 0;
}

// ---------------------------------------------------------------------------
//  CLI
// ---------------------------------------------------------------------------

function parsearArgs(argv) {
  const args = { concurrencia: 2, proveedor: 'openai' };
  for (const a of argv) {
    const m = a.match(/^--([\w-]+)(?:=(.*))?$/);
    if (!m) continue;
    const [, clave, valor] = m;
    if (clave === 'concurrencia') args.concurrencia = Math.max(1, Number(valor) || 2);
    else if (clave === 'solo') args.solo = valor ? valor.split(',').map((s) => s.trim()) : null;
    else args[clave] = valor === undefined ? true : valor;
  }
  return args;
}

const c = {
  ok: (s) => `\u001b[32m${s}\u001b[39m`,
  warn: (s) => `\u001b[33m${s}\u001b[39m`,
  err: (s) => `\u001b[31m${s}\u001b[39m`,
  dim: (s) => `\u001b[90m${s}\u001b[39m`,
  b: (s) => `\u001b[1m${s}\u001b[22m`,
};

async function exportarMapa() {
  const carreras = construirMapa();
  const total = carreras.reduce((n, k) => n + k.imagenes.length, 0);

  const mapa = {
    version: 1,
    actualizado: new Date().toISOString().slice(0, 10),
    generadoPor: 'tools/imagenes-carreras/generar.mjs --exportar-mapa',
    descripcion: 'Mapeo completo de imagenes del carrusel de Carreras. Prompt listo para pegar en cualquier generador.',
    destino: 'siga_frontend/public/assets/carreras',
    medida: { ancho: MEDIDA.ancho, alto: MEDIDA.alto, proporcion: '16:9', formato: 'jpg' },
    estiloGlobal: ESTILO_GLOBAL,
    restricciones: RESTRICCIONES,
    modeloRecomendado: { nombre: 'gpt-image-1', size: '1536x1024', quality: 'high', nota: 'se recorta al centro y se escala a 1600x900' },
    totalImagenes: total,
    carreras,
  };
  await fs.writeFile(MAPA_JSON, JSON.stringify(mapa, null, 2) + '\n', 'utf8');
  console.log(c.ok(`  ${MAPA_JSON}`));

  let md = `# Prompts de imágenes — Carreras (Gestión Académica)\n\n`;
  md += `Generado el ${mapa.actualizado}. ${total} imágenes · ${MEDIDA.ancho}×${MEDIDA.alto} (16:9) · JPG\n\n`;
  md += `> Sustituye cada bloque de prompt en tu generador y guarda el resultado con el nombre de archivo indicado, en \`siga_frontend/public/assets/carreras/\`.\n\n`;
  md += `## Estilo global (ya incluido en cada prompt)\n\n\`\`\`\n${ESTILO_GLOBAL}\n${RESTRICCIONES.join(' ')}\n\`\`\`\n\n`;
  for (const k of carreras) {
    md += `## ${k.nombre}\n\n*${k.area}*\n\n`;
    for (const img of k.imagenes) {
      md += `### ${img.archivo}\n\n${img.titulo} — ${img.descripcionVisual}\n\n\`\`\`\n${img.promptCompleto}\n\`\`\`\n\n`;
    }
  }
  await fs.writeFile(MAPA_MD, md, 'utf8');
  console.log(c.ok(`  ${MAPA_MD}`));
  return total;
}

async function verificar(archivos) {
  const existentes = await fs.readdir(DESTINO).catch(() => []);
  const esperados = archivos.map((f) => `${f.slug}-${f.indice}.jpg`);
  const faltan = esperados.filter((a) => !existentes.includes(a));
  const sobrantes = existentes.filter((f) => f.endsWith('.jpg') && !esperados.includes(f));

  console.log(c.b('\nVerificacion de archivos'));
  console.log(`  Esperados : ${esperados.length}`);
  console.log(`  Presentes : ${esperados.length - faltan.length}`);
  if (faltan.length) console.log(c.err(`  Faltan    : ${faltan.join(', ')}`));
  if (sobrantes.length) console.log(c.warn(`  Sin mapear: ${sobrantes.join(', ')}`));
  return faltan.length === 0;
}

async function main() {
  const args = parsearArgs(process.argv.slice(2));
  await cargarEnv();

  const filas = leerTabla();
  const seleccion = args.solo ? filas.filter((f) => args.solo.includes(f.slug)) : filas;

  console.log(c.b('\nPipeline de imagenes — Carreras / Gestion Academica'));
  console.log(c.dim(`  Destino : ${path.relative(RAIZ, DESTINO)}`));
  console.log(c.dim(`  Imagenes: ${seleccion.length} de ${filas.length}`));
  console.log(c.dim(`  Medida  : ${MEDIDA.ancho}x${MEDIDA.alto} (16:9)\n`));

  if (args['exportar-mapa']) {
    const n = await exportarMapa();
    console.log(c.ok(`\nMapa exportado con ${n} imagenes.\n`));
    return;
  }

  const completo = await verificar(seleccion);

  if (args.seco) {
    console.log(c.b('\n  Modo seco: no se llama a ninguna API.\n'));
    console.log(c.dim('  Ejemplo de prompt compuesto (administracion-empresas-1.jpg):\n'));
    console.log(`  ${componerPrompt(seleccion[0].prompt)}\n`);
    const n = await exportarMapa();
    console.log(c.ok(`  Mapa exportado con ${n} imagenes.\n`));
    return;
  }

  if (completo && !args.forzar) {
    console.log(c.warn('\n  Las 33 imagenas ya existen (pueden ser los placeholders).'));
    console.log(c.warn('  Usa --forzar para regenerarlas y reemplazarlas.\n'));
    return;
  }

  const nombreProv = String(args.proveedor);
  const prov = PROVEEDORES[nombreProv];
  if (!prov) {
    console.error(c.err(`\nProveedor desconocido: "${nombreProv}". Disponibles: ${Object.keys(PROVEEDORES).join(', ')}\n`));
    process.exitCode = 1;
    return;
  }

  const clave = prov.clave ? process.env[prov.clave] : null;
  if (prov.clave && !clave) {
    console.error(c.err(`\nFalta la variable ${prov.clave}. Agregala al archivo .env de la raiz del proyecto.\n`));
    process.exitCode = 1;
    return;
  }

  const cfg = {
    clave,
    baseUrl: args['base-url'] || undefined,
    modelo: args.modelo || undefined,
    size: args.size || '1536x1024',
    calidad: args.calidad || 'high',
  };

  console.log(c.b(`  Proveedor: ${nombreProv} — ${prov.descripcion}`));
  if (cfg.modelo) console.log(c.dim(`  Modelo   : ${cfg.modelo}`));
  console.log(c.dim(`  Paralelo : ${args.concurrencia}\n`));

  await fs.mkdir(RAW, { recursive: true });

  const pendientes = [];
  for (const f of seleccion) {
    const archivo = `${f.slug}-${f.indice}.jpg`;
    if (args.forzar || !(await fs.stat(path.join(DESTINO, archivo)).catch(() => null))) {
      pendientes.push({ ...f, archivo });
    }
  }

  if (args.limite) pendientes.splice(Number(args.limite));

  const cola = [...pendientes];
  let hechos = 0;
  let fallos = 0;

  async function trabajador() {
    while (cola.length) {
      const item = cola.shift();
      const prompt = componerPrompt(item.prompt);
      try {
        const buffer = await prov.ejecutar({ prompt, cfg });
        await fs.writeFile(path.join(RAW, item.archivo), buffer);
        hechos++;
        console.log(c.ok(`  [${hechos}/${pendientes.length}] ${item.archivo}`) + c.dim(`  (${(buffer.length / 1024).toFixed(0)} KB)`));
      } catch (e) {
        fallos++;
        console.log(c.err(`  [FALLO] ${item.archivo}: ${e.message}`));
      }
    }
  }

  console.log(c.b(`  Generando ${pendientes.length} imagenes...\n`));
  await Promise.all(Array.from({ length: Math.min(args.concurrencia, pendientes.length || 1) }, trabajador));

  console.log(c.b(`\n  Generadas: ${hechos}  |  Fallidas: ${fallos}`));

  if (hechos > 0) {
    const ok = await normalizar({ forzar: Boolean(args.forzar) });
    if (ok) {
      console.log(c.ok(`\n  Listo. Abre http://localhost:3000 (o el puerto de tu dev server).\n`));
      console.log(c.dim(`  Recuerda reiniciar el navegador: la carpeta public/ se copia en cada build.\n`));
    }
  }
  if (fallos > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(c.err(`\nError fatal: ${e.stack || e.message}\n`));
  process.exitCode = 1;
});
