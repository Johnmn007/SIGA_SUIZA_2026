import { useState, useEffect } from 'react';
import { apiClient } from '../../core/api/client';
import { X, Lightbulb, Calendar, Plus, Clock, ArrowRight } from 'lucide-react';

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

  const getStatusBadge = (estado) => {
    switch (estado?.toLowerCase()) {
      case 'planificacion':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Planificación
          </span>
        );
      case 'matricula_abierta':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></span>
            Matrícula Abierta
          </span>
        );
      case 'activo':
      case 'en_curso':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            En Curso
          </span>
        );
      case 'historico':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            Histórico
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            {estado}
          </span>
        );
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
          <div>
            <h5 className="font-bold text-base text-slate-900 tracking-tight">Periodos y Calendario Académico</h5>
            <p className="text-xs text-slate-400">Control de cronogramas y ventanas de matrícula regular/extemporánea</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>
        
        <div className="flex flex-col md:flex-row flex-grow overflow-hidden">
          {/* Formulario Lateral */}
          <div className="w-full md:w-5/12 p-6 bg-slate-50/60 border-r border-slate-100 overflow-y-auto">
            <div className="flex items-center gap-1.5 mb-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Crear Periodo</span>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">Código del Periodo</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono uppercase" 
                  value={newPeriod.codigo} 
                  onChange={e => setNewPeriod({...newPeriod, codigo: e.target.value})}
                  required 
                  placeholder="Ej. 2026-I"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">Fecha Inicio</label>
                  <input 
                    type="date" 
                    className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" 
                    value={newPeriod.fecha_inicio} 
                    onChange={e => setNewPeriod({...newPeriod, fecha_inicio: e.target.value})}
                    required 
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">Fecha Fin</label>
                  <input 
                    type="date" 
                    className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" 
                    value={newPeriod.fecha_fin} 
                    onChange={e => setNewPeriod({...newPeriod, fecha_fin: e.target.value})}
                    required 
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">Cierre Matrícula Regular</label>
                <input 
                  type="date" 
                  className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" 
                  value={newPeriod.fecha_fin_matricula_regular} 
                  onChange={e => setNewPeriod({...newPeriod, fecha_fin_matricula_regular: e.target.value})}
                  required 
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">Cierre Matrícula Extemporánea</label>
                <input 
                  type="date" 
                  className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" 
                  value={newPeriod.fecha_fin_matricula_extemporanea} 
                  onChange={e => setNewPeriod({...newPeriod, fecha_fin_matricula_extemporanea: e.target.value})}
                  required 
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">Estado Inicial</label>
                <select 
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" 
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
                className="w-full py-2.5 mt-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Plus size={15} />
                    <span>Registrar Periodo</span>
                  </>
                )}
              </button>
            </form>
            
            <div className="mt-5 p-3.5 rounded-xl bg-slate-100/70 border border-slate-200/80 text-[11px] text-slate-600 leading-relaxed">
              <span className="font-bold text-slate-800 block mb-1">Información de Ciclos:</span>
              El estado <strong>Matrícula Abierta</strong> habilita el registro de inscripciones en el portal. Al pasar a <strong>En Curso</strong>, el motor restringe la matrícula regular.
            </div>
          </div>
          
          {/* Lista Central */}
          <div className="w-full md:w-7/12 p-6 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Historial de Periodos</span>
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {periods.length} registrados
              </span>
            </div>
            
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mb-2"></div>
                <p className="text-slate-400 text-xs">Cargando cronogramas...</p>
              </div>
            ) : periods.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl">
                <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center">
                  <Calendar size={20} />
                </div>
                <p className="text-slate-400 text-xs">No hay periodos registrados aún.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {periods.map(period => (
                  <div 
                    key={period.id} 
                    className="p-3.5 rounded-xl border border-slate-200/80 hover:border-slate-300 hover:shadow-sm transition-all bg-white"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 font-bold text-sm flex items-center justify-center border border-slate-200/60 font-mono">
                          {period.codigo.split('-')[1] || period.codigo}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 tracking-tight">{period.codigo}</h4>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <Clock size={12} className="text-slate-400" />
                            <span>
                              {period.fecha_inicio ? new Date(period.fecha_inicio).toLocaleDateString() : '-'}
                            </span>
                            <span>→</span>
                            <span>
                              {period.fecha_fin ? new Date(period.fecha_fin).toLocaleDateString() : '-'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        {getStatusBadge(period.estado)}
                        
                        <div className="flex items-center gap-1.5">
                          <label className="text-[10px] text-slate-400">Estado:</label>
                          <select 
                            className="text-[11px] font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2 py-0.5 cursor-pointer outline-none transition-colors"
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
