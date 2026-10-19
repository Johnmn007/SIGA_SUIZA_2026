import { useState, useEffect, useMemo } from 'react';
import { apiClient } from '../../core/api/client';

const REGLAS = [
  'Máximo de créditos por ciclo según lo establecido en el plan de estudios vigente.',
  'El alumno con cursos a cargo no puede exceder el límite de unidades reprobadas admitidas.',
  'No se admite la matrícula en una unidad didáctica sin haber aprobado su prerrequisito.',
  'Una unidad didáctica no puede cursarse por tercera vez.',
];

/** Sección 6 del diagrama — Restricciones de créditos y académicas. */
export function RestriccionesPanel() {
  const [students, setStudents] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [periods, setPeriods] = useState([]);

  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [programaId, setProgramaId] = useState('');
  const [periodoId, setPeriodoId] = useState('');

  const [reporte, setReporte] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [est, prog, per] = await Promise.all([
          apiClient.request('/api/mod-gestion-academica/estudiantes/').catch(() => []),
          apiClient.request('/api/mod-programas-estudio/programas').catch(() => []),
          apiClient.request('/api/mod-programas-estudio/periodos').catch(() => []),
        ]);
        setStudents(Array.isArray(est) ? est : []);
        const progs = Array.isArray(prog) ? prog : [];
        const pers = Array.isArray(per) ? per : [];
        setPrograms(progs);
        setPeriods(pers);
        if (progs.length > 0) setProgramaId(String(progs[0].id));
        if (pers.length > 0) {
          const activo = pers.find((x) => x.estado === 'ACTIVO') || pers[pers.length - 1];
          setPeriodoId(String(activo.id));
        }
      } catch (e) {
        console.error(e);
        setError(e.message);
      }
    })();
  }, []);

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 2 || selectedStudent) return [];
    return students
      .filter(
        (s) =>
          (s.dni || '').includes(q) ||
          (s.nombres || '').toLowerCase().includes(q) ||
          (s.apellidos || '').toLowerCase().includes(q) ||
          (s.codigo_estudiante || '').toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [students, search, selectedStudent]);

  const seleccionar = (s) => {
    setSelectedStudent(s);
    setSearch('');
    setReporte(null);
    setError('');
  };

  const validar = async () => {
    if (!selectedStudent) {
      setError('Selecciona un estudiante');
      return;
    }
    if (!programaId || !periodoId) {
      setError('Selecciona programa y periodo');
      return;
    }
    setLoading(true);
    setError('');
    setReporte(null);
    try {
      const qs = new URLSearchParams({
        estudiante_id: selectedStudent.id,
        programa_id: programaId,
        periodo_id: periodoId,
      });
      const data = await apiClient.request(`/api/mod-gestion-academica/matriculas/restricciones?${qs.toString()}`);
      setReporte(data);
    } catch (e) {
      console.error(e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const grupo = (titulo, unidades) => (
    <div className="rounded-xl border border-pink-100 bg-pink-50/50 p-3">
      <p className="text-xs font-bold uppercase tracking-wider text-pink-600 mb-2">
        {titulo} <span className="text-slate-400">({(unidades || []).length})</span>
      </p>
      {(unidades || []).length === 0 ? (
        <p className="text-xs text-slate-400">Sin unidades.</p>
      ) : (
        <ul className="space-y-1.5">
          {unidades.map((u) => (
            <li key={u.unidad_didactica_id} className="flex items-start justify-between gap-3 rounded-lg border border-pink-100 bg-white px-3 py-2 text-sm">
              <div>
                <span className="font-semibold text-slate-800">{u.nombre}</span>
                <span className="ml-2 text-xs text-slate-500">Ciclo {u.periodo} · {u.creditos} cr.</span>
                <span className="block text-xs text-pink-700 mt-0.5">{u.motivo}</span>
              </div>
              <span className="text-xs font-mono text-slate-400 shrink-0">#{u.unidad_didactica_id}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="animate-fade-in space-y-6">
      {/* Encabezado */}
      <div className="glass-card p-6 border-t-4 border-pink-400">
        <h4 className="text-xl font-bold text-slate-800 flex items-center mb-1">
          <span className="w-9 h-9 rounded-lg bg-pink-100 text-pink-700 flex items-center justify-center mr-3">🔒</span>
          6. Restricciones de créditos
        </h4>
        <p className="text-slate-500 text-sm">
          El sistema valida automáticamente las reglas de créditos y condiciones académicas antes de
          autorizar la matrícula.
        </p>
        <div className="grid gap-2.5 mt-4 sm:grid-cols-2">
          {REGLAS.map((item) => (
            <div key={item} className="flex gap-2.5 rounded-lg border border-pink-100 bg-pink-50/60 px-3 py-2">
              <span className="mt-0.5 text-pink-500">🔒</span>
              <p className="text-xs leading-relaxed text-pink-900/80">{item}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Selección */}
      <div className="glass-card p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Estudiante</label>
            {selectedStudent ? (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2.5">
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{selectedStudent.nombres} {selectedStudent.apellidos}</p>
                  <p className="text-xs text-slate-500">DNI {selectedStudent.dni} · {selectedStudent.codigo_estudiante}</p>
                </div>
                <button onClick={() => { setSelectedStudent(null); setReporte(null); }} className="text-xs font-bold text-primary hover:underline">Cambiar</button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  className="input-field w-full py-2.5 text-sm"
                  placeholder="Buscar por DNI, nombre o código (mín. 2 letras)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {matches.length > 0 && (
                  <ul className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                    {matches.map((s) => (
                      <li
                        key={s.id}
                        onClick={() => seleccionar(s)}
                        className="px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0"
                      >
                        <span className="font-medium text-slate-800">{s.nombres} {s.apellidos}</span>
                        <span className="block text-xs text-slate-400">{s.dni} · {s.codigo_estudiante}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div></div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Programa</label>
            <select className="input-field w-full py-2.5 text-sm" value={programaId} onChange={(e) => setProgramaId(e.target.value)}>
              <option value="">Selecciona</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Periodo</label>
            <select className="input-field w-full py-2.5 text-sm" value={periodoId} onChange={(e) => setPeriodoId(e.target.value)}>
              <option value="">Selecciona</option>
              {periods.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre || `Periodo ${p.id}`} ({p.estado || '—'})</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={validar}
              disabled={loading || !selectedStudent}
              className="btn-primary w-full px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Validando...' : '🔒 Validar restricciones'}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 text-red-700 border border-red-100 text-sm font-medium">❌ {error}</div>
        )}
      </div>

      {/* Resultado */}
      {reporte && (
        <div className="space-y-4">
          {/* Veredicto */}
          <div className={`glass-card p-6 border-t-4 ${reporte.aprobado ? 'border-green-400' : 'border-pink-500'}`}>
            <div className="flex flex-wrap items-center gap-3">
              <span className={`px-4 py-1.5 rounded-full font-extrabold text-sm border ${
                reporte.aprobado
                  ? 'bg-green-100 text-green-700 border-green-200'
                  : 'bg-pink-100 text-pink-700 border-pink-200'
              }`}>
                {reporte.aprobado ? '✅ Sin restricciones' : '🔒 Con restricciones'}
              </span>
              <span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-bold text-slate-600 border border-slate-200">
                {reporte.tipo_alumno} · {reporte.casuistica} · {reporte.modo}
              </span>
              <span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-bold text-slate-600 border border-slate-200">
                Ciclo sugerido {reporte.ciclo_sugerido}
              </span>
            </div>
          </div>

          {/* Requisitos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {reporte.requisitos.map((r) => (
              <div
                key={r.clave}
                className={`glass-card p-4 border-l-4 ${r.cumple ? 'border-green-400' : 'border-pink-500'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-800">{r.descripcion}</p>
                  <span className="text-lg shrink-0">{r.cumple ? '✅' : '❌'}</span>
                </div>
                <p className={`mt-1 text-xs font-medium ${r.cumple ? 'text-green-600' : 'text-pink-600'}`}>{r.detalle}</p>
              </div>
            ))}
          </div>

          {/* Detalle bloqueadas */}
          <div className="glass-card p-6 space-y-3">
            <h5 className="font-bold text-pink-700 text-sm">🔒 Unidades bloqueadas ({reporte.bloqueadas.total})</h5>
            {grupo('Por prerrequisito', reporte.bloqueadas.por_prerrequisito)}
            {grupo('Por tercera vez (intentos)', reporte.bloqueadas.por_intentos)}
            {reporte.bloqueadas.otras.length > 0 && grupo('Otras', reporte.bloqueadas.otras)}
          </div>

          {/* Avisos */}
          {(reporte.warnings.length > 0 || reporte.errores.length > 0) && (
            <div className="glass-card p-6">
              <h5 className="font-bold text-slate-700 text-sm mb-3">⚠️ Avisos del sistema</h5>
              <ul className="space-y-1.5">
                {reporte.errores.map((e, i) => (
                  <li key={`e${i}`} className="text-xs text-red-700">⛔ {e}</li>
                ))}
                {reporte.warnings.map((w, i) => (
                  <li key={`w${i}`} className="text-xs text-amber-700">⚠️ {w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default RestriccionesPanel;
