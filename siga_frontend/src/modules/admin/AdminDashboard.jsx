import { useState, useEffect } from 'react';
import { apiClient } from '../../core/api/client';
import { useAuth } from '../../core/auth/useAuth';

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
      <div className="container-fluid py-4">
        <div className="glass-card p-5 text-center">
          <div className="fs-1 mb-3">🔒</div>
          <h4 className="fw-bold">Acceso Restringido</h4>
          <p className="text-secondary">No tienes permisos de administrador para acceder a esta sección.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container-fluid py-4">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="mt-2 text-secondary">Cargando panel de administración...</p>
        </div>
      </div>
    );
  }

  const renderOverview = () => (
    <div>
      <div className="row mb-4">
        <div className="col-md-3 mb-3">
          <div className="glass-card p-4 text-center">
            <div className="text-secondary small mb-1">Estado del Core</div>
            <h1 className={systemStatus?.status === 'healthy' ? 'text-success mb-0' : 'text-warning mb-0'}>
              {systemStatus?.status || 'Desconocido'}
            </h1>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="glass-card p-4 text-center">
            <div className="text-secondary small mb-1">Módulos Registrados</div>
            <h1 className="gradient-text mb-0">{systemStatus?.modules?.total || 0}</h1>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="glass-card p-4 text-center">
            <div className="text-secondary small mb-1">Módulos Saludables</div>
            <h1 className="text-success mb-0">{systemStatus?.modules?.healthy || 0}</h1>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="glass-card p-4 text-center">
            <div className="text-secondary small mb-1">Entorno</div>
            <h1 className="text-info mb-0">{systemStatus?.environment || 'N/A'}</h1>
          </div>
        </div>
      </div>

      <div className="glass-card p-4 mb-4">
        <h5 className="fw-bold mb-3">Información del Sistema</h5>
        <div className="table-responsive">
          <table className="table table-sm">
            <tbody>
              <tr><td className="text-secondary">Versión del Core</td><td className="fw-bold">{systemStatus?.core_version || 'N/A'}</td></tr>
              <tr><td className="text-secondary">Gateway</td><td className="fw-bold">{systemStatus?.gateway || 'N/A'}</td></tr>
              <tr><td className="text-secondary">Usuario Actual</td><td className="fw-bold">{user?.email} {user?.is_superuser && <span className="badge bg-warning text-dark ms-2">Superadmin</span>}</td></tr>
              <tr><td className="text-secondary">Rol</td><td className="fw-bold text-capitalize">{user?.role || 'N/A'}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderModules = () => (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="fw-bold mb-0">Módulos del Ecosistema</h5>
        <span className="text-secondary small">{modules.length} módulos registrados</span>
      </div>
      {modules.length === 0 ? (
        <div className="glass-card p-5 text-center">
          <p className="text-secondary">No hay módulos registrados en el Core.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead className="text-secondary small text-uppercase">
              <tr>
                <th>Módulo</th>
                <th>Versión</th>
                <th>Estado</th>
                <th>Endpoint</th>
                <th>Cumplimiento</th>
              </tr>
            </thead>
            <tbody>
              {modules.map(mod => (
                <tr key={mod.name}>
                  <td><span className="fw-bold">{mod.name}</span></td>
                  <td>v{mod.version}</td>
                  <td>
                    <span className={`status-badge ${mod.status === 'healthy' ? 'badge-healthy' : mod.status === 'degraded' ? 'badge-warning' : 'badge-danger'}`}>
                      {mod.status}
                    </span>
                  </td>
                  <td className="small text-secondary">{mod.endpoints?.http || 'N/A'}</td>
                  <td>
                    {mod.compliance ? (
                      <span className={`status-badge ${mod.compliance.valid ? 'badge-healthy' : 'badge-danger'}`}>
                        {mod.compliance.valid ? 'Válido' : 'Inválido'}
                      </span>
                    ) : (
                      <span className="text-secondary">No verificado</span>
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
    <div className="glass-card p-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="fw-bold mb-0">Gestión de Usuarios</h5>
        <button className="btn-premium btn-sm" disabled>+ Nuevo Usuario</button>
      </div>
      <div className="alert alert-info border-0 py-3">
        <div className="d-flex align-items-center">
          <span className="fs-5 me-3">🚧</span>
          <div>
            <strong className="small">API de administración de usuarios en desarrollo</strong>
            <p className="mb-0 small text-secondary">Los endpoints CRUD de usuarios, roles y permisos estarán disponibles en la Fase 2 del roadmap.</p>
          </div>
        </div>
      </div>
      <div className="text-center py-4">
        <p className="text-secondary mb-0">Por ahora, los usuarios se crean vía <code>POST /auth/register</code> y los roles se asignan mediante seeders.</p>
      </div>
    </div>
  );

  const renderConfig = () => (
    <div className="glass-card p-4">
      <h5 className="fw-bold mb-3">Configuración del Sistema</h5>
      <div className="alert alert-warning border-0 py-3">
        <div className="d-flex align-items-center">
          <span className="fs-5 me-3">🚧</span>
          <div>
            <strong className="small">Panel de configuración en construcción</strong>
            <p className="mb-0 small text-secondary">Aquí se gestionarán variables de entorno, parámetros del sistema y configuración de módulos.</p>
          </div>
        </div>
      </div>
      <div className="row g-3">
        <div className="col-md-6">
          <div className="p-3 rounded bg-light bg-opacity-50 border">
            <div className="text-secondary small">Entorno</div>
            <div className="fw-bold">{systemStatus?.environment || 'N/A'}</div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="p-3 rounded bg-light bg-opacity-50 border">
            <div className="text-secondary small">Versión Core</div>
            <div className="fw-bold">{systemStatus?.core_version || 'N/A'}</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container-fluid animate__animated animate__fadeIn">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-0">Panel de <span className="gradient-text">Administración</span></h3>
          <p className="text-secondary">Gestión del sistema, módulos, usuarios y configuración</p>
        </div>
        <div className="d-flex align-items-center">
          <span className="status-badge badge-healthy me-2">
            {systemStatus?.environment || 'N/A'}
          </span>
          <span className="text-secondary small">
            v{systemStatus?.core_version || 'N/A'}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4">
        <div className="nav nav-tabs border-0 gap-2">
          {[
            { key: 'overview', label: '📊 Resumen', icon: '' },
            { key: 'modules', label: '📦 Módulos', icon: '' },
            { key: 'users', label: '👥 Usuarios', icon: '' },
            { key: 'config', label: '⚙️ Configuración', icon: '' },
          ].map(tab => (
            <button
              key={tab.key}
              className={`nav-link glass-card border-0 ${activeTab === tab.key ? 'active fw-bold' : 'text-secondary'}`}
              onClick={() => setActiveTab(tab.key)}
              style={{ cursor: 'pointer' }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="animate__animated animate__fadeIn">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'modules' && renderModules()}
        {activeTab === 'users' && renderUsers()}
        {activeTab === 'config' && renderConfig()}
      </div>
    </div>
  );
}