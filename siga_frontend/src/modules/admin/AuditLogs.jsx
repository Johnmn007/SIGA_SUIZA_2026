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
    <div className="animate-fade-in">
      <div className="glass-card p-4 mb-4 flex gap-4">
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase">Módulo (Source)</label>
          <select 
            className="input-field py-2"
            value={filters.source}
            onChange={(e) => setFilters({...filters, source: e.target.value})}
          >
            <option value="">Todos</option>
            <option value="mod-gestion-academica">Gestión Académica</option>
            <option value="mod-usuarios">Usuarios</option>
            <option value="mod-programas-estudio">Programas de Estudio</option>
            <option value="mod-planes-estudio">Planes de Estudio</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase">Tipo de Evento</label>
          <input 
            type="text" 
            className="input-field py-2" 
            placeholder="Ej. gestion_academica.estudiante.creado"
            value={filters.event_type}
            onChange={(e) => setFilters({...filters, event_type: e.target.value})}
          />
        </div>
        <div className="flex items-end">
          <button className="btn-primary py-2" onClick={loadLogs}>
            ↻ Refrescar
          </button>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0 text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Fecha/Hora</th>
                <th className="px-4 py-3">Módulo</th>
                <th className="px-4 py-3">Evento</th>
                <th className="px-4 py-3">Usuario (ID)</th>
                <th className="px-4 py-3">Payload (Detalles)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-slate-400">
                    <div className="spinner-border text-primary spinner-border-sm mr-2"></div>
                    Cargando logs de auditoría...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-slate-400">
                    No hay registros de auditoría que coincidan con los filtros.
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-xs whitespace-nowrap text-slate-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs rounded font-medium border border-indigo-100">
                        {log.source}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">
                      {log.event_type}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-center">
                      {log.user_id || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="bg-slate-900 text-green-400 p-2 rounded text-xs font-mono max-h-24 overflow-y-auto whitespace-pre-wrap">
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
