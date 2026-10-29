// Utilidades compartidas de Tesorería: verificación, fechas, montos en letras y contenido de los QR.
import { toQrSafeText } from './qrcode';

export const INSTITUTION = {
  sigla: 'IESTP SUIZA',
  nombre: 'Instituto de Educación Superior Tecnológico Público "Suiza"',
  ruc: '20172839211',
  direccion: 'Jr. Guillermo Sisley N° 450 · Pucallpa, Ucayali',
};

export const formatMoney = (value) =>
  `S/ ${(parseFloat(value) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const formatDateTime = (date = new Date()) =>
  date.toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

// Hash FNV-1a de 32 bits → código corto de verificación (8 caracteres hex)
function fnv1a(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).toUpperCase().padStart(8, '0');
}

// Firma del servidor (HMAC) en formato legible: XXXX-XXXX-XXXX
export const formatToken = (token) => String(token || '').toUpperCase().match(/.{1,4}/g)?.join('-') || '';

// Mismo código en la boleta impresa y en el formulario que abre el QR: la firma de los datos del QR
export function getReceiptVerificationCode(receipt) {
  if (receipt.qrBoleta?.firma) return formatToken(receipt.qrBoleta.firma);
  if (receipt.token) return formatToken(receipt.token);
  const base = [receipt.codigoRecibo, receipt.dni, (parseFloat(receipt.monto) || 0).toFixed(2), receipt.fechaHora, receipt.conceptoCodigo].join('|');
  const h = fnv1a(base);
  return `${h.slice(0, 4)}-${h.slice(4)}`;
}

// Interpreta "dd/mm/yyyy, hh:mm[:ss]" (es-PE). Tolera recibos antiguos en formato "mm/dd/yyyy, h:mm AM/PM"
// y cae al timestamp si la fecha no es interpretable.
export function parseReceiptDate(receipt) {
  const m = String(receipt.fechaHora || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp]\.?\s?[Mm]\.?)?)?/);
  if (m) {
    const [, a, b, y, h = '0', mi = '0', s = '0', ampm] = m;
    let day = +a;
    let month = +b;
    if (month > 12 && day <= 12) [day, month] = [month, day];
    let hour = +h;
    if (ampm) {
      const pm = /p/i.test(ampm);
      if (pm && hour < 12) hour += 12;
      if (!pm && hour === 12) hour = 0;
    }
    const date = new Date(+y, month - 1, day, hour, +mi, +s);
    if (month <= 12 && date.getDate() === day) return date;
  }
  if (receipt.timestamp) return new Date(receipt.timestamp);
  return null;
}

// ---------- Monto en letras (formato de comprobantes peruanos) ----------
const UNIDADES = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE', 'DIEZ',
  'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE',
  'VEINTIUNO', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'];
const DECENAS = ['', '', '', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const CENTENAS = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

function menorDeMil(n) {
  if (n === 0) return '';
  if (n === 100) return 'CIEN';
  const c = Math.floor(n / 100);
  const r = n % 100;
  let txt = CENTENAS[c];
  if (r > 0) {
    let resto;
    if (r < 30) resto = UNIDADES[r];
    else {
      const d = Math.floor(r / 10);
      const u = r % 10;
      resto = DECENAS[d] + (u ? ` Y ${UNIDADES[u]}` : '');
    }
    txt = txt ? `${txt} ${resto}` : resto;
  }
  return txt;
}

function enteroALetras(n) {
  if (n === 0) return 'CERO';
  const millones = Math.floor(n / 1000000);
  const miles = Math.floor((n % 1000000) / 1000);
  const resto = n % 1000;
  const partes = [];
  if (millones) partes.push(millones === 1 ? 'UN MILLÓN' : `${menorDeMil(millones).replace(/UNO$/, 'UN')} MILLONES`);
  if (miles) partes.push(miles === 1 ? 'MIL' : `${menorDeMil(miles).replace(/UNO$/, 'UN')} MIL`);
  if (resto) partes.push(menorDeMil(resto));
  return partes.join(' ');
}

export function amountToWords(value) {
  const amount = Math.round((parseFloat(value) || 0) * 100) / 100;
  const entero = Math.floor(amount);
  const centimos = Math.round((amount - entero) * 100);
  return `${enteroALetras(entero)} CON ${String(centimos).padStart(2, '0')}/100 SOLES`;
}

// ---------- QR de la boleta ----------
// El QR es un enlace a la página pública con TODO el contenido de la boleta (datos firmados por el servidor,
// ver qr_boleta en tesoreria_routes.py). Al escanearlo se abre la boleta como formulario; no se guarda en la BD.
const BOLETA_CAMPOS = {
  r: 'codigoRecibo', f: 'fechaHora', a: 'estudianteNombre', d: 'dni', c: 'codigoEstudiante', p: 'carreraNombre',
  k: 'conceptoCodigo', n: 'conceptoNombre', g: 'conceptoCategoria', t: 'tarifaNombre', m: 'monto',
  mp: 'metodoPagoNombre', o: 'numeroOperacion', j: 'cajero', b: 'observaciones', l: 'liberaMatricula',
};

// Dirección que abre el celular: la configurada en Tesorería o, si no hay, la de esta misma página
export const qrBaseUrl = (receipt) => String(receipt?.qrBase || window.location.origin).replace(/\/+$/, '');

// localhost solo funciona en esta PC: un celular no puede abrir ese enlace
export function isLocalOnlyUrl(url) {
  try {
    const host = new URL(url).hostname;
    return host === 'localhost' || host.endsWith('.localhost') || host === '0.0.0.0' || /^127\./.test(host) || host === '[::1]';
  } catch {
    return true;
  }
}

export function buildBoletaQrUrl(receipt) {
  if (!receipt?.qrBoleta) return null;
  const { datos, firma } = receipt.qrBoleta;
  return `${qrBaseUrl(receipt)}/?${new URLSearchParams({ boleta: datos, f: firma })}`;
}

// Convierte los datos del enlace del QR en la boleta (mismos nombres de campo que un recibo del servidor)
export function decodeBoletaDatos(datos, firma) {
  const b64 = String(datos).replace(/-/g, '+').replace(/_/g, '/');
  const bytes = Uint8Array.from(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)), ch => ch.charCodeAt(0));
  const raw = JSON.parse(new TextDecoder().decode(bytes));
  const receipt = { estado: 'PAGADO', token: firma, qrBoleta: { datos, firma } };
  Object.entries(BOLETA_CAMPOS).forEach(([key, campo]) => {
    if (raw[key] !== undefined) receipt[campo] = raw[key];
  });
  if (!receipt.codigoRecibo || !receipt.dni) throw new Error('El QR no contiene una boleta válida.');
  receipt.monto = parseFloat(receipt.monto) || 0;
  receipt.liberaMatricula = Boolean(receipt.liberaMatricula);
  return receipt;
}

// Texto plano equivalente: solo para un comprobante que no traiga el enlace firmado del servidor
export function buildReceiptQrPayload(receipt) {
  const operacion = receipt.numeroOperacion && receipt.numeroOperacion !== '-' ? ` / ${receipt.numeroOperacion}` : '';
  return toQrSafeText([
    `${INSTITUTION.sigla} - BOLETA DE PAGO`,
    `RECIBO: ${receipt.codigoRecibo}`,
    `FECHA: ${receipt.fechaHora}`,
    `ALUMNO: ${receipt.estudianteNombre}`,
    `DNI: ${receipt.dni}`,
    `CODIGO: ${receipt.codigoEstudiante || '-'}`,
    ...(receipt.carreraNombre ? [`PROGRAMA: ${receipt.carreraNombre}`] : []),
    `CONCEPTO: ${receipt.conceptoCodigo} ${receipt.conceptoNombre}`,
    `MONTO PAGADO: S/ ${(parseFloat(receipt.monto) || 0).toFixed(2)}`,
    `PAGO: ${receipt.metodoPagoNombre}${operacion}`,
    `CAJERO: ${receipt.cajero || 'Caja Central'}`,
    'ESTADO: PAGADO',
    `VERIFICACION: ${getReceiptVerificationCode(receipt)}`,
  ].join('\n'));
}


export function buildPaymentRequestQrPayload({ student, concept, monto, yapeNumero }) {
  return toQrSafeText([
    `${INSTITUTION.sigla} - ORDEN DE PAGO`,
    `YAPE/PLIN: ${yapeNumero}`,
    `DNI ALUMNO: ${student.dni}`,
    `ALUMNO: ${student.nombres} ${student.apellidos}`,
    `CONCEPTO: ${concept.codigo} ${concept.nombre}`,
    `MONTO A PAGAR: S/ ${(parseFloat(monto) || 0).toFixed(2)}`,
  ].join('\n'));
}
