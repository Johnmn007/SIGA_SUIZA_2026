import { useAuth } from '../../core/auth/useAuth';
import { apiClient } from '../../core/api/client';
import { useState, useEffect } from 'react';
import { Boxes, Activity, Server, Rocket, CheckCircle2, Lock, Layers, ShieldCheck } from 'lucide-react';

export function Dashboard() {
  const { user, permissions } = useAuth();
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

  const isAdmin = user?.is_superuser || user?.roles?.includes('superadmin');

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div className="glass-panel p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-text">
            Hola, <span className="text-primary">{user?.full_name}</span>
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Bienvenido al Sistema Integral de Gestión Académica del IESTP Suiza
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge-green">
            <ShieldCheck size={14} />
            {permissions.length} Permisos Activos
          </span>
        </div>
      </div>

      {/* Métricas del sistema (solo administración) */}
      {isAdmin && systemStatus && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-6 flex items-center gap-5">
            <span className="w-12 h-12 rounded-xl bg-primary-soft text-primary-dark flex items-center justify-center flex-shrink-0">
              <Boxes size={22} />
            </span>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-0.5">Módulos Registrados</div>
              <div className="text-3xl font-extrabold text-slate-text">{systemStatus.modules?.total || 0}</div>
            </div>
          </div>
          <div className="glass-card p-6 flex items-center gap-5">
            <span className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <Activity size={22} />
            </span>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-0.5">Estado Global</div>
              <div className="text-3xl font-extrabold text-emerald-600">Saludable</div>
            </div>
          </div>
          <div className="glass-card p-6 flex items-center gap-5">
            <span className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
              <Server size={22} />
            </span>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-0.5">Entorno</div>
              <div className="text-3xl font-extrabold text-indigo-600 capitalize">{systemStatus.environment}</div>
              <div className="text-xs font-medium text-slate-400 mt-1">
                v{systemStatus.core_version}
              </div>
            </div>
          </div>
        </div>
      )}

      {isAdmin ? (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xl font-bold text-slate-text flex items-center gap-2">
                <Layers size={20} className="text-primary" />
                Ecosistema de Módulos
              </h4>
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
                <div key={module.name} className="glass-card p-6 flex flex-col h-full hover:-translate-y-1 transition-transform duration-300 hover:shadow-glass-lg">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h5 className="font-bold text-lg text-slate-text tracking-tight">{module.name}</h5>
                      <span className="text-xs font-medium text-slate-400">v{module.version}</span>
                    </div>
                    <span className={`badge ${module.status === 'healthy' ? 'badge-green' : 'badge-amber'}`}>
                      {module.status}
                    </span>
                  </div>
                  <p className="text-slate-500 text-sm mb-6 flex-grow">{module.description}</p>

                  <div className="mt-auto pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-center text-xs text-slate-400">
                      <span>API: <span className="font-medium text-slate-600">{module.api_version}</span></span>
                      {canAccessModule(module.name) ? (
                        <span className="text-emerald-600 font-bold flex items-center">
                          <CheckCircle2 size={14} className="mr-1" /> Acceso
                        </span>
                      ) : (
                        <span className="text-slate-300 font-medium flex items-center">
                          <Lock size={14} className="mr-1" /> Restringido
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
        <div className="glass-card p-10 text-center flex flex-col items-center justify-center">
          <div className="w-20 h-20 mb-6 flex items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-white shadow-lg shadow-primary/25">
            <Rocket size={36} />
          </div>
          <h3 className="text-2xl font-bold text-slate-text mb-2">Tu panel de control está listo</h3>
          <p className="text-slate-500 max-w-md mx-auto mb-6">
            Utiliza el menú lateral para navegar por las herramientas y módulos a los que tienes acceso según tu rol como {user?.full_name}.
          </p>
          <span className="badge-blue">Acceso según tu rol</span>
        </div>
      )}
    </div>
  );
}