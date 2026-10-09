import { useState, useEffect, useRef } from 'react';
import { API_BASE } from '../../core/api/client';
import { useAuth } from '../../core/auth/useAuth';
import mockEvaluacion from './mockEvaluacion.json';

const SECTION_TITLE = "text-[11px] font-bold text-slate-500 uppercase tracking-[0.15em]";

/* Estado vacío del módulo: réplica visual (solo JSX/CSS) de la referencia.
   No toca lógica: se renderiza únicamente cuando aún no hay estudiante seleccionado. */
function BoletinEmptyState() {
  const cursos = [
    { nombre: 'Programación', nota: '18', pct: '90%', bar: 'bg-teal-400/90' },
    { nombre: 'Base de Datos', nota: '16', pct: '80%', bar: 'bg-blue-500/90' },
    { nombre: 'Diseño Web', nota: '17', pct: '85%', bar: 'bg-violet-500/90' },
    { nombre: 'Redes', nota: '15', pct: '75%', bar: 'bg-amber-500/90' },
    { nombre: 'Análisis de Sistemas', nota: '19', pct: '95%', bar: 'bg-cyan-400/90' },
  ];
  const chips = [
    { label: 'DNI', icon: 'M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1zm3 4a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm-1 6h4m5-6h4m-4 3h4m-4 3h4', color: 'text-blue-500' },
    { label: 'Código', icon: 'M8 9l-3 3 3 3m8-6l3 3-3 3M13 5l-2 14', color: 'text-emerald-600' },
    { label: 'Nombre completo', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', color: 'text-amber-500' },
    { label: 'Búsqueda por voz', icon: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z', color: 'text-violet-500' },
    { label: 'Historial académico', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-slate-500' },
  ];
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-5 py-8 sm:px-8 text-center shadow-[0_24px_60px_-24px_rgba(100,116,139,0.25)]">
      {/* Iluminación mínima: halo tenue + viñeta clara */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-48 w-[36rem] -translate-x-1/2 rounded-full bg-amber-200/30 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-200/60 to-transparent" />
      </div>

      <div className="relative">
        {/* Escena: observaciones / libros+laptop / boletín / créditos+historial */}
        <div className="relative mx-auto flex max-w-[760px] items-end justify-center gap-3 sm:gap-0">
          {/* Hojas decorativas */}
          <div aria-hidden="true" className="pointer-events-none absolute -left-2 bottom-6 hidden opacity-40 md:block">
            <div className="h-16 w-3 rotate-[-24deg] rounded-full bg-emerald-600/15" />
            <div className="ml-3 -mt-10 h-12 w-3 rotate-[-40deg] rounded-full bg-emerald-600/10" />
          </div>
          <div aria-hidden="true" className="pointer-events-none absolute -right-2 bottom-10 hidden opacity-40 md:block">
            <div className="h-16 w-3 rotate-[24deg] rounded-full bg-emerald-600/15" />
            <div className="mr-3 -mt-10 ml-auto h-12 w-3 rotate-[40deg] rounded-full bg-emerald-600/10" />
          </div>

          {/* Tarjeta Observaciones (fondo, izquierda) */}
          <div className="absolute left-2 top-8 hidden w-40 -rotate-6 rounded-xl border border-[#DDE3EA] bg-white p-3 text-left shadow-[0_10px_30px_-12px_rgba(100,116,139,0.25)] lg:block">
            <div className="mb-2 flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-md border border-amber-300/60 bg-amber-100">
                <svg className="h-3 w-3 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M9 8h6M5 3h14a1 1 0 011 1v16a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1z" /></svg>
              </span>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#1F2937]">Observaciones</p>
            </div>
            <div className="space-y-1.5">
              <div className="h-1.5 w-full rounded bg-slate-200" />
              <div className="h-1.5 w-5/6 rounded bg-slate-200/80" />
              <div className="h-1.5 w-4/6 rounded bg-slate-100" />
            </div>
          </div>

          {/* Libros + laptop grandes (decorado, izquierda) */}
          <div aria-hidden="true" className="pointer-events-none relative z-10 hidden w-64 shrink-0 items-end md:flex -mr-8">
            {/* Fondo integrado: silueta académica + follaje + luz dorada tenue */}
            <svg className="absolute -left-5 -top-12 h-24 w-24 rotate-[-10deg] text-slate-400/20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" /></svg>
            <div className="absolute -left-2 bottom-0 opacity-70">
              <div className="h-24 w-3 rotate-[-18deg] rounded-full bg-slate-300" />
              <div className="ml-3 -mt-16 h-16 w-2.5 rotate-[-36deg] rounded-full bg-slate-200" />
              <div className="-ml-1 -mt-12 h-12 w-2 rotate-[-4deg] rounded-full bg-[#c9d2c0]" />
            </div>
            {/* Tarjeta secundaria con contenido, detrás de la laptop */}
            <div className="absolute -top-7 right-4 z-0 w-32 rotate-[5deg] rounded-xl border border-[#DDE3EA] bg-white/95 p-2.5 text-left opacity-90 shadow-[0_10px_30px_-12px_rgba(100,116,139,0.3)]">
              <p className="text-[8px] font-extrabold uppercase tracking-[0.18em] text-[#64748B]">Periodo actual</p>
              <p className="mt-0.5 text-sm font-extrabold text-[#111827]">2026-I</p>
              <div className="mt-1.5 space-y-1 border-t border-slate-200 pt-1.5">
                <p className="text-[9px] font-semibold text-[#64748B]">5 módulos</p>
                <p className="text-[9px] font-semibold text-[#64748B]">20 créditos</p>
              </div>
            </div>
            <div className="mb-1 w-32">
              <div className="rounded-sm border border-slate-200 border-l-4 border-l-cyan-500/60 bg-white px-2 py-1.5 text-left shadow-sm"><p className="text-[8px] font-bold uppercase tracking-[0.14em] text-[#64748B]">Desarrollo</p></div>
              <div className="rounded-sm border border-slate-200 border-l-4 border-l-amber-500/70 bg-white px-2 py-1.5 text-left shadow-sm"><p className="text-[8px] font-bold uppercase tracking-[0.14em] text-amber-600">Base de datos</p></div>
              <div className="rounded-sm border border-slate-200 border-l-4 border-l-blue-500/60 bg-white px-2 py-1.5 text-left shadow-sm"><p className="text-[8px] font-bold uppercase tracking-[0.14em] text-[#64748B]">Redes</p></div>
            </div>
            <div className="-ml-8 mb-1">
              <div className="w-52 overflow-hidden rounded-t-md border border-[#DDE3EA] bg-white px-3 pb-2 pt-1.5 shadow-sm">
                <div className="mb-1.5 flex gap-1"><span className="h-1 w-1 rounded-full bg-red-400" /><span className="h-1 w-1 rounded-full bg-amber-400" /><span className="h-1 w-1 rounded-full bg-emerald-500" /></div>
                <div className="space-y-1.5">
                  <div className="h-1 w-11/12 rounded-sm bg-cyan-500/70" />
                  <div className="h-1 w-3/4 rounded-sm bg-violet-500/70" />
                  <div className="h-1 w-5/6 rounded-sm bg-amber-500/70" />
                  <div className="h-1 w-2/3 rounded-sm bg-blue-500/70" />
                  <div className="h-1 w-4/5 rounded-sm bg-emerald-500/60" />
                  <div className="h-1 w-3/5 rounded-sm bg-slate-400/70" />
                </div>
              </div>
              <div className="h-1.5 w-56 -translate-x-1 rounded-b-lg bg-gradient-to-b from-slate-300 to-slate-400" />
            </div>
            {/* Portalápices + resplandor cálido como en la referencia */}
            <div className="-ml-7 mb-1 hidden w-8 items-end justify-center lg:flex">
              <div className="relative flex h-11 w-7 items-end justify-center overflow-visible rounded-b-md border border-[#DDE3EA] bg-white pb-0 shadow-sm">
                <span className="absolute -top-3 left-1 h-5 w-[3px] rotate-[-8deg] rounded-full bg-amber-500/80" />
                <span className="absolute -top-3.5 left-3 h-6 w-[3px] rotate-[4deg] rounded-full bg-slate-500/80" />
                <span className="absolute -top-2.5 right-1 h-4 w-[3px] rotate-[12deg] rounded-full bg-cyan-600/70" />
              </div>
            </div>
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-4 left-10 h-16 w-72 rounded-full bg-amber-200/50 blur-2xl" />
          </div>

          {/* Tarjeta central: Boletín de Estudiante */}
          <div className="relative z-20 w-full max-w-[310px] shrink-0 rounded-2xl border border-[#DDE3EA] bg-white p-4 text-left shadow-[0_18px_45px_-15px_rgba(100,116,139,0.35)] sm:-mx-2">
            <span aria-hidden="true" className="absolute -top-[3px] left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-amber-300/60 bg-amber-100">
                <svg className="h-3.5 w-3.5 text-amber-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" /></svg>
              </span>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#1F2937]">Boletín de Estudiante</p>
            </div>
            <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#64748B]">Módulo</p>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#64748B]">Nota (20)</p>
              </div>
              <div className="space-y-2.5">
                {cursos.map((c) => (
                  <div key={c.nombre}>
                    <div className="mb-1 flex items-baseline justify-between gap-2">
                      <p className="truncate text-xs font-semibold text-[#1F2937]">{c.nombre}</p>
                      <p className="shrink-0 text-xs font-bold text-[#111827]">{c.nota}</p>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                      <div className={`h-full rounded-full ${c.bar}`} style={{ width: c.pct }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Columna derecha: Créditos + Historial */}
          <div className="relative z-10 flex w-44 shrink-0 flex-col gap-4 sm:-ml-2">
            <div className="rounded-2xl border border-[#DDE3EA] bg-white p-3 text-left shadow-[0_10px_30px_-12px_rgba(100,116,139,0.25)]">
              <div className="mb-2 flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-slate-100">
                  <svg className="h-3 w-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l9 5-9 5-9-5 9-5zm0 0v2m9 3l-9 5-9-5m18 5l-9 5-9-5" /></svg>
                </span>
                <p className="text-[8px] font-extrabold uppercase tracking-[0.14em] text-[#1F2937]">Créditos Académicos</p>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="relative h-16 w-16 shrink-0">
                  <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(100,116,139,0.15)" strokeWidth="8" />
                    <circle cx="32" cy="32" r="26" fill="none" stroke="#2dd4bf" strokeWidth="8" strokeLinecap="round" strokeDasharray="117.8 163.4" />
                    <circle cx="32" cy="32" r="26" fill="none" stroke="#3b82f6" strokeWidth="8" strokeDasharray="30 163.4" strokeDashoffset="-117.8" />
                    <circle cx="32" cy="32" r="26" fill="none" stroke="#f59e0b" strokeWidth="8" strokeDasharray="15.6 163.4" strokeDashoffset="-147.8" />
                  </svg>
                  <p className="absolute inset-0 flex items-center justify-center text-[13px] font-extrabold text-[#111827]">72%</p>
                </div>
                <div className="space-y-1">
                  {[
                    { dot: 'bg-emerald-400', label: 'Aprobados', val: '72' },
                    { dot: 'bg-blue-400', label: 'En curso', val: '22' },
                    { dot: 'bg-amber-400', label: 'Pendientes', val: '6' },
                  ].map((l) => (
                    <div key={l.label} className="flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${l.dot}`} />
                      <p className="text-[9px] font-medium text-[#64748B]">{l.label}</p>
                      <p className="ml-auto pl-2 text-[9px] font-bold text-[#111827]">{l.val}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#DDE3EA] bg-white p-3 text-left shadow-[0_10px_30px_-12px_rgba(100,116,139,0.25)]">
              <div className="mb-2 flex items-center gap-1.5">
                <svg className="h-3.5 w-3 text-slate-500" fill="currentColor" viewBox="0 0 12 12"><rect x="0" y="6" width="2" height="6" rx="0.5" opacity="0.45" /><rect x="3" y="3" width="2" height="9" rx="0.5" opacity="0.6" /><rect x="6" y="7" width="2" height="5" rx="0.5" opacity="0.5" /><rect x="9" y="1" width="2" height="11" rx="0.5" /></svg>
                <p className="text-[8px] font-extrabold uppercase tracking-[0.14em] text-[#1F2937]">Historial Académico</p>
              </div>
              <div className="flex h-12 items-end justify-between gap-1.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 pb-2 pt-2">
                {[45, 60, 40, 70, 55, 85, 95].map((h, i) => (
                  <div key={i} className={`flex-1 rounded-[3px] ${i >= 4 ? 'bg-gradient-to-t from-amber-500 to-amber-300' : 'bg-slate-300'}`} style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Textos */}
        <h2 className="mt-7 text-xl font-extrabold tracking-tight text-[#1F2937] sm:text-2xl">
          Selecciona un estudiante para comenzar
        </h2>
        <p className="mx-auto mt-1.5 max-w-xl text-sm leading-relaxed text-[#64748B]">
          Consulta sus notas, créditos, historial académico y observaciones en un solo lugar.
        </p>

        {/* Chips */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
          {chips.map((chip) => (
            <span key={chip.label} className="inline-flex items-center gap-2 rounded-full border border-[#D7DEE7] bg-white px-4 py-1.5 text-xs font-medium text-[#374151] shadow-sm">
              <svg className={`h-4 w-4 ${chip.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={chip.icon} /></svg>
              {chip.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}


export function StudentReportCard() {
  const { user } = useAuth();
  const userRoles = user?.roles ? user.roles.map(r => typeof r === 'string' ? r : r.nombre || r.name) : [];
  const primaryRole = user?.is_superuser ? 'superadmin' : (userRoles.length > 0 ? userRoles[0] : (user?.role || 'invitado'));
  const isAdmin = primaryRole !== 'estudiante';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [periodoId, setPeriodoId] = useState('');
  const [periodos, setPeriodos] = useState([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [allStudents, setAllStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [selectedStudentName, setSelectedStudentName] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);

  const [recentStudents, setRecentStudents] = useState(() => {
    try { const parsed = JSON.parse(localStorage.getItem('boletin_recent') || '[]'); return Array.isArray(parsed) ? parsed.slice(0, 3) : []; } catch { return []; }
  });

  useEffect(() => {
    const fetchPeriodos = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/mod-programas-estudio/periodos`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) {
          const perData = await res.json();
          setPeriodos(perData);
          const activo = perData.find(p => p.estado === 'en_curso' || p.estado === 'matricula_abierta');
          if (activo) setPeriodoId(String(activo.id));
          else if (perData.length > 0) setPeriodoId(String(perData[0].id));
        }
      } catch (e) { console.error('Error fetching periodos', e); }
    };
    fetchPeriodos();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    const fetchStudents = async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/mod-gestion-academica/estudiantes/`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) {
          const data = await res.json();
          setAllStudents(Array.isArray(data) ? data : []);
        }
      } catch (e) { console.error('Error fetching students', e); }
      setSearchLoading(false);
    };
    fetchStudents();
  }, [isAdmin]);

  useEffect(() => {
    if (searchTerm.length >= 3) {
      const val = searchTerm.trim().toLowerCase();
      const term = searchTerm.trim();
      const filtered = allStudents.filter(s => {
        const nombres = (s.nombres || '').toLowerCase();
        const apellidos = (s.apellidos || '').toLowerCase();
        const nombreCompleto = `${s.nombres || ''} ${s.apellidos || ''}`.trim().toLowerCase();
        const nombreInverso = `${s.apellidos || ''} ${s.nombres || ''}`.trim().toLowerCase();
        return (
          (s.dni && s.dni.includes(term)) ||
          (nombres && nombres.includes(val)) ||
          (apellidos && apellidos.includes(val)) ||
          (nombreCompleto && nombreCompleto.includes(val)) ||
          (nombreInverso && nombreInverso.includes(val)) ||
          (s.codigo_estudiante && s.codigo_estudiante.toLowerCase().includes(val))
        );
      });
      setFilteredStudents(filtered);
      setShowDropdown(true);
    } else {
      setFilteredStudents([]);
      setShowDropdown(false);
    }
  }, [searchTerm, allStudents]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectStudent = (student) => {
    setSelectedStudentId(student.id);
    setSelectedStudentName(`${student.apellidos}, ${student.nombres}`);
    setSearchTerm('');
    setShowDropdown(false);
    setData(null);
    setError(null);

    const entry = { id: student.id, nombres: student.nombres, apellidos: student.apellidos, codigo_estudiante: student.codigo_estudiante };
    setRecentStudents(prev => {
      const filtered = prev.filter(s => s.id !== student.id);
      const updated = [entry, ...filtered].slice(0, 3);
      localStorage.setItem('boletin_recent', JSON.stringify(updated));
      return updated;
    });
  };

  const handleClearSelection = () => {
    setSelectedStudentId(null);
    setSelectedStudentName('');
    setSearchTerm('');
    setData(null);
    setError(null);
  };

  const handleRemoveRecent = (event, studentId) => {
    event.stopPropagation();
    setRecentStudents(prev => {
      const updated = prev.filter(s => s.id !== studentId).slice(0, 3);
      localStorage.setItem('boletin_recent', JSON.stringify(updated));
      return updated;
    });
  };

  const effectiveStudentId = isAdmin ? selectedStudentId : user?.id;

  useEffect(() => {
    if (!periodoId || !effectiveStudentId) {
      setLoading(false);
      return;
    }
    const fetchBoletin = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${API_BASE}/api/mod-gestion-academica/estudiantes/${effectiveStudentId}/boletin?periodo_id=${periodoId}`,
          { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }
        );
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || 'No se pudo cargar el boletín');
        }
        const real = await res.json();
        const evaluacion = mockEvaluacion.evaluaciones.find(
          e => e.codigo_estudiante === real.estudiante.codigo_estudiante
            && e.periodo === real.estudiante.periodo_codigo
        );
        setData(evaluacion ? { ...real, ...evaluacion } : real);
      } catch (e) { setError(e.message); }
      setLoading(false);
    };
    fetchBoletin();
  }, [periodoId, effectiveStudentId]);

  const Membrete = () => (
    <div className="text-center mb-8">
      <div className="flex items-center justify-center gap-3 mb-2">
        <span className="text-3xl">🎓</span>
        <h1 className="text-2xl md:text-3xl font-extrabold text-primary tracking-wide">SIGA</h1>
      </div>
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.25em] mb-4">Sistema de Gestión Académica</p>
      <div className="w-full h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent mb-4"></div>
      <h2 className="text-sm font-bold text-slate-700 uppercase tracking-[0.2em]">Boletín de Notas Oficial</h2>
      <div className="w-16 h-0.5 bg-primary mx-auto mt-3"></div>
    </div>
  );

  if (loading) {
    return (
      <div className="animate-fade-in max-w-4xl mx-auto">
        <Membrete />
        <div className="space-y-5">
          {/* Skeleton: Datos del estudiante */}
          <div className="bg-white border border-slate-200 rounded-md p-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-slate-100 animate-pulse flex-shrink-0"></div>
              <div className="flex-1 text-center md:text-left space-y-3">
                <div className="h-6 bg-slate-100 rounded w-64 mx-auto md:mx-0 animate-pulse"></div>
                <div className="h-4 bg-slate-100 rounded w-48 mx-auto md:mx-0 animate-pulse"></div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="space-y-1">
                      <div className="h-2.5 bg-slate-100 rounded w-14 mx-auto md:mx-0 animate-pulse"></div>
                      <div className="h-3.5 bg-slate-100 rounded w-20 mx-auto md:mx-0 animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* Skeleton: Estado de matrícula */}
          <div className="bg-white border border-slate-200 rounded-md p-5">
            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded bg-slate-100 animate-pulse flex-shrink-0"></div>
              <div className="flex-1 space-y-3">
                <div className="h-4 bg-slate-100 rounded w-36 animate-pulse"></div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="space-y-1">
                      <div className="h-2.5 bg-slate-100 rounded w-12 animate-pulse"></div>
                      <div className="h-3.5 bg-slate-100 rounded w-20 animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* Skeleton: Progreso */}
          <div className="bg-white border border-slate-200 rounded-md p-5">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-9 h-9 rounded bg-slate-100 animate-pulse flex-shrink-0"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-100 rounded w-40 animate-pulse"></div>
                <div className="h-3 bg-slate-100 rounded w-56 animate-pulse"></div>
              </div>
              <div className="h-7 bg-slate-100 rounded w-14 animate-pulse"></div>
            </div>
            <div className="w-full bg-slate-100 rounded h-2 animate-pulse"></div>
          </div>
          {/* Skeleton: Tabla */}
          <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 p-4">
              <div className="h-4 bg-slate-200 rounded w-36 animate-pulse"></div>
            </div>
            <div className="divide-y divide-slate-100">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3">
                  <div className="h-3.5 bg-slate-100 rounded flex-1 animate-pulse"></div>
                  <div className="h-3.5 bg-slate-100 rounded w-10 animate-pulse"></div>
                  <div className="h-3.5 bg-slate-100 rounded w-10 animate-pulse"></div>
                  <div className="h-3.5 bg-slate-100 rounded w-10 animate-pulse"></div>
                  <div className="h-3.5 bg-slate-100 rounded w-10 animate-pulse"></div>
                  <div className="h-4 bg-slate-100 rounded w-12 animate-pulse"></div>
                  <div className="h-5 bg-slate-100 rounded-full w-16 animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
          {/* Skeleton: Resumen */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-md p-5 text-center space-y-2">
                <div className="h-2.5 bg-slate-100 rounded w-24 mx-auto animate-pulse"></div>
                <div className="h-9 bg-slate-100 rounded w-14 mx-auto animate-pulse"></div>
                <div className="h-2.5 bg-slate-100 rounded w-20 mx-auto animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in max-w-4xl mx-auto">
        <Membrete />
        {isAdmin && (
          <div className="mb-6" ref={searchRef}>
            <StudentSearchBar
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              filteredStudents={filteredStudents}
              showDropdown={showDropdown}
              onSelect={handleSelectStudent}
              searchLoading={searchLoading}
              recentStudents={recentStudents}
              setShowDropdown={setShowDropdown}
              onRemoveRecent={handleRemoveRecent}
            />
          </div>
        )}
        <div className="bg-white border border-slate-200 rounded-md py-16 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-slate-700 font-semibold">{error}</p>
          <p className="text-slate-400 text-sm mt-2">Verifica que existan matrículas y evaluaciones registradas para este periodo.</p>
        </div>
      </div>
    );
  }

  if (isAdmin && !selectedStudentId) {
    return (
      <div className="animate-fade-in max-w-4xl mx-auto">
        <Membrete />
        <div ref={searchRef} className="mb-6">
          <StudentSearchBar
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filteredStudents={filteredStudents}
            showDropdown={showDropdown}
            onSelect={handleSelectStudent}
            searchLoading={searchLoading}
            recentStudents={recentStudents}
            setShowDropdown={setShowDropdown}
            onRemoveRecent={handleRemoveRecent}
          />
        </div>
        <BoletinEmptyState />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="animate-fade-in max-w-4xl mx-auto">
        <Membrete />
        {isAdmin && (
          <div className="mb-6" ref={searchRef}>
            <StudentSearchBar
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              filteredStudents={filteredStudents}
              showDropdown={showDropdown}
              onSelect={handleSelectStudent}
              searchLoading={searchLoading}
              recentStudents={recentStudents}
              setShowDropdown={setShowDropdown}
              onRemoveRecent={handleRemoveRecent}
            />
          </div>
        )}
        <div className="bg-white border border-slate-200 rounded-md py-16 text-center">
          <div className="text-4xl mb-3 opacity-30">📄</div>
          <p className="text-slate-600 font-medium">No hay información disponible.</p>
        </div>
      </div>
    );
  }

  const { estudiante, matricula_estado, estado_academico, progreso_creditos, cursos_periodo, resumen, historial, observaciones } = data;

  const getGradeColor = (val) => {
    if (val === null || val === undefined) return 'text-slate-400';
    return val >= 13 ? 'text-emerald-700 font-bold' : 'text-red-600 font-bold';
  };

  const getBadgeColor = (estado) => {
    if (estado === 'aprobado') return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    if (estado === 'desaprobado') return 'bg-red-50 text-red-700 border border-red-200';
    return 'bg-slate-50 text-slate-600 border border-slate-200';
  };

  const handlePrint = () => window.print();

  return (
    <div className="animate-fade-in max-w-4xl mx-auto boletin-container">

      {/* Print-only header */}
      <div className="boletin-header-print print-only">
        <div>
          <p className="text-sm font-bold text-slate-800">SIGA — Sistema de Gestión Académica</p>
          <p className="text-xs text-slate-500">Boletín de Notas Oficial</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Emisión: {estudiante?.fecha_emision}</p>
          <p className="text-xs text-slate-500">Periodo: {estudiante?.periodo_codigo}</p>
        </div>
      </div>

      {/* Membrete */}
      <Membrete />

      {isAdmin && selectedStudentName && (
        <div className="no-print mb-6 bg-white border border-slate-200 rounded-md px-4 py-2.5 flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Viendo boletín de: <span className="font-semibold text-slate-900">{selectedStudentName}</span>
          </p>
          <button
            onClick={handleClearSelection}
            className="text-xs font-semibold text-primary hover:text-primary-dark underline cursor-pointer ml-4 whitespace-nowrap"
          >
            Cambiar estudiante
          </button>
        </div>
      )}

      {isAdmin && !selectedStudentName && (
        <div ref={searchRef} className="no-print mb-6">
          <StudentSearchBar
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filteredStudents={filteredStudents}
            showDropdown={showDropdown}
            onSelect={handleSelectStudent}
            searchLoading={searchLoading}
            recentStudents={recentStudents}
            setShowDropdown={setShowDropdown}
            onRemoveRecent={handleRemoveRecent}
          />
        </div>
      )}

      {/* Selector de Periodo + Botón Imprimir */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6 no-print">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.15em]">Periodo:</label>
        <select
          className="input-field py-2 text-sm min-w-[160px]"
          value={periodoId}
          onChange={(e) => setPeriodoId(e.target.value)}
        >
          {periodos.map(p => (
            <option key={p.id} value={p.id}>{p.codigo}</option>
          ))}
        </select>
        <button onClick={handlePrint} className="btn-primary text-sm px-4 py-2 flex items-center gap-2 ml-auto">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
          Imprimir Boletín
        </button>
      </div>

      {/* SECCION 1: Datos del Estudiante */}
      <div className="bg-white border border-slate-200 border-l-4 border-l-primary rounded-md p-6 mb-5 boletin-section">
        <p className={`${SECTION_TITLE} mb-4 pb-2 border-b border-slate-100`}>Datos del Estudiante</p>
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center text-3xl flex-shrink-0">
            {estudiante.foto_url ? (
              <img src={estudiante.foto_url} alt="Foto" className="w-full h-full rounded-full object-cover" />
            ) : '🎓'}
          </div>
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">{estudiante.apellidos}, {estudiante.nombres}</h2>
            <p className="text-slate-500 text-sm mt-0.5">{estudiante.programa_nombre}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 mt-4">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-[0.15em]">Código</p>
                <p className="font-semibold text-slate-800 text-sm">{estudiante.codigo_estudiante}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-[0.15em]">DNI</p>
                <p className="font-semibold text-slate-800 text-sm">{estudiante.dni}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-[0.15em]">Celular</p>
                <p className="font-semibold text-slate-800 text-sm">{estudiante.celular || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-[0.15em]">Email</p>
                <p className="font-semibold text-slate-800 text-sm truncate" title={estudiante.email_personal}>{estudiante.email_personal || '-'}</p>
              </div>
            </div>
          </div>
          <div className="text-center min-w-[130px] flex-shrink-0 border-l border-slate-200 pl-6">
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-[0.15em] mb-1">Periodo</p>
            <p className="text-lg font-extrabold text-slate-900">{estudiante.periodo_codigo}</p>
            <p className="text-[10px] text-slate-400 mt-1.5">Emisión: {estudiante.fecha_emision}</p>
          </div>
        </div>
      </div>

      {/* RESUMEN EN LENGUAJE NATURAL (solo Admin) */}
      {isAdmin && (
        <div className="bg-primary/5 border border-primary/20 rounded-md px-5 py-4 mb-5 boletin-section">
          <p className="text-sm text-slate-700 leading-relaxed">
            <span className="font-bold text-slate-900">{estudiante.apellidos}, {estudiante.nombres}</span>
            {cursos_periodo.length === 0 ? (
              <> aún no tiene notas registradas para este periodo.</>
            ) : (
              <>
                {' '}lleva <span className="font-bold text-primary">{progreso_creditos.creditos_aprobados}</span> de <span className="font-bold">{progreso_creditos.creditos_totales}</span> créditos aprobados (<span className="font-bold text-primary">{progreso_creditos.porcentaje}%</span>).
                Este periodo tiene <span className="font-bold text-emerald-700">{resumen.cursos_aprobados}</span> curso{resumen.cursos_aprobados !== 1 ? 's' : ''} aprobado{resumen.cursos_aprobados !== 1 ? 's' : ''} y <span className="font-bold text-red-600">{resumen.cursos_desaprobados}</span> desaprobado{resumen.cursos_desaprobados !== 1 ? 's' : ''}, con un promedio de <span className="font-bold">{resumen.promedio_general ?? '-'}</span>.
                {' '}Su matrícula está{' '}
                {matricula_estado.pago_matricula ? (
                  <span className="font-bold text-emerald-700">pagada</span>
                ) : (
                  <span className="font-bold text-amber-600">pendiente de pago</span>
                )}.
                {resumen.cursos_desaprobados > 0 && (
                  <span className="block mt-2 text-amber-700 font-semibold">⚠️ Requiere seguimiento por cursos desaprobados.</span>
                )}
              </>
            )}
          </p>
        </div>
      )}

      {/* SECCION 2: Estado de Matrícula */}
      <div className={`bg-white border rounded-md p-5 mb-5 boletin-section ${matricula_estado.pago_matricula ? 'border-emerald-200' : 'border-amber-200'}`}>
        <div className="flex items-start gap-4">
          <div className={`w-9 h-9 rounded flex items-center justify-center flex-shrink-0 text-sm font-bold ${matricula_estado.pago_matricula ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
            {matricula_estado.pago_matricula ? '✓' : '⚠'}
          </div>
          <div className="flex-1">
            <p className={`${SECTION_TITLE} mb-3`}>Estado de Matrícula</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 text-sm">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-[0.15em]">Pago</p>
                <p className={`font-semibold ${matricula_estado.pago_matricula ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {matricula_estado.pago_matricula ? 'Pagado' : 'Pendiente'}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-[0.15em]">Tipo Ingreso</p>
                <p className="font-semibold text-slate-800">{matricula_estado.tipo_ingreso || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-[0.15em]">Estado</p>
                <p className="font-semibold text-slate-800 capitalize">{matricula_estado.estado_matricula}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-[0.15em]">Fin Mat. Regular</p>
                <p className="font-semibold text-slate-800 text-xs">{matricula_estado.fecha_fin_matricula_regular ? new Date(matricula_estado.fecha_fin_matricula_regular).toLocaleDateString() : 'N/A'}</p>
              </div>
            </div>
            {!matricula_estado.pago_matricula && (
              <p className="text-amber-700 text-xs mt-3 font-medium bg-amber-50 border border-amber-200 px-3 py-1.5 rounded inline-block">
                La matrícula tiene pagos pendientes.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* SECCION 3: Estado Académico */}
      <div className="bg-white border border-slate-200 border-l-4 border-l-blue-500 rounded-md p-5 mb-5 boletin-section">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 rounded bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center flex-shrink-0 text-sm">📋</div>
          <div>
            <p className={`${SECTION_TITLE}`}>Estado Académico</p>
            <p className="text-sm text-slate-700 capitalize mt-0.5 font-semibold">{estado_academico}</p>
          </div>
        </div>
      </div>

      {/* SECCION 4: Progreso de Créditos */}
      <div className="bg-white border border-slate-200 border-l-4 border-l-purple-500 rounded-md p-5 mb-5 boletin-section">
        <div className="flex items-center gap-4 mb-3">
          <div className="w-9 h-9 rounded bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center flex-shrink-0 text-sm">📊</div>
          <div className="flex-1">
            <p className={`${SECTION_TITLE}`}>Progreso de Créditos</p>
            <p className="text-sm text-slate-500 mt-0.5">
              {progreso_creditos.creditos_aprobados} de {progreso_creditos.creditos_totales} créditos aprobados
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-extrabold text-purple-600">{progreso_creditos.porcentaje}<span className="text-sm font-bold text-purple-400">%</span></span>
          </div>
        </div>
        <div className="w-full bg-slate-100 rounded h-2 overflow-hidden progress-bar-print-hide">
          <div
            className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded transition-all duration-500"
            style={{ width: `${progreso_creditos.porcentaje}%` }}
          ></div>
        </div>
        <p className="text-sm text-slate-600 font-semibold progress-text-print">
          {progreso_creditos.creditos_aprobados} de {progreso_creditos.creditos_totales} créditos aprobados ({progreso_creditos.porcentaje}%)
        </p>
      </div>

      {/* SECCION 5: Notas por Curso */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden mb-5 boletin-section">
        <div className="bg-slate-800 text-white px-5 py-3.5 flex justify-between items-center">
          <h4 className="font-bold flex items-center text-sm uppercase tracking-wider">
            <span className="mr-2">📚</span> Notas del Periodo
          </h4>
          <span className="text-xs text-slate-300 font-medium">{cursos_periodo.length} cursos</span>
        </div>
        {cursos_periodo.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-slate-400 font-medium text-sm">No hay cursos registrados para este periodo.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left boletin-table">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-2.5 px-4 font-bold text-slate-500 uppercase text-[10px] tracking-[0.15em]">Curso / Unidad Didáctica</th>
                  <th className="py-2.5 px-3 font-bold text-slate-500 uppercase text-[10px] tracking-[0.15em] text-center">Créditos</th>
                  <th className="py-2.5 px-3 font-bold text-slate-500 uppercase text-[10px] tracking-[0.15em] text-center">Cap. 1</th>
                  <th className="py-2.5 px-3 font-bold text-slate-500 uppercase text-[10px] tracking-[0.15em] text-center">Cap. 2</th>
                  <th className="py-2.5 px-3 font-bold text-slate-500 uppercase text-[10px] tracking-[0.15em] text-center">Cap. 3</th>
                  <th className="py-2.5 px-3 font-bold text-slate-700 uppercase text-[10px] tracking-[0.15em] text-center bg-slate-100">Final</th>
                  <th className="py-2.5 px-3 font-bold text-slate-500 uppercase text-[10px] tracking-[0.15em] text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cursos_periodo.map((curso, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-2.5 px-4 font-medium text-slate-800 text-sm">{curso.unidad_nombre}</td>
                    <td className="py-2.5 px-3 text-center text-slate-500 text-sm">{curso.creditos}</td>
                    <td className={`py-2.5 px-3 text-center text-sm ${getGradeColor(curso.nota_c1)}`}>
                      {curso.nota_c1 ?? '-'}
                    </td>
                    <td className={`py-2.5 px-3 text-center text-sm ${getGradeColor(curso.nota_c2)}`}>
                      {curso.nota_c2 ?? '-'}
                    </td>
                    <td className={`py-2.5 px-3 text-center text-sm ${getGradeColor(curso.nota_c3)}`}>
                      {curso.nota_c3 ?? '-'}
                    </td>
                    <td className={`py-2.5 px-3 text-center text-base bg-slate-50/80 font-bold ${getGradeColor(curso.nota_final)}`}>
                      {curso.nota_final ?? '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getBadgeColor(curso.estado)}`}>
                        {curso.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECCION 6: Resumen del Rendimiento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5 boletin-section">
        <div className="bg-white border border-slate-200 border-t-4 border-t-primary rounded-md p-5 text-center">
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-[0.15em] mb-2">Promedio General</p>
          <p className={`text-4xl font-extrabold ${getGradeColor(resumen.promedio_general)}`}>
            {resumen.promedio_general ?? '-'}
          </p>
          <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">de 20 puntos</p>
        </div>
        <div className="bg-white border border-slate-200 border-t-4 border-t-emerald-500 rounded-md p-5 text-center">
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-[0.15em] mb-2">Aprobados</p>
          <p className="text-4xl font-extrabold text-emerald-700">{resumen.cursos_aprobados}</p>
          <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">de {resumen.total_cursos} cursos</p>
        </div>
        <div className="bg-white border border-slate-200 border-t-4 border-t-red-500 rounded-md p-5 text-center">
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-[0.15em] mb-2">Desaprobados</p>
          <p className="text-4xl font-extrabold text-red-600">{resumen.cursos_desaprobados}</p>
          <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">de {resumen.total_cursos} cursos</p>
        </div>
      </div>

      {/* SECCION 7: Historial + Observaciones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8 boletin-section">
        {/* Historial */}
        <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
          <div className="bg-slate-800 text-white px-5 py-3">
            <h4 className="font-bold flex items-center text-sm uppercase tracking-wider">
              <span className="mr-2">📅</span> Historial de Periodos
            </h4>
          </div>
          {historial.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-slate-400 text-sm">Sin periodos anteriores registrados.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {historial.map((h, idx) => (
                <div key={idx} className="px-5 py-3 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-800 text-sm">{h.periodo_codigo}</span>
                    <span className={`text-lg font-extrabold ${getGradeColor(h.promedio)}`}>
                      {h.promedio ?? '-'}
                    </span>
                  </div>
                  <div className="flex gap-4 text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                    <span className="text-emerald-700">✓ {h.cursos_aprobados} aprobados</span>
                    <span className="text-red-600">✗ {h.cursos_desaprobados} desaprobados</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Observaciones */}
        <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
          <div className="bg-slate-800 text-white px-5 py-3">
            <h4 className="font-bold flex items-center text-sm uppercase tracking-wider">
              <span className="mr-2">📝</span> Observaciones
            </h4>
          </div>
          <div className="p-5">
            {observaciones ? (
              <p className="text-sm text-slate-600 leading-relaxed">{observaciones}</p>
            ) : (
              <p className="text-slate-400 text-sm text-center py-6">Sin observaciones registradas.</p>
            )}
          </div>
        </div>
      </div>

      {/* PIE DE PÁGINA */}
      <div className="border-t border-slate-300 pt-6 pb-4 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-[0.15em] mb-1">Secretaría Académica</p>
            <div className="w-48 border-b border-slate-400 mb-1"></div>
            <p className="text-[10px] text-slate-400">Firma y sello</p>
          </div>
          <p className="text-[10px] text-slate-400 text-right">
            Documento generado el {estudiante.fecha_emision} por el Sistema SIGA
          </p>
        </div>
      </div>

      {/* Print-only footer */}
      <div className="boletin-footer-print print-only">
        <p>Documento generado por SIGA — Sistema de Gestión Académica</p>
        <p>Este boletín es un documento informativo. Para versiones oficiales, consulte con la institución.</p>
      </div>

    </div>
  );
}

function StudentSearchBar({ searchTerm, setSearchTerm, filteredStudents, showDropdown, onSelect, searchLoading, recentStudents, setShowDropdown, onRemoveRecent }) {
  const [listening, setListening] = useState(false);
  const [voiceMsg, setVoiceMsg] = useState('');
  const recognitionRef = useRef(null);

  useEffect(() => {
    return () => {
      try { recognitionRef.current?.abort?.(); } catch { /* noop */ }
    };
  }, []);

  const handleVoiceSearch = () => {
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setVoiceMsg('Búsqueda por voz no disponible en este dispositivo.');
        return;
      }
      // Si ya está escuchando, cancelar (permite probar "cancelar reconocimiento")
      if (listening && recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { /* noop */ }
        return;
      }
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = 'es-PE';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setListening(true);
        setVoiceMsg('Escuchando...');
      };
      recognition.onresult = (event) => {
        const text = event.results?.[0]?.[0]?.transcript || '';
        if (text.trim()) {
          // Reutiliza el MISMO searchTerm del buscador existente:
          // el useEffect de filtrado (DNI, código, nombres, apellidos) reacciona solo.
          setSearchTerm(text.trim());
          setVoiceMsg('');
        } else {
          setVoiceMsg('No se pudo reconocer la voz. Inténtalo nuevamente.');
        }
      };
      recognition.onerror = (event) => {
        const err = event?.error;
        if (err === 'not-allowed' || err === 'service-not-allowed') {
          setVoiceMsg('Permiso de micrófono denegado.');
        } else if (err === 'no-speech' || err === 'audio-capture' || err === 'no-match') {
          setVoiceMsg('No se pudo reconocer la voz. Inténtalo nuevamente.');
        } else if (err === 'aborted') {
          setVoiceMsg('');
        } else {
          setVoiceMsg('No se pudo reconocer la voz. Inténtalo nuevamente.');
        }
        setListening(false);
      };
      recognition.onend = () => {
        setListening(false);
        setVoiceMsg((prev) => (prev === 'Escuchando...' ? '' : prev));
      };

      recognition.start();
    } catch {
      // No romper nunca el buscador escrito
      setListening(false);
      setVoiceMsg('No se pudo reconocer la voz. Inténtalo nuevamente.');
    }
  };

  const showRecent = showDropdown && searchTerm.length === 0 && recentStudents.length > 0;
  const showResults = showDropdown && searchTerm.length >= 3;

  return (
    <div className="relative">
      <div className="bg-white border border-slate-200 rounded-md flex items-center gap-2 px-4 py-2 shadow-sm">
        <span className="px-1 text-slate-400 text-lg">🔍</span>
        <input
          type="text"
          className="w-full bg-transparent border-none focus:ring-0 py-1.5 text-slate-700 placeholder-slate-400 outline-none text-sm"
          placeholder="Buscar estudiante por DNI, nombre, apellido o código..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setShowDropdown?.(true)}
        />
        {searchLoading && <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin"></div>}
        <button
          type="button"
          onClick={handleVoiceSearch}
          aria-label="Buscar estudiante por voz"
          title={listening ? 'Escuchando... pulsa para cancelar' : 'Buscar estudiante por voz'}
          className={`relative flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full border transition-colors cursor-pointer ${
            listening
              ? 'bg-red-50 border-red-300 text-red-600 animate-pulse'
              : 'border-slate-200 text-slate-500 hover:text-primary hover:border-primary/40 hover:bg-primary/5'
          }`}
        >
          {listening && (
            <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-30 animate-ping"></span>
          )}
          <svg className="relative w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </button>
      </div>
      {(voiceMsg || listening) && (
        <p className={`mt-1.5 ml-1 text-xs font-medium flex items-center gap-1.5 ${listening ? 'text-red-600' : 'text-slate-500'}`} role="status" aria-live="polite">
          {listening && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
          {voiceMsg || 'Escuchando...'}
        </p>
      )}

      {showRecent && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg">
          <p className="px-4 pt-3 pb-1 text-[10px] text-slate-400 uppercase font-bold tracking-[0.15em]">Consultados recientemente</p>
          {recentStudents.map((student) => (
            <div
              key={student.id}
              className="w-full flex items-center gap-2 pl-4 pr-2 py-2 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
            >
              <button
                onClick={() => onSelect(student)}
                className="flex-1 text-left cursor-pointer"
              >
                <p className="font-semibold text-slate-800 text-sm">{student.apellidos}, {student.nombres}</p>
                <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider">Cód: {student.codigo_estudiante}</p>
              </button>
              <button
                type="button"
                onClick={(e) => onRemoveRecent?.(e, student.id)}
                aria-label="Eliminar de recientes"
                title="Eliminar de recientes"
                className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {showResults && filteredStudents.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filteredStudents.map((student) => (
            <button
              key={student.id}
              onClick={() => onSelect(student)}
              className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0 cursor-pointer"
            >
              <p className="font-semibold text-slate-800 text-sm">{student.apellidos}, {student.nombres}</p>
              <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider">Cód: {student.codigo_estudiante} · DNI: {student.dni}</p>
            </button>
          ))}
        </div>
      )}
      {showResults && searchTerm.length >= 3 && filteredStudents.length === 0 && !searchLoading && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg p-4 text-center">
          <p className="text-slate-400 text-sm">No se encontraron estudiantes con "{searchTerm}"</p>
        </div>
      )}
    </div>
  );
}
