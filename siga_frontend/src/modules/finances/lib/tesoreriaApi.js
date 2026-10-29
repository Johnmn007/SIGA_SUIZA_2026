// Cliente de la API de Tesorería (mod-gestion-academica /tesoreria). La base de datos es la fuente de verdad.
import { API_BASE } from '../../../core/api/client';

const BASE = `${API_BASE}/api/mod-gestion-academica/tesoreria`;

async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const detail = typeof data?.detail === 'string' ? data.detail : null;
    throw new Error(detail || `Error ${res.status} en Tesorería`);
  }
  return data;
}

// Payload del formulario de conceptos → API
const conceptPayload = (c) => ({
  codigo: c.codigo,
  nombre: c.nombre,
  categoria: c.categoria,
  descripcion: c.descripcion || '',
  tipoPrecio: c.tipoPrecio,
  tarifas: c.tarifas.map(t => ({ id: t.id, nombre: t.nombre, monto: Number(t.monto) || 0 })),
  montoMinimo: Number(c.montoMinimo) || 0,
  liberaMatricula: Boolean(c.liberaMatricula),
  permiteRepetir: Boolean(c.permiteRepetir),
});

export const tesoreriaApi = {
  listarConceptos: () => request('/conceptos'),
  crearConcepto: (c) => request('/conceptos', { method: 'POST', body: conceptPayload(c) }),
  actualizarConcepto: (id, c) => request(`/conceptos/${id}`, { method: 'PUT', body: conceptPayload(c) }),
  eliminarConcepto: (id) => request(`/conceptos/${id}`, { method: 'DELETE' }),
  restaurarConceptos: () => request('/conceptos/restaurar', { method: 'POST' }),

  leerConfig: () => request('/config'),
  guardarConfig: (config) => request('/config', { method: 'PUT', body: config }),

  listarPagos: () => request('/pagos'),
  registrarPago: (payload) => request('/pagos', { method: 'POST', body: payload }),
  estadoCuenta: (estudianteId) => request(`/estudiantes/${estudianteId}/estado-cuenta`),

  importar: (payload) => request('/importar', { method: 'POST', body: payload }),
};

// ---------- Migración única de los datos que la caja guardaba en el navegador ----------
const LEGACY_KEYS = {
  pagos: 'siga_transacciones_caja_2026',
  conceptos: 'siga_tupa_catalogo_2026',
  config: 'siga_caja_config_2026',
};
const MIGRATION_FLAG = 'siga_tesoreria_migrada_bd_v1';

const readLegacy = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export async function migrateLocalDataOnce() {
  try {
    if (localStorage.getItem(MIGRATION_FLAG)) return null;
  } catch {
    return null;
  }
  const pagos = readLegacy(LEGACY_KEYS.pagos);
  const conceptos = readLegacy(LEGACY_KEYS.conceptos);
  const config = readLegacy(LEGACY_KEYS.config);
  let resumen = null;
  if (Array.isArray(pagos) || Array.isArray(conceptos) || config) {
    resumen = await tesoreriaApi.importar({
      pagos: Array.isArray(pagos) ? pagos : [],
      conceptos: Array.isArray(conceptos) ? conceptos : [],
      config: config || null,
    });
  }
  try {
    localStorage.setItem(MIGRATION_FLAG, new Date().toISOString());
  } catch {
    // Sin almacenamiento local: se reintentará en la próxima carga (la importación es idempotente)
  }
  return resumen;
}

// Dirección válida para el QR de la boleta: dominio o IP de la red que un celular pueda abrir (no localhost).
// Mismo criterio que es_url_publica() en tesoreria_routes.py.
export function isPublicUrl(url) {
  let host;
  try {
    host = new URL(url).hostname;
  } catch {
    return false;
  }
  if (!/^https?:$/.test(new URL(url).protocol)) return false;
  if (host === 'localhost' || host.endsWith('.localhost') || host === '0.0.0.0') return false;
  const ipv4 = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    // IP de la red interna: válida (el celular en la misma Wi-Fi la abre)
    return !(a === 127 || (a === 169 && b === 254));
  }
  return host.includes('.');
}

// API base para la página pública: ruta relativa, servida por el proxy /api del propio frontend
// (Vite en desarrollo, nginx en producción). Así el celular solo necesita llegar a la web del sistema.
export function publicApiBase() {
  return '';
}
