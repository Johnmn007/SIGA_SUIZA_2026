import { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Printer,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import './receiptPrint.css';

export function ReceiptModal({ receipt, onClose }) {
  const printRef = useRef(null);

  // La clase `receipt-printing` en <body> activa receiptPrint.css,
  // que aísla la impresión al comprobante seleccionado (una sola
  // hoja A4, sin dashboard ni fondo del sistema). Se aplica solo
  // durante el ciclo de impresión: beforeprint → afterprint.
  useEffect(() => {
    const body = document.body;
    const handleBeforePrint = () => body.classList.add('receipt-printing');
    const handleAfterPrint = () => body.classList.remove('receipt-printing');

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
      body.classList.remove('receipt-printing');
    };
  }, []);

  if (!receipt) return null;

  // Imprime únicamente el recibo seleccionado. No reejecuta el cobro
  // ni genera nuevas operaciones: solo invoca la vista previa del
  // navegador sobre el documento ya renderizado.
  const handlePrint = () => {
    document.body.classList.add('receipt-printing');
    window.print();
    // Fallback por si el navegador no dispara afterprint.
    setTimeout(() => document.body.classList.remove('receipt-printing'), 1500);
  };

  const monto = parseFloat(receipt.monto) || 0;

  // Contenido del QR: referencia de verificación institucional con datos reales del recibo.
  // Mantiene la finalidad original del QR (verificación de autenticidad).
  // ESTUDIANTE y PERIODO provienen de datos reales ( PaymentModal ); los centinelas
  // ('S/N', 'S/P') se usan solo cuando el dato no existe (recibos históricos/demo),
  // siguiendo el mismo criterio de 'S/R', 'S/D', 'S/C' ya existente.
  const estudianteQr = receipt.estudianteNombreCompleto || receipt.estudianteNombre || 'S/N';
  const periodoQr = receipt.periodoCodigo || 'S/P';
  const qrVerificacion = [
    'IESTP-SUIZA-VERIFICACION',
    receipt.codigoRecibo || 'S/R',
    `DNI:${receipt.dni || 'S/D'}`,
    `ESTUDIANTE:${estudianteQr}`,
    `COD:${receipt.codigoEstudiante || 'S/C'}`,
    `CONCEPTO:${receipt.conceptoCodigo || 'S/C'}`,
    `MONTO:${monto.toFixed(2)}`,
    `OP:${receipt.numeroOperacion || 'N/A'}`,
    `PERIODO:${periodoQr}`,
    `FECHA:${receipt.fechaHora || ''}`
  ].join('|');

  const referenciaVerificacion = `IESTP-SUIZA-${receipt.codigoRecibo || 'S/R'}-${receipt.dni || 'S/D'}`;

  // El modal se teletransporta a <body> (portal). En pantalla se ve
  // igual (fixed + centrado); al imprimir, las reglas de receiptPrint.css
  // ocultan todo lo demás y lo convierten en un documento A4 en flujo.
  return createPortal(
    <div className="receipt-print-portal fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="receipt-modal-card relative w-full max-w-lg max-h-[92vh] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-y-auto animate-fade-in">

        {/* Cabecera del Modal (No se imprime) */}
        <div className="sticky top-0 z-10 p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <CheckCircle2 size={18} />
            </span>
            <div>
              <h4 className="font-bold text-sm text-slate-800">Recibo de Caja Emitido</h4>
              <p className="text-[11px] text-slate-500">Transacción registrada exitosamente en tesorería</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition shadow-sm cursor-pointer"
            >
              <Printer size={14} />
              <span>Imprimir</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* CONTENEDOR DEL COMPROBANTE OFICIAL (Imprimible) */}
        <div ref={printRef} className="receipt-document bg-white text-slate-900 print:m-0">

          {/* ENCABEZADO INSTITUCIONAL */}
          <div className="receipt-section px-6 sm:px-8 pt-6 pb-4 border-b-2 border-slate-900">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-primary-dark text-white font-black text-2xl flex items-center justify-center shadow-md flex-shrink-0 print:shadow-none">
                IS
              </div>
              <div className="flex-1 text-left">
                <h2 className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900 uppercase leading-tight">
                  Instituto de Educación Superior Tecnológico Público "Suiza"
                </h2>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                  RUC: 20172839211 · Jr. Guillermo Sisley N° 450 · Pucallpa, Ucayali
                </p>
                <p className="text-[10px] text-slate-400 leading-snug">
                  IESTP Suiza — Caja y Tesorería
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-t border-slate-200 pt-3">
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 uppercase tracking-wide leading-none">
                  Recibo de Caja
                </h3>
                <p className="text-[10px] text-slate-500 mt-1">
                  Comprobante interno de recaudación de aranceles TUPA
                </p>
              </div>
              <div className="sm:text-right">
                <span className="text-[10px] font-semibold text-slate-400 uppercase block">N° Comprobante</span>
                <span className="font-mono font-black text-slate-900 text-lg leading-none">
                  {receipt.codigoRecibo || 'REC-2026-0000'}
                </span>
              </div>
            </div>
          </div>

          {/* FECHA */}
          <div className="receipt-section px-6 sm:px-8 py-2.5 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-[11px]">
            <span className="text-slate-500 font-semibold uppercase tracking-wider">Fecha y Hora de Emisión</span>
            <span className="font-semibold text-slate-800">{receipt.fechaHora || new Date().toLocaleString()}</span>
          </div>

          {/* DATOS DEL ESTUDIANTE */}
          <div className="receipt-section px-6 sm:px-8 py-4 border-b border-slate-200">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">
              Datos del Estudiante
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
              <div className="flex justify-between sm:justify-start sm:gap-2">
                <span className="text-slate-500 font-medium">Nombres y Apellidos:</span>
                <span className="font-bold text-slate-900 text-right">{receipt.estudianteNombre}</span>
              </div>
              <div className="flex justify-between sm:justify-start sm:gap-2">
                <span className="text-slate-500 font-medium">DNI:</span>
                <span className="font-mono font-semibold text-slate-800">{receipt.dni || '—'}</span>
              </div>
              <div className="flex justify-between sm:justify-start sm:gap-2">
                <span className="text-slate-500 font-medium">Código:</span>
                <span className="font-mono font-semibold text-slate-800">{receipt.codigoEstudiante || '—'}</span>
              </div>
              <div className="flex justify-between sm:justify-start sm:gap-2">
                <span className="text-slate-500 font-medium">Programa:</span>
                <span className="font-semibold text-primary-dark text-right text-[11px]">{receipt.carreraNombre || '—'}</span>
              </div>
            </div>
          </div>

          {/* DETALLE DEL PAGO */}
          <div className="receipt-section px-6 sm:px-8 py-4 border-b border-slate-200">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">
              Detalle del Pago
            </h4>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left font-bold text-slate-500 uppercase text-[9px] tracking-wider py-1.5">Concepto</th>
                  <th className="text-left font-bold text-slate-500 uppercase text-[9px] tracking-wider py-1.5">Método</th>
                  <th className="text-right font-bold text-slate-500 uppercase text-[9px] tracking-wider py-1.5">Importe</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-2 pr-2">
                    <span className="font-bold text-slate-900 block leading-snug">{receipt.conceptoNombre}</span>
                    <span className="text-[10px] text-slate-500">
                      {receipt.conceptoCategoria} · Código: {receipt.conceptoCodigo || '—'}
                    </span>
                  </td>
                  <td className="py-2 pr-2 align-top">
                    <span className="text-slate-800 font-semibold block leading-snug">{receipt.metodoPagoNombre}</span>
                    {receipt.numeroOperacion && (
                      <span className="text-[10px] font-mono text-indigo-700 font-bold">
                        Op: {receipt.numeroOperacion}
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-right align-top font-mono font-bold text-slate-900 whitespace-nowrap">
                    S/ {monto.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="flex flex-wrap items-center justify-between gap-2 mt-3 text-[11px]">
              <div className="flex items-center gap-3">
                <span className="text-slate-500">Estado: <b className="text-emerald-700 uppercase">Pagado</b></span>
                <span className="text-slate-500">Cajero: <b className="text-slate-800">{receipt.cajero || 'Caja Central'}</b></span>
              </div>
              {receipt.observaciones && (
                <span className="text-slate-500 italic">Obs: {receipt.observaciones}</span>
              )}
            </div>
          </div>

          {/* RESUMEN - TOTAL DESTACADO */}
          <div className="receipt-total-band receipt-section px-6 sm:px-8 py-4 bg-slate-900 text-white flex justify-between items-center print:bg-white print:text-slate-900 print:border print:border-slate-300">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block print:text-slate-500">Total Pagado</span>
              <span className="text-[11px] text-slate-300 print:text-slate-500">Moneda Nacional (Soles)</span>
            </div>
            <span className="text-2xl font-black font-mono">
              S/ {monto.toFixed(2)}
            </span>
          </div>

          {receipt.liberaMatricula && (
            <div className="receipt-section px-6 sm:px-8 py-2.5 bg-emerald-50 border-b border-slate-200 flex items-center gap-2 text-[11px] font-semibold text-emerald-800">
              <ShieldCheck size={16} className="text-emerald-600 flex-shrink-0" />
              <span>Candado de matrícula liberado en el sistema académico.</span>
            </div>
          )}

          {/* VERIFICACIÓN - QR INSTITUCIONAL GRANDE */}
          <div className="receipt-section px-6 sm:px-8 py-6 border-b border-slate-200">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">
              Verificación del Comprobante
            </h4>
            <div className="flex flex-col items-center gap-3">
              <div className="receipt-qr-box bg-white p-3 rounded-2xl border border-slate-200 shadow-sm print:shadow-none print:border-slate-300">
                <QRCodeSVG
                  value={qrVerificacion}
                  size={240}
                  level="M"
                  marginSize={2}
                  bgColor="#FFFFFF"
                  fgColor="#000000"
                  className="receipt-qr block w-[200px] h-[200px] sm:w-[240px] sm:h-[240px]"
                />
              </div>
              <p className="text-[10px] text-slate-500 text-center leading-relaxed max-w-[280px]">
                Escanee el código para verificar la autenticidad de este recibo en el portal del IESTP Suiza.
              </p>
              <div className="text-center">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Referencia de Verificación</span>
                <span className="font-mono font-bold text-slate-700 text-[11px]">{referenciaVerificacion}</span>
              </div>
            </div>
          </div>

          {/* PIE DE PÁGINA INSTITUCIONAL */}
          <div className="receipt-section px-6 sm:px-8 py-4 bg-slate-50 border-t border-slate-200">
            <p className="text-[9px] text-slate-400 text-center leading-relaxed">
              IESTP Suiza · Jr. Guillermo Sisley N° 450, Pucallpa, Ucayali · RUC 20172839211<br />
              Documento interno de caja emitido por el sistema SIGA. No constituye comprobante tributario electrónico SUNAT.<br />
              Conservar para trámites internos. Cualquier observación, acudir a Tesorería dentro de los 3 días hábiles.
            </p>
          </div>

        </div>

        {/* Footer Modal (No se imprime) */}
        <div className="sticky bottom-0 p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 print:hidden">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition cursor-pointer"
          >
            Cerrar Ventana
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-xs shadow-md shadow-primary/20 flex items-center gap-2 transition cursor-pointer"
          >
            <Printer size={15} />
            <span>Imprimir Comprobante</span>
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
