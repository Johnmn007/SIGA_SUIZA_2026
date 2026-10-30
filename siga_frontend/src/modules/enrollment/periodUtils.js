const OPEN_STATES = new Set(['matricula_abierta', 'abierto', 'activo']);
const CLOSED_STATES = new Set(['historico', 'histórico', 'cerrado']);

const STATE_LABELS = {
  planificacion: 'Planificación',
  matricula_abierta: 'Matrícula abierta',
  abierto: 'Matrícula abierta',
  activo: 'Activo',
  en_curso: 'En curso',
  historico: 'Histórico',
  'histórico': 'Histórico',
  cerrado: 'Cerrado',
};

export function normalizePeriodState(estado) {
  return String(estado ?? '').trim().toLowerCase();
}

export function isOpenPeriod(period) {
  return OPEN_STATES.has(normalizePeriodState(period?.estado));
}

export function isHistoricalPeriod(period) {
  return CLOSED_STATES.has(normalizePeriodState(period?.estado));
}

export function getPeriodStateLabel(estado) {
  const key = normalizePeriodState(estado);
  if (!key) return '';
  return STATE_LABELS[key] || key.replace(/_/g, ' ');
}

export function getPeriodBaseLabel(period) {
  if (!period) return '';
  return period.codigo || period.nombre || period.descripcion || 'Periodo sin código';
}

export function getPeriodLabel(period) {
  if (!period) return '';
  const base = getPeriodBaseLabel(period);
  const state = getPeriodStateLabel(period.estado);
  return state ? `${base} \u2014 ${state}` : base;
}

export function sortPeriods(periods) {
  return [...(Array.isArray(periods) ? periods : [])].sort((a, b) => {
    const fechaA = new Date(a?.fecha_inicio || 0).getTime();
    const fechaB = new Date(b?.fecha_inicio || 0).getTime();
    if (fechaB !== fechaA) return fechaB - fechaA;
    return String(b?.codigo || '').localeCompare(String(a?.codigo || ''));
  });
}

export function getDefaultPeriod(periods) {
  const list = sortPeriods(periods);
  return list.find(isOpenPeriod) || list[0] || null;
}

export function buildPeriodLabelMap(periods) {
  const map = new Map();
  (Array.isArray(periods) ? periods : []).forEach((period) => {
    if (period?.id != null) map.set(String(period.id), getPeriodLabel(period));
  });
  return map;
}

export function getPeriodLabelById(periods, id, fallback = '\u2014') {
  if (id == null || id === '') return fallback;
  const map = buildPeriodLabelMap(periods);
  return map.get(String(id)) || fallback;
}
