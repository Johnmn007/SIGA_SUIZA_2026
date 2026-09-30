import { AuthProvider } from './core/auth/AuthProvider';
import { useAuth } from './core/auth/useAuth';
import { LoginForm } from './core/auth/LoginForm';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Dashboard } from './modules/dashboard/Dashboard';
import { AcademicDashboard } from './modules/academic/AcademicDashboard';
import { StudentMaster } from './modules/students/StudentMaster';
import { EnrollmentDashboard } from './modules/enrollment/EnrollmentDashboard';
import { EvaluationDashboard } from './modules/evaluation/EvaluationDashboard';
import { CoordinatorSupervision } from './modules/evaluation/CoordinatorSupervision';
import { StudentReportCard } from './modules/evaluation/StudentReportCard';
import { AdminDashboard } from './modules/admin/AdminDashboard';
import { TramitesDashboard } from './modules/academic/TramitesDashboard';
import { FinancesDashboard } from './modules/finances/FinancesDashboard';
import { CoordinatorAcademic } from './modules/academic/CoordinatorAcademic';
import { useState } from 'react';

function AppContent() {
  const { isAuthenticated, loading, user } = useAuth();
  const [currentView, setCurrentView] = useState(null);
  const [prevUser, setPrevUser] = useState(user);

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

  const getDefaultView = () => {
    if (!user) return 'dashboard';
    const userRoles = getUserRoles();
    if (userRoles.includes('superadmin') || userRoles.includes('admin')) return 'dashboard';
    if (userRoles.includes('coordinador_programa')) return 'coordinator_academic';
    if (userRoles.includes('docente')) return 'evaluation';
    if (userRoles.includes('estudiante')) return 'report_card';
    if (userRoles.includes('secretaria_academica')) return 'students';
    if (userRoles.includes('secretaria_programa')) return 'enrollment';
    if (userRoles.includes('caja_tesoreria')) return 'finanzas';
    if (userRoles.includes('director')) return 'academic';
    return 'dashboard';
  };

  if (user !== prevUser) {
    setPrevUser(user);
    setCurrentView(null);
  }

  const activeView = currentView ?? getDefaultView();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-navy font-bold tracking-widest text-sm">IESTP SUIZA · SIGA</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  const renderView = () => {
    switch(activeView) {
      case 'academic': return <AcademicDashboard />;
      case 'students': return <StudentMaster />;
      case 'enrollment': return <EnrollmentDashboard />;
      case 'evaluation': return <EvaluationDashboard />;
      case 'coordinator_eval': return <CoordinatorSupervision />;
      case 'coordinator_academic': return <CoordinatorAcademic />;
      case 'report_card': return <StudentReportCard />;
      case 'tramites': return <TramitesDashboard />;
      case 'finanzas': return <FinancesDashboard />;
      case 'admin': return <AdminDashboard />;
      default: return <Dashboard onNavigate={setCurrentView} />;
    }
  };

  return (
    <DashboardLayout currentView={activeView} onNavigate={setCurrentView}>
      {renderView()}
    </DashboardLayout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;