import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

export function AssignmentModal({ 
  isOpen, 
  onClose, 
  docenteId, 
  docenteName, 
  periodoObj, 
  unidadesFlat, 
  cargaForm, 
  setCargaForm, 
  handleCreateCarga, 
  saving,
  teacherLoad,
  isOverloaded
}) {
  if (!isOpen) return null;

  const isOdd = periodoObj?.codigo?.endsWith('-I');
  const isEven = periodoObj?.codigo?.endsWith('-II');
  
  const filteredUnidades = unidadesFlat.filter(u => {
    if (isOdd) return [1, 3, 5].includes(u.periodo_sugerido);
    if (isEven) return [2, 4, 6].includes(u.periodo_sugerido);
    return true; // Fallback
  });

  const grouped = filteredUnidades.reduce((acc, u) => {
    acc[u.periodo_sugerido] = acc[u.periodo_sugerido] || [];
    acc[u.periodo_sugerido].push(u);
    return acc;
  }, {});

  const toggleCurso = (id) => {
    const idStr = String(id);
    let newIds = [...cargaForm.unidades_didacticas_ids];
    if (newIds.includes(idStr)) {
      newIds = newIds.filter(i => i !== idStr);
    } else {
      newIds.push(idStr);
    }
    setCargaForm({ ...cargaForm, unidades_didacticas_ids: newIds });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-xl font-bold text-slate-800">Asignar Cursos - {docenteName}</h3>
            <div className="flex items-center gap-4 mt-1">
              <p className="text-sm text-slate-500">Periodo: {periodoObj?.codigo}</p>
              {docenteId && (
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${isOverloaded ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'}`}>
                  {isOverloaded && <AlertTriangle size={12} />}
                  Carga actual: {teacherLoad} cursos
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="btn-icon text-slate-400 hover:text-slate-600" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
          {Object.keys(grouped).sort().map(ciclo => (
            <div key={ciclo} className="mb-6">
              <h4 className="font-bold text-slate-700 border-b pb-2 mb-3 text-sm uppercase tracking-wider flex items-center">
                <span className="w-6 h-6 rounded-full bg-primary-soft text-primary-dark flex items-center justify-center mr-2 text-xs font-bold">{ciclo}</span>
                Ciclo {ciclo}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {grouped[ciclo].map(u => (
                  <label key={u.id} className={`flex items-start p-3 rounded-xl border cursor-pointer transition-all ${cargaForm.unidades_didacticas_ids.includes(String(u.id)) ? 'border-primary bg-primary-soft/50 shadow-sm' : 'border-slate-200 bg-white hover:border-primary-light'}`}>
                    <div className="flex-shrink-0 mt-0.5">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
                        checked={cargaForm.unidades_didacticas_ids.includes(String(u.id))}
                        onChange={() => toggleCurso(u.id)}
                      />
                    </div>
                    <div className="ml-3">
                      <span className="block text-sm font-semibold text-slate-text leading-tight">{u.nombre}</span>
                      <span className="block text-xs text-slate-500 mt-1">{u.creditos} Créditos</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}
          
          {filteredUnidades.length === 0 && (
            <div className="text-center py-10 text-slate-500">
              No hay cursos disponibles para este periodo.
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-slate-100 bg-white flex justify-between items-center">
          <div className="text-sm text-slate-600 font-medium">
            <span className="text-primary-dark font-bold">{cargaForm.unidades_didacticas_ids.length}</span> cursos seleccionados
          </div>
          
          <div className="flex space-x-3 items-center">
            <div className="flex space-x-2 mr-4">
              <select 
                className="input-field text-sm"
                value={cargaForm.turno}
                onChange={e => setCargaForm({...cargaForm, turno: e.target.value})}
              >
                <option value="Mañana">Mañana</option>
                <option value="Tarde">Tarde</option>
                <option value="Noche">Noche</option>
              </select>
              <select 
                className="input-field text-sm"
                value={cargaForm.seccion}
                onChange={e => setCargaForm({...cargaForm, seccion: e.target.value})}
              >
                <option value="A">Sec A</option>
                <option value="B">Sec B</option>
                <option value="C">Sec C</option>
              </select>
            </div>
            
            <button 
              type="button"
              onClick={onClose}
              className="btn-ghost"
            >
              Cancelar
            </button>
            <button 
              type="button"
              onClick={handleCreateCarga}
              disabled={saving || cargaForm.unidades_didacticas_ids.length === 0}
              className="btn-primary disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar Asignación'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
