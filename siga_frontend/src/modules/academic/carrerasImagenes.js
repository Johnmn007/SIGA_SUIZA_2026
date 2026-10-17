/**
 * Estructura de datos de imágenes por carrera.
 *
 * Cada entrada agrupa las 3 imágenes del carrusel de una carrera.
 * Las rutas apuntan a `siga_frontend/public/assets/carreras/`, por lo que se
 * sirven desde la raíz del sitio: `/assets/carreras/...`
 *
 * Para reemplazarlas por fotografías reales basta con sobrescribir los archivos
 * `.jpg` manteniendo exactamente el mismo nombre.
 *
 * Formato exigido a cada archivo:
 *   - 1600 x 900 px (16:9 horizontal) — misma medida para las 33 imágenes
 *   - JPG (o JPG renombrado a .webp solo si se ajusta la extensión aquí)
 *   - Sin texto incrustado, sin logos, sin marcas de agua
 *   - Peso recomendado: 120 KB - 250 KB
 */

const A = '/assets/carreras';

const INST = 'https://iestpsuiza.edu.pe/wp-content/uploads/2023/10';

/** Imagen mostrada cuando la ruta no existe, falla la carga o no hay coincidencia. */
export const IMAGEN_POR_DEFECTO = `${A}/default.jpg`;

/** Duración del autoplay en milisegundos. */
export const CARRUSEL_AUTOPLAY_MS = 4000;

/** Nº de imágenes que debe tener cada carrera (solo informativo / validación). */
export const IMAGENES_POR_CARRERA = 3;

/**
 * Mapa de carreras -> imágenes.
 *
 * `match` son las palabras clave (en mayúsculas, sin tildes) con las que se
 * localiza la carrera dentro de `program.nombre` vindo del backend. Se evalúan
 * en orden, así que conviene poner primero la clave más específica.
 */
export const CARRERAS_IMAGENES = [
  {
    slug: 'administracion-empresas',
    nombre: 'Administración de Empresas',
    match: ['ADMINISTRACION DE EMPRESAS', 'ADMINISTRACION EMPRESAR', 'GESTION ADMINISTRATIVA'],
    imagenes: [
      `${INST}/PE.AA_-1024x683.webp`,
      `${INST}/PE.AA_-1024x683.webp`,
      `${INST}/PE.AA_-1024x683.webp`,
    ],
  },
  {
    slug: 'administracion-operaciones-turisticas',
    nombre: 'Administración de Operaciones Turísticas',
    match: ['OPERACIONES TURISTICAS', 'TURISMO', 'HOTELERIA'],
    imagenes: [
      `${INST}/PE-AOT-1024x683.webp`,
      `${INST}/PE-AOT-1024x683.webp`,
      `${INST}/PE-AOT-1024x683.webp`,
    ],
  },
  {
    slug: 'asistencia-administrativa',
    nombre: 'Asistencia Administrativa',
    match: ['ASISTENCIA ADMINISTRATIVA'],
    imagenes: [
      `${INST}/PE.AA_-1024x683.webp`,
      `${INST}/PE.AA_-1024x683.webp`,
      `${INST}/PE.AA_-1024x683.webp`,
    ],
  },
  {
    slug: 'contabilidad',
    nombre: 'Contabilidad',
    match: ['CONTABILIDAD'],
    imagenes: [
      `${INST}/PE-C-1024x683.webp`,
      `${INST}/PE-C-1024x683.webp`,
      `${INST}/PE-C-1024x683.webp`,
    ],
  },
  {
    slug: 'construccion-civil',
    nombre: 'Construcción Civil',
    match: ['CONSTRUCCION CIVIL', 'CONSTRUCCION'],
    imagenes: [
      `${INST}/PE-CC-1024x683.webp`,
      `${INST}/PE-CC-1024x683.webp`,
      `${INST}/PE-CC-1024x683.webp`,
    ],
  },
  {
    slug: 'desarrollo-sistemas-informacion',
    nombre: 'Desarrollo de Sistemas de Información',
    match: ['DESARROLLO DE SISTEMAS', 'SISTEMAS DE INFORMACION', 'SISTEMAS'],
    imagenes: [
      `${INST}/PE-DSI-1024x683.webp`,
      `${INST}/PE-DSI-1024x683.webp`,
      `${INST}/PE-DSI-1024x683.webp`,
    ],
  },
  {
    slug: 'electricidad-industrial',
    nombre: 'Electricidad Industrial',
    match: ['ELECTRICIDAD INDUSTRIAL', 'ELECTRICIDAD'],
    imagenes: [
      `${INST}/PE-EI-1024x683.webp`,
      `${INST}/PE-EI-1024x683.webp`,
      `${INST}/PE-EI-1024x683.webp`,
    ],
  },
  {
    slug: 'enfermeria-tecnica',
    nombre: 'Enfermería Técnica',
    match: ['ENFERMERIA TECNICA', 'ENFERMERIA'],
    imagenes: [
      `${INST}/PE-ET-1024x683.webp`,
      `${INST}/PE-ET-1024x683.webp`,
      `${INST}/PE-ET-1024x683.webp`,
    ],
  },
  {
    slug: 'manejo-forestal',
    nombre: 'Manejo Forestal',
    match: ['MANEJO FORESTAL', 'FORESTAL'],
    imagenes: [
      `${INST}/PE-MF-1024x683.webp`,
      `${INST}/PE-MF-1024x683.webp`,
      `${INST}/PE-MF-1024x683.webp`,
    ],
  },
  {
    slug: 'mecatronica-automotriz',
    nombre: 'Mecatrónica Automotriz',
    match: ['MECATRONICA AUTOMOTRIZ', 'MECATRONICA', 'AUTOMOTRIZ'],
    imagenes: [
      `${INST}/PE-MA-1024x683.webp`,
      `${INST}/PE-MA-1024x683.webp`,
      `${INST}/PE-MA-1024x683.webp`,
    ],
  },
  {
    slug: 'produccion-agropecuaria',
    nombre: 'Producción Agropecuaria',
    match: ['PRODUCCION AGROPECUARIA', 'AGROPECUARIA'],
    imagenes: [
      `${INST}/PE-PA-1024x683.webp`,
      `${INST}/PE-PA-1024x683.webp`,
      `${INST}/PE-PA-1024x683.webp`,
    ],
  },
  {
    slug: 'gestion-administrativa',
    nombre: 'Gestión Administrativa',
    match: ['GESTION ADMINISTRATIVA'],
    imagenes: [
      `${INST}/PE.AA_-1024x683.webp`,
      `${INST}/PE.AA_-1024x683.webp`,
      `${INST}/PE.AA_-1024x683.webp`,
    ],
  },
];

/** Quita tildes y pasa a mayúsculas para comparar nombres de forma tolerante. */
export function normalizarNombre(valor) {
  return (valor || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Devuelve las 3 imágenes de la carrera indicada.
 * Si no hay coincidencia exacta con el catálogo, intenta un segundo pase por
 * coincidencia parcial; si tampoco encuentra, devuelve la imagen por defecto
 * repetida para que el carrusel nunca quede vacío.
 */
export function getCarreraImagenes(nombreCarrera) {
  const n = normalizarNombre(nombreCarrera);
  if (!n) return [IMAGEN_POR_DEFECTO, IMAGEN_POR_DEFECTO, IMAGEN_POR_DEFECTO];

  const exacto = CARRERAS_IMAGENES.find(c => c.match.some(m => n === m));
  if (exacto) return exacto.imagenes;

  const parcial = CARRERAS_IMAGENES.find(c => c.match.some(m => n.includes(m)));
  if (parcial) return parcial.imagenes;

  return [IMAGEN_POR_DEFECTO, IMAGEN_POR_DEFECTO, IMAGEN_POR_DEFECTO];
}
