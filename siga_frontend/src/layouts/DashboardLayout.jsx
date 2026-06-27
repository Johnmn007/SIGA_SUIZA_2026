import { useAuth } from '../core/auth/useAuth';

export function DashboardLayout({ children, currentView, onNavigate }) {
  const { user, logout, permissions } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Premium Navbar */}
      <nav className="glass-panel rounded-none border-b border-white/40 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex-shrink-0 flex items-center cursor-pointer" onClick={() => onNavigate('dashboard')}>
              <span className="text-2xl font-bold tracking-tight text-slate-800">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-dark">🎓 SIGA</span> Platform
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
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">{user?.role || 'Personal Académico'}</p>
              </div>
              
              <div className="flex flex-col space-y-2 mb-8">
                <NavItem 
                  active={currentView === 'dashboard'} 
                  onClick={() => onNavigate('dashboard')} 
                  icon="🏠" 
                  label="Dashboard General" 
                />
                <NavItem 
                  active={currentView === 'academic'} 
                  onClick={() => onNavigate('academic')} 
                  icon="📚" 
                  label="Gestión Académica" 
                />
                <NavItem 
                  active={currentView === 'students'} 
                  onClick={() => onNavigate('students')} 
                  icon="👤" 
                  label="Maestro de Estudiantes" 
                />
                <NavItem 
                  active={currentView === 'enrollment'} 
                  onClick={() => onNavigate('enrollment')} 
                  icon="📝" 
                  label="Proceso de Matrícula" 
                />
                <NavItem 
                  active={false} 
                  icon="💳" 
                  label="Finanzas y Pagos" 
                  disabled
                />
                <NavItem 
                  active={currentView === 'admin'} 
                  onClick={() => onNavigate('admin')} 
                  icon="⚙️" 
                  label="Administración" 
                />
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