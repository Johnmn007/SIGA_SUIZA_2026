import { useState, useEffect } from 'react';
import {
  Upload, GraduationCap, CalendarDays, FileSpreadsheet,
  Search, CircleCheckBig,
} from 'lucide-react';
import { apiClient, API_BASE } from '../../core/api/client';
import { SectionInfoBlock } from './SectionInfoBlock';
import { getDefaultPeriod, getPeriodLabel, getPeriodLabelById, isHistoricalPeriod } from './periodUtils';
import './enrollmentPremium.css';

/**
 * Sección 1 del diagrama — Admisión.
 *
 * Carga la relación de ingresantes (Excel o JSON), permite una vista previa
 * (dry_run, sin escribir en BD) y ejecuta la matrícula automática de Ciclo I
 * al procesar, mostrando el resumen y la ficha de cada ingresante.
 */
export function AdmissionPanel() {
  const [programs, setPrograms] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [programaId, setProgramaId] = useState('');
  const [periodoId, setPeriodoId] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');
  const [ficha, setFicha] = useState(null);
  const [fichaLoading, setFichaLoading] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [p, pe] = await Promise.all([
          apiClient.request('/api/mod-programas-estudio/programas').catch(() => []),
          apiClient.callModule('mod-programas-estudio', 'periodos').catch(() => []),
        ]);
        const prog = Array.isArray(p) ? p : [];
        const per = Array.isArray(pe) ? pe : [];
        setPrograms(prog);
        setPeriods(per);
        if (prog.length > 0) setProgramaId(String(prog[0].id));
        const activo = getDefaultPeriod(per);
        if (activo) setPeriodoId(String(activo.id));
      } catch (e) {
        console.error('No se pudieron cargar programas/periodos:', e);
      }
    })();
  }, []);

  const subir = async (dryRun) => {
    if (!file) {
      setError('Selecciona un archivo .xlsx, .xls o .json');
      return;
    }
    if (!periodoId) {
      setError('Selecciona un periodo de matrícula');
      return;
    }
    const selPeriodo = periods.find(p => String(p.id) === String(periodoId));
    const estSel = (selPeriodo?.estado || '').toString().toLowerCase();
    if (estSel === 'historico' || estSel === 'cerrado') {
      setError('Este periodo es histórico y ya no permite nuevas matrículas.');
      return;
    }
    setLoading(true);
    setError('');
    setPreview(null);
    setResultado(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const params = new URLSearchParams({
        periodo_id: periodoId,
        matricular: String(!dryRun),
        dry_run: String(dryRun),
      });
      if (programaId) params.set('programa_id', programaId);

      const res = await fetch(
        `${API_BASE}/api/mod-gestion-academica/admision/upload-excel?${params.toString()}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          body: fd,
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || `Error ${res.status}`);
      if (dryRun) setPreview(data);
      else setResultado(data);
    } catch (e) {
      console.error(e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const verFicha = async (estudianteId) => {
    setFichaLoading(estudianteId);
    try {
      const data = await apiClient.request(`/api/mod-gestion-academica/estudiantes/${estudianteId}/ficha`);
      setFicha(data);
    } catch (e) {
      console.error(e);
      setError(`No se pudo obtener la ficha: ${e.message}`);
    } finally {
      setFichaLoading(null);
    }
  };

  const Badge = ({ children, tone = 'slate' }) => {
    const tones = {
      green: 'bg-green-100 text-green-700 border-green-200',
      red: 'bg-red-100 text-red-700 border-red-200',
      amber: 'bg-amber-100 text-amber-700 border-amber-200',
      sky: 'bg-sky-100 text-sky-700 border-sky-200',
      slate: 'bg-slate-100 text-slate-600 border-slate-200',
    };
    return (
      <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold border ${tones[tone]}`}>
        {children}
      </span>
    );
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Encabezado */}
      <SectionInfoBlock
        icon={Upload}
        ghostIcon={GraduationCap}
        title="1. Admisión — Carga de Ingresantes"
        description={
          <>
            Carga la relación de ingresantes en <b>Excel</b> o <b>JSON</b>. El sistema genera la ficha y
            realiza la <b>matrícula automática de Ciclo I</b> según la malla del programa.
          </>
        }
      />

      {/* Formulario */}
      <div className="sma-form grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="md:col-span-1">
          <label className="sma-field-label">
            <span className="sma-field-icon"><GraduationCap size={14} /></span>
            Programa (opcional)
          </label>
          <select
            className="input-field w-full py-2.5 text-sm"
            value={programaId}
            onChange={(e) => setProgramaId(e.target.value)}
          >
            <option value="">(Usar el del archivo / sin programa)</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-1">
          <label className="sma-field-label">
            <span className="sma-field-icon"><CalendarDays size={14} /></span>
            Periodo de matrícula *
          </label>
          <select
            className="input-field w-full py-2.5 text-sm"
            value={periodoId}
            onChange={(e) => {
              const pid = e.target.value;
              const sel = periods.find(p => String(p.id) === String(pid));
              const est = (sel?.estado || '').toString().toLowerCase();
              if (est === 'historico' || est === 'cerrado') {
                setError('Este periodo es histórico y ya no permite nuevas matrículas.');
                return;
              }
              setError('');
              setPeriodoId(pid);
            }}
          >
            <option value="">Selecciona un periodo</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id} disabled={isHistoricalPeriod(p)}>
                {getPeriodLabel(p)}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-1">
          <label className="sma-field-label">
            <span className="sma-field-icon"><FileSpreadsheet size={14} /></span>
            Archivo (.xlsx / .json)
          </label>
          <input
            type="file"
            accept=".xlsx,.xls,.json"
            onChange={(e) => {
              setFile(e.target.files[0] || null);
              setError('');
              setPreview(null);
              setResultado(null);
            }}
            className="sma-file-input"
          />
        </div>

        <div className="md:col-span-3 sma-actions pt-2">
          <button
            onClick={() => subir(true)}
            disabled={loading || !file}
            className="sma-btn sma-btn--ghost"
          >
            <Search size={16} />
            {loading ? 'Procesando...' : 'Vista previa'}
          </button>
          <button
            onClick={() => subir(false)}
            disabled={loading || !file}
            className="sma-btn sma-btn--primary"
          >
            <CircleCheckBig size={16} />
            {loading ? 'Procesando...' : 'Procesar y matricular ingresantes'}
          </button>
        </div>

        {error && (
          <div className="md:col-span-3 p-3 rounded-xl bg-red-50 text-red-700 border border-red-100 text-sm font-medium">
            ❌ {error}
          </div>
        )}
      </div>

      {/* Vista previa */}
      {preview && (
        <div className="glass-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h5 className="font-bold text-slate-800">Vista previa ({preview.total} registros)</h5>
            <div className="flex gap-2">
              <Badge tone="green">Nuevos: {preview.nuevos}</Badge>
              <Badge tone="amber">Ya existen: {preview.existentes}</Badge>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-200">
                  <th className="py-2 pr-4">DNI</th>
                  <th className="py-2 pr-4">Nombres</th>
                  <th className="py-2 pr-4">Apellidos</th>
                  <th className="py-2 pr-4">Programa</th>
                  <th className="py-2 pr-4">Celular</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {preview.registros.map((r, i) => (
                  <tr key={`${r.dni}-${i}`} className="hover:bg-slate-50">
                    <td className="py-2 pr-4 font-mono text-slate-700">{r.dni}</td>
                    <td className="py-2 pr-4 text-slate-700">{r.nombres}</td>
                    <td className="py-2 pr-4 text-slate-700">{r.apellidos}</td>
                    <td className="py-2 pr-4 text-slate-500">{r.programa_id || programaId || '-'}</td>
                    <td className="py-2 pr-4 text-slate-500">{r.celular || '-'}</td>
                    <td className="py-2 pr-4 text-slate-500">{r.email_personal || '-'}</td>
                    <td className="py-2">
                      {r.existe ? <Badge tone="amber">Ya existe</Badge> : <Badge tone="green">Nuevo</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            La vista previa no guarda nada. Pulsa <b>“Procesar y matricular”</b> para confirmar.
          </p>
        </div>
      )}

      {/* Resultado */}
      {resultado && (
        <div className="glass-card p-6 space-y-4">
          <h4 className="font-bold text-slate-800 flex items-center">
            <span className="text-green-500 mr-2">✅</span> Admisión procesada
          </h4>
          <div className="flex flex-wrap gap-3">
            <Badge tone="green">Estudiantes nuevos: {resultado.estudiantes_creados}</Badge>
            <Badge tone="amber">Ya existían: {resultado.estudiantes_existentes}</Badge>
            {resultado.matricula && (
              <>
                <Badge tone="sky">Matriculados: {resultado.matricula.matriculados}</Badge>
                <Badge tone="slate">Omitidas: {resultado.matricula.omitidas?.length || 0}</Badge>
                <Badge tone="red">Sin malla: {resultado.matricula.sin_malla?.length || 0}</Badge>
              </>
            )}
          </div>

          {resultado.matricula?.detalle?.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-200">
                    <th className="py-2 pr-4">Código</th>
                    <th className="py-2 pr-4">Estudiante ID</th>
                    <th className="py-2 pr-4">Ciclo</th>
                    <th className="py-2 pr-4">Unidades</th>
                    <th className="py-2">Ficha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {resultado.matricula.detalle.map((d) => (
                    <tr key={d.matricula_id} className="hover:bg-slate-50">
                      <td className="py-2 pr-4 font-mono text-slate-700">{d.codigo_estudiante || `#${d.estudiante_id}`}</td>
                      <td className="py-2 pr-4 text-slate-700">#{d.estudiante_id}</td>
                      <td className="py-2 pr-4 text-slate-500">{d.ciclo}</td>
                      <td className="py-2 pr-4 text-slate-500">{d.unidades}</td>
                      <td className="py-2">
                        <button
                          onClick={() => verFicha(d.estudiante_id)}
                          disabled={fichaLoading === d.estudiante_id}
                          className="px-3 py-1 rounded-lg text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 disabled:opacity-50"
                        >
                          {fichaLoading === d.estudiante_id ? 'Abriendo...' : 'Ver ficha'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {resultado.matricula?.omitidas?.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer font-semibold text-slate-600">Omitidas ({resultado.matricula.omitidas.length})</summary>
              <ul className="mt-2 space-y-1 text-slate-500 text-xs">
                {resultado.matricula.omitidas.map((o, i) => (
                  <li key={i}>Estudiante #{o.estudiante_id}: {o.motivo}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {/* Modal de ficha */}
      {ficha && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setFicha(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h5 className="font-bold text-slate-800">🧾 Ficha del Estudiante</h5>
              <button onClick={() => setFicha(null)} className="text-slate-400 hover:text-slate-700 text-xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="block text-[10px] uppercase font-bold text-slate-400">Código</span>{ficha.estudiante.codigo_estudiante}</div>
                <div><span className="block text-[10px] uppercase font-bold text-slate-400">DNI</span>{ficha.estudiante.dni}</div>
                <div className="col-span-2"><span className="block text-[10px] uppercase font-bold text-slate-400">Nombres</span>{ficha.estudiante.nombres} {ficha.estudiante.apellidos}</div>
                <div><span className="block text-[10px] uppercase font-bold text-slate-400">Programa</span>{ficha.estudiante.programa_id || '-'}</div>
                <div><span className="block text-[10px] uppercase font-bold text-slate-400">Estado</span>{ficha.estudiante.estado_academico}</div>
                <div><span className="block text-[10px] uppercase font-bold text-slate-400">Ciclo actual</span>{ficha.estudiante.ciclo_actual}</div>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Matrículas</p>
                {ficha.matriculas.length === 0 ? (
                  <p className="text-sm text-slate-400">Sin matrículas registradas.</p>
                ) : (
                  <ul className="space-y-2">
                    {ficha.matriculas.map((m) => (
                      <li key={m.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                        <div className="flex justify-between">
                          <span className="font-semibold text-slate-700">Periodo {getPeriodLabelById(periods, m.periodo_id)} · Ciclo {m.ciclo}</span>
                          <Badge tone={m.estado_matricula === 'confirmada' ? 'green' : 'slate'}>{m.estado_matricula}</Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{m.unidades} unidades · {m.creditos} créditos · {m.casuistica}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdmissionPanel;
