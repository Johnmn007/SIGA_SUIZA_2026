import { useState, useEffect } from 'react';
import { apiClient } from '../../core/api/client';

const TIPOS = [
  { id: 'Ingresante', tone: 'bg-sky-100 text-sky-700 border-sky-200', icon: '🆕' },
  { id: 'Invicto', tone: 'bg-green-100 text-green-700 border-green-200', icon: '✅' },
  { id: 'Jalado', tone: 'bg-amber-100 text-amber-700 border-amber-200', icon: '🟥' },
  { id: 'Historico', tone: 'bg-purple-100 text-purple-700 border-purple-200', icon: '📜' },
];

/** Sección 2 del diagrama — Tipos de alumnos históricos. */
export function TiposAlumnosPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('');
  const [programaFiltro, setProgramaFiltro] = useState('');

  const cargar = async () => {
    setLoading(true);
    setError('');
    try {
      const json = await apiClient.request('/api/mod-gestion-academica/matriculas/tipos-alumnos');
      setData(json);
    } catch (e) {
      console.error(e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const estudiantes = data?.estudiantes || [];
  const resumen = data?.resumen || {};
  const total = resumen.total || 0;

  const programas = [...new Set(estudiantes.map((e) => e.programa_id).filter(Boolean))]
    .sort((a, b) => a - b);

  const filtrados = estudiantes.filter((e) => {
    if (tipoFiltro && e.tipo_alumno !== tipoFiltro) return false;
    if (programaFiltro && String(e.programa_id) !== String(programaFiltro)) return false;
    if (search.trim().length >= 2) {
      const q = search.trim().toLowerCase();
      return (
        (e.dni || '').includes(q) ||
        (e.nombres || '').toLowerCase().includes(q) ||
        (e.apellidos || '').toLowerCase().includes(q) ||
        (e.codigo_estudiante || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const toneDe = (tipo) => TIPOS.find((t) => t.id === tipo)?.tone || 'bg-slate-100 text-slate-600 border-slate-200';

  return (
    <div className="animate-fade-in space-y-6">
      {/* Encabezado */}
      <div className="glass-card p-6">
        <h4 className="text-xl font-bold text-slate-800 flex items-center mb-1">
          <span className="w-9 h-9 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center mr-3">👥</span>
          2. Tipos de Alumnos Históricos
        </h4>
        <p className="text-slate-500 text-sm">
          Clasificación automática del alumnado: <b>Invicto</b> (sin cursos a cargo),
          <b> Jalado</b> (con cursos a cargo por desaprobar/retirarse) y
          <b> Histórico</b> (proviene de un plan de estudios anterior).
        </p>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <button
          onClick={() => setTipoFiltro('')}
          className={`glass-card p-4 text-left transition-all ${tipoFiltro === '' ? 'ring-2 ring-primary' : ''}`}
        >
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total</p>
          <p className="text-2xl font-extrabold text-slate-800">{total}</p>
        </button>
        {TIPOS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTipoFiltro(tipoFiltro === t.id ? '' : t.id)}
            className={`glass-card p-4 text-left transition-all ${tipoFiltro === t.id ? 'ring-2 ring-primary' : ''}`}
          >
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{t.icon} {t.id}</p>
            <p className="text-2xl font-extrabold text-slate-800">{resumen[t.id] || 0}</p>
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="glass-card p-3 flex flex-wrap items-center gap-3">
        <span className="px-2 text-slate-400 text-xl">🔍</span>
        <input
          type="text"
          className="flex-1 min-w-[200px] bg-transparent border-none focus:ring-0 py-2 text-slate-700 placeholder-slate-400 outline-none"
          placeholder="Buscar por DNI, Nombre o Código..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input-field py-2 text-sm w-48"
          value={programaFiltro}
          onChange={(e) => setProgramaFiltro(e.target.value)}
        >
          <option value="">Todos los programas</option>
          {programas.map((p) => (
            <option key={p} value={p}>Programa {p}</option>
          ))}
        </select>
        {(tipoFiltro || programaFiltro || search) && (
          <button
            onClick={() => { setTipoFiltro(''); setProgramaFiltro(''); setSearch(''); }}
            className="px-3 py-2 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100"
          >
            Limpiar
          </button>
        )}
        <button
          onClick={cargar}
          className="px-3 py-2 rounded-lg text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20"
        >
          ⟳ Recargar
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 text-red-700 border border-red-100 text-sm font-medium">❌ {error}</div>
      )}

      {data?.plan_vigente === null && (
        <div className="p-3 rounded-xl bg-amber-50 text-amber-700 border border-amber-100 text-xs">
          ℹ️ El programa no tiene un <b>plan de estudios vigente</b> definido, así que la detección de alumnos
          <b> Histórico</b> está desactivada hasta que se registre uno.
        </div>
      )}

      {/* Tabla */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h5 className="font-bold text-slate-800">Alumnos ({filtrados.length})</h5>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Código</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Estudiante</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">DNI</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Tipo</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Aprob.</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Desap.</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Retir.</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">C. a cargo</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Ciclo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center">
                    <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-2"></div>
                    <p className="text-slate-500 font-medium">Clasificando alumnos...</p>
                  </td>
                </tr>
              ) : filtrados.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center">
                    <div className="text-4xl mb-3 opacity-50">👥</div>
                    <p className="text-slate-500 font-medium">No hay alumnos para este filtro.</p>
                  </td>
                </tr>
              ) : (
                filtrados.map((e) => (
                  <tr key={e.estudiante_id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-700">{e.codigo_estudiante}</td>
                    <td className="py-3 px-4 text-slate-800 font-medium">{e.nombres} {e.apellidos}</td>
                    <td className="py-3 px-4 text-slate-600">{e.dni}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold border ${toneDe(e.tipo_alumno)}`}>
                        {e.tipo_alumno}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-slate-600">{e.aprobadas}</td>
                    <td className="py-3 px-4 text-center text-slate-600">{e.desaprobadas}</td>
                    <td className="py-3 px-4 text-center text-slate-600">{e.retiradas}</td>
                    <td className="py-3 px-4 text-center">
                      {e.unidades_a_cargo?.length > 0 ? (
                        <span className="inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-xs font-bold" title={`Unidades: ${e.unidades_a_cargo.join(', ')}`}>
                          {e.unidades_a_cargo.length}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{e.ciclo_actual}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default TiposAlumnosPanel;
