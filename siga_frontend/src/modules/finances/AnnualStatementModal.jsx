import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Printer, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  QrCode, 
  ShieldCheck, 
  GraduationCap, 
  FileText,
  Building2,
  Calendar
} from 'lucide-react';
import { CAREERS_MAP } from './tupaCatalog';
import './receiptPrint.css';

export function AnnualStatementModal({ student, payments, onClose }) {
  // La clase `statement-printing` en <body> activa receiptPrint.css
  // (sección IMPRESIÓN DEL ESTADO DE CUENTA): oculta el resto del
  // sistema y convierte el portal en flujo normal de documento,
  // para imprimir exclusivamente el estado de cuenta.
  // Se añade/quita durante el ciclo de impresión: beforeprint → afterprint.
  useEffect(() => {
    const body = document.body;
    const handleBeforePrint = () => body.classList.add('statement-printing');
    const handleAfterPrint = () => body.classList.remove('statement-printing');

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
      body.classList.remove('statement-printing');
    };
  }, []);

  if (!student) return null;

  const careerName = CAREERS_MAP[student.programa_id] || 'Programa de Estudio General';
  
  // Calcular totales
  const totalPagado = payments
    .filter(p => p.estado === 'PAGADO')
    .reduce((acc, p) => acc + (parseFloat(p.monto) || 0), 0);

  const totalPendiente = payments
    .filter(p => p.estado === 'PENDIENTE')
    .reduce((acc, p) => acc + (parseFloat(p.monto) || 0), 0);

  const handlePrint = () => {
    document.body.classList.add('statement-printing');
    window.print();
    // Fallback por si el navegador no dispara afterprint.
    setTimeout(() => document.body.classList.remove('statement-printing'), 1500);
  };

  return createPortal(
    <div className="statement-print-portal fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="statement-modal-card relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-fade-in">
        
        {/* Cabecera del Modal (No se imprime) */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-100 text-primary">
              <FileText size={18} />
            </span>
            <div>
              <h4 className="font-bold text-sm text-slate-800">Estado de Cuenta y Pagos Anuales</h4>
              <p className="text-[11px] text-slate-500">Historial consolidado de pagos del año fiscal 2026</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition shadow-sm cursor-pointer"
            >
              <Printer size={14} />
              <span>Imprimir Estado de Cuenta</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* CONTENEDOR DEL ESTADO DE CUENTA (Imprimible) */}
        <div className="statement-document p-6 sm:p-8 bg-white text-slate-900 print:p-0 print:m-0 space-y-6">
          
          {/* Membrete Oficial */}
          <div className="statement-section flex justify-between items-start pb-4 border-b-2 border-slate-900">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary-dark text-white font-black text-lg flex items-center justify-center shadow-md">
                IS
              </div>
              <div>
                <h2 className="font-black text-base sm:text-lg tracking-tight text-slate-900 uppercase">
                  IESTP SUIZA
                </h2>
                <p className="text-xs font-bold text-slate-700">
                  Instituto de Educación Superior Tecnológico Público "Suiza"
                </p>
                <p className="text-[10px] text-slate-500">
                  RUC: 20172839211 · Jr. Guillermo Sisley N° 450 · Pucallpa, Ucayali
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-block px-3 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                EJERCICIO FISCAL 2026
              </span>
              <p className="text-[10px] text-slate-400 mt-1">
                Fecha de Emisión: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          {/* Título */}
          <div className="statement-section text-center py-1">
            <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">
              ESTADO DE CUENTA Y CONSTANCIA ANUAL DE PAGOS
            </h3>
            <p className="text-xs text-slate-500">
              Registro oficial de obligaciones económicas y aranceles cancelados durante el año lectivo
            </p>
          </div>

          {/* Datos del Estudiante */}
          <div className="statement-section p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] font-bold uppercase">Nombres y Apellidos Completos:</span>
              <span className="font-extrabold text-slate-900 text-sm">{student.nombres} {student.apellidos}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] font-bold uppercase">Programa de Estudio:</span>
              <span className="font-bold text-primary-dark text-sm">{careerName}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] font-bold uppercase">DNI / Documento de Identidad:</span>
              <span className="font-mono font-bold text-slate-800 text-sm">{student.dni}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] font-bold uppercase">Código Institucional:</span>
              <span className="font-mono font-bold text-slate-800 text-sm">{student.codigo_estudiante}</span>
            </div>
          </div>

          {/* Tabla de Pagos Realizados durante Todo el Año */}
          <div className="statement-section">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
              Detalle de Pagos y Obligaciones del Año 2026
            </h4>
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-3">Fecha</th>
                    <th className="py-3 px-3">N° Comprobante</th>
                    <th className="py-3 px-3">Concepto TUPA / Descripción</th>
                    <th className="py-3 px-3">Forma de Pago / Ref.</th>
                    <th className="py-3 px-3 text-center">Estado</th>
                    <th className="py-3 px-3 text-right">Monto (S/)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map(p => {
                    const isPaid = p.estado === 'PAGADO';
                    return (
                      <tr key={p.id} className={isPaid ? 'hover:bg-slate-50/60' : 'bg-amber-50/30'}>
                        <td className="py-3 px-3 font-medium text-slate-700 whitespace-nowrap">
                          {p.fechaHora ? String(p.fechaHora).split(',')[0] : '2026'}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-800">
                          {p.codigoRecibo}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-slate-900 block">{p.conceptoNombre}</span>
                          <span className="text-[10px] text-slate-400">{p.conceptoCategoria}</span>
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          <span className="font-medium block">{p.metodoPagoNombre}</span>
                          {p.numeroOperacion && p.numeroOperacion !== '-' && (
                            <span className="text-[10px] font-mono text-indigo-700 block">{p.numeroOperacion}</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            isPaid
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {isPaid ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                            <span>{p.estado}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 text-sm">
                          S/ {parseFloat(p.monto).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Resumen de Balances */}
          <div className="statement-section grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-right">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Total Pagado en el Año:</span>
              <span className="text-xl font-black text-emerald-800 font-mono">S/ {totalPagado.toFixed(2)}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-right">
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Saldo Pendiente:</span>
              <span className="text-xl font-black text-amber-800 font-mono">S/ {totalPendiente.toFixed(2)}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200 text-right">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Condición Financiera:</span>
              <span className={`text-sm font-extrabold uppercase ${totalPendiente === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                {totalPendiente === 0 ? '✓ HABILITADO / AL DÍA' : '⚠ PENDIENTE DE MATRÍCULA'}
              </span>
            </div>
          </div>

          {/* Sellos de Validación */}
          <div className="statement-section pt-4 flex items-center justify-between border-t border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 p-1 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                <QrCode size={48} className="text-slate-800" />
              </div>
              <div className="text-[10px] text-slate-400 leading-tight">
                <span className="font-bold text-slate-700 block">Autenticación Digital</span>
                Documento emitido por el Sistema Integrado de Gestión Académica (SIGA).
                <span className="block text-slate-400 font-mono text-[9px] mt-0.5">Hash: {String(student.dni).padStart(12, '0')}-2026-VAL</span>
              </div>
            </div>

            <div className="text-center">
              <div className="w-40 border-b border-slate-400 mb-1" />
              <span className="text-[10px] font-bold text-slate-700 block uppercase">TESORERÍA Y CAJA</span>
              <span className="text-[9px] text-slate-400 block">IESTP SUIZA · PUCALLPA</span>
            </div>
          </div>

        </div>

        {/* Footer del Modal (No se imprime) */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 print:hidden">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition cursor-pointer"
          >
            Cerrar
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-xs shadow-md shadow-primary/20 flex items-center gap-2 transition cursor-pointer"
          >
            <Printer size={15} />
            <span>Imprimir Estado de Cuenta Completo</span>
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
