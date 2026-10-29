import { useEffect, useRef } from 'react';
import {
  X,
  Printer,
  Plus,
  Banknote,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  UserCheck,
  GraduationCap
} from 'lucide-react';
import { CAREERS_MAP } from './tupaCatalog';
import { ModalPortal } from './ModalPortal';

/**
 * Modal "Pagos del Año" (estado de cuenta del estudiante leído de la base de datos).
 *
 * - Centrado, overlay oscurecido, scroll interno (90vh) y cierre por
 *   Escape / clic fuera (bloqueado mientras otro modal esté encima).
 * - z-50 en portal: queda sobre la barra superior del sistema, y PaymentModal / ReceiptModal /
 *   AnnualStatementModal (también z-50, montados después) se apilan encima.
 */
export function StudentPaymentsModal({
  student,
  payments = [],
  habilitado = false,
  loading = false,
  blocked = false,
  onClose,
  onPay,
  onCharge,
  onPrintStatement,
  onViewReceipt
}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !blocked) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [blocked, onClose]);

  useEffect(() => {
    if (dialogRef.current) dialogRef.current.focus();
  }, []);

  if (!student) return null;

  const careerName = CAREERS_MAP[student.programa_id] || 'Programa de Estudio General';
  const pagados = payments.filter(p => p.estado === 'PAGADO');
  const totalPagado = pagados.reduce((acc, p) => acc + (parseFloat(p.monto) || 0), 0);
  const totalPendiente = payments
    .filter(p => p.estado === 'PENDIENTE')
    .reduce((acc, p) => acc + (parseFloat(p.monto) || 0), 0);

  const estadoBadge = habilitado ? '✓ Habilitado Financieramente' : '⚠ Bloqueo de Matrícula Activo';

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in"
        role="dialog"
        aria-modal="true"
        aria-label="Pagos del Año"
      >
        {/* Overlay (clic fuera para cerrar) */}
        <div
          className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
          onClick={() => { if (!blocked) onClose(); }}
        />

        <div
          ref={dialogRef}
          tabIndex={-1}
          className="relative w-full max-w-6xl h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col outline-none"
        >

          {/* ENCABEZADO FIJO */}
          <div className="flex items-center justify-between gap-4 px-5 sm:px-7 py-4 border-b border-slate-200 bg-white rounded-t-3xl flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-primary-dark text-white flex items-center justify-center shadow-md shadow-primary/20 flex-shrink-0">
                <UserCheck size={20} />
              </div>
              <div className="min-w-0">
                <h3 className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight leading-tight">
                  Pagos del Año
                </h3>
                <p className="text-[11px] text-slate-500 truncate">
                  <span className="font-bold text-slate-700">{student.nombres} {student.apellidos}</span>
                  {' · '}
                  <span className={habilitado ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                    {estadoBadge}
                  </span>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer flex-shrink-0"
              title="Cerrar"
            >
              <X size={18} />
            </button>
          </div>

          {/* CONTENIDO CON SCROLL INTERNO */}
          <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-6 space-y-6">

            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-dark text-white font-extrabold text-xl flex items-center justify-center shadow-lg shadow-primary/20 flex-shrink-0">
                <UserCheck size={28} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-primary-dark font-mono font-bold text-xs border border-blue-200">
                    DNI: {student.dni}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono font-bold text-xs border border-slate-200">
                    CÓDIGO: {student.codigo_estudiante}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    habilitado
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {estadoBadge}
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {student.nombres} {student.apellidos}
                </h2>

                <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-1 flex items-center gap-2">
                  <GraduationCap size={16} className="text-primary" />
                  <span>{careerName}</span>
                  <span>•</span>
                  <span>Modalidad: {student.modalidad_admision || 'ORDINARIO'}</span>
                </p>
              </div>
            </div>

            {/* 3 tarjetas de resumen */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block mb-1">Total Pagado en el Año 2026:</span>
                <div className="text-2xl font-black text-emerald-800 font-mono">
                  S/ {totalPagado.toFixed(2)}
                </div>
                <span className="text-[11px] text-emerald-600">Abonos verificados en tesorería</span>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block mb-1">Deuda / Saldo Pendiente:</span>
                <div className="text-2xl font-black text-amber-800 font-mono">
                  S/ {totalPendiente.toFixed(2)}
                </div>
                <span className="text-[11px] text-amber-600">
                  {habilitado ? 'Sin deudas pendientes' : 'Pendiente matrícula regular'}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Comprobantes Oficiales:</span>
                <div className="text-2xl font-black text-slate-800">
                  {pagados.length} Recibos
                </div>
                <span className="text-[11px] text-slate-500">Historial de recibos emitidos</span>
              </div>
            </div>

            {/* HISTORIAL DE PAGOS DEL AÑO */}
            <div>
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Receipt size={16} className="text-primary" />
                <span>Historial de Pagos Realizados durante Todo el Año 2026</span>
              </h4>

              {/* En pantallas pequeñas la tabla scrollea horizontalmente sin cortar columnas */}
              <div className="border border-slate-200 rounded-2xl shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[760px]">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-3 px-4">Fecha</th>
                        <th className="py-3 px-4">N° Comprobante</th>
                        <th className="py-3 px-4">Concepto Arancelario / TUPA</th>
                        <th className="py-3 px-4">Forma de Pago / Ref.</th>
                        <th className="py-3 px-4 text-center">Estado</th>
                        <th className="py-3 px-4 text-right">Monto</th>
                        <th className="py-3 px-4 text-center">Boleta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loading && (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400">
                            <span className="inline-block w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin align-middle mr-2" />
                            Cargando estado de cuenta desde la base de datos...
                          </td>
                        </tr>
                      )}
                      {!loading && payments.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400">
                            Sin movimientos registrados en el año.
                          </td>
                        </tr>
                      )}
                      {payments.map(p => {
                        const isPaid = p.estado === 'PAGADO';
                        return (
                          <tr key={p.id} className={isPaid ? 'hover:bg-slate-50/70 transition' : 'bg-amber-50/40'}>
                            <td className="py-3.5 px-4 font-semibold text-slate-700 whitespace-nowrap">
                              {p.fechaHora ? String(p.fechaHora).split(',')[0] : '2026'}
                            </td>
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                              {p.codigoRecibo}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-extrabold text-slate-900 block">{p.conceptoNombre}</span>
                              <span className="text-[10px] text-slate-400 font-medium">{p.conceptoCategoria}</span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-600">
                              <span className="font-semibold block">{p.metodoPagoNombre}</span>
                              {p.numeroOperacion && p.numeroOperacion !== '-' && (
                                <span className="text-[10px] font-mono text-indigo-700 block">{p.numeroOperacion}</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                isPaid
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                                {isPaid ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
                                <span>{p.estado}</span>
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-black text-sm text-slate-900">
                              S/ {parseFloat(p.monto).toFixed(2)}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {isPaid ? (
                                <button
                                  onClick={() => onViewReceipt(p)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-primary hover:text-white text-slate-700 font-bold text-xs transition cursor-pointer"
                                  title="Ver e imprimir boleta oficial"
                                >
                                  <Printer size={13} />
                                  <span>Boleta</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => onCharge(p.conceptoId || null)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer"
                                >
                                  <Banknote size={13} />
                                  <span>Cobrar</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>

          {/* PIE FIJO CON ACCIONES */}
          <div className="flex flex-wrap items-center justify-end gap-2.5 px-5 sm:px-7 py-4 border-t border-slate-200 bg-slate-50 rounded-b-3xl flex-shrink-0">
            <button
              onClick={onPay}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition cursor-pointer"
            >
              <Plus size={16} />
              <span>Registrar Nuevo Pago TUPA</span>
            </button>

            <button
              onClick={onPrintStatement}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-primary hover:bg-primary-dark text-white font-bold text-xs shadow-md shadow-primary/25 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer size={15} />
              <span>Imprimir Estado de Cuenta Anual</span>
            </button>
          </div>

        </div>
      </div>
    </ModalPortal>
  );
}
