// Generador mínimo de libros Excel (.xlsx / Office Open XML) sin dependencias externas.
// Soporta estilos, celdas combinadas, anchos de columna, autofiltro, paneles inmovilizados,
// fórmulas y configuración de impresión.

// ---------- ZIP (método "stored", sin compresión) ----------
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function buildZip(files) {
  const encoder = new TextEncoder();
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

  const localParts = [];
  const centralParts = [];
  let offset = 0;

  files.forEach(({ name, content }) => {
    const nameBytes = encoder.encode(name);
    const data = typeof content === 'string' ? encoder.encode(content) : content;
    const crc = crc32(data);

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true);
    local.setUint16(8, 0, true);
    local.setUint16(10, dosTime, true);
    local.setUint16(12, dosDate, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, nameBytes.length, true);
    local.setUint16(28, 0, true);
    localParts.push(new Uint8Array(local.buffer), nameBytes, data);

    const central = new DataView(new ArrayBuffer(46));
    central.setUint32(0, 0x02014b50, true);
    central.setUint16(4, 20, true);
    central.setUint16(6, 20, true);
    central.setUint16(8, 0x0800, true);
    central.setUint16(10, 0, true);
    central.setUint16(12, dosTime, true);
    central.setUint16(14, dosDate, true);
    central.setUint32(16, crc, true);
    central.setUint32(20, data.length, true);
    central.setUint32(24, data.length, true);
    central.setUint16(28, nameBytes.length, true);
    central.setUint16(30, 0, true);
    central.setUint16(32, 0, true);
    central.setUint16(34, 0, true);
    central.setUint16(36, 0, true);
    central.setUint32(38, 0, true);
    central.setUint32(42, offset, true);
    centralParts.push(new Uint8Array(central.buffer), nameBytes);

    offset += 30 + nameBytes.length + data.length;
  });

  const centralSize = centralParts.reduce((acc, p) => acc + p.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);

  return new Blob([...localParts, ...centralParts, new Uint8Array(end.buffer)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

// ---------- Utilidades ----------
const xmlEscape = (v) => String(v ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  // eslint-disable-next-line no-control-regex -- caracteres de control no permitidos en XML
  .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

export function columnLetter(index) {
  let n = index + 1;
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export const cellRef = (col, row) => `${columnLetter(col)}${row}`;

// Convierte una fecha JS (hora local) a número de serie de Excel
export function toExcelDate(date) {
  const utc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds());
  return (utc - Date.UTC(1899, 11, 30)) / 86400000;
}

// ---------- Hojas de estilo ----------
// Cada estilo se declara con un nombre y se traduce a un índice cellXfs.
const COLORS = {
  navy: 'FF0A2552',
  blue: 'FF0044B2',
  blueSoft: 'FFE5EEFE',
  zebra: 'FFF5F8FD',
  border: 'FFCBD5E1',
  text: 'FF0F172A',
  muted: 'FF64748B',
  white: 'FFFFFFFF',
  green: 'FF047857',
  greenSoft: 'FFE7F7EF',
  bannerText: 'FFBFDBFE',
  kpi: 'FFF1F5F9',
  blueChip: 'FFDBEAFE',
  blueChipText: 'FF1D4ED8',
  purpleChip: 'FFF3E8FF',
  purpleChipText: 'FF7E22CE',
  amberChip: 'FFFEF3C7',
  amberChipText: 'FFB45309',
  grayChip: 'FFE2E8F0',
  grayChipText: 'FF334155',
};

const NUM_FMTS = [
  { id: 164, code: '"S/ "#,##0.00' },
  { id: 165, code: 'dd/mm/yyyy hh:mm' },
  { id: 166, code: 'dd/mm/yyyy' },
  { id: 167, code: '0.0%' },
  { id: 168, code: 'hh:mm:ss' },
];

const FONTS = [
  { size: 10, color: COLORS.text },                         // 0 base
  { size: 16, color: COLORS.navy, bold: true },             // 1 título
  { size: 9, color: COLORS.muted, italic: true },           // 2 subtítulo
  { size: 10, color: COLORS.white, bold: true },            // 3 cabecera
  { size: 10, color: COLORS.text, bold: true },             // 4 negrita
  { size: 12, color: COLORS.navy, bold: true },             // 5 sección
  { size: 11, color: COLORS.green, bold: true },            // 6 total
  { size: 16, color: COLORS.white, bold: true },            // 7 banner
  { size: 9, color: COLORS.bannerText },                    // 8 banner: detalle
  { size: 9, color: COLORS.muted, bold: true },             // 9 indicador: etiqueta
  { size: 15, color: COLORS.navy, bold: true },             // 10 indicador: valor
  { size: 15, color: COLORS.green, bold: true },            // 11 indicador: monto
  { size: 11, color: COLORS.navy, bold: true },             // 12 indicador: texto
  { size: 10, color: COLORS.green, bold: true },            // 13 método: efectivo
  { size: 10, color: COLORS.blueChipText, bold: true },     // 14 método: banco
  { size: 10, color: COLORS.purpleChipText, bold: true },   // 15 método: billetera
  { size: 10, color: COLORS.amberChipText, bold: true },    // 16 método: tarjeta
  { size: 10, color: COLORS.grayChipText, bold: true },     // 17 método: otro
];

const FILLS = [
  null, // none (obligatorio)
  null, // gray125 (obligatorio)
  COLORS.navy,      // 2
  COLORS.zebra,     // 3
  COLORS.blueSoft,  // 4
  COLORS.greenSoft, // 5
  COLORS.kpi,       // 6
  COLORS.blueChip,  // 7
  COLORS.purpleChip,// 8
  COLORS.amberChip, // 9
  COLORS.grayChip,  // 10
];

// border: 0 ninguno, 1 fino, 2 total (superior grueso)
const STYLE_DEFS = {
  default:      { font: 0, fill: 0, border: 0 },
  title:        { font: 1, fill: 0, border: 0, vAlign: 'center' },
  subtitle:     { font: 2, fill: 0, border: 0 },
  section:      { font: 5, fill: 0, border: 0 },
  header:       { font: 3, fill: 2, border: 1, hAlign: 'center', vAlign: 'center', wrap: true },
  text:         { font: 0, fill: 0, border: 1, vAlign: 'center' },
  textZebra:    { font: 0, fill: 3, border: 1, vAlign: 'center' },
  center:       { font: 0, fill: 0, border: 1, hAlign: 'center', vAlign: 'center' },
  centerZebra:  { font: 0, fill: 3, border: 1, hAlign: 'center', vAlign: 'center' },
  bold:         { font: 4, fill: 0, border: 1, vAlign: 'center' },
  boldZebra:    { font: 4, fill: 3, border: 1, vAlign: 'center' },
  money:        { font: 0, fill: 0, border: 1, numFmt: 164, vAlign: 'center' },
  moneyZebra:   { font: 0, fill: 3, border: 1, numFmt: 164, vAlign: 'center' },
  int:          { font: 0, fill: 0, border: 1, numFmt: 1, hAlign: 'center', vAlign: 'center' },
  intZebra:     { font: 0, fill: 3, border: 1, numFmt: 1, hAlign: 'center', vAlign: 'center' },
  datetime:     { font: 0, fill: 0, border: 1, numFmt: 165, hAlign: 'center', vAlign: 'center' },
  datetimeZebra:{ font: 0, fill: 3, border: 1, numFmt: 165, hAlign: 'center', vAlign: 'center' },
  date:         { font: 0, fill: 0, border: 1, numFmt: 166, hAlign: 'center', vAlign: 'center' },
  dateZebra:    { font: 0, fill: 3, border: 1, numFmt: 166, hAlign: 'center', vAlign: 'center' },
  totalLabel:   { font: 4, fill: 4, border: 2, hAlign: 'right', vAlign: 'center' },
  totalInt:     { font: 4, fill: 4, border: 2, numFmt: 1, hAlign: 'center', vAlign: 'center' },
  totalMoney:   { font: 6, fill: 5, border: 2, numFmt: 164, vAlign: 'center' },
  infoLabel:    { font: 4, fill: 4, border: 1, vAlign: 'center' },
  infoValue:    { font: 0, fill: 0, border: 1, vAlign: 'center' },
  banner:       { font: 7, fill: 2, border: 0, vAlign: 'center' },
  bannerSub:    { font: 8, fill: 2, border: 0, vAlign: 'center' },
  kpiLabel:     { font: 9, fill: 6, border: 1, hAlign: 'center', vAlign: 'center' },
  kpiMoney:     { font: 11, fill: 6, border: 1, numFmt: 164, hAlign: 'center', vAlign: 'center' },
  kpiMoneyAlt:  { font: 10, fill: 6, border: 1, numFmt: 164, hAlign: 'center', vAlign: 'center' },
  kpiInt:       { font: 10, fill: 6, border: 1, numFmt: 1, hAlign: 'center', vAlign: 'center' },
  kpiText:      { font: 12, fill: 6, border: 1, hAlign: 'center', vAlign: 'center' },
  time:         { font: 0, fill: 0, border: 1, numFmt: 168, hAlign: 'center', vAlign: 'center' },
  timeZebra:    { font: 0, fill: 3, border: 1, numFmt: 168, hAlign: 'center', vAlign: 'center' },
  pct:          { font: 0, fill: 0, border: 1, numFmt: 167, hAlign: 'center', vAlign: 'center' },
  pctZebra:     { font: 0, fill: 3, border: 1, numFmt: 167, hAlign: 'center', vAlign: 'center' },
  moneyBold:    { font: 4, fill: 0, border: 1, numFmt: 164, vAlign: 'center' },
  moneyBoldZebra: { font: 4, fill: 3, border: 1, numFmt: 164, vAlign: 'center' },
  totalPct:     { font: 4, fill: 4, border: 2, numFmt: 167, hAlign: 'center', vAlign: 'center' },
  methodEfectivo: { font: 13, fill: 5, border: 1, hAlign: 'center', vAlign: 'center' },
  methodBanco:    { font: 14, fill: 7, border: 1, hAlign: 'center', vAlign: 'center' },
  methodYape:     { font: 15, fill: 8, border: 1, hAlign: 'center', vAlign: 'center' },
  methodTarjeta:  { font: 16, fill: 9, border: 1, hAlign: 'center', vAlign: 'center' },
  methodOtro:     { font: 17, fill: 10, border: 1, hAlign: 'center', vAlign: 'center' },
};

const STYLE_NAMES = Object.keys(STYLE_DEFS);
const styleIndex = (name) => {
  const idx = STYLE_NAMES.indexOf(name);
  return idx === -1 ? 0 : idx;
};

function buildStylesXml() {
  const numFmts = `<numFmts count="${NUM_FMTS.length}">${NUM_FMTS.map(f => `<numFmt numFmtId="${f.id}" formatCode="${xmlEscape(f.code)}"/>`).join('')}</numFmts>`;

  const fonts = `<fonts count="${FONTS.length}">${FONTS.map(f =>
    `<font>${f.bold ? '<b/>' : ''}${f.italic ? '<i/>' : ''}<sz val="${f.size}"/><color rgb="${f.color}"/><name val="Calibri"/><family val="2"/></font>`
  ).join('')}</fonts>`;

  const fills = `<fills count="${FILLS.length}">` +
    '<fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
    FILLS.slice(2).map(c => `<fill><patternFill patternType="solid"><fgColor rgb="${c}"/><bgColor indexed="64"/></patternFill></fill>`).join('') +
    '</fills>';

  const thin = `style="thin"><color rgb="${COLORS.border}"/>`;
  const borders = '<borders count="3">' +
    '<border><left/><right/><top/><bottom/><diagonal/></border>' +
    `<border><left ${thin}</left><right ${thin}</right><top ${thin}</top><bottom ${thin}</bottom><diagonal/></border>` +
    `<border><left ${thin}</left><right ${thin}</right><top style="medium"><color rgb="${COLORS.navy}"/></top><bottom style="medium"><color rgb="${COLORS.navy}"/></bottom><diagonal/></border>` +
    '</borders>';

  const xfs = `<cellXfs count="${STYLE_NAMES.length}">${STYLE_NAMES.map(name => {
    const s = STYLE_DEFS[name];
    const numFmt = s.numFmt || 0;
    const align = (s.hAlign || s.vAlign || s.wrap)
      ? `<alignment${s.hAlign ? ` horizontal="${s.hAlign}"` : ''}${s.vAlign ? ` vertical="${s.vAlign}"` : ''}${s.wrap ? ' wrapText="1"' : ''}/>`
      : '';
    return `<xf numFmtId="${numFmt}" fontId="${s.font}" fillId="${s.fill}" borderId="${s.border}" xfId="0"` +
      `${numFmt ? ' applyNumberFormat="1"' : ''} applyFont="1" applyFill="1" applyBorder="1"${align ? ' applyAlignment="1">' + align + '</xf>' : '/>'}`;
  }).join('')}</cellXfs>`;

  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    numFmts + fonts + fills + borders +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    xfs +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
    '</styleSheet>';
}

// ---------- Hoja de cálculo ----------
// Una celda puede ser: valor simple, o { v, style, formula }
export class Sheet {
  constructor(name) {
    this.name = name.slice(0, 31);
    this.rows = new Map(); // fila -> { cells: Map(col -> cell), height }
    this.colWidths = [];
    this.merges = [];
    this.autoFilter = null;
    this.freeze = null; // { row: primera fila móvil, col: primera columna móvil (0 = ninguna fija) }
    this.landscape = false;
    this.tabColor = null;
    this.dataBars = [];    // { ref: 'E7:E10', color: 'FF0044B2' }
    this.charts = [];      // ver buildChartXml
    this.printTitleRow = null;
    this.footer = '';
    this.textNumberRanges = []; // Rangos con números guardados como texto a propósito (DNI, códigos)
    this.tables = [];           // Tablas de Excel: { name, ref, columns: [títulos de la fila de encabezado] }
  }

  set(col, row, value, style = 'text', formula = null) {
    if (!this.rows.has(row)) this.rows.set(row, { cells: new Map(), height: null });
    this.rows.get(row).cells.set(col, { v: value, style, formula });
  }

  setRowHeight(row, height) {
    if (!this.rows.has(row)) this.rows.set(row, { cells: new Map(), height: null });
    this.rows.get(row).height = height;
  }

  merge(c1, r1, c2, r2) {
    this.merges.push(`${cellRef(c1, r1)}:${cellRef(c2, r2)}`);
  }

  toXml(sheetIndex) {
    const cols = this.colWidths.length
      ? `<cols>${this.colWidths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>`
      : '';

    const sortedRows = [...this.rows.entries()].sort((a, b) => a[0] - b[0]);
    const sheetData = sortedRows.map(([r, row]) => {
      const cells = [...row.cells.entries()].sort((a, b) => a[0] - b[0]).map(([c, cell]) => {
        const ref = cellRef(c, r);
        const s = styleIndex(cell.style);
        if (cell.formula) {
          const cached = typeof cell.v === 'number' ? `<v>${cell.v}</v>` : '';
          return `<c r="${ref}" s="${s}"><f>${xmlEscape(cell.formula)}</f>${cached}</c>`;
        }
        if (cell.v === null || cell.v === undefined || cell.v === '') return `<c r="${ref}" s="${s}"/>`;
        if (typeof cell.v === 'number' && Number.isFinite(cell.v)) return `<c r="${ref}" s="${s}"><v>${cell.v}</v></c>`;
        return `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(cell.v)}</t></is></c>`;
      }).join('');
      const ht = row.height ? ` ht="${row.height}" customHeight="1"` : '';
      return `<row r="${r}"${ht}>${cells}</row>`;
    }).join('');

    let pane = '';
    if (this.freeze) {
      const { row, col = 0 } = this.freeze;
      const topLeft = cellRef(col, row);
      if (col > 0) {
        pane = `<pane xSplit="${col}" ySplit="${row - 1}" topLeftCell="${topLeft}" activePane="bottomRight" state="frozen"/>` +
          `<selection pane="topRight" activeCell="${cellRef(col, 1)}" sqref="${cellRef(col, 1)}"/>` +
          `<selection pane="bottomLeft" activeCell="A${row}" sqref="A${row}"/>` +
          `<selection pane="bottomRight" activeCell="${topLeft}" sqref="${topLeft}"/>`;
      } else {
        pane = `<pane ySplit="${row - 1}" topLeftCell="A${row}" activePane="bottomLeft" state="frozen"/>` +
          `<selection pane="bottomLeft" activeCell="A${row}" sqref="A${row}"/>`;
      }
    }
    const sheetViews = `<sheetViews><sheetView workbookViewId="0"${sheetIndex === 0 ? ' tabSelected="1"' : ''} showGridLines="0">${pane}</sheetView></sheetViews>`;

    const autoFilter = this.autoFilter ? `<autoFilter ref="${this.autoFilter}"/>` : '';
    const merges = this.merges.length
      ? `<mergeCells count="${this.merges.length}">${this.merges.map(m => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>`
      : '';
    const dataBars = this.dataBars.map((b, i) =>
      `<conditionalFormatting sqref="${b.ref}"><cfRule type="dataBar" priority="${i + 1}"><dataBar>` +
      `<cfvo type="num" val="0"/><cfvo type="max"/><color rgb="${b.color}"/></dataBar></cfRule></conditionalFormatting>`
    ).join('');
    const footer = this.footer
      ? `<headerFooter><oddFooter>${xmlEscape(`&L${this.footer}&RPágina &P de &N`)}</oddFooter></headerFooter>`
      : '';

    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      `<sheetPr>${this.tabColor ? `<tabColor rgb="${this.tabColor}"/>` : ''}<pageSetUpPr fitToPage="1"/></sheetPr>` +
      sheetViews +
      '<sheetFormatPr defaultRowHeight="15"/>' +
      cols +
      `<sheetData>${sheetData}</sheetData>` +
      autoFilter +
      merges +
      dataBars +
      '<printOptions horizontalCentered="1"/>' +
      '<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.6" header="0.3" footer="0.3"/>' +
      `<pageSetup paperSize="9" orientation="${this.landscape ? 'landscape' : 'portrait'}" fitToWidth="1" fitToHeight="0"/>` +
      footer +
      (this.textNumberRanges.length
        ? `<ignoredErrors>${this.textNumberRanges.map(ref => `<ignoredError sqref="${ref}" numberStoredAsText="1"/>`).join('')}</ignoredErrors>`
        : '') +
      (this.charts.length ? '<drawing r:id="rId1"/>' : '') +
      (this.tables.length
        ? `<tableParts count="${this.tables.length}">${this.tables.map((_, i) => `<tablePart r:id="rId${(this.charts.length ? 2 : 1) + i}"/>`).join('')}</tableParts>`
        : '') +
      '</worksheet>';
  }
}

// ---------- Gráficos (DrawingML) ----------
// chart: { type: 'column' | 'doughnut', title, catRef, valRef, categories, values, color, colors, formatCode, anchor: { col, row, col2, row2 } }
const chartTextProps = (size = 900, color = '334155', bold = false) =>
  `<c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="${size}"${bold ? ' b="1"' : ''}><a:solidFill><a:srgbClr val="${color}"/></a:solidFill></a:defRPr></a:pPr><a:endParaRPr lang="es-PE"/></a:p></c:txPr>`;

function chartSeriesData(chart) {
  const cats = chart.categories.map((c, i) => `<c:pt idx="${i}"><c:v>${xmlEscape(c)}</c:v></c:pt>`).join('');
  const vals = chart.values.map((v, i) => `<c:pt idx="${i}"><c:v>${v}</c:v></c:pt>`).join('');
  return `<c:cat><c:strRef><c:f>${xmlEscape(chart.catRef)}</c:f><c:strCache><c:ptCount val="${chart.categories.length}"/>${cats}</c:strCache></c:strRef></c:cat>` +
    `<c:val><c:numRef><c:f>${xmlEscape(chart.valRef)}</c:f><c:numCache><c:formatCode>${xmlEscape(chart.formatCode || 'General')}</c:formatCode><c:ptCount val="${chart.values.length}"/>${vals}</c:numCache></c:numRef></c:val>`;
}

function buildChartXml(chart) {
  const title = '<c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="1200" b="1"/></a:pPr>' +
    `<a:r><a:rPr lang="es-PE" sz="1200" b="1"><a:solidFill><a:srgbClr val="0A2552"/></a:solidFill></a:rPr><a:t>${xmlEscape(chart.title)}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title>`;
  let plot;
  let legend = '';
  if (chart.type === 'doughnut') {
    const points = chart.categories.map((_, i) =>
      `<c:dPt><c:idx val="${i}"/><c:bubble3D val="0"/><c:spPr><a:solidFill><a:srgbClr val="${chart.colors[i % chart.colors.length]}"/></a:solidFill></c:spPr></c:dPt>`
    ).join('');
    plot = '<c:doughnutChart><c:varyColors val="1"/><c:ser><c:idx val="0"/><c:order val="0"/>' + points +
      `<c:dLbls>${chartTextProps(1000, 'FFFFFF', true)}<c:showLegendKey val="0"/><c:showVal val="0"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="1"/><c:showBubbleSize val="0"/></c:dLbls>` +
      chartSeriesData(chart) +
      '</c:ser><c:firstSliceAng val="0"/><c:holeSize val="55"/></c:doughnutChart>';
    legend = `<c:legend><c:legendPos val="r"/><c:overlay val="0"/>${chartTextProps()}</c:legend>`;
  } else {
    plot = '<c:barChart><c:barDir val="col"/><c:grouping val="clustered"/><c:varyColors val="0"/><c:ser><c:idx val="0"/><c:order val="0"/>' +
      `<c:spPr><a:solidFill><a:srgbClr val="${chart.color}"/></a:solidFill></c:spPr><c:invertIfNegative val="0"/>` +
      `<c:dLbls>${chartTextProps(800)}<c:dLblPos val="outEnd"/><c:showLegendKey val="0"/><c:showVal val="1"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="0"/><c:showBubbleSize val="0"/></c:dLbls>` +
      chartSeriesData(chart) +
      '</c:ser><c:gapWidth val="60"/><c:axId val="50010"/><c:axId val="50020"/></c:barChart>' +
      `<c:catAx><c:axId val="50010"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:numFmt formatCode="General" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/>${chartTextProps()}<c:crossAx val="50020"/><c:crosses val="autoZero"/><c:auto val="0"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/><c:noMultiLvlLbl val="1"/></c:catAx>` +
      `<c:valAx><c:axId val="50020"/><c:scaling><c:orientation val="minMax"/><c:min val="0"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:majorGridlines><c:spPr><a:ln w="6350"><a:solidFill><a:srgbClr val="E2E8F0"/></a:solidFill></a:ln></c:spPr></c:majorGridlines><c:numFmt formatCode="${xmlEscape(chart.formatCode || 'General')}" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/>${chartTextProps()}<c:crossAx val="50010"/><c:crosses val="autoZero"/><c:crossBetween val="between"/></c:valAx>`;
  }
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    `<c:roundedCorners val="0"/><c:chart>${title}<c:autoTitleDeleted val="0"/><c:plotArea><c:layout/>${plot}</c:plotArea>${legend}<c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart>` +
    '</c:chartSpace>';
}

function buildDrawingXml(charts) {
  const anchors = charts.map((chart, i) => {
    const { col, row, col2, row2 } = chart.anchor;
    return '<xdr:twoCellAnchor>' +
      `<xdr:from><xdr:col>${col}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${row - 1}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>` +
      `<xdr:to><xdr:col>${col2}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${row2 - 1}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>` +
      `<xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${i + 2}" name="Grafico ${i + 1}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr>` +
      '<xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>' +
      `<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" r:id="rId${i + 1}"/></a:graphicData></a:graphic>` +
      '</xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>';
  }).join('');
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    anchors + '</xdr:wsDr>';
}

function buildTableXml(table, id) {
  const columns = table.columns.map((name, i) => `<tableColumn id="${i + 1}" name="${xmlEscape(name)}"/>`).join('');
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    `<table xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" id="${id}" name="${table.name}" displayName="${table.name}" ref="${table.ref}" totalsRowShown="0">` +
    `<autoFilter ref="${table.ref}"/><tableColumns count="${table.columns.length}">${columns}</tableColumns>` +
    '<tableStyleInfo showFirstColumn="0" showLastColumn="0" showRowStripes="0" showColumnStripes="0"/></table>';
}

// Partes del paquete para los gráficos y las tablas de cada hoja
function buildSheetParts(sheets) {
  const parts = [];
  const contentTypes = [];
  let chartIndex = 0;
  let drawingIndex = 0;
  let tableIndex = 0;
  const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  sheets.forEach((sheet, sheetIdx) => {
    const sheetRels = [];
    if (sheet.charts.length) {
      drawingIndex += 1;
      const drawing = drawingIndex;
      const rels = sheet.charts.map((chart, i) => {
        chartIndex += 1;
        parts.push({ name: `xl/charts/chart${chartIndex}.xml`, content: buildChartXml(chart) });
        contentTypes.push(`<Override PartName="/xl/charts/chart${chartIndex}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`);
        return `<Relationship Id="rId${i + 1}" Type="${REL}/chart" Target="../charts/chart${chartIndex}.xml"/>`;
      }).join('');
      parts.push(
        { name: `xl/drawings/drawing${drawing}.xml`, content: buildDrawingXml(sheet.charts) },
        {
          name: `xl/drawings/_rels/drawing${drawing}.xml.rels`,
          content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}</Relationships>`,
        }
      );
      contentTypes.push(`<Override PartName="/xl/drawings/drawing${drawing}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`);
      sheetRels.push(`<Relationship Id="rId1" Type="${REL}/drawing" Target="../drawings/drawing${drawing}.xml"/>`);
    }
    sheet.tables.forEach((table, i) => {
      tableIndex += 1;
      parts.push({ name: `xl/tables/table${tableIndex}.xml`, content: buildTableXml(table, tableIndex) });
      contentTypes.push(`<Override PartName="/xl/tables/table${tableIndex}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml"/>`);
      sheetRels.push(`<Relationship Id="rId${(sheet.charts.length ? 2 : 1) + i}" Type="${REL}/table" Target="../tables/table${tableIndex}.xml"/>`);
    });
    if (sheetRels.length) {
      parts.push({
        name: `xl/worksheets/_rels/sheet${sheetIdx + 1}.xml.rels`,
        content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheetRels.join('')}</Relationships>`,
      });
    }
  });
  return { parts, contentTypes: contentTypes.join('') };
}

export const sheetRef = (sheetName, ref) => `'${sheetName.replace(/'/g, "''")}'!${ref}`;

export function buildWorkbook(sheets, { title = 'Libro Diario de Caja - IESTP Suiza' } = {}) {
  const sheetEntries = sheets.map((s, i) => `<sheet name="${xmlEscape(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('');
  const definedNames = sheets
    .flatMap((s, i) => [
      s.autoFilter
        ? `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">${xmlEscape(sheetRef(s.name, s.autoFilter.split(':').map(r => r.replace(/([A-Z]+)(\d+)/, '$$$1$$$2')).join(':')))}</definedName>`
        : '',
      s.printTitleRow
        ? `<definedName name="_xlnm.Print_Titles" localSheetId="${i}">${xmlEscape(sheetRef(s.name, `$${s.printTitleRow}:$${s.printTitleRow}`))}</definedName>`
        : '',
    ])
    .join('');
  const sheetParts = buildSheetParts(sheets);

  const files = [
    {
      name: '[Content_Types].xml',
      content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('') +
        '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
        sheetParts.contentTypes +
        '</Types>',
    },
    {
      name: '_rels/.rels',
      content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
        '</Relationships>',
    },
    {
      name: 'docProps/core.xml',
      content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
        `<dc:title>${xmlEscape(title)}</dc:title><dc:creator>SIGA - IESTP Suiza</dc:creator>` +
        `<dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().slice(0, 19)}Z</dcterms:created>` +
        '</cp:coreProperties>',
    },
    {
      name: 'xl/workbook.xml',
      content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        '<bookViews><workbookView activeTab="0"/></bookViews>' +
        `<sheets>${sheetEntries}</sheets>` +
        (definedNames ? `<definedNames>${definedNames}</definedNames>` : '') +
        '</workbook>',
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('') +
        `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
        '</Relationships>',
    },
    { name: 'xl/styles.xml', content: buildStylesXml() },
    ...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, content: s.toXml(i) })),
    ...sheetParts.parts,
  ];

  return buildZip(files);
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
