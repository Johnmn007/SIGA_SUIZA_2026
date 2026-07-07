import { useState } from 'react';
import { apiClient, API_BASE } from '../../core/api/client';

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
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up border border-white/20">
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-6 flex justify-between items-center relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
          <div className="relative z-10">
            <h3 className="text-xl font-black text-white tracking-tight flex items-center">
              <svg className="w-6 h-6 mr-2 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              Matrícula Extraordinaria
            </h3>
            <p className="text-indigo-100 text-sm font-medium mt-1 opacity-90">Registro exprés para migración de estudiantes</p>
          </div>
          <button onClick={onClose} className="relative z-10 bg-white/10 hover:bg-white/20 p-2 rounded-full text-white transition-all active:scale-95">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8">
          {error && (
            <div className="mb-6 bg-red-50 text-red-600 text-sm p-4 rounded-xl border border-red-100 flex items-start shadow-sm">
              <svg className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              <span className="font-medium leading-relaxed">{error}</span>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-5 mb-5">
            <div className="col-span-1 group">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 group-focus-within:text-indigo-600 transition-colors">DNI</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" /></svg>
                </div>
                <input 
                  type="text" 
                  required 
                  maxLength={8}
                  placeholder="Ej. 76543210"
                  className="w-full pl-10 bg-slate-50 border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                  value={formData.dni}
                  onChange={e => setFormData({...formData, dni: e.target.value.replace(/\D/g, '')})}
                />
              </div>
            </div>
            <div className="col-span-1 group">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 group-focus-within:text-indigo-600 transition-colors">Código</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg>
                </div>
                <input 
                  type="text" 
                  required 
                  placeholder="Código Inst."
                  className="w-full pl-10 bg-slate-50 border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                  value={formData.codigo_estudiante}
                  onChange={e => setFormData({...formData, codigo_estudiante: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5 mb-6">
            <div className="col-span-2 sm:col-span-1 group">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 group-focus-within:text-indigo-600 transition-colors">Nombres</label>
              <input 
                type="text" 
                required 
                placeholder="Nombres completos"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                value={formData.nombres}
                onChange={e => setFormData({...formData, nombres: e.target.value})}
              />
            </div>
            <div className="col-span-2 sm:col-span-1 group">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 group-focus-within:text-indigo-600 transition-colors">Apellidos</label>
              <input 
                type="text" 
                required 
                placeholder="Apellidos completos"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                value={formData.apellidos}
                onChange={e => setFormData({...formData, apellidos: e.target.value})}
              />
            </div>
          </div>

          {['superadmin', 'admin'].includes(userRole) && (
            <div className="mb-8 group">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 group-focus-within:text-indigo-600 transition-colors">Programa de Estudio</label>
              <select 
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none appearance-none cursor-pointer"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.2em 1.2em' }}
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

          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl mb-8 border border-blue-100 flex items-start">
            <div className="bg-white p-1.5 rounded-lg shadow-sm mr-3">
              <span className="text-xl leading-none">💡</span>
            </div>
            <p className="text-xs text-indigo-900 font-medium leading-relaxed mt-0.5">
              Este alumno será registrado inmediatamente en la base de datos central sin pasar por el módulo de Admisión. Al terminar, el sistema te redirigirá a la matrícula para que le asignes los cursos.
            </p>
          </div>

          <div className="flex space-x-4">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-3 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-100 hover:text-slate-800 transition-all active:scale-95"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-0.5 transition-all active:scale-95 active:translate-y-0 disabled:opacity-70 disabled:hover:translate-y-0 disabled:cursor-not-allowed flex items-center justify-center"
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
