import { API_BASE } from '../core/api/client';

const BASE = `${API_BASE}/api/mod-gestion-academica/tesoreria`;

function authHeaders(hasBody = false) {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
  return {
    ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request(path, { method = 'GET', body, timeoutMs = 15000 } = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${BASE}${path}`, {
      method,
      headers: authHeaders(body !== undefined),
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    if (response.status === 404) throw new Error('PAGO_NO_ENCONTRADO');
    if (response.status === 502 || response.status === 503 || response.status === 504) {
      throw new Error('FINANZAS_NO_DISPONIBLE');
    }
    if (!response.ok) {
      const detail = typeof data?.detail === 'string' ? data.detail : '';
      throw new Error(detail || 'FINANZAS_NO_DISPONIBLE');
    }
    return data;
  } catch (error) {
    if (error.name === 'AbortError' || error instanceof TypeError) {
      throw new Error('FINANZAS_NO_DISPONIBLE', { cause: error });
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function normalizarBoleta(boleta) {
  if (!boleta || typeof boleta !== 'object') return boleta;

  const codigo = boleta.codigoRecibo || boleta.codigo_recibo || boleta.payment_id ||
    boleta.receipt_number || boleta.boleta_codigo || boleta.boletaCodigo ||
    boleta.codigo || boleta.numero_boleta || boleta.qr_code || '';
  const dni = boleta.dni || boleta.estudiante?.dni || '';
  const estudianteNombre = boleta.estudianteNombre || boleta.estudiante_nombre ||
    boleta.alumno || boleta.nombre_estudiante || '';
  const concepto = boleta.conceptoNombre || boleta.concepto_nombre ||
    boleta.concepto || boleta.concept || '';
  const fecha = boleta.fechaHora || boleta.fecha_hora || boleta.fecha ||
    boleta.fecha_pago || boleta.fecha_emision || '';
  const estado = boleta.estado || boleta.status || '';
  const programa = boleta.carreraNombre || boleta.carrera_nombre ||
    boleta.programa || boleta.carrera || boleta.programa_nombre || '';
  const monto = boleta.monto ?? boleta.amount ?? '';

  return {
    ...boleta,
    payment_id: boleta.payment_id || codigo,
    receipt_number: boleta.receipt_number || codigo,
    boleta_codigo: boleta.boleta_codigo || codigo,
    numero_boleta: boleta.numero_boleta || codigo,
    qr_code: boleta.qr_code || codigo,
    codigoRecibo: boleta.codigoRecibo || codigo,
    dni,
    estudiante_nombre: estudianteNombre,
    estudianteNombre: boleta.estudianteNombre || estudianteNombre,
    concepto,
    conceptoNombre: boleta.conceptoNombre || concepto,
    fecha,
    fechaHora: boleta.fechaHora || fecha,
    estado,
    carreraNombre: boleta.carreraNombre || programa,
    programa,
    monto,
    amount: boleta.amount ?? monto,
  };
}

export async function getPaymentByQr(qrCode) {
  if (!qrCode || typeof qrCode !== 'string') throw new Error('Código QR inválido');
  const code = qrCode.trim();
  if (!code) throw new Error('Código QR vacío');
  const data = await request(`/pagos/consultar?codigo=${encodeURIComponent(code)}`);
  return normalizarBoleta(data?.recibo || data);
}

export async function validatePayment(qrCode, studentId) {
  if (!qrCode || !studentId) throw new Error('Datos incompletos para validación');
  const code = String(qrCode).trim();
  const data = await request('/pagos/validar', {
    method: 'POST',
    body: { codigo: code, estudianteId: studentId },
  });
  return { ...data, recibo: normalizarBoleta(data?.recibo) };
}

export async function getAvailablePayments(filters = {}) {
  const queryParams = new URLSearchParams();
  if (filters.dni) queryParams.append('dni', filters.dni);
  if (filters.estudianteId || filters.estudiante_id) {
    queryParams.append('estudiante_id', filters.estudianteId || filters.estudiante_id);
  }
  if (filters.q || filters.search) queryParams.append('q', filters.q || filters.search);
  if (filters.concepto || filters.concept) queryParams.append('concepto', filters.concepto || filters.concept);
  if (filters.status || filters.estado) queryParams.append('status', filters.status || filters.estado);

  const suffix = queryParams.toString() ? `?${queryParams.toString()}` : '';
  const data = await request(`/boletas-disponibles${suffix}`);
  const boletas = Array.isArray(data) ? data : (data?.boletas || data?.pagos || data?.results || []);
  return boletas.map(normalizarBoleta);
}

export default { getPaymentByQr, validatePayment, getAvailablePayments };
