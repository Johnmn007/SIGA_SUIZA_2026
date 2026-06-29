import { useAuth } from '../../core/auth/useAuth';
import { apiClient } from '../../core/api/client';
import { useState, useEffect } from 'react';

export function Dashboard() {
  const { user, permissions, hasPermission } = useAuth();
  const [modules, setModules] = useState([]);
  const [systemStatus, setSystemStatus] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [modulesData, statusData] = await Promise.all([
          apiClient.getModules(),
          apiClient.getSystemStatus()
        ]);

        setModules(modulesData?.modules || []);
        setSystemStatus(statusData);
      } catch (error) {
        console.error('Error loading system data:', error);
      }
    };

    loadData();
  }, []);

  const canAccessModule = (moduleName) => {
    return permissions.some(p => p.startsWith(`${moduleName}:`));
  };

  return (
    <div className="animate-fade-in">
      {/* Header Section */}
      <div className="glass-panel p-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/60">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 mb-1">
            Hola, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-dark">{user?.full_name}</span> 👋
          </h2>
          <p className="text-slate-500 text-sm">
            Bienvenido al Sistema Integral de Gestión Académica (SIGA)
          </p>
        </div>
        <div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
            {permissions.length} Permisos Activos
          </span>
        </div>
      </div>

      {/* System Quick Stats (Only for Admins) */}
      {(user?.is_superuser || user?.roles?.includes('superadmin')) && systemStatus && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="glass-card p-6 text-center flex flex-col justify-center items-center">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Módulos Registrados</div>
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-primary to-primary-light">
              {systemStatus.modules?.total || 0}
            </h1>
          </div>
          <div className="glass-card p-6 text-center flex flex-col justify-center items-center">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Estado Global</div>
            <h1 className="text-4xl font-extrabold text-green-500 drop-shadow-sm">Saludable</h1>
          </div>
          <div className="glass-card p-6 text-center flex flex-col justify-center items-center">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Entorno</div>
            <h1 className="text-4xl font-extrabold text-indigo-500 drop-shadow-sm capitalize">
              {systemStatus.environment}
            </h1>
            <div className="text-xs font-medium text-slate-400 mt-2 bg-slate-100 px-2 py-0.5 rounded-md">v{systemStatus.core_version}</div>
          </div>
        </div>
      )}

      {/* Modules Grid (Only for Admins) */}
      {(user?.is_superuser || user?.roles?.includes('superadmin')) ? (
        <>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-xl font-bold text-slate-800">Ecosistema de Módulos</h4>
              <span className="text-sm text-slate-500">Explora las capacidades del sistema</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.length === 0 ? (
              <div className="col-span-full glass-card py-16 text-center">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-500 font-medium">Sincronizando con el Core Platform...</p>
              </div>
            ) : (
              modules.map(module => (
                <div key={module.name} className="glass-card p-6 flex flex-col h-full hover:-translate-y-1 transition-transform duration-300">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h5 className="font-bold text-lg text-slate-800 tracking-tight">{module.name}</h5>
                      <span className="text-xs font-medium text-slate-400">v{module.version}</span>
                    </div>
                    <div className={`px-2 py-1 text-[10px] uppercase font-bold rounded-md border ${module.status === 'healthy' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-yellow-50 text-yellow-600 border-yellow-200'}`}>
                      {module.status}
                    </div>
                  </div>
                  <p className="text-slate-500 text-sm mb-6 flex-grow">{module.description}</p>
                  
                  <div className="mt-auto pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-center text-xs text-slate-400">
                      <span>API: <span className="font-medium text-slate-600">{module.api_version}</span></span>
                      {canAccessModule(module.name) ? (
                        <span className="text-green-500 font-bold flex items-center">
                          <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Acceso
                        </span>
                      ) : (
                        <span className="text-slate-300 font-medium flex items-center">
                          <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg> Restringido
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <div className="glass-card p-10 text-center flex flex-col items-center justify-center bg-gradient-to-br from-white to-slate-50">
          <div className="w-20 h-20 mb-6 flex items-center justify-center rounded-full bg-primary/10">
            <span className="text-4xl">🚀</span>
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-2">Tu panel de control está listo</h3>
          <p className="text-slate-500 max-w-md mx-auto mb-6">
            Utiliza el menú lateral para navegar por las herramientas y módulos a los que tienes acceso según tu rol como {user?.full_name}.
          </p>
        </div>
      )}
    </div>
  );
}