import { useState, useEffect } from 'react';
import { apiClient } from '../../core/api/client';

export function CoordinatorReview({ programId, periodId, docentes, cargaLectiva, unidadesFlat }) {
  const [silabos, setSilabos] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [loading, setLoading] = useState(false);

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

  const handleUpdateStatus = async (type, id, status) => {
    const obs = status === 'observado' ? prompt("Ingrese el motivo de la observación:") : '';
    if (status === 'observado' && !obs) return;

    try {
      const url = type === 'silabo' 
        ? `/api/mod-programas-estudio/silabos/${id}/estado?estado=${status}${obs ? `&observaciones=${encodeURIComponent(obs)}` : ''}`
        : `/api/mod-programas-estudio/planes-trabajo/${id}/estado?estado=${status}${obs ? `&observaciones=${encodeURIComponent(obs)}` : ''}`;
        
      await apiClient.request(url, { method: 'PUT' });
      fetchData();
    } catch (e) {
      alert(`Error al actualizar estado del ${type}`);
    }
  };

  const getDocenteName = (docenteId) => {
    const d = docentes.find(d => d.id === docenteId);
    return d ? `${d.first_name} ${d.last_name}` : `Docente #${docenteId}`;
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

  if (!programId || !periodId) return <div className="text-center text-slate-500 py-10">Seleccione programa y periodo.</div>;
  if (loading) return <div className="text-center py-10"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div></div>;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Planes de Trabajo */}
      <div>
        <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center">
          <span className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center mr-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
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
                <div className="font-bold text-slate-800 mb-1">{getDocenteName(plan.docente_id)}</div>
                <div className="flex justify-between items-center mb-4">
                  <span className={`text-xs px-2 py-1 rounded-full font-bold uppercase tracking-wider ${
                    plan.estado === 'aprobado' ? 'bg-green-100 text-green-700' :
                    plan.estado === 'observado' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {plan.estado}
                  </span>
                  <a href={plan.archivo_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    Ver Doc
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
        <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center">
          <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mr-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
          </span>
          Revisión de Sílabos por Unidad Didáctica
        </h3>
        {silabos.length === 0 ? (
          <div className="text-center p-6 bg-slate-50 border border-slate-100 rounded-xl text-slate-500 text-sm">
            Ningún sílabo ha sido presentado aún.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {silabos.map(silabo => (
              <div key={silabo.id} className="bg-white border border-slate-200 p-5 rounded-xl hover:shadow-md transition-all">
                <div className="font-bold text-slate-800 leading-tight mb-1">{getUnidadName(silabo.carga_lectiva_id)}</div>
                <div className="text-xs text-slate-500 mb-3 font-medium">Docente: {getDocenteByCarga(silabo.carga_lectiva_id)}</div>
                
                <div className="flex justify-between items-center mb-4">
                  <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider ${
                    silabo.estado === 'aprobado' ? 'bg-green-100 text-green-700' :
                    silabo.estado === 'observado' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {silabo.estado}
                  </span>
                  <a href={silabo.archivo_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    Ver Doc
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
    </div>
  );
}
