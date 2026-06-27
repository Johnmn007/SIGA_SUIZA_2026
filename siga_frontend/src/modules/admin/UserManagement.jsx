import { useState, useEffect } from 'react';
import { apiClient } from '../../core/api/client';

export function UserManagement() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    password: '',
    is_active: true,
    is_superuser: false,
    role_ids: []
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        apiClient.get('/api/mod-usuarios/usuarios'),
        apiClient.get('/api/mod-usuarios/roles')
      ]);
      setUsers(usersRes);
      setRoles(rolesRes);
    } catch (error) {
      console.error('Error loading users/roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleRoleChange = (roleId) => {
    setFormData(prev => {
      const role_ids = prev.role_ids.includes(roleId)
        ? prev.role_ids.filter(id => id !== roleId)
        : [...prev.role_ids, roleId];
      return { ...prev, role_ids };
    });
  };

  const openNewUserModal = () => {
    setFormData({ email: '', full_name: '', password: '', is_active: true, is_superuser: false, role_ids: [] });
    setEditingId(null);
    setShowModal(true);
  };

  const openEditUserModal = (user) => {
    setFormData({
      email: user.email,
      full_name: user.full_name,
      is_active: user.is_active,
      is_superuser: user.is_superuser,
      role_ids: user.roles.map(r => r.id),
      password: '' // empty so it won't be updated unless provided (not implemented for update yet)
    });
    setEditingId(user.id);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        const updateData = { ...formData };
        delete updateData.password; // backend update doesn't handle password directly yet
        await apiClient.put(`/api/mod-usuarios/usuarios/${editingId}`, updateData);
      } else {
        await apiClient.post('/api/mod-usuarios/usuarios', formData);
      }
      setShowModal(false);
      loadData();
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Error guardando usuario. Verifica la consola para más detalles.');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('¿Estás seguro de desactivar este usuario?')) {
      try {
        await apiClient.delete(`/api/mod-usuarios/usuarios/${id}`);
        loadData();
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  if (loading) {
    return <div className="text-center py-4"><div className="spinner-border text-primary"></div></div>;
  }

  return (
    <div className="glass-card p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h5 className="fw-bold mb-0">Gestión de Usuarios (RBAC)</h5>
        <button className="btn-premium btn-sm" onClick={openNewUserModal}>+ Nuevo Usuario</button>
      </div>

      <div className="table-responsive">
        <table className="table table-hover align-middle">
          <thead className="text-secondary small text-uppercase">
            <tr>
              <th>Nombre Completo</th>
              <th>Email</th>
              <th>Roles</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>
                  <span className="fw-bold d-block">{user.full_name}</span>
                  {user.is_superuser && <span className="badge bg-warning text-dark me-1">Superuser</span>}
                </td>
                <td className="text-secondary">{user.email}</td>
                <td>
                  {user.roles.map(r => (
                    <span key={r.id} className="badge bg-info text-dark me-1 mb-1">{r.name}</span>
                  ))}
                  {user.roles.length === 0 && <span className="text-muted small">Sin roles</span>}
                </td>
                <td>
                  <span className={`status-badge ${user.is_active ? 'badge-healthy' : 'badge-danger'}`}>
                    {user.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td>
                  <button className="btn btn-sm btn-outline-primary me-2" onClick={() => openEditUserModal(user)}>Editar</button>
                  {user.is_active && (
                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(user.id)}>Desactivar</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content glass-card">
              <div className="modal-header border-bottom-0">
                <h5 className="modal-title fw-bold">{editingId ? 'Editar Usuario' : 'Nuevo Usuario'}</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
              </div>
              <div className="modal-body">
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label text-secondary small">Nombre Completo</label>
                    <input type="text" className="form-control bg-dark text-white border-secondary" name="full_name" value={formData.full_name} onChange={handleInputChange} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-secondary small">Email</label>
                    <input type="email" className="form-control bg-dark text-white border-secondary" name="email" value={formData.email} onChange={handleInputChange} required />
                  </div>
                  {!editingId && (
                    <div className="mb-3">
                      <label className="form-label text-secondary small">Contraseña</label>
                      <input type="password" className="form-control bg-dark text-white border-secondary" name="password" value={formData.password} onChange={handleInputChange} required minLength="6" />
                    </div>
                  )}
                  <div className="mb-3 form-check form-switch">
                    <input className="form-check-input" type="checkbox" role="switch" name="is_superuser" checked={formData.is_superuser} onChange={handleInputChange} />
                    <label className="form-check-label text-secondary small">Es Superusuario</label>
                  </div>
                  <div className="mb-3 form-check form-switch">
                    <input className="form-check-input" type="checkbox" role="switch" name="is_active" checked={formData.is_active} onChange={handleInputChange} />
                    <label className="form-check-label text-secondary small">Usuario Activo</label>
                  </div>
                  
                  <div className="mb-4">
                    <label className="form-label text-secondary small">Roles Asignados</label>
                    <div className="row g-2">
                      {roles.map(role => (
                        <div key={role.id} className="col-6">
                          <div className="form-check">
                            <input 
                              className="form-check-input" 
                              type="checkbox" 
                              checked={formData.role_ids.includes(role.id)}
                              onChange={() => handleRoleChange(role.id)}
                              id={`role-${role.id}`}
                            />
                            <label className="form-check-label small" htmlFor={`role-${role.id}`}>
                              {role.name}
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="d-flex justify-content-end gap-2 mt-4">
                    <button type="button" className="btn btn-outline-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                    <button type="submit" className="btn-premium">Guardar</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
