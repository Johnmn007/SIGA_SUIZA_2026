import { useState } from 'react';
import { 
  X, 
  Banknote, 
  Building2, 
  QrCode, 
  CreditCard, 
  ShieldCheck, 
  AlertCircle, 
  Check, 
  HelpCircle,
  Receipt,
  User,
  GraduationCap
} from 'lucide-react';
import { TUPA_CONCEPTS, PAYMENT_METHODS, CAREERS_MAP } from './tupaCatalog';
import { API_BASE, apiClient } from '../../core/api/client';

export function PaymentModal({ student, cashierName, onClose, onSuccess }) {
  const [selectedConceptId, setSelectedConceptId] = useState('MAT-01');
  const [selectedMethodId, setSelectedMethodId] = useState('efectivo');
  const [numeroOperacion, setNumeroOperacion] = useState('');
  const [montoEfectivoRecibido, setMontoEfectivoRecibido] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!student) return null;

  const selectedConcept = TUPA_CONCEPTS.find(c => c.id === selectedConceptId) || TUPA_CONCEPTS[0];
  const selectedMethod = PAYMENT_METHODS.find(m => m.id === selectedMethodId) || PAYMENT_METHODS[0];
  const careerName = CAREERS_MAP[student.programa_id] || 'Programa de Estudio General';

  const monto = selectedConcept.monto;
  const efectivoNum = parseFloat(montoEfectivoRecibido) || 0;
  const vuelto = selectedMethodId === 'efectivo' && efectivoNum >= monto ? (efectivoNum - monto).toFixed(2) : '0.00';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validaciones por método
    if (selectedMethodId === 'banco_nacion' && !numeroOperacion.trim()) {
      setError('Por favor ingresa el N° de Operación del voucher del Banco de la Nación.');
      return;
    }
    if (selectedMethodId === 'yape_plin' && !numeroOperacion.trim()) {
      setError('Por favor ingresa el código de aprobación o referencia de Yape/Plin.');
      return;
    }
    if (selectedMethodId === 'tarjeta_pos' && !numeroOperacion.trim()) {
      setError('Por favor ingresa el N° de referencia o lote de la transacción POS.');
      return;
    }
    if (selectedMethodId === 'efectivo' && montoEfectivoRecibido && efectivoNum < monto) {
      setError(`El monto recibido en efectivo (S/ ${efectivoNum.toFixed(2)}) es menor al monto a cobrar (S/ ${monto.toFixed(2)}).`);
      return;
    }

    setLoading(true);

    try {
      // Si el concepto libera matrícula, actualizamos en el backend
      if (selectedConcept.liberaMatricula) {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/api/mod-gestion-academica/estudiantes/${student.id}/pago_matricula?pagado=true`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!res.ok) {
          throw new Error('No se pudo actualizar el estado de matrícula del estudiante en el servidor.');
        }
      }

      // Generar código de recibo correlativo único
      const randomSeq = Math.floor(10000 + Math.random() * 90000);
      const codigoRecibo = `REC-2026-${randomSeq}`;

      const receiptPayload = {
        id: Date.now(),
        codigoRecibo,
        estudianteId: student.id,
        estudianteNombre: `${student.nombres} ${student.apellidos}`,
        dni: student.dni,
        codigoEstudiante: student.codigo_estudiante,
        carreraNombre: careerName,
        conceptoId: selectedConcept.id,
        conceptoCodigo: selectedConcept.codigo,
        conceptoNombre: selectedConcept.nombre,
        conceptoCategoria: selectedConcept.categoria,
        monto: selectedConcept.monto,
        metodoPagoId: selectedMethod.id,
        metodoPagoNombre: selectedMethod.nombre,
        numeroOperacion: numeroOperacion.trim() || (selectedMethodId === 'efectivo' ? 'PAGO EN VENTANILLA' : ''),
        cajero: cashierName || 'Caja Central',
        fechaHora: new Date().toLocaleString(),
        timestamp: Date.now(),
        liberaMatricula: selectedConcept.liberaMatricula,
        observaciones: observaciones.trim()
      };

      onSuccess(receiptPayload);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error al procesar la recaudación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-fade-in">
        
        {/* Cabecera del Modal */}
        <div className="p-6 bg-gradient-to-r from-[#071329] via-[#0A2552] to-[#00388F] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-cyan-300">
              <Receipt size={22} />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white">Ventanilla de Recaudación y Caja</h3>
              <p className="text-xs text-blue-200/80">Cobro oficial de aranceles TUPA e informe de pago</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-blue-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle size={18} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Tarjeta Resumen del Estudiante */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-black text-sm text-slate-900">{student.nombres} {student.apellidos}</span>
                <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-bold text-slate-600 font-mono">
                  DNI: {student.dni}
                </span>
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-2">
                <GraduationCap size={14} className="text-primary" />
                <span>{careerName}</span>
                <span>•</span>
                <span className="font-mono">{student.codigo_estudiante}</span>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                student.pago_matricula 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                <span className={`w-2 h-2 rounded-full ${student.pago_matricula ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                {student.pago_matricula ? 'Habilitado' : 'Deuda de Matrícula'}
              </span>
            </div>
          </div>

          {/* 1. Selección de Concepto TUPA */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              1. Selecciona el Concepto Arancelario (TUPA 2026)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 border border-slate-200 rounded-2xl bg-slate-50/50">
              {TUPA_CONCEPTS.map(c => {
                const isSelected = c.id === selectedConceptId;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedConceptId(c.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex justify-between items-center ${
                      isSelected 
                        ? 'bg-white border-primary shadow-md ring-2 ring-primary/20' 
                        : 'bg-white/80 border-slate-200 hover:border-slate-300 hover:bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800 line-clamp-1">{c.nombre}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">{c.categoria}</span>
                      {c.liberaMatricula && (
                        <span className="block text-[10px] font-bold text-emerald-600 mt-0.5">
                          ✓ Habilita Matrícula
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-extrabold text-primary-dark font-mono ml-2">
                      S/ {c.monto.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Selección de Método de Pago */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              2. Método de Pago
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PAYMENT_METHODS.map(m => {
                const isSelected = m.id === selectedMethodId;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => { setSelectedMethodId(m.id); setNumeroOperacion(''); }}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                      isSelected
                        ? 'bg-primary text-white border-primary shadow-md'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {m.id === 'efectivo' && <Banknote size={20} />}
                    {m.id === 'banco_nacion' && <Building2 size={20} />}
                    {m.id === 'yape_plin' && <QrCode size={20} />}
                    {m.id === 'tarjeta_pos' && <CreditCard size={20} />}
                    <span className="text-xs font-bold leading-tight">{m.nombre.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Campos condicionales por método */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            {selectedMethodId === 'efectivo' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Monto Recibido en Efectivo (S/)
                  </label>
                  <input
                    type="number"
                    step="0.10"
                    placeholder={`Mínimo S/ ${monto.toFixed(2)}`}
                    value={montoEfectivoRecibido}
                    onChange={(e) => setMontoEfectivoRecibido(e.target.value)}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm font-mono font-bold"
                  />
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Vuelto a Entregar:</span>
                  <span className="text-xl font-black text-emerald-600 font-mono">S/ {vuelto}</span>
                </div>
              </div>
            )}

            {selectedMethodId === 'banco_nacion' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">N° de Operación del Voucher BN</label>
                  <span className="text-[10px] text-slate-400">Cta: 00-521-029481</span>
                </div>
                <input
                  type="text"
                  placeholder="Ej. 0849201"
                  value={numeroOperacion}
                  onChange={(e) => setNumeroOperacion(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm font-mono font-bold"
                  required
                />
              </div>
            )}

            {selectedMethodId === 'yape_plin' && (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-24 h-24 bg-white p-2 rounded-xl border border-slate-200 flex flex-col items-center justify-center flex-shrink-0">
                  <QrCode size={56} className="text-purple-700" />
                  <span className="text-[9px] font-extrabold text-purple-700">YAPE / PLIN</span>
                </div>
                <div className="flex-1 w-full space-y-2">
                  <div className="text-xs text-slate-600">
                    <span className="font-bold text-slate-800">Número oficial: </span> 
                    <span className="font-mono font-bold text-purple-700">961-824-192</span> (IESTP Suiza)
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Código de Aprobación Yape</label>
                    <input
                      type="text"
                      placeholder="Ej. YP-948102"
                      value={numeroOperacion}
                      onChange={(e) => setNumeroOperacion(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm font-mono font-bold"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedMethodId === 'tarjeta_pos' && (
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">N° de Referencia / Lote POS</label>
                <input
                  type="text"
                  placeholder="Ej. REF-481920"
                  value={numeroOperacion}
                  onChange={(e) => setNumeroOperacion(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm font-mono font-bold"
                  required
                />
              </div>
            )}
          </div>

          {/* Resumen Total y Acciones */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200">
            <div>
              <span className="text-xs text-slate-400 block font-medium">Total a Cobrar</span>
              <span className="text-2xl font-black text-slate-900 font-mono">
                S/ {monto.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-5 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={loading}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 hover:shadow-emerald-600/50 hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ShieldCheck size={16} />
                )}
                <span>Registrar Pago y Emitir Recibo</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
}
