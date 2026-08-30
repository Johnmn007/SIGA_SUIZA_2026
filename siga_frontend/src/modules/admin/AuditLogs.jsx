import { useState, useEffect } from 'react';
import { API_BASE } from '../../core/api/client';
import { FileText, RefreshCw, ChevronDown, ScrollText } from 'lucide-react';

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
              <ChevronDown className="w-4 h-4" />
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
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refrescar</span>
          </button>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white/40">
          <h5 className="text-xl font-bold text-slate-text flex items-center">
            <span className="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center mr-3">
              <FileText className="w-5 h-5" />
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
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary-soft flex items-center justify-center text-primary">
                      <ScrollText className="w-10 h-10" />
                    </div>
                    No hay registros de auditoría que coincidan con los filtros.
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-primary-soft/40 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-text">{new Date(log.timestamp).toLocaleDateString()}</div>
                      <div className="text-xs text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-primary-soft text-primary border border-primary/20 shadow-sm">
                        {log.source}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-sm text-slate-text bg-slate-100 inline-block px-2 py-1 rounded">
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
