import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../core/auth/useAuth';
import { wsClient } from '../core/api/client';
import { SIGAAIAssistant } from '../core/ai/SIGAAIAssistant';
import {
  LayoutDashboard, GraduationCap, Users, ClipboardList, ClipboardCheck,
  LineChart, Eye, ScrollText, BookOpen, CreditCard, Settings, Bell, LogOut,
  KeyRound, User, ChevronDown, ShieldCheck,
} from 'lucide-react';

export function DashboardLayout({ children, currentView, onNavigate }) {
  const { user, logout, permissions, openPasswordModal } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [wsStatus, setWsStatus] = useState(wsClient.connected ? 'connected' : 'disconnected');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const sidebarRef = useRef(null);

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
    const handleClickOutside = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setIsProfileMenuOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsProfileMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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

  useEffect(() => {
    // Expone la altura natural del sidebar (solo en la vista de estudiantes)
    // para que el contenedor de la tabla llegue justo hasta su borde.
    const mql = window.matchMedia('(min-width: 1024px)');
    const apply = () => {
      const el = sidebarRef.current;
      if (!el || !mql.matches || currentView !== 'students') {
        document.documentElement.style.removeProperty('--sidebar-height');
        return;
      }
      document.documentElement.style.setProperty('--sidebar-height', `${el.offsetHeight}px`);
    };
    apply();
    const ro = new ResizeObserver(apply);
    if (sidebarRef.current) ro.observe(sidebarRef.current);
    mql.addEventListener('change', apply);
    return () => {
      ro.disconnect();
      mql.removeEventListener('change', apply);
    };
  }, [currentView]);

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

            <div className="flex items-center gap-3">
              {/* Botón directo de cambio de contraseña */}
              <button
                type="button"
                onClick={openPasswordModal}
                className="hidden md:inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white/70 hover:bg-white text-navy hover:text-primary text-xs font-semibold shadow-xs transition-all cursor-pointer"
                title="Configuración de seguridad y cambio de clave"
              >
                <KeyRound size={15} className="text-primary" />
                <span>Cambiar Contraseña</span>
              </button>

              {/* Menú de Configuración y Perfil de Usuario */}
              <div className="relative" ref={profileMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsProfileMenuOpen(prev => !prev)}
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded-2xl border transition-all cursor-pointer ${
                    isProfileMenuOpen 
                      ? 'bg-white border-primary/40 shadow-md ring-2 ring-primary/10' 
                      : 'bg-white/70 hover:bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                  }`}
                  aria-expanded={isProfileMenuOpen}
                  aria-haspopup="true"
                >
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    {user?.full_name ? user.full_name.slice(0, 2).toUpperCase() : <User size={16} />}
                  </div>
                  <div className="hidden sm:block text-left pr-1">
                    <div className="text-xs font-bold text-slate-text truncate max-w-[130px] leading-tight">
                      {user?.full_name || 'Usuario'}
                    </div>
                    <div className="text-[10px] font-semibold text-primary-dark uppercase tracking-wider leading-none mt-0.5">
                      {user?.is_superuser ? 'Superadmin' : (userRoles[0] || 'Usuario')}
                    </div>
                  </div>
                  <ChevronDown 
                    size={14} 
                    className={`text-slate-400 transition-transform duration-200 ${isProfileMenuOpen ? 'rotate-180 text-primary' : ''}`} 
                  />
                </button>

                {/* Dropdown de Configuración y Perfil */}
                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white border border-slate-100 shadow-2xl z-50 overflow-hidden animate-slide-up">
                    {/* Encabezado perfil */}
                    <div className="p-4 bg-gradient-to-br from-slate-50 to-primary-soft/30 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center font-bold text-sm shadow-md shadow-primary/20">
                          {user?.full_name ? user.full_name.slice(0, 2).toUpperCase() : <User size={20} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-slate-800 truncate">{user?.full_name}</h4>
                          <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                          <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary-dark font-extrabold text-[9px] uppercase tracking-wider">
                            {user?.is_superuser ? 'Superadmin' : (userRoles.join(' / '))}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Opciones de configuración */}
                    <div className="p-2 space-y-1">
                      <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Seguridad y Cuenta
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          openPasswordModal();
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-semibold text-slate-700 hover:text-primary hover:bg-primary-soft/40 transition-colors cursor-pointer group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                          <KeyRound size={14} />
                        </div>
                        <div className="flex-1">
                          <div className="font-bold">Cambiar Contraseña</div>
                          <div className="text-[10px] text-slate-400 font-normal">Actualiza tu clave institucional</div>
                        </div>
                      </button>

                      <div className="my-1 border-t border-slate-100"></div>

                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-red-100 text-red-600 flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-colors">
                          <LogOut size={14} />
                        </div>
                        <div className="flex-1">
                          <div className="font-bold">Cerrar Sesión</div>
                          <div className="text-[10px] text-red-400 font-normal">Salir de forma segura de SIGA</div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Sidebar */}
          <div ref={sidebarRef} className="w-full lg:w-1/4 flex-shrink-0 lg:self-start">
            <div className="glass-card p-6 flex flex-col">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary text-white shadow-lg shadow-primary/25 mb-3">
                  <User size={32} />
                </div>
                <h5 className="text-lg font-bold text-slate-text">{user?.full_name}</h5>
                <p className="text-xs font-semibold text-primary-dark uppercase tracking-wider mt-1">
                  {user?.is_superuser ? 'Superadmin' : (userRoles.join(' / '))}
                </p>
                <button
                  type="button"
                  onClick={openPasswordModal}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-primary/10 text-slate-700 hover:text-primary text-xs font-semibold border border-slate-200 transition-all cursor-pointer w-full justify-center shadow-xs"
                  title="Configurar contraseña"
                >
                  <KeyRound size={13} className="text-primary" />
                  <span>Configurar Contraseña</span>
                </button>
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
                    label="Boletín de Notas"
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

                {/* Menú de Configuración para Todos los Roles */}
                <div className="pt-3 mt-3 border-t border-slate-200/60">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 px-3">
                    Configuración
                  </span>
                  <NavItem
                    active={false}
                    onClick={openPasswordModal}
                    icon={KeyRound}
                    label="Cambiar Contraseña"
                  />
                </div>
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
          <div className={`w-full lg:w-3/4 ${currentView === 'students' ? 'lg:h-[var(--sidebar-height)] lg:min-h-0 lg:flex lg:flex-col' : ''}`}>
            {children}
          </div>
        </div>
      </div>

      {/* Asistente Virtual Inteligente Institucional SIGA */}
      <SIGAAIAssistant />
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