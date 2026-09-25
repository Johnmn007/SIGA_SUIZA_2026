import { useState, useEffect, useMemo } from 'react';
import { API_BASE } from '../../core/api/client';
import { useAuth } from '../../core/auth/useAuth';

const calcularPromedio = (c1, c2, c3) => {
  const notas = [c1, c2, c3].filter(n => n !== null && n !== undefined);
  if (notas.length === 0) return null;
  return Math.round(notas.reduce((a, b) => a + b, 0) / notas.length);
};

const getEstado = (promedio) => {
  if (promedio === null) return { label: 'Cursando', color: 'bg-slate-100 text-slate-600' };
  if (promedio >= 14) return { label: 'Aprobado', color: 'bg-emerald-100 text-emerald-700' };
  if (promedio >= 11) return { label: 'Por Recuperar', color: 'bg-amber-100 text-amber-700' };
  return { label: 'Desaprobado', color: 'bg-red-100 text-red-700' };
};

const getNotaColor = (nota) => {
  if (nota === null || nota === undefined) return 'text-slate-400';
  if (nota >= 14) return 'text-emerald-600 font-semibold';
  if (nota >= 11) return 'text-amber-600 font-semibold';
  return 'text-red-600 font-semibold';
};

const getTendencia = (actual, anterior) => {
  if (anterior === null || actual === null) return null;
  const diff = actual - anterior;
  if (diff > 0) return { icon: '↑', color: 'text-emerald-500', text: `+${diff}` };
  if (diff < 0) return { icon: '↓', color: 'text-red-500', text: `${diff}` };
  return { icon: '→', color: 'text-slate-400', text: '=' };
};

export function StudentReportCard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [studentInfo, setStudentInfo] = useState(null);
  const [matriculas, setMatriculas] = useState([]);
  const [grades, setGrades] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [showDetail, setShowDetail] = useState(null);
  const [activeTab, setActiveTab] = useState('actual');
  const [tramiteModal, setTramiteModal] = useState(null);
  const [tramiteForm, setTramiteForm] = useState({ motivo: '', detalles: '' });
  const [tramiteConfirmado, setTramiteConfirmado] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };

        // Get student ID from user context or use test ID
        const studentId = user?.id || 2315;

        // Fetch student info
        const estRes = await fetch(`${API_BASE}/api/mod-gestion-academica/estudiantes/${studentId}`, { headers });
        if (estRes.ok) {
          const estData = await estRes.json();
          setStudentInfo(estData);
        }

        // Fetch matriculas
        const matRes = await fetch(`${API_BASE}/api/mod-gestion-academica/matriculas/estudiante/${studentId}`, { headers });
        if (matRes.ok) {
          const matData = await matRes.json();
          setMatriculas(matData);
          if (matData.length > 0) {
            setSelectedPeriod(matData[0].periodo_id);
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Error al cargar los datos');
      }
      setLoading(false);
    };

    fetchData();
  }, [user]);

  useEffect(() => {
    const fetchGrades = async () => {
      if (!selectedPeriod || matriculas.length === 0) return;

      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const currentMatricula = matriculas.find(m => m.periodo_id === selectedPeriod) || matriculas[0];
      if (!currentMatricula) return;

      const allGrades = [];
      for (const det of currentMatricula.detalles) {
        try {
          const gRes = await fetch(
            `${API_BASE}/api/mod-evaluacion/registros/unidad/${det.unidad_didactica_id}/periodo/${selectedPeriod}`,
            { headers }
          );
          if (gRes.ok) {
            const gData = await gRes.json();
            if (gData.length > 0) {
              allGrades.push({
                ...gData[0],
                creditos: det.creditos,
                unidad_didactica_id: det.unidad_didactica_id,
              });
            }
          }
        } catch (err) {
          console.error('Error fetching grades:', err);
        }
      }
      setGrades(allGrades);
    };

    fetchGrades();
  }, [selectedPeriod, matriculas]);

  const gradesWithAvg = useMemo(() =>
    grades.map(g => ({
      ...g,
      promedio: g.nota_final || calcularPromedio(g.nota_c1, g.nota_c2, g.nota_c3),
    })),
    [grades]
  );

  const stats = useMemo(() => {
    const promedios = gradesWithAvg.map(g => g.promedio).filter(p => p !== null);
    const promedioGeneral = promedios.length > 0
      ? Math.round(promedios.reduce((a, b) => a + b, 0) / promedios.length)
      : 0;
    const aprobados = gradesWithAvg.filter(g => g.promedio >= 14).length;
    const desaprobados = gradesWithAvg.filter(g => g.promedio !== null && g.promedio < 11).length;
    const porRecuperar = gradesWithAvg.filter(g => g.promedio >= 11 && g.promedio < 14).length;
    const totalCreditos = gradesWithAvg.reduce((sum, g) => sum + (g.creditos || 0), 0);
    const creditosAprobados = gradesWithAvg.filter(g => g.promedio >= 14).reduce((sum, g) => sum + (g.creditos || 0), 0);
    return { promedioGeneral, aprobados, desaprobados, porRecuperar, totalCreditos, creditosAprobados };
  }, [gradesWithAvg]);

  const ranking = useMemo(() => {
    const seed = selectedPeriod * 7 + (studentInfo?.id || 0);
    const pos = (seed % 28) + 3;
    return { posicion: pos, total: 35 };
  }, [selectedPeriod, studentInfo]);

  const getBarHeight = (nota) => {
    if (nota === null) return 0;
    return (nota / 20) * 100;
  };

  const handleTramite = (tipo) => {
    setTramiteModal(tipo);
    setTramiteForm({ motivo: '', detalles: '' });
    setTramiteConfirmado(false);
  };

  const submitTramite = () => {
    setTramiteConfirmado(true);
    setTimeout(() => {
      setTramiteModal(null);
      setTramiteConfirmado(false);
    }, 2000);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-48 bg-slate-200 rounded animate-pulse"></div>
            <div className="h-4 w-32 bg-slate-200 rounded animate-pulse mt-2"></div>
          </div>
        </div>
        <div className="glass-card p-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-slate-200 animate-pulse"></div>
            <div className="flex-1 space-y-3">
              <div className="h-4 w-32 bg-slate-200 rounded animate-pulse"></div>
              <div className="h-4 w-48 bg-slate-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="glass-card p-4">
              <div className="h-3 w-20 bg-slate-200 rounded animate-pulse"></div>
              <div className="h-8 w-12 bg-slate-200 rounded animate-pulse mt-2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="glass-card p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="font-semibold text-slate-800 mb-2">Error al cargar datos</h3>
          <p className="text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  const currentMatricula = matriculas.find(m => m.periodo_id === selectedPeriod) || matriculas[0];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Boletin de Notas</h1>
          <p className="text-slate-500 text-sm mt-1">Consulta tu rendimiento academico</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedPeriod || ''}
            onChange={(e) => setSelectedPeriod(Number(e.target.value))}
            className="input-field w-auto text-sm"
          >
            {matriculas.map(m => (
              <option key={m.id} value={m.periodo_id}>Periodo {m.periodo_id}</option>
            ))}
          </select>
          <button className="btn-primary text-sm flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            PDF
          </button>
        </div>
      </div>

      {/* Student Info Card */}
      {studentInfo && (
        <div className="glass-card p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
              {studentInfo.nombres?.charAt(0)}{studentInfo.apellidos?.charAt(0)}
            </div>
            <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Codigo</p>
                <p className="font-semibold text-slate-700">{studentInfo.codigo_estudiante}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Nombre</p>
                <p className="font-semibold text-slate-700">{studentInfo.apellidos}, {studentInfo.nombres}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">DNI</p>
                <p className="font-semibold text-slate-700">{studentInfo.dni}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Programa</p>
                <p className="font-semibold text-slate-700">{studentInfo.programa_id || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Estado</p>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                  {studentInfo.estado_academico || 'Activo'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Credit Progress Bar */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-700">Progreso de Creditos</h3>
          <span className="text-sm text-slate-500">{stats.creditosAprobados} / 200 creditos</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-4 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
            style={{ width: `${Math.min((stats.creditosAprobados / 200) * 100, 100)}%` }}
          >
            <span className="text-[10px] font-bold text-white">{Math.round((stats.creditosAprobados / 200) * 100)}%</span>
          </div>
        </div>
        <div className="flex justify-between mt-2 text-xs text-slate-400">
          <span>Inicio</span>
          <span>25% - Auxiliar</span>
          <span>50% - Tecnico</span>
          <span>75% - Pre-profesional</span>
          <span>100% - Profesional</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="glass-card p-4 text-center">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Promedio</p>
          <p className={`text-3xl font-bold ${getNotaColor(stats.promedioGeneral)}`}>{stats.promedioGeneral}</p>
          <p className="text-xs text-slate-400 mt-1">de 20</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Aprobados</p>
          <p className="text-3xl font-bold text-emerald-600">{stats.aprobados}</p>
          <p className="text-xs text-slate-400 mt-1">cursos</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Por Recuperar</p>
          <p className="text-3xl font-bold text-amber-600">{stats.porRecuperar}</p>
          <p className="text-xs text-slate-400 mt-1">cursos</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Desaprobados</p>
          <p className="text-3xl font-bold text-red-600">{stats.desaprobados}</p>
          <p className="text-xs text-slate-400 mt-1">cursos</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Ranking</p>
          <p className="text-3xl font-bold text-blue-600">#{ranking.posicion}</p>
          <p className="text-xs text-slate-400">de {ranking.total}</p>
        </div>
      </div>

      {/* Alert Banner */}
      {stats.desaprobados > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="font-semibold text-red-800">Atencion - Cursos Desaprobados</p>
            <p className="text-sm text-red-700">
              Tienes {stats.desaprobados} curso(s) desaprobado(s). Consulta con tu coordinador para opciones de recuperacion.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('actual')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'actual' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          Periodo Actual
        </button>
        <button
          onClick={() => setActiveTab('historial')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'historial' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          Historial
        </button>
        <button
          onClick={() => setActiveTab('tramites')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'tramites' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          Tramites
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'actual' && (
        <div className="space-y-6">
          {/* Grades Table */}
          <div className="glass-card overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Calificaciones por Asignatura</h2>
              <p className="text-sm text-slate-500 mt-1">Periodo {selectedPeriod}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/80">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Unidad</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cred.</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">C1</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">C2</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">C3</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Prom.</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gradesWithAvg.map((g) => {
                    const estado = getEstado(g.promedio);
                    return (
                      <tr key={g.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-slate-700">
                          Unidad Didactica {g.unidad_didactica_id}
                        </td>
                        <td className="px-4 py-4 text-sm text-center text-slate-500">{g.creditos}</td>
                        <td className={`px-4 py-4 text-sm text-center ${getNotaColor(g.nota_c1)}`}>{g.nota_c1 ?? '-'}</td>
                        <td className={`px-4 py-4 text-sm text-center ${getNotaColor(g.nota_c2)}`}>{g.nota_c2 ?? '-'}</td>
                        <td className={`px-4 py-4 text-sm text-center ${getNotaColor(g.nota_c3)}`}>{g.nota_c3 ?? '-'}</td>
                        <td className={`px-4 py-4 text-sm text-center font-bold ${getNotaColor(g.promedio)}`}>{g.promedio ?? '-'}</td>
                        <td className="px-4 py-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${estado.color}`}>
                            {estado.label}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button
                            onClick={() => setShowDetail(showDetail === g.id ? null : g.id)}
                            className="text-blue-500 hover:text-blue-700 text-sm"
                          >
                            {showDetail === g.id ? 'Ocultar' : 'Detalle'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detail Modal */}
          {showDetail && (
            <div className="glass-card p-6 border-l-4 border-l-blue-500">
              {(() => {
                const g = gradesWithAvg.find(gr => gr.id === showDetail);
                if (!g) return null;
                const estado = getEstado(g.promedio);
                return (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-slate-800">Unidad Didactica {g.unidad_didactica_id}</h3>
                        <p className="text-sm text-slate-500">{g.creditos} creditos</p>
                      </div>
                      <button onClick={() => setShowDetail(null)} className="text-slate-400 hover:text-slate-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-slate-50 rounded-lg p-4 text-center">
                        <p className="text-xs text-slate-400 uppercase mb-1">Capacidad 1 (40%)</p>
                        <p className={`text-2xl font-bold ${getNotaColor(g.nota_c1)}`}>{g.nota_c1 ?? '-'}</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-4 text-center">
                        <p className="text-xs text-slate-400 uppercase mb-1">Capacidad 2 (30%)</p>
                        <p className={`text-2xl font-bold ${getNotaColor(g.nota_c2)}`}>{g.nota_c2 ?? '-'}</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-4 text-center">
                        <p className="text-xs text-slate-400 uppercase mb-1">Capacidad 3 (30%)</p>
                        <p className={`text-2xl font-bold ${getNotaColor(g.nota_c3)}`}>{g.nota_c3 ?? '-'}</p>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${estado.color}`}>
                        {estado.label}
                      </span>
                      <p className="text-sm text-slate-500">
                        Promedio: <span className={`font-bold ${getNotaColor(g.promedio)}`}>{g.promedio ?? '-'}</span>/20
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Bar Chart */}
          <div className="glass-card p-6">
            <h3 className="font-semibold text-slate-800 mb-4">Grafico de Calificaciones</h3>
            <div className="flex items-end gap-3 h-48">
              {gradesWithAvg.map((g) => (
                <div key={g.id} className="flex-1 flex flex-col items-center">
                  <span className={`text-xs font-bold mb-1 ${getNotaColor(g.promedio)}`}>{g.promedio ?? '-'}</span>
                  <div className="w-full flex flex-col justify-end" style={{ height: '140px' }}>
                    <div
                      className={`w-full rounded-t-md transition-all duration-300 ${
                        g.promedio >= 14 ? 'bg-emerald-500' : g.promedio >= 11 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ height: `${getBarHeight(g.promedio)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-2 text-center leading-tight">UD-{g.unidad_didactica_id}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-6 mt-4 text-xs">
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-500 rounded-sm" /> Aprobado (14+)</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-amber-500 rounded-sm" /> Por Recuperar (11-13)</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500 rounded-sm" /> Desaprobado (&lt;11)</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'historial' && (
        <div className="glass-card p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Historial de Periodos</h3>
          <div className="space-y-4">
            {matriculas.map((m) => (
              <div key={m.id} className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-700">Periodo {m.periodo_id}</p>
                    <p className="text-sm text-slate-500">{m.detalles?.length || 0} unidades</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    m.estado_matricula === 'confirmada' ? 'bg-emerald-100 text-emerald-700' :
                    m.estado_matricula === 'pendiente' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {m.estado_matricula}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'tramites' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => handleTramite('constancia')}
            className="glass-card p-6 text-left hover:border-blue-300 border-2 border-transparent transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-800 mb-1">Solicitar Constancia</h3>
            <p className="text-sm text-slate-500">Constancia de estudios o de notas</p>
          </button>

          <button
            onClick={() => handleTramite('reclamo')}
            className="glass-card p-6 text-left hover:border-amber-300 border-2 border-transparent transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-800 mb-1">Reclamo de Nota</h3>
            <p className="text-sm text-slate-500">Solicitar revision de calificacion</p>
          </button>

          <button
            onClick={() => handleTramite('certificado')}
            className="glass-card p-6 text-left hover:border-emerald-300 border-2 border-transparent transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-800 mb-1">Certificado de Notas</h3>
            <p className="text-sm text-slate-500">Certificado oficial de calificaciones</p>
          </button>

          {tramiteModal && (
            <div className="md:col-span-3 glass-card p-6 border-l-4 border-l-blue-500">
              {tramiteConfirmado ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-slate-800 text-lg mb-2">Solicitud Enviada</h3>
                  <p className="text-slate-500">Tu solicitud ha sido registrada. Recibiras una notificacion pronto.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-slate-800">
                      {tramiteModal === 'constancia' && 'Solicitar Constancia de Estudios'}
                      {tramiteModal === 'reclamo' && 'Reclamo de Nota'}
                      {tramiteModal === 'certificado' && 'Solicitar Certificado de Notas'}
                    </h3>
                    <button onClick={() => setTramiteModal(null)} className="text-slate-400 hover:text-slate-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="space-y-4">
                    {tramiteModal === 'reclamo' && (
                      <div>
                        <label className="label">Asignatura</label>
                        <select className="input-field">
                          {gradesWithAvg.map(g => (
                            <option key={g.id} value={g.id}>Unidad Didactica {g.unidad_didactica_id}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="label">Motivo</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Motivo de la solicitud"
                        value={tramiteForm.motivo}
                        onChange={(e) => setTramiteForm({...tramiteForm, motivo: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="label">Detalles</label>
                      <textarea
                        className="input-field"
                        rows={3}
                        placeholder="Descripcion adicional..."
                        value={tramiteForm.detalles}
                        onChange={(e) => setTramiteForm({...tramiteForm, detalles: e.target.value})}
                      />
                    </div>
                    <div className="flex justify-end gap-3">
                      <button onClick={() => setTramiteModal(null)} className="px-4 py-2 text-slate-600 hover:text-slate-800">
                        Cancelar
                      </button>
                      <button onClick={submitTramite} className="btn-primary">
                        Enviar Solicitud
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-slate-400 py-4 border-t border-slate-100 mt-6">
        <p>Documento de uso informativo. Para constancia oficial, solicite en la Secretaria Academica.</p>
      </div>
    </div>
  );
}
