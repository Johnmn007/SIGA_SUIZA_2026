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
};

const NUM_FMTS = [
  { id: 164, code: '"S/ "#,##0.00' },
  { id: 165, code: 'dd/mm/yyyy hh:mm' },
  { id: 166, code: 'dd/mm/yyyy' },
];

const FONTS = [
  { size: 10, color: COLORS.text },                         // 0 base
  { size: 16, color: COLORS.navy, bold: true },             // 1 título
  { size: 9, color: COLORS.muted, italic: true },           // 2 subtítulo
  { size: 10, color: COLORS.white, bold: true },            // 3 cabecera
  { size: 10, color: COLORS.text, bold: true },             // 4 negrita
  { size: 12, color: COLORS.navy, bold: true },             // 5 sección
  { size: 11, color: COLORS.green, bold: true },            // 6 total
];

const FILLS = [
  null, // none (obligatorio)
  null, // gray125 (obligatorio)
  COLORS.navy,      // 2
  COLORS.zebra,     // 3
  COLORS.blueSoft,  // 4
  COLORS.greenSoft, // 5
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
    this.freeze = null;
    this.landscape = false;
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
      const { row } = this.freeze;
      pane = `<pane ySplit="${row - 1}" topLeftCell="A${row}" activePane="bottomLeft" state="frozen"/>` +
        `<selection pane="bottomLeft" activeCell="A${row}" sqref="A${row}"/>`;
    }
    const sheetViews = `<sheetViews><sheetView workbookViewId="0"${sheetIndex === 0 ? ' tabSelected="1"' : ''} showGridLines="0">${pane}</sheetView></sheetViews>`;

    const autoFilter = this.autoFilter ? `<autoFilter ref="${this.autoFilter}"/>` : '';
    const merges = this.merges.length
      ? `<mergeCells count="${this.merges.length}">${this.merges.map(m => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>`
      : '';

    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>' +
      sheetViews +
      '<sheetFormatPr defaultRowHeight="15"/>' +
      cols +
      `<sheetData>${sheetData}</sheetData>` +
      autoFilter +
      merges +
      '<printOptions horizontalCentered="1"/>' +
      '<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>' +
      `<pageSetup paperSize="9" orientation="${this.landscape ? 'landscape' : 'portrait'}" fitToWidth="1" fitToHeight="0"/>` +
      '</worksheet>';
  }
}

export function buildWorkbook(sheets) {
  const sheetEntries = sheets.map((s, i) => `<sheet name="${xmlEscape(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('');
  const definedNames = sheets
    .map((s, i) => s.autoFilter
      ? `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${xmlEscape(s.name.replace(/'/g, "''"))}'!${s.autoFilter.split(':').map(r => r.replace(/([A-Z]+)(\d+)/, '$$$1$$$2')).join(':')}</definedName>`
      : '')
    .join('');

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
        '<dc:title>Libro Diario de Caja - IESTP Suiza</dc:title><dc:creator>SIGA - IESTP Suiza</dc:creator>' +
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
