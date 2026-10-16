import { useState, useEffect, useMemo } from 'react';
import { apiClient } from '../../core/api/client';
import { Plus, GraduationCap } from 'lucide-react';

const TIPOS = ['Beca 18 (PRONABEC)', 'Excelencia Académica', 'Convenio Institucional', 'Convenio FF.AA.', 'Otro'];
const BASE = '/api/mod-gestion-academica';
const FORM_VACIO = {
  estudiante_id: '',
  tipo_beneficio: TIPOS[0],
  porcentaje_descuento: '',
  condicion_mantenimiento: '',
  periodo_validez_inicio_id: '',
  periodo_validez_fin_id: '',
};

export function BecasTab() {
  const [beneficios, setBeneficios] = useState([]);
  const [estudiantes, setEstudiantes] = useState([]);
  const [periodos, setPeriodos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);

  const nombreEstudiante = useMemo(
    () => new Map(estudiantes.map(e => [e.id, `${e.apellidos}, ${e.nombres}`])),
    [estudiantes]
  );
  const codigoPeriodo = useMemo(() => new Map(periodos.map(p => [p.id, p.codigo])), [periodos]);

  const cargar = async () => {
    setLoading(true);
    setError('');
    try {
      const [ben, est, per] = await Promise.all([
        apiClient.request(`${BASE}/beneficios/`),
        apiClient.request(`${BASE}/estudiantes/`).catch(() => []),
        apiClient.request('/api/mod-programas-estudio/periodos').catch(() => []),
      ]);
      setBeneficios(ben || []);
      setEstudiantes(est || []);
      setPeriodos(per || []);
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar los beneficios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.estudiante_id || !form.periodo_validez_inicio_id) return setError('Seleccione estudiante y periodo de inicio.');
    const porcentaje = parseFloat(form.porcentaje_descuento);
    if (!(porcentaje > 0 && porcentaje <= 100)) return setError('El descuento debe estar entre 1 y 100.');

    setSaving(true);
    try {
      await apiClient.request(`${BASE}/beneficios/`, {
        method: 'POST',
        body: JSON.stringify({
          estudiante_id: parseInt(form.estudiante_id),
          tipo_beneficio: form.tipo_beneficio,
          porcentaje_descuento: porcentaje,
          condicion_mantenimiento: form.condicion_mantenimiento || null,
          periodo_validez_inicio_id: parseInt(form.periodo_validez_inicio_id),
          periodo_validez_fin_id: form.periodo_validez_fin_id ? parseInt(form.periodo_validez_fin_id) : null,
        }),
      });
      setForm(FORM_VACIO);
      setShowForm(false);
      cargar();
    } catch (err) {
      console.error(err);
      setError('No se pudo asignar el beneficio.');
    } finally {
      setSaving(false);
    }
  };

  const desactivar = async (id) => {
    if (!window.confirm('¿Desactivar este beneficio? El descuento dejará de aplicarse.')) return;
    try {
      await apiClient.request(`${BASE}/beneficios/${id}/desactivar`, { method: 'PUT' });
      cargar();
    } catch (err) {
      console.error(err);
      setError('No se pudo desactivar el beneficio.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h4 className="text-lg font-bold text-slate-700">Becas y Beneficios Asignados</h4>
        <button onClick={() => setShowForm(v => !v)} className="btn-primary py-1.5 px-4 text-sm rounded-lg flex items-center gap-1.5">
          <Plus size={16} /> {showForm ? 'Cancelar' : 'Asignar Beneficio'}
        </button>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

      {showForm && (
        <form onSubmit={guardar} className="grid md:grid-cols-2 gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
          <select className="input-field" value={form.estudiante_id} onChange={e => setForm({ ...form, estudiante_id: e.target.value })}>
            <option value="">Estudiante...</option>
            {estudiantes.map(s => <option key={s.id} value={s.id}>{s.apellidos}, {s.nombres} ({s.dni})</option>)}
          </select>
          <select className="input-field" value={form.tipo_beneficio} onChange={e => setForm({ ...form, tipo_beneficio: e.target.value })}>
            {TIPOS.map(t => <option key={t}>{t}</option>)}
          </select>
          <input type="number" min="1" max="100" step="0.1" className="input-field" placeholder="% de descuento" value={form.porcentaje_descuento}
            onChange={e => setForm({ ...form, porcentaje_descuento: e.target.value })} required />
          <input className="input-field" placeholder="Condición de mantenimiento (ej. Promedio >= 14)" value={form.condicion_mantenimiento}
            onChange={e => setForm({ ...form, condicion_mantenimiento: e.target.value })} />
          <select className="input-field" value={form.periodo_validez_inicio_id} onChange={e => setForm({ ...form, periodo_validez_inicio_id: e.target.value })}>
            <option value="">Vigente desde...</option>
            {periodos.map(p => <option key={p.id} value={p.id}>{p.codigo}</option>)}
          </select>
          <select className="input-field" value={form.periodo_validez_fin_id} onChange={e => setForm({ ...form, periodo_validez_fin_id: e.target.value })}>
            <option value="">Hasta... (permanente)</option>
            {periodos.map(p => <option key={p.id} value={p.id}>{p.codigo}</option>)}
          </select>
          <div className="md:col-span-2">
            <button type="submit" disabled={saving} className="btn-primary px-6 py-2 rounded-lg">
              {saving ? 'Guardando...' : 'Asignar beneficio'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-10"><div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div></div>
      ) : beneficios.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <GraduationCap size={32} className="mx-auto mb-2" />
          No hay beneficios asignados.
        </div>
      ) : (
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-slate-50/80 border-y border-slate-200">
            <tr>
              <th className="py-3 px-4 font-bold text-slate-600">Estudiante</th>
              <th className="py-3 px-4 font-bold text-slate-600">Beneficio</th>
              <th className="py-3 px-4 font-bold text-slate-600">Descuento</th>
              <th className="py-3 px-4 font-bold text-slate-600">Vigencia</th>
              <th className="py-3 px-4 font-bold text-slate-600">Estado</th>
              <th className="py-3 px-4 font-bold text-slate-600 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {beneficios.map(b => (
              <tr key={b.id} className="hover:bg-primary/5 transition-colors">
                <td className="py-3 px-4 font-semibold text-slate-700">{nombreEstudiante.get(b.estudiante_id) || `Estudiante #${b.estudiante_id}`}</td>
                <td className="py-3 px-4 text-slate-600">
                  {b.tipo_beneficio}
                  {b.condicion_mantenimiento && <div className="text-xs text-slate-400">{b.condicion_mantenimiento}</div>}
                </td>
                <td className="py-3 px-4 font-semibold text-slate-700">{b.porcentaje_descuento}%</td>
                <td className="py-3 px-4 text-slate-600">
                  {codigoPeriodo.get(b.periodo_validez_inicio_id) || b.periodo_validez_inicio_id}
                  {' → '}
                  {b.periodo_validez_fin_id ? (codigoPeriodo.get(b.periodo_validez_fin_id) || b.periodo_validez_fin_id) : 'Permanente'}
                </td>
                <td className="py-3 px-4"><span className={`badge ${b.activo ? 'badge-green' : 'badge-slate'}`}>{b.activo ? 'activo' : 'inactivo'}</span></td>
                <td className="py-3 px-4 text-right">
                  {b.activo && (
                    <button className="text-xs text-red-600 font-semibold hover:underline" onClick={() => desactivar(b.id)}>Desactivar</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
