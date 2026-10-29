import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../core/auth/useAuth';
import { API_BASE } from '../../core/api/client';
import { 
  Wallet, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Banknote, 
  Receipt, 
  CreditCard, 
  Building2, 
  QrCode, 
  Filter, 
  Download, 
  Printer, 
  Lock, 
  Unlock, 
  Sparkles, 
  TrendingUp, 
  Clock, 
  Users, 
  FileSpreadsheet, 
  LayoutGrid, 
  List, 
  Check, 
  ArrowUpRight, 
  ShieldCheck, 
  RotateCcw,
  GraduationCap,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  FileText,
  Eye,
  X
} from 'lucide-react';
import { TUPA_CONCEPTS, PAYMENT_METHODS, CAREERS_MAP, getStudentAnnualPayments } from './tupaCatalog';
import { PaymentModal } from './PaymentModal';
import { ReceiptModal } from './ReceiptModal';
import { AnnualStatementModal } from './AnnualStatementModal';
import { StudentPaymentsModal } from './StudentPaymentsModal';

const STORAGE_KEY_TRANSACTIONS = 'siga_transacciones_caja_2026';

// Normaliza texto para búsquedas insensibles a mayúsculas, minúsculas y tildes
const normalizarTexto = (texto) =>
  (texto ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

// Transacciones semilla iniciales alineadas a los estudiantes ya pagados en la BD
const INITIAL_TRANSACTIONS = [
  {
    id: 1718000001,
    codigoRecibo: 'REC-2026-00108',
    estudianteId: 2314,
    estudianteNombre: 'Leonardo Cahuana Tello',
    dni: '77648746',
    codigoEstudiante: '2024-77648746',
    carreraNombre: 'Desarrollo de Sistemas de Información',
    conceptoId: 'MAT-01',
    conceptoCodigo: 'MAT-01',
    conceptoNombre: 'Derecho de Matrícula Regular 2026-I',
    conceptoCategoria: 'Matrícula',
    monto: 120.00,
    metodoPagoId: 'banco_nacion',
    metodoPagoNombre: 'Banco de la Nación (BN)',
    numeroOperacion: 'BN-849201',
    cajero: 'Caja Central - Tesorería',
    fechaHora: '15/10/2026, 09:30:15',
    timestamp: Date.now() - 86400000,
    liberaMatricula: true
  },
  {
    id: 1718000002,
    codigoRecibo: 'REC-2026-00109',
    estudianteId: 2313,
    estudianteNombre: 'Ricardo Arevalo Villacorta',
    dni: '60832237',
    codigoEstudiante: '2025-60832237',
    carreraNombre: 'Desarrollo de Sistemas de Información',
    conceptoId: 'MAT-01',
    conceptoCodigo: 'MAT-01',
    conceptoNombre: 'Derecho de Matrícula Regular 2026-I',
    conceptoCategoria: 'Matrícula',
    monto: 120.00,
    metodoPagoId: 'efectivo',
    metodoPagoNombre: 'Efectivo en Ventanilla',
    numeroOperacion: 'PAGO EN VENTANILLA',
    cajero: 'Caja Central - Tesorería',
    fechaHora: '15/10/2026, 10:14:20',
    timestamp: Date.now() - 82000000,
    liberaMatricula: true
  },
  {
    id: 1718000003,
    codigoRecibo: 'REC-2026-00110',
    estudianteId: 2031,
    estudianteNombre: 'KEVIN MANUEL MARICHI GROMEZ',
    dni: '75983142',
    codigoEstudiante: '2026-75983142',
    carreraNombre: 'Desarrollo de Sistemas de Información',
    conceptoId: 'MAT-01',
    conceptoCodigo: 'MAT-01',
    conceptoNombre: 'Derecho de Matrícula Regular 2026-I',
    conceptoCategoria: 'Matrícula',
    monto: 120.00,
    metodoPagoId: 'yape_plin',
    metodoPagoNombre: 'Billetera Digital (Yape / Plin)',
    numeroOperacion: 'YP-918234',
    cajero: 'Caja Central - Tesorería',
    fechaHora: '15/10/2026, 11:45:00',
    timestamp: Date.now() - 75000000,
    liberaMatricula: true
  },
  {
    id: 1718000004,
    codigoRecibo: 'REC-2026-00111',
    estudianteId: 2029,
    estudianteNombre: 'DILBER ALEX MARICHI GORMEZ',
    dni: '75975159',
    codigoEstudiante: '2026-75975159',
    carreraNombre: 'Desarrollo de Sistemas de Información',
    conceptoId: 'CAR-01',
    conceptoCodigo: 'CAR-01',
    conceptoNombre: 'Carnet Estudiantil / Fotocheck Institucional',
    conceptoCategoria: 'Identificación',
    monto: 15.00,
    metodoPagoId: 'efectivo',
    metodoPagoNombre: 'Efectivo en Ventanilla',
    numeroOperacion: 'PAGO EN VENTANILLA',
    cajero: 'Caja Central - Tesorería',
    fechaHora: '15/10/2026, 12:05:40',
    timestamp: Date.now() - 70000000,
    liberaMatricula: false
  },
  {
    id: 1718000005,
    codigoRecibo: 'REC-2026-00112',
    estudianteId: 1887,
    estudianteNombre: 'ASHLEY AMPUERO TAMANI',
    dni: '75933316',
    codigoEstudiante: '2026-75933316',
    carreraNombre: 'Desarrollo de Sistemas de Información',
    conceptoId: 'MAT-01',
    conceptoCodigo: 'MAT-01',
    conceptoNombre: 'Derecho de Matrícula Regular 2026-I',
    conceptoCategoria: 'Matrícula',
    monto: 120.00,
    metodoPagoId: 'banco_nacion',
    metodoPagoNombre: 'Banco de la Nación (BN)',
    numeroOperacion: 'BN-902341',
    cajero: 'Caja Central - Tesorería',
    fechaHora: '16/10/2026, 08:30:00',
    timestamp: Date.now() - 14000000,
    liberaMatricula: true
  }
];

export function FinancesDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('caja'); // 'caja' | 'historial' | 'arqueo'
  
  // Data states
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  
  // Modals & Dossier State
  const [payingStudent, setPayingStudent] = useState(null);
  const [viewingReceipt, setViewingReceipt] = useState(null);
  const [selectedStudentForDossier, setSelectedStudentForDossier] = useState(null);
  const [showAnnualModal, setShowAnnualModal] = useState(false);

  // Notificación temporal de pago exitoso (no genera tarjetas permanentes)
  const [paymentToast, setPaymentToast] = useState(null);

  useEffect(() => {
    if (!paymentToast) return;
    const timer = setTimeout(() => setPaymentToast(null), 6000);
    return () => clearTimeout(timer);
  }, [paymentToast]);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCareer, setFilterCareer] = useState('todas');
  const [filterStatus, setFilterStatus] = useState('todos'); // 'todos' | 'con_deuda' | 'habilitados'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const [historyMethodFilter, setHistoryMethodFilter] = useState('todos');
  const [historySearch, setHistorySearch] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = viewMode === 'grid' ? 6 : 10;

  // Cargar transacciones desde localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
      if (stored) {
        setTransactions(JSON.parse(stored));
      } else {
        localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(INITIAL_TRANSACTIONS));
        setTransactions(INITIAL_TRANSACTIONS);
      }
    } catch (e) {
      console.error('Error cargando transacciones:', e);
      setTransactions(INITIAL_TRANSACTIONS);
    }
  }, []);

  // Fetch de Estudiantes desde la API
  const fetchStudents = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/mod-gestion-academica/estudiantes/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        console.error("Error fetching students:", await res.text());
        setStudents([]);
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setStudents(data);
      } else {
        setStudents([]);
      }
    } catch (e) {
      console.error('Error al obtener estudiantes:', e);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // Si el usuario escribe un DNI exacto de 8 dígitos en la barra de búsqueda, auto-seleccionar ese estudiante
  useEffect(() => {
    const trimmed = searchTerm.trim();
    if (trimmed.length === 8 && /^\d+$/.test(trimmed)) {
      const matched = students.find(s => String(s.dni) === trimmed);
      if (matched) {
        setSelectedStudentForDossier(matched);
      }
    }
  }, [searchTerm, students]);

  // Métricas Financieras en Vivo
  const financialStats = useMemo(() => {
    const totalEstudiantes = students.length || 1;
    const estudiantesHabilitados = students.filter(s => s.pago_matricula).length;
    const estudiantesConDeuda = totalEstudiantes - estudiantesHabilitados;
    const porcentajeHabilitados = Math.round((estudiantesHabilitados / totalEstudiantes) * 100);

    // Suma total recaudada desde transacciones
    const totalRecaudado = transactions.reduce((acc, t) => acc + (parseFloat(t.monto) || 0), 0);

    // Recaudación del día de hoy
    const hoyStr = new Date().toLocaleDateString();
    const recaudadoHoy = transactions
      .filter(t => new Date(t.timestamp).toLocaleDateString() === hoyStr)
      .reduce((acc, t) => acc + (parseFloat(t.monto) || 0), 0);

    return {
      totalRecaudado,
      recaudadoHoy,
      totalEstudiantes,
      estudiantesHabilitados,
      estudiantesConDeuda,
      porcentajeHabilitados,
      totalTransacciones: transactions.length
    };
  }, [students, transactions]);

  // Filtro de Estudiantes
  // - Sin búsqueda: la lista de cobros muestra ÚNICAMENTE estudiantes
  //   con matrícula pendiente de pago (los pagados quedan ocultos).
  // - Con búsqueda: se pueden localizar pendientes Y estudiantes cuya
  //   matrícula ya fue cancelada (se mostrarán como informativos).
  const hasSearch = searchTerm.trim().length > 0;

  const filteredStudents = useMemo(() => {
    const q = normalizarTexto(searchTerm);
    return students.filter(s => {
      const esPagado = !!s.pago_matricula;

      // Sin búsqueda activa, los estudiantes pagados NO aparecen en la lista principal
      if (!q && esPagado) return false;

      const nombreCompleto = normalizarTexto(`${s.nombres || ''} ${s.apellidos || ''}`);
      const nombreInvertido = normalizarTexto(`${s.apellidos || ''} ${s.nombres || ''}`);
      const matchesSearch = !q ||
        (s.dni && String(s.dni).includes(q)) ||
        (s.codigo_estudiante && normalizarTexto(s.codigo_estudiante).includes(q)) ||
        nombreCompleto.includes(q) ||
        nombreInvertido.includes(q);

      const matchesCareer = filterCareer === 'todas' || String(s.programa_id) === String(filterCareer);

      // El filtro de estado gobierna la lista de cobros (sin búsqueda).
      // Con búsqueda activa NO se aplica, para poder localizar siempre
      // estudiantes pagados sin importar que estén ocultos de la lista principal.
      const matchesStatus = q
        ? true
        : filterStatus === 'todos' ||
          (filterStatus === 'con_deuda' && !esPagado) ||
          (filterStatus === 'habilitados' && esPagado);

      return matchesSearch && matchesCareer && matchesStatus;
    });
  }, [students, searchTerm, filterCareer, filterStatus]);

  // Reset de página al cambiar filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCareer, filterStatus, viewMode]);

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage) || 1;
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(start, start + itemsPerPage);
  }, [filteredStudents, currentPage, itemsPerPage]);

  // Filtro de Transacciones para el Libro Diario
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const q = historySearch.toLowerCase().trim();
      const matchesQ = !q ||
        (t.codigoRecibo && t.codigoRecibo.toLowerCase().includes(q)) ||
        (t.estudianteNombre && t.estudianteNombre.toLowerCase().includes(q)) ||
        (t.dni && t.dni.includes(q)) ||
        (t.conceptoNombre && t.conceptoNombre.toLowerCase().includes(q)) ||
        (t.numeroOperacion && t.numeroOperacion.toLowerCase().includes(q));

      const matchesMethod = historyMethodFilter === 'todos' || t.metodoPagoId === historyMethodFilter;

      return matchesQ && matchesMethod;
    });
  }, [transactions, historySearch, historyMethodFilter]);

  // Manejador de pago completado con éxito
  const handlePaymentSuccess = (receiptPayload) => {
    // 0. Protección anti-duplicados: si el identificador ya existe, no se vuelve a registrar
    const yaRegistrado = transactions.find(t => String(t.id) === String(receiptPayload.id));
    if (yaRegistrado) {
      console.warn('Pago duplicado detectado y descartado:', receiptPayload.codigoRecibo);
      setPayingStudent(null);
      setViewingReceipt(yaRegistrado);
      return;
    }

    // 1. Guardar en transactions
    const updated = [receiptPayload, ...transactions];
    setTransactions(updated);
    try {
      localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(updated));
    } catch (e) {
      console.error('Error guardando transacción en localStorage:', e);
    }

    // 2. Refrescar lista de estudiantes para reflejar liberación de candado
    fetchStudents();

    // 3. Actualizar estudiante en el dossier si estaba abierto
    if (selectedStudentForDossier && String(selectedStudentForDossier.id) === String(receiptPayload.estudianteId)) {
      setSelectedStudentForDossier(prev => ({ ...prev, pago_matricula: true }));
    }

    // 4. Cerrar modal de pago y abrir recibo para visualización/impresión
    setPayingStudent(null);
    setViewingReceipt(receiptPayload);

    // 5. Notificación temporal de pago exitoso (desaparece sola).
    // El estudiante pagado queda fuera de la lista principal de pendientes
    // porque fetchStudents() reconsulta PostgreSQL con el estado real.
    setPaymentToast({
      codigoRecibo: receiptPayload.codigoRecibo,
      estudianteNombre: receiptPayload.estudianteNombre,
      monto: parseFloat(receiptPayload.monto) || 0
    });
  };

  // Exportar Libro Diario a CSV
  const handleExportCSV = () => {
    if (transactions.length === 0) {
      alert('No hay transacciones registradas para exportar.');
      return;
    }

    const headers = ['N° Recibo', 'Fecha y Hora', 'Estudiante', 'DNI', 'Código', 'Carrera', 'Concepto', 'Categoría', 'Método de Pago', 'N° Operación', 'Monto (S/)', 'Cajero'];
    const rows = transactions.map(t => [
      t.codigoRecibo,
      `"${t.fechaHora}"`,
      `"${t.estudianteNombre}"`,
      t.dni,
      t.codigoEstudiante,
      `"${t.carreraNombre}"`,
      `"${t.conceptoNombre}"`,
      `"${t.conceptoCategoria}"`,
      `"${t.metodoPagoNombre}"`,
      `"${t.numeroOperacion || ''}"`,
      parseFloat(t.monto).toFixed(2),
      `"${t.cajero}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Arqueo_Caja_IESTP_Suiza_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Desglose por método de pago para Arqueo
  const arqueoPorMetodo = useMemo(() => {
    const summary = {
      efectivo: 0,
      banco_nacion: 0,
      yape_plin: 0,
      tarjeta_pos: 0,
      total: 0
    };
    transactions.forEach(t => {
      const m = parseFloat(t.monto) || 0;
      if (t.metodoPagoId === 'efectivo') summary.efectivo += m;
      else if (t.metodoPagoId === 'banco_nacion') summary.banco_nacion += m;
      else if (t.metodoPagoId === 'yape_plin') summary.yape_plin += m;
      else if (t.metodoPagoId === 'tarjeta_pos') summary.tarjeta_pos += m;
      summary.total += m;
    });
    return summary;
  }, [transactions]);

  // Pagos calculados para el estudiante actualmente seleccionado en el Expediente
  const selectedStudentPayments = useMemo(() => {
    if (!selectedStudentForDossier) return [];
    return getStudentAnnualPayments(selectedStudentForDossier, transactions);
  }, [selectedStudentForDossier, transactions]);

  return (
    <div className="animate-fade-in space-y-8 pb-12">
      
      {/* 1. Bento Hero Banner con Aurora Glow & KPIs Financieros */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#071329] via-[#0A2552] to-[#00388F] text-white p-6 sm:p-8 shadow-2xl border border-blue-500/20">
        {/* Luces Aurora */}
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-blue-500/25 rounded-full blur-3xl pointer-events-none animate-pulse-subtle" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-400/10 via-transparent to-transparent pointer-events-none" />

        {/* Cabecera del Banner */}
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-6 border-b border-white/10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-blue-100 mb-3">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              <span className="tracking-wide">IESTP SUIZA · TESORERÍA Y CAJA CENTRAL</span>
              <span className="text-white/40">|</span>
              <span className="text-emerald-300 font-bold">BASE OFICIAL: 788 ESTUDIANTES</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <span>Caja, Pagos y Tesorería</span>
              <Sparkles className="w-6 h-6 text-amber-300 animate-pulse hidden sm:inline-block" />
            </h1>
            <p className="text-blue-100/80 text-sm sm:text-base max-w-2xl mt-2 leading-relaxed">
              Consulta inmediata de estudiantes por DNI, nombres completos, estado de cuenta anual y recaudación oficial de aranceles TUPA.
            </p>
          </div>

          {/* Acciones Rápidas del Banner */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-semibold text-xs border border-white/20 shadow-sm hover:shadow-lg transition cursor-pointer"
            >
              <FileSpreadsheet size={16} className="text-emerald-300" />
              <span>Exportar Libro Diario</span>
            </button>
            <div className="px-3.5 py-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Caja Abierta: Turno Diurno</span>
            </div>
          </div>
        </div>

        {/* Bento Grid: 4 KPIs Financieros en Vivo */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
          
          {/* Card 1: Recaudación Acumulada */}
          <div className="group bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/15 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-900/30">
            <div className="flex items-center justify-between mb-3">
              <span className="w-10 h-10 rounded-xl bg-blue-500/25 border border-blue-400/30 flex items-center justify-center text-cyan-300 group-hover:scale-110 transition-transform">
                <Banknote size={20} />
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-300 bg-cyan-500/20 px-2 py-0.5 rounded-full border border-cyan-400/30">
                Periodo 2026-I
              </span>
            </div>
            <div className="text-3xl font-extrabold text-white tracking-tight font-mono">
              S/ {financialStats.totalRecaudado.toFixed(2)}
            </div>
            <div className="text-xs font-semibold text-blue-200 mt-1">
              Recaudación Total
            </div>
            <p className="text-[11px] text-blue-200/60 mt-0.5">
              Ingresos por aranceles y matrículas
            </p>
          </div>

          {/* Card 2: Recaudación Hoy */}
          <div className="group bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/15 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-900/20">
            <div className="flex items-center justify-between mb-3">
              <span className="w-10 h-10 rounded-xl bg-emerald-500/25 border border-emerald-400/30 flex items-center justify-center text-emerald-300 group-hover:scale-110 transition-transform">
                <TrendingUp size={20} />
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-400/30">
                Jornada de Hoy
              </span>
            </div>
            <div className="text-3xl font-extrabold text-white tracking-tight font-mono">
              S/ {financialStats.recaudadoHoy.toFixed(2)}
            </div>
            <div className="text-xs font-semibold text-blue-200 mt-1">
              Arqueo del Día en Caja
            </div>
            <p className="text-[11px] text-blue-200/60 mt-0.5">
              Recaudación de la sesión actual
            </p>
          </div>

          {/* Card 3: Solvencia y Matrículas */}
          <div className="group bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/15 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-900/20">
            <div className="flex items-center justify-between mb-3">
              <span className="w-10 h-10 rounded-xl bg-amber-500/25 border border-amber-400/30 flex items-center justify-center text-amber-300 group-hover:scale-110 transition-transform">
                <Users size={20} />
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-400/30">
                {financialStats.porcentajeHabilitados}% Al Día
              </span>
            </div>
            <div className="text-3xl font-extrabold text-white tracking-tight">
              {financialStats.estudiantesHabilitados} <span className="text-sm font-semibold text-blue-200 font-normal">/ {financialStats.totalEstudiantes}</span>
            </div>
            <div className="text-xs font-semibold text-blue-200 mt-1">
              Estudiantes Habilitados
            </div>
            <p className="text-[11px] text-blue-200/60 mt-0.5">
              {financialStats.estudiantesConDeuda} con bloqueo de matrícula
            </p>
          </div>

          {/* Card 4: Transacciones Emitidas */}
          <div className="group bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/15 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-900/20">
            <div className="flex items-center justify-between mb-3">
              <span className="w-10 h-10 rounded-xl bg-purple-500/25 border border-purple-400/30 flex items-center justify-center text-purple-300 group-hover:scale-110 transition-transform">
                <Receipt size={20} />
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full border border-purple-400/30">
                Libro Diario
              </span>
            </div>
            <div className="text-3xl font-extrabold text-white tracking-tight">
              {financialStats.totalTransacciones}
            </div>
            <div className="text-xs font-semibold text-blue-200 mt-1">
              Recibos de Caja Emitidos
            </div>
            <p className="text-[11px] text-blue-200/60 mt-0.5">
              Boletas con código correlativo
            </p>
          </div>

        </div>
      </div>

      {/* 2. Barra de Navegación de Pestañas */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('caja')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'caja'
              ? 'bg-primary text-white shadow-md shadow-primary/25'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Wallet size={16} />
          <span>Ventanilla de Cobranza & Consulta por DNI</span>
        </button>

        <button
          onClick={() => setActiveTab('historial')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'historial'
              ? 'bg-primary text-white shadow-md shadow-primary/25'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Receipt size={16} />
          <span>Libro Diario de Transacciones ({transactions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('arqueo')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'arqueo'
              ? 'bg-primary text-white shadow-md shadow-primary/25'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <FileSpreadsheet size={16} />
          <span>Arqueo y Cierre de Caja</span>
        </button>
      </div>

      {/* 3. CONTENIDO: PESTAÑA 1 - VENTANILLA DE COBRANZA & CONSULTA POR DNI */}
      {activeTab === 'caja' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* BUSCADOR PROMINENTE POR DNI / NOMBRE */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-lg border border-blue-500/20">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-300 uppercase tracking-wider mb-2">
              <Search size={14} />
              <span>Buscador Oficial por DNI · Base Institucional IESTP Suiza ({students.length} Estudiantes)</span>
            </div>
            <h3 className="text-xl font-extrabold text-white mb-3">
              Consulta de Estado de Cuenta y Pagos Anuales
            </h3>
            <p className="text-xs text-blue-200/80 mb-4">
              Ingresa el número de DNI para visualizar inmediatamente los nombres completos del estudiante, su carrera y la relación de pagos efectuados durante todo el año 2026.
            </p>

            <div className="relative flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Digita el DNI del estudiante (ej. 61549304, 77648746, 48309294) o apellidos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-10 py-3.5 bg-white text-slate-900 rounded-2xl border-2 border-transparent focus:border-cyan-400 focus:outline-none text-sm font-medium shadow-inner placeholder:text-slate-400"
                />
                {searchTerm && (
                  <button
                    onClick={() => { setSearchTerm(''); setSelectedStudentForDossier(null); }}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Botón de Limpiar / Ver Todos */}
              {selectedStudentForDossier && (
                <button
                  onClick={() => setSelectedStudentForDossier(null)}
                  className="px-4 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition cursor-pointer flex-shrink-0 flex items-center gap-2"
                >
                  <RotateCcw size={15} />
                  <span>Ver Catálogo Completo</span>
                </button>
              )}
            </div>
          </div>

          {/* EXPEDIENTE FINANCIERO: ahora se muestra en modal (StudentPaymentsModal) */}

          {/* BARRA DE FILTROS SECUNDARIOS (Para navegar todos los 788 estudiantes) */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
            
            {/* Filtros Dropdown */}
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              
              {/* Filtro por Carrera */}
              <select
                value={filterCareer}
                onChange={(e) => setFilterCareer(e.target.value)}
                className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="todas">Todas las Carreras Técnicas (11)</option>
                {Object.entries(CAREERS_MAP).map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>

              {/* Filtro por Estado */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="todos">Todos los Estados Financieros</option>
                <option value="con_deuda">Con Deuda de Matrícula (Bloqueados)</option>
                <option value="habilitados">Habilitados / Matrícula Pagada</option>
              </select>

              {/* Vista Grid/Table */}
              <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition ${viewMode === 'grid' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-800'}`}
                  title="Vista en Tarjetas"
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg transition ${viewMode === 'table' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-800'}`}
                  title="Vista en Tabla"
                >
                  <List size={16} />
                </button>
              </div>

            </div>

            {/* Contador de Resultados */}
            <div className="text-xs text-slate-500 font-medium">
              Mostrando <strong className="text-slate-800">{filteredStudents.length}</strong> de {students.length} estudiantes
            </div>

          </div>

          {/* VISTA EN GRID DE TARJETAS */}
          {loading ? (
            <div className="py-20 text-center">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-500">Cargando base de datos oficial del IESTP Suiza...</p>
            </div>
          ) : paginatedStudents.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
              <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Search size={28} />
              </div>
              {hasSearch ? (
                <>
                  <h4 className="font-bold text-slate-800 text-sm">Estudiante no encontrado</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    No existe coincidencia con el DNI, código o nombre ingresado en la base institucional del IESTP Suiza.
                  </p>
                </>
              ) : (
                <>
                  <h4 className="font-bold text-slate-800 text-sm">Sin estudiantes pendientes de matrícula</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    No hay estudiantes con deuda de matrícula para los filtros aplicados. Utilice el buscador para localizar comprobantes de estudiantes que ya cancelaron su matrícula.
                  </p>
                </>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {paginatedStudents.map(student => {
                const career = CAREERS_MAP[student.programa_id] || 'Programa de Estudio General';
                const isPaid = student.pago_matricula;
                const isSelected = selectedStudentForDossier?.id === student.id;

                // Estudiante con matrícula YA CANCELADA: solo aparece como
                // resultado de una búsqueda explícita. Tarjeta informativa,
                // sin botón de cobro de matrícula.
                if (isPaid) {
                  const comprobanteMatricula = transactions.find(t =>
                    (String(t.estudianteId) === String(student.id) ||
                      (t.dni && String(t.dni) === String(student.dni))) &&
                    t.liberaMatricula
                  );

                  return (
                    <div
                      key={student.id}
                      className="bento-card flex flex-col justify-between border-t-4 border-t-emerald-500 bg-white"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">
                            <CheckCircle2 size={12} className="text-emerald-600" />
                            <span>MATRÍCULA CANCELADA</span>
                          </span>
                          <span className="text-xs font-mono font-black text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                            DNI: {student.dni}
                          </span>
                        </div>

                        <h4 className="font-black text-slate-900 text-base leading-snug">
                          {student.nombres} {student.apellidos}
                        </h4>

                        <div className="mt-2 space-y-1 text-xs">
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <GraduationCap size={14} className="text-emerald-600 flex-shrink-0" />
                            <span className="font-semibold text-slate-700 line-clamp-1">{career}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
                            <span>Cód: {student.codigo_estudiante}</span>
                          </div>
                        </div>

                        <div className="mt-4 p-3 rounded-xl text-xs bg-emerald-50/60 border border-emerald-100 text-emerald-800">
                          <span className="font-extrabold block mb-1">MATRÍCULA CANCELADA</span>
                          <span className="font-medium">
                            El estudiante ya realizó el pago correspondiente a su matrícula y no presenta deuda pendiente por este concepto.
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">
                            <Unlock size={12} className="text-emerald-600" />
                            <span>Libre de deuda de matrícula</span>
                          </span>
                          <span className="text-[11px] font-bold text-slate-600">
                            Estado: <span className="text-emerald-700 uppercase">Matrícula Pagada</span>
                          </span>
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setSelectedStudentForDossier(student)}
                          className="py-2.5 px-3 rounded-xl font-bold text-xs bg-blue-50 hover:bg-blue-100 text-primary border border-blue-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
                          title="Ver el historial de pagos del año"
                        >
                          <FileText size={14} />
                          <span>Pagos del Año</span>
                        </button>

                        {comprobanteMatricula ? (
                          <button
                            onClick={() => setViewingReceipt(comprobanteMatricula)}
                            className="py-2.5 px-3 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
                            title="Consultar e imprimir el comprobante original"
                          >
                            <Printer size={14} />
                            <span>Ver Comprobante</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => setSelectedStudentForDossier(student)}
                            className="py-2.5 px-3 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
                            title="Consultar el estado de cuenta"
                          >
                            <FileSpreadsheet size={14} />
                            <span>Estado de Cuenta</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={student.id}
                    className={`bento-card flex flex-col justify-between border-t-4 transition-all duration-300 ${
                      isSelected ? 'ring-2 ring-primary border-primary shadow-lg' : ''
                    } ${
                      isPaid 
                        ? 'border-t-emerald-500 bg-white hover:border-emerald-500' 
                        : 'border-t-amber-400 bg-white hover:border-amber-500'
                    }`}
                  >
                    <div>
                      {/* Top status & DNI badge */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                          isPaid
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {isPaid ? <Unlock size={12} className="text-emerald-600" /> : <Lock size={12} className="text-amber-600" />}
                          <span>{isPaid ? 'Habilitado' : 'Bloqueo Financiero'}</span>
                        </span>

                        <span className="text-xs font-mono font-black text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                          DNI: {student.dni}
                        </span>
                      </div>

                      {/* Student info - NOMBRES COMPLETOS */}
                      <h4 className="font-black text-slate-900 text-base leading-snug">
                        {student.nombres} {student.apellidos}
                      </h4>

                      <div className="mt-2 space-y-1 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <GraduationCap size={14} className="text-primary flex-shrink-0" />
                          <span className="font-semibold text-slate-700 line-clamp-1">{career}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
                          <span>Cód: {student.codigo_estudiante}</span>
                        </div>
                      </div>

                      {/* Aviso de Matrícula */}
                      <div className={`mt-4 p-3 rounded-xl text-xs flex items-center gap-2.5 ${
                        isPaid 
                          ? 'bg-emerald-50/60 border border-emerald-100 text-emerald-800' 
                          : 'bg-amber-50/60 border border-amber-100 text-amber-800'
                      }`}>
                        {isPaid ? (
                          <>
                            <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                            <span className="font-medium text-[11px]">
                              Matrícula 2026-I acreditada. Sin bloqueos.
                            </span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
                            <span className="font-medium text-[11px]">
                              Pendiente de matrícula. Bloqueo activo.
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Botonera de Acción: Ver Pagos del Año + Cobrar */}
                    <div className="mt-5 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setSelectedStudentForDossier(student)}
                        className="py-2.5 px-3 rounded-xl font-bold text-xs bg-blue-50 hover:bg-blue-100 text-primary border border-blue-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Ver todos los pagos que hizo en el año"
                      >
                        <FileText size={14} />
                        <span>Pagos del Año</span>
                      </button>

                      <button
                        onClick={() => setPayingStudent(student)}
                        className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer ${
                          isPaid
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                            : 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-emerald-600/20'
                        }`}
                      >
                        <Banknote size={14} />
                        <span>{isPaid ? 'Cobrar TUPA' : 'Cobrar Matrícula'}</span>
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          ) : (
            /* VISTA EN TABLA */
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Estudiante (Nombres Completos)</th>
                      <th className="py-3.5 px-4">DNI / Código</th>
                      <th className="py-3.5 px-4">Programa de Estudio</th>
                      <th className="py-3.5 px-4">Estado Financiero</th>
                      <th className="py-3.5 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedStudents.map(student => {
                      const career = CAREERS_MAP[student.programa_id] || 'General';
                      const isPaid = student.pago_matricula;
                      const comprobanteMatriculaTabla = isPaid
                        ? transactions.find(t =>
                            (String(t.estudianteId) === String(student.id) ||
                              (t.dni && String(t.dni) === String(student.dni))) &&
                            t.liberaMatricula
                          )
                        : null;
                      return (
                        <tr key={student.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3.5 px-4 font-black text-slate-900">
                            {student.nombres} {student.apellidos}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-600">
                            <span className="font-bold text-slate-800">{student.dni}</span> 
                            <span className="text-slate-400 block text-[10px]">{student.codigo_estudiante}</span>
                          </td>
                          <td className="py-3.5 px-4 font-medium text-slate-700">
                            {career}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              isPaid
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {isPaid ? <Unlock size={10} /> : <Lock size={10} />}
                              <span>{isPaid ? 'Matrícula Pagada' : 'Bloqueado'}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-2">
                            <button
                              onClick={() => setSelectedStudentForDossier(student)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 text-primary hover:bg-blue-100 border border-blue-200 font-bold text-xs transition cursor-pointer"
                              title="Ver pagos del año"
                            >
                              <FileText size={13} />
                              <span>Pagos del Año</span>
                            </button>

                            {isPaid ? (
                              comprobanteMatriculaTabla && (
                                <button
                                  onClick={() => setViewingReceipt(comprobanteMatriculaTabla)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-primary hover:text-white text-slate-700 font-bold text-xs transition cursor-pointer"
                                  title="Ver e imprimir el comprobante original de matrícula"
                                >
                                  <Printer size={13} />
                                  <span>Boleta</span>
                                </button>
                              )
                            ) : (
                              <button
                                onClick={() => setPayingStudent(student)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition cursor-pointer"
                              >
                                <Banknote size={13} />
                                <span>Cobrar TUPA</span>
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
          )}

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <span className="text-xs text-slate-500">
                Página <strong className="text-slate-800">{currentPage}</strong> de {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* 4. CONTENIDO: PESTAÑA 2 - LIBRO DIARIO DE TRANSACCIONES */}
      {activeTab === 'historial' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Barra de Filtros del Libro Diario */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex-1 w-full relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por N° Recibo, Estudiante, DNI o N° Operación..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <select
                value={historyMethodFilter}
                onChange={(e) => setHistoryMethodFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
              >
                <option value="todos">Todos los Métodos de Pago</option>
                <option value="efectivo">Efectivo en Ventanilla</option>
                <option value="banco_nacion">Banco de la Nación</option>
                <option value="yape_plin">Billetera Digital (Yape/Plin)</option>
                <option value="tarjeta_pos">Tarjeta POS</option>
              </select>

              <button
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-xs shadow-sm transition cursor-pointer flex-shrink-0"
              >
                <Download size={14} />
                <span>Exportar CSV</span>
              </button>
            </div>
          </div>

          {/* Tabla de Transacciones */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">N° Recibo</th>
                    <th className="py-3.5 px-4">Fecha y Hora</th>
                    <th className="py-3.5 px-4">Estudiante</th>
                    <th className="py-3.5 px-4">Concepto TUPA</th>
                    <th className="py-3.5 px-4">Método de Pago</th>
                    <th className="py-3.5 px-4 text-right">Monto (S/)</th>
                    <th className="py-3.5 px-4 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        No se encontraron registros en el libro diario.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map(t => (
                      <tr key={t.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-primary-dark">
                          {t.codigoRecibo}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {t.fechaHora}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-900 block">{t.estudianteNombre}</span>
                          <span className="text-[10px] text-slate-400 font-mono">DNI: {t.dni}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-medium text-slate-800 block">{t.conceptoNombre}</span>
                          <span className="text-[10px] text-slate-400">{t.conceptoCategoria}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-700 block">{t.metodoPagoNombre}</span>
                          {t.numeroOperacion && (
                            <span className="text-[10px] font-mono text-indigo-600 block">{t.numeroOperacion}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-sm text-slate-900">
                          S/ {parseFloat(t.monto).toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => setViewingReceipt(t)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-primary hover:text-white text-slate-700 font-semibold text-xs transition cursor-pointer"
                            title="Ver e imprimir boleta oficial"
                          >
                            <Printer size={13} />
                            <span>Boleta</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* 5. CONTENIDO: PESTAÑA 3 - ARQUEO Y CIERRE DE CAJA */}
      {activeTab === 'arqueo' && (
        <div className="space-y-6 animate-fade-in">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Efectivo */}
            <div className="bento-card bg-white border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase">Efectivo en Ventanilla</span>
                <Banknote size={20} className="text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono">
                S/ {arqueoPorMetodo.efectivo.toFixed(2)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Custodia física en caja central</p>
            </div>

            {/* Banco de la Nación */}
            <div className="bento-card bg-white border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase">Banco de la Nación</span>
                <Building2 size={20} className="text-indigo-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono">
                S/ {arqueoPorMetodo.banco_nacion.toFixed(2)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Cta. Cte. N° 00-521-029481</p>
            </div>

            {/* Billeteras Digitales */}
            <div className="bento-card bg-white border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase">Yape / Plin</span>
                <QrCode size={20} className="text-purple-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono">
                S/ {arqueoPorMetodo.yape_plin.toFixed(2)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Transferencias móviles verificadas</p>
            </div>

            {/* Tarjeta POS */}
            <div className="bento-card bg-white border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase">Tarjetas POS</span>
                <CreditCard size={20} className="text-blue-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono">
                S/ {arqueoPorMetodo.tarjeta_pos.toFixed(2)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Cobros vía terminal POS</p>
            </div>

          </div>

          {/* Tarjeta de Control de Cierre de Caja */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 mb-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Caja Abierta · Operativa</span>
              </div>
              <h3 className="font-extrabold text-xl text-slate-900">Cuadre y Arqueo Diario de Tesorería</h3>
              <p className="text-xs text-slate-500 mt-1">
                Responsable de turno: <strong className="text-slate-800">{user?.full_name || 'Cajero Central'}</strong> ({user?.email || 'admin@siga.edu'})
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleExportCSV}
                className="px-5 py-3 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition cursor-pointer"
              >
                Descargar Reporte Detallado
              </button>
              <button
                onClick={() => alert(`Arqueo conforme registrado con éxito.\nTotal recaudado: S/ ${arqueoPorMetodo.total.toFixed(2)}\nComprobantes emitidos: ${transactions.length}`)}
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition cursor-pointer"
              >
                Cierre de Turno y Arqueo Conforme
              </button>
            </div>
          </div>

        </div>
      )}

      {/* MODAL 0: ESTADO DE CUENTA ANUAL / PAGOS DEL AÑO (z-40: queda debajo de los demás modales) */}
      {selectedStudentForDossier && (
        <StudentPaymentsModal
          student={selectedStudentForDossier}
          payments={selectedStudentPayments}
          blocked={showAnnualModal || !!payingStudent || !!viewingReceipt}
          onClose={() => setSelectedStudentForDossier(null)}
          onPay={(stu) => setPayingStudent(stu)}
          onCharge={(stu) => setPayingStudent(stu)}
          onPrintStatement={() => setShowAnnualModal(true)}
          onViewReceipt={(p) => setViewingReceipt(p)}
        />
      )}

      {/* MODAL 1: REGISTRAR COBRO TUPA */}
      {payingStudent && (
        <PaymentModal
          student={payingStudent}
          cashierName={user?.full_name || 'Caja Central'}
          existingTransactions={transactions}
          onClose={() => setPayingStudent(null)}
          onSuccess={handlePaymentSuccess}
          onViewExistingReceipt={(tx) => {
            setPayingStudent(null);
            setViewingReceipt(tx);
          }}
        />
      )}

      {/* MODAL 2: VER / IMPRIMIR RECIBO ELECTRÓNICO */}
      {viewingReceipt && (
        <ReceiptModal
          receipt={viewingReceipt}
          onClose={() => setViewingReceipt(null)}
        />
      )}

      {/* MODAL 3: VER / IMPRIMIR ESTADO DE CUENTA ANUAL CONSOLIDADO */}
      {showAnnualModal && selectedStudentForDossier && (
        <AnnualStatementModal
          student={selectedStudentForDossier}
          payments={selectedStudentPayments}
          onClose={() => setShowAnnualModal(false)}
        />
      )}

      {/* NOTIFICACIÓN TEMPORAL DE PAGO EXITOSO (se oculta sola a los 6 segundos) */}
      {paymentToast && (
        <div className="fixed bottom-6 right-6 z-[60] w-80 p-4 rounded-2xl bg-white border border-emerald-200 shadow-2xl animate-fade-in-up">
          <div className="flex items-start gap-3">
            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700 flex-shrink-0">
              <CheckCircle2 size={18} />
            </span>
            <div className="flex-1 min-w-0">
              <h5 className="font-bold text-sm text-slate-800">Pago registrado con éxito</h5>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Recibo <span className="font-mono font-bold text-slate-700">{paymentToast.codigoRecibo}</span> · S/ {paymentToast.monto.toFixed(2)}
              </p>
              <p className="text-[11px] text-emerald-700 font-semibold mt-1 leading-snug">
                {paymentToast.estudianteNombre} fue retirado de la lista de pendientes de matrícula.
              </p>
            </div>
            <button
              onClick={() => setPaymentToast(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer flex-shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
