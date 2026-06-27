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
        apiClient.request('/api/mod-usuarios/api/v1/usuarios'),
        apiClient.request('/api/mod-usuarios/api/v1/roles')
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
        await apiClient.request(`/api/mod-usuarios/api/v1/usuarios/${editingId}`, { method: 'PUT', body: JSON.stringify(updateData) });
      } else {
        await apiClient.request('/api/mod-usuarios/api/v1/usuarios', { method: 'POST', body: JSON.stringify(formData) });
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
        await apiClient.request(`/api/mod-usuarios/api/v1/usuarios/${id}`, { method: 'DELETE' });
        loadData();
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="w-full py-16 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white/40">
        <div>
          <h5 className="text-xl font-bold text-slate-800">Gestión de Usuarios</h5>
          <p className="text-sm text-slate-500 mt-1">Control de acceso basado en roles (RBAC)</p>
        </div>
        <button 
          className="btn-primary flex items-center shadow-md shadow-primary/30"
          onClick={openNewUserModal}
        >
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Usuario
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
              <th className="px-6 py-4 font-semibold">Usuario</th>
              <th className="px-6 py-4 font-semibold">Roles</th>
              <th className="px-6 py-4 font-semibold">Estado</th>
              <th className="px-6 py-4 font-semibold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white font-bold shadow-sm">
                      {user.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="ml-4">
                      <div className="font-bold text-slate-800 flex items-center">
                        {user.full_name}
                        {user.is_superuser && (
                          <span className="ml-2 bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">
                            Superadmin
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-500">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {user.roles.map(r => (
                      <span key={r.id} className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-semibold px-2 py-0.5 rounded-full">
                        {r.name}
                      </span>
                    ))}
                    {user.roles.length === 0 && <span className="text-slate-400 text-sm italic">Sin roles</span>}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {user.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <button 
                      onClick={() => openEditUserModal(user)}
                      className="text-slate-400 hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-primary/10"
                      title="Editar"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    {user.is_active && (
                      <button 
                        onClick={() => handleDelete(user.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50"
                        title="Desactivar"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-bold text-slate-800">
                {editingId ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="label text-slate-700">Nombre Completo</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    name="full_name" 
                    value={formData.full_name} 
                    onChange={handleInputChange} 
                    required 
                    placeholder="Ej. Juan Pérez"
                  />
                </div>
                <div>
                  <label className="label text-slate-700">Correo Electrónico</label>
                  <input 
                    type="email" 
                    className="input-field" 
                    name="email" 
                    value={formData.email} 
                    onChange={handleInputChange} 
                    required 
                    placeholder="ejemplo@siga.edu"
                  />
                </div>
                {!editingId && (
                  <div>
                    <label className="label text-slate-700">Contraseña</label>
                    <input 
                      type="password" 
                      className="input-field" 
                      name="password" 
                      value={formData.password} 
                      onChange={handleInputChange} 
                      required 
                      minLength="6" 
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                )}
                
                <div className="flex flex-col space-y-3 pt-2">
                  <label className="flex items-center space-x-3 cursor-pointer group">
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        name="is_superuser" 
                        className="peer sr-only"
                        checked={formData.is_superuser} 
                        onChange={handleInputChange} 
                      />
                      <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                    </div>
                    <span className="text-sm font-medium text-slate-700 group-hover:text-amber-600 transition-colors">Privilegios de Superusuario</span>
                  </label>
                  
                  <label className="flex items-center space-x-3 cursor-pointer group">
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        name="is_active" 
                        className="peer sr-only"
                        checked={formData.is_active} 
                        onChange={handleInputChange} 
                      />
                      <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                    </div>
                    <span className="text-sm font-medium text-slate-700 group-hover:text-green-600 transition-colors">Usuario Activo en el Sistema</span>
                  </label>
                </div>
                
                <div className="pt-4 border-t border-slate-100">
                  <label className="label text-slate-700 mb-3">Roles Asignados</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {roles.map(role => (
                      <label key={role.id} className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                        formData.role_ids.includes(role.id) ? 'bg-primary/5 border-primary/30 ring-1 ring-primary/20' : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}>
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 text-primary bg-slate-100 border-slate-300 rounded focus:ring-primary focus:ring-2"
                          checked={formData.role_ids.includes(role.id)}
                          onChange={() => handleRoleChange(role.id)}
                        />
                        <span className="ml-2 text-sm font-medium text-slate-700">{role.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t border-slate-100 mt-6">
                  <button 
                    type="button" 
                    className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                    onClick={() => setShowModal(false)}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="btn-primary"
                  >
                    {editingId ? 'Guardar Cambios' : 'Crear Usuario'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
