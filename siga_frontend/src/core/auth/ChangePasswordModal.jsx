import { useState } from 'react';
import { API_BASE, apiClient } from '../api/client';
import { useAuth } from './useAuth';
import { KeyRound, X, CheckCircle2, Lock, AlertCircle } from 'lucide-react';

export function ChangePasswordModal({ isOpen, onClose }) {
  const { logout } = useAuth();
  const [formData, setFormData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (formData.new_password !== formData.confirm_password) {
      setError("Las contraseñas nuevas no coinciden");
      setLoading(false);
      return;
    }

    if (formData.new_password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      setLoading(false);
      return;
    }

    try {
      const resp = await fetch(`${API_BASE}/auth/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiClient.token}`
        },
        body: JSON.stringify({
          old_password: formData.old_password,
          new_password: formData.new_password
        })
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.detail || "Error al cambiar la contraseña");
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
        logout(); // Force login again
      }, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up">
        <div className="bg-gradient-to-r from-primary to-primary-dark px-6 py-5 flex justify-between items-center relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-lg font-bold text-white flex items-center">
              <KeyRound className="w-5 h-5 mr-2 opacity-80" />
              Cambiar Contraseña
            </h3>
          </div>
          {!success && (
            <button onClick={onClose} className="relative z-10 bg-white/10 hover:bg-white/20 p-2 rounded-full text-white transition-all">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        
        {success ? (
          <div className="p-8 text-center animate-fade-in">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-slate-text mb-2">Contraseña Actualizada</h4>
            <p className="text-sm text-slate-600 mb-6">Tu contraseña se ha cambiado exitosamente. Por seguridad, deberás iniciar sesión nuevamente.</p>
            <div className="text-xs text-slate-400">Redirigiendo...</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6">
            {error && (
              <div className="mb-5 bg-red-50 text-red-600 text-xs font-medium p-3 rounded-xl border border-red-100 flex items-start">
                <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center">
                  <Lock className="w-3.5 h-3.5 mr-1.5 text-primary" /> Contraseña Actual
                </label>
                <input 
                  type="password" 
                  required 
                  className="input-field w-full"
                  value={formData.old_password}
                  onChange={e => setFormData({...formData, old_password: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center">
                  <Lock className="w-3.5 h-3.5 mr-1.5 text-primary" /> Nueva Contraseña
                </label>
                <input 
                  type="password" 
                  required 
                  className="input-field w-full"
                  value={formData.new_password}
                  onChange={e => setFormData({...formData, new_password: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center">
                  <Lock className="w-3.5 h-3.5 mr-1.5 text-primary" /> Confirmar Nueva Contraseña
                </label>
                <input 
                  type="password" 
                  required 
                  className="input-field w-full"
                  value={formData.confirm_password}
                  onChange={e => setFormData({...formData, confirm_password: e.target.value})}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="btn-primary w-full mt-8 py-3 flex items-center justify-center"
            >
              {loading ? 'Procesando...' : 'Cambiar Contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
