import { useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  Printer,
  Plus,
  Banknote,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  GraduationCap,
  Search,
  ChevronDown,
  CalendarDays,
  Wallet,
  TrendingUp,
  FileSpreadsheet,
  Clock,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import { CAREERS_MAP, withCurrentConcept } from './tupaCatalog';
import { ModalPortal } from './ModalPortal';
import { formatMoney, getReceiptVerificationCode, parseReceiptDate } from './lib/paymentUtils';
import { exportStudentStatementXlsx } from './lib/libroDiarioExport';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];

const ORIGIN_LABELS = {
  caja: { label: 'Caja', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  admision: { label: 'Admisión', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
  acreditado: { label: 'Acreditado', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
};

const STATUS_FILTERS = [
  { id: 'todos', label: 'Todos' },
  { id: 'PAGADO', label: 'Pagados' },
  { id: 'PENDIENTE', label: 'Pendientes' },
];

const amountOf = (p) => parseFloat(p.monto) || 0;
const formatDate = (date) => date.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
const formatTime = (date) => date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

// Situación del vencimiento de una obligación pendiente
function dueInfo(date) {
  if (!date) return { label: 'Pendiente de pago', urgent: false };
  const days = Math.round((startOfDay(date) - startOfDay(new Date())) / 86400000);
  if (days < 0) return { label: `Venció el ${formatDate(date)}`, urgent: true };
  if (days === 0) return { label: 'Vence hoy', urgent: true };
  if (days === 1) return { label: 'Vence mañana', urgent: true };
  return { label: `Vence el ${formatDate(date)}`, urgent: false };
}

function DetailField({ label, value, mono = false }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</dt>
      <dd className={`text-xs font-semibold text-slate-800 break-words ${mono ? 'font-mono' : ''}`}>{value || '—'}</dd>
    </div>
  );
}

/**
 * Modal "Pagos del Año": estado de cuenta del estudiante leído de la base de datos.
 *
 * - Overlay con cierre por Escape / clic fuera (bloqueado mientras otro modal esté encima).
 * - z-50 en portal: PaymentModal / ReceiptModal / AnnualStatementModal se apilan encima.
 */
export function StudentPaymentsModal({
  student,
  payments = [],
  habilitado = false,
  loading = false,
  blocked = false,
  cashierName = 'Caja Central',
  catalog = [],
  onClose,
  onPay,
  onCharge,
  onPrintStatement,
  onViewReceipt,
}) {
  const dialogRef = useRef(null);
  const [statusFilter, setStatusFilter] = useState('todos');
  const [query, setQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

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

  // Movimientos con su fecha interpretada y el concepto vigente del tarifario
  const movements = useMemo(
    () => payments.map(p => ({
      ...withCurrentConcept(p, catalog),
      date: parseReceiptDate({ fechaHora: p.fechaHora, timestamp: p.timestamp }),
    })),
    [payments, catalog]
  );

  const years = useMemo(() => {
    const found = new Set(movements.filter(m => m.estado === 'PAGADO' && m.date).map(m => m.date.getFullYear()));
    return [...found].sort((a, b) => b - a);
  }, [movements]);
  const activeYear = selectedYear ?? years[0] ?? new Date().getFullYear();

  // Lo pagado se filtra por año; lo pendiente siempre se muestra porque sigue vigente
  const yearMovements = useMemo(
    () => movements.filter(m => m.estado === 'PENDIENTE' || !m.date || m.date.getFullYear() === activeYear),
    [movements, activeYear]
  );

  const stats = useMemo(() => {
    const paid = yearMovements.filter(m => m.estado === 'PAGADO');
    const pending = yearMovements.filter(m => m.estado === 'PENDIENTE');
    const totalPaid = paid.reduce((acc, m) => acc + amountOf(m), 0);
    const totalPending = pending.reduce((acc, m) => acc + amountOf(m), 0);
    const obligations = totalPaid + totalPending;
    const last = paid.filter(m => m.date).sort((a, b) => b.date - a.date)[0] || null;

    const byMonth = new Array(12).fill(0);
    paid.forEach(m => { if (m.date) byMonth[m.date.getMonth()] += amountOf(m); });

    const categories = new Map();
    paid.forEach(m => {
      const key = m.conceptoCategoria || 'Otros';
      categories.set(key, (categories.get(key) || 0) + amountOf(m));
    });

    return {
      paid,
      pending,
      totalPaid,
      totalPending,
      progress: obligations ? Math.round((totalPaid / obligations) * 100) : 0,
      last,
      byMonth,
      maxMonth: Math.max(...byMonth, 0),
      categories: [...categories.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [yearMovements]);

  const visibleMovements = useMemo(() => {
    const q = query.toLowerCase().trim();
    return yearMovements
      .filter(m => statusFilter === 'todos' || m.estado === statusFilter)
      .filter(m => !q || [m.codigoRecibo, m.conceptoNombre, m.conceptoCodigo, m.metodoPagoNombre, m.numeroOperacion]
        .some(v => String(v || '').toLowerCase().includes(q)))
      .sort((a, b) => {
        if (a.estado !== b.estado) return a.estado === 'PENDIENTE' ? -1 : 1;
        return (b.date?.getTime() || 0) - (a.date?.getTime() || 0);
      });
  }, [yearMovements, statusFilter, query]);

  if (!student) return null;

  const careerName = CAREERS_MAP[student.programa_id] || 'Programa de Estudio General';
  const fullName = `${student.nombres} ${student.apellidos}`;
  const initials = `${student.nombres?.[0] || ''}${student.apellidos?.[0] || ''}`.toUpperCase();
  const counts = { todos: yearMovements.length, PAGADO: stats.paid.length, PENDIENTE: stats.pending.length };
  const firstPending = stats.pending[0];

  const handleExport = () => exportStudentStatementXlsx({
    student,
    careerName,
    movements: yearMovements,
    year: activeYear,
    habilitado,
    cashier: cashierName,
  });

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 animate-fade-in"
        role="dialog"
        aria-modal="true"
        aria-label={`Pagos del año de ${fullName}`}
      >
        {/* Overlay (clic fuera para cerrar) */}
        <div
          className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
          onClick={() => { if (!blocked) onClose(); }}
        />

        <div
          ref={dialogRef}
          tabIndex={-1}
          className="relative w-full max-w-6xl h-[94vh] sm:h-[90vh] bg-slate-50 rounded-3xl shadow-2xl border border-slate-200 flex flex-col outline-none overflow-hidden"
        >

          {/* ENCABEZADO: datos del alumno y condición financiera */}
          <header className="flex-shrink-0 bg-gradient-to-r from-[#071329] via-[#0A2552] to-[#00388F] text-white px-4 sm:px-7 py-4 sm:py-5">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/15 border border-white/20 font-black text-lg sm:text-xl flex items-center justify-center flex-shrink-0">
                {initials}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider">Pagos del Año {activeYear}</p>
                <h2 className="text-lg sm:text-2xl font-black tracking-tight leading-tight break-words">{fullName}</h2>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] sm:text-xs text-blue-100/90">
                  <span className="font-mono font-bold text-white">DNI {student.dni}</span>
                  <span className="font-mono">{student.codigo_estudiante}</span>
                  <span className="inline-flex items-center gap-1"><GraduationCap size={13} /> {careerName}</span>
                  <span>Modalidad: {student.modalidad_admision || 'ORDINARIO'}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${
                  habilitado
                    ? 'bg-emerald-400/15 text-emerald-200 border-emerald-300/40'
                    : 'bg-amber-400/15 text-amber-200 border-amber-300/40'
                }`}>
                  {habilitado ? <ShieldCheck size={14} /> : <AlertTriangle size={14} />}
                  {habilitado ? 'Habilitado' : 'Bloqueo de matrícula'}
                </span>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl text-blue-100 hover:text-white hover:bg-white/10 transition cursor-pointer"
                  title="Cerrar (Esc)"
                  aria-label="Cerrar"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          </header>

          {/* CONTENIDO CON SCROLL INTERNO */}
          <div className="flex-1 overflow-y-auto px-3 sm:px-7 py-4 sm:py-5 space-y-4">

            {/* Aviso de deuda con acceso directo al cobro */}
            {!loading && firstPending && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 flex flex-col sm:flex-row sm:items-center gap-3">
                <span className="p-2 rounded-xl bg-amber-100 text-amber-700 self-start flex-shrink-0"><AlertTriangle size={20} /></span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-amber-900">
                    Debe {formatMoney(stats.totalPending)} · {firstPending.conceptoNombre}
                  </p>
                  <p className="text-xs text-amber-800 mt-0.5">
                    {dueInfo(firstPending.date).label}. Al pagarlo se libera el bloqueo de matrícula.
                  </p>
                </div>
                <button
                  onClick={() => onCharge(firstPending.conceptoId || null)}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition cursor-pointer flex-shrink-0"
                >
                  <Banknote size={15} /> Cobrar ahora
                </button>
              </div>
            )}

            {/* Indicadores */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-3" aria-label="Resumen del año">
              <div className="p-4 rounded-2xl bg-white border border-slate-200">
                <p className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 uppercase tracking-wider"><Wallet size={13} /> Total pagado</p>
                <p className="mt-1 text-xl sm:text-2xl font-black text-emerald-800 font-mono">{formatMoney(stats.totalPaid)}</p>
                <p className="text-[11px] text-slate-500">{stats.paid.length} comprobante(s) en {activeYear}</p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200">
                <p className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${stats.totalPending ? 'text-amber-700' : 'text-slate-500'}`}><AlertTriangle size={13} /> Saldo pendiente</p>
                <p className={`mt-1 text-xl sm:text-2xl font-black font-mono ${stats.totalPending ? 'text-amber-800' : 'text-slate-800'}`}>{formatMoney(stats.totalPending)}</p>
                <p className="text-[11px] text-slate-500">{stats.totalPending ? `${stats.pending.length} obligación(es) por cancelar` : 'Sin deudas pendientes'}</p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200">
                <p className="flex items-center gap-1.5 text-[10px] font-bold text-primary uppercase tracking-wider"><TrendingUp size={13} /> Avance de pagos</p>
                <p className="mt-1 text-xl sm:text-2xl font-black text-primary-dark">{stats.progress}%</p>
                <div
                  className="mt-1.5 h-2 rounded-full bg-slate-100 overflow-hidden"
                  role="progressbar"
                  aria-valuenow={stats.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Avance de pagos"
                >
                  <div className={`h-full rounded-full ${stats.progress === 100 ? 'bg-emerald-500' : 'bg-primary'}`} style={{ width: `${stats.progress}%` }} />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 min-w-0">
                <p className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider"><Clock size={13} /> Último pago</p>
                {stats.last ? (
                  <>
                    <p className="mt-1 text-xl sm:text-2xl font-black text-slate-800">{formatDate(stats.last.date)}</p>
                    <p className="text-[11px] text-slate-500 truncate" title={stats.last.conceptoNombre}>{stats.last.conceptoNombre}</p>
                  </>
                ) : (
                  <p className="mt-1 text-sm font-bold text-slate-400">Sin pagos en {activeYear}</p>
                )}
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_17.5rem] gap-4 items-start">

              {/* MOVIMIENTOS */}
              <section className="bg-white rounded-2xl border border-slate-200 min-w-0" aria-label="Movimientos del año">
                <div className="p-3 sm:p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center gap-2.5">
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 self-start" role="tablist" aria-label="Filtrar por estado">
                    {STATUS_FILTERS.map(f => (
                      <button
                        key={f.id}
                        role="tab"
                        aria-selected={statusFilter === f.id}
                        onClick={() => setStatusFilter(f.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          statusFilter === f.id ? 'bg-white text-primary-dark shadow-sm' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {f.label} <span className="font-mono text-[10px] opacity-70">{counts[f.id]}</span>
                      </button>
                    ))}
                  </div>

                  <div className="relative flex-1 min-w-0">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Buscar comprobante, concepto u operación..."
                      aria-label="Buscar en los movimientos"
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  {years.length > 1 && (
                    <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 flex-shrink-0">
                      <CalendarDays size={14} />
                      <select
                        value={activeYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        aria-label="Año"
                        className="px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </label>
                  )}
                </div>

                {loading && (
                  <div className="py-14 text-center text-sm text-slate-400">
                    <span className="inline-block w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin align-middle mr-2" />
                    Cargando estado de cuenta...
                  </div>
                )}

                {!loading && visibleMovements.length === 0 && (
                  <div className="py-14 px-4 text-center">
                    <Receipt size={26} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-bold text-slate-600">
                      {query || statusFilter !== 'todos' ? 'Ningún movimiento coincide con el filtro' : 'Sin movimientos registrados en el año'}
                    </p>
                    {(query || statusFilter !== 'todos') && (
                      <button
                        onClick={() => { setQuery(''); setStatusFilter('todos'); }}
                        className="mt-2 text-xs font-bold text-primary hover:underline cursor-pointer"
                      >
                        Quitar filtros
                      </button>
                    )}
                  </div>
                )}

                {!loading && visibleMovements.length > 0 && (
                  <ul className="divide-y divide-slate-100">
                    {visibleMovements.map(m => {
                      const isPaid = m.estado === 'PAGADO';
                      const isOpen = expandedId === m.id;
                      const origin = ORIGIN_LABELS[m.origen];
                      const due = !isPaid ? dueInfo(m.date) : null;
                      const hasOperation = m.numeroOperacion && m.numeroOperacion !== '-';
                      return (
                        <li key={m.id} className={isPaid ? '' : 'bg-amber-50/50'}>
                          <div className="flex items-center gap-2.5 sm:gap-3 p-3 sm:px-4">
                            <button
                              onClick={() => setExpandedId(isOpen ? null : m.id)}
                              aria-expanded={isOpen}
                              className="flex-1 min-w-0 flex items-center gap-2.5 sm:gap-3 text-left cursor-pointer group"
                            >
                              <span className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isPaid ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-100 text-amber-700'}`}>
                                {isPaid ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                              </span>
                              <span className="flex-1 min-w-0">
                                <span className="block text-xs sm:text-sm font-extrabold text-slate-900 group-hover:text-primary-dark transition truncate" title={m.conceptoNombre}>
                                  {m.conceptoNombre}
                                </span>
                                <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
                                  <span className={!isPaid && due.urgent ? 'font-bold text-amber-800' : ''}>
                                    {isPaid ? (m.date ? formatDate(m.date) : m.fechaHora) : due.label}
                                  </span>
                                  {isPaid && <span className="font-mono font-semibold text-slate-600">{m.codigoRecibo}</span>}
                                  {origin && <span className={`px-1.5 rounded border text-[10px] font-bold ${origin.cls}`}>{origin.label}</span>}
                                </span>
                              </span>
                              <span className="font-mono font-black text-sm text-slate-900 whitespace-nowrap">{formatMoney(m.monto)}</span>
                              <ChevronDown size={16} className={`text-slate-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isPaid ? (
                              <button
                                onClick={() => onViewReceipt(m.original)}
                                className="inline-flex items-center gap-1 p-2 sm:px-2.5 sm:py-1.5 rounded-lg bg-slate-100 hover:bg-primary hover:text-white text-slate-700 font-bold text-xs transition cursor-pointer flex-shrink-0"
                                title="Ver e imprimir boleta oficial"
                                aria-label={`Ver boleta ${m.codigoRecibo}`}
                              >
                                <Printer size={13} />
                                <span className="hidden sm:inline">Boleta</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => onCharge(m.conceptoId || null)}
                                className="inline-flex items-center gap-1 p-2 sm:px-2.5 sm:py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer flex-shrink-0"
                                aria-label={`Cobrar ${m.conceptoNombre}`}
                              >
                                <Banknote size={13} />
                                <span className="hidden sm:inline">Cobrar</span>
                              </button>
                            )}
                          </div>

                          {isOpen && (
                            <dl className="mx-3 sm:mx-4 mb-3 p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-3 animate-fade-in">
                              <DetailField label="Código TUPA" value={m.conceptoCodigo} mono />
                              <DetailField label="Categoría" value={m.conceptoCategoria} />
                              {isPaid && <DetailField label="Hora" value={m.date ? formatTime(m.date) : null} />}
                              <DetailField label="Forma de pago" value={m.metodoPagoNombre} />
                              {hasOperation && <DetailField label="N° de operación" value={m.numeroOperacion} mono />}
                              {m.tarifaNombre && m.tarifaNombre !== 'General' && <DetailField label="Tarifa" value={m.tarifaNombre} />}
                              {isPaid && <DetailField label="Cajero" value={m.cajero} />}
                              {isPaid && <DetailField label="Cód. de verificación" value={getReceiptVerificationCode(m)} mono />}
                              {m.liberaMatricula && (
                                <p className="col-span-2 sm:col-span-3 text-[11px] font-semibold text-emerald-700 flex items-center gap-1.5">
                                  <ShieldCheck size={13} /> {isPaid ? 'Este pago habilitó la matrícula del alumno.' : 'Al pagarlo se habilita la matrícula del alumno.'}
                                </p>
                              )}
                              {m.observaciones && (
                                <div className="col-span-2 sm:col-span-3"><DetailField label="Observaciones" value={m.observaciones} /></div>
                              )}
                            </dl>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              {/* ANÁLISIS DEL AÑO */}
              <aside className="space-y-4 min-w-0">
                <section className="p-4 bg-white rounded-2xl border border-slate-200" aria-label="Pagos por mes">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                    <CalendarDays size={14} className="text-primary" /> Pagos por mes
                  </h3>
                  <div className="flex items-end gap-1 h-24">
                    {stats.byMonth.map((amount, i) => (
                      <div key={MONTHS[i]} className="flex-1 h-full flex flex-col justify-end items-center gap-1 min-w-0" title={`${MONTHS[i]} ${activeYear}: ${formatMoney(amount)}`}>
                        <div
                          className={`w-full rounded-t ${amount ? 'bg-primary' : 'bg-slate-100'}`}
                          style={{ height: amount ? `${Math.max((amount / stats.maxMonth) * 100, 8)}%` : '3px' }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-1 mt-1">
                    {MONTHS.map(month => (
                      <span key={month} className="flex-1 text-center text-[8px] font-semibold text-slate-400 min-w-0 overflow-hidden">{month[0]}</span>
                    ))}
                  </div>
                </section>

                <section className="p-4 bg-white rounded-2xl border border-slate-200" aria-label="Pagado por categoría">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                    <Layers size={14} className="text-primary" /> Por categoría
                  </h3>
                  {stats.categories.length === 0 ? (
                    <p className="text-xs text-slate-400">Aún no hay pagos este año.</p>
                  ) : (
                    <ul className="space-y-2.5">
                      {stats.categories.map(([category, amount]) => (
                        <li key={category}>
                          <div className="flex items-baseline justify-between gap-2 text-[11px]">
                            <span className="font-semibold text-slate-700 truncate" title={category}>{category}</span>
                            <span className="font-mono font-bold text-slate-900 whitespace-nowrap">{formatMoney(amount)}</span>
                          </div>
                          <div className="mt-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${stats.totalPaid ? (amount / stats.totalPaid) * 100 : 0}%` }} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </aside>
            </div>
          </div>

          {/* PIE FIJO CON ACCIONES */}
          <footer className="flex flex-wrap items-center justify-end gap-2 px-3 sm:px-7 py-3 border-t border-slate-200 bg-white flex-shrink-0">
            <button
              onClick={handleExport}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileSpreadsheet size={15} className="text-emerald-600" />
              <span>Excel</span>
            </button>
            <button
              onClick={onPrintStatement}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-xs shadow-sm transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer size={15} />
              <span>Imprimir Estado de Cuenta</span>
            </button>
            <button
              onClick={onPay}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs shadow-sm transition cursor-pointer"
            >
              <Plus size={16} />
              <span>Registrar Pago TUPA</span>
            </button>
          </footer>

        </div>
      </div>
    </ModalPortal>
  );
}
