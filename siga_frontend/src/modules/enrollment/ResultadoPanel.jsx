import { useState, useEffect } from 'react';
import { BadgeCheck, Trophy } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { apiClient, API_BASE } from '../../core/api/client';
import { SectionInfoBlock } from './SectionInfoBlock';
import { getPeriodLabelById } from './periodUtils';

const PASOS = [
  'Se consolida la matrícula y se genera el registro académico del ciclo.',
  'Se asignan códigos, horarios y docentes de cada unidad didáctica.',
  'Se emite la boleta de matrícula con su código QR de validación.',
  'Se notifica al estudiante y a la secretaría el cierre del proceso.',
  'Se actualiza el historial académico y el avance de créditos del alumno.',
];

/** Sección 7 del diagrama — Resultado final (consolidación en 5 pasos). */
export function ResultadoPanel() {
  const [data, setData] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [soloPendientes, setSoloPendientes] = useState(false);
  const [consolidando, setConsolidando] = useState(null);

  const [detalle, setDetalle] = useState(null); // { row, pasos }
  const [avance, setAvance] = useState(null);
  const [historial, setHistorial] = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  const cargar = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (soloPendientes) params.set('solo_pendientes', 'true');
      if (search.trim()) params.set('q', search.trim());
      const json = await apiClient.request(`/api/mod-gestion-academica/matriculas/resultado?${params.toString()}`);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soloPendientes]);

  useEffect(() => {
    (async () => {
      const per = await apiClient.callModule('mod-programas-estudio', 'periodos').catch(() => []);
      setPeriods(Array.isArray(per) ? per : []);
    })();
  }, []);

  const abrirDetalle = async (row, pasos = null) => {
    setDetalle({ row, pasos });
    setAvance(null);
    setHistorial(null);
    setLoadingDetalle(true);
    try {
      const [av, hi] = await Promise.all([
        apiClient.request(`/api/mod-gestion-academica/estudiantes/${row.estudiante_id}/avance?programa_id=${row.programa_id}`).catch(() => null),
        apiClient.request(`/api/mod-gestion-academica/estudiantes/${row.estudiante_id}/historial`).catch(() => null),
      ]);
      setAvance(av);
      setHistorial(hi);
    } finally {
      setLoadingDetalle(false);
    }
  };

  const consolidar = async (row) => {
    setConsolidando(row.matricula_id);
    setError('');
    try {
      const res = await apiClient.callModule('mod-gestion-academica', `matriculas/${row.matricula_id}/consolidar`, 'POST');
      await cargar();
      const paso1 = res.pasos?.find((p) => p.paso === 1);
      const paso3 = res.pasos?.find((p) => p.paso === 3);
      abrirDetalle(
        {
          ...row,
          consolidada: true,
          estado_matricula: 'confirmada',
          registro_academico: paso1?.registro_academico ?? row.registro_academico,
          boleta_codigo: paso3?.codigo_boleta ?? row.boleta_codigo,
        },
        res.pasos
      );
    } catch (e) {
      console.error(e);
      setError(e.message);
    } finally {
      setConsolidando(null);
    }
  };

  const filas = data?.matriculas || [];
  const resumen = data?.resumen || {};

  const urlQr = (codigo) => `${API_BASE}/api/mod-gestion-academica/boletas/validar/${codigo}`;
  const nf = (n) => (n ?? 0).toLocaleString('es-PE');

  return (
    <div className="animate-fade-in space-y-6">
      {/* Encabezado */}
      <SectionInfoBlock
        icon={Trophy}
        ghostIcon={BadgeCheck}
        title="7. Resultado final"
        description={
          <>
            Presenta el estado final del proceso de matrícula del estudiante, incluyendo validaciones y
            observaciones correspondientes. Cierre del proceso: consolidación, códigos y docentes,
            boleta con QR, notificación y actualización del historial.
          </>
        }
      >
        <ol className="grid gap-2 sm:grid-cols-2">
          {PASOS.map((p, i) => (
            <li key={p} className="flex gap-2 rounded-lg border border-[#D9EBFF] bg-[#EAF3FF]/70 px-3 py-2 text-xs text-[#0B3D91]">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0047B3] text-[10px] font-extrabold text-white">
                {i + 1}
              </span>
              <span>{p}</span>
            </li>
          ))}
        </ol>
      </SectionInfoBlock>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Matrículas</p>
          <p className="text-2xl font-extrabold text-slate-800">{resumen.total || 0}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Consolidadas</p>
          <p className="text-2xl font-extrabold text-emerald-600">{resumen.consolidadas || 0}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Pendientes</p>
          <p className="text-2xl font-extrabold text-amber-600">{resumen.pendientes || 0}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="glass-card p-3 flex flex-wrap items-center gap-3">
        <span className="px-2 text-slate-400 text-xl">🔍</span>
        <input
          type="text"
          className="flex-1 min-w-[200px] bg-transparent border-none focus:ring-0 py-2 text-slate-700 placeholder-slate-400 outline-none"
          placeholder="Buscar por DNI, Nombre, Código o registro académico..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && cargar()}
        />
        <label className="flex items-center gap-2 text-sm text-slate-600 font-medium cursor-pointer">
          <input type="checkbox" checked={soloPendientes} onChange={(e) => setSoloPendientes(e.target.checked)} className="w-4 h-4 rounded" />
          Solo pendientes
        </label>
        <button onClick={cargar} className="px-3 py-2 rounded-lg text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20">
          ⟳ Recargar
        </button>
      </div>

      {error && <div className="p-3 rounded-xl bg-red-50 text-red-700 border border-red-100 text-sm font-medium">❌ {error}</div>}

      {/* Tabla */}
      <div className="glass-card p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Estudiante</th>
                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Periodo</th>
                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Ciclo</th>
                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Estado</th>
                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Registro académico</th>
                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Boleta</th>
                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="7" className="py-12 text-center text-slate-500 font-medium">Cargando...</td></tr>
              ) : filas.length === 0 ? (
                <tr><td colSpan="7" className="py-12 text-center text-slate-500 font-medium">No hay matrículas para este filtro.</td></tr>
              ) : (
                filas.map((m) => (
                  <tr key={m.matricula_id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-slate-800 font-medium">{m.nombres} {m.apellidos}
                      <span className="block text-xs text-slate-400">{m.codigo_estudiante}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{getPeriodLabelById(periods, m.periodo_id)}</td>
                    <td className="py-3 px-4 text-slate-600">{m.ciclo ?? '—'}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-1 text-[10px] font-bold uppercase rounded border ${
                        m.consolidada ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {m.consolidada ? 'Consolidada' : m.estado_matricula}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {m.registro_academico
                        ? <span className="font-mono text-xs font-bold text-slate-700">{m.registro_academico}</span>
                        : <span className="text-xs text-slate-400">—</span>}
                    </td>
                    <td className="py-3 px-4">
                      {m.tiene_boleta
                        ? <span className="font-mono text-xs text-slate-600">{m.boleta_codigo}</span>
                        : <span className="text-xs text-slate-400">—</span>}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => abrirDetalle(m)} className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg">
                          Ver resultado
                        </button>
                        {!m.consolidada && (
                          <button
                            onClick={() => consolidar(m)}
                            disabled={consolidando === m.matricula_id}
                            className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50"
                          >
                            {consolidando === m.matricula_id ? 'Consolidando...' : 'Consolidar'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal detalle */}
      {detalle && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 p-4 overflow-y-auto" onClick={() => setDetalle(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h5 className="font-bold text-slate-800">Resultado final — {detalle.row.nombres} {detalle.row.apellidos}</h5>
                <p className="text-xs text-slate-400">{detalle.row.codigo_estudiante} · Ciclo {detalle.row.ciclo} · Periodo {getPeriodLabelById(periods, detalle.row.periodo_id)}</p>
              </div>
              <button onClick={() => setDetalle(null)} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">×</button>
            </div>

            <div className="p-6 space-y-5">
              {/* 5 pasos */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Consolidación (5 pasos)</p>
                <ol className="space-y-1.5">
                  {PASOS.map((p, i) => (
                    <li key={p} className="flex gap-2 text-sm text-slate-700">
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold text-white ${detalle.row.consolidada ? 'bg-emerald-600' : 'bg-slate-300'}`}>
                        {detalle.row.consolidada ? '✓' : i + 1}
                      </span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Datos */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-200 p-3">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Registro académico</p>
                  <p className="font-mono text-sm text-slate-800">{detalle.row.registro_academico || '—'}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-3">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Estado</p>
                  <p className="text-sm text-slate-800">{detalle.row.estado_matricula}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-3">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Casuística</p>
                  <p className="text-sm text-slate-800">{detalle.row.casuistica || '—'}</p>
                </div>
              </div>

              {/* Boleta + QR */}
              {detalle.row.boleta_codigo && (
                <div className="flex flex-col sm:flex-row items-center gap-4 rounded-xl border border-slate-200 p-4">
                  <QRCodeSVG value={urlQr(detalle.row.boleta_codigo)} size={120} />
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Boleta de matrícula</p>
                    <p className="font-mono text-sm font-bold text-slate-800">{detalle.row.boleta_codigo}</p>
                    <p className="text-xs text-slate-500 mt-1">Escanea el QR para validar la boleta.</p>
                  </div>
                </div>
              )}

              {/* Docentes asignados (si se acaba de consolidar) */}
              {detalle.pasos?.find((p) => p.paso === 2)?.asignaciones?.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Docentes / horarios asignados</p>
                  <div className="flex flex-wrap gap-2">
                    {detalle.pasos.find((p) => p.paso === 2).asignaciones.map((a) => (
                      <span key={a.id} className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-700">
                        UD #{a.unidad_didactica_id} · Docente {a.docente_id} · {a.turno} · Sec. {a.seccion}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Avance */}
              {loadingDetalle ? (
                <p className="text-sm text-slate-400">Cargando avance e historial...</p>
              ) : avance ? (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-2">Avance de créditos</p>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="h-2.5 rounded-full bg-white border border-emerald-100 overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, avance.porcentaje_avance || 0)}%` }} />
                      </div>
                    </div>
                    <span className="text-sm font-extrabold text-emerald-700">{avance.porcentaje_avance}%</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-600">
                    {nf(avance.creditos_aprobados)} / {nf(avance.creditos_totales)} créditos · Ciclo actual {avance.ciclo_actual} · {avance.condicion}
                  </p>
                </div>
              ) : null}

              {/* Historial */}
              {historial?.matriculas?.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Historial de matrículas</p>
                  <ul className="space-y-1.5">
                    {historial.matriculas.map((h) => (
                      <li key={h.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                        <span className="text-slate-700">Periodo {getPeriodLabelById(periods, h.periodo_id)} · Ciclo {h.ciclo ?? '—'}</span>
                        <span className="text-xs text-slate-500">{h.unidades.length} unidades · {h.estado_matricula}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-xs text-slate-500">
                ✉️ Notificación enviada al estudiante y a la secretaría al cerrar el proceso.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ResultadoPanel;
