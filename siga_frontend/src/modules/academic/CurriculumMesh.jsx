import { useState, useEffect } from 'react';
import { apiClient } from '../../core/api/client';
import { ArrowLeft, X, Plus, Trash2, BookOpen, Clock, Layers, Sparkles, CheckCircle2 } from 'lucide-react';

export function CurriculumMesh({ programId, onBack }) {
  const [malla, setMalla] = useState([]);
  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [showAddModule, setShowAddModule] = useState(false);
  const [newModule, setNewModule] = useState({ nombre: '', periodo: 1 });
  
  const [showAddUnit, setShowAddUnit] = useState({ show: false, moduloId: null, moduloNombre: '' });
  const [newUnit, setNewUnit] = useState({
    nombre: '',
    creditos: 3,
    horas_teoria: 2,
    horas_practica: 2,
    orden: 1
  });
  const [savingUnit, setSavingUnit] = useState(false);

  const fetchMalla = async () => {
    setLoading(true);
    try {
      const [mallaRes, programRes] = await Promise.all([
        apiClient.request(`/api/mod-programas-estudio/programas/${programId}/malla`),
        apiClient.request(`/api/mod-programas-estudio/programas/${programId}`)
      ]);
      setMalla(mallaRes || []);
      setProgram(programRes || null);
    } catch (error) {
      console.error('Error fetching mesh:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMalla();
  }, [programId]);

  const handleAddModule = async (e) => {
    e.preventDefault();
    try {
      await apiClient.request(`/api/mod-programas-estudio/programas/${programId}/modulos`, {
        method: 'POST',
        body: JSON.stringify(newModule)
      });
      setShowAddModule(false);
      setNewModule({ nombre: '', periodo: 1 });
      fetchMalla();
    } catch (error) {
      console.error('Error adding module:', error);
      alert('Error al agregar el módulo');
    }
  };

  const handleDeleteModule = async (moduloId, moduloNombre) => {
    if (!window.confirm(`¿Estás seguro de eliminar el módulo "${moduloNombre}" y todas sus unidades asociadas?`)) {
      return;
    }
    try {
      await apiClient.request(`/api/mod-programas-estudio/modulos/${moduloId}`, {
        method: 'DELETE'
      });
      fetchMalla();
    } catch (error) {
      console.error('Error deleting module:', error);
      alert('Error al eliminar el módulo');
    }
  };

  const handleOpenAddUnit = (modulo) => {
    setNewUnit({
      nombre: '',
      creditos: 3,
      horas_teoria: 2,
      horas_practica: 2,
      orden: (modulo.unidades?.length || 0) + 1
    });
    setShowAddUnit({ show: true, moduloId: modulo.id, moduloNombre: modulo.nombre });
  };

  const handleAddUnit = async (e) => {
    e.preventDefault();
    if (!showAddUnit.moduloId) return;
    setSavingUnit(true);
    try {
      await apiClient.request(`/api/mod-programas-estudio/modulos/${showAddUnit.moduloId}/unidades`, {
        method: 'POST',
        body: JSON.stringify({
          nombre: newUnit.nombre,
          creditos: parseInt(newUnit.creditos) || 0,
          horas_teoria: parseInt(newUnit.horas_teoria) || 0,
          horas_practica: parseInt(newUnit.horas_practica) || 0,
          orden: parseInt(newUnit.orden) || 1
        })
      });
      setShowAddUnit({ show: false, moduloId: null, moduloNombre: '' });
      fetchMalla();
    } catch (error) {
      console.error('Error adding unit:', error);
      alert('Error al guardar la unidad didáctica');
    } finally {
      setSavingUnit(false);
    }
  };

  const handleDeleteUnit = async (unidadId, unidadNombre) => {
    if (!window.confirm(`¿Deseas eliminar la unidad didáctica "${unidadNombre}"?`)) {
      return;
    }
    try {
      await apiClient.request(`/api/mod-programas-estudio/unidades/${unidadId}`, {
        method: 'DELETE'
      });
      fetchMalla();
    } catch (error) {
      console.error('Error deleting unit:', error);
      alert('Error al eliminar la unidad didáctica');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-slate-500 text-sm font-medium">Cargando estructura de la malla curricular...</p>
      </div>
    );
  }

  const totalCreditos = malla.reduce((acc, m) => 
    acc + (m.unidades || []).reduce((uAcc, u) => uAcc + (Number(u.creditos) || 0), 0), 0
  );

  const totalUnidades = malla.reduce((acc, m) => acc + (m.unidades?.length || 0), 0);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header Estilo Linear */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <button
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-50 transition-colors border border-slate-200 shadow-sm cursor-pointer"
            onClick={onBack}
            aria-label="Volver"
          >
            <ArrowLeft size={18} />
          </button>
          
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-2xl text-slate-900 tracking-tight">
                {program?.nombre}
              </h3>
              <span className="font-mono text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md uppercase">
                {program?.codigo}
              </span>
            </div>
            
            <p className="text-slate-400 text-xs mt-0.5 flex items-center gap-3">
              <span>{malla.length} Módulos / Ciclos</span>
              <span>•</span>
              <span>{totalUnidades} Unidades Didácticas</span>
              <span>•</span>
              <span className="font-semibold text-slate-700">{totalCreditos} Créditos Acumulados</span>
            </p>
          </div>
        </div>

        <button 
          onClick={() => setShowAddModule(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs shadow-sm hover:shadow transition-all cursor-pointer"
        >
          <Plus size={15} />
          <span>Nuevo Módulo / Ciclo</span>
        </button>
      </div>

      {/* Grid of Modules */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {malla.map((modulo) => {
          const modCreditos = (modulo.unidades || []).reduce((acc, u) => acc + (Number(u.creditos) || 0), 0);
          return (
            <div 
              key={modulo.id} 
              className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200 p-5 flex flex-col justify-between h-full"
            >
              <div>
                {/* Module Header */}
                <div className="flex justify-between items-start gap-3 mb-4 pb-3 border-b border-slate-100">
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 mb-1.5">
                      Ciclo {modulo.periodo}
                    </span>
                    <h5 className="font-bold text-sm text-slate-900 leading-snug">{modulo.nombre}</h5>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-mono text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                      {modCreditos} CR
                    </span>
                    <button
                      onClick={() => handleDeleteModule(modulo.id, modulo.nombre)}
                      className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                      title="Eliminar módulo"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Units List */}
                <div className="space-y-2 mb-4">
                  {(!modulo.unidades || modulo.unidades.length === 0) ? (
                    <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl">
                      <p className="text-slate-400 text-xs">Sin unidades didácticas asignadas</p>
                    </div>
                  ) : (
                    modulo.unidades.map(u => (
                      <div
                        key={u.id}
                        className="p-3 bg-slate-50/70 hover:bg-slate-50 border border-slate-200/60 rounded-xl text-xs flex justify-between items-center group transition-colors"
                      >
                        <div className="flex-1 pr-2">
                          <span className="font-semibold text-slate-800 block text-xs leading-snug">{u.nombre}</span>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                            <span>T: {u.horas_teoria || 0}h</span>
                            <span>•</span>
                            <span>P: {u.horas_practica || 0}h</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="font-mono text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md">
                            {u.creditos} CR
                          </span>
                          <button
                            onClick={() => handleDeleteUnit(u.id, u.nombre)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 rounded transition-opacity"
                            title="Eliminar unidad"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Add Unit Button */}
              <button
                onClick={() => handleOpenAddUnit(modulo)}
                className="w-full mt-2 py-2 px-3 rounded-xl border border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus size={14} /> 
                <span>Agregar Unidad Didáctica</span>
              </button>
            </div>
          );
        })}

        {/* Add Module Card */}
        <div 
          onClick={() => setShowAddModule(true)}
          className="bg-slate-50/40 hover:bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 hover:border-slate-400 p-8 flex flex-col items-center justify-center transition-all cursor-pointer group min-h-[220px]"
        >
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
            <Plus size={20} />
          </div>
          <span className="text-slate-800 text-xs font-bold">Agregar Módulo o Ciclo</span>
          <span className="text-slate-400 text-[11px] mt-0.5">Crea un nuevo ciclo de formación</span>
        </div>
      </div>

      {/* Modal: New Module */}
      {showAddModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <h6 className="font-bold text-sm text-slate-900">Nuevo Módulo Formativo</h6>
              <button
                onClick={() => setShowAddModule(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddModule} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Nombre del Módulo</label>
                <input
                  type="text"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  value={newModule.nombre}
                  onChange={e => setNewModule({...newModule, nombre: e.target.value})}
                  placeholder="Ej: Módulo I: Gestión de Soporte y Redes"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Número de Ciclo / Periodo</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  value={newModule.periodo}
                  onChange={e => setNewModule({...newModule, periodo: parseInt(e.target.value) || 1})}
                  required
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowAddModule(false)}
                  className="flex-1 py-2 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-all"
                >
                  Crear Módulo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Unit (UD) */}
      {showAddUnit.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Asignar Unidad Didáctica</span>
                <h6 className="font-bold text-sm text-slate-900">{showAddUnit.moduloNombre}</h6>
              </div>
              <button
                onClick={() => setShowAddUnit({ show: false, moduloId: null, moduloNombre: '' })}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddUnit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Nombre de la Unidad Didáctica</label>
                <input
                  type="text"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  value={newUnit.nombre}
                  onChange={e => setNewUnit({...newUnit, nombre: e.target.value})}
                  placeholder="Ej: Taller de Programación Web"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Créditos</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    value={newUnit.creditos}
                    onChange={e => setNewUnit({...newUnit, creditos: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Horas Teoría</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    value={newUnit.horas_teoria}
                    onChange={e => setNewUnit({...newUnit, horas_teoria: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Horas Práctica</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    value={newUnit.horas_practica}
                    onChange={e => setNewUnit({...newUnit, horas_practica: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowAddUnit({ show: false, moduloId: null, moduloNombre: '' })}
                  className="flex-1 py-2 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  disabled={savingUnit}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-all"
                  disabled={savingUnit}
                >
                  {savingUnit ? 'Guardando...' : 'Guardar Unidad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}