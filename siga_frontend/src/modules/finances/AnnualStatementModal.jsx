import { useMemo, useRef } from 'react';
import { X, Printer, FileText } from 'lucide-react';
import { ModalPortal } from './ModalPortal';
import { CAREERS_MAP } from './tupaCatalog';
import { buildStatementHtml, printIframe } from './lib/printTemplates';

// statement: estado de cuenta devuelto por el servidor ({ estudiante, movimientos, token, qrContenido, ... })
export function AnnualStatementModal({ statement, onClose }) {
  const frameRef = useRef(null);
  const student = statement?.estudiante;
  const careerName = student ? CAREERS_MAP[student.programa_id] || 'Programa de Estudio General' : '';
  const html = useMemo(
    () => (statement ? buildStatementHtml({
      student,
      payments: statement.movimientos,
      careerName,
      token: statement.token,
      qrContent: statement.qrContenido,
      emitted: statement.emitido,
    }) : ''),
    [statement, student, careerName]
  );

  if (!statement) return null;

  const handlePrint = () => printIframe(frameRef.current);

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-fade-in">

          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-blue-100 text-primary">
                <FileText size={18} />
              </span>
              <div>
                <h4 className="font-bold text-sm text-slate-800">Estado de Cuenta y Pagos Anuales</h4>
                <p className="text-[11px] text-slate-500">{student.nombres} {student.apellidos} · DNI {student.dni}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Vista previa: es el mismo documento que se imprime */}
          <iframe
            ref={frameRef}
            title={`Estado de cuenta ${student.dni}`}
            srcDoc={html}
            className="w-full h-[72vh] bg-slate-200 border-0 block"
          />

          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-2">
            <span className="text-[11px] text-slate-500">Formato A4 · Para PDF elige “Guardar como PDF” en el diálogo de impresión.</span>
            <div className="flex gap-2">
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
                <span>Imprimir Estado de Cuenta</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </ModalPortal>
  );
}
