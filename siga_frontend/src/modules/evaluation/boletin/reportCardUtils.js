export const ESTADO_CONFIG = {
  aprobado: {
    label: 'Aprobado',
    badge: 'bg-green-100 text-green-700 border-green-200',
    dot: 'bg-green-500',
    text: 'text-green-600',
  },
  cursando: {
    label: 'En curso',
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
    text: 'text-blue-600',
  },
  en_riesgo: {
    label: 'En riesgo',
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
    text: 'text-amber-600',
  },
  desaprobado: {
    label: 'Desaprobado',
    badge: 'bg-red-100 text-red-700 border-red-200',
    dot: 'bg-red-500',
    text: 'text-red-600',
  },
};

export function getEstadoConfig(estado) {
  return ESTADO_CONFIG[estado] || ESTADO_CONFIG.cursando;
}

export const MERITO_CONFIG = {
  purple: { label: 'Quinto Superior', badge: 'bg-purple-100 text-purple-700 border-purple-200' },
  blue: { label: 'Tercio Superior', badge: 'bg-blue-100 text-blue-700 border-blue-200' },
};

export function notaTextColor(nota) {
  if (nota === null || nota === undefined) return 'text-slate-400';
  return nota >= 13 ? 'text-green-600 font-bold' : 'text-red-600 font-bold';
}

export function formatFecha(iso) {
  if (!iso) return '-';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function nombreCompleto(estudiante) {
  if (!estudiante) return '';
  const { apellidos = '', nombres = '' } = estudiante;
  return `${apellidos} ${nombres}`.trim();
}

export function buildPrintHtml(boletin, rangoAprobatorio = 'Nota mínima aprobatoria: 13 (en escala vigesimal)') {
  if (!boletin) return '';

  const est = boletin.estudiante || {};
  const per = boletin.periodo || {};
  const kpis = boletin.kpis || {};
  const merito = kpis.merito || {};
  const materias = boletin.materias || [];

  const estadoLabel = getEstadoConfig;

  const rows = materias.map((m, idx) => {
    const evals = m.evaluaciones || [];
    const getNota = (nombre) => {
      const item = evals.find(e => e.nombre === nombre);
      return item && item.nota !== null && item.nota !== undefined ? item.nota : '-';
    };
    const estCfg = estadoLabel(m.estado);
    const asistencia = m.porcentaje_asistencia !== null && m.porcentaje_asistencia !== undefined
      ? `${m.porcentaje_asistencia}%`
      : '-';
    const retro = m.retroalimentacion || '-';
    return `
      <tr>
        <td class="ta-l">${idx + 1}</td>
        <td class="ta-l">
          <div class="cod">${m.codigo || '-'}</div>
          <div><strong>${m.nombre || '-'}</strong></div>
          ${m.modulo ? `<div class="dim">${m.modulo}</div>` : ''}
        </td>
        <td>${m.ciclo ?? '-'}</td>
        <td>${m.creditos ?? '-'}</td>
        <td>${getNota('PC1')}</td>
        <td>${getNota('PC2')}</td>
        <td>${getNota('PC3')}</td>
        <td class="ta-c strong">${m.nota_final ?? '-'}</td>
        <td><span class="st ${m.estado}">${estCfg.label}</span></td>
        <td>${asistencia}</td>
        <td class="ta-l dim">${retro}</td>
      </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Boletín de Notas - ${per.codigo || ''}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 24px; font-size: 12px; }
  header { text-align: center; border-bottom: 2px solid #1e40af; padding-bottom: 12px; margin-bottom: 20px; }
  header h1 { font-size: 20px; margin: 4px 0; letter-spacing: 1px; }
  header h2 { font-size: 15px; margin: 2px 0; color: #1d4ed8; }
  .codigo { font-size: 10px; color: #64748b; margin-top: 2px; }
  .grid { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
  .box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; min-width: 120px; }
  .box .lbl { font-size: 9px; text-transform: uppercase; letter-spacing: .6px; color: #64748b; }
  .box .val { font-size: 15px; font-weight: 700; margin-top: 2px; }
  .merito { display: inline-block; padding: 2px 10px; border-radius: 999px; background: #eef2ff; color: #4338ca; font-weight: 700; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center; vertical-align: top; }
  th { background: #1e40af; color: #fff; font-size: 11px; text-transform: uppercase; }
  tr:nth-child(even) td { background: #f8fafc; }
  .ta-l { text-align: left; }
  .ta-c { text-align: center; }
  .strong { font-weight: 800; font-size: 13px; }
  .dim { color: #64748b; font-size: 10px; }
  .cod { color: #2563eb; font-weight: 600; font-size: 10px; }
  .st { display: inline-block; padding: 1px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; }
  .st.aprobado { background: #dcfce7; color: #15803d; }
  .st.cursando { background: #dbeafe; color: #1d4ed8; }
  .st.en_riesgo { background: #fef3c7; color: #b45309; }
  .st.desaprobado { background: #fee2e2; color: #b91c1c; }
  footer { margin-top: 16px; font-size: 10px; color: #64748b; display: flex; justify-content: space-between; }
  @media print { body { margin: 8mm; } }
</style>
</head>
<body>
  <header>
    <div class="codigo">SISTEMA INTEGRAL DE GESTIÓN ACADÉMICA</div>
    <h1>BOLETÍN DE NOTAS</h1>
    <h2>Periodo Académico ${per.codigo || '-'}</h2>
  </header>

  <div class="grid">
    <div class="box"><div class="lbl">Estudiante</div><div class="val">${nombreCompleto(est)}</div></div>
    <div class="box"><div class="lbl">Código</div><div class="val">${est.codigo_estudiante || '-'}</div></div>
    <div class="box"><div class="lbl">DNI</div><div class="val">${est.dni || '-'}</div></div>
    <div class="box"><div class="lbl">Promedio Periodo (PPP)</div><div class="val">${kpis.ppp ?? '-'}</div></div>
    <div class="box"><div class="lbl">Promedio Acumulado (PPA)</div><div class="val">${kpis.ppa ?? '-'}</div></div>
    <div class="box"><div class="lbl">Créditos cursados/aprobados</div><div class="val">${kpis.creditos_cursados ?? 0} / ${kpis.creditos_aprobados ?? 0}</div></div>
    ${merito.merito ? `<div class="box"><div class="lbl">Mérito académico</div><div class="val merito">${merito.merito}</div></div>` : ''}
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th><th>Unidad Didáctica</th><th>Ciclo</th><th>Créd.</th>
        <th>PC1</th><th>PC2</th><th>PC3</th><th>Promedio</th><th>Estado</th><th>Asistencia</th><th>Retroalimentación</th>
      </tr>
    </thead>
    <tbody>${rows || '<tr><td colspan="11">Sin asignaturas registradas para este periodo.</td></tr>'}</tbody>
  </table>

  <footer>
    <div>${rangoAprobatorio}</div>
    <div>Generado el ${formatFecha(boletin.generado_el || new Date())}</div>
  </footer>
</body>
</html>`;
}