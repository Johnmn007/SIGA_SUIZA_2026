// Acta Oficial de Evaluación (formato MINEDU) generada con los datos reales del sistema.
// Se arma como documento HTML imprimible: el navegador lo guarda como PDF ("Guardar como PDF").
import { INSTITUTION } from '../../finances/lib/paymentUtils';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const LETRAS = ['CERO', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE', 'DIEZ',
  'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE'];

export const NOTA_APROBATORIA = 13;

export function notaEnLetras(nota) {
  const n = Number(nota);
  return Number.isInteger(n) && n >= 0 && n <= 20 ? LETRAS[n] : '';
}

// Condición final del estudiante: se respeta la del registro y, si no hay, se deduce de la nota.
export function condicionFinal(nota, estado) {
  const e = String(estado || '').toLowerCase();
  if (e === 'aprobado' || e === 'desaprobado') return e.toUpperCase();
  const n = Number(nota);
  if (nota === null || nota === undefined || nota === '-' || Number.isNaN(n)) return 'SIN NOTA';
  return n >= NOTA_APROBATORIA ? 'APROBADO' : 'DESAPROBADO';
}

export function buildActaHtml({ programa, periodo, modulo, unidad, docente, actaCerrada, estudiantes, generadoPor }) {
  const filas = estudiantes.map((s, i) => {
    const tieneNota = s.nota_final !== '-' && s.nota_final !== null && s.nota_final !== undefined;
    const cond = condicionFinal(s.nota_final, s.estado);
    return `<tr>
      <td class="c">${i + 1}</td>
      <td class="c">${esc(s.codigo)}</td>
      <td class="c">${esc(s.dni)}</td>
      <td>${esc(s.name)}</td>
      <td class="c nota ${tieneNota && Number(s.nota_final) < NOTA_APROBATORIA ? 'rojo' : ''}">${tieneNota ? esc(String(s.nota_final).padStart(2, '0')) : '—'}</td>
      <td class="c">${tieneNota ? esc(notaEnLetras(s.nota_final)) : '—'}</td>
      <td class="c cond ${cond === 'APROBADO' ? 'ok' : cond === 'DESAPROBADO' ? 'mal' : ''}">${esc(cond)}</td>
    </tr>`;
  }).join('');

  const total = estudiantes.length;
  const aprobados = estudiantes.filter((s) => condicionFinal(s.nota_final, s.estado) === 'APROBADO').length;
  const desaprobados = estudiantes.filter((s) => condicionFinal(s.nota_final, s.estado) === 'DESAPROBADO').length;
  const sinNota = total - aprobados - desaprobados;
  const fecha = new Date().toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });

  const css = `
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; font-size: 10.5px; margin: 0; }
    .head { display: flex; align-items: center; gap: 12px; border-bottom: 2px solid #0b3a8c; padding-bottom: 8px; }
    .logo { width: 48px; height: 48px; border-radius: 10px; background: #0b3a8c; color: #fff; font-weight: 800; font-size: 17px; display: flex; align-items: center; justify-content: center; }
    .inst { flex: 1; }
    .inst .min { font-size: 9px; letter-spacing: .08em; color: #475569; text-transform: uppercase; }
    .inst .nom { font-size: 13px; font-weight: 800; }
    .inst .meta { font-size: 9px; color: #475569; }
    .estado { font-size: 9px; font-weight: 700; padding: 4px 8px; border-radius: 6px; border: 1px solid; }
    .estado.cerrada { color: #166534; border-color: #86efac; background: #f0fdf4; }
    .estado.abierta { color: #92400e; border-color: #fcd34d; background: #fffbeb; }
    h1 { text-align: center; font-size: 15px; margin: 12px 0 2px; letter-spacing: .04em; }
    .sub { text-align: center; font-size: 10px; color: #475569; margin-bottom: 10px; }
    .datos { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; margin-bottom: 10px; }
    .datos div { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; }
    .datos div:nth-child(odd) { border-right: 1px solid #e2e8f0; }
    .datos b { display: block; font-size: 8px; color: #64748b; text-transform: uppercase; letter-spacing: .06em; }
    table.notas { width: 100%; border-collapse: collapse; }
    table.notas th { background: #0b3a8c; color: #fff; font-size: 9px; padding: 6px 4px; text-transform: uppercase; }
    table.notas td { border: 1px solid #cbd5e1; padding: 5px 6px; }
    table.notas tr:nth-child(even) td { background: #f8fafc; }
    .c { text-align: center; }
    .nota { font-weight: 800; font-size: 12px; color: #0b3a8c; }
    .nota.rojo { color: #dc2626; }
    .cond { font-weight: 700; font-size: 9px; }
    .cond.ok { color: #166534; } .cond.mal { color: #dc2626; }
    .vacio { text-align: center; color: #64748b; padding: 18px; }
    .resumen { display: flex; gap: 8px; margin: 10px 0; }
    .resumen div { flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px; text-align: center; }
    .resumen b { display: block; font-size: 15px; }
    .firmas { display: flex; justify-content: space-around; margin-top: 46px; gap: 20px; }
    .firma { flex: 1; text-align: center; }
    .firma .linea { border-top: 1px solid #0f172a; margin: 0 12px 4px; }
    .firma .rol { font-weight: 700; font-size: 9.5px; }
    .firma .nom { font-size: 9px; color: #475569; min-height: 12px; }
    .pie { margin-top: 18px; font-size: 8.5px; color: #64748b; border-top: 1px dashed #cbd5e1; padding-top: 6px; }
    tr { page-break-inside: avoid; }
  `;

  const body = `
    <div class="head">
      <div class="logo">IS</div>
      <div class="inst">
        <div class="min">Ministerio de Educación · DRE Ucayali</div>
        <div class="nom">${esc(INSTITUTION.nombre)}</div>
        <div class="meta">RUC ${esc(INSTITUTION.ruc)} · ${esc(INSTITUTION.direccion)}</div>
      </div>
      <div class="estado ${actaCerrada ? 'cerrada' : 'abierta'}">${actaCerrada ? 'ACTA CERRADA' : 'ACTA ABIERTA (PRELIMINAR)'}</div>
    </div>

    <h1>ACTA DE EVALUACIÓN DE LA UNIDAD DIDÁCTICA</h1>
    <div class="sub">Periodo académico ${esc(periodo?.codigo || '')} · Escala vigesimal (0 – 20) · Nota mínima aprobatoria ${NOTA_APROBATORIA}</div>

    <div class="datos">
      <div><b>Programa de estudios</b>${esc(programa?.nombre || '')}</div>
      <div><b>Código del programa</b>${esc(programa?.codigo || '—')}</div>
      <div><b>Módulo formativo</b>${esc(modulo?.nombre || '')}</div>
      <div><b>Ciclo</b>${esc(modulo?.periodo ?? '—')}</div>
      <div><b>Unidad didáctica</b>${esc(unidad?.nombre || '')}</div>
      <div><b>Tipo</b>${unidad?.isEmpleabilidad ? 'Transversal / Empleabilidad' : 'Específica'}</div>
      <div><b>Créditos / Horas</b>${esc(unidad?.creditos ?? '—')} créditos · ${esc(unidad?.horas ?? '—')} horas</div>
      <div><b>Docente responsable</b>${esc(docente || 'Sin docente asignado')}</div>
    </div>

    <table class="notas">
      <thead><tr>
        <th style="width:30px">N°</th><th style="width:80px">Código</th><th style="width:70px">DNI</th>
        <th>Apellidos y nombres</th><th style="width:48px">Nota</th><th style="width:90px">En letras</th><th style="width:80px">Condición</th>
      </tr></thead>
      <tbody>${filas || '<tr><td colspan="7" class="vacio">No hay estudiantes matriculados en esta unidad didáctica para el periodo seleccionado.</td></tr>'}</tbody>
    </table>

    <div class="resumen">
      <div>Matriculados<b>${total}</b></div>
      <div>Aprobados<b style="color:#166534">${aprobados}</b></div>
      <div>Desaprobados<b style="color:#dc2626">${desaprobados}</b></div>
      <div>Sin nota<b style="color:#64748b">${sinNota}</b></div>
    </div>

    <div class="firmas">
      <div class="firma"><div class="linea"></div><div class="rol">Docente de la unidad didáctica</div><div class="nom">${esc(docente || '')}</div></div>
      <div class="firma"><div class="linea"></div><div class="rol">Coordinador(a) del programa</div><div class="nom"></div></div>
      <div class="firma"><div class="linea"></div><div class="rol">Secretaría Académica</div><div class="nom"></div></div>
    </div>

    <div class="pie">Documento generado por el Sistema Integrado de Gestión Académica (SIGA) el ${esc(fecha)}${generadoPor ? ` por ${esc(generadoPor)}` : ''}. ${actaCerrada ? '' : 'El acta aún no está cerrada: las notas pueden cambiar hasta su cierre.'}</div>
  `;

  const titulo = `Acta ${unidad?.nombre || ''} - ${periodo?.codigo || ''}`;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(titulo)}</title><style>${css}</style></head><body>${body}</body></html>`;
}

// Imprime el acta en un iframe oculto; en el diálogo el usuario elige "Guardar como PDF".
export function imprimirActa(html) {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  doc.open();
  doc.write(html);
  doc.close();
  const limpiar = () => setTimeout(() => iframe.remove(), 1000);
  setTimeout(() => {
    try {
      iframe.contentWindow.addEventListener('afterprint', limpiar, { once: true });
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } finally {
      setTimeout(limpiar, 60000);
    }
  }, 250);
}
