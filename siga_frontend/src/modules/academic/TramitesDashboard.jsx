import { useState, useEffect } from 'react';
import { apiClient } from '../../core/api/client';
import { Plus, Eye, FileText, Repeat, GraduationCap } from 'lucide-react';
import { ConvalidacionesTab } from './ConvalidacionesTab';
import { BecasTab } from './BecasTab';

export function TramitesDashboard() {
  const [activeTab, setActiveTab] = useState('solicitudes');
  const [loading, setLoading] = useState(false);
  
  // States for Solicitudes (TUPA)
  const [solicitudes, setSolicitudes] = useState([]);
  
  const [error, setError] = useState('');

  const fetchSolicitudes = async () => {
    setLoading(true);
    setError('');
    try {
      const [tramites, estudiantes] = await Promise.all([
        apiClient.request('/api/mod-gestion-academica/tramites/'),
        apiClient.request('/api/mod-gestion-academica/estudiantes/').catch(() => []),
      ]);
      const nombres = new Map((estudiantes || []).map(e => [e.id, `${e.apellidos}, ${e.nombres}`]));
      setSolicitudes((tramites || []).map(t => ({ ...t, nombre_alumno: nombres.get(t.estudiante_id) })));
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar los trámites.');
      setSolicitudes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'solicitudes') {
      fetchSolicitudes();
    }
  }, [activeTab]);

  const handleEstadoChange = async (id, newEstado) => {
    const anterior = solicitudes;
    setSolicitudes(prev => prev.map(s => s.id === id ? { ...s, estado: newEstado } : s));
    try {
      await apiClient.request(`/api/mod-gestion-academica/tramites/${id}/estado?estado=${newEstado}`, { method: 'PUT' });
    } catch (err) {
      console.error(err);
      setSolicitudes(anterior);
      setError('No se pudo actualizar el estado del trámite.');
    }
  };

  const renderTabHeader = (id, label, icon) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-5 py-3 rounded-t-xl font-bold transition-colors flex items-center space-x-2 ${
        activeTab === id 
          ? 'bg-white text-primary border-t-2 border-primary shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10 relative' 
          : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border-b border-slate-300'
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h3 className="text-3xl font-bold tracking-tight text-slate-text">
            Gestión de <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">Trámites y Casuísticas</span>
          </h3>
          <p className="text-slate-500 text-sm mt-1">Administración TUPA, Convalidaciones, Becas y Resoluciones</p>
        </div>
      </div>

      <div className="w-full">
        <div className="flex border-b-0 space-x-1">
          {renderTabHeader('solicitudes', 'Trámites y Solicitudes', <FileText size={16} />)}
          {renderTabHeader('convalidaciones', 'Convalidaciones', <Repeat size={16} />)}
          {renderTabHeader('becas', 'Becas y Beneficios', <GraduationCap size={16} />)}
        </div>

        <div className="glass-card rounded-tl-none p-6 min-h-[500px]">
          {activeTab === 'solicitudes' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-bold text-slate-700">Solicitudes Ingresadas</h4>
                <button className="btn-primary py-1.5 px-4 text-sm rounded-lg flex items-center gap-1.5">
                  <Plus size={16} /> Nueva Solicitud Manual
                </button>
              </div>
              
              {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
              {loading ? (
                <div className="text-center py-10"><div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div></div>
              ) : (
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-slate-50/80 border-y border-slate-200">
                    <tr>
                      <th className="py-3 px-4 font-bold text-slate-600">ID / Fecha</th>
                      <th className="py-3 px-4 font-bold text-slate-600">Estudiante</th>
                      <th className="py-3 px-4 font-bold text-slate-600">Tipo de Trámite</th>
                      <th className="py-3 px-4 font-bold text-slate-600">Estado</th>
                      <th className="py-3 px-4 font-bold text-slate-600 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {solicitudes.length === 0 && (
                      <tr><td colSpan={5} className="py-10 text-center text-slate-400">No hay solicitudes registradas.</td></tr>
                    )}
                    {solicitudes.map(s => (
                      <tr key={s.id} className="hover:bg-primary/5 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-700">#{s.id}</span>
                          <div className="text-xs text-slate-500">{s.fecha_solicitud}</div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-700">{s.nombre_alumno || `Estudiante #${s.estudiante_id}`}</td>
                        <td className="py-3 px-4 font-medium text-slate-600">{s.tipo_tramite}</td>
                        <td className="py-3 px-4">
                          <span className={`badge ${
                            s.estado === 'pendiente' ? 'badge-amber' :
                            s.estado === 'en_proceso' ? 'badge-blue' :
                            s.estado === 'emitido' ? 'badge-green' :
                            'badge-slate'
                          }`}>
                            {s.estado.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <select 
                            className="input-field text-xs mr-2 py-1.5"
                            value={s.estado}
                            onChange={(e) => handleEstadoChange(s.id, e.target.value)}
                          >
                            <option value="pendiente">Pendiente</option>
                            <option value="en_proceso">En Proceso</option>
                            <option value="emitido">Emitido / Aprobado</option>
                            <option value="rechazado">Rechazado</option>
                          </select>
                          <button className="btn-icon text-slate-400 hover:text-amber-600" title="Ver Detalles">
                            <Eye size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'convalidaciones' && <ConvalidacionesTab />}

          {activeTab === 'becas' && <BecasTab />}
        </div>
      </div>
    </div>
  );
}
