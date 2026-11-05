import { useState, useEffect } from 'react';
import { apiClient } from '../../core/api/client';
import { useToast } from '../../core/ui/ToastContext';
import { FileText, BookOpen, ExternalLink, Filter, AlertCircle, X } from 'lucide-react';

export function CoordinatorReview({ programId, periodId, docentes, cargaLectiva, unidadesFlat }) {
  const toast = useToast();
  const [silabos, setSilabos] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [obsModal, setObsModal] = useState(null);
  const [obsText, setObsText] = useState('');

  const fetchData = async () => {
    if (!programId || !periodId) return;
    setLoading(true);
    try {
      const [silabosRes, planesRes] = await Promise.all([
        apiClient.request(`/api/mod-programas-estudio/programas/${programId}/silabos?periodo_id=${periodId}`).catch(() => []),
        apiClient.request(`/api/mod-programas-estudio/programas/${programId}/planes-trabajo?periodo_id=${periodId}`).catch(() => [])
      ]);
      setSilabos(silabosRes || []);
      setPlanes(planesRes || []);
    } catch (e) {
      console.error('Error fetching review data', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [programId, periodId]);

  const handleUpdateStatus = async (type, id, status, customObs = '') => {
    if (status === 'observado' && !customObs) {
      setObsModal({ type, id });
      setObsText('');
      return;
    }

    try {
      const obs = customObs || '';
      const url = type === 'silabo' 
        ? `/api/mod-programas-estudio/silabos/${id}/estado?estado=${status}${obs ? `&observaciones=${encodeURIComponent(obs)}` : ''}`
        : `/api/mod-programas-estudio/planes-trabajo/${id}/estado?estado=${status}${obs ? `&observaciones=${encodeURIComponent(obs)}` : ''}`;
        
      await apiClient.request(url, { method: 'PUT' });
      toast.success(status === 'aprobado' ? 'Documento aprobado con éxito.' : 'Observación enviada al docente.');
      fetchData();
      setObsModal(null);
      setObsText('');
    } catch (err) {
      console.error(err);
      toast.error(`Error al actualizar estado del ${type}`);
    }
  };

  const getDocenteName = (docenteId) => {
    const d = docentes.find(d => d.id === docenteId);
    return d ? d.full_name : `Docente #${docenteId}`;
  };

  const getUnidadName = (cargaId) => {
    const carga = cargaLectiva.find(c => c.id === cargaId);
    if (!carga) return 'Desconocido';
    const ud = unidadesFlat.find(u => u.id === carga.unidad_didactica_id);
    return ud ? ud.nombre : `Ud. #${carga.unidad_didactica_id}`;
  };
  
  const getDocenteByCarga = (cargaId) => {
    const carga = cargaLectiva.find(c => c.id === cargaId);
    return carga ? getDocenteName(carga.docente_id) : 'Desconocido';
  };

  const filteredSilabos = filterStatus === 'ALL' 
    ? silabos 
    : silabos.filter(s => s.estado === filterStatus);

  if (!programId || !periodId) return <div className="text-center text-slate-500 py-10">Seleccione programa y periodo.</div>;
  if (loading) return <div className="text-center py-10"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div></div>;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Planes de Trabajo */}
      <div>
        <h3 className="text-lg font-bold text-slate-text mb-4 flex items-center">
          <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mr-2">
            <FileText size={16} />
          </span>
          Revisión de Planes de Trabajo Globales
        </h3>
        {planes.length === 0 ? (
          <div className="text-center p-6 bg-slate-50 border border-slate-100 rounded-xl text-slate-500 text-sm">
            Ningún docente ha presentado plan de trabajo aún.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {planes.map(plan => (
              <div key={plan.id} className="bg-white border border-slate-200 p-5 rounded-xl hover:shadow-md transition-all">
                <div className="font-bold text-slate-text mb-1">{getDocenteName(plan.docente_id)}</div>
                <div className="flex justify-between items-center mb-4">
                  <span className={`badge ${
                    plan.estado === 'aprobado' ? 'badge-green' :
                    plan.estado === 'observado' ? 'badge-red' : 'badge-blue'
                  }`}>
                    {plan.estado}
                  </span>
                  <a href={plan.archivo_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-dark text-sm font-medium flex items-center">
                    <ExternalLink size={14} className="mr-1" /> Ver Doc
                  </a>
                </div>
                {plan.observaciones && <p className="text-xs text-red-600 mb-3 bg-red-50 p-2 rounded">Obs: {plan.observaciones}</p>}
                
                {plan.estado !== 'aprobado' && (
                  <div className="flex space-x-2 mt-2">
                    <button onClick={() => handleUpdateStatus('plan', plan.id, 'aprobado')} className="flex-1 bg-green-50 text-green-700 hover:bg-green-100 py-1.5 rounded-lg text-sm font-medium transition-colors">Aprobar</button>
                    <button onClick={() => handleUpdateStatus('plan', plan.id, 'observado')} className="flex-1 bg-red-50 text-red-700 hover:bg-red-100 py-1.5 rounded-lg text-sm font-medium transition-colors">Observar</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <hr className="border-slate-100" />

      {/* Sílabos */}
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <h3 className="text-lg font-bold text-slate-text flex items-center">
            <span className="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center mr-2">
              <BookOpen size={16} />
            </span>
            Revisión de Sílabos por Unidad Didáctica
          </h3>
          
          <div className="flex items-center space-x-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
            <Filter size={16} className="text-slate-400 ml-1" />
            <select 
              className="bg-transparent text-sm font-semibold text-slate-600 border-none focus:ring-0 cursor-pointer outline-none"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="ALL">Todos los estados</option>
              <option value="en_revision">En Revisión</option>
              <option value="aprobado">Aprobados</option>
              <option value="observado">Observados</option>
            </select>
          </div>
        </div>

        {filteredSilabos.length === 0 ? (
          <div className="text-center p-6 bg-slate-50 border border-slate-100 rounded-xl text-slate-500 text-sm">
            {silabos.length === 0 ? 'Ningún sílabo ha sido presentado aún.' : 'No hay sílabos que coincidan con el filtro actual.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSilabos.map(silabo => (
              <div key={silabo.id} className="bg-white border border-slate-200 p-5 rounded-xl hover:shadow-md transition-all">
                <div className="font-bold text-slate-text leading-tight mb-1">{getUnidadName(silabo.carga_lectiva_id)}</div>
                <div className="text-xs text-slate-500 mb-3 font-medium">Docente: {getDocenteByCarga(silabo.carga_lectiva_id)}</div>
                
                <div className="flex justify-between items-center mb-4">
                  <span className={`badge ${
                    silabo.estado === 'aprobado' ? 'badge-green' :
                    silabo.estado === 'observado' ? 'badge-red' : 'badge-blue'
                  }`}>
                    {silabo.estado}
                  </span>
                  <a href={silabo.archivo_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-dark text-sm font-medium flex items-center">
                    <ExternalLink size={14} className="mr-1" /> Ver Doc
                  </a>
                </div>
                
                {silabo.observaciones && <p className="text-[10px] text-red-600 mb-3 bg-red-50 p-2 rounded">Obs: {silabo.observaciones}</p>}
                
                {silabo.estado !== 'aprobado' && (
                  <div className="flex space-x-2 mt-2">
                    <button onClick={() => handleUpdateStatus('silabo', silabo.id, 'aprobado')} className="flex-1 bg-green-50 text-green-700 hover:bg-green-100 py-1.5 rounded-lg text-sm font-medium transition-colors">Aprobar</button>
                    <button onClick={() => handleUpdateStatus('silabo', silabo.id, 'observado')} className="flex-1 bg-red-50 text-red-700 hover:bg-red-100 py-1.5 rounded-lg text-sm font-medium transition-colors">Observar</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal institucional para registrar observaciones */}
      {obsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden animate-scale-up">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <AlertCircle size={16} className="text-amber-500" />
                Observar {obsModal.type === 'silabo' ? 'Sílabo' : 'Plan de Trabajo'}
              </h4>
              <button 
                onClick={() => setObsModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <label className="block text-xs font-semibold text-slate-600">
                Ingrese el motivo de la observación:
              </label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
                placeholder="Indique las correcciones requeridas..."
                value={obsText}
                onChange={(e) => setObsText(e.target.value)}
                autoFocus
              />
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setObsModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-200/60 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!obsText.trim()}
                onClick={() => handleUpdateStatus(obsModal.type, obsModal.id, 'observado', obsText.trim())}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 transition-colors"
              >
                Registrar Observación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
