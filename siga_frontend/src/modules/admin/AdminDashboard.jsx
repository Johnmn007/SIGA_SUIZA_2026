import { useState, useEffect } from 'react';
import { apiClient } from '../../core/api/client';
import { useAuth } from '../../core/auth/useAuth';
import { UserManagement } from './UserManagement';
import { AuditLogs } from './AuditLogs';
import { StaffManagement } from './StaffManagement';
import { AdmissionModule } from './AdmissionModule';
import { Lock, Info, Grid, Users, UserCog, GraduationCap, FileText, Settings, LayoutDashboard, HeartPulse, ShieldCheck, AlertTriangle } from 'lucide-react';

export function AdminDashboard() {
  const { user, permissions } = useAuth();
  const [systemStatus, setSystemStatus] = useState(null);
  const [modules, setModules] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statusData, modulesData] = await Promise.all([
          apiClient.getSystemStatus(),
          apiClient.getModules()
        ]);
        setSystemStatus(statusData);
        setModules(modulesData?.modules || []);
      } catch (error) {
        console.error('Error loading admin data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const isAdmin = user?.is_superuser || permissions.includes('core:user:manage');

  if (!isAdmin) {
    return (
      <div className="w-full h-full flex items-center justify-center p-8">
        <div className="glass-card p-10 text-center max-w-md w-full">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary-soft flex items-center justify-center text-primary"><Lock className="w-10 h-10" /></div>
          <h4 className="text-2xl font-bold text-slate-text mb-2">Acceso Restringido</h4>
          <p className="text-slate-500">No tienes permisos de administrador para acceder a esta sección.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full h-[60vh] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-500 font-medium">Cargando panel de administración...</p>
      </div>
    );
  }

  const renderOverview = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-6 text-center transform hover:-translate-y-1 transition-all">
          <div className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-2">Estado del Core</div>
          <h1 className={`text-2xl font-extrabold ${systemStatus?.status === 'healthy' ? 'text-green-500' : 'text-amber-500'}`}>
            {systemStatus?.status || 'Desconocido'}
          </h1>
        </div>
        <div className="glass-card p-6 text-center transform hover:-translate-y-1 transition-all">
          <div className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-2">Módulos Registrados</div>
          <div className="flex items-center justify-center">
            <Grid className="w-6 h-6 text-primary mr-2" />
            <h1 className="text-2xl font-extrabold text-primary">{systemStatus?.modules?.total || 0}</h1>
          </div>
        </div>
        <div className="glass-card p-6 text-center transform hover:-translate-y-1 transition-all">
          <div className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-2">Módulos Saludables</div>
          <div className="flex items-center justify-center">
            <HeartPulse className="w-6 h-6 text-green-500 mr-2" />
            <h1 className="text-4xl font-extrabold text-green-500">{systemStatus?.modules?.healthy || 0}</h1>
          </div>
        </div>
        <div className="glass-card p-6 text-center transform hover:-translate-y-1 transition-all">
          <div className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-2">Entorno</div>
          <div className="flex items-center justify-center">
            <Settings className="w-6 h-6 text-slate-500 mr-2" />
            <h1 className="text-2xl font-extrabold text-slate-text capitalize">{systemStatus?.environment || 'N/A'}</h1>
          </div>
        </div>
      </div>

      <div className="glass-card p-8">
        <h5 className="text-xl font-bold text-slate-text mb-6 flex items-center">
          <span className="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center mr-3">
            <Info className="w-5 h-5" />
          </span>
          Información del Sistema
        </h5>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 rounded-xl bg-slate-light border border-slate-100 flex justify-between items-center">
            <span className="text-slate-500 font-medium">Versión del Core</span>
            <span className="font-bold text-slate-text bg-white px-3 py-1 rounded-md shadow-sm">{systemStatus?.core_version || 'N/A'}</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-light border border-slate-100 flex justify-between items-center">
            <span className="text-slate-500 font-medium">Gateway HTTP</span>
            <span className="font-bold text-slate-text bg-white px-3 py-1 rounded-md shadow-sm">{systemStatus?.gateway?.http || 'N/A'}</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-light border border-slate-100 flex justify-between items-center">
            <span className="text-slate-500 font-medium">Usuario Actual</span>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-text bg-white px-3 py-1 rounded-md shadow-sm">{user?.email}</span>
              {user?.is_superuser && <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-md">Superadmin</span>}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-slate-light border border-slate-100 flex justify-between items-center">
            <span className="text-slate-500 font-medium">Rol</span>
            <span className="font-bold text-slate-text bg-white px-3 py-1 rounded-md shadow-sm capitalize">{user?.is_superuser ? 'Superadmin' : user?.role || 'N/A'}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderModules = () => (
    <div className="glass-card overflow-hidden animate-fade-in">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white/40">
        <h5 className="text-xl font-bold text-slate-text flex items-center">
          <span className="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center mr-3">
            <Grid className="w-5 h-5" />
          </span>
          Módulos del Ecosistema
        </h5>
        <span className="bg-slate-100 text-slate-600 text-sm font-semibold px-3 py-1 rounded-full">{modules.length} registrados</span>
      </div>
      
      {modules.length === 0 ? (
        <div className="p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary-soft flex items-center justify-center text-primary">
            <Grid className="w-10 h-10" />
          </div>
          <p className="text-slate-500 text-lg">No hay módulos registrados en el Core.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                <th className="px-6 py-4 font-semibold">Módulo</th>
                <th className="px-6 py-4 font-semibold">Versión</th>
                <th className="px-6 py-4 font-semibold">Estado</th>
                <th className="px-6 py-4 font-semibold">Endpoint</th>
                <th className="px-6 py-4 font-semibold">Cumplimiento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {modules.map((mod) => (
                <tr key={mod.name} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-text">{mod.name}</div>
                    {mod.description && <div className="text-xs text-slate-400 mt-1 line-clamp-1" title={mod.description}>{mod.description}</div>}
                  </td>
                  <td className="px-6 py-4 text-slate-600">v{mod.version}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      mod.status === 'healthy' ? 'bg-green-100 text-green-800' : 
                      mod.status === 'degraded' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {mod.status === 'healthy' && <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span>}
                      {mod.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 font-mono bg-slate-50/30">{mod.endpoints?.http || 'N/A'}</td>
                  <td className="px-6 py-4">
                    {mod.compliance ? (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        mod.compliance.valid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {mod.compliance.valid ? 'Válido' : 'Inválido'}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-sm italic">No verificado</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderUsers = () => (
    <div className="animate-fade-in">
      <UserManagement />
    </div>
  );

  const renderStaff = () => (
    <div className="animate-fade-in">
      <StaffManagement />
    </div>
  );

  const renderAudit = () => (
    <div className="animate-fade-in">
      <AuditLogs />
    </div>
  );

  const renderAdmision = () => (
    <div className="animate-fade-in">
      <AdmissionModule />
    </div>
  );

  const renderConfig = () => (
    <div className="glass-card overflow-hidden animate-fade-in">
      <div className="p-6 border-b border-slate-100 bg-white/40">
        <h5 className="text-xl font-bold text-slate-text flex items-center">
          <span className="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center mr-3">
            <Settings className="w-5 h-5" />
          </span>
          Configuración del Sistema
        </h5>
      </div>
      <div className="p-6">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start">
          <div className="text-amber-500 mr-4 mt-0.5">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h6 className="font-bold text-amber-800">Panel de configuración en construcción</h6>
            <p className="text-amber-700 text-sm mt-1">Aquí se gestionarán variables de entorno, parámetros del sistema y configuración de módulos de forma centralizada.</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 rounded-xl bg-slate-50 border border-slate-100 hover:shadow-md transition-shadow">
            <div className="text-slate-500 text-sm font-medium mb-1">Entorno Activo</div>
            <div className="text-2xl font-bold text-slate-text capitalize">{systemStatus?.environment || 'N/A'}</div>
          </div>
          <div className="p-5 rounded-xl bg-slate-50 border border-slate-100 hover:shadow-md transition-shadow">
            <div className="text-slate-500 text-sm font-medium mb-1">Versión del Core</div>
            <div className="text-2xl font-bold text-slate-text">{systemStatus?.core_version || 'N/A'}</div>
          </div>
        </div>
      </div>
    </div>
  );

  const tabs = [
    { key: 'overview', label: 'Resumen', Icon: LayoutDashboard },
    { key: 'modules', label: 'Módulos', Icon: Grid },
    { key: 'users', label: 'Usuarios', Icon: Users },
    { key: 'staff', label: 'Plana Docente / RRHH', Icon: UserCog },
    { key: 'admision', label: 'Admisión', Icon: GraduationCap },
    { key: 'audit', label: 'Auditoría', Icon: FileText },
    { key: 'config', label: 'Configuración', Icon: Settings },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-text tracking-tight mb-1">
            Panel de <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-light">Administración</span>
          </h1>
          <p className="text-slate-500">Gestión centralizada del sistema, módulos y usuarios</p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center space-x-3 bg-white/60 px-4 py-2 rounded-full shadow-sm border border-slate-100">
          <div className="flex items-center">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 mr-2 animate-pulse"></span>
            <span className="text-sm font-bold text-slate-700 capitalize">{systemStatus?.environment || 'N/A'}</span>
          </div>
          <div className="w-px h-4 bg-slate-300"></div>
          <span className="text-sm text-slate-500 font-medium">v{systemStatus?.core_version || 'N/A'}</span>
        </div>
      </div>

      {/* Modern Tabs */}
      <div className="mb-8 overflow-x-auto">
        <div className="flex space-x-2 p-1 bg-slate-200/50 rounded-xl inline-flex min-w-max">
          {tabs.map(tab => {
            const isActive = activeTab === tab.key;
            const TabIcon = tab.Icon;
            return (
              <button
                key={tab.key}
                className={`flex items-center px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ease-in-out outline-none ${
                  isActive 
                    ? 'bg-white text-primary shadow-sm ring-1 ring-black/5' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
                onClick={() => setActiveTab(tab.key)}
              >
                <TabIcon className={`w-5 h-5 mr-2 ${isActive ? 'text-primary' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="transition-all duration-300 ease-in-out">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'modules' && renderModules()}
        {activeTab === 'users' && renderUsers()}
        {activeTab === 'staff' && renderStaff()}
        {activeTab === 'admision' && renderAdmision()}
        {activeTab === 'audit' && renderAudit()}
        {activeTab === 'config' && renderConfig()}
      </div>
    </div>
  );
}