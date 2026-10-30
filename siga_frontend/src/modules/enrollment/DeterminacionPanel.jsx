import { useState, useEffect, useMemo } from 'react';
import { ClipboardCheck, Scale } from 'lucide-react';
import { apiClient } from '../../core/api/client';
import { SectionInfoBlock } from './SectionInfoBlock';
import { getDefaultPeriod, getPeriodLabel } from './periodUtils';

/** Sección 4 del diagrama — Determinación del ciclo y cursos. */
export function DeterminacionPanel() {
  const [students, setStudents] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [periods, setPeriods] = useState([]);

  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [programaId, setProgramaId] = useState('');
  const [periodoId, setPeriodoId] = useState('');

  const [propuesta, setPropuesta] = useState(null);
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
        const activo = getDefaultPeriod(pers);
        if (activo) setPeriodoId(String(activo.id));
      } catch (e) {
        console.error(e);
        setError(e.message);
      }
    })();
  }, []);

  const seleccionar = (s) => {
    setSelectedStudent(s);
    setSearch('');
    setPropuesta(null);
    setError('');
  };

  const determinar = async () => {
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
    setPropuesta(null);
    try {
      const qs = new URLSearchParams({
        estudiante_id: selectedStudent.id,
        programa_id: programaId,
        periodo_id: periodoId,
      });
      const data = await apiClient.request(`/api/mod-gestion-academica/matriculas/propuesta?${qs.toString()}`);
      setPropuesta(data);
    } catch (e) {
      console.error(e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const matches = useMemo(() => {
    if (search.trim().length < 2 || selectedStudent) return [];
    const q = search.trim().toLowerCase();
    return students
      .filter((s) =>
        (s.dni || '').includes(q) ||
        (s.nombres || '').toLowerCase().includes(q) ||
        (s.apellidos || '').toLowerCase().includes(q) ||
        (s.codigo_estudiante || '').toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [students, search, selectedStudent]);

  const lista = (arr, tone) =>
    (arr || []).map((u) => (
      <li key={u.unidad_didactica_id} className={`flex items-start justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${tone}`}>
        <div>
          <span className="font-semibold text-slate-800">{u.nombre}</span>
          <span className="ml-2 text-xs text-slate-500">Ciclo {u.periodo} · {u.creditos} cr.</span>
          {u.motivo && <span className="block text-xs text-slate-500 mt-0.5">{u.motivo}</span>}
        </div>
        <span className="text-xs font-mono text-slate-400 shrink-0">#{u.unidad_didactica_id}</span>
      </li>
    ));

  return (
    <div className="animate-fade-in space-y-6">
      {/* Encabezado */}
      <SectionInfoBlock
        icon={Scale}
        ghostIcon={ClipboardCheck}
        title="4. Determinación"
        description={
          <>
            Evalúa la información del estudiante y determina su condición académica según las reglas
            del proceso de matrícula, detectando el <b>siguiente ciclo</b> y los <b>cursos correspondientes</b>.
          </>
        }
        chips={['Ciclo sugerido', 'Cursos a cargo', 'Casuística']}
      />

      {/* Selección */}
      <div className="glass-card p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Estudiante */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Estudiante</label>
            {selectedStudent ? (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2.5">
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{selectedStudent.nombres} {selectedStudent.apellidos}</p>
                  <p className="text-xs text-slate-500">DNI {selectedStudent.dni} · {selectedStudent.codigo_estudiante}</p>
                </div>
                <button onClick={() => { setSelectedStudent(null); setPropuesta(null); }} className="text-xs font-bold text-primary hover:underline">Cambiar</button>
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
                <option key={p.id} value={p.id}>{getPeriodLabel(p)}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={determinar}
              disabled={loading || !selectedStudent}
              className="btn-primary w-full px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Determinando...' : '⚙️ Determinar ciclo y cursos'}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 text-red-700 border border-red-100 text-sm font-medium">❌ {error}</div>
        )}
      </div>

      {/* Resultado */}
      {propuesta && (
        <div className="space-y-4">
          {/* Ciclo detectado */}
          <div className="glass-card p-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-dark">
                Ciclo {propuesta.ciclo_sugerido}
              </span>
              <span className="px-3 py-1 bg-white rounded-full font-bold text-indigo-700 border border-indigo-100 text-xs">Casuística: {propuesta.casuistica}</span>
              <span className="px-3 py-1 bg-white rounded-full font-bold text-slate-600 border border-slate-200 text-xs">Tipo: {propuesta.tipo_alumno || '—'}</span>
              <span className={`px-3 py-1 rounded-full font-bold text-xs border ${
                propuesta.tiene_cursos_a_cargo ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-green-100 text-green-700 border-green-200'
              }`}>
                ¿Tiene cursos a cargo? {propuesta.tiene_cursos_a_cargo ? 'Sí' : 'No'}
              </span>
            </div>
            {propuesta.periodo && (
              <p className={`mt-3 text-xs font-semibold ${propuesta.periodo.abierto ? (propuesta.periodo.extemporanea ? 'text-amber-600' : 'text-green-600') : 'text-red-600'}`}>
                {propuesta.periodo.abierto ? '✅' : '🔒'} {propuesta.periodo.mensaje}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Cursos a cargo (rama Sí) */}
            <div className="glass-card p-6">
              <h5 className="font-bold text-amber-700 mb-3 flex items-center text-sm">
                ✅ Sí — Cursos a cargo <span className="ml-2 text-xs font-normal text-slate-400">(jalados / arrastre)</span>
              </h5>
              {propuesta.obligatorias?.length > 0 ? (
                <ul className="space-y-2">{lista(propuesta.obligatorias, 'bg-amber-50 border-amber-200 text-amber-900')}</ul>
              ) : (
                <p className="text-sm text-slate-400">No tiene cursos a cargo.</p>
              )}
            </div>

            {/* Cursos del ciclo (rama No) */}
            <div className="glass-card p-6">
              <h5 className="font-bold text-sky-700 mb-3 flex items-center text-sm">
                🔀 No — Cursos del ciclo correspondiente
              </h5>
              {propuesta.sugeridas?.length > 0 ? (
                <ul className="space-y-2">{lista(propuesta.sugeridas, 'bg-sky-50 border-sky-200 text-sky-900')}</ul>
              ) : (
                <p className="text-sm text-slate-400">Sin cursos sugeridos para el ciclo detectado.</p>
              )}
            </div>
          </div>

          {/* Totales + bloqueadas */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="glass-card p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Créditos a cargo</p>
              <p className="text-2xl font-extrabold text-slate-800">{propuesta.resumen?.creditos_obligatorios ?? 0}</p>
              <p className="text-xs text-slate-400">Permitido: {propuesta.resumen?.min_creditos}–{propuesta.resumen?.max_creditos} cr.</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Bloqueadas (restricciones)</p>
              <p className="text-2xl font-extrabold text-red-600">{propuesta.resumen?.total_bloqueadas ?? 0}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Universo (permitidas)</p>
              <p className="text-2xl font-extrabold text-slate-800">{propuesta.permitidas?.length ?? 0}</p>
            </div>
          </div>

          {propuesta.bloqueadas?.length > 0 && (
            <div className="glass-card p-6">
              <h5 className="font-bold text-red-700 mb-3 text-sm">🔒 Unidades bloqueadas</h5>
              <ul className="space-y-2">{lista(propuesta.bloqueadas, 'bg-red-50 border-red-200 text-red-900')}</ul>
            </div>
          )}

          {(propuesta.warnings?.length > 0 || propuesta.errores?.length > 0) && (
            <div className="glass-card p-6">
              <h5 className="font-bold text-slate-700 mb-3 text-sm">Avisos del motor</h5>
              <ul className="space-y-1">
                {[...(propuesta.errores || []), ...(propuesta.warnings || [])].map((w, i) => (
                  <li key={i} className="text-xs text-amber-700 flex items-start"><span className="mr-1">⚠️</span><span>{w}</span></li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DeterminacionPanel;
