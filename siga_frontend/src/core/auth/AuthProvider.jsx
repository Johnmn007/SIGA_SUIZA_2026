import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { AuthContext } from './AuthContext';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState([]);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const userData = await apiClient.getCurrentUser();
          setUser(userData);
          setPermissions(userData.permissions || []);
        } catch {
          apiClient.clearToken();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const result = await apiClient.login(email, password);
      if (result.access_token) {
        apiClient.setToken(result.access_token);
        setUser(result.user);
        setPermissions(result.user.permissions || []);
        return { success: true, user: result.user };
      }
      return { success: false, error: 'Credenciales inválidas' };
    } catch {
      return { success: false, error: 'Error de conexión' };
    }
  };

  const logout = () => {
    apiClient.clearToken();
    setUser(null);
    setPermissions([]);
  };

  const hasPermission = (permission) => {
    return permissions.includes(permission);
  };

  const value = {
    user,
    loading,
    permissions,
    login,
    logout,
    hasPermission,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}