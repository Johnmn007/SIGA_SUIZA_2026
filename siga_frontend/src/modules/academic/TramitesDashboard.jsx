import { useState, useEffect } from 'react';
import { apiClient } from '../../core/api/client';

export function TramitesDashboard() {
  const [activeTab, setActiveTab] = useState('solicitudes');
  const [loading, setLoading] = useState(false);
  
  // States for Solicitudes (TUPA)
  const [solicitudes, setSolicitudes] = useState([]);
  
  const fetchSolicitudes = async () => {
    setLoading(true);
    try {
      const res = await apiClient.request('/api/mod-gestion-academica/tramites/').catch(() => []);
      // If db is empty, mock some data for the UI demonstration
      if (res.length === 0) {
        setSolicitudes([
          { id: 1, estudiante_id: 101, nombre_alumno: 'Perez, Juan', tipo_tramite: 'Reserva de Matrícula', estado: 'pendiente', fecha_solicitud: '2026-06-25' },
          { id: 2, estudiante_id: 102, nombre_alumno: 'Gomez, Maria', tipo_tramite: 'Constancia de Egreso', estado: 'en_proceso', fecha_solicitud: '2026-06-26' },
          { id: 3, estudiante_id: 103, nombre_alumno: 'Salas, Luis', tipo_tramite: 'Certificado de Estudios', estado: 'emitido', fecha_solicitud: '2026-06-20' },
        ]);
      } else {
        setSolicitudes(res);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Mock data fetching since we don't have full data seeding for tramites yet
  useEffect(() => {
    if (activeTab === 'solicitudes') {
      fetchSolicitudes();
    }
  }, [activeTab]);

  const handleEstadoChange = async (id, newEstado) => {
    // In a real scenario, this would call PUT /api/mod-gestion-academica/tramites/{id}/estado
    setSolicitudes(prev => prev.map(s => s.id === id ? { ...s, estado: newEstado } : s));
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
          <h3 className="text-3xl font-bold tracking-tight text-slate-800">
            Gestión de <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">Trámites y Casuísticas</span>
          </h3>
          <p className="text-slate-500 text-sm mt-1">Administración TUPA, Convalidaciones, Becas y Resoluciones</p>
        </div>
      </div>

      <div className="w-full">
        <div className="flex border-b-0 space-x-1">
          {renderTabHeader('solicitudes', 'Trámites y Solicitudes', '📑')}
          {renderTabHeader('convalidaciones', 'Convalidaciones', '🔄')}
          {renderTabHeader('becas', 'Becas y Beneficios', '🎓')}
        </div>

        <div className="glass-card rounded-tl-none p-6 min-h-[500px]">
          {activeTab === 'solicitudes' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-bold text-slate-700">Solicitudes Ingresadas</h4>
                <button className="btn-primary py-1.5 px-4 text-sm rounded-lg flex items-center">
                  <span className="mr-2">+</span> Nueva Solicitud Manual
                </button>
              </div>
              
              {loading ? (
                <div className="text-center py-10"><div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div></div>
              ) : (
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-slate-100/80 border-y border-slate-200">
                    <tr>
                      <th className="py-3 px-4 font-bold text-slate-600">ID / Fecha</th>
                      <th className="py-3 px-4 font-bold text-slate-600">Estudiante</th>
                      <th className="py-3 px-4 font-bold text-slate-600">Tipo de Trámite</th>
                      <th className="py-3 px-4 font-bold text-slate-600">Estado</th>
                      <th className="py-3 px-4 font-bold text-slate-600 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {solicitudes.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-700">#{s.id}</span>
                          <div className="text-xs text-slate-500">{s.fecha_solicitud}</div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-700">{s.nombre_alumno || `Estudiante #${s.estudiante_id}`}</td>
                        <td className="py-3 px-4 font-medium text-slate-600">{s.tipo_tramite}</td>
                        <td className="py-3 px-4">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase ${
                            s.estado === 'pendiente' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                            s.estado === 'en_proceso' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                            s.estado === 'emitido' ? 'bg-green-100 text-green-700 border border-green-200' :
                            'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            {s.estado.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <select 
                            className="text-xs border-slate-200 rounded-lg mr-2 outline-none py-1.5 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                            value={s.estado}
                            onChange={(e) => handleEstadoChange(s.id, e.target.value)}
                          >
                            <option value="pendiente">Pendiente</option>
                            <option value="en_proceso">En Proceso</option>
                            <option value="emitido">Emitido / Aprobado</option>
                            <option value="rechazado">Rechazado</option>
                          </select>
                          <button className="text-slate-400 hover:text-amber-600 transition-colors" title="Ver Detalles">👁️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'convalidaciones' && (
            <div className="space-y-6 animate-fade-in text-center py-16">
              <div className="text-6xl mb-4">🔄</div>
              <h3 className="text-2xl font-bold text-slate-700 mb-2">Módulo de Convalidaciones</h3>
              <p className="text-slate-500 max-w-lg mx-auto">
                Registre las Resoluciones Directorales para estudiantes provenientes de Traslado Interno, Externo o Cambios de Plan de Estudio.
              </p>
              <button className="btn-primary mt-6 px-6 py-2.5 rounded-xl">Registrar Resolución de Convalidación</button>
            </div>
          )}

          {activeTab === 'becas' && (
            <div className="space-y-6 animate-fade-in text-center py-16">
              <div className="text-6xl mb-4">🎓</div>
              <h3 className="text-2xl font-bold text-slate-700 mb-2">Gestión de Becas y Convenios</h3>
              <p className="text-slate-500 max-w-lg mx-auto">
                Asigne beneficios económicos a estudiantes (PRONABEC, Excelencia, Convenios Institucionales). Estos descuentos se aplicarán automáticamente en el Módulo de Tesorería.
              </p>
              <button className="btn-primary mt-6 px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 border-orange-600">Asignar Beneficio a Estudiante</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
