import { useState, useEffect } from 'react';
import { apiClient } from '../../core/api/client';
import { X, Lightbulb, Calendar, Plus } from 'lucide-react';

export function PeriodManager({ onClose, onUpdate }) {
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newPeriod, setNewPeriod] = useState({
    codigo: '',
    fecha_inicio: '',
    fecha_fin: '',
    fecha_fin_matricula_regular: '',
    fecha_fin_matricula_extemporanea: '',
    estado: 'planificacion'
  });

  const fetchPeriods = async () => {
    setLoading(true);
    try {
      const data = await apiClient.callModule('mod-programas-estudio', 'periodos');
      setPeriods(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching periods:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPeriods();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.callModule('mod-programas-estudio', 'periodos', 'POST', newPeriod);
      setNewPeriod({ codigo: '', fecha_inicio: '', fecha_fin: '', fecha_fin_matricula_regular: '', fecha_fin_matricula_extemporanea: '', estado: 'planificacion' });
      fetchPeriods();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error creating period:', error);
      alert('Hubo un error al crear el periodo');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (estado) => {
    switch (estado) {
      case 'planificacion': return 'badge-amber';
      case 'matricula_abierta': return 'badge-blue';
      case 'activo':
      case 'en_curso': return 'badge-green';
      case 'historico': return 'badge-slate';
      default: return 'badge-slate';
    }
  };

  const getStatusLabel = (estado) => {
    switch (estado) {
      case 'planificacion': return 'Planificación';
      case 'matricula_abierta': return 'Matrícula Abierta';
      case 'activo':
      case 'en_curso': return 'En Curso';
      case 'historico': return 'Histórico';
      default: return estado;
    }
  };

  const handleStatusChange = async (periodoId, nuevoEstado) => {
    try {
      await apiClient.callModule('mod-programas-estudio', `periodos/${periodoId}/estado?estado=${nuevoEstado}`, 'PUT');
      fetchPeriods();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error actualizando estado:', error);
      alert('Error al actualizar el estado del periodo');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="glass-card w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden bg-white/95 shadow-2xl animate-fade-in-up">
        <div className="flex justify-between items-center p-6 border-b border-slate-200">
          <div>
            <h5 className="font-bold text-2xl text-slate-text tracking-tight">Gestión de Periodos Académicos</h5>
            <p className="text-slate-500 text-sm mt-1">Configuración del motor de tiempo institucional</p>
          </div>
          <button onClick={onClose} className="btn-icon text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full p-2" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex flex-col md:flex-row flex-grow overflow-hidden">
          {/* Formulario Lateral */}
          <div className="w-full md:w-1/3 p-6 bg-slate-50 border-r border-slate-200 overflow-y-auto">
            <h6 className="font-bold text-slate-700 mb-4 uppercase tracking-wider text-xs">Crear Nuevo Periodo</h6>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label text-xs uppercase font-bold tracking-wider">Código (Ej. 2026-I)</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={newPeriod.codigo} 
                  onChange={e => setNewPeriod({...newPeriod, codigo: e.target.value})}
                  required 
                  placeholder="2026-I"
                />
              </div>
              <div>
                <label className="label text-xs uppercase font-bold tracking-wider">Fecha Inicio</label>
                <input 
                  type="date" 
                  className="input-field" 
                  value={newPeriod.fecha_inicio} 
                  onChange={e => setNewPeriod({...newPeriod, fecha_inicio: e.target.value})}
                  required 
                />
              </div>
              <div>
                <label className="label text-xs uppercase font-bold tracking-wider">Fecha Fin</label>
                <input 
                  type="date" 
                  className="input-field" 
                  value={newPeriod.fecha_fin} 
                  onChange={e => setNewPeriod({...newPeriod, fecha_fin: e.target.value})}
                  required 
                />
              </div>
              <div>
                <label className="label text-xs uppercase font-bold tracking-wider">Fin Matrícula Regular</label>
                <input 
                  type="date" 
                  className="input-field" 
                  value={newPeriod.fecha_fin_matricula_regular} 
                  onChange={e => setNewPeriod({...newPeriod, fecha_fin_matricula_regular: e.target.value})}
                  required 
                />
              </div>
              <div>
                <label className="label text-xs uppercase font-bold tracking-wider">Fin Matrícula Extemporánea</label>
                <input 
                  type="date" 
                  className="input-field" 
                  value={newPeriod.fecha_fin_matricula_extemporanea} 
                  onChange={e => setNewPeriod({...newPeriod, fecha_fin_matricula_extemporanea: e.target.value})}
                  required 
                />
              </div>
              <div>
                <label className="label text-xs uppercase font-bold tracking-wider">Estado Inicial</label>
                <select 
                  className="input-field" 
                  value={newPeriod.estado} 
                  onChange={e => setNewPeriod({...newPeriod, estado: e.target.value})}
                >
                  <option value="planificacion">Planificación</option>
                  <option value="matricula_abierta">Matrícula Abierta</option>
                  <option value="en_curso">En Curso</option>
                </select>
              </div>
              <button 
                type="submit" 
                className="btn-primary w-full py-2.5 mt-2 flex items-center justify-center shadow-sm"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <><Plus size={18} /> Registrar Periodo</>
                )}
              </button>
            </form>
            
            <div className="mt-8 p-4 rounded-xl bg-primary-soft border border-primary/20">
              <h6 className="font-bold text-primary-dark text-xs uppercase tracking-wider mb-2 flex items-center"><Lightbulb size={14} className="mr-2" /> Info del Motor</h6>
              <p className="text-xs text-primary-dark/80 leading-relaxed">
                El estado <strong>Matrícula Abierta</strong> es el único que permite nuevas inscripciones a nivel sistema. Una vez pase a <strong>En Curso</strong>, el motor bloquea la matrícula regular.
              </p>
            </div>
          </div>
          
          {/* Lista Central */}
          <div className="w-full md:w-2/3 p-6 overflow-y-auto">
            <h6 className="font-bold text-slate-700 mb-4 uppercase tracking-wider text-xs flex justify-between items-center">
              <span>Historial de Periodos</span>
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[10px]">{periods.length} Registros</span>
            </h6>
            
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
                <p className="text-slate-500 font-medium text-sm">Cargando cronograma...</p>
              </div>
            ) : periods.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary-soft text-primary flex items-center justify-center">
                  <Calendar size={30} />
                </div>
                <p className="text-slate-500 font-medium">No hay periodos registrados</p>
              </div>
            ) : (
              <div className="space-y-3">
                {periods.map(period => (
                  <div key={period.id} className="p-4 rounded-xl border border-slate-200 hover:border-primary/40 hover:shadow-md transition-all bg-white group">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center">
                        <div className="w-12 h-12 rounded-lg bg-primary/5 text-primary flex items-center justify-center font-black text-lg border border-primary/10 mr-4">
                          {period.codigo.split('-')[1] || period.codigo}
                        </div>
                        <div>
                          <h4 className="font-bold text-lg text-slate-text">{period.codigo}</h4>
                          <div className="text-xs text-slate-500 font-medium flex items-center mt-1">
                            <Calendar className="w-3.5 h-3.5 mr-1" />
                            {new Date(period.fecha_inicio).toLocaleDateString()} <span className="mx-2">→</span> {new Date(period.fecha_fin).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={`badge ${getStatusColor(period.estado)}`}>
                          {getStatusLabel(period.estado)}
                        </span>
                        
                        <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                          <label className="text-xs text-slate-500 mr-2">Cambiar a:</label>
                          <select 
                            className="text-xs font-semibold text-primary bg-slate-50 border border-slate-200 rounded p-1 cursor-pointer outline-none"
                            value={period.estado}
                            onChange={(e) => handleStatusChange(period.id, e.target.value)}
                          >
                            <option value="planificacion">Planificación</option>
                            <option value="matricula_abierta">Matrícula Abierta</option>
                            <option value="en_curso">En Curso</option>
                            <option value="historico">Histórico</option>
                          </select>
                        </div>
                      </div>
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
