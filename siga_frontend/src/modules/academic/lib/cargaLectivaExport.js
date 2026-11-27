// Exportación de la Carga Lectiva a Excel (.xlsx) real: cada dato en su columna.
// Antes era un CSV con comas y el Excel en español (Perú) lo abría todo en la columna A.
import { Sheet, buildWorkbook, downloadBlob } from '../../finances/lib/xlsxWriter';
import { INSTITUTION } from '../../finances/lib/paymentUtils';

const COLUMNAS = [
  { titulo: 'N°', ancho: 6 },
  { titulo: 'Ciclo', ancho: 8 },
  { titulo: 'Módulo formativo', ancho: 38 },
  { titulo: 'Unidad didáctica', ancho: 38 },
  { titulo: 'Créditos', ancho: 10 },
  { titulo: 'Horas', ancho: 9 },
  { titulo: 'Docente', ancho: 32 },
  { titulo: 'Correo del docente', ancho: 32 },
  { titulo: 'Turno', ancho: 11 },
  { titulo: 'Sección', ancho: 10 },
  { titulo: 'Estado', ancho: 13 },
];

const limpiarNombreArchivo = (s) => String(s || '').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();

export function exportarCargaLectivaExcel({ programa, periodo, cargaLectiva, unidadesFlat, buscarDocente }) {
  const sheet = new Sheet('Carga Lectiva');
  const ultimaCol = COLUMNAS.length - 1;
  sheet.colWidths = COLUMNAS.map(c => c.ancho);
  sheet.landscape = true;

  const pintarFila = (fila, valor, estilo) => {
    for (let c = 0; c <= ultimaCol; c++) sheet.set(c, fila, c === 0 ? valor : '', estilo);
    sheet.merge(0, fila, ultimaCol, fila);
  };
  const fecha = new Date().toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
  pintarFila(1, `${INSTITUTION.sigla}  |  CARGA LECTIVA DEL PERIODO ${periodo?.codigo || ''}`, 'banner');
  sheet.setRowHeight(1, 30);
  pintarFila(2, `Programa de estudios: ${programa?.nombre || ''}${programa?.codigo ? `  (${programa.codigo})` : ''}`, 'bannerSub');
  pintarFila(3, `Generado el ${fecha} · Sistema Integrado de Gestión Académica (SIGA)`, 'bannerSub');

  const filaTitulos = 5;
  COLUMNAS.forEach((c, i) => sheet.set(i, filaTitulos, c.titulo, 'header'));
  sheet.setRowHeight(filaTitulos, 22);

  const unidadPorId = new Map(unidadesFlat.map(u => [u.id, u]));
  const filas = [...cargaLectiva].sort((a, b) => {
    const ua = unidadPorId.get(a.unidad_didactica_id);
    const ub = unidadPorId.get(b.unidad_didactica_id);
    return (Number(ua?.periodo_sugerido) || 99) - (Number(ub?.periodo_sugerido) || 99)
      || String(ua?.nombre || '').localeCompare(String(ub?.nombre || ''))
      || String(a.seccion || '').localeCompare(String(b.seccion || ''));
  });

  let fila = filaTitulos + 1;
  filas.forEach((c, i) => {
    const ud = unidadPorId.get(c.unidad_didactica_id);
    const doc = buscarDocente(c.docente_id);
    const z = i % 2 === 1 ? 'Zebra' : '';
    const valores = [
      [i + 1, `int${z}`],
      [ud?.periodo_sugerido ?? '', `center${z}`],
      [ud?.modulo_nombre || '', `text${z}`],
      [ud?.nombre || `Unidad #${c.unidad_didactica_id}`, `bold${z}`],
      [ud?.creditos ?? '', `int${z}`],
      [ud?.horas ?? '', `int${z}`],
      [doc?.nombre || `Docente #${c.docente_id}`, `text${z}`],
      [doc?.email || '', `text${z}`],
      [c.turno || '', `center${z}`],
      [c.seccion || '', `center${z}`],
      [c.estado || '', `center${z}`],
    ];
    valores.forEach(([v, estilo], col) => sheet.set(col, fila, v, estilo));
    fila++;
  });
  if (filas.length === 0) {
    pintarFila(fila, 'No hay cursos asignados en este periodo.', 'text');
    fila++;
  }

  // Cursos de la malla que aún no tienen docente en este periodo
  const asignadas = new Set(cargaLectiva.map(c => c.unidad_didactica_id));
  const pendientes = unidadesFlat
    .filter(u => !asignadas.has(u.id))
    .sort((a, b) => (Number(a.periodo_sugerido) || 99) - (Number(b.periodo_sugerido) || 99) || String(a.nombre).localeCompare(String(b.nombre)));

  fila += 1;
  sheet.set(0, fila, `Resumen: ${filas.length} asignación(es) · ${pendientes.length} unidad(es) de la malla sin docente`, 'section');
  fila += 2;

  if (pendientes.length > 0) {
    sheet.set(0, fila, 'Unidades didácticas sin docente asignado', 'section');
    fila += 1;
    ['N°', 'Ciclo', 'Módulo formativo', 'Unidad didáctica', 'Créditos', 'Horas'].forEach((t, i) => sheet.set(i, fila, t, 'header'));
    fila += 1;
    pendientes.forEach((u, i) => {
      const z = i % 2 === 1 ? 'Zebra' : '';
      [[i + 1, `int${z}`], [u.periodo_sugerido ?? '', `center${z}`], [u.modulo_nombre || '', `text${z}`],
        [u.nombre, `bold${z}`], [u.creditos ?? '', `int${z}`], [u.horas ?? '', `int${z}`]]
        .forEach(([v, estilo], col) => sheet.set(col, fila, v, estilo));
      fila++;
    });
  }

  const titulo = limpiarNombreArchivo(`Carga Lectiva ${programa?.nombre || ''} ${periodo?.codigo || ''}`);
  downloadBlob(buildWorkbook([sheet], { title: titulo }), `${titulo}.xlsx`);
}
