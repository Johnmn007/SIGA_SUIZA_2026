// Exportación del Libro Diario de Caja a Excel (.xlsx): detalle con indicadores, resumen con gráficos,
// arqueo por día y alumnos pendientes de pago. Las hojas de resumen usan fórmulas sobre el Libro Diario.
import { Sheet, buildWorkbook, downloadBlob, cellRef, columnLetter, sheetRef, toExcelDate } from './xlsxWriter';
import { INSTITUTION, formatDateTime, getReceiptVerificationCode, parseReceiptDate } from './paymentUtils';

const SHEET_DETAIL = 'Libro Diario';
const SHEET_SUMMARY = 'Resumen';
const SHEET_DAILY = 'Por Día';
const SHEET_PENDING = 'Pendientes de Pago';
const SHEET_TARIFF = 'Tarifario TUPA';
const NO_DATE = 'Sin fecha';
const FOOTER = `${INSTITUTION.sigla} · Tesorería y Caja`;

// Colores por método de pago (celdas y gráfico)
const METHOD_STYLES = {
  efectivo: { style: 'methodEfectivo', color: '047857', order: 1 },
  banco_nacion: { style: 'methodBanco', color: '1D4ED8', order: 2 },
  yape_plin: { style: 'methodYape', color: '7E22CE', order: 3 },
  tarjeta_pos: { style: 'methodTarjeta', color: 'B45309', order: 4 },
};
const OTHER_METHOD = { style: 'methodOtro', color: '64748B', order: 9 };
const methodInfo = (id) => METHOD_STYLES[id] || OTHER_METHOD;

// Columnas del Libro Diario; COL.* es el índice que usan las fórmulas de las demás hojas
const DETAIL_COLUMNS = [
  { key: 'n', title: 'N°', width: 8 },
  { key: 'fecha', title: 'Fecha', width: 12 },
  { key: 'hora', title: 'Hora', width: 10 },
  { key: 'recibo', title: 'N° Recibo', width: 17 },
  { key: 'dni', title: 'DNI', width: 12 },
  { key: 'estudiante', title: 'Estudiante', width: 36 },
  { key: 'programa', title: 'Programa de Estudio', width: 36 },
  { key: 'codigo', title: 'Cód. TUPA', width: 13 },
  { key: 'concepto', title: 'Concepto', width: 44 },
  { key: 'categoria', title: 'Categoría', width: 16 },
  { key: 'tarifa', title: 'Tarifa', width: 14 },
  { key: 'metodo', title: 'Método de Pago', width: 31 },
  { key: 'operacion', title: 'N° Operación', width: 21 },
  { key: 'monto', title: 'Monto (S/)', width: 14 },
  { key: 'cajero', title: 'Cajero', width: 22 },
  { key: 'alumno', title: 'Código Alumno', width: 16 },
  { key: 'verificacion', title: 'Cód. Verificación', width: 18 },
];
const COL = Object.fromEntries(DETAIL_COLUMNS.map((c, i) => [c.key, i]));
const DETAIL_HEADER_ROW = 6;

const money = (v) => parseFloat(v) || 0;
const round2 = (v) => Math.round(v * 100) / 100;

// Fecha del día: para los títulos (30/10/2026) y el nombre del archivo (30-10-2026), que no admite "/"
function todayLabels(now) {
  const pad = (n) => String(n).padStart(2, '0');
  const label = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
  return { label, fileLabel: label.replace(/\//g, '-') };
}

function normalize(t) {
  const date = parseReceiptDate(t);
  return {
    date,
    dayKey: date ? toExcelDate(new Date(date.getFullYear(), date.getMonth(), date.getDate())) : NO_DATE,
    time: date ? toExcelDate(date) % 1 : null,
    recibo: t.codigoRecibo,
    dni: String(t.dni ?? ''),
    estudiante: t.estudianteNombre || '',
    programa: t.carreraNombre || 'Sin programa',
    codigo: t.conceptoCodigo || 'S/C',
    concepto: t.conceptoNombre || '',
    categoria: t.conceptoCategoria || 'Otros',
    tarifa: t.tarifaNombre || 'General',
    metodoId: t.metodoPagoId,
    metodo: t.metodoPagoNombre || 'Sin especificar',
    operacion: t.numeroOperacion || '',
    monto: money(t.monto),
    cajero: t.cajero || 'Caja Central',
    alumno: t.codigoEstudiante || '',
    verificacion: getReceiptVerificationCode(t),
  };
}

function writeBanner(sheet, lastCol, title, detailLines) {
  const paint = (row, value, style) => {
    for (let c = 0; c <= lastCol; c++) sheet.set(c, row, c === 0 ? value : '', style);
    sheet.merge(0, row, lastCol, row);
  };
  paint(1, `${INSTITUTION.sigla}  |  ${title}`, 'banner');
  sheet.setRowHeight(1, 30);
  detailLines.forEach((line, i) => {
    paint(2 + i, line, 'bannerSub');
    sheet.setRowHeight(2 + i, 16);
  });
}

// Tarjeta de indicador: etiqueta arriba y valor abajo, ocupando las columnas c1..c2
function writeKpi(sheet, row, c1, c2, label, value, style, formula = null) {
  for (let c = c1; c <= c2; c++) {
    sheet.set(c, row, c === c1 ? label : '', 'kpiLabel');
    sheet.set(c, row + 1, c === c1 ? value : '', style, c === c1 ? formula : null);
  }
  if (c2 > c1) {
    sheet.merge(c1, row, c2, row);
    sheet.merge(c1, row + 1, c2, row + 1);
  }
}

function periodLabel(rows) {
  const dates = rows.map(r => r.date).filter(Boolean).map(d => d.getTime());
  if (!dates.length) return NO_DATE;
  const fmt = (ms) => new Date(ms).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const [min, max] = [Math.min(...dates), Math.max(...dates)];
  return min === max || fmt(min) === fmt(max) ? fmt(min) : `${fmt(min)} al ${fmt(max)}`;
}

function buildDetailSheet(rows, meta) {
  const sheet = new Sheet(SHEET_DETAIL);
  sheet.landscape = true;
  sheet.tabColor = 'FF0A2552';
  sheet.footer = FOOTER;
  sheet.colWidths = DETAIL_COLUMNS.map(c => c.width);
  const lastCol = DETAIL_COLUMNS.length - 1;
  const firstRow = DETAIL_HEADER_ROW + 1;
  const lastRow = DETAIL_HEADER_ROW + Math.max(rows.length, 1);
  const moneyRange = `${cellRef(COL.monto, firstRow)}:${cellRef(COL.monto, lastRow)}`;
  const total = rows.reduce((acc, r) => acc + r.monto, 0);

  writeBanner(sheet, lastCol, `LIBRO DIARIO DE CAJA  |  ${meta.today}`, [
    `${INSTITUTION.nombre} · RUC ${INSTITUTION.ruc} · ${INSTITUTION.direccion}  |  Generado: ${meta.generatedAt} · Responsable: ${meta.cashier}${meta.filterLabel ? ` · Filtro: ${meta.filterLabel}` : ''}`,
  ]);

  // Indicadores: el total, las operaciones y el promedio se recalculan al usar los filtros de las columnas
  writeKpi(sheet, 3, 0, 3, 'TOTAL RECAUDADO', round2(total), 'kpiMoney', `SUBTOTAL(9,${moneyRange})`);
  writeKpi(sheet, 3, 4, 5, 'OPERACIONES', rows.length, 'kpiInt', `SUBTOTAL(103,${cellRef(COL.recibo, firstRow)}:${cellRef(COL.recibo, lastRow)})`);
  writeKpi(sheet, 3, 6, 6, 'PROMEDIO POR OPERACIÓN', rows.length ? round2(total / rows.length) : 0, 'kpiMoneyAlt', `IFERROR(SUBTOTAL(1,${moneyRange}),0)`);
  writeKpi(sheet, 3, 7, 8, 'PERÍODO DEL REPORTE', periodLabel(rows), 'kpiText');
  sheet.setRowHeight(3, 16);
  sheet.setRowHeight(4, 26);
  sheet.setRowHeight(5, 6);

  DETAIL_COLUMNS.forEach((c, i) => sheet.set(i, DETAIL_HEADER_ROW, c.title, 'header'));
  sheet.setRowHeight(DETAIL_HEADER_ROW, 24);

  rows.forEach((row, idx) => {
    const r = firstRow + idx;
    const z = idx % 2 === 1 ? 'Zebra' : '';
    const values = {
      n: [idx + 1, `int${z}`],
      fecha: row.date ? [row.dayKey, `date${z}`] : [NO_DATE, `center${z}`],
      hora: row.time === null ? ['', `center${z}`] : [row.time, `time${z}`],
      recibo: [row.recibo, `bold${z}`],
      dni: [row.dni, `center${z}`],
      estudiante: [row.estudiante, `text${z}`],
      programa: [row.programa, `text${z}`],
      codigo: [row.codigo, `center${z}`],
      concepto: [row.concepto, `text${z}`],
      categoria: [row.categoria, `text${z}`],
      tarifa: [row.tarifa, `center${z}`],
      metodo: [row.metodo, methodInfo(row.metodoId).style],
      operacion: [row.operacion, `center${z}`],
      monto: [row.monto, `moneyBold${z}`],
      cajero: [row.cajero, `text${z}`],
      alumno: [row.alumno, `center${z}`],
      verificacion: [row.verificacion, `center${z}`],
    };
    DETAIL_COLUMNS.forEach((c, i) => sheet.set(i, r, values[c.key][0], values[c.key][1]));
    sheet.setRowHeight(r, 18);
  });

  const totalRow = lastRow + 1;
  for (let c = 0; c <= lastCol; c++) sheet.set(c, totalRow, '', 'totalLabel');
  sheet.set(0, totalRow, `TOTAL (${rows.length} operaciones)`, 'totalLabel');
  sheet.merge(0, totalRow, COL.monto - 1, totalRow);
  sheet.set(COL.monto, totalRow, round2(total), 'totalMoney', `SUBTOTAL(9,${moneyRange})`);
  sheet.setRowHeight(totalRow, 22);

  // Tabla de Excel: al bajar, los títulos reemplazan a las letras de columna sin inmovilizar filas
  sheet.tables = [{
    name: 'LibroDiario',
    ref: `${cellRef(0, DETAIL_HEADER_ROW)}:${cellRef(lastCol, lastRow)}`,
    columns: DETAIL_COLUMNS.map(c => c.title),
  }];
  sheet.printTitleRow = DETAIL_HEADER_ROW;
  sheet.textNumberRanges = ['dni', 'codigo', 'operacion', 'alumno'].map(k => `${cellRef(COL[k], firstRow)}:${cellRef(COL[k], lastRow)}`);
  return sheet;
}

// Rangos absolutos del Libro Diario para las fórmulas de las demás hojas
function detailRange(key, rowCount) {
  const letter = columnLetter(COL[key]);
  const first = DETAIL_HEADER_ROW + 1;
  const last = DETAIL_HEADER_ROW + Math.max(rowCount, 1);
  return sheetRef(SHEET_DETAIL, `$${letter}$${first}:$${letter}$${last}`);
}

function groupRows(rows, keyFn) {
  const map = new Map();
  rows.forEach(r => {
    const key = keyFn(r);
    if (!map.has(key)) map.set(key, { key, count: 0, total: 0, sample: r, lastDate: null });
    const g = map.get(key);
    g.count += 1;
    g.total += r.monto;
    if (r.date && (!g.lastDate || r.date > g.lastDate)) g.lastDate = r.date;
  });
  return [...map.values()].sort((a, b) => b.total - a.total);
}

const lastPaymentLabel = (g) => (g.lastDate
  ? `Último pago: ${g.lastDate.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
  : NO_DATE);

// Tabla de resumen: etiqueta | detalle | operaciones | monto | participación
function writeSummaryTable(sheet, startRow, title, labelTitle, detailTitle, groups, detailKey, rowCount, options = {}) {
  sheet.set(0, startRow, title, 'section');
  sheet.merge(0, startRow, 4, startRow);
  sheet.setRowHeight(startRow, 20);
  const headerRow = startRow + 1;
  [labelTitle, detailTitle, 'Operaciones', 'Monto (S/)', '% del total'].forEach((t, i) => sheet.set(i, headerRow, t, 'header'));
  sheet.setRowHeight(headerRow, 20);

  const first = headerRow + 1;
  const last = headerRow + Math.max(groups.length, 1);
  const totalRow = last + 1;
  const grandTotal = groups.reduce((acc, g) => acc + g.total, 0);
  const grandCount = groups.reduce((acc, g) => acc + g.count, 0);
  const keyRange = detailRange(detailKey, rowCount);
  const moneyRange = detailRange('monto', rowCount);

  groups.forEach((g, idx) => {
    const r = first + idx;
    const z = idx % 2 === 1 ? 'Zebra' : '';
    sheet.set(0, r, g.key, options.labelStyle ? options.labelStyle(g) : `bold${z}`);
    sheet.set(1, r, options.detail ? options.detail(g) : '', `text${z}`);
    sheet.set(2, r, g.count, `int${z}`, `COUNTIFS(${keyRange},$A${r})`);
    sheet.set(3, r, round2(g.total), `money${z}`, `SUMIFS(${moneyRange},${keyRange},$A${r})`);
    sheet.set(4, r, grandTotal ? g.total / grandTotal : 0, `pct${z}`, `IF($D$${totalRow}=0,0,D${r}/$D$${totalRow})`);
    sheet.setRowHeight(r, 18);
  });

  sheet.set(0, totalRow, 'TOTAL', 'totalLabel');
  sheet.set(1, totalRow, '', 'totalLabel');
  sheet.set(2, totalRow, grandCount, 'totalInt', `SUM(C${first}:C${last})`);
  sheet.set(3, totalRow, round2(grandTotal), 'totalMoney', `SUM(D${first}:D${last})`);
  sheet.set(4, totalRow, grandTotal ? 1 : 0, 'totalPct', `SUM(E${first}:E${last})`);
  sheet.setRowHeight(totalRow, 20);
  sheet.dataBars.push({ ref: `E${first}:E${last}`, color: options.barColor || 'FF93C5FD' });
  return { first, last, next: totalRow + 2 };
}

function buildSummarySheet(rows, dailySheet, meta) {
  const sheet = new Sheet(SHEET_SUMMARY);
  sheet.landscape = true;
  sheet.tabColor = 'FF047857';
  sheet.footer = FOOTER;
  sheet.colWidths = [38, 46, 13, 16, 13, 3, 12, 12, 12, 12, 12, 12];
  const lastCol = 11;
  const total = rows.reduce((acc, r) => acc + r.monto, 0);
  const moneyRange = detailRange('monto', rows.length);
  const reciboRange = detailRange('recibo', rows.length);

  writeBanner(sheet, lastCol, `RESUMEN DE RECAUDACIÓN  |  ${meta.today}`, [
    `Período: ${periodLabel(rows)}  |  Generado: ${meta.generatedAt} · Responsable: ${meta.cashier}${meta.filterLabel ? ` · Filtro: ${meta.filterLabel}` : ''}`,
  ]);
  sheet.setRowHeight(3, 6);

  writeKpi(sheet, 4, 0, 0, 'TOTAL RECAUDADO', round2(total), 'kpiMoney', `SUM(${moneyRange})`);
  writeKpi(sheet, 4, 1, 1, 'OPERACIONES', rows.length, 'kpiInt', `COUNTA(${reciboRange})`);
  writeKpi(sheet, 4, 2, 3, 'PROMEDIO POR OPERACIÓN', rows.length ? round2(total / rows.length) : 0, 'kpiMoneyAlt', 'IF(B5=0,0,A5/B5)');
  writeKpi(sheet, 4, 4, 4, 'ALUMNOS', new Set(rows.map(r => r.dni)).size, 'kpiInt');
  sheet.setRowHeight(4, 16);
  sheet.setRowHeight(5, 28);

  let row = 7;
  if (meta.pending) {
    const { students, amount } = meta.pending;
    writeKpi(sheet, row, 0, 0, 'MATRÍCULA POR COBRAR', round2(students.length * amount), 'kpiMoneyAlt');
    writeKpi(sheet, row, 1, 1, 'ALUMNOS CON DEUDA DE MATRÍCULA', students.length, 'kpiInt');
    sheet.setRowHeight(row, 16);
    sheet.setRowHeight(row + 1, 28);
    row += 3;
  }

  const byMethod = groupRows(rows, r => r.metodo)
    .sort((a, b) => methodInfo(a.sample.metodoId).order - methodInfo(b.sample.metodoId).order);
  const methodTable = writeSummaryTable(sheet, row, 'Recaudación por método de pago', 'Método de pago', 'Referencia', byMethod, 'metodo', rows.length, {
    labelStyle: g => methodInfo(g.sample.metodoId).style,
    detail: lastPaymentLabel,
    barColor: 'FF86EFAC',
  });

  const byConcept = groupRows(rows, r => r.codigo);
  const conceptTable = writeSummaryTable(sheet, methodTable.next, 'Recaudación por concepto TUPA', 'Código TUPA', 'Concepto', byConcept, 'codigo', rows.length, {
    detail: g => g.sample.concepto,
  });

  const byProgram = groupRows(rows, r => r.programa);
  const programTable = writeSummaryTable(sheet, conceptTable.next, 'Recaudación por programa de estudio', 'Programa de estudio', 'Referencia', byProgram, 'programa', rows.length, {
    detail: lastPaymentLabel,
    barColor: 'FFC4B5FD',
  });

  const byCashier = groupRows(rows, r => r.cajero);
  writeSummaryTable(sheet, programTable.next, 'Recaudación por cajero', 'Cajero', 'Referencia', byCashier, 'cajero', rows.length, {
    detail: lastPaymentLabel,
    barColor: 'FFFDE68A',
  });
  sheet.textNumberRanges = [`A${conceptTable.first}:A${conceptTable.last}`];

  // Gráficos a la derecha de las tablas
  sheet.charts.push({
    type: 'doughnut',
    title: 'Recaudación por método de pago',
    catRef: sheetRef(SHEET_SUMMARY, `$A$${methodTable.first}:$A$${methodTable.last}`),
    valRef: sheetRef(SHEET_SUMMARY, `$D$${methodTable.first}:$D$${methodTable.last}`),
    categories: byMethod.map(g => g.key),
    values: byMethod.map(g => round2(g.total)),
    colors: byMethod.map(g => methodInfo(g.sample.metodoId).color),
    formatCode: '"S/ "#,##0.00',
    anchor: { col: 6, row: 4, col2: 12, row2: 20 },
  });
  sheet.charts.push({
    type: 'column',
    title: 'Recaudación por día',
    catRef: sheetRef(SHEET_DAILY, dailySheet.layout.labelRange),
    valRef: sheetRef(SHEET_DAILY, dailySheet.layout.totalRange),
    categories: dailySheet.layout.labels,
    values: dailySheet.layout.totals,
    color: '0044B2',
    formatCode: '#,##0',
    anchor: { col: 6, row: 21, col2: 12, row2: 38 },
  });
  return sheet;
}

// Arqueo diario: una fila por día con el monto de cada método de pago y el acumulado
function buildDailySheet(rows, meta) {
  const sheet = new Sheet(SHEET_DAILY);
  sheet.landscape = true;
  sheet.tabColor = 'FF0044B2';
  sheet.footer = FOOTER;

  const methods = groupRows(rows, r => r.metodo)
    .sort((a, b) => methodInfo(a.sample.metodoId).order - methodInfo(b.sample.metodoId).order);
  const firstMethodCol = 3;
  const totalCol = firstMethodCol + methods.length;
  const accumCol = totalCol + 1;
  sheet.colWidths = [13, 14, 12, ...methods.map(() => 18), 15, 15];

  writeBanner(sheet, accumCol, `ARQUEO DIARIO DE CAJA  |  ${meta.today}`, [
    `Período: ${periodLabel(rows)}  |  Generado: ${meta.generatedAt} · Responsable: ${meta.cashier}`,
  ]);
  sheet.setRowHeight(3, 6);

  const headerRow = 4;
  ['Fecha', 'Día', 'Operaciones'].forEach((t, i) => sheet.set(i, headerRow, t, 'header'));
  methods.forEach((m, i) => sheet.set(firstMethodCol + i, headerRow, m.key, 'header'));
  sheet.set(totalCol, headerRow, 'Total del día', 'header');
  sheet.set(accumCol, headerRow, 'Acumulado', 'header');
  sheet.setRowHeight(headerRow, 32);

  const days = [...new Set(rows.map(r => r.dayKey))].sort((a, b) => {
    if (a === NO_DATE) return 1;
    if (b === NO_DATE) return -1;
    return a - b;
  });
  const first = headerRow + 1;
  const last = headerRow + Math.max(days.length, 1);
  const fechaRange = detailRange('fecha', rows.length);
  const metodoRange = detailRange('metodo', rows.length);
  const moneyRange = detailRange('monto', rows.length);
  const totalLetter = columnLetter(totalCol);
  const accumLetter = columnLetter(accumCol);
  const labels = [];
  const totals = [];
  let accumulated = 0;

  days.forEach((day, idx) => {
    const r = first + idx;
    const z = idx % 2 === 1 ? 'Zebra' : '';
    const dayRows = rows.filter(x => x.dayKey === day);
    const sample = dayRows[0].date;
    const dayLabel = sample
      ? sample.toLocaleDateString('es-PE', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace(',', '')
      : NO_DATE;
    labels.push(dayLabel);
    sheet.set(0, r, day, day === NO_DATE ? `center${z}` : `date${z}`);
    sheet.set(1, r, dayLabel, `center${z}`);
    sheet.set(2, r, dayRows.length, `int${z}`, `COUNTIFS(${fechaRange},$A${r})`);
    methods.forEach((m, i) => {
      const col = firstMethodCol + i;
      const amount = dayRows.filter(x => x.metodo === m.key).reduce((acc, x) => acc + x.monto, 0);
      sheet.set(col, r, round2(amount), `money${z}`, `SUMIFS(${moneyRange},${fechaRange},$A${r},${metodoRange},${columnLetter(col)}$${headerRow})`);
    });
    const dayTotal = dayRows.reduce((acc, x) => acc + x.monto, 0);
    accumulated += dayTotal;
    totals.push(round2(dayTotal));
    sheet.set(totalCol, r, round2(dayTotal), `moneyBold${z}`, `SUM(${cellRef(firstMethodCol, r)}:${cellRef(totalCol - 1, r)})`);
    sheet.set(accumCol, r, round2(accumulated), `money${z}`, idx === 0 ? `${totalLetter}${r}` : `${accumLetter}${r - 1}+${totalLetter}${r}`);
    sheet.setRowHeight(r, 18);
  });

  const totalRow = last + 1;
  sheet.set(0, totalRow, 'TOTAL', 'totalLabel');
  sheet.set(1, totalRow, '', 'totalLabel');
  sheet.set(2, totalRow, rows.length, 'totalInt', `SUM(C${first}:C${last})`);
  methods.forEach((m, i) => {
    const letter = columnLetter(firstMethodCol + i);
    sheet.set(firstMethodCol + i, totalRow, round2(m.total), 'totalMoney', `SUM(${letter}${first}:${letter}${last})`);
  });
  sheet.set(totalCol, totalRow, round2(accumulated), 'totalMoney', `SUM(${totalLetter}${first}:${totalLetter}${last})`);
  sheet.set(accumCol, totalRow, '', 'totalLabel');
  sheet.setRowHeight(totalRow, 22);

  sheet.dataBars.push({ ref: `${totalLetter}${first}:${totalLetter}${last}`, color: 'FF93C5FD' });
  sheet.printTitleRow = headerRow;
  sheet.layout = {
    labels,
    totals,
    labelRange: `$B$${first}:$B$${last}`,
    totalRange: `$${totalLetter}$${first}:$${totalLetter}$${last}`,
  };
  return sheet;
}

// Alumnos que aún no pagan la matrícula (mismos que muestra la ventanilla de cobranza)
function buildPendingSheet(pending, meta) {
  const sheet = new Sheet(SHEET_PENDING);
  sheet.landscape = true;
  sheet.tabColor = 'FFB45309';
  sheet.footer = FOOTER;
  sheet.colWidths = [7, 12, 40, 17, 40, 44, 14];
  const { students, amount, conceptName } = pending;

  writeBanner(sheet, 6, `ALUMNOS PENDIENTES DE PAGO DE MATRÍCULA  |  ${meta.today}`, [
    `Situación al ${meta.generatedAt} · Responsable: ${meta.cashier}`,
  ]);
  const headerRow = 6;
  const first = headerRow + 1;
  const last = headerRow + Math.max(students.length, 1);
  const moneyRange = `G${first}:G${last}`;

  writeKpi(sheet, 3, 0, 2, 'ALUMNOS CON DEUDA', students.length, 'kpiInt', `SUBTOTAL(103,B${first}:B${last})`);
  writeKpi(sheet, 3, 3, 4, 'MONTO POR COBRAR', round2(students.length * amount), 'kpiMoneyAlt', `SUBTOTAL(9,${moneyRange})`);
  writeKpi(sheet, 3, 5, 6, 'CONCEPTO', conceptName, 'kpiText');
  sheet.setRowHeight(3, 16);
  sheet.setRowHeight(4, 26);
  sheet.setRowHeight(5, 6);

  const pendingColumns = ['N°', 'DNI', 'Estudiante', 'Código Alumno', 'Programa de Estudio', 'Concepto pendiente', 'Monto (S/)'];
  pendingColumns.forEach((t, i) => sheet.set(i, headerRow, t, 'header'));
  sheet.setRowHeight(headerRow, 24);

  students.forEach((s, idx) => {
    const r = first + idx;
    const z = idx % 2 === 1 ? 'Zebra' : '';
    sheet.set(0, r, idx + 1, `int${z}`);
    sheet.set(1, r, s.dni, `center${z}`);
    sheet.set(2, r, s.nombre, `bold${z}`);
    sheet.set(3, r, s.codigo, `center${z}`);
    sheet.set(4, r, s.programa, `text${z}`);
    sheet.set(5, r, conceptName, `text${z}`);
    sheet.set(6, r, amount, `money${z}`);
  });

  const totalRow = last + 1;
  for (let c = 0; c <= 6; c++) sheet.set(c, totalRow, '', 'totalLabel');
  sheet.set(0, totalRow, `TOTAL (${students.length} alumnos)`, 'totalLabel');
  sheet.merge(0, totalRow, 5, totalRow);
  sheet.set(6, totalRow, round2(students.length * amount), 'totalMoney', `SUBTOTAL(9,${moneyRange})`);
  sheet.setRowHeight(totalRow, 22);

  sheet.tables = [{ name: 'PendientesDePago', ref: `A${headerRow}:G${last}`, columns: pendingColumns }];
  sheet.textNumberRanges = [`B${first}:B${last}`, `D${first}:D${last}`];
  sheet.printTitleRow = headerRow;
  return sheet;
}

const PRICE_TYPE_LABELS = { fijo: 'Precio fijo', tarifas: 'Varias tarifas', libre: 'Monto libre' };

function priceDetail(concept) {
  const soles = (v) => `S/ ${money(v).toFixed(2)}`;
  if (concept.tipoPrecio === 'tarifas') return concept.tarifas.map(t => `${t.nombre}: ${soles(t.monto)}`).join(' · ');
  if (concept.tipoPrecio === 'libre') return `Sugerido ${soles(concept.monto)}${concept.montoMinimo > 0 ? ` · Mínimo ${soles(concept.montoMinimo)}` : ''}`;
  return 'Precio único';
}

// Tarifario vigente: refleja al momento cualquier concepto o precio agregado, editado o eliminado
function buildTariffSheet({ concepts, config }, rows, meta) {
  const sheet = new Sheet(SHEET_TARIFF);
  sheet.landscape = true;
  sheet.tabColor = 'FF7E22CE';
  sheet.footer = FOOTER;
  sheet.colWidths = [13, 48, 18, 16, 14, 46, 13, 13, 12, 15];
  const lastCol = 9;

  writeBanner(sheet, lastCol, `TARIFARIO TUPA VIGENTE  |  ${meta.today}`, [
    `Precios actuales al ${meta.generatedAt}. Los recibos ya emitidos conservan el monto que se cobró.`,
  ]);
  sheet.setRowHeight(3, 6);

  const headerRow = 4;
  const columns = ['Código', 'Concepto', 'Categoría', 'Tipo de precio', 'Precio (S/)', 'Detalle del precio', 'Habilita matrícula', 'Cobro repetible', 'Recibos', 'Recaudado (S/)'];
  columns.forEach((t, i) => sheet.set(i, headerRow, t, 'header'));
  sheet.setRowHeight(headerRow, 32);

  const first = headerRow + 1;
  const last = headerRow + Math.max(concepts.length, 1);
  const codeRange = detailRange('codigo', rows.length);
  const moneyRange = detailRange('monto', rows.length);
  let totalCount = 0;
  let totalAmount = 0;

  concepts.forEach((c, idx) => {
    const r = first + idx;
    const z = idx % 2 === 1 ? 'Zebra' : '';
    const own = rows.filter(x => String(x.codigo).toUpperCase() === String(c.codigo).toUpperCase());
    const amount = own.reduce((acc, x) => acc + x.monto, 0);
    totalCount += own.length;
    totalAmount += amount;
    sheet.set(0, r, c.codigo, `bold${z}`);
    sheet.set(1, r, c.nombre, `text${z}`);
    sheet.set(2, r, c.categoria, `text${z}`);
    sheet.set(3, r, PRICE_TYPE_LABELS[c.tipoPrecio] || c.tipoPrecio, `center${z}`);
    sheet.set(4, r, money(c.monto), `moneyBold${z}`);
    sheet.set(5, r, priceDetail(c), `text${z}`);
    sheet.set(6, r, c.liberaMatricula ? 'Sí' : 'No', `center${z}`);
    sheet.set(7, r, c.permiteRepetir ? 'Sí' : 'No', `center${z}`);
    sheet.set(8, r, own.length, `int${z}`, `COUNTIFS(${codeRange},$A${r})`);
    sheet.set(9, r, round2(amount), `money${z}`, `SUMIFS(${moneyRange},${codeRange},$A${r})`);
    sheet.setRowHeight(r, 18);
  });

  const totalRow = last + 1;
  for (let c = 0; c < 8; c++) sheet.set(c, totalRow, '', 'totalLabel');
  sheet.set(0, totalRow, `TOTAL (${concepts.length} conceptos vigentes)`, 'totalLabel');
  sheet.merge(0, totalRow, 7, totalRow);
  sheet.set(8, totalRow, totalCount, 'totalInt', `SUM(I${first}:I${last})`);
  sheet.set(9, totalRow, round2(totalAmount), 'totalMoney', `SUM(J${first}:J${last})`);
  sheet.setRowHeight(totalRow, 22);

  // Datos de cobro de la institución
  const infoRow = totalRow + 2;
  sheet.set(0, infoRow, 'Datos de cobro de la institución', 'section');
  sheet.merge(0, infoRow, 3, infoRow);
  [
    ['Yape / Plin', config?.yapeNumero],
    ['Titular de la cuenta', config?.yapeTitular],
    ['Cuenta corriente Banco de la Nación', config?.bnCuenta],
  ].forEach(([label, value], i) => {
    const r = infoRow + 1 + i;
    sheet.set(0, r, label, 'infoLabel');
    sheet.set(1, r, '', 'infoLabel');
    sheet.merge(0, r, 1, r);
    sheet.set(2, r, value || '—', 'infoValue');
    sheet.set(3, r, '', 'infoValue');
    sheet.merge(2, r, 3, r);
  });

  sheet.tables = [{ name: 'TarifarioTUPA', ref: `A${headerRow}:J${last}`, columns }];
  sheet.textNumberRanges = [`A${first}:A${last}`, `C${infoRow + 1}:C${infoRow + 3}`];
  sheet.printTitleRow = headerRow;
  return sheet;
}

// Estado de cuenta anual de un alumno (botón Excel de "Pagos del Año")
export function exportStudentStatementXlsx({ student, careerName, movements, year, habilitado, cashier = 'Caja Central' }) {
  const now = new Date();
  const sheet = new Sheet(`Estado de Cuenta ${year}`);
  sheet.landscape = true;
  sheet.tabColor = 'FF0A2552';
  sheet.footer = FOOTER;
  sheet.colWidths = [7, 13, 18, 46, 18, 34, 22, 13, 14];
  const lastCol = 8;
  const fullName = `${student.nombres} ${student.apellidos}`;

  const { label: today, fileLabel } = todayLabels(now);
  writeBanner(sheet, lastCol, `ESTADO DE CUENTA ${year}  |  ${today}`, [
    `${fullName} · DNI ${student.dni} · ${student.codigo_estudiante || ''} · ${careerName}`,
    `Generado: ${formatDateTime(now)} · Responsable: ${cashier}`,
  ]);

  const headerRow = 7;
  const rows = [...movements].sort((a, b) => {
    if (a.estado !== b.estado) return a.estado === 'PENDIENTE' ? 1 : -1;
    return (a.date?.getTime() || 0) - (b.date?.getTime() || 0);
  });
  const first = headerRow + 1;
  const last = headerRow + Math.max(rows.length, 1);
  const estadoRange = `$H$${first}:$H$${last}`;
  const montoRange = `$I$${first}:$I$${last}`;
  const paid = rows.filter(m => m.estado === 'PAGADO').reduce((acc, m) => acc + money(m.monto), 0);
  const pendingTotal = rows.filter(m => m.estado === 'PENDIENTE').reduce((acc, m) => acc + money(m.monto), 0);

  writeKpi(sheet, 4, 0, 2, 'TOTAL PAGADO', round2(paid), 'kpiMoney', `SUMIFS(${montoRange},${estadoRange},"PAGADO")`);
  writeKpi(sheet, 4, 3, 3, 'SALDO PENDIENTE', round2(pendingTotal), 'kpiMoneyAlt', `SUMIFS(${montoRange},${estadoRange},"PENDIENTE")`);
  writeKpi(sheet, 4, 4, 5, 'CONDICIÓN FINANCIERA', habilitado ? 'HABILITADO' : 'CON BLOQUEO DE MATRÍCULA', 'kpiText');
  sheet.setRowHeight(4, 16);
  sheet.setRowHeight(5, 26);
  sheet.setRowHeight(6, 6);

  const statementColumns = ['N°', 'Fecha', 'Comprobante', 'Concepto', 'Categoría', 'Forma de Pago', 'N° Operación', 'Estado', 'Monto (S/)'];
  statementColumns.forEach((t, i) => sheet.set(i, headerRow, t, 'header'));
  sheet.setRowHeight(headerRow, 24);

  rows.forEach((m, idx) => {
    const r = first + idx;
    const z = idx % 2 === 1 ? 'Zebra' : '';
    const isPaid = m.estado === 'PAGADO';
    sheet.set(0, r, idx + 1, `int${z}`);
    if (m.date) sheet.set(1, r, toExcelDate(new Date(m.date.getFullYear(), m.date.getMonth(), m.date.getDate())), `date${z}`);
    else sheet.set(1, r, m.fechaHora || NO_DATE, `center${z}`);
    sheet.set(2, r, m.codigoRecibo, `bold${z}`);
    sheet.set(3, r, m.conceptoNombre, `text${z}`);
    sheet.set(4, r, m.conceptoCategoria, `text${z}`);
    sheet.set(5, r, m.metodoPagoNombre, `text${z}`);
    sheet.set(6, r, m.numeroOperacion && m.numeroOperacion !== '-' ? m.numeroOperacion : '', `center${z}`);
    sheet.set(7, r, m.estado, isPaid ? 'methodEfectivo' : 'methodTarjeta');
    sheet.set(8, r, money(m.monto), `moneyBold${z}`);
    sheet.setRowHeight(r, 18);
  });

  sheet.tables = [{ name: 'EstadoDeCuenta', ref: `A${headerRow}:I${last}`, columns: statementColumns }];
  sheet.textNumberRanges = [`G${first}:G${last}`];
  sheet.printTitleRow = headerRow;

  const title = `Estado de Cuenta ${student.dni} ${fileLabel}`;
  downloadBlob(buildWorkbook([sheet], { title }), `${title}.xlsx`);
}

// pending (opcional): { students: [{ dni, nombre, codigo, programa }], amount, conceptName }
// tariff (opcional): { concepts, config } con el tarifario y los datos de cobro vigentes
export function exportLibroDiarioXlsx(transactions, { cashier = 'Caja Central', filterLabel = '', pending = null, tariff = null } = {}) {
  const now = new Date();
  const rows = transactions.map(normalize).sort((a, b) => (a.date?.getTime() || 0) - (b.date?.getTime() || 0));
  const { label: today, fileLabel } = todayLabels(now);
  const meta = { generatedAt: formatDateTime(now), cashier, filterLabel, pending, today };

  const detail = buildDetailSheet(rows, meta);
  const daily = buildDailySheet(rows, meta);
  const summary = buildSummarySheet(rows, daily, meta);
  const sheets = [detail, summary, daily];
  if (tariff) sheets.push(buildTariffSheet(tariff, rows, meta));
  if (pending) sheets.push(buildPendingSheet(pending, meta));

  const title = `Libro Diario ${fileLabel}`;
  downloadBlob(buildWorkbook(sheets, { title }), `${title}.xlsx`);
}
