import { useState, useEffect } from 'react';
import { useAuth } from '../core/auth/useAuth';
import { wsClient } from '../core/api/client';
import { ChangePasswordModal } from '../core/auth/ChangePasswordModal';
import {
  LayoutDashboard, GraduationCap, Users, ClipboardList, ClipboardCheck,
  LineChart, Eye, ScrollText, BookOpen, CreditCard, Settings, Bell, LogOut,
  KeyRound, User,
} from 'lucide-react';

export function DashboardLayout({ children, currentView, onNavigate }) {
  const { user, logout, permissions } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [wsStatus, setWsStatus] = useState('disconnected');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const getUserRoles = () => {
    if (user?.is_superuser) return ['superadmin'];
    let roles = [];
    if (user?.roles && Array.isArray(user.roles)) {
      roles = user.roles.map(r => typeof r === 'string' ? r : (r.name || r.nombre));
    } else if (user?.role) {
      roles = [user.role];
    }
    return roles.length > 0 ? roles : ['invitado'];
  };
  const userRoles = getUserRoles();

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
    };
  }, []);

  return (
    <div className="min-h-screen bg-background relative">
      {/* Notificaciones */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2">
        {notifications.map(notif => (
          <div key={notif.id} className="bg-white border-l-4 border-primary shadow-card-lg p-4 rounded-r-xl max-w-sm animate-fade-in">
            <div className="flex items-start gap-3">
              <span className="w-8 h-8 rounded-full bg-primary-soft text-primary-dark flex items-center justify-center flex-shrink-0">
                <Bell size={16} />
              </span>
              <div>
                <h4 className="text-sm font-bold text-slate-text">Sistema</h4>
                <p className="text-sm text-slate-500">{notif.text}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navbar premium institucional */}
      <nav className="glass-panel rounded-none border-b border-white/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex-shrink-0 flex items-center cursor-pointer gap-3" onClick={() => onNavigate('dashboard')}>
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center shadow-md shadow-primary/25">
                <GraduationCap size={22} />
              </span>
              <span className="leading-tight">
                <span className="block text-lg font-800 font-extrabold tracking-tight text-slate-text">
                  IESTP <span className="text-primary">Suiza</span>
                </span>
                <span className="block text-[11px] font-semibold text-navy/60 uppercase tracking-widest">
                  SIGA · Gestión Académica
                </span>
              </span>
              <span className="ml-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-light border border-slate-200" title={`Estado de conexión: ${wsStatus}`}>
                <span className={`h-2 w-2 rounded-full ${wsStatus === 'connected' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-red-500'} animate-pulse`}></span>
                <span className="text-[10px] font-semibold text-navy/70 uppercase tracking-wide hidden sm:inline">
                  {wsStatus === 'connected' ? 'En línea' : 'Sin conexión'}
                </span>
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden md:block text-right">
                <div className="text-sm font-bold text-slate-text">{user?.full_name}</div>
                <div className="text-xs text-slate-500">{user?.email}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-navy hover:bg-slate-light hover:border-slate-300 text-sm font-medium transition-colors"
                >
                  <KeyRound size={16} />
                  <span className="hidden sm:inline">Cambiar Contraseña</span>
                </button>
                <button
                  onClick={logout}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 text-sm font-medium transition-colors"
                >
                  <LogOut size={16} />
                  <span className="hidden sm:inline">Cerrar Sesión</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Sidebar */}
          <div className="w-full lg:w-1/4 flex-shrink-0">
            <div className="glass-card p-6 h-full flex flex-col">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary text-white shadow-lg shadow-primary/25 mb-3">
                  <User size={32} />
                </div>
                <h5 className="text-lg font-bold text-slate-text">{user?.full_name}</h5>
                <p className="text-xs font-semibold text-primary-dark uppercase tracking-wider mt-1">
                  {user?.is_superuser ? 'Superadmin' : (userRoles.join(' / '))}
                </p>
              </div>

              <div className="flex flex-col space-y-1.5 mb-8">
                {['superadmin', 'admin'].some(r => userRoles.includes(r)) && (
                  <NavItem
                    active={currentView === 'dashboard'}
                    onClick={() => onNavigate('dashboard')}
                    icon={LayoutDashboard}
                    label="Dashboard General"
                  />
                )}
                {['superadmin', 'admin', 'secretaria_academica', 'director'].some(r => userRoles.includes(r)) && (
                  <NavItem
                    active={currentView === 'academic'}
                    onClick={() => onNavigate('academic')}
                    icon={GraduationCap}
                    label="Gestión Académica Central"
                  />
                )}
                {['superadmin', 'admin', 'secretaria_programa', 'admin_admision'].some(r => userRoles.includes(r)) && (
                  <NavItem
                    active={currentView === 'students'}
                    onClick={() => onNavigate('students')}
                    icon={Users}
                    label="Registro de Estudiantes"
                  />
                )}
                {['superadmin', 'admin', 'secretaria_programa'].some(r => userRoles.includes(r)) && (
                  <NavItem
                    active={currentView === 'enrollment'}
                    onClick={() => onNavigate('enrollment')}
                    icon={ClipboardList}
                    label="Proceso de Matrícula"
                  />
                )}
                {['superadmin', 'admin', 'coordinador_programa'].some(r => userRoles.includes(r)) && (
                  <NavItem
                    active={currentView === 'coordinator_academic'}
                    onClick={() => onNavigate('coordinator_academic')}
                    icon={ClipboardCheck}
                    label="Coordinación de Programa"
                  />
                )}
                {['superadmin', 'admin', 'docente'].some(r => userRoles.includes(r)) && (
                  <NavItem
                    active={currentView === 'evaluation'}
                    onClick={() => onNavigate('evaluation')}
                    icon={LineChart}
                    label="Panel Docente"
                  />
                )}
                {['superadmin', 'admin', 'coordinador_programa', 'director'].some(r => userRoles.includes(r)) && (
                  <NavItem
                    active={currentView === 'coordinator_eval'}
                    onClick={() => onNavigate('coordinator_eval')}
                    icon={Eye}
                    label="Supervisión de Actas"
                  />
                )}
                {['superadmin', 'admin', 'secretaria_academica', 'secretaria_programa', 'director'].some(r => userRoles.includes(r)) && (
                  <NavItem
                    active={currentView === 'tramites'}
                    onClick={() => onNavigate('tramites')}
                    icon={ScrollText}
                    label="Trámites y Casuísticas"
                  />
                )}
                {['superadmin', 'admin', 'estudiante'].some(r => userRoles.includes(r)) && (
                  <NavItem
                    active={currentView === 'report_card'}
                    onClick={() => onNavigate('report_card')}
                    icon={BookOpen}
                    label="Boletín (Estudiante)"
                  />
                )}
                {['caja_tesoreria', 'superadmin', 'admin'].some(r => userRoles.includes(r)) && (
                  <NavItem
                    active={currentView === 'finanzas'}
                    onClick={() => onNavigate('finanzas')}
                    icon={CreditCard}
                    label="Finanzas y Pagos"
                  />
                )}
                {['superadmin', 'admin'].some(r => userRoles.includes(r)) && (
                  <NavItem
                    active={currentView === 'admin'}
                    onClick={() => onNavigate('admin')}
                    icon={Settings}
                    label="Administración"
                  />
                )}
              </div>

              <div className="mt-auto pt-6 border-t border-slate-200/50">
                <span className="text-xs font-bold text-slate-500 block mb-3 uppercase tracking-wider">Tus Capacidades</span>
                <div className="flex flex-wrap gap-1.5">
                  {permissions.map(permission => (
                    <span
                      key={permission}
                      className="badge-blue px-2 py-0.5 text-[10px] font-semibold"
                    >
                      {permission}
                    </span>
                  ))}
                  {permissions.length === 0 && (
                    <span className="text-xs text-slate-400">Sin capacidades asignadas</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Contenido dinámico */}
          <div className="w-full lg:w-3/4">
            {children}
          </div>
        </div>
      </div>

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  );
}

function NavItem({ active, onClick, icon: IconProp, label }) {
  const Icon = IconProp;
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center w-full text-left px-4 py-3 rounded-xl transition-all duration-200 group ${
        active
          ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-md shadow-primary/25 font-semibold'
          : 'bg-white/40 border border-transparent text-navy hover:bg-primary/5 hover:text-primary'
      }`}
    >
      <span className={`mr-3 flex-shrink-0 ${active ? 'text-white' : 'text-primary/60 group-hover:text-primary'}`}>
        <Icon size={18} />
      </span>
      <span className="text-sm">{label}</span>
    </button>
  );
}