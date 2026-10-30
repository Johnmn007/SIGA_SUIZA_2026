const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export async function getPaymentByQr(qrCode) {
  if (!qrCode || typeof qrCode !== 'string') throw new Error('Código QR inválido');
  const code = qrCode.trim();
  if (!code) throw new Error('Código QR vacío');
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  try {
    const response = await fetch(API_BASE + '/api/pagos/' + encodeURIComponent(code), { method: 'GET', headers });
    if (response.status === 404) throw new Error('PAGO_NO_ENCONTRADO');
    if (response.status === 503 || response.status === 502 || response.status === 504) throw new Error('FINANZAS_NO_DISPONIBLE');
    if (!response.ok) throw new Error('FINANZAS_NO_DISPONIBLE');
    return await response.json();
  } catch (e) {
    if (e && (e.message === 'PAGO_NO_ENCONTRADO' || e.message === 'FINANZAS_NO_DISPONIBLE')) throw e;
    throw new Error('FINANZAS_NO_DISPONIBLE');
  }
}

export async function validatePayment(qrCode, studentId) {
  if (!qrCode || !studentId) throw new Error('Datos incompletos para validación');
  const code = String(qrCode).trim();
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  try {
    const response = await fetch(API_BASE + '/api/pagos/validar', { method: 'POST', headers, body: JSON.stringify({ payment_id: code, qr_code: code, estudiante_id: studentId }) });
    if (response.status === 404) throw new Error('PAGO_NO_ENCONTRADO');
    if (response.status === 503 || response.status === 502 || response.status === 504) throw new Error('FINANZAS_NO_DISPONIBLE');
    if (!response.ok) throw new Error('FINANZAS_NO_DISPONIBLE');
    return await response.json();
  } catch (e) {
    if (e && (e.message === 'PAGO_NO_ENCONTRADO' || e.message === 'FINANZAS_NO_DISPONIBLE')) throw e;
    throw new Error('FINANZAS_NO_DISPONIBLE');
  }
}

export async function getAvailablePayments(filters = {}) {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  try {
    const queryParams = new URLSearchParams();
    if (filters.periodo) queryParams.append('periodo', filters.periodo);
    if (filters.concepto || filters.concept) queryParams.append('concepto', filters.concepto || filters.concept);
    if (filters.status || filters.estado) queryParams.append('status', filters.status || filters.estado);
    if (filters.used !== undefined) queryParams.append('used', filters.used);
    if (filters.dni) queryParams.append('dni', filters.dni);
    if (filters.q) queryParams.append('q', filters.q);
    if (filters.search) queryParams.append('search', filters.search);
    
    const url = API_BASE + '/api/pagos/boletas-disponibles' + (queryParams.toString() ? '?' + queryParams.toString() : '');
    const response = await fetch(url, { method: 'GET', headers });
    if (response.status === 503 || response.status === 502 || response.status === 504 || response.status === 404) throw new Error('FINANZAS_NO_DISPONIBLE');
    if (!response.ok) throw new Error('FINANZAS_NO_DISPONIBLE');
    const data = await response.json();
    return Array.isArray(data) ? data : (data.boletas || data.pagos || data.results || []);
  } catch (e) {
    if (e && e.message === 'FINANZAS_NO_DISPONIBLE') throw e;
    throw new Error('FINANZAS_NO_DISPONIBLE');
  }
}

export default { getPaymentByQr, validatePayment, getAvailablePayments };
