import { useState } from 'react';
import { API_BASE, apiClient } from '../api/client';
import { useAuth } from './useAuth';

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
        <div className="bg-slate-800 px-6 py-5 flex justify-between items-center relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-lg font-bold text-white flex items-center">
              <svg className="w-5 h-5 mr-2 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              Cambiar Contraseña
            </h3>
          </div>
          {!success && (
            <button onClick={onClose} className="relative z-10 bg-white/10 hover:bg-white/20 p-2 rounded-full text-white transition-all">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>
        
        {success ? (
          <div className="p-8 text-center animate-fade-in">
            <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
            </div>
            <h4 className="text-lg font-bold text-slate-800 mb-2">Contraseña Actualizada</h4>
            <p className="text-sm text-slate-600 mb-6">Tu contraseña se ha cambiado exitosamente. Por seguridad, deberás iniciar sesión nuevamente.</p>
            <div className="text-xs text-slate-400">Redirigiendo...</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6">
            {error && (
              <div className="mb-5 bg-red-50 text-red-600 text-xs font-medium p-3 rounded-xl border border-red-100 flex items-start">
                <svg className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Contraseña Actual</label>
                <input 
                  type="password" 
                  required 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 outline-none transition-all"
                  value={formData.old_password}
                  onChange={e => setFormData({...formData, old_password: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Nueva Contraseña</label>
                <input 
                  type="password" 
                  required 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 outline-none transition-all"
                  value={formData.new_password}
                  onChange={e => setFormData({...formData, new_password: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Confirmar Nueva Contraseña</label>
                <input 
                  type="password" 
                  required 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 outline-none transition-all"
                  value={formData.confirm_password}
                  onChange={e => setFormData({...formData, confirm_password: e.target.value})}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full mt-8 py-3 bg-slate-800 text-white rounded-xl text-sm font-bold shadow-lg shadow-slate-200 hover:bg-slate-900 transition-all disabled:opacity-70 flex items-center justify-center"
            >
              {loading ? 'Procesando...' : 'Cambiar Contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
