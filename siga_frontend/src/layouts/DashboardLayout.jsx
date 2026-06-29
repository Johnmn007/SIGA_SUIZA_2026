import { useState, useEffect } from 'react';
import { useAuth } from '../core/auth/useAuth';
import { wsClient } from '../core/api/client';

export function DashboardLayout({ children, currentView, onNavigate }) {
  const { user, logout, permissions } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [wsStatus, setWsStatus] = useState('disconnected');
  const getUserRole = () => {
    if (user?.is_superuser) return 'superadmin';
    if (user?.role) return user.role;
    if (!user?.roles || user.roles.length === 0) return 'invitado';
    const r = user.roles[0];
    return typeof r === 'string' ? r : (r.name || r.nombre || 'invitado');
  };
  const userRole = getUserRole();

  useEffect(() => {
    wsClient.connect();

    const unsubConnect = wsClient.on('connected', () => setWsStatus('connected'));
    const unsubDisconnect = wsClient.on('disconnected', () => setWsStatus('disconnected'));
    const unsubMessage = wsClient.on('message', (data) => {
      setNotifications(prev => [...prev, { id: Date.now(), text: data }]);
      setTimeout(() => {
        setNotifications(prev => prev.slice(1));
      }, 5000);
    });

    return () => {
      unsubConnect();
      unsubDisconnect();
      unsubMessage();
      // wsClient.disconnect(); // keep alive across views
    };
  }, []);

  return (
    <div className="min-h-screen bg-background relative">
      {/* Notifications Overlay */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2">
        {notifications.map(notif => (
          <div key={notif.id} className="bg-white border-l-4 border-primary shadow-lg p-4 rounded-r-lg max-w-sm animate-fade-in">
            <div className="flex items-start">
              <span className="text-xl mr-3">🔔</span>
              <div>
                <h4 className="text-sm font-bold text-slate-800">Sistema</h4>
                <p className="text-sm text-slate-600">{notif.text}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Premium Navbar */}
      <nav className="glass-panel rounded-none border-b border-white/40 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex-shrink-0 flex items-center cursor-pointer" onClick={() => onNavigate('dashboard')}>
              <span className="text-2xl font-bold tracking-tight text-slate-800 flex items-center">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-dark mr-2">🎓 SIGA</span> Platform
                <span className="ml-4 flex items-center" title={`WebSocket Status: ${wsStatus}`}>
                  <span className={`h-3 w-3 rounded-full ${wsStatus === 'connected' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'} animate-pulse`}></span>
                </span>
              </span>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="hidden md:block text-right">
                <div className="text-sm font-bold text-slate-800">{user?.full_name}</div>
                <div className="text-xs text-slate-500">{user?.email}</div>
              </div>
              <button 
                onClick={logout}
                className="px-4 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-full text-sm font-medium transition-colors"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Layout Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Enhanced Sidebar */}
          <div className="w-full lg:w-1/4 flex-shrink-0">
            <div className="glass-card p-6 h-full flex flex-col">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 border border-primary/20 mb-3 text-2xl">
                  👤
                </div>
                <h5 className="text-lg font-bold text-slate-800">{user?.full_name}</h5>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">
                  {user?.is_superuser ? 'Superadmin' : userRole}
                </p>
              </div>
              
              <div className="flex flex-col space-y-2 mb-8">
                {['superadmin', 'admin'].includes(userRole) && (
                  <NavItem 
                    active={currentView === 'dashboard'} 
                    onClick={() => onNavigate('dashboard')} 
                    icon="🏠" 
                    label="Dashboard General" 
                  />
                )}
                {['superadmin', 'admin', 'secretaria_academica', 'director'].includes(userRole) && (
                  <NavItem 
                    active={currentView === 'academic'} 
                    onClick={() => onNavigate('academic')} 
                    icon="📚" 
                    label="Gestión Académica Central" 
                  />
                )}
                
                {['superadmin', 'admin', 'secretaria_academica', 'secretaria_programa', 'admin_admision'].includes(userRole) && (
                  <NavItem 
                    active={currentView === 'students'} 
                    onClick={() => onNavigate('students')} 
                    icon="👤" 
                    label="Registro de Estudiantes" 
                  />
                )}
                
                {['superadmin', 'admin', 'secretaria_programa'].includes(userRole) && (
                  <NavItem 
                    active={currentView === 'enrollment'} 
                    onClick={() => onNavigate('enrollment')} 
                    icon="📝" 
                    label="Proceso de Matrícula" 
                  />
                )}

                {['superadmin', 'admin', 'coordinador_programa'].includes(userRole) && (
                  <NavItem 
                    active={currentView === 'coordinator_academic'} 
                    onClick={() => onNavigate('coordinator_academic')} 
                    icon="📋" 
                    label="Coordinación de Programa" 
                  />
                )}

                {['superadmin', 'admin', 'docente'].includes(userRole) && (
                  <NavItem 
                    active={currentView === 'evaluation'} 
                    onClick={() => onNavigate('evaluation')} 
                    icon="📊" 
                    label="Panel Docente" 
                  />
                )}

                {['superadmin', 'admin', 'coordinador_programa', 'director'].includes(userRole) && (
                  <NavItem 
                    active={currentView === 'coordinator_eval'} 
                    onClick={() => onNavigate('coordinator_eval')} 
                    icon="👁️" 
                    label="Supervisión de Actas" 
                  />
                )}

                {['superadmin', 'admin', 'secretaria_academica', 'secretaria_programa', 'director'].includes(userRole) && (
                  <NavItem 
                    active={currentView === 'tramites'} 
                    onClick={() => onNavigate('tramites')} 
                    icon="📑" 
                    label="Trámites y Casuísticas" 
                  />
                )}

                {['superadmin', 'admin', 'estudiante'].includes(userRole) && (
                  <NavItem 
                    active={currentView === 'report_card'} 
                    onClick={() => onNavigate('report_card')} 
                    icon="🎓" 
                    label="Boletín (Estudiante)" 
                  />
                )}

                {['caja_tesoreria', 'superadmin', 'admin'].includes(userRole) && (
                  <NavItem 
                    active={currentView === 'finanzas'} 
                    onClick={() => onNavigate('finanzas')} 
                    icon="💳" 
                    label="Finanzas y Pagos" 
                  />
                )}

                {['superadmin', 'admin'].includes(userRole) && (
                  <NavItem 
                    active={currentView === 'admin'} 
                    onClick={() => onNavigate('admin')} 
                    icon="⚙️" 
                    label="Administración" 
                  />
                )}
              </div>

              <div className="mt-auto pt-6 border-t border-slate-200/50">
                <span className="text-xs font-bold text-slate-500 block mb-3 uppercase tracking-wider">Tus Capacidades</span>
                <div className="flex flex-wrap gap-2">
                  {permissions.map(permission => (
                    <span 
                      key={permission}
                      className="px-2 py-1 text-[10px] font-semibold bg-green-100 text-green-700 rounded-full border border-green-200"
                    >
                      {permission}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Page Content */}
          <div className="w-full lg:w-3/4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function NavItem({ active, onClick, icon, label, disabled }) {
  if (disabled) {
    return (
      <button className="flex items-center w-full text-left px-4 py-3 rounded-xl bg-white/40 border border-transparent text-slate-400 opacity-60 cursor-not-allowed">
        <span className="mr-3 text-lg">{icon}</span>
        <span className="font-medium text-sm">{label}</span>
      </button>
    );
  }
  return (
    <button 
      onClick={onClick}
      className={`flex items-center w-full text-left px-4 py-3 rounded-xl transition-all duration-200 ${
        active 
          ? 'bg-white shadow-sm border border-slate-200 text-primary-dark font-semibold' 
          : 'bg-white/40 border border-transparent text-slate-600 hover:bg-white/80 hover:shadow-sm'
      }`}
    >
      <span className="mr-3 text-lg">{icon}</span>
      <span className="text-sm">{label}</span>
    </button>
  );
}