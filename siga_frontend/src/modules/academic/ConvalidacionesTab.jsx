import { useState, useEffect, useMemo } from 'react';
import { apiClient } from '../../core/api/client';
import { Plus, Trash2, Repeat } from 'lucide-react';

const TIPOS = ['Traslado Interno', 'Traslado Externo', 'Cambio de Plan de Estudio', 'Experiencia Formativa'];
const BASE = '/api/mod-gestion-academica';
const FORM_VACIO = { estudiante_id: '', numero_resolucion: '', fecha_emision: '', tipo_convalidacion: TIPOS[0], institucion_origen: '' };
const DETALLE_VACIO = { unidad_destino_id: '', curso_origen: '', nota_reconocida: '', creditos_reconocidos: '' };

export function ConvalidacionesTab() {
  const [resoluciones, setResoluciones] = useState([]);
  const [estudiantes, setEstudiantes] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [detalles, setDetalles] = useState([{ ...DETALLE_VACIO }]);

  const nombreEstudiante = useMemo(
    () => new Map(estudiantes.map(e => [e.id, `${e.apellidos}, ${e.nombres}`])),
    [estudiantes]
  );
  const nombreUnidad = useMemo(() => new Map(unidades.map(u => [u.id, u.nombre])), [unidades]);

  const cargar = async () => {
    setLoading(true);
    setError('');
    try {
      const [res, est] = await Promise.all([
        apiClient.request(`${BASE}/convalidaciones/`),
        apiClient.request(`${BASE}/estudiantes/`).catch(() => []),
      ]);
      setResoluciones(res || []);
      setEstudiantes(est || []);
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar las convalidaciones.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  // Unidades destino: malla del programa del estudiante elegido
  const programaId = estudiantes.find(e => String(e.id) === String(form.estudiante_id))?.programa_id;
  useEffect(() => {
    if (!programaId) return;
    let activo = true;
    apiClient.request(`/api/mod-programas-estudio/programas/${programaId}/malla`)
      .then(malla => {
        if (!activo) return;
        setUnidades((malla || []).flatMap(m => (m.unidades || []).map(u => ({ id: u.id, nombre: u.nombre }))));
      })
      .catch(() => activo && setUnidades([]));
    return () => { activo = false; };
  }, [programaId]);

  const actualizarDetalle = (i, campo, valor) =>
    setDetalles(prev => prev.map((d, idx) => (idx === i ? { ...d, [campo]: valor } : d)));

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    const validos = detalles.filter(d => d.unidad_destino_id && d.curso_origen.trim());
    if (!form.estudiante_id) return setError('Seleccione un estudiante.');
    if (validos.length === 0) return setError('Agregue al menos una unidad convalidada (unidad destino y curso de origen).');

    setSaving(true);
    try {
      await apiClient.request(`${BASE}/convalidaciones/`, {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          estudiante_id: parseInt(form.estudiante_id),
          institucion_origen: form.institucion_origen || null,
          detalles: validos.map(d => ({
            unidad_destino_id: parseInt(d.unidad_destino_id),
            curso_origen: d.curso_origen.trim(),
            nota_reconocida: d.nota_reconocida === '' ? null : parseFloat(d.nota_reconocida),
            creditos_reconocidos: d.creditos_reconocidos === '' ? null : parseInt(d.creditos_reconocidos),
          })),
        }),
      });
      setForm(FORM_VACIO);
      setDetalles([{ ...DETALLE_VACIO }]);
      setShowForm(false);
      cargar();
    } catch (err) {
      console.error(err);
      setError('No se pudo registrar la resolución (verifique que el número no esté repetido).');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h4 className="text-lg font-bold text-slate-700">Resoluciones de Convalidación</h4>
        <button onClick={() => setShowForm(v => !v)} className="btn-primary py-1.5 px-4 text-sm rounded-lg flex items-center gap-1.5">
          <Plus size={16} /> {showForm ? 'Cancelar' : 'Registrar Resolución'}
        </button>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

      {showForm && (
        <form onSubmit={guardar} className="space-y-4 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
          <div className="grid md:grid-cols-2 gap-3">
            <select className="input-field" value={form.estudiante_id} onChange={e => setForm({ ...form, estudiante_id: e.target.value })}>
              <option value="">Estudiante...</option>
              {estudiantes.map(s => <option key={s.id} value={s.id}>{s.apellidos}, {s.nombres} ({s.dni})</option>)}
            </select>
            <input className="input-field" placeholder="N° de resolución" value={form.numero_resolucion}
              onChange={e => setForm({ ...form, numero_resolucion: e.target.value })} required />
            <input type="date" className="input-field" value={form.fecha_emision}
              onChange={e => setForm({ ...form, fecha_emision: e.target.value })} required />
            <select className="input-field" value={form.tipo_convalidacion} onChange={e => setForm({ ...form, tipo_convalidacion: e.target.value })}>
              {TIPOS.map(t => <option key={t}>{t}</option>)}
            </select>
            {form.tipo_convalidacion === 'Traslado Externo' && (
              <input className="input-field md:col-span-2" placeholder="Institución de origen" value={form.institucion_origen}
                onChange={e => setForm({ ...form, institucion_origen: e.target.value })} />
            )}
          </div>

          <div className="space-y-2">
            <div className="text-sm font-bold text-slate-600">Unidades convalidadas</div>
            {detalles.map((d, i) => (
              <div key={i} className="grid md:grid-cols-[2fr_2fr_1fr_1fr_auto] gap-2 items-center">
                <select className="input-field" value={d.unidad_destino_id} onChange={e => actualizarDetalle(i, 'unidad_destino_id', e.target.value)}>
                  <option value="">{form.estudiante_id ? 'Unidad destino...' : 'Elija estudiante primero'}</option>
                  {unidades.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                </select>
                <input className="input-field" placeholder="Curso de origen" value={d.curso_origen}
                  onChange={e => actualizarDetalle(i, 'curso_origen', e.target.value)} />
                <input type="number" min="0" max="20" step="0.1" className="input-field" placeholder="Nota" value={d.nota_reconocida}
                  onChange={e => actualizarDetalle(i, 'nota_reconocida', e.target.value)} />
                <input type="number" min="0" className="input-field" placeholder="Créditos" value={d.creditos_reconocidos}
                  onChange={e => actualizarDetalle(i, 'creditos_reconocidos', e.target.value)} />
                <button type="button" className="btn-icon text-slate-400 hover:text-red-600" title="Quitar"
                  onClick={() => setDetalles(prev => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev))}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button type="button" className="text-sm text-primary font-semibold" onClick={() => setDetalles(prev => [...prev, { ...DETALLE_VACIO }])}>
              + Agregar unidad
            </button>
          </div>

          <button type="submit" disabled={saving} className="btn-primary px-6 py-2 rounded-lg">
            {saving ? 'Guardando...' : 'Guardar resolución'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="text-center py-10"><div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div></div>
      ) : resoluciones.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Repeat size={32} className="mx-auto mb-2" />
          No hay resoluciones de convalidación registradas.
        </div>
      ) : (
        <div className="space-y-3">
          {resoluciones.map(r => (
            <div key={r.id} className="p-4 rounded-xl border border-slate-200 bg-white">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <span className="font-bold text-slate-700">Res. {r.numero_resolucion}</span>
                  <span className="text-xs text-slate-500 ml-2">{r.fecha_emision}</span>
                </div>
                <span className="badge badge-green">{r.estado}</span>
              </div>
              <div className="text-sm text-slate-600 mt-1">
                {nombreEstudiante.get(r.estudiante_id) || `Estudiante #${r.estudiante_id}`} · {r.tipo_convalidacion}
                {r.institucion_origen ? ` · ${r.institucion_origen}` : ''}
              </div>
              <ul className="mt-2 text-xs text-slate-500 list-disc pl-5">
                {(r.detalles || []).map(d => (
                  <li key={d.id}>
                    {d.curso_origen} → {nombreUnidad.get(d.unidad_destino_id) || `UD #${d.unidad_destino_id}`}
                    {d.nota_reconocida != null ? ` · nota ${d.nota_reconocida}` : ''}
                    {d.creditos_reconocidos != null ? ` · ${d.creditos_reconocidos} cr.` : ''}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
