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
import { useEffect, useState } from 'react';

function AppContent() {
  const { isAuthenticated, loading, user } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');

  useEffect(() => {
    if (user) {
      const getUserRole = () => {
        if (user?.is_superuser) return 'superadmin';
        if (user?.role) return user.role;
        if (!user?.roles || user.roles.length === 0) return 'invitado';
        const r = user.roles[0];
        return typeof r === 'string' ? r : (r.name || r.nombre || 'invitado');
      };
      const userRole = getUserRole();
      let defaultView = 'dashboard';
      
      if (!['superadmin', 'admin'].includes(userRole)) {
        if (userRole === 'coordinador_programa') defaultView = 'coordinator_academic';
        else if (userRole === 'docente') defaultView = 'evaluation';
        else if (userRole === 'estudiante') defaultView = 'report_card';
        else if (userRole === 'secretaria_academica') defaultView = 'students';
        else if (userRole === 'secretaria_programa') defaultView = 'enrollment';
        else if (userRole === 'tesoreria') defaultView = 'finanzas';
        else if (userRole === 'director') defaultView = 'academic';
      }
      
      setCurrentView(defaultView);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-slate-500 font-bold tracking-widest text-sm">SIGA PLATFORM</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  const renderView = () => {
    switch(currentView) {
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
    <DashboardLayout currentView={currentView} onNavigate={setCurrentView}>
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