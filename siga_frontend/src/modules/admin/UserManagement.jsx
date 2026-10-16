import { useState, useEffect } from 'react';
import { apiClient } from '../../core/api/client';
import { Plus, Pencil, X, UserX, Users, ShieldCheck } from 'lucide-react';

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
        apiClient.request('/api/mod-usuarios/usuarios'),
        apiClient.request('/api/mod-usuarios/roles')
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
        await apiClient.request(`/api/mod-usuarios/usuarios/${editingId}`, { method: 'PUT', body: JSON.stringify(updateData) });
      } else {
        await apiClient.request('/api/mod-usuarios/usuarios', { method: 'POST', body: JSON.stringify(formData) });
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
        await apiClient.request(`/api/mod-usuarios/usuarios/${id}`, { method: 'DELETE' });
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
          <h5 className="text-xl font-bold text-slate-text">Gestión de Usuarios</h5>
          <p className="text-sm text-slate-500 mt-1">Control de acceso basado en roles (RBAC)</p>
        </div>
        <button 
          className="btn-primary flex items-center shadow-md shadow-primary/30"
          onClick={openNewUserModal}
        >
          <Plus className="w-5 h-5 mr-2" />
          Nuevo Usuario
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="data-table w-full text-left border-collapse">
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
              <tr key={user.id} className="hover:bg-primary-soft/40 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white font-bold shadow-sm">
                      {user.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="ml-4">
                      <div className="font-bold text-slate-text flex items-center">
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
                      <span key={r.id} className="bg-primary-soft text-primary border border-primary/20 text-xs font-semibold px-2 py-0.5 rounded-full">
                        {r.name}
                      </span>
                    ))}
                    {user.roles.length === 0 && <span className="text-slate-400 text-sm italic">Sin roles</span>}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`badge ${user.is_active ? 'badge-green' : 'badge-red'}`}>
                    {user.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <button 
                      onClick={() => openEditUserModal(user)}
                      className="text-slate-400 hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-primary-soft"
                      title="Editar"
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                    {user.is_active && (
                      <button 
                        onClick={() => handleDelete(user.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50"
                        title="Desactivar"
                      >
                        <UserX className="w-5 h-5" />
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
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-primary to-primary-dark">
              <h3 className="text-xl font-bold text-white flex items-center">
                <Users className="w-5 h-5 mr-2" />
                {editingId ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
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
                      <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                    </div>
                    <span className="text-sm font-medium text-slate-700 group-hover:text-primary transition-colors">Privilegios de Superusuario</span>
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
                  <label className="label text-slate-700 mb-3 flex items-center">
                    <ShieldCheck className="w-4 h-4 mr-2 text-primary" /> Roles Asignados
                  </label>
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
                    className="btn-ghost"
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
