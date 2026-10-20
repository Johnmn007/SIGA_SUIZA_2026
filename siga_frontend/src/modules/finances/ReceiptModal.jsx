import { useRef } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  CheckCircle2, 
  Building2, 
  QrCode, 
  ShieldCheck,
  Calendar,
  User,
  CreditCard,
  FileText
} from 'lucide-react';

export function ReceiptModal({ receipt, onClose }) {
  const printRef = useRef(null);

  if (!receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Generar archivo de texto legible o disparar impresión para guardar como PDF
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-fade-in">
        
        {/* Cabecera del Modal (No se imprime) */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between print:hidden">
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
        <div ref={printRef} className="p-6 sm:p-8 bg-white text-slate-900 print:p-0 print:m-0">
          
          {/* Encabezado Institucional */}
          <div className="text-center pb-4 border-b-2 border-dashed border-slate-200">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary-dark text-white font-black text-lg mb-2 shadow-md">
              IS
            </div>
            <h2 className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900 uppercase">
              IESTP SUIZA
            </h2>
            <p className="text-[11px] font-semibold text-slate-600">
              Instituto de Educación Superior Tecnológico Público "Suiza"
            </p>
            <p className="text-[10px] text-slate-400">
              RUC: 20172839211 · Jr. Guillermo Sisley N° 450 · Pucallpa, Ucayali
            </p>
            <div className="mt-2 inline-block px-3 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-widest">
              Recibo de Caja Electrónico
            </div>
          </div>

          {/* Folio y Fecha */}
          <div className="grid grid-cols-2 gap-3 py-3 border-b border-slate-100 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] font-semibold uppercase">N° Comprobante:</span>
              <span className="font-mono font-bold text-slate-800 text-sm">{receipt.codigoRecibo || 'REC-2026-0000'}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block text-[10px] font-semibold uppercase">Fecha y Hora:</span>
              <span className="font-medium text-slate-700">{receipt.fechaHora || new Date().toLocaleString()}</span>
            </div>
          </div>

          {/* Datos del Estudiante */}
          <div className="py-3.5 border-b border-slate-100 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Estudiante:</span>
              <span className="font-bold text-slate-900 text-right">{receipt.estudianteNombre}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">DNI / Documento:</span>
              <span className="font-mono font-semibold text-slate-800">{receipt.dni}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Código Alumno:</span>
              <span className="font-mono font-semibold text-slate-800">{receipt.codigoEstudiante}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Programa de Estudio:</span>
              <span className="font-semibold text-primary-dark text-right text-[11px]">{receipt.carreraNombre}</span>
            </div>
          </div>

          {/* Detalle del Concepto Cobrado */}
          <div className="py-4 border-b-2 border-dashed border-slate-200">
            <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider pb-2 border-b border-slate-100">
              <span>Concepto TUPA</span>
              <span>Total</span>
            </div>
            <div className="flex justify-between items-start py-2.5 text-xs">
              <div>
                <span className="font-bold text-slate-900 block">{receipt.conceptoNombre}</span>
                <span className="text-[10px] text-slate-500 block">{receipt.conceptoCategoria} · Código: {receipt.conceptoCodigo}</span>
              </div>
              <span className="font-bold text-sm text-slate-900 font-mono">
                S/ {parseFloat(receipt.monto).toFixed(2)}
              </span>
            </div>

            {/* Total General */}
            <div className="mt-3 pt-3 bg-slate-50 rounded-xl p-3 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Pagado:</span>
                <span className="text-[11px] font-medium text-slate-500">Moneda Nacional (Soles)</span>
              </div>
              <div className="text-xl font-extrabold text-primary-dark font-mono">
                S/ {parseFloat(receipt.monto).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Método de Pago y Transacción */}
          <div className="py-3 border-b border-slate-100 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Forma de Pago:</span>
              <span className="font-bold text-slate-800">{receipt.metodoPagoNombre}</span>
            </div>
            {receipt.numeroOperacion && (
              <div className="flex justify-between">
                <span className="text-slate-500">N° de Operación / Ref:</span>
                <span className="font-mono font-bold text-indigo-700">{receipt.numeroOperacion}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Cajero Responsable:</span>
              <span className="font-medium text-slate-700">{receipt.cajero || 'Caja Central'}</span>
            </div>
            {receipt.liberaMatricula && (
              <div className="mt-2 p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2 text-[11px] font-semibold">
                <ShieldCheck size={16} className="text-emerald-600 flex-shrink-0" />
                <span>Candado de Matrícula liberado en el sistema académico.</span>
              </div>
            )}
          </div>

          {/* Sello y Código QR */}
          <div className="pt-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 p-1 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                <QrCode size={48} className="text-slate-800" />
              </div>
              <div className="text-[10px] text-slate-400 leading-tight">
                <span className="font-bold text-slate-600 block">Validez Institucional</span>
                Escanea para verificar la autenticidad del recibo en el portal del IESTP Suiza.
              </div>
            </div>

            {/* Sello de Pagado */}
            <div className="border-2 border-emerald-600 rounded-xl px-3 py-1.5 text-center rotate-[-6deg] opacity-90">
              <span className="block text-[11px] font-black text-emerald-700 uppercase tracking-widest leading-none">PAGADO</span>
              <span className="text-[8px] font-bold text-emerald-600 tracking-wider">CONFORME</span>
            </div>
          </div>

        </div>

        {/* Footer Modal (No se imprime) */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 print:hidden">
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
    </div>
  );
}
