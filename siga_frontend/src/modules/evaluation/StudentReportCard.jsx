import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../core/api/client';
import { useAuth } from '../../core/auth/useAuth';

const getRoles = (user) => {
  if (user?.is_superuser) return ['superadmin'];
  let roles = [];
  if (user?.roles && Array.isArray(user.roles)) {
    roles = user.roles.map(r => typeof r === 'string' ? r : (r.name || r.nombre));
  } else if (user?.role) {
    roles = [user.role];
  }
  return roles.length > 0 ? roles : ['invitado'];
};

export function StudentReportCard() {
  const { user } = useAuth();
  const userRoles = getRoles(user);

  const isManager = ['superadmin', 'admin'].some(r => userRoles.includes(r));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [student, setStudent] = useState(null);
  const [studentsList, setStudentsList] = useState([]);
  const [studentSelectorLoading, setStudentSelectorLoading] = useState(false);

  const [periods, setPeriods] = useState([]);
  const [matriculas, setMatriculas] = useState([]);
  const [malla, setMalla] = useState([]);
  const [grades, setGrades] = useState([]);

  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');

  // Resolver al estudiante:
  //  - Rol estudiante: por el email de su cuenta (email_institucional o email_personal).
  //  - Admin/Superadmin: selector manual sobre estudiantes reales.
  useEffect(() => {
    if (!user) return;

    const resolveStudent = async () => {
      setError(null);
      setStudent(null);
      setSelectedStudentId('');

      if (!isManager) {
        if (!user?.email) {
          setError('Tu cuenta no tiene un correo asociado. Contacta a Secretaría Académica.');
          return;
        }
        setLoading(true);
        try {
          const matches = await apiClient.request(`/api/mod-gestion-academica/estudiantes/?email=${encodeURIComponent(user.email)}`).catch(() => []);
          if (!matches || matches.length === 0) {
            setError('No se encontró un expediente de estudiante vinculado a tu cuenta (' + user.email + '). Verifica con Secretaría Académica que tu correo institucional esté actualizado.');
            return;
          }
          setStudent(matches[0]);
          setSelectedStudentId(String(matches[0].id));
        } catch {
          setError('No se pudo obtener tu información de estudiante. Intenta nuevamente.');
        } finally {
          setLoading(false);
        }
      }
    };

    resolveStudent();
  }, [user, isManager]);

  // Cargar periodos reales
  useEffect(() => {
    if (!user) return;
    apiClient.request('/api/mod-programas-estudio/periodos')
      .then(list => {
        setPeriods(list || []);
      })
      .catch(() => setPeriods([]));
  }, [user]);

  // Cargar lista de estudiantes para admin/superadmin
  useEffect(() => {
    if (!user || !isManager) return;
    setStudentSelectorLoading(true);
    apiClient.request('/api/mod-gestion-academica/estudiantes/')
      .then(list => {
        setStudentsList(list || []);
        if (list && list.length > 0) {
          setSelectedStudentId((prev) => prev || String(list[0].id));
        }
      })
      .catch(() => setStudentsList([]))
      .finally(() => setStudentSelectorLoading(false));
  }, [user, isManager]);

  // Cuando el selector cambia (admin) o el estudiante se resuelve (estudiante), cargar matrículas
  useEffect(() => {
    if (!selectedStudentId) {
      setMatriculas([]);
      setMalla([]);
      setGrades([]);
      return;
    }

    let cancelled = false;
    const loadStudentData = async () => {
      setLoading(true);
      setError(null);
      try {
        const matRes = await apiClient.request(`/api/mod-gestion-academica/matriculas/estudiante/${selectedStudentId}`).catch(() => []);
        if (cancelled) return;
        setMatriculas(matRes || []);
      } catch {
        if (!cancelled) setError('No se pudieron cargar las matrículas del estudiante.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadStudentData();

    return () => { cancelled = true; };
  }, [selectedStudentId]);

  // Determinar periodo visible: el de la matrícula activa/última o el primero disponible
  useEffect(() => {
    if (matriculas.length === 0) return;
    const active = matriculas.find(m => m.estado_matricula && !['anulada', 'retirada', 'anulado'].includes(m.estado_matricula));
    const fallback = active || matriculas[0];
    setSelectedPeriod(prev => prev || String(fallback.periodo_id));
  }, [matriculas]);

  // Cargar malla real del programa del estudiante
  useEffect(() => {
    if (!student && isManager) return;

    const resolvePrograma = async () => {
      let programaId = student?.programa_id;
      if (!programaId && isManager && selectedStudentId) {
        const sel = studentsList.find(s => String(s.id) === String(selectedStudentId));
        programaId = sel?.programa_id;
      }
      if (!programaId) {
        const m = matriculas.find(x => String(x.periodo_id) === String(selectedPeriod));
        programaId = m?.programa_id;
      }

      if (!programaId) {
        setMalla([]);
        return;
      }

      try {
        const mallaRes = await apiClient.request(`/api/mod-programas-estudio/programas/${programaId}/malla`).catch(() => []);
        setMalla(mallaRes || []);
      } catch {
        setMalla([]);
      }
    };

    resolvePrograma();
  }, [student, isManager, studentsList, selectedStudentId, selectedPeriod, matriculas]);

  const unidadName = useCallback((unitId) => {
    for (const mod of malla) {
      const found = mod.unidades.find(u => Number(u.id) === Number(unitId));
      if (found) return found.nombre;
    }
    return null;
  }, [malla]);

  // Cargar notas por unidad/periodo desde mod-evaluacion
  useEffect(() => {
    if (!selectedStudentId || !selectedPeriod) {
      setGrades([]);
      return;
    }

    const matriculaActual = matriculas.find(m => String(m.periodo_id) === String(selectedPeriod));
    const detalles = (matriculaActual?.detalles) || [];

    if (detalles.length === 0) {
      setGrades([]);
      return;
    }

    let cancelled = false;
    const loadGrades = async () => {
      setLoading(true);
      const rows = [];
      await Promise.all(detalles.map(async (det) => {
        try {
          const res = await apiClient.request(`/api/mod-evaluacion/registros/unidad/${det.unidad_didactica_id}/periodo/${selectedPeriod}`).catch(() => []);
          if (cancelled) return;
          const myGrade = (res || []).find(g => Number(g.estudiante_id) === Number(selectedStudentId));
          rows.push({
            unidad_id: det.unidad_didactica_id,
            nombre_unidad: unidadName(det.unidad_didactica_id) || `Unidad ${det.unidad_didactica_id}`,
            creditos: det.creditos,
            c1: myGrade?.nota_c1 ?? null,
            c2: myGrade?.nota_c2 ?? null,
            c3: myGrade?.nota_c3 ?? null,
            nota_final: myGrade?.nota_final ?? null,
            estado: myGrade?.estado ?? (det.estado_curso || 'cursando')
          });
        } catch {
          rows.push({
            unidad_id: det.unidad_didactica_id,
            nombre_unidad: unidadName(det.unidad_didactica_id) || `Unidad ${det.unidad_didactica_id}`,
            creditos: det.creditos,
            c1: null, c2: null, c3: null, nota_final: null,
            estado: 'sin_notas'
          });
        }
      }));

      if (!cancelled) {
        setGrades(rows);
        setLoading(false);
      }
    };

    loadGrades();

    return () => { cancelled = true; };
  }, [selectedStudentId, selectedPeriod, matriculas, unidadName]);

  const periodLabel = (periodoId) => {
    const p = periods.find(x => Number(x.id) === Number(periodoId));
    return p ? p.codigo : `Periodo ${periodoId}`;
  };

  const totalCreditos = grades.reduce((acc, g) => acc + (Number(g.creditos) || 0), 0);
  const aprobadas = grades.filter(g => g.estado === 'aprobado').length;
  const conNota = grades.filter(g => g.nota_final !== null && g.nota_final !== undefined);

  const promedioGeneral = (() => {
    if (conNota.length === 0) return null;
    const suma = conNota.reduce((acc, g) => acc + Number(g.nota_final), 0);
    return Math.round((suma / conNota.length) * 10) / 10;
  })();

  const getGradeColor = (val) => {
    if (val === null || val === undefined) return 'text-slate-400';
    return Number(val) >= 13 ? 'text-blue-600 font-bold' : 'text-red-600 font-bold';
  };

  const estadoBadge = (estado) => {
    const config = {
      aprobado: 'bg-green-100 text-green-700 border-green-200',
      desaprobado: 'bg-red-100 text-red-700 border-red-200',
      cursando: 'bg-amber-100 text-amber-700 border-amber-200',
      sin_notas: 'bg-slate-100 text-slate-500 border-slate-200'
    };
    const label = {
      aprobado: 'Aprobado',
      desaprobado: 'Desaprobado',
      cursando: 'En curso',
      sin_notas: 'Sin notas registradas'
    };
    return { cls: config[estado] || config.sin_notas, label: label[estado] || estado };
  };

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      <div className="mb-8 text-center">
        <h3 className="text-4xl font-extrabold tracking-tight text-slate-800 mb-2">
          Boletín de <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Notas</span>
        </h3>
        <p className="text-slate-500 font-medium">
          {selectedPeriod ? `Periodo Académico ${periodLabel(selectedPeriod)}` : 'Consulta tus calificaciones oficiales'}
        </p>
      </div>

      {/* Selector de estudiante para Admin/Superadmin */}
      {isManager && (
        <div className="glass-card p-5 mb-6 border border-slate-200 shadow-sm">
          <label className="label text-sm font-bold text-slate-700 mb-2 flex items-center">
            <span className="text-lg mr-2">🎯</span> Estudiante
          </label>
          <select
            className="w-full appearance-none bg-white border-2 border-slate-200 text-slate-800 text-base font-semibold rounded-xl px-4 py-3 pr-10 hover:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
            value={selectedStudentId}
            onChange={(e) => { setSelectedStudentId(e.target.value); setSelectedPeriod(''); }}
            disabled={studentSelectorLoading}
          >
            {studentsList.length === 0 ? (
              <option value="">-- No hay estudiantes registrados --</option>
            ) : (
              <>
                <option value="">-- Seleccione un estudiante --</option>
                {studentsList.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.codigo_estudiante} | {s.apellidos}, {s.nombres}
                  </option>
                ))}
              </>
            )}
          </select>
        </div>
      )}

      {error && (
        <div className="glass-card p-6 mb-6 border-l-4 border-l-red-400 bg-red-50/40 text-center">
          <div className="text-5xl opacity-50 mb-3">⚠️</div>
          <p className="text-red-700 font-semibold">{error}</p>
        </div>
      )}

      {/* Selector de periodo real */}
      {periods.length > 0 && !error && (
        <div className="glass-card p-5 mb-6 border border-slate-200 shadow-sm">
          <label className="label text-sm font-bold text-slate-700 mb-2 flex items-center">
            <span className="text-lg mr-2">📅</span> Periodo
          </label>
          <select
            className="w-full appearance-none bg-white border-2 border-slate-200 text-slate-800 text-base font-semibold rounded-xl px-4 py-3 pr-10 hover:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            disabled={periods.length === 0}
          >
            {periods.map(p => (
              <option key={p.id} value={p.id}>{p.codigo}</option>
            ))}
          </select>
        </div>
      )}

      {student && !error && (
        <div className="glass-card p-6 mb-8 border-l-4 border-l-primary flex flex-col md:flex-row items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center text-4xl shadow-inner border-2 border-white">
            🎓
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-800">{student.apellidos}, {student.nombres}</h2>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Código</p>
                <p className="font-semibold text-slate-700">{student.codigo_estudiante}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">DNI</p>
                <p className="font-semibold text-slate-700">{student.dni}</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl text-center min-w-[130px] shadow-sm border border-slate-100">
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Estado</p>
            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold shadow-sm">
              {student.estado_academico || 'Regular'}
            </span>
          </div>
        </div>
      )}

      {!error && (isManager ? selectedStudentId : student) && (
        <div className="glass-card overflow-hidden">
          <div className="bg-slate-800 text-white p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <h4 className="font-bold flex items-center text-lg">
              <span className="mr-2">📊</span> Resumen Académico
            </h4>
            {promedioGeneral !== null && (
              <span className="text-sm bg-white/10 px-4 py-2 rounded-xl border border-white/10">
                Promedio General: <strong className="text-white text-base">{promedioGeneral}</strong>
              </span>
            )}
          </div>

          {loading && grades.length === 0 ? (
            <div className="py-20 text-center">
              <div className="inline-block w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4"></div>
              <p className="text-slate-500">Generando boletín...</p>
            </div>
          ) : !selectedPeriod ? (
            <div className="py-16 text-center">
              <div className="text-5xl opacity-40 mb-4">📄</div>
              <p className="text-slate-500 font-medium text-lg">Selecciona un periodo para ver las notas.</p>
            </div>
          ) : grades.length === 0 ? (
            <div className="py-16 text-center">
              <div className="text-5xl opacity-40 mb-4">📄</div>
              <p className="text-slate-500 font-medium text-lg">
                No hay matrícula registrada en el periodo {periodLabel(selectedPeriod)}.
              </p>
            </div>
          ) : (
            <>
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200">
                    <th className="py-4 px-6 font-bold text-slate-500 uppercase text-xs tracking-wider">Unidad Didáctica</th>
                    <th className="py-4 px-4 font-bold text-slate-500 uppercase text-xs tracking-wider text-center">Créditos</th>
                    <th className="py-4 px-4 font-bold text-slate-500 uppercase text-xs tracking-wider text-center">Cap. 1</th>
                    <th className="py-4 px-4 font-bold text-slate-500 uppercase text-xs tracking-wider text-center">Cap. 2</th>
                    <th className="py-4 px-4 font-bold text-slate-500 uppercase text-xs tracking-wider text-center">Cap. 3</th>
                    <th className="py-4 px-6 font-extrabold text-slate-800 uppercase text-xs tracking-wider text-center bg-slate-100/50">Promedio Final</th>
                    <th className="py-4 px-6 font-bold text-slate-500 uppercase text-xs tracking-wider text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {grades.map((g, idx) => {
                    const badge = estadoBadge(g.estado);
                    return (
                      <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                        <td className="py-4 px-6 font-semibold text-slate-700">{g.nombre_unidad}</td>
                        <td className="py-4 px-4 text-center font-medium text-slate-500">{g.creditos}</td>
                        <td className={`py-4 px-4 text-center text-lg ${getGradeColor(g.c1)}`}>{g.c1 ?? '-'}</td>
                        <td className={`py-4 px-4 text-center text-lg ${getGradeColor(g.c2)}`}>{g.c2 ?? '-'}</td>
                        <td className={`py-4 px-4 text-center text-lg ${getGradeColor(g.c3)}`}>{g.c3 ?? '-'}</td>
                        <td className={`py-4 px-6 text-center text-2xl bg-slate-50/50 ${getGradeColor(g.nota_final)}`}>
                          {g.nota_final !== null && g.nota_final !== undefined ? g.nota_final : '-'}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${badge.cls}`}>
                            {badge.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t-2 border-slate-200 bg-slate-50/80">
                  <tr>
                    <td className="py-4 px-6 font-bold text-slate-600">Total de Créditos: {totalCreditos}</td>
                    <td colSpan="4"></td>
                    <td className="py-4 px-6 text-center font-extrabold text-slate-800">
                      {aprobadas}/{grades.length} aprobadas
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  );
}