import { useState, useEffect } from 'react';
import { apiClient } from '../../core/api/client';

export function CoordinatorTutorias({ programId, periodId, docentes }) {
  const [tutorias, setTutorias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({ ciclo: '', docente_id: '', observaciones: '' });

  const fetchData = async () => {
    if (!programId || !periodId) return;
    setLoading(true);
    try {
      const res = await apiClient.request(`/api/mod-programas-estudio/programas/${programId}/tutorias?periodo_id=${periodId}`);
      setTutorias(res || []);
    } catch (e) {
      console.error('Error fetching tutorias', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [programId, periodId]);

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!form.ciclo || !form.docente_id) return alert("Seleccione ciclo y docente");
    
    // Check if cycle already has a tutor
    if (tutorias.some(t => t.ciclo === parseInt(form.ciclo))) {
      if(!window.confirm("Ya existe un tutor para este ciclo. ¿Desea reemplazarlo? (Se creará un nuevo registro y debería inactivar el anterior, por MVP lo crearemos de todos modos)")) return;
    }

    setSaving(true);
    try {
      await apiClient.request(`/api/mod-programas-estudio/programas/${programId}/tutorias`, {
        method: 'POST',
        body: JSON.stringify({
          periodo_id: parseInt(periodId),
          docente_id: parseInt(form.docente_id),
          ciclo: parseInt(form.ciclo),
          observaciones: form.observaciones
        })
      });
      setForm({ ciclo: '', docente_id: '', observaciones: '' });
      fetchData();
      alert("✅ Tutor asignado correctamente");
    } catch (e) {
      alert("❌ Error al asignar tutor");
    }
    setSaving(false);
  };

  const getDocenteName = (id) => {
    const d = docentes.find(d => d.id === id);
    return d ? `${d.first_name} ${d.last_name}` : `Docente #${id}`;
  };

  if (!programId || !periodId) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Formulario de Asignación */}
        <div className="lg:col-span-1">
          <div className="glass-card p-6">
            <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center">
              <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center mr-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
              </span>
              Asignar Tutoría
            </h3>
            
            <form onSubmit={handleAssign} className="space-y-4">
              <div>
                <label className="label text-xs">Ciclo / Semestre</label>
                <select 
                  className="input-field w-full text-sm" 
                  required
                  value={form.ciclo}
                  onChange={e => setForm({...form, ciclo: e.target.value})}
                >
                  <option value="">-- Seleccionar --</option>
                  {[1,2,3,4,5,6].map(c => <option key={c} value={c}>Ciclo {c}</option>)}
                </select>
              </div>
              
              <div>
                <label className="label text-xs">Docente Tutor</label>
                <select 
                  className="input-field w-full text-sm" 
                  required
                  value={form.docente_id}
                  onChange={e => setForm({...form, docente_id: e.target.value})}
                >
                  <option value="">-- Seleccionar --</option>
                  {docentes.map(d => <option key={d.id} value={d.id}>{d.first_name} {d.last_name}</option>)}
                </select>
              </div>
              
              <div>
                <label className="label text-xs">Observaciones (Opcional)</label>
                <textarea 
                  className="input-field w-full text-sm py-2" 
                  rows="2"
                  value={form.observaciones}
                  onChange={e => setForm({...form, observaciones: e.target.value})}
                ></textarea>
              </div>
              
              <button 
                type="submit" 
                disabled={saving}
                className={`w-full py-2.5 rounded-xl font-medium text-white transition-all ${saving ? 'bg-slate-400' : 'bg-indigo-600 hover:bg-indigo-700 shadow-md'}`}
              >
                {saving ? 'Asignando...' : 'Guardar Asignación'}
              </button>
            </form>
          </div>
        </div>

        {/* Lista de Tutorías */}
        <div className="lg:col-span-2">
          <div className="glass-card p-6 h-full">
            <h3 className="text-lg font-bold text-slate-700 mb-4">Tutores del Periodo</h3>
            
            {loading ? (
              <div className="text-center py-10"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div></div>
            ) : tutorias.length === 0 ? (
              <div className="text-center p-8 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="text-4xl mb-3">🧑‍🏫</div>
                <p className="text-slate-500 font-medium">Aún no se han asignado tutores para este periodo.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tutorias.sort((a,b) => a.ciclo - b.ciclo).map(tutoria => (
                  <div key={tutoria.id} className="flex items-center p-4 border border-slate-100 rounded-xl bg-white hover:shadow-md transition-all">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-100 to-blue-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-black text-xl mr-4 shadow-inner">
                      {tutoria.ciclo}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-0.5">Ciclo {tutoria.ciclo}</div>
                      <div className="font-bold text-slate-800 text-sm leading-tight">{getDocenteName(tutoria.docente_id)}</div>
                      {tutoria.observaciones && <div className="text-[10px] text-slate-500 mt-1">{tutoria.observaciones}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
