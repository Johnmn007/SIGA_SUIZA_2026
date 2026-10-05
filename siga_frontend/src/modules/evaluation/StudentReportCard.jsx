import { useState, useEffect, useRef } from 'react';
import { API_BASE } from '../../core/api/client';
import { useAuth } from '../../core/auth/useAuth';
import mockEvaluacion from './mockEvaluacion.json';

const SECTION_TITLE = "text-[11px] font-bold text-slate-500 uppercase tracking-[0.15em]";

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
