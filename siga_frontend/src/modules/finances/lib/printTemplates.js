// Plantillas HTML autocontenidas para la impresión de comprobantes de Tesorería.
// Se renderizan dentro de un <iframe>: la vista previa en pantalla y la impresión son el mismo documento.
import { qrToSvg } from './qrcode';
import {
  INSTITUTION,
  formatMoney,
  formatDateTime,
  amountToWords,
  getReceiptVerificationCode,
  formatToken,
  receiptQrContent,
  buildBoletaLink,
} from './paymentUtils';

const esc = (v) => String(v ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const BASE_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #fff; }
  body {
    font-family: "Segoe UI", "Outfit", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #0f172a;
    font-size: 11px;
    line-height: 1.35;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .mono { font-family: "Cascadia Mono", Consolas, "Courier New", monospace; }
  .muted { color: #64748b; }
  .brand {
    display: flex; align-items: center; gap: 10px;
  }
  .logo {
    width: 40px; height: 40px; border-radius: 10px;
    background: linear-gradient(135deg, #0044B2, #002D7A);
    color: #fff; font-weight: 900; font-size: 15px; letter-spacing: .5px;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .inst-sigla { font-size: 15px; font-weight: 900; color: #0A2552; letter-spacing: .3px; }
  .inst-name { font-size: 9.5px; font-weight: 700; color: #334155; }
  .inst-meta { font-size: 8.5px; color: #64748b; }
  .label { font-size: 8px; font-weight: 800; letter-spacing: .6px; text-transform: uppercase; color: #64748b; }
  .badge {
    display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 8.5px; font-weight: 800;
    letter-spacing: .4px; text-transform: uppercase; border: 1px solid;
  }
  .badge-paid { color: #047857; background: #ecfdf5; border-color: #a7f3d0; }
  .badge-pending { color: #b45309; background: #fffbeb; border-color: #fde68a; }
  .qr svg { display: block; width: 100%; height: 100%; }
  @media screen {
    html { background: #e2e8f0; }
    body { background: #e2e8f0; padding: 18px 0; }
    .sheet { margin: 0 auto; background: #fff; box-shadow: 0 10px 30px rgba(15, 23, 42, .15); }
  }
`;

// ---------------------------------------------------------------------------
// RECIBO DE CAJA (A5 vertical)
// ---------------------------------------------------------------------------
// QR: enlace a la boleta para celular si el sistema está en internet; si no, la boleta escrita (ver receiptQrContent)
export function buildReceiptHtml(receipt) {
  const verification = getReceiptVerificationCode(receipt);
  const qr = qrToSvg(receiptQrContent(receipt), { border: 1, ecl: 'L' });
  const qrAbreBoleta = Boolean(buildBoletaLink(receipt));
  const monto = parseFloat(receipt.monto) || 0;
  const hasOperation = receipt.numeroOperacion && receipt.numeroOperacion !== '-';

  const css = `
    ${BASE_CSS}
    @page { size: A5 portrait; margin: 0; }
    .sheet { width: 148mm; min-height: 209mm; padding: 9mm 10mm; position: relative; display: flex; flex-direction: column; }
    .head { display: flex; justify-content: space-between; align-items: stretch; gap: 10px; padding-bottom: 8px; border-bottom: 2.5px solid #0A2552; }
    .doc-box { border: 1.5px solid #0A2552; border-radius: 8px; text-align: center; min-width: 40mm; overflow: hidden; }
    .doc-box .ruc { font-size: 8.5px; font-weight: 700; padding: 3px 6px; color: #0A2552; }
    .doc-box .type { background: #0A2552; color: #fff; font-size: 8.5px; font-weight: 800; letter-spacing: .5px; padding: 4px 6px; }
    .doc-box .num { font-size: 12px; font-weight: 900; padding: 4px 6px; color: #0f172a; }
    .meta { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; padding: 7px 0; border-bottom: 1px dashed #cbd5e1; }
    .meta .val { font-size: 10px; font-weight: 700; }
    .student { margin-top: 8px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; padding: 8px 10px; display: grid; grid-template-columns: 1.6fr 1fr; gap: 6px 12px; }
    .student .val { font-size: 10.5px; font-weight: 800; }
    .dni-val { font-size: 14px !important; font-weight: 900 !important; color: #0044B2; letter-spacing: .5px; }
    table { width: 100%; border-collapse: collapse; margin-top: 9px; }
    th { background: #0A2552; color: #fff; font-size: 8px; font-weight: 800; letter-spacing: .5px; text-transform: uppercase; padding: 5px 6px; text-align: left; }
    th.r, td.r { text-align: right; }
    td { padding: 7px 6px; border-bottom: 1px solid #e2e8f0; vertical-align: top; font-size: 10px; }
    td .sub { font-size: 8.5px; color: #64748b; display: block; margin-top: 1px; }
    .total { margin-top: 8px; display: flex; justify-content: space-between; align-items: center; background: #0A2552; color: #fff; border-radius: 8px; padding: 8px 12px; }
    .total .amount { font-size: 19px; font-weight: 900; }
    .words { margin-top: 5px; font-size: 9px; font-weight: 700; color: #334155; }
    .pay { margin-top: 8px; display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px; padding: 7px 10px; border: 1px solid #e2e8f0; border-radius: 8px; }
    .pay .val { font-size: 10px; font-weight: 700; }
    .unlock { margin-top: 7px; padding: 5px 9px; border-radius: 6px; background: #ecfdf5; border: 1px solid #a7f3d0; color: #047857; font-size: 9px; font-weight: 700; }
    .verify { margin-top: auto; padding-top: 10px; display: flex; gap: 12px; align-items: center; border-top: 1px dashed #cbd5e1; }
    .qr { width: 44mm; height: 44mm; flex-shrink: 0; padding: 2px; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; }
    .verify-data { flex: 1; display: grid; gap: 4px; }
    .verify-data .row { display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 2px; }
    .verify-data .row b { font-size: 10.5px; }
    .verify-data .big { font-size: 13px; font-weight: 900; color: #047857; }
    .stamp { flex-shrink: 0; transform: rotate(-8deg); border: 2.5px solid #059669; color: #059669; border-radius: 8px; padding: 3px 10px; text-align: center; opacity: .9; }
    .stamp b { display: block; font-size: 15px; font-weight: 900; letter-spacing: 3px; }
    .stamp span { font-size: 7px; font-weight: 800; letter-spacing: 1px; }
    .foot { margin-top: 8px; display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; }
    .sign { text-align: center; min-width: 42mm; }
    .sign .line { border-top: 1px solid #475569; margin-bottom: 2px; }
    .legal { font-size: 7.5px; color: #94a3b8; max-width: 70mm; }
    @media screen and (max-width: 600px) {
      body { padding: 0; font-size: 12px; }
      .sheet { width: 100%; min-height: 0; padding: 16px 14px; box-shadow: none; }
      .head { flex-direction: column; }
      .doc-box { min-width: 0; }
      .meta { grid-template-columns: 1fr 1fr; }
      .student, .pay { grid-template-columns: 1fr; }
      .verify { flex-direction: column; align-items: stretch; margin-top: 14px; }
      .qr { width: 220px; height: 220px; align-self: center; }
      .foot { flex-wrap: wrap; justify-content: center; }
      .legal { max-width: none; }
    }
  `;

  const body = `
    <div class="sheet">
      <div class="head">
        <div class="brand">
          <div class="logo">IS</div>
          <div>
            <div class="inst-sigla">${esc(INSTITUTION.sigla)}</div>
            <div class="inst-name">${esc(INSTITUTION.nombre)}</div>
            <div class="inst-meta">${esc(INSTITUTION.direccion)}</div>
          </div>
        </div>
        <div class="doc-box">
          <div class="ruc">RUC ${esc(INSTITUTION.ruc)}</div>
          <div class="type">RECIBO DE CAJA</div>
          <div class="num mono">${esc(receipt.codigoRecibo)}</div>
        </div>
      </div>

      <div class="meta">
        <div><div class="label">Fecha y hora de pago</div><div class="val">${esc(receipt.fechaHora)}</div></div>
        <div><div class="label">Cajero responsable</div><div class="val">${esc(receipt.cajero || 'Caja Central')}</div></div>
        <div><div class="label">Estado</div><div class="val"><span class="badge badge-paid">✓ Pagado</span></div></div>
      </div>

      <div class="student">
        <div><div class="label">Alumno</div><div class="val">${esc(receipt.estudianteNombre)}</div></div>
        <div><div class="label">DNI del alumno</div><div class="val dni-val mono">${esc(receipt.dni)}</div></div>
        <div><div class="label">Programa de estudio</div><div class="val">${esc(receipt.carreraNombre)}</div></div>
        <div><div class="label">Código de alumno</div><div class="val mono">${esc(receipt.codigoEstudiante)}</div></div>
      </div>

      <table>
        <thead><tr><th style="width:18%">Código</th><th>Concepto TUPA</th><th class="r" style="width:24%">Importe</th></tr></thead>
        <tbody>
          <tr>
            <td class="mono"><b>${esc(receipt.conceptoCodigo)}</b></td>
            <td><b>${esc(receipt.conceptoNombre)}</b>
              <span class="sub">${esc(receipt.conceptoCategoria)}${receipt.tarifaNombre && receipt.tarifaNombre !== 'General' ? ` · Tarifa: ${esc(receipt.tarifaNombre)}` : ''}</span>
              ${receipt.observaciones ? `<span class="sub">Obs.: ${esc(receipt.observaciones)}</span>` : ''}
            </td>
            <td class="r mono"><b>${esc(formatMoney(monto))}</b></td>
          </tr>
        </tbody>
      </table>

      <div class="total">
        <div><div class="label" style="color:#bfdbfe">Total pagado</div><div style="font-size:9px;color:#dbeafe">Moneda nacional (soles)</div></div>
        <div class="amount mono">${esc(formatMoney(monto))}</div>
      </div>
      <div class="words">SON: ${esc(amountToWords(monto))}</div>

      <div class="pay">
        <div><div class="label">Forma de pago</div><div class="val">${esc(receipt.metodoPagoNombre)}</div></div>
        <div><div class="label">N° de operación / referencia</div><div class="val mono">${esc(hasOperation ? receipt.numeroOperacion : '—')}</div></div>
      </div>

      ${receipt.liberaMatricula ? '<div class="unlock">✓ Pago habilitante: el bloqueo de matrícula del alumno fue liberado en el sistema académico.</div>' : ''}

      <div class="verify">
        <div class="qr">${qr}</div>
        <div class="verify-data">
          <div class="label" style="color:#0A2552">${qrAbreBoleta ? 'Escanee el QR con su celular para abrir esta boleta' : 'Escanee el QR: la boleta se muestra en cualquier celular'}</div>
          <div class="row"><span class="muted">DNI del alumno</span><b class="mono">${esc(receipt.dni)}</b></div>
          <div class="row"><span class="muted">Monto pagado</span><span class="big mono">${esc(formatMoney(monto))}</span></div>
          <div class="row"><span class="muted">N° de recibo</span><b class="mono">${esc(receipt.codigoRecibo)}</b></div>
          <div class="row" style="border:none"><span class="muted">Código de verificación</span><b class="mono">${esc(verification)}</b></div>
        </div>
      </div>

      <div class="foot">
        <div class="legal">Comprobante emitido por el Sistema Integrado de Gestión Académica (SIGA). El código QR contiene esta boleta completa con su código de verificación; se lee con la cámara de cualquier celular. Conserve este documento.</div>
        <div class="stamp"><b>PAGADO</b><span>TESORERÍA · ${esc(INSTITUTION.sigla)}</span></div>
        <div class="sign"><div class="line"></div><div class="label" style="color:#334155">Tesorería y Caja</div></div>
      </div>
    </div>
  `;

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Recibo ${esc(receipt.codigoRecibo)} - DNI ${esc(receipt.dni)}</title><style>${css}</style></head><body>${body}</body></html>`;
}

// ---------------------------------------------------------------------------
// ESTADO DE CUENTA ANUAL (A4 vertical, admite varias páginas)
// ---------------------------------------------------------------------------
// token / qrContent: código de verificación y datos del estado de cuenta (generados por el servidor)
export function buildStatementHtml({ student, payments, careerName, token, qrContent, emitted }) {
  const emittedAt = emitted || formatDateTime(new Date());
  const verification = formatToken(token) || '—';
  const qr = qrToSvg(qrContent || `${INSTITUTION.sigla} - ESTADO DE CUENTA 2026\nDNI ALUMNO: ${student.dni}\nVERIFICACION: ${verification}`, { border: 1 });

  const pagados = payments.filter(p => p.estado === 'PAGADO');
  const totalPagado = pagados.reduce((acc, p) => acc + (parseFloat(p.monto) || 0), 0);
  const totalPendiente = payments.filter(p => p.estado === 'PENDIENTE').reduce((acc, p) => acc + (parseFloat(p.monto) || 0), 0);
  const alDia = totalPendiente === 0;

  const rows = payments.map((p, i) => {
    const isPaid = p.estado === 'PAGADO';
    const fecha = p.fechaHora ? String(p.fechaHora).split(',')[0] : '—';
    const hasOperation = p.numeroOperacion && p.numeroOperacion !== '-';
    return `
      <tr class="${isPaid ? '' : 'pending'}">
        <td class="c">${i + 1}</td>
        <td class="nowrap">${esc(fecha)}</td>
        <td class="mono nowrap"><b>${esc(p.codigoRecibo)}</b></td>
        <td><b>${esc(p.conceptoNombre)}</b><span class="sub">${esc(p.conceptoCodigo || '')} · ${esc(p.conceptoCategoria || '')}</span></td>
        <td>${esc(p.metodoPagoNombre)}${hasOperation ? `<span class="sub mono">${esc(p.numeroOperacion)}</span>` : ''}</td>
        <td class="c"><span class="badge ${isPaid ? 'badge-paid' : 'badge-pending'}">${isPaid ? '✓ Pagado' : 'Pendiente'}</span></td>
        <td class="r mono nowrap"><b>${esc(formatMoney(p.monto))}</b></td>
      </tr>`;
  }).join('');

  const css = `
    ${BASE_CSS}
    @page { size: A4 portrait; margin: 0; }
    .sheet { width: 210mm; min-height: 296mm; }
    .frame { width: 100%; border-collapse: collapse; }
    .frame > thead td { height: 12mm; }
    .frame > tfoot td { height: 14mm; }
    .content { padding: 0 14mm; }
    .head { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 10px; border-bottom: 2.5px solid #0A2552; }
    .head .logo { width: 46px; height: 46px; font-size: 17px; }
    .head .inst-sigla { font-size: 17px; }
    .fiscal { text-align: right; }
    .fiscal .box { display: inline-block; border: 1.5px solid #0A2552; border-radius: 6px; padding: 4px 10px; font-size: 10px; font-weight: 900; color: #0A2552; letter-spacing: .5px; }
    .fiscal .emit { margin-top: 4px; font-size: 8.5px; color: #64748b; }
    h1 { text-align: center; font-size: 15px; font-weight: 900; color: #0A2552; letter-spacing: .4px; margin-top: 12px; }
    .lead { text-align: center; font-size: 9.5px; color: #64748b; margin-top: 2px; }
    .student { margin-top: 12px; display: grid; grid-template-columns: 1.4fr 1fr; gap: 8px 18px; padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; }
    .student .val { font-size: 11.5px; font-weight: 800; }
    .dni-val { font-size: 15px !important; font-weight: 900 !important; color: #0044B2; letter-spacing: .5px; }
    h2 { font-size: 10px; font-weight: 900; color: #0A2552; letter-spacing: .6px; text-transform: uppercase; margin: 14px 0 6px; }
    table.detail { width: 100%; border-collapse: collapse; }
    table.detail thead { display: table-header-group; }
    table.detail th { background: #0A2552; color: #fff; font-size: 8px; font-weight: 800; letter-spacing: .5px; text-transform: uppercase; padding: 6px 6px; text-align: left; }
    table.detail td { padding: 6px 6px; border-bottom: 1px solid #e2e8f0; font-size: 9.5px; vertical-align: top; }
    table.detail tr { page-break-inside: avoid; }
    table.detail tr.pending td { background: #fffbeb; }
    table.detail tbody tr:nth-child(even):not(.pending) td { background: #f8fafc; }
    .sub { display: block; font-size: 8px; color: #64748b; margin-top: 1px; }
    .c { text-align: center; } .r { text-align: right; } .nowrap { white-space: nowrap; }
    table.detail tfoot td { border-top: 2px solid #0A2552; border-bottom: none; font-weight: 900; font-size: 10.5px; padding-top: 7px; }
    .totals { margin-top: 12px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; page-break-inside: avoid; }
    .tot { border-radius: 8px; padding: 9px 12px; border: 1px solid; }
    .tot .amount { font-size: 17px; font-weight: 900; margin-top: 2px; }
    .tot-paid { background: #ecfdf5; border-color: #a7f3d0; color: #065f46; }
    .tot-pending { background: #fffbeb; border-color: #fde68a; color: #92400e; }
    .tot-state { background: #f1f5f9; border-color: #cbd5e1; color: #0f172a; }
    .tot-state .amount { font-size: 12.5px; padding-top: 3px; }
    .verify { margin-top: 16px; display: flex; gap: 16px; align-items: center; padding: 12px 14px; border: 1px solid #cbd5e1; border-radius: 8px; page-break-inside: avoid; }
    .qr { width: 40mm; height: 40mm; flex-shrink: 0; padding: 2px; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; }
    .verify-data { flex: 1; display: grid; gap: 5px; }
    .verify-data .row { display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 3px; font-size: 10px; }
    .sign { text-align: center; width: 55mm; flex-shrink: 0; align-self: flex-end; }
    .sign .line { border-top: 1px solid #475569; margin-bottom: 3px; }
    .note { margin-top: 10px; font-size: 8px; color: #94a3b8; text-align: center; }
    @media screen and (max-width: 760px) {
      body { padding: 0; font-size: 12px; }
      .sheet { width: 100%; min-height: 0; box-shadow: none; }
      .frame > thead td, .frame > tfoot td { height: 12px; }
      .content { padding: 0 12px; }
      .head { flex-direction: column; gap: 8px; }
      .fiscal { text-align: left; }
      .student, .totals { grid-template-columns: 1fr; }
      .table-wrap { overflow-x: auto; }
      table.detail { min-width: 620px; }
      .verify { flex-direction: column; align-items: stretch; }
      .qr { width: 220px; height: 220px; align-self: center; }
      .sign { width: auto; align-self: center; margin-top: 12px; }
    }
  `;

  const body = `
    <div class="sheet">
      <table class="frame">
        <thead><tr><td></td></tr></thead>
        <tfoot><tr><td></td></tr></tfoot>
        <tbody><tr><td><div class="content">
          <div class="head">
            <div class="brand">
              <div class="logo">IS</div>
              <div>
                <div class="inst-sigla">${esc(INSTITUTION.sigla)}</div>
                <div class="inst-name">${esc(INSTITUTION.nombre)}</div>
                <div class="inst-meta">RUC ${esc(INSTITUTION.ruc)} · ${esc(INSTITUTION.direccion)}</div>
              </div>
            </div>
            <div class="fiscal">
              <div class="box">EJERCICIO FISCAL 2026</div>
              <div class="emit">Emitido: ${esc(emittedAt)}</div>
            </div>
          </div>

          <h1>ESTADO DE CUENTA Y CONSTANCIA ANUAL DE PAGOS</h1>
          <div class="lead">Registro oficial de obligaciones económicas y aranceles TUPA del año lectivo 2026</div>

          <div class="student">
            <div><div class="label">Apellidos y nombres</div><div class="val">${esc(student.nombres)} ${esc(student.apellidos)}</div></div>
            <div><div class="label">DNI del alumno</div><div class="val dni-val mono">${esc(student.dni)}</div></div>
            <div><div class="label">Programa de estudio</div><div class="val">${esc(careerName)}</div></div>
            <div><div class="label">Código institucional</div><div class="val mono">${esc(student.codigo_estudiante)}</div></div>
          </div>

          <h2>Detalle de pagos y obligaciones del año 2026</h2>
          <div class="table-wrap"><table class="detail">
            <thead><tr>
              <th class="c" style="width:4%">N°</th>
              <th style="width:10%">Fecha</th>
              <th style="width:15%">Comprobante</th>
              <th>Concepto TUPA</th>
              <th style="width:19%">Forma de pago / Ref.</th>
              <th class="c" style="width:11%">Estado</th>
              <th class="r" style="width:12%">Monto</th>
            </tr></thead>
            <tbody>${rows || '<tr><td colspan="7" class="c muted">Sin movimientos registrados.</td></tr>'}</tbody>
            <tfoot><tr><td colspan="6" class="r">TOTAL PAGADO EN EL AÑO</td><td class="r mono nowrap">${esc(formatMoney(totalPagado))}</td></tr></tfoot>
          </table></div>

          <div class="totals">
            <div class="tot tot-paid"><div class="label" style="color:#047857">Total pagado en el año</div><div class="amount mono">${esc(formatMoney(totalPagado))}</div><div style="font-size:8.5px">${pagados.length} comprobante(s) emitido(s)</div></div>
            <div class="tot tot-pending"><div class="label" style="color:#b45309">Saldo pendiente</div><div class="amount mono">${esc(formatMoney(totalPendiente))}</div><div style="font-size:8.5px">${alDia ? 'Sin deudas pendientes' : 'Obligaciones por cancelar'}</div></div>
            <div class="tot tot-state"><div class="label">Condición financiera</div><div class="amount" style="color:${alDia ? '#047857' : '#b45309'}">${alDia ? '✓ HABILITADO · AL DÍA' : '⚠ CON DEUDA PENDIENTE'}</div></div>
          </div>

          <div class="verify">
            <div class="qr">${qr}</div>
            <div class="verify-data">
              <div class="label" style="color:#0A2552">Datos del estado de cuenta grabados en el QR</div>
              <div class="row"><span class="muted">DNI del alumno</span><b class="mono">${esc(student.dni)}</b></div>
              <div class="row"><span class="muted">Total pagado</span><b class="mono" style="color:#047857">${esc(formatMoney(totalPagado))}</b></div>
              <div class="row"><span class="muted">Saldo pendiente</span><b class="mono" style="color:#b45309">${esc(formatMoney(totalPendiente))}</b></div>
              <div class="row" style="border:none"><span class="muted">Código de verificación</span><b class="mono">${esc(verification)}</b></div>
            </div>
            <div class="sign"><div class="line"></div><div class="label" style="color:#334155">Tesorería y Caja</div><div style="font-size:8px;color:#94a3b8">${esc(INSTITUTION.sigla)} · Pucallpa</div></div>
          </div>

          <div class="note">Documento emitido por el Sistema Integrado de Gestión Académica (SIGA). El código QR contiene el DNI, los totales y los recibos de este estado de cuenta con su código de verificación.</div>
        </div></td></tr></tbody>
      </table>
    </div>
  `;

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Estado de Cuenta 2026 - DNI ${esc(student.dni)}</title><style>${css}</style></head><body>${body}</body></html>`;
}

// Imprime el documento cargado en un iframe de vista previa
export function printIframe(iframe) {
  if (!iframe?.contentWindow) return;
  iframe.contentWindow.focus();
  iframe.contentWindow.print();
}
