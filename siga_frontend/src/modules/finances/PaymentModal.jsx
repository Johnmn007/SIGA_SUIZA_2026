import { useState, useMemo, useRef } from 'react';
import {
  X,
  Banknote,
  Building2,
  QrCode,
  CreditCard,
  ShieldCheck,
  AlertCircle,
  Receipt,
  GraduationCap,
  Plus,
  Pencil,
  Trash2,
  Search,
  CheckCircle2,
  EyeOff,
} from 'lucide-react';
import { PAYMENT_METHODS, CAREERS_MAP, getAvailableConcepts } from './tupaCatalog';
import { ConceptFormModal } from './ConceptFormModal';
import { ModalPortal } from './ModalPortal';
import { QrCodeView } from './QrCodeView';
import { buildPaymentRequestQrPayload } from './lib/paymentUtils';
import { tesoreriaApi } from './lib/tesoreriaApi';

export function PaymentModal({
  student,
  cashierName,
  catalog,
  studentPayments,
  initialConceptId,
  cajaConfig,
  onSaveConcept,
  onDeleteConcept,
  onClose,
  onSuccess,
}) {
  const { available, hidden } = useMemo(
    () => getAvailableConcepts(catalog, student, studentPayments),
    [catalog, student, studentPayments]
  );
  // Deuda de matrícula (base de datos) sin ningún concepto del tarifario que la pueda cancelar
  const sinConceptoMatricula = !student?.pago_matricula && !catalog.some(c => c.liberaMatricula);

  const [selectedConceptId, setSelectedConceptId] = useState(() =>
    (available.find(c => c.id === initialConceptId) || available[0])?.id || null
  );
  const [selectedTarifaId, setSelectedTarifaId] = useState(null);
  const [montoLibre, setMontoLibre] = useState('');
  const [conceptQuery, setConceptQuery] = useState('');
  const [selectedMethodId, setSelectedMethodId] = useState('efectivo');
  const [numeroOperacion, setNumeroOperacion] = useState('');
  const [montoEfectivoRecibido, setMontoEfectivoRecibido] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [editingConcept, setEditingConcept] = useState(null); // null | 'new' | concepto
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Evita un segundo cobro por doble clic antes de que el botón se deshabilite
  const submitLockRef = useRef(false);

  if (!student) return null;

  const selectedConcept = available.find(c => c.id === selectedConceptId) || available[0] || null;
  const selectedTarifa = selectedConcept
    ? selectedConcept.tarifas.find(t => t.id === selectedTarifaId) || selectedConcept.tarifas[0]
    : null;
  const careerName = CAREERS_MAP[student.programa_id] || 'Programa de Estudio General';

  const isLibre = selectedConcept?.tipoPrecio === 'libre';
  const monto = !selectedConcept
    ? 0
    : isLibre
      ? (montoLibre === '' ? selectedConcept.monto : parseFloat(montoLibre) || 0)
      : selectedTarifa.monto;
  const efectivoNum = parseFloat(montoEfectivoRecibido) || 0;
  const vuelto = selectedMethodId === 'efectivo' && efectivoNum >= monto ? (efectivoNum - monto).toFixed(2) : '0.00';

  const q = conceptQuery.toLowerCase().trim();
  const visibleConcepts = available.filter(c => !q || c.nombre.toLowerCase().includes(q) || c.codigo.toLowerCase().includes(q) || c.categoria.toLowerCase().includes(q));

  const selectConcept = (id) => {
    setSelectedConceptId(id);
    setSelectedTarifaId(null);
    setMontoLibre('');
  };

  const handleDeleteConcept = async (concept) => {
    if (!window.confirm(`¿Eliminar "${concept.codigo} · ${concept.nombre}" del tarifario TUPA?\n\nLos recibos ya emitidos se conservan.`)) return;
    try {
      await onDeleteConcept(concept.id);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitLockRef.current) return;
    setError('');

    if (!selectedConcept) {
      setError('No hay un concepto seleccionado para cobrar.');
      return;
    }
    if (isLibre && (monto <= 0 || monto < selectedConcept.montoMinimo)) {
      setError(`Ingresa un monto válido${selectedConcept.montoMinimo > 0 ? ` (mínimo S/ ${selectedConcept.montoMinimo.toFixed(2)})` : ''}.`);
      return;
    }
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

    submitLockRef.current = true;
    setLoading(true);

    try {
      // El servidor asigna el correlativo, valida el monto y, si corresponde, libera la matrícula
      const result = await tesoreriaApi.registrarPago({
        estudianteId: student.id,
        conceptoId: selectedConcept.id,
        tarifaId: selectedConcept.tipoPrecio === 'tarifas' ? selectedTarifa.id : null,
        monto: isLibre ? Math.round(monto * 100) / 100 : null,
        metodoPagoId: selectedMethodId,
        numeroOperacion: numeroOperacion.trim(),
        cajero: cashierName || 'Caja Central',
        carreraNombre: careerName,
        observaciones: observaciones.trim(),
      });
      onSuccess(result);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error al procesar la recaudación. Verifique la conexión e inténtelo nuevamente.');
    } finally {
      submitLockRef.current = false;
      setLoading(false);
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-fade-in">

          {/* Cabecera del Modal */}
          <div className="p-6 bg-gradient-to-r from-[#071329] via-[#0A2552] to-[#00388F] text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-cyan-300">
                <Receipt size={22} />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-white">Ventanilla de Recaudación y Caja</h3>
                <p className="text-xs text-blue-200/80">Cobro oficial de aranceles TUPA y emisión de recibo con QR</p>
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  1. Selecciona el Concepto Arancelario (TUPA 2026)
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      value={conceptQuery}
                      onChange={(e) => setConceptQuery(e.target.value)}
                      placeholder="Buscar..."
                      className="w-32 pl-7 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingConcept('new')}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer"
                  >
                    <Plus size={13} /> Agregar
                  </button>
                </div>
              </div>

              {sinConceptoMatricula && (
                <div className="mb-2 p-3 rounded-2xl border border-amber-300 bg-amber-50 text-amber-800 text-xs flex items-start gap-2">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  <span>
                    <b>El alumno tiene deuda de matrícula, pero ningún concepto del tarifario la habilita.</b> Edita el concepto de
                    matrícula (o agrega uno) y marca <b>“Habilita la matrícula”</b> para poder cobrarla y liberar el bloqueo.
                  </span>
                </div>
              )}

              {available.length === 0 ? (
                <div className="p-6 rounded-2xl border border-emerald-200 bg-emerald-50 text-center">
                  <CheckCircle2 size={28} className="mx-auto text-emerald-600 mb-1" />
                  <p className="text-sm font-bold text-emerald-800">No hay conceptos pendientes de cobro para este alumno.</p>
                  <p className="text-xs text-emerald-700 mt-0.5">Agrega un nuevo concepto si necesitas registrar otro cobro.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1 border border-slate-200 rounded-2xl bg-slate-50/50">
                  {visibleConcepts.length === 0 && (
                    <p className="sm:col-span-2 py-6 text-center text-xs text-slate-400">Sin coincidencias para “{conceptQuery}”.</p>
                  )}
                  {visibleConcepts.map(c => {
                    const isSelected = c.id === selectedConcept?.id;
                    return (
                      <div
                        key={c.id}
                        onClick={() => selectConcept(c.id)}
                        className={`group relative p-3 rounded-xl border transition-all cursor-pointer flex justify-between items-center gap-2 ${
                          isSelected
                            ? 'bg-white border-primary shadow-md ring-2 ring-primary/20'
                            : 'bg-white/80 border-slate-200 hover:border-slate-300 hover:bg-white'
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-800 line-clamp-1">{c.nombre}</span>
                          <span className="text-[10px] text-slate-400 font-medium">{c.codigo} · {c.categoria}</span>
                          {c.liberaMatricula && (
                            <span className="block text-[10px] font-bold text-emerald-600 mt-0.5">✓ Habilita Matrícula</span>
                          )}
                          {c.tipoPrecio === 'tarifas' && (
                            <span className="block text-[10px] font-bold text-purple-600 mt-0.5">{c.tarifas.length} tarifas</span>
                          )}
                          {c.tipoPrecio === 'libre' && (
                            <span className="block text-[10px] font-bold text-amber-600 mt-0.5">Monto libre</span>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className="text-sm font-extrabold text-primary-dark font-mono">
                            {c.tipoPrecio === 'tarifas' ? 'desde ' : ''}S/ {Math.min(...c.tarifas.map(t => t.monto)).toFixed(2)}
                          </span>
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setEditingConcept(c); }}
                              className="p-1 rounded-md text-slate-400 hover:text-primary hover:bg-blue-50 cursor-pointer"
                              title="Editar concepto y precio"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleDeleteConcept(c); }}
                              className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                              title="Eliminar concepto"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {hidden.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10.5px] text-slate-500">
                  <EyeOff size={12} className="text-slate-400" />
                  <span className="font-semibold">Ya pagados (no se vuelven a cobrar):</span>
                  {hidden.map(c => (
                    <span key={c.id} className="px-1.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold font-mono">{c.codigo}</span>
                  ))}
                </div>
              )}

              {/* Tarifa / monto según el tipo de precio del concepto */}
              {selectedConcept?.tipoPrecio === 'tarifas' && (
                <div className="mt-3">
                  <span className="block text-[11px] font-bold text-slate-600 mb-1.5">Tipo de tarifa a aplicar</span>
                  <div className="flex flex-wrap gap-2">
                    {selectedConcept.tarifas.map(t => {
                      const active = t.id === selectedTarifa?.id;
                      return (
                        <button
                          type="button"
                          key={t.id}
                          onClick={() => setSelectedTarifaId(t.id)}
                          className={`px-3 py-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                            active ? 'bg-purple-600 border-purple-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {t.nombre} · <span className="font-mono">S/ {t.monto.toFixed(2)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {isLibre && (
                <div className="mt-3 flex items-end gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Monto a cobrar (S/)</label>
                    <input
                      type="number" step="0.01" min={selectedConcept.montoMinimo || 0}
                      value={montoLibre === '' ? selectedConcept.monto : montoLibre}
                      onChange={(e) => setMontoLibre(e.target.value)}
                      className="w-40 px-3 py-2 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm font-mono font-bold"
                    />
                  </div>
                  {selectedConcept.montoMinimo > 0 && (
                    <span className="text-[11px] text-slate-500 pb-2">Mínimo S/ {selectedConcept.montoMinimo.toFixed(2)}</span>
                  )}
                </div>
              )}
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
                    <span className="text-[10px] text-slate-400">Cta: {cajaConfig.bnCuenta}</span>
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
                  <div className="w-32 h-32 bg-white p-1.5 rounded-xl border border-slate-200 flex-shrink-0">
                    {cajaConfig.yapeQrImagen ? (
                      <img src={cajaConfig.yapeQrImagen} alt="QR oficial Yape/Plin" className="w-full h-full object-contain" />
                    ) : selectedConcept ? (
                      <QrCodeView
                        className="w-full h-full"
                        title="Orden de pago"
                        value={buildPaymentRequestQrPayload({ student, concept: selectedConcept, monto, yapeNumero: cajaConfig.yapeNumero })}
                      />
                    ) : null}
                  </div>
                  <div className="flex-1 w-full space-y-2">
                    <div className="text-xs text-slate-600">
                      <span className="font-bold text-slate-800">Yape / Plin: </span>
                      <span className="font-mono font-bold text-purple-700">{cajaConfig.yapeNumero}</span> ({cajaConfig.yapeTitular})
                      <span className="block text-[10.5px] text-slate-400 mt-0.5">
                        {cajaConfig.yapeQrImagen
                          ? 'QR oficial de cobro de la institución.'
                          : 'QR con la orden de pago: DNI, concepto y monto exacto.'} Monto: <b className="font-mono text-slate-700">S/ {monto.toFixed(2)}</b>
                      </span>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Código de Aprobación Yape / Plin</label>
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

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Observaciones <span className="text-slate-400 font-medium">(opcional, sale en el recibo)</span></label>
                <input
                  type="text"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-xs"
                />
              </div>
            </div>

            {/* Resumen Total y Acciones */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200">
              <div>
                <span className="text-xs text-slate-400 block font-medium">
                  Total a Cobrar{selectedConcept && !isLibre && selectedConcept.tipoPrecio === 'tarifas' ? ` · ${selectedTarifa.nombre}` : ''}
                </span>
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
                  disabled={loading || !selectedConcept}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 hover:shadow-emerald-600/50 hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ShieldCheck size={16} />
                  )}
                  <span>{loading ? 'Procesando pago...' : 'Registrar Pago y Emitir Recibo'}</span>
                </button>
              </div>
            </div>

          </form>

        </div>

        {editingConcept && (
          <ConceptFormModal
            concept={editingConcept === 'new' ? null : editingConcept}
            catalog={catalog}
            onClose={() => setEditingConcept(null)}
            onSave={async (concept, originalId) => {
              const saved = await onSaveConcept(concept, originalId);
              setEditingConcept(null);
              if (!originalId) selectConcept(saved.id);
            }}
          />
        )}
      </div>
    </ModalPortal>
  );
}
