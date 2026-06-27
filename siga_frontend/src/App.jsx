import { AuthProvider } from './core/auth/AuthProvider';
import { useAuth } from './core/auth/useAuth';
import { LoginForm } from './core/auth/LoginForm';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Dashboard } from './modules/dashboard/Dashboard';
import { AcademicDashboard } from './modules/academic/AcademicDashboard';
import { StudentMaster } from './modules/students/StudentMaster';
import { EnrollmentDashboard } from './modules/enrollment/EnrollmentDashboard';
import { AdminDashboard } from './modules/admin/AdminDashboard';
import { useState } from 'react';

function AppContent() {
  const { isAuthenticated, loading } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');

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