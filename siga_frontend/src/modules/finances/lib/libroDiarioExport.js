// Exportación del Libro Diario de Caja a Excel (.xlsx) con formato profesional.
import { Sheet, buildWorkbook, downloadBlob, cellRef, toExcelDate } from './xlsxWriter';
import { INSTITUTION, formatDateTime, getReceiptVerificationCode, parseReceiptDate } from './paymentUtils';

const DETAIL_COLUMNS = [
  { title: 'N°', width: 6 },
  { title: 'N° Recibo', width: 17 },
  { title: 'Fecha y Hora', width: 17 },
  { title: 'Estudiante', width: 34 },
  { title: 'DNI', width: 12 },
  { title: 'Código Alumno', width: 16 },
  { title: 'Programa de Estudio', width: 32 },
  { title: 'Cód. TUPA', width: 10 },
  { title: 'Concepto', width: 40 },
  { title: 'Categoría', width: 16 },
  { title: 'Tarifa', width: 16 },
  { title: 'Método de Pago', width: 26 },
  { title: 'N° Operación', width: 18 },
  { title: 'Cajero', width: 24 },
  { title: 'Cód. Verificación', width: 15 },
  { title: 'Monto (S/)', width: 14 },
];

function writeHeaderBlock(sheet, lastCol, title, subtitleLines) {
  sheet.set(0, 1, `${INSTITUTION.sigla} — ${title}`, 'title');
  sheet.merge(0, 1, lastCol, 1);
  sheet.setRowHeight(1, 26);
  subtitleLines.forEach((line, i) => {
    sheet.set(0, 2 + i, line, 'subtitle');
    sheet.merge(0, 2 + i, lastCol, 2 + i);
  });
}

function buildDetailSheet(transactions, meta) {
  const sheet = new Sheet('Libro Diario');
  sheet.landscape = true;
  sheet.colWidths = DETAIL_COLUMNS.map(c => c.width);
  const lastCol = DETAIL_COLUMNS.length - 1;

  writeHeaderBlock(sheet, lastCol, 'LIBRO DIARIO DE CAJA 2026', [
    `${INSTITUTION.nombre} · RUC ${INSTITUTION.ruc} · ${INSTITUTION.direccion}`,
    `Generado: ${meta.generatedAt} · Responsable: ${meta.cashier} · Registros: ${transactions.length}${meta.filterLabel ? ` · Filtro: ${meta.filterLabel}` : ''}`,
  ]);

  const headerRow = 5;
  DETAIL_COLUMNS.forEach((c, i) => sheet.set(i, headerRow, c.title, 'header'));
  sheet.setRowHeight(headerRow, 22);

  const sorted = [...transactions].sort((a, b) => (parseReceiptDate(a)?.getTime() || 0) - (parseReceiptDate(b)?.getTime() || 0));
  sorted.forEach((t, idx) => {
    const r = headerRow + 1 + idx;
    const z = idx % 2 === 1 ? 'Zebra' : '';
    const date = parseReceiptDate(t);
    const values = [
      [idx + 1, `int${z}`],
      [t.codigoRecibo, `bold${z}`],
      date ? [toExcelDate(date), `datetime${z}`] : [t.fechaHora, `center${z}`],
      [t.estudianteNombre, `text${z}`],
      [String(t.dni ?? ''), `center${z}`],
      [t.codigoEstudiante, `center${z}`],
      [t.carreraNombre, `text${z}`],
      [t.conceptoCodigo, `center${z}`],
      [t.conceptoNombre, `text${z}`],
      [t.conceptoCategoria, `text${z}`],
      [t.tarifaNombre || 'General', `text${z}`],
      [t.metodoPagoNombre, `text${z}`],
      [t.numeroOperacion || '', `center${z}`],
      [t.cajero, `text${z}`],
      [getReceiptVerificationCode(t), `center${z}`],
      [parseFloat(t.monto) || 0, `money${z}`],
    ];
    values.forEach(([v, style], c) => sheet.set(c, r, v, style));
  });

  const firstDataRow = headerRow + 1;
  const lastDataRow = headerRow + Math.max(sorted.length, 1);
  const totalRow = lastDataRow + 1;
  const total = sorted.reduce((acc, t) => acc + (parseFloat(t.monto) || 0), 0);

  for (let c = 0; c < lastCol; c++) sheet.set(c, totalRow, '', 'totalLabel');
  sheet.set(0, totalRow, `TOTAL RECAUDADO (${sorted.length} operaciones)`, 'totalLabel');
  sheet.merge(0, totalRow, lastCol - 1, totalRow);
  sheet.set(lastCol, totalRow, total, 'totalMoney', `SUBTOTAL(9,${cellRef(lastCol, firstDataRow)}:${cellRef(lastCol, lastDataRow)})`);
  sheet.setRowHeight(totalRow, 20);

  sheet.autoFilter = `${cellRef(0, headerRow)}:${cellRef(lastCol, lastDataRow)}`;
  sheet.freeze = { row: headerRow + 1 };
  return sheet;
}

function writeSummaryTable(sheet, startRow, title, columns, rows) {
  sheet.set(0, startRow, title, 'section');
  sheet.merge(0, startRow, columns.length - 1, startRow);
  const headerRow = startRow + 1;
  columns.forEach((c, i) => sheet.set(i, headerRow, c.title, 'header'));
  sheet.setRowHeight(headerRow, 20);

  rows.forEach((row, idx) => {
    const r = headerRow + 1 + idx;
    const z = idx % 2 === 1 ? 'Zebra' : '';
    columns.forEach((c, i) => sheet.set(i, r, row[i], `${c.style}${z}`));
  });

  const firstRow = headerRow + 1;
  const lastRow = headerRow + Math.max(rows.length, 1);
  const totalRow = lastRow + 1;
  columns.forEach((c, i) => {
    if (c.sum) {
      const total = rows.reduce((acc, row) => acc + (Number(row[i]) || 0), 0);
      sheet.set(i, totalRow, total, c.style === 'money' ? 'totalMoney' : 'totalInt', `SUM(${cellRef(i, firstRow)}:${cellRef(i, lastRow)})`);
    } else {
      sheet.set(i, totalRow, i === 0 ? 'TOTAL' : '', 'totalLabel');
    }
  });
  return totalRow + 2;
}

function groupBy(transactions, keyFn) {
  const map = new Map();
  transactions.forEach(t => {
    const key = keyFn(t);
    if (!map.has(key)) map.set(key, { count: 0, total: 0, sample: t });
    const g = map.get(key);
    g.count += 1;
    g.total += parseFloat(t.monto) || 0;
  });
  return map;
}

function buildSummarySheet(transactions, meta) {
  const sheet = new Sheet('Resumen');
  sheet.colWidths = [30, 44, 16, 18];
  writeHeaderBlock(sheet, 3, 'RESUMEN DE RECAUDACIÓN', [
    `Generado: ${meta.generatedAt} · Responsable: ${meta.cashier}`,
  ]);

  let row = 4;

  const byMethod = groupBy(transactions, t => t.metodoPagoNombre || 'Sin especificar');
  row = writeSummaryTable(sheet, row, 'Recaudación por método de pago', [
    { title: 'Método de pago', style: 'bold' },
    { title: 'Detalle', style: 'text' },
    { title: 'N° operaciones', style: 'int', sum: true },
    { title: 'Monto (S/)', style: 'money', sum: true },
  ], [...byMethod.entries()].sort((a, b) => b[1].total - a[1].total).map(([name, g]) => [name, '', g.count, g.total]));

  const byConcept = groupBy(transactions, t => t.conceptoCodigo || '—');
  row = writeSummaryTable(sheet, row, 'Recaudación por concepto TUPA', [
    { title: 'Código TUPA', style: 'center' },
    { title: 'Concepto', style: 'text' },
    { title: 'N° operaciones', style: 'int', sum: true },
    { title: 'Monto (S/)', style: 'money', sum: true },
  ], [...byConcept.entries()].sort((a, b) => b[1].total - a[1].total).map(([code, g]) => [code, g.sample.conceptoNombre, g.count, g.total]));

  const byDay = groupBy(transactions, t => {
    const d = parseReceiptDate(t);
    return d ? new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() : 0;
  });
  writeSummaryTable(sheet, row, 'Recaudación por fecha', [
    { title: 'Fecha', style: 'date' },
    { title: 'Detalle', style: 'text' },
    { title: 'N° operaciones', style: 'int', sum: true },
    { title: 'Monto (S/)', style: 'money', sum: true },
  ], [...byDay.entries()].sort((a, b) => a[0] - b[0]).map(([ts, g]) => [ts ? toExcelDate(new Date(ts)) : 'Sin fecha', `${g.count} recibo(s)`, g.count, g.total]));

  return sheet;
}

export function exportLibroDiarioXlsx(transactions, { cashier = 'Caja Central', filterLabel = '' } = {}) {
  const meta = { generatedAt: formatDateTime(new Date()), cashier, filterLabel };
  const blob = buildWorkbook([
    buildDetailSheet(transactions, meta),
    buildSummarySheet(transactions, meta),
  ]);
  const stamp = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `Libro_Diario_Caja_IESTP_Suiza_${stamp}.xlsx`);
}
