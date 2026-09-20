import { useState, useEffect, useRef } from 'react';
import { API_BASE } from '../../core/api/client';
import { useAuth } from '../../core/auth/useAuth';

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
  const debounceRef = useRef(null);

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
      const val = searchTerm.toLowerCase();
      const filtered = allStudents.filter(s =>
        (s.dni && s.dni.includes(searchTerm)) ||
        (s.nombres && s.nombres.toLowerCase().includes(val)) ||
        (s.apellidos && s.apellidos.toLowerCase().includes(val)) ||
        (s.codigo_estudiante && s.codigo_estudiante.toLowerCase().includes(val))
      );
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
  };

  const handleClearSelection = () => {
    setSelectedStudentId(null);
    setSelectedStudentName('');
    setData(null);
    setError(null);
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
        setData(await res.json());
      } catch (e) { setError(e.message); }
      setLoading(false);
    };
    fetchBoletin();
  }, [periodoId, effectiveStudentId]);

  if (loading) {
    return (
      <div className="animate-fade-in max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h3 className="text-3xl font-bold tracking-tight text-slate-800">
            Boletín de <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-dark">Notas</span>
          </h3>
        </div>
        <div className="glass-card py-20 text-center">
          <div className="inline-block w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500">Cargando boletín...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h3 className="text-3xl font-bold tracking-tight text-slate-800">
            Boletín de <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-dark">Notas</span>
          </h3>
        </div>
        {isAdmin && (
          <div className="mb-4" ref={searchRef}>
            <StudentSearchBar
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              selectedStudentName={selectedStudentName}
              onClearSelection={handleClearSelection}
              filteredStudents={filteredStudents}
              showDropdown={showDropdown}
              onSelect={handleSelectStudent}
              searchLoading={searchLoading}
            />
          </div>
        )}
        <div className="glass-card py-16 text-center border-l-4 border-l-red-500">
          <div className="text-5xl mb-4">⚠️</div>
          <p className="text-slate-600 font-medium">{error}</p>
          <p className="text-slate-400 text-sm mt-2">Verifica que existan matrículas y evaluaciones registradas para este periodo.</p>
        </div>
      </div>
    );
  }

  if (isAdmin && !selectedStudentId) {
    return (
      <div className="animate-fade-in max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h3 className="text-3xl font-bold tracking-tight text-slate-800">
            Boletín de <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-dark">Notas</span>
          </h3>
        </div>
        <div className="mb-4" ref={searchRef}>
          <StudentSearchBar
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            selectedStudentName={selectedStudentName}
            onClearSelection={handleClearSelection}
            filteredStudents={filteredStudents}
            showDropdown={showDropdown}
            onSelect={handleSelectStudent}
            searchLoading={searchLoading}
          />
        </div>
        <div className="glass-card py-16 text-center">
          <div className="text-5xl mb-4 opacity-40">🔍</div>
          <p className="text-slate-500 font-medium text-lg">Selecciona un estudiante para ver su boletín</p>
          <p className="text-slate-400 text-sm mt-2">Escribe un nombre, código o DNI en el buscador.</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="animate-fade-in max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h3 className="text-3xl font-bold tracking-tight text-slate-800">
            Boletín de <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-dark">Notas</span>
          </h3>
        </div>
        {isAdmin && (
          <div className="mb-4" ref={searchRef}>
            <StudentSearchBar
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              selectedStudentName={selectedStudentName}
              onClearSelection={handleClearSelection}
              filteredStudents={filteredStudents}
              showDropdown={showDropdown}
              onSelect={handleSelectStudent}
              searchLoading={searchLoading}
            />
          </div>
        )}
        <div className="glass-card py-16 text-center">
          <div className="text-5xl mb-4 opacity-40">📄</div>
          <p className="text-slate-500 font-medium text-lg">No hay información disponible.</p>
        </div>
      </div>
    );
  }

  const { estudiante, matricula_estado, estado_academico, progreso_creditos, cursos_periodo, resumen, historial, observaciones } = data;

  const getGradeColor = (val) => {
    if (val === null || val === undefined) return 'text-slate-400';
    return val >= 13 ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold';
  };

  const getBadgeColor = (estado) => {
    if (estado === 'aprobado') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (estado === 'desaprobado') return 'bg-red-100 text-red-700 border-red-200';
    return 'bg-slate-100 text-slate-600 border-slate-200';
  };

  return (
    <div className="animate-fade-in max-w-4xl mx-auto space-y-6">

      {isAdmin && (
        <div ref={searchRef}>
          <StudentSearchBar
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            selectedStudentName={selectedStudentName}
            onClearSelection={handleClearSelection}
            filteredStudents={filteredStudents}
            showDropdown={showDropdown}
            onSelect={handleSelectStudent}
            searchLoading={searchLoading}
          />
        </div>
      )}

      {/* Selector de Periodo */}
      <div className="flex items-center gap-3 mb-2">
        <label className="text-sm font-bold text-slate-600 uppercase tracking-wider">Periodo:</label>
        <select
          className="input-field py-2 text-sm min-w-[160px]"
          value={periodoId}
          onChange={(e) => setPeriodoId(e.target.value)}
        >
          {periodos.map(p => (
            <option key={p.id} value={p.id}>{p.codigo}</option>
          ))}
        </select>
      </div>

      {/* SECCION 1: Datos del Estudiante + Periodo */}
      <div className="glass-card p-6 border-l-4 border-l-primary">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary-dark/20 flex items-center justify-center text-4xl shadow-inner border-2 border-white flex-shrink-0">
            {estudiante.foto_url ? (
              <img src={estudiante.foto_url} alt="Foto" className="w-full h-full rounded-full object-cover" />
            ) : '🎓'}
          </div>
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-2xl font-bold text-slate-800">{estudiante.apellidos}, {estudiante.nombres}</h2>
            <p className="text-slate-500 text-sm mt-1">{estudiante.programa_nombre}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div>
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Código</p>
                <p className="font-semibold text-slate-700 text-sm">{estudiante.codigo_estudiante}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">DNI</p>
                <p className="font-semibold text-slate-700 text-sm">{estudiante.dni}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Celular</p>
                <p className="font-semibold text-slate-700 text-sm">{estudiante.celular || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Email</p>
                <p className="font-semibold text-slate-700 text-sm truncate" title={estudiante.email_personal}>{estudiante.email_personal || '-'}</p>
              </div>
            </div>
          </div>
          <div className="text-center min-w-[140px] flex-shrink-0">
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Periodo</p>
            <p className="text-lg font-bold text-primary">{estudiante.periodo_codigo}</p>
            <p className="text-xs text-slate-400 mt-2">Emisión: {estudiante.fecha_emision}</p>
          </div>
        </div>
      </div>

      {/* SECCION 2: Estado de Matrícula */}
      <div className={`glass-card p-5 border-l-4 ${matricula_estado.pago_matricula ? 'border-l-emerald-500 bg-emerald-50/30' : 'border-l-amber-500 bg-amber-50/30'}`}>
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${matricula_estado.pago_matricula ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
            {matricula_estado.pago_matricula ? '✓' : '⚠'}
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-slate-800 mb-2">Estado de Matrícula</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase">Pago</span>
                <p className={`font-semibold ${matricula_estado.pago_matricula ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {matricula_estado.pago_matricula ? 'Pagado' : 'Pendiente'}
                </p>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase">Tipo Ingreso</span>
                <p className="font-semibold text-slate-700">{matricula_estado.tipo_ingreso || 'N/A'}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase">Estado</span>
                <p className="font-semibold text-slate-700 capitalize">{matricula_estado.estado_matricula}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase">Fin Mat. Regular</span>
                <p className="font-semibold text-slate-700 text-xs">{matricula_estado.fecha_fin_matricula_regular ? new Date(matricula_estado.fecha_fin_matricula_regular).toLocaleDateString() : 'N/A'}</p>
              </div>
            </div>
            {!matricula_estado.pago_matricula && (
              <p className="text-amber-700 text-xs mt-3 font-medium bg-amber-100/50 px-3 py-1.5 rounded-lg inline-block">
                Tu matrícula tiene pagos pendientes. Algunas funcionalidades pueden estar restringidas.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* SECCION 3: Estado Académico */}
      <div className="glass-card p-5 border-l-4 border-l-blue-500">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">📋</div>
          <div>
            <h4 className="font-bold text-slate-800">Estado Académico</h4>
            <p className="text-sm text-slate-600 capitalize mt-1">
              <span className="font-semibold">{estado_academico}</span>
            </p>
          </div>
        </div>
      </div>

      {/* SECCION 4: Progreso de Créditos */}
      <div className="glass-card p-5 border-l-4 border-l-purple-500">
        <div className="flex items-center gap-4 mb-3">
          <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">📊</div>
          <div className="flex-1">
            <h4 className="font-bold text-slate-800">Progreso de Créditos</h4>
            <p className="text-sm text-slate-500">
              {progreso_creditos.creditos_aprobados} de {progreso_creditos.creditos_totales} créditos aprobados
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-extrabold text-purple-600">{progreso_creditos.porcentaje}%</span>
          </div>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${progreso_creditos.porcentaje}%` }}
          ></div>
        </div>
      </div>

      {/* SECCION 5: Notas por Curso */}
      <div className="glass-card overflow-hidden">
        <div className="bg-slate-800 text-white p-4 flex justify-between items-center">
          <h4 className="font-bold flex items-center text-lg">
            <span className="mr-2">📚</span> Notas del Periodo
          </h4>
          <span className="text-sm text-slate-300">{cursos_periodo.length} cursos</span>
        </div>
        {cursos_periodo.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-slate-400 font-medium">No hay cursos registrados para este periodo.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="py-3 px-4 font-bold text-slate-500 uppercase text-xs tracking-wider">Curso / Unidad Didáctica</th>
                  <th className="py-3 px-3 font-bold text-slate-500 uppercase text-xs tracking-wider text-center">Créditos</th>
                  <th className="py-3 px-3 font-bold text-slate-500 uppercase text-xs tracking-wider text-center">Cap. 1</th>
                  <th className="py-3 px-3 font-bold text-slate-500 uppercase text-xs tracking-wider text-center">Cap. 2</th>
                  <th className="py-3 px-3 font-bold text-slate-500 uppercase text-xs tracking-wider text-center">Cap. 3</th>
                  <th className="py-3 px-3 font-bold text-slate-800 uppercase text-xs tracking-wider text-center bg-slate-100/50">Final</th>
                  <th className="py-3 px-3 font-bold text-slate-500 uppercase text-xs tracking-wider text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cursos_periodo.map((curso, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-700 text-sm">{curso.unidad_nombre}</td>
                    <td className="py-3 px-3 text-center font-medium text-slate-500 text-sm">{curso.creditos}</td>
                    <td className={`py-3 px-3 text-center text-sm ${getGradeColor(curso.nota_c1)}`}>
                      {curso.nota_c1 ?? '-'}
                    </td>
                    <td className={`py-3 px-3 text-center text-sm ${getGradeColor(curso.nota_c2)}`}>
                      {curso.nota_c2 ?? '-'}
                    </td>
                    <td className={`py-3 px-3 text-center text-sm ${getGradeColor(curso.nota_c3)}`}>
                      {curso.nota_c3 ?? '-'}
                    </td>
                    <td className={`py-3 px-3 text-center text-lg bg-slate-50/50 ${getGradeColor(curso.nota_final)}`}>
                      {curso.nota_final ?? '-'}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border ${getBadgeColor(curso.estado)}`}>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-5 text-center border-t-4 border-t-primary">
          <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2">Promedio General</p>
          <p className={`text-4xl font-extrabold ${getGradeColor(resumen.promedio_general)}`}>
            {resumen.promedio_general ?? '-'}
          </p>
          <p className="text-xs text-slate-400 mt-1">de 20 puntos</p>
        </div>
        <div className="glass-card p-5 text-center border-t-4 border-t-emerald-500">
          <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2">Aprobados</p>
          <p className="text-4xl font-extrabold text-emerald-600">{resumen.cursos_aprobados}</p>
          <p className="text-xs text-slate-400 mt-1">de {resumen.total_cursos} cursos</p>
        </div>
        <div className="glass-card p-5 text-center border-t-4 border-t-red-500">
          <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2">Desaprobados</p>
          <p className="text-4xl font-extrabold text-red-500">{resumen.cursos_desaprobados}</p>
          <p className="text-xs text-slate-400 mt-1">de {resumen.total_cursos} cursos</p>
        </div>
      </div>

      {/* SECCION 7: Historial de Periodos + Observaciones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Historial */}
        <div className="glass-card overflow-hidden">
          <div className="bg-slate-800 text-white p-4">
            <h4 className="font-bold flex items-center text-lg">
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
                <div key={idx} className="p-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-800">{h.periodo_codigo}</span>
                    <span className={`text-lg font-extrabold ${getGradeColor(h.promedio)}`}>
                      {h.promedio ?? '-'}
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs text-slate-500">
                    <span className="text-emerald-600 font-semibold">✓ {h.cursos_aprobados} aprobados</span>
                    <span className="text-red-500 font-semibold">✗ {h.cursos_desaprobados} desaprobados</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Observaciones */}
        <div className="glass-card overflow-hidden">
          <div className="bg-slate-800 text-white p-4">
            <h4 className="font-bold flex items-center text-lg">
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

    </div>
  );
}

function StudentSearchBar({ searchTerm, setSearchTerm, selectedStudentName, onClearSelection, filteredStudents, showDropdown, onSelect, searchLoading }) {
  return (
    <div className="relative">
      {selectedStudentName && (
        <div className="flex items-center gap-2 mb-2 px-1">
          <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Estudiante seleccionado:</span>
          <span className="text-sm font-semibold text-primary">{selectedStudentName}</span>
          <button
            onClick={onClearSelection}
            className="text-xs text-red-500 hover:text-red-700 underline ml-1 cursor-pointer"
          >
            Cambiar
          </button>
        </div>
      )}
      <div className="glass-card flex items-center gap-2 px-4 py-2">
        <span className="px-2 text-slate-400 text-xl">🔍</span>
        <input
          type="text"
          className="w-full bg-transparent border-none focus:ring-0 py-2 text-slate-700 placeholder-slate-400 outline-none"
          placeholder="Buscar estudiante por DNI, nombre, apellido o código..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => { if (filteredStudents.length > 0) setShowDropdown(true); }}
        />
        {searchLoading && <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>}
      </div>
      {showDropdown && filteredStudents.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
          {filteredStudents.map((student) => (
            <button
              key={student.id}
              onClick={() => onSelect(student)}
              className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-slate-100 last:border-b-0 cursor-pointer"
            >
              <p className="font-semibold text-slate-800 text-sm">{student.apellidos}, {student.nombres}</p>
              <p className="text-xs text-slate-400 mt-0.5">Código: {student.codigo_estudiante} | DNI: {student.dni}</p>
            </button>
          ))}
        </div>
      )}
      {showDropdown && searchTerm.length >= 3 && filteredStudents.length === 0 && !searchLoading && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl p-4 text-center">
          <p className="text-slate-400 text-sm">No se encontraron estudiantes con "{searchTerm}"</p>
        </div>
      )}
    </div>
  );
}
