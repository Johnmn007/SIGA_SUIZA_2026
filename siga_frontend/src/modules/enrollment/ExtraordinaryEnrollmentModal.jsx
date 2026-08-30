import { useState } from 'react';
import { apiClient, API_BASE } from '../../core/api/client';
import { UserPlus, X, IdCard, Hash, AlertCircle, Lightbulb } from 'lucide-react';

export default function ExtraordinaryEnrollmentModal({ isOpen, onClose, onSuccess, currentPrograma, userRole }) {
  const [formData, setFormData] = useState({
    dni: '',
    nombres: '',
    apellidos: '',
    codigo_estudiante: '',
    programa_id: currentPrograma === 'ALL' ? '1' : currentPrograma
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Create the student
      const studentPayload = {
        ...formData,
        programa_id: parseInt(formData.programa_id),
        modalidad_admision: 'MIGRACION_HISTORICA',
        estado_academico: 'estudiante'
      };

      const resp = await fetch(`${API_BASE}/api/mod-gestion-academica/estudiantes/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiClient.token}`
        },
        body: JSON.stringify(studentPayload)
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.detail || "Error al crear el estudiante. Verifique DNI o Código.");
      }

      const newStudent = await resp.json();
      
      // 2. Pass the new student to the parent to start enrollment process
      onSuccess(newStudent);
      onClose();

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-lg overflow-hidden animate-slide-up bg-white/95 shadow-2xl border border-white/20">
        <div className="bg-gradient-to-r from-primary to-secondary px-8 py-6 flex justify-between items-center relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
          <div className="relative z-10">
            <h3 className="text-xl font-black text-white tracking-tight flex items-center">
              <UserPlus className="w-6 h-6 mr-2 opacity-80" />
              Matrícula Extraordinaria
            </h3>
            <p className="text-primary-soft text-sm font-medium mt-1 opacity-90">Registro exprés para migración de estudiantes</p>
          </div>
          <button onClick={onClose} className="relative z-10 bg-white/10 hover:bg-white/20 p-2 rounded-full text-white transition-all active:scale-95" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8">
          {error && (
            <div className="mb-6 bg-red-50 text-red-700 text-sm p-4 rounded-xl border border-red-100 flex items-start shadow-sm">
              <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
              <span className="font-medium leading-relaxed">{error}</span>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-5 mb-5">
            <div className="col-span-1 group">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 group-focus-within:text-primary transition-colors">DNI</label>
              <div className="relative">
                <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-primary" />
                <input 
                  type="text" 
                  required 
                  maxLength={8}
                  placeholder="Ej. 76543210"
                  className="input-field w-full pl-10"
                  value={formData.dni}
                  onChange={e => setFormData({...formData, dni: e.target.value.replace(/\D/g, '')})}
                />
              </div>
            </div>
            <div className="col-span-1 group">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 group-focus-within:text-primary transition-colors">Código</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-primary" />
                <input 
                  type="text" 
                  required 
                  placeholder="Código Inst."
                  className="input-field w-full pl-10"
                  value={formData.codigo_estudiante}
                  onChange={e => setFormData({...formData, codigo_estudiante: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5 mb-6">
            <div className="col-span-2 sm:col-span-1 group">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 group-focus-within:text-primary transition-colors">Nombres</label>
              <input 
                type="text" 
                required 
                placeholder="Nombres completos"
                className="input-field w-full"
                value={formData.nombres}
                onChange={e => setFormData({...formData, nombres: e.target.value})}
              />
            </div>
            <div className="col-span-2 sm:col-span-1 group">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 group-focus-within:text-primary transition-colors">Apellidos</label>
              <input 
                type="text" 
                required 
                placeholder="Apellidos completos"
                className="input-field w-full"
                value={formData.apellidos}
                onChange={e => setFormData({...formData, apellidos: e.target.value})}
              />
            </div>
          </div>

          {['superadmin', 'admin'].includes(userRole) && (
            <div className="mb-8 group">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 group-focus-within:text-primary transition-colors">Programa de Estudio</label>
              <select 
                required
                className="input-field w-full"
                value={formData.programa_id}
                onChange={e => setFormData({...formData, programa_id: e.target.value})}
              >
                <option value="1">Arquitectura de Plataformas y Servicios T.I.</option>
                <option value="2">Enfermería Técnica</option>
                <option value="3">Diseño Gráfico</option>
                <option value="4">Administración</option>
                <option value="5">Contabilidad</option>
                <option value="6">Mecatrónica</option>
              </select>
            </div>
          )}

          <div className="bg-gradient-to-r from-primary-soft to-slate-light p-4 rounded-xl mb-8 border border-primary/20 flex items-start">
            <div className="bg-white p-1.5 rounded-lg shadow-sm mr-3">
              <Lightbulb className="text-primary w-5 h-5" />
            </div>
            <p className="text-xs text-primary-dark font-medium leading-relaxed mt-0.5">
              Este alumno será registrado inmediatamente en la base de datos central sin pasar por el módulo de Admisión. Al terminar, el sistema te redirigirá a la matrícula para que le asignes los cursos.
            </p>
          </div>

          <div className="flex space-x-4">
            <button 
              type="button" 
              onClick={onClose}
              className="btn-ghost flex-1 py-3"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="btn-primary flex-1 py-3 justify-center disabled:opacity-70"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Procesando...
                </>
              ) : (
                'Registrar y Matricular'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
