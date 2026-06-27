import { useState, useEffect } from 'react';
import { API_BASE } from '../../core/api/client';

export function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    source: '',
    event_type: ''
  });

  const loadLogs = async () => {
    setLoading(true);
    try {
      let url = `${API_BASE}/api/mod-auditoria/api/v1/auditoria?limit=50`;
      if (filters.source) url += `&source=${filters.source}`;
      if (filters.event_type) url += `&event_type=${filters.event_type}`;
      
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        setLogs(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadLogs();
  }, [filters]);

  return (
    <div className="animate-fade-in flex flex-col space-y-6">
      
      <div className="glass-card p-6 flex flex-col md:flex-row gap-6 items-end bg-white/40">
        <div className="w-full md:w-1/3">
          <label className="label text-slate-700">Módulo (Source)</label>
          <div className="relative">
            <select 
              className="input-field appearance-none pr-10"
              value={filters.source}
              onChange={(e) => setFilters({...filters, source: e.target.value})}
            >
              <option value="">Todos los módulos</option>
              <option value="mod-gestion-academica">Gestión Académica</option>
              <option value="mod-usuarios">Usuarios</option>
              <option value="mod-programas-estudio">Programas de Estudio</option>
              <option value="mod-planes-estudio">Planes de Estudio</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
        <div className="w-full md:w-1/3">
          <label className="label text-slate-700">Tipo de Evento</label>
          <input 
            type="text" 
            className="input-field" 
            placeholder="Ej. gestion_academica.estudiante.creado"
            value={filters.event_type}
            onChange={(e) => setFilters({...filters, event_type: e.target.value})}
          />
        </div>
        <div className="w-full md:w-auto">
          <button 
            className="btn-primary w-full md:w-auto flex items-center justify-center space-x-2 px-6 py-2 shadow-md shadow-primary/30" 
            onClick={loadLogs}
          >
            <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refrescar</span>
          </button>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white/40">
          <h5 className="text-xl font-bold text-slate-800 flex items-center">
            <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center mr-3">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </span>
            Registro de Actividad
          </h5>
          <span className="bg-slate-100 text-slate-600 text-sm font-semibold px-3 py-1 rounded-full">{logs.length} eventos</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                <th className="px-6 py-4 font-semibold">Fecha/Hora</th>
                <th className="px-6 py-4 font-semibold">Módulo</th>
                <th className="px-6 py-4 font-semibold">Evento</th>
                <th className="px-6 py-4 font-semibold text-center">Usuario (ID)</th>
                <th className="px-6 py-4 font-semibold">Payload (Detalles)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-16 text-slate-400">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    Cargando logs de auditoría...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-16 text-slate-400">
                    <div className="text-slate-300 mb-4">
                      <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    No hay registros de auditoría que coincidan con los filtros.
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-700">{new Date(log.timestamp).toLocaleDateString()}</div>
                      <div className="text-xs text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-sm">
                        {log.source}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-sm text-slate-800 bg-slate-100 inline-block px-2 py-1 rounded">
                        {log.event_type}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-medium text-slate-600 bg-white border border-slate-200 px-2.5 py-0.5 rounded-full shadow-sm">
                        {log.user_id || 'Sistema'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="bg-slate-900 text-green-400 p-3 rounded-lg text-xs font-mono max-h-32 overflow-y-auto whitespace-pre-wrap shadow-inner border border-slate-800">
                        {JSON.stringify(log.payload, null, 2)}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
