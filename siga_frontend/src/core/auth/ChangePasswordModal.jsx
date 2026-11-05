import { useState } from 'react';
import { apiClient } from '../api/client';
import { useAuth } from './useAuth';
import { KeyRound, X, CheckCircle2, Lock, AlertCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export function ChangePasswordModal({ isOpen, onClose }) {
  const { logout } = useAuth();
  const [formData, setFormData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    if (!loading) {
      setFormData({ old_password: '', new_password: '', confirm_password: '' });
      setError(null);
      setSuccess(false);
      onClose();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (formData.new_password.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres.");
      setLoading(false);
      return;
    }

    if (formData.new_password !== formData.confirm_password) {
      setError("Las contraseñas nuevas no coinciden.");
      setLoading(false);
      return;
    }

    if (formData.old_password === formData.new_password) {
      setError("La nueva contraseña debe ser diferente a la contraseña actual.");
      setLoading(false);
      return;
    }

    try {
      await apiClient.request('/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({
          old_password: formData.old_password,
          new_password: formData.new_password
        })
      });

      setSuccess(true);
      setTimeout(() => {
        handleClose();
        logout(); // Cerrar sesión para que ingrese con su nueva clave
      }, 2500);
    } catch (err) {
      setError(err.message || "Error al actualizar la contraseña");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up border border-slate-100">
        {/* Cabecera */}
        <div className="bg-gradient-to-r from-primary to-primary-dark px-6 py-5 flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold">Cambiar Contraseña</h3>
              <p className="text-xs text-white/80">Configuración de seguridad de tu cuenta</p>
            </div>
          </div>
          {!success && (
            <button 
              onClick={handleClose} 
              className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-all cursor-pointer"
              aria-label="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        
        {/* Cuerpo */}
        {success ? (
          <div className="p-8 text-center animate-fade-in">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-slate-800 mb-1">¡Contraseña Actualizada!</h4>
            <p className="text-sm text-slate-600 mb-6">
              Tu contraseña institucional ha sido modificada con éxito. Por seguridad, deberás iniciar sesión con tu nueva clave.
            </p>
            <button
              onClick={() => { handleClose(); logout(); }}
              className="btn-primary w-full py-2.5 text-sm font-bold"
            >
              Iniciar sesión ahora
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 text-red-700 text-xs font-semibold p-3.5 rounded-xl border border-red-100 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Contraseña Actual */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Contraseña Actual
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock size={15} />
                </div>
                <input 
                  type={showOld ? "text" : "password"} 
                  required 
                  placeholder="Ingresa tu clave actual"
                  className="input-field w-full pl-10 pr-10 py-2.5 text-sm"
                  value={formData.old_password}
                  onChange={e => setFormData({...formData, old_password: e.target.value})}
                />
                <button
                  type="button"
                  onClick={() => setShowOld(!showOld)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Nueva Contraseña */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nueva Contraseña <span className="text-slate-400 font-normal">(mínimo 6 caracteres)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <ShieldCheck size={15} />
                </div>
                <input 
                  type={showNew ? "text" : "password"} 
                  required 
                  placeholder="Mínimo 6 caracteres"
                  className="input-field w-full pl-10 pr-10 py-2.5 text-sm"
                  value={formData.new_password}
                  onChange={e => setFormData({...formData, new_password: e.target.value})}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirmar Nueva Contraseña */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Confirmar Nueva Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <ShieldCheck size={15} />
                </div>
                <input 
                  type={showConfirm ? "text" : "password"} 
                  required 
                  placeholder="Repite la nueva clave"
                  className="input-field w-full pl-10 pr-10 py-2.5 text-sm"
                  value={formData.confirm_password}
                  onChange={e => setFormData({...formData, confirm_password: e.target.value})}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button 
                type="submit" 
                disabled={loading}
                className="btn-primary w-full py-3 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Guardando cambios...</span>
                  </>
                ) : (
                  <>
                    <KeyRound size={16} />
                    <span>Actualizar Contraseña</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
